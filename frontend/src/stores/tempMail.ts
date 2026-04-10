import { defineStore } from 'pinia';
import request from '../api/request';

export interface ProviderConfig {
  id: number;
  name: string;
  forward_to_email: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  has_imap_password: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Mailbox {
  id: number;
  alias: string;
  address: string;
  expires_at: string;
  is_active: number;
  source_type: string;
  created_at: string;
  provider_config_id?: number | null;
  provider_config_name?: string | null;
}

export interface MailItem {
  id: number;
  sender_name: string | null;
  sender_email: string;
  subject: string;
  snippet: string;
  received_at: string;
  is_read: number;
  risk_level: string;
}

export interface SettingsPayload {
  domainSuffix: string;
  pollIntervalSeconds: number;
  selectedProviderConfigId?: number | null;
}

export interface ProviderConfigPayload {
  name: string;
  forwardToEmail: string;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapPassword?: string;
}

export const useTempMailStore = defineStore('tempMail', {
  state: () => ({
    mailbox: null as Mailbox | null,
    history: [] as Mailbox[],
    messages: [] as MailItem[],
    selectedMessage: null as any,
    settings: null as null | {
      domain_suffix: string;
      forward_to_email: string;
      poll_interval_seconds: number;
      selected_provider_config_id?: number | null;
      provider_configs: ProviderConfig[];
    },
    providerConfigs: [] as ProviderConfig[],
    selectedProviderConfigId: null as number | null,
    loading: false,
    polling: false,
    isSyncing: false,
    isSwitchingMailbox: false,
    isSavingProviderConfig: false,
    pollingTimer: null as ReturnType<typeof setTimeout> | null,
    syncPromise: null as Promise<any> | null,
  }),
  getters: {
    activeProviderConfig(state): ProviderConfig | null {
      return state.providerConfigs.find((item) => item.id === state.selectedProviderConfigId) || null;
    },
  },
  actions: {
    async loadCurrentMailbox() {
      const result = await request.get('/mailboxes/current');
      this.mailbox = result.data;
      if (result.data?.provider_config_id) {
        this.selectedProviderConfigId = result.data.provider_config_id;
      }
      return result.data;
    },
    async loadHistory() {
      const result = await request.get('/mailboxes/history');
      this.history = result.data;
      return result.data;
    },
    async loadProviderConfigs() {
      const result = await request.get('/provider-configs');
      this.providerConfigs = result.data;
      const defaultConfig = this.providerConfigs.find((item) => item.is_default);
      this.selectedProviderConfigId = defaultConfig?.id || this.selectedProviderConfigId;
      return result.data;
    },
    async addProviderConfig(payload: ProviderConfigPayload) {
      this.isSavingProviderConfig = true;
      try {
        const result = await request.post('/provider-configs', payload);
        await this.loadProviderConfigs();
        return result.data;
      } finally {
        this.isSavingProviderConfig = false;
      }
    },
    async updateProviderConfig(id: number, payload: ProviderConfigPayload) {
      this.isSavingProviderConfig = true;
      try {
        const result = await request.put(`/provider-configs/${id}`, payload);
        await this.loadProviderConfigs();
        return result.data;
      } finally {
        this.isSavingProviderConfig = false;
      }
    },
    async deleteProviderConfig(id: number) {
      await request.delete(`/provider-configs/${id}`);
      await this.loadProviderConfigs();
      await this.loadSettings();
    },
    async selectProviderConfig(id: number) {
      await request.post(`/provider-configs/${id}/select`);
      this.selectedProviderConfigId = id;
      await this.loadProviderConfigs();
      await this.loadSettings();
    },
    async generateMailbox() {
      const result = await request.post('/mailboxes/generate', {
        providerConfigId: this.selectedProviderConfigId,
      });
      this.mailbox = result.data;
      if (result.data?.provider_config_id) {
        this.selectedProviderConfigId = result.data.provider_config_id;
      }
      await this.loadHistory();
      await this.loadMessages(true);
      this.restartPolling();
      return result.data;
    },
    async switchMailbox(mailboxId: number) {
      this.isSwitchingMailbox = true;
      try {
        await request.post(`/mailboxes/${mailboxId}/activate`);
        await this.loadCurrentMailbox();
        await this.loadHistory();
        await this.loadProviderConfigs();
        await this.loadSettings();
        await this.loadMessages(true);
        this.restartPolling();
        return this.mailbox;
      } finally {
        this.isSwitchingMailbox = false;
      }
    },
    async syncCurrentMailbox(options: { silent?: boolean } = {}) {
      if (!this.mailbox?.id) return null;
      if (this.syncPromise) {
        return this.syncPromise;
      }

      this.isSyncing = true;
      this.syncPromise = (async () => {
        try {
          const result = await request.post(`/mailboxes/${this.mailbox!.id}/sync`);
          await this.loadMessages(true);
          await this.loadHistory();
          return result.data;
        } catch (error) {
          if (!options.silent) {
            throw error;
          }
          return { synced: 0, mode: 'error', reason: '后台同步失败' };
        } finally {
          this.isSyncing = false;
          this.syncPromise = null;
          this.scheduleNextPolling();
        }
      })();

      return this.syncPromise;
    },
    async loadMessages(forceSelectFirst = false) {
      if (!this.mailbox?.id) return [];
      const result = await request.get(`/mailboxes/${this.mailbox.id}/messages`);
      this.messages = result.data;
      if (this.messages.length && (forceSelectFirst || !this.selectedMessage || !this.messages.find((item) => item.id === this.selectedMessage.id))) {
        await this.loadMessageDetail(this.messages[0].id);
      }
      if (!this.messages.length) {
        this.selectedMessage = null;
      }
      return result.data;
    },
    async loadMessageDetail(id: number) {
      const result = await request.get(`/messages/${id}`);
      this.selectedMessage = result.data;
      this.messages = this.messages.map((item) => item.id === id ? { ...item, is_read: 1 } : item);
      return result.data;
    },
    async loadSettings() {
      const result = await request.get('/settings');
      this.settings = result.data;
      this.providerConfigs = result.data.provider_configs || [];
      this.selectedProviderConfigId = result.data.selected_provider_config_id || this.selectedProviderConfigId;
      return result.data;
    },
    async saveSettings(payload: SettingsPayload) {
      const result = await request.put('/settings', payload);
      this.settings = result.data;
      this.providerConfigs = result.data.provider_configs || [];
      this.selectedProviderConfigId = result.data.selected_provider_config_id || this.selectedProviderConfigId;
      this.restartPolling();
      return result.data;
    },
    scheduleNextPolling() {
      if (!this.polling || !this.mailbox?.id) return;
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
      }
      const intervalMs = Math.max(5, Number(this.settings?.poll_interval_seconds || 10)) * 1000;
      this.pollingTimer = setTimeout(async () => {
        if (!this.polling || document.hidden || !this.mailbox?.id || this.isSwitchingMailbox) {
          this.scheduleNextPolling();
          return;
        }
        await this.syncCurrentMailbox({ silent: true });
      }, intervalMs);
    },
    startPolling() {
      this.stopPolling();
      this.polling = true;
      this.scheduleNextPolling();
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
        this.pollingTimer = null;
      }
      this.polling = false;
    },
    restartPolling() {
      this.stopPolling();
      if (this.mailbox?.id) {
        this.startPolling();
      }
    },
  },
});
