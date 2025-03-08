/**
 * Secure Storage Utility
 *
 * Provides encrypted local storage for sensitive information like API keys.
 * Uses CryptoJS for client-side encryption with an app-specific encryption key.
 */
import CryptoJS from 'crypto-js';

/**
 * Storage keys enum to prevent typos and ensure consistent access
 */
export enum StorageKeys {
  API_KEY = 'poloniex_api_key',
  API_SECRET = 'poloniex_api_secret',
  THEME = 'user_theme',
  LANGUAGE = 'user_language',
  TRADING_PAIRS = 'trading_pairs',
  CHART_PREFERENCES = 'chart_preferences',
  SESSION_TOKEN = 'session_token',
}

/**
 * Type for storage item options
 */
interface StorageItemOptions {
  /** Whether the item should be encrypted */
  encrypt: boolean;
  /** Custom storage prefix for organizational purposes */
  prefix?: string;
  /** Expiration time in milliseconds */
  expiresIn?: number;
}

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: StorageItemOptions = {
  encrypt: false,
  prefix: 'poloniex_trading_',
};

/**
 * Default secure storage options (for sensitive data)
 */
const DEFAULT_SECURE_OPTIONS: StorageItemOptions = {
  encrypt: true,
  prefix: 'poloniex_secure_',
};

/**
 * Item stored in storage with metadata
 */
interface StorageItem<T> {
  /** The actual data being stored */
  value: T;
  /** When the item was created */
  createdAt: number;
  /** When the item expires (if applicable) */
  expiresAt?: number;
  /** Version for data migration support */
  version: number;
}

/**
 * Generates a device-specific encryption key
 * This adds a layer of defense since the encryption key will be different per device
 */
const getEncryptionKey = (): string => {
  // Use browser/device specific information to create a consistent but unique key
  const browserInfo = [
    navigator.userAgent,
    navigator.language,
    // Using screen properties which remain constant for a device
    screen.colorDepth,
    screen.width,
    screen.height,
  ].join('|');

  // Add an app-specific salt to make the key unique to this application
  const appSalt = 'poloniex-trading-platform-v1';

  // Generate a hash of the browser info with the app salt
  return CryptoJS.SHA256(browserInfo + appSalt).toString();
};

/**
 * Get the full key name with prefix
 */
const getFullKey = (key: string, prefix?: string): string => {
  return `${prefix || ''}${key}`;
};

/**
 * Encrypt a string value
 */
const encrypt = (value: string): string => {
  const encryptionKey = getEncryptionKey();
  return CryptoJS.AES.encrypt(value, encryptionKey).toString();
};

/**
 * Decrypt a string value
 */
const decrypt = (encryptedValue: string): string => {
  try {
    const encryptionKey = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedValue, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // If decryption fails (e.g., if the encryption key has changed), return empty string
    console.error('Failed to decrypt value:', error);
    return '';
  }
};

/**
 * Check if a storage item is expired
 */
const isExpired = (item: StorageItem<unknown>): boolean => {
  if (!item.expiresAt) return false;
  return Date.now() > item.expiresAt;
};

/**
 * SecureStorage implementation for managing encrypted and non-encrypted data
 */
export const SecureStorage = {
  /**
   * Store a value in localStorage with optional encryption
   */
  set<T>(key: string, value: T, options: Partial<StorageItemOptions> = {}): void {
    try {
      const useOptions = options.encrypt
        ? { ...DEFAULT_SECURE_OPTIONS, ...options }
        : { ...DEFAULT_OPTIONS, ...options };

      const storageItem: StorageItem<T> = {
        value,
        createdAt: Date.now(),
        version: 1,
      };

      // Add expiration if specified
      if (useOptions.expiresIn) {
        storageItem.expiresAt = Date.now() + useOptions.expiresIn;
      }

      // Convert to string for storage
      let storageValue = JSON.stringify(storageItem);

      // Encrypt if needed
      if (useOptions.encrypt) {
        storageValue = encrypt(storageValue);
      }

      // Store in localStorage
      localStorage.setItem(getFullKey(key, useOptions.prefix), storageValue);
    } catch (error) {
      console.error(`Error storing value for key "${key}":`, error);
    }
  },

  /**
   * Retrieve a value from localStorage with automatic decryption if needed
   */
  get<T>(key: string, options: Partial<StorageItemOptions> = {}): T | null {
    try {
      const useOptions = options.encrypt
        ? { ...DEFAULT_SECURE_OPTIONS, ...options }
        : { ...DEFAULT_OPTIONS, ...options };

      // Get from localStorage
      const value = localStorage.getItem(getFullKey(key, useOptions.prefix));

      if (!value) return null;

      // Decrypt if needed
      const jsonString = useOptions.encrypt ? decrypt(value) : value;

      if (!jsonString) return null;

      // Parse the JSON
      const storageItem = JSON.parse(jsonString) as StorageItem<T>;

      // Check expiration
      if (isExpired(storageItem)) {
        this.remove(key, useOptions);
        return null;
      }

      return storageItem.value;
    } catch (error) {
      console.error(`Error retrieving value for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Remove an item from localStorage
   */
  remove(key: string, options: Partial<StorageItemOptions> = {}): void {
    try {
      const useOptions = options.encrypt
        ? { ...DEFAULT_SECURE_OPTIONS, ...options }
        : { ...DEFAULT_OPTIONS, ...options };

      localStorage.removeItem(getFullKey(key, useOptions.prefix));
    } catch (error) {
      console.error(`Error removing value for key "${key}":`, error);
    }
  },

  /**
   * Check if an item exists and is not expired
   */
  has(key: string, options: Partial<StorageItemOptions> = {}): boolean {
    try {
      const useOptions = options.encrypt
        ? { ...DEFAULT_SECURE_OPTIONS, ...options }
        : { ...DEFAULT_OPTIONS, ...options };

      // Get from localStorage
      const value = localStorage.getItem(getFullKey(key, useOptions.prefix));

      if (!value) return false;

      // Decrypt if needed
      const jsonString = useOptions.encrypt ? decrypt(value) : value;

      if (!jsonString) return false;

      // Parse the JSON
      const storageItem = JSON.parse(jsonString) as StorageItem<unknown>;

      // Check expiration
      return !isExpired(storageItem);
    } catch (error) {
      console.error(`Error checking existence for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Set API credentials securely
   */
  setApiCredentials(apiKey: string, apiSecret: string): void {
    this.set(StorageKeys.API_KEY, apiKey, { encrypt: true });
    this.set(StorageKeys.API_SECRET, apiSecret, { encrypt: true });
  },

  /**
   * Get API credentials securely
   */
  getApiCredentials(): { apiKey: string; apiSecret: string } | null {
    const apiKey = this.get<string>(StorageKeys.API_KEY, { encrypt: true });
    const apiSecret = this.get<string>(StorageKeys.API_SECRET, { encrypt: true });

    if (!apiKey || !apiSecret) return null;

    return { apiKey, apiSecret };
  },

  /**
   * Clear API credentials
   */
  clearApiCredentials(): void {
    this.remove(StorageKeys.API_KEY, { encrypt: true });
    this.remove(StorageKeys.API_SECRET, { encrypt: true });
  },

  /**
   * Clear all data from the secure storage
   */
  clearAll(): void {
    Object.values(StorageKeys).forEach(key => {
      this.remove(key, { encrypt: false });
      this.remove(key, { encrypt: true });
    });
  },
};

export default SecureStorage;
