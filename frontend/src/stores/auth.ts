import { defineStore } from 'pinia';
import request from '../api/request';

const TOKEN_KEY = 'tempmail_token';
const USER_KEY = 'tempmail_user';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') as null | {
      id: number;
      username: string;
      email: string;
    },
  }),
  actions: {
    persist() {
      localStorage.setItem(TOKEN_KEY, this.token);
      localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    },
    setAuth(payload: { token: string; user: { id: number; username: string; email: string } }) {
      this.token = payload.token;
      this.user = payload.user;
      this.persist();
    },
    async login(account: string, password: string) {
      const result = await request.post('/auth/login', { account, password });
      this.setAuth(result.data);
      return result;
    },
    async register(username: string, email: string, password: string) {
      const result = await request.post('/auth/register', { username, email, password });
      this.setAuth(result.data);
      return result;
    },
    async fetchProfile() {
      if (!this.token) return null;
      const result = await request.get('/auth/me');
      this.user = result.data;
      this.persist();
      return result.data;
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
