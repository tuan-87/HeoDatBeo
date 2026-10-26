import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, UserProfile, CategoryBudget, TransactionDateIndex, NotificationHistoryItem, GoldItem, GoldSaleRecord, AIChatItem } from '../types';
import { Paths } from 'expo-file-system';
import { readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { isCategoryIdMatch } from '../utils/category';

const TRANSACTIONS_KEY = '@transactions';
const USER_PROFILE_KEY = '@userProfile';
const CATEGORY_BUDGETS_KEY = '@categoryBudgets';
const TRANSACTION_DATE_INDEX_KEY = '@transaction_date_index';
const NOTIFICATION_HISTORY_KEY = '@notificationHistory';
const GOLD_ITEMS_KEY = '@goldItems';
const GOLD_SALES_KEY = '@goldSales';
const AI_CHAT_HISTORY_KEY = '@ai_chat_history';
const USER_GEMINI_KEY = '@user_gemini_api_key';

const ENCRYPTION_PREFIX = 'HDB_ENC_';
const XOR_KEY = 87; // QuocTuanIT87 / SatsBoy87

function encrypt(text: string): string {
  if (text === null || text === undefined) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const encryptedValue = charCode ^ XOR_KEY;
    result += encryptedValue.toString(16).padStart(4, '0');
  }
  return ENCRYPTION_PREFIX + result;
}

function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText; // Trả về dạng gốc nếu không có tiền tố mã hóa (tương thích ngược)
  }
  const hexPart = cipherText.substring(ENCRYPTION_PREFIX.length);
  let result = '';
  for (let i = 0; i < hexPart.length; i += 4) {
    const hex = hexPart.substring(i, i + 4);
    const encryptedValue = parseInt(hex, 16);
    const charCode = encryptedValue ^ XOR_KEY;
    result += String.fromCharCode(charCode);
  }
  return result;
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    const rawVal = await AsyncStorage.getItem(key);
    if (!rawVal) return null;
    return decrypt(rawVal);
  } catch (e) {
    console.error(`Error reading key ${key}`, e);
    return null;
  }
}

async function setStorageItem(key: string, value: string): Promise<boolean> {
  try {
    const encryptedVal = encrypt(value);
    await AsyncStorage.setItem(key, encryptedVal);
    return true;
  } catch (e) {
    console.error(`Error saving key ${key}`, e);
    return false;
  }
}

let onTransactionChangeCallback: (() => void) | null = null;

