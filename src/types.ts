export interface Message {
  id?: string;
  text: string;
  userId: number;
  timestamp: number;
  fromBot: boolean;
  userName?: string;
}

export interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_50?: string;
}
