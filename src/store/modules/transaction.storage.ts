import { Transaction, TransactionDateIndex } from '../../types';
import {
  TRANSACTIONS_KEY,
  TRANSACTION_DATE_INDEX_KEY,
  getStorageItem,
  setStorageItem,
} from './storage.core';

let onTransactionChangeCallback: (() => void) | null = null;

export const transactionStorage = {
  // Listener for transaction updates
  setTransactionChangeListener(callback: () => void) {
    onTransactionChangeCallback = callback;
  },

  // Transaction Date Index — lưu tháng/năm có giao dịch để lọc nhanh
  async getTransactionDateIndex(): Promise<TransactionDateIndex> {
    try {
      const data = await getStorageItem(TRANSACTION_DATE_INDEX_KEY);
      if (data) return JSON.parse(data);
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
      transactions.forEach((tx) => {
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
      await this._rebuildTransactionDateIndex();
    } catch (e) {
      console.error('Error removing from transaction date index', e);
    }
  },

  // Transactions CRUD
  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await getStorageItem(TRANSACTIONS_KEY);
      const parsed = data ? JSON.parse(data) : [];
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
      const deleted = current.find((t) => t.id === id);
      const updated = current.filter((t) => t.id !== id);
      await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(updated));
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
      const updated = current.map((t) => (t.id === cleanedTx.id ? cleanedTx : t));
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
      const cleaned = updatedTransactions.map((t) => {
        const { category, categorySnapshot, name, ...rest } = t as any;
        return rest;
      });
      return await setStorageItem(TRANSACTIONS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.error('Error updating transactions in bulk', e);
      return false;
    }
  },

  // Suggested Notes
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
      const updated = [trimmed, ...existing.filter((n) => n !== trimmed)].slice(0, 10);
      await setStorageItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving suggested note', e);
    }
  },

  async deleteSuggestedNote(type: 'expense' | 'income', note: string): Promise<void> {
    try {
      const key = `@suggestedNotes_${type}`;
      const existing = await this.getSuggestedNotes(type);
      const updated = existing.filter((n) => n !== note);
      await setStorageItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting suggested note', e);
    }
  },
};

