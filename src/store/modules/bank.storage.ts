import { PendingBankTransaction } from '../../types';
import {
  BANK_NOTIFICATION_ENABLED_KEY,
  PENDING_BANK_TXS_KEY,
  PROCESSED_BANK_HASHES_KEY,
  getStorageItem,
  setStorageItem,
} from './storage.core';

export const bankStorage = {
  async isBankNotificationEnabled(): Promise<boolean> {
    try {
      const val = await getStorageItem(BANK_NOTIFICATION_ENABLED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setBankNotificationEnabled(enabled: boolean): Promise<boolean> {
    try {
      await setStorageItem(BANK_NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
      return true;
    } catch {
      return false;
    }
  },

  async getPendingBankTransactions(): Promise<PendingBankTransaction[]> {
    try {
      const data = await getStorageItem(PENDING_BANK_TXS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error getting pending bank transactions', e);
      return [];
    }
  },

  async savePendingBankTransactions(txs: PendingBankTransaction[]): Promise<boolean> {
    try {
      await setStorageItem(PENDING_BANK_TXS_KEY, JSON.stringify(txs));
      return true;
    } catch (e) {
      console.error('Error saving pending bank transactions', e);
      return false;
    }
  },

  async addPendingBankTransaction(tx: PendingBankTransaction): Promise<boolean> {
    try {
      const rawHashes = await getStorageItem(PROCESSED_BANK_HASHES_KEY);
      const hashes: string[] = rawHashes ? JSON.parse(rawHashes) : [];
      if (hashes.includes(tx.id)) {
        return false;
      }

      const currentList = await this.getPendingBankTransactions();
      const updatedList = [tx, ...currentList.filter((item) => item.id !== tx.id)].slice(0, 50);
      await this.savePendingBankTransactions(updatedList);

      const updatedHashes = [tx.id, ...hashes].slice(0, 500);
      await setStorageItem(PROCESSED_BANK_HASHES_KEY, JSON.stringify(updatedHashes));
      return true;
    } catch (e) {
      console.error('Error adding pending bank transaction', e);
      return false;
    }
  },

  async removePendingBankTransaction(id: string): Promise<boolean> {
    try {
      const currentList = await this.getPendingBankTransactions();
      const updatedList = currentList.filter((item) => item.id !== id);
      await this.savePendingBankTransactions(updatedList);
      return true;
    } catch (e) {
      console.error('Error removing pending bank transaction', e);
      return false;
    }
  },

  async removePendingBankTransactionByNotificationKey(key: string): Promise<boolean> {
    try {
      const currentList = await this.getPendingBankTransactions();
      const updatedList = currentList.filter(
        (item) => item.notificationKey !== key && item.id !== key
      );
      await this.savePendingBankTransactions(updatedList);
      return true;
    } catch (e) {
      console.error('Error removing pending bank transaction by key', e);
      return false;
    }
  },

  async clearAllPendingBankTransactions(): Promise<boolean> {
    try {
      await setStorageItem(PENDING_BANK_TXS_KEY, JSON.stringify([]));
      return true;
    } catch (e) {
      console.error('Error clearing pending bank transactions', e);
      return false;
    }
  },
};

