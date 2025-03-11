// Common types used throughout the application
export interface GenericRecord {
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

export interface ErrorResponse {
  error: string;
  status?: number;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ApiKeyCredentials {
  apiKey: string;
  apiSecret: string;
  exchange: string;
  label?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  defaultExchange: string;
  defaultPair: string;
  chartInterval: string;
  riskLevel: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

export type EventHandler<T = unknown> = (data: T) => void;
