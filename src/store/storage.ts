import { transactionStorage } from './modules/transaction.storage';
import { budgetStorage } from './modules/budget.storage';
import { profileStorage } from './modules/profile.storage';
import { goldStorage } from './modules/gold.storage';
import { aiStorage } from './modules/ai.storage';
import { bankStorage } from './modules/bank.storage';

/**
 * Storage Facade: Tập hợp các repository con thành một đối tượng storage duy nhất
 * Đảm bảo tính tương thích ngược 100% cho toàn bộ ứng dụng.
 */
export const storage = {
  ...transactionStorage,
  ...budgetStorage,
  ...profileStorage,
  ...goldStorage,
  ...aiStorage,
  ...bankStorage,
};

export type StorageService = typeof storage;

export * from './modules/storage.core';
export * from './modules/transaction.storage';
export * from './modules/budget.storage';
export * from './modules/profile.storage';
export * from './modules/gold.storage';
export * from './modules/ai.storage';
export * from './modules/bank.storage';
