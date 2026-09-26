export interface PanelUser {
  id: string;
  login: string;
  role: 'root' | 'admin' | 'moderator';
  createdAt: number;
  lastIp?: string;
}

export interface PanelSession {
  id: string;
  login: string;
  ip: string;
  provider: string;
  city: string;
  loginTime: number;
  lastActive: number;
  expiresAt: number;
  isRoot: boolean;
  isCurrent?: boolean;
}

export interface DatabaseInfo {
  mainDbSize: number;
  mainDbFormatted: string;
  walSize: number;
  walFormatted: string;
  totalSize: number;
  totalFormatted: string;
  logsDbSize: number;
  logsDbFormatted: string;
  walEnabled: boolean;
  journalMode: string;
  autoVacuum: number;
  pageCount: number;
  pageSize: number;
}

export interface DashboardStats {
  totalEconomy: number;
  activeChatMutesCount: number;
  usersWithActiveMuteCount: number;
  usersWithActiveWarnsCount: number;
  usersInActiveGbanCount: number;
  usersInBotBlacklistCount: number;
  economyBreakdown: {
    cashTotal: number;
    bankTotal: number;
    clansTotal: number;
    topUsers: { vkId: number; name: string; totalWealth: number }[];
  };
  totalUsersCount: number;
  totalChatsCount: number;
  uptimeSeconds: number;
  database?: DatabaseInfo;
}

export interface ChatItem {
  peerId: number;
  title: string;
  membersCount: number;
  inviteLink?: string;
  ownerId?: number;
  settings: {
    noPrefix?: boolean;
    silenceMode?: boolean;
    antiRaid?: boolean;
    antiSpam?: boolean;
    welcomeMessage?: string;
  };
}

export interface BotUserItem {
  userId: number;
  fullName: string;
  nick?: string;
  balance: number;
  bankBalance: number;
  rating: number;
  level: number;
  role: number;
  isVip: boolean;
  isGameBanned: boolean;
  isBlacklisted: boolean;
  warnsCount: number;
  mutedUntil?: number;
}

export interface PromocodeItem {
  code: string;
  rewardCoins: number;
  maxUses: number;
  usedCount: number;
  createdAt: number;
}

export interface BroadcastLogItem {
  id: string;
  title: string;
  text: string;
  target: 'all_chats' | 'all_users';
  sentCount: number;
  timestamp: number;
  attachmentUrl?: string;
}
