import { AIChatItem } from '../../types';
import {
  AI_CHAT_HISTORY_KEY,
  USER_GEMINI_KEY,
  getStorageItem,
  setStorageItem,
} from './storage.core';

export const aiStorage = {
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

  // Gemini Custom API Key
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
  },
};

