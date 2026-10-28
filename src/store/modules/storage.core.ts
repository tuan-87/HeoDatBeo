import AsyncStorage from '@react-native-async-storage/async-storage';

export const TRANSACTIONS_KEY = '@transactions';
export const USER_PROFILE_KEY = '@userProfile';
export const CATEGORY_BUDGETS_KEY = '@categoryBudgets';
export const TRANSACTION_DATE_INDEX_KEY = '@transaction_date_index';
export const NOTIFICATION_HISTORY_KEY = '@notificationHistory';
export const GOLD_ITEMS_KEY = '@goldItems';
export const GOLD_SALES_KEY = '@goldSales';
export const AI_CHAT_HISTORY_KEY = '@ai_chat_history';
export const USER_GEMINI_KEY = '@user_gemini_api_key';
export const PENDING_BANK_TXS_KEY = '@pending_bank_transactions';
export const PROCESSED_BANK_HASHES_KEY = '@processed_bank_hashes';
export const BANK_NOTIFICATION_ENABLED_KEY = '@bank_notification_enabled';

const ENCRYPTION_PREFIX = 'HDB_ENC_';
const XOR_KEY = 87; // QuocTuanIT87 / SatsBoy87

export function encrypt(text: string): string {
  if (text === null || text === undefined) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const encryptedValue = charCode ^ XOR_KEY;
    result += encryptedValue.toString(16).padStart(4, '0');
  }
  return ENCRYPTION_PREFIX + result;
}

export function decrypt(cipherText: string): string {
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

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    const rawVal = await AsyncStorage.getItem(key);
    if (!rawVal) return null;
    return decrypt(rawVal);
  } catch (e) {
    console.error(`Error reading key ${key}`, e);
    return null;
  }
}

export async function setStorageItem(key: string, value: string): Promise<boolean> {
  try {
    const encryptedVal = encrypt(value);
    await AsyncStorage.setItem(key, encryptedVal);
    return true;
  } catch (e) {
    console.error(`Error saving key ${key}`, e);
    return false;
  }
}

