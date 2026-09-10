export interface DashboardStats {
  totalEconomy: number;
  activeChatMutesCount: number;
  usersWithActiveWarnsCount: number;
  usersInActiveGbanCount: number;
  usersInBotBlacklistCount: number;
  economyBreakdown: {
    cashTotal: number;
    bankTotal: number;
    clansTotal: number;
    topUsers: Array<{
      vkId: number;
      name: string;
      totalWealth: number;
    }>;
  };
  totalUsersCount: number;
  totalChatsCount: number;
  uptimeSeconds: number;
}

export interface ChatItem {
  peerId: number;
  title?: string;
  antiFlood?: boolean;
  antiSliv?: boolean;
  antiGames?: boolean;
  antiRaid?: boolean;
  antiGroup?: boolean;
  antiTegAll?: boolean;
  antiAd?: boolean;
  inviteOnlyMods?: boolean;
  membersCount?: number;
  updatedAt?: number;
}

export interface BotUser {
  userId: number;
  fullName?: string;
  nick?: string;
  role?: string;
  balance?: number;
  bankBalance?: number;
  warnsCount?: number;
  isGameBanned?: boolean;
  isBlacklisted?: boolean;
  registeredAt?: number;
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
  isCurrent: boolean;
}

export interface PanelUser {
  id: string;
  login: string;
  role: string;
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: number;
  peerId?: number;
}
