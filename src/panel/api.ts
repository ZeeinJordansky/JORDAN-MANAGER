import { DashboardStats, PanelSession, ChatItem, BotUserItem, PromocodeItem, BroadcastLogItem, PanelUser } from './types';

const getAuthToken = () => localStorage.getItem('panel_token') || '';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса к серверу');
  }
  return data as T;
}

export const panelApi = {
  // Step 1: Pre-check VK ID & captcha
  checkVkId: async (vkId: string, captchaResponse: string) => {
    return fetchApi<{ success: boolean; requiresCredentials: boolean; ip: string; city: string; provider: string }>(
      '/api/panel/auth/step1',
      {
        method: 'POST',
        body: JSON.stringify({ vkId, captchaResponse }),
      }
    );
  },

  // Step 2: Login with Login & Password
  login: async (vkId: string, login: string, password: string) => {
    return fetchApi<{
      success: boolean;
      token: string;
      isRoot: boolean;
      login: string;
      ip: string;
      provider: string;
      city: string;
      expiresAt: number;
    }>('/api/panel/auth/login', {
      method: 'POST',
      body: JSON.stringify({ vkId, login, password }),
    });
  },

  // Verify current session
  verifySession: async () => {
    return fetchApi<{
      valid: boolean;
      session: PanelSession;
      login: string;
      isRoot: boolean;
    }>('/api/panel/auth/session');
  },

  // Logout
  logout: async () => {
    return fetchApi<{ success: boolean }>('/api/panel/auth/logout', { method: 'POST' });
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    return fetchApi<DashboardStats>('/api/panel/dashboard/stats');
  },

  // Sessions list (Root only)
  getSessions: async () => {
    return fetchApi<PanelSession[]>('/api/panel/sessions');
  },

  // Revoke session (Root only)
  revokeSession: async (sessionId: string) => {
    return fetchApi<{ success: boolean }>('/api/panel/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  // Panel Users (Root only)
  getPanelUsers: async () => {
    return fetchApi<PanelUser[]>('/api/panel/users');
  },

  createPanelUser: async (login: string, password: string, role: 'admin' | 'moderator') => {
    return fetchApi<{ success: boolean }>('/api/panel/users/create', {
      method: 'POST',
      body: JSON.stringify({ login, password, role }),
    });
  },

  deletePanelUser: async (userId: string) => {
    return fetchApi<{ success: boolean }>('/api/panel/users/delete', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Chats management
  getChats: async () => {
    return fetchApi<ChatItem[]>('/api/panel/chats');
  },

  updateChatSetting: async (peerId: number, settingKey: string, value: any) => {
    return fetchApi<{ success: boolean }>('/api/panel/chats/update-setting', {
      method: 'POST',
      body: JSON.stringify({ peerId, settingKey, value }),
    });
  },

  // Quick actions
  executeQuickAction: async (action: string, payload?: any) => {
    return fetchApi<{ success: boolean; message: string }>('/api/panel/quick-actions', {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    });
  },

  // Bot Users management
  searchBotUsers: async (query: string) => {
    return fetchApi<BotUserItem[]>(`/api/panel/bot-users/search?q=${encodeURIComponent(query)}`);
  },

  updateBotUser: async (userId: number, updates: Partial<BotUserItem>) => {
    return fetchApi<{ success: boolean }>('/api/panel/bot-users/update', {
      method: 'POST',
      body: JSON.stringify({ userId, updates }),
    });
  },

  // Economy management
  getEconomySettings: async () => {
    return fetchApi<{
      jcRate: number;
      duelMultiplier: number;
      dailyBonusMin: number;
      dailyBonusMax: number;
    }>('/api/panel/economy/settings');
  },

  updateEconomySettings: async (settings: any) => {
    return fetchApi<{ success: boolean }>('/api/panel/economy/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  getPromocodes: async () => {
    return fetchApi<PromocodeItem[]>('/api/panel/economy/promocodes');
  },

  createPromocode: async (code: string, rewardCoins: number, maxUses: number) => {
    return fetchApi<{ success: boolean }>('/api/panel/economy/promocodes/create', {
      method: 'POST',
      body: JSON.stringify({ code, rewardCoins, maxUses }),
    });
  },

  deletePromocode: async (code: string) => {
    return fetchApi<{ success: boolean }>('/api/panel/economy/promocodes/delete', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  massCurrencyAction: async (action: 'give' | 'take', amount: number) => {
    return fetchApi<{ success: boolean; affectedCount: number }>('/api/panel/economy/mass-currency', {
      method: 'POST',
      body: JSON.stringify({ action, amount }),
    });
  },

  // Broadcasts management
  getBroadcastLogs: async () => {
    return fetchApi<BroadcastLogItem[]>('/api/panel/broadcasts/logs');
  },

  sendBroadcast: async (title: string, text: string, target: 'all_chats' | 'all_users', attachmentUrl?: string) => {
    return fetchApi<{ success: boolean; sentCount: number }>('/api/panel/broadcasts/send', {
      method: 'POST',
      body: JSON.stringify({ title, text, target, attachmentUrl }),
    });
  },
};
