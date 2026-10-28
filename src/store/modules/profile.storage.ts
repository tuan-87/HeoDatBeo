import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, NotificationHistoryItem } from '../../types';
import {
  USER_PROFILE_KEY,
  TRANSACTIONS_KEY,
  CATEGORY_BUDGETS_KEY,
  TRANSACTION_DATE_INDEX_KEY,
  NOTIFICATION_HISTORY_KEY,
  GOLD_ITEMS_KEY,
  GOLD_SALES_KEY,
  getStorageItem,
  setStorageItem,
  encrypt,
  decrypt,
} from './storage.core';
import { Paths } from 'expo-file-system';
import { readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { transactionStorage } from './transaction.storage';
import { budgetStorage } from './budget.storage';
import { goldStorage } from './gold.storage';

export const profileStorage = {
  // User Profile
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const data = await getStorageItem(USER_PROFILE_KEY);
      if (!data) return null;
      const profile: UserProfile = JSON.parse(data);
      if (profile.incomeCategories) {
        let changed = false;
        profile.incomeCategories = profile.incomeCategories.map((c: any) => {
          if (typeof c === 'string') {
            const id =
              'income_' +
              c.toLowerCase().replace(/[^a-z0-9]/g, '_') +
              '_' +
              Math.random().toString(36).substr(2, 5);
            changed = true;
            return { id, name: c };
          } else if (c && !c.id) {
            c.id =
              'income_' +
              c.name.toLowerCase().replace(/[^a-z0-9]/g, '_') +
              '_' +
              Math.random().toString(36).substr(2, 5);
            changed = true;
          }
          return c;
        });
        if (changed) {
          await this.saveUserProfile(profile);
        }
      }
      return profile;
    } catch (e) {
      console.error('Error fetching user profile', e);
      return null;
    }
  },

  async saveUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      return await setStorageItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving user profile', e);
      return false;
    }
  },

  async clearUserResetData(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      await AsyncStorage.removeItem(TRANSACTIONS_KEY);
      await AsyncStorage.removeItem(CATEGORY_BUDGETS_KEY);
      await AsyncStorage.removeItem(TRANSACTION_DATE_INDEX_KEY);
      await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
      await AsyncStorage.removeItem('@googleDriveAutoBackupEnabled');
      await AsyncStorage.removeItem('@googleDriveLastBackupTimestamp');
      await AsyncStorage.removeItem('@googleDriveLastBackupStatus');
      await AsyncStorage.removeItem(GOLD_ITEMS_KEY);
      await AsyncStorage.removeItem(GOLD_SALES_KEY);
      return true;
    } catch (e) {
      console.error('Error clearing data', e);
      return false;
    }
  },

  // Notification History
  async getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    try {
      const data = await getStorageItem(NOTIFICATION_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error fetching notification history', e);
      return [];
    }
  },

  async saveNotificationHistory(history: NotificationHistoryItem[]): Promise<boolean> {
    try {
      return await setStorageItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving notification history', e);
      return false;
    }
  },

  // Google Drive Backup settings
  async isGoogleDriveAutoBackupEnabled(): Promise<boolean> {
    try {
      const value = await getStorageItem('@googleDriveAutoBackupEnabled');
      return value === 'true';
    } catch (e) {
      return false;
    }
  },

  async setGoogleDriveAutoBackupEnabled(enabled: boolean): Promise<boolean> {
    try {
      return await setStorageItem('@googleDriveAutoBackupEnabled', enabled ? 'true' : 'false');
    } catch (e) {
      return false;
    }
  },

  async getGoogleDriveLastBackupTimestamp(): Promise<number> {
    try {
      const value = await getStorageItem('@googleDriveLastBackupTimestamp');
      return value ? parseInt(value, 10) : 0;
    } catch (e) {
      return 0;
    }
  },

  async setGoogleDriveLastBackupTimestamp(timestamp: number): Promise<boolean> {
    try {
      return await setStorageItem('@googleDriveLastBackupTimestamp', timestamp.toString());
    } catch (e) {
      return false;
    }
  },

  async getGoogleDriveLastBackupStatus(): Promise<string> {
    try {
      const value = await getStorageItem('@googleDriveLastBackupStatus');
      return value || 'none';
    } catch (e) {
      return 'none';
    }
  },

  async setGoogleDriveLastBackupStatus(status: string): Promise<boolean> {
    try {
      return await setStorageItem('@googleDriveLastBackupStatus', status);
    } catch (e) {
      return false;
    }
  },

  // Backup / Export / Import
  async exportData(): Promise<string> {
    const profile = await this.getUserProfile();
    const transactions = await transactionStorage.getTransactions();
    const categoryBudgets = await budgetStorage.getCategoryBudgets();
    const goldItems = await goldStorage.getGoldItems();
    const goldSales = await goldStorage.getGoldSales();

    const avatarMap: Record<string, string> = {};

    const processFile = async (uri: string) => {
      if (uri && uri.startsWith('file://')) {
        try {
          const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
          const parts = uri.split('/');
          const fileName = parts[parts.length - 1];
          avatarMap[fileName] = base64;
        } catch (err) {
          console.error('Error reading file for export:', uri, err);
        }
      }
    };

    if (profile) {
      if (profile.avatar) {
        await processFile(profile.avatar);
      }
      if (profile.avatarHistory) {
        for (const uri of profile.avatarHistory) {
          await processFile(uri);
        }
      }
    }

    const jsonStr = JSON.stringify({
      profile,
      transactions,
      categoryBudgets,
      goldItems,
      goldSales,
      avatarMap,
    });
    return encrypt(jsonStr);
  },

  async importData(jsonData: string): Promise<boolean> {
    try {
      const decrypted = decrypt(jsonData);
      const parsed = JSON.parse(decrypted);
      let profile: UserProfile | null = parsed.profile || null;
      const avatarMap = parsed.avatarMap || {};

      if (profile) {
        const baseDir = Paths.document?.uri || Paths.cache?.uri || '';
        const reconstructFile = async (uri: string): Promise<string> => {
          if (uri && uri.startsWith('file://')) {
            const parts = uri.split('/');
            const fileName = parts[parts.length - 1];
            const base64 = avatarMap[fileName];
            if (base64) {
              try {
                const newUri = `${baseDir}${baseDir.endsWith('/') ? '' : '/'}${fileName}`;
                await writeAsStringAsync(newUri, base64, { encoding: 'base64' });
                return newUri;
              } catch (err) {
                console.error('Error reconstructing avatar file:', err);
              }
            }
          }
          return uri;
        };

        if (profile.avatar) {
          profile.avatar = await reconstructFile(profile.avatar);
        }
        if (profile.avatarHistory) {
          const newHistory: string[] = [];
          for (const uri of profile.avatarHistory) {
            const restoredUri = await reconstructFile(uri);
            newHistory.push(restoredUri);
          }
          profile.avatarHistory = newHistory;
        }

        await this.saveUserProfile(profile);
      }

      if (parsed.transactions) {
        await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(parsed.transactions));
      }
      if (parsed.categoryBudgets) {
        await setStorageItem(CATEGORY_BUDGETS_KEY, JSON.stringify(parsed.categoryBudgets));
      }
      if (parsed.goldItems) {
        await setStorageItem(GOLD_ITEMS_KEY, JSON.stringify(parsed.goldItems));
      }
      if (parsed.goldSales) {
        await setStorageItem(GOLD_SALES_KEY, JSON.stringify(parsed.goldSales));
      }

      await transactionStorage._rebuildTransactionDateIndex();
      return true;
    } catch (e) {
      console.error('Error importing data', e);
      return false;
    }
  },
};

