
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  image?: {
    data: string; // base64 string
    mimeType: string;
  };
}

export interface ChatSessionState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