export const storage = {
  // Listener for transaction updates
  setTransactionChangeListener(callback: () => void) {
    onTransactionChangeCallback = callback;
  },

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
            const id = 'income_' + c.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
            changed = true;
            return { id, name: c };
          } else if (c && !c.id) {
            c.id = 'income_' + c.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
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

  async clearGoldData(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(GOLD_ITEMS_KEY);
      await AsyncStorage.removeItem(GOLD_SALES_KEY);
      return true;
    } catch (e) {
      console.error('Error clearing gold data', e);
      return false;
    }
  },

  // Transaction Date Index — lưu tháng/năm có giao dịch để lọc nhanh
  async getTransactionDateIndex(): Promise<TransactionDateIndex> {
    try {
      const data = await getStorageItem(TRANSACTION_DATE_INDEX_KEY);
      if (data) return JSON.parse(data);
      // Nếu chưa có index (app cũ) → rebuild từ transactions hiện có
      return await this._rebuildTransactionDateIndex();
    } catch (e) {
      console.error('Error fetching transaction date index', e);
      return { months: [], years: [] };
    }
  },

  async _rebuildTransactionDateIndex(): Promise<TransactionDateIndex> {
    try {
      const transactions = await this.getTransactions();
      const monthSet = new Set<string>();
      const yearSet = new Set<number>();
      transactions.forEach(tx => {
        const d = new Date(tx.timestamp);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(m);
        yearSet.add(d.getFullYear());
      });
      const index: TransactionDateIndex = {
        months: Array.from(monthSet).sort().reverse(),
        years: Array.from(yearSet).sort((a, b) => b - a),
      };
      await setStorageItem(TRANSACTION_DATE_INDEX_KEY, JSON.stringify(index));
      return index;
    } catch (e) {
      console.error('Error rebuilding transaction date index', e);
      return { months: [], years: [] };
    }
  },

  async _addToTransactionDateIndex(timestamp: number): Promise<void> {
    try {
      const index = await this.getTransactionDateIndex();
      const d = new Date(timestamp);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const year = d.getFullYear();
      let changed = false;
      if (!index.months.includes(month)) {
        index.months = [month, ...index.months].sort().reverse();
        changed = true;
      }
      if (!index.years.includes(year)) {
        index.years = [year, ...index.years].sort((a, b) => b - a);
        changed = true;
      }
      if (changed) {
        await setStorageItem(TRANSACTION_DATE_INDEX_KEY, JSON.stringify(index));
      }
    } catch (e) {
      console.error('Error adding to transaction date index', e);
    }
  },

  async _removeFromTransactionDateIndex(deletedTimestamp: number): Promise<void> {
    try {
      // Rebuild từ transactions còn lại sau khi xóa
      await this._rebuildTransactionDateIndex();
    } catch (e) {
      console.error('Error removing from transaction date index', e);
    }
  },

  // Category Budgets — stored separately for quick access
  async getCategoryBudgets(): Promise<CategoryBudget[]> {
    try {
      const data = await getStorageItem(CATEGORY_BUDGETS_KEY);
      const parsed: CategoryBudget[] = data ? JSON.parse(data) : [];
      let changed = false;
      const updated = parsed.map(b => {
        if (!b.id) {
          b.id = 'expense_' + b.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
          changed = true;
        }
        return b;
      });
      if (changed) {
        await this.saveCategoryBudgets(updated);
      }
      return updated;
    } catch (e) {
      console.error('Error fetching category budgets', e);
      return [];
    }
  },

  async saveCategoryBudgets(budgets: CategoryBudget[]): Promise<boolean> {
    try {
      return await setStorageItem(CATEGORY_BUDGETS_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.error('Error saving category budgets', e);
      return false;
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await getStorageItem(TRANSACTIONS_KEY);
      const parsed = data ? JSON.parse(data) : [];
      // sort descending by timestamp
      return parsed.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Error fetching transactions', e);
      return [];
    }
  },


  async saveTransaction(transaction: Transaction): Promise<boolean> {
    try {
      const { category, categorySnapshot, name, ...cleanedTx } = transaction as any;
      const current = await this.getTransactions();
      const updated = [...current, cleanedTx];
      await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      // Cập nhật index tháng/năm
      await this._addToTransactionDateIndex(transaction.timestamp);
      if (onTransactionChangeCallback) {
        onTransactionChangeCallback();
      }
      return true;
    } catch (e) {
      console.error('Error saving transaction', e);
      return false;
    }
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const current = await this.getTransactions();
      const deleted = current.find(t => t.id === id);
      const updated = current.filter(t => t.id !== id);
      await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      // Rebuild index sau khi xóa (để loại bỏ tháng/năm không còn giao dịch)
      if (deleted) await this._removeFromTransactionDateIndex(deleted.timestamp);
      if (onTransactionChangeCallback) {
        onTransactionChangeCallback();
      }
      return true;
    } catch (e) {
      console.error('Error deleting transaction', e);
      return false;
    }
  },

  async updateTransaction(updatedTransaction: Transaction): Promise<boolean> {
    try {
      const { category, categorySnapshot, name, ...cleanedTx } = updatedTransaction as any;
      const current = await this.getTransactions();
      const updated = current.map(t => t.id === cleanedTx.id ? cleanedTx : t);
      await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      if (onTransactionChangeCallback) {
        onTransactionChangeCallback();
      }
      return true;
    } catch (e) {
      console.error('Error updating transaction', e);
      return false;
    }
  },

  async updateTransactionsBulk(updatedTransactions: Transaction[]): Promise<boolean> {
    try {
      const cleaned = updatedTransactions.map(t => {
        const { category, categorySnapshot, name, ...rest } = t as any;
        return rest;
      });
      return await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('Error updating transactions in bulk', e);
      return false;
    }
  },


  // Backup / Restore capabilities
  async exportData(): Promise<string> {
    const profile = await this.getUserProfile();
    const transactions = await this.getTransactions();
    const categoryBudgets = await this.getCategoryBudgets();
    const goldItems = await this.getGoldItems();
    const goldSales = await this.getGoldSales();

    const avatarMap: Record<string, string> = {};

    const processFile = async (uri: string) => {
      if (uri && uri.startsWith('file://')) {
        try {
          const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
          const parts = uri.split('/');
          const fileName = parts[parts.length - 1];
          avatarMap[fileName] = base64;
        } catch (err) {
          console.error("Error reading file for export:", uri, err);
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

    const jsonStr = JSON.stringify({ profile, transactions, categoryBudgets, goldItems, goldSales, avatarMap });
    return encrypt(jsonStr); // Đây là dòng đúng
  },

  async importData(jsonData: string): Promise<boolean> {
    try {
      const decrypted = decrypt(jsonData);
      const parsed = JSON.parse(decrypted);
      let profile: UserProfile | null = parsed.profile || null;
      const avatarMap = parsed.avatarMap || {};

      if (profile) {
        const baseDir = Paths.document?.uri || Paths.cache?.uri || "";
        const reconstructFile = async (uri: string): Promise<string> => {
          if (uri && uri.startsWith('file://')) {
            const parts = uri.split('/');
            const fileName = parts[parts.length - 1];
            const base64 = avatarMap[fileName];
            if (base64) {
              try {
                const newUri = `${baseDir}${baseDir.endsWith("/") ? "" : "/"}${fileName}`;
                await writeAsStringAsync(newUri, base64, { encoding: 'base64' });
                return newUri;
              } catch (err) {
                console.error("Error reconstructing avatar file:", err);
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
      // Rebuild index sau khi import
      await this._rebuildTransactionDateIndex();
      if (onTransactionChangeCallback) {
        onTransactionChangeCallback();
      }
      return true;
    } catch (e) {
      console.error('Error importing data', e);
      return false;
    }
  },

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

  async getSuggestedNotes(type: 'expense' | 'income'): Promise<string[]> {
    try {
      const key = `@suggestedNotes_${type}`;
      const data = await getStorageItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error fetching suggested notes', e);
      return [];
    }
  },

  async addSuggestedNote(type: 'expense' | 'income', note: string): Promise<void> {
    try {
      const trimmed = note.trim();
      if (!trimmed) return;
      const key = `@suggestedNotes_${type}`;
      const existing = await this.getSuggestedNotes(type);
      const updated = [trimmed, ...existing.filter(n => n !== trimmed)].slice(0, 10);
      await setStorageItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving suggested note', e);
    }
  },

  async deleteSuggestedNote(type: 'expense' | 'income', note: string): Promise<void> {
    try {
      const key = `@suggestedNotes_${type}`;
      const existing = await this.getSuggestedNotes(type);
      const updated = existing.filter(n => n !== note);
      await setStorageItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting suggested note', e);
    }
  },

  // Gold Items
  async getGoldItems(): Promise<GoldItem[]> {
    try {
      const data = await getStorageItem(GOLD_ITEMS_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return parsed.sort((a: GoldItem, b: GoldItem) => b.buyDate - a.buyDate);
    } catch (e) {
      console.error('Error fetching gold items', e);
      return [];
    }
  },

  async saveGoldItem(item: GoldItem): Promise<boolean> {
    try {
      const current = await this.getGoldItems();
      const updated = [item, ...current];
      await setStorageItem(GOLD_ITEMS_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error saving gold item', e);
      return false;
    }
  },

  async updateGoldItemsBulk(updatedItems: GoldItem[]): Promise<boolean> {
    try {
      const current = await this.getGoldItems();
      const updated = current.map(item => {
        const match = updatedItems.find(u => u.id === item.id);
        return match ? match : item;
      });
      const newItems = updatedItems.filter(u => !current.some(item => item.id === u.id));
      const finalItems = [...updated, ...newItems];
      await setStorageItem(GOLD_ITEMS_KEY, JSON.stringify(finalItems));
      return true;
    } catch (e) {
      console.error('Error updating gold items in bulk', e);
      return false;
    }
  },

  // Gold Sales
  async getGoldSales(): Promise<GoldSaleRecord[]> {
    try {
      const data = await getStorageItem(GOLD_SALES_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return parsed.sort((a: GoldSaleRecord, b: GoldSaleRecord) => b.sellDate - a.sellDate);
    } catch (e) {
      console.error('Error fetching gold sales', e);
      return [];
    }
  },

  async saveGoldSale(sale: GoldSaleRecord): Promise<boolean> {
    try {
      const current = await this.getGoldSales();
      const updated = [sale, ...current];
      await setStorageItem(GOLD_SALES_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error saving gold sale', e);
      return false;
    }
  },

  async deleteGoldItemsBulk(ids: string[]): Promise<boolean> {
    try {
      const current = await this.getGoldItems();
      const updated = current.filter((item) => !ids.includes(item.id));
      await setStorageItem(GOLD_ITEMS_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error deleting gold items in bulk', e);
      return false;
    }
  },

  async deleteGoldSale(id: string): Promise<boolean> {
    try {
      const current = await this.getGoldSales();
      const updated = current.filter((sale) => sale.id !== id);
      await setStorageItem(GOLD_SALES_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error deleting gold sale', e);
      return false;
    }
  },

  // AI Chat History (Tối đa 15 đoạn chat)
  async getAIChatHistory(): Promise<AIChatItem[]> {
    try {
      const data = await getStorageItem(AI_CHAT_HISTORY_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading AI chat history', e);
      return [];
    }
  },

  async saveAIChatHistory(history: AIChatItem[]): Promise<boolean> {
    try {
      // Giữ tối đa 15 đoạn chat
      const limited = history.slice(0, 15);
      await setStorageItem(AI_CHAT_HISTORY_KEY, JSON.stringify(limited));
      return true;
    } catch (e) {
      console.error('Error saving AI chat history', e);
      return false;
    }
  },

  async addAIChatItem(item: AIChatItem): Promise<{ success: boolean; isFull?: boolean }> {
    try {
      const current = await this.getAIChatHistory();
      if (current.length >= 15) {
        return { success: false, isFull: true };
      }
      const updated = [item, ...current];
      await this.saveAIChatHistory(updated);
      return { success: true };
    } catch (e) {
      console.error('Error adding AI chat item', e);
      return { success: false };
    }
  },

  async deleteAIChatItem(id: string): Promise<boolean> {
    try {
      const current = await this.getAIChatHistory();
      const updated = current.filter((item) => item.id !== id);
      await this.saveAIChatHistory(updated);
      return true;
    } catch (e) {
      console.error('Error deleting AI chat item', e);
      return false;
    }
  },

  async clearAIChatHistory(): Promise<boolean> {
    try {
      await setStorageItem(AI_CHAT_HISTORY_KEY, JSON.stringify([]));
      return true;
    } catch (e) {
      console.error('Error clearing AI chat history', e);
      return false;
    }
  },

  // Gemini Custom API Key (nếu người dùng tự nhập)
  async getUserGeminiApiKey(): Promise<string> {
    try {
      const key = await getStorageItem(USER_GEMINI_KEY);
      return key || '';
    } catch (e) {
      return '';
    }
  },

  async saveUserGeminiApiKey(key: string): Promise<boolean> {
    try {
      await setStorageItem(USER_GEMINI_KEY, key.trim());
      return true;
    } catch (e) {
      return false;
    }
  }
};
