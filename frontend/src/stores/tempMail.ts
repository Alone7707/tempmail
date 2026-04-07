import { defineStore } from 'pinia';
import request from '../api/request';

export interface Mailbox {
  id: number;
  alias: string;
  address: string;
  expires_at: string;
  is_active: number;
  source_type: string;
  created_at: string;
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
  forwardToEmail: string;
  pollIntervalSeconds: number;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
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
      imap_host?: string;
      imap_port?: number;
      imap_username?: string;
      has_imap_password?: number;
    },
    loading: false,
    polling: false,
    pollingTimer: null as ReturnType<typeof setInterval> | null,
  }),
  actions: {
    async loadCurrentMailbox() {
      const result = await request.get('/mailboxes/current');
      this.mailbox = result.data;
      return result.data;
    },
    async loadHistory() {
      const result = await request.get('/mailboxes/history');
      this.history = result.data;
      return result.data;
    },
    async generateMailbox() {
      const result = await request.post('/mailboxes/generate');
      this.mailbox = result.data;
      await this.loadHistory();
      await this.loadMessages(true);
      return result.data;
    },
    async syncCurrentMailbox() {
      if (!this.mailbox?.id) return null;
      const result = await request.post(`/mailboxes/${this.mailbox.id}/sync`);
      await this.loadMessages(true);
      return result.data;
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
      return result.data;
    },
    async saveSettings(payload: SettingsPayload) {
      const result = await request.put('/settings', payload);
      this.settings = result.data;
      this.restartPolling();
      return result.data;
    },
    startPolling() {
      this.stopPolling();
      const intervalMs = Math.max(5, Number(this.settings?.poll_interval_seconds || 10)) * 1000;
      this.polling = true;
      this.pollingTimer = setInterval(async () => {
        if (document.hidden || !this.mailbox?.id) return;
        try {
          await this.syncCurrentMailbox();
        } catch {
        }
      }, intervalMs);
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
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
