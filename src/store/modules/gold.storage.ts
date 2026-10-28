import { GoldItem, GoldSaleRecord } from '../../types';
import {
  GOLD_ITEMS_KEY,
  GOLD_SALES_KEY,
  getStorageItem,
  setStorageItem,
} from './storage.core';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const goldStorage = {
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
      const updated = current.map((item) => {
        const match = updatedItems.find((u) => u.id === item.id);
        return match ? match : item;
      });
      const newItems = updatedItems.filter((u) => !current.some((item) => item.id === u.id));
      const finalItems = [...updated, ...newItems];
      await setStorageItem(GOLD_ITEMS_KEY, JSON.stringify(finalItems));
      return true;
    } catch (e) {
      console.error('Error updating gold items in bulk', e);
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
};

