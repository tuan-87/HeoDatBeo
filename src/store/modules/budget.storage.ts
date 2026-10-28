import { CategoryBudget } from '../../types';
import { CATEGORY_BUDGETS_KEY, getStorageItem, setStorageItem } from './storage.core';

export const budgetStorage = {
  // Category Budgets — stored separately for quick access
  async getCategoryBudgets(): Promise<CategoryBudget[]> {
    try {
      const data = await getStorageItem(CATEGORY_BUDGETS_KEY);
      const parsed: CategoryBudget[] = data ? JSON.parse(data) : [];
      let changed = false;
      const updated = parsed.map((b) => {
        if (!b.id) {
          b.id =
            'expense_' +
            b.name.toLowerCase().replace(/[^a-z0-9]/g, '_') +
            '_' +
            Math.random().toString(36).substr(2, 5);
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
};

