import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { parseBankNotification, RawNotificationPayload } from './bankParser.service';
import { storage } from '../store/storage';
import { PendingBankTransaction } from '../types';

const { BankNotificationModule } = NativeModules;

export class BankNotificationService {
  /**
   * Kiểm tra thiết bị có hỗ trợ tính năng không (chỉ Android)
   */
  static isSupported(): boolean {
    return Platform.OS === 'android' && !!BankNotificationModule;
  }

  /**
   * Kiểm tra người dùng đã cấp quyền Notification Access chưa
   */
  static async checkPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await BankNotificationModule.isPermissionGranted();
    } catch (e) {
      console.warn('Lỗi kiểm tra quyền Bank Notification:', e);
      return false;
    }
  }

  /**
   * Mở màn hình cài đặt Android để người dùng cấp quyền
   */
  static requestPermission(): void {
    if (!this.isSupported()) return;
    try {
      BankNotificationModule.requestPermission();
    } catch (e) {
      console.warn('Lỗi mở màn hình cấp quyền:', e);
    }
  }

  /**
   * Đồng bộ các thông báo đã lưu trong SharedPreferences (khi app mở lên)
   */
  static async syncQueuedNotifications(): Promise<number> {
    if (!this.isSupported()) return 0;

    const enabled = await storage.isBankNotificationEnabled();
    if (!enabled) return 0;

    try {
      const rawJson = await BankNotificationModule.getQueuedNotifications();
      if (!rawJson) return 0;

      const items: RawNotificationPayload[] = JSON.parse(rawJson);
      if (!Array.isArray(items) || items.length === 0) return 0;

      let addedCount = 0;
      for (const item of items) {
        const parsed = parseBankNotification(item);
        if (parsed) {
          const added = await storage.addPendingBankTransaction(parsed);
          if (added) addedCount++;
        }
      }

      // Xoá hàng đợi native sau khi đã xử lý xong
      await BankNotificationModule.clearQueuedNotifications();
      return addedCount;
    } catch (e) {
      console.error('Lỗi khi sync thông báo ngân hàng:', e);
      return 0;
    }
  }

  /**
   * Lắng nghe sự kiện thông báo thời gian thực khi ứng dụng đang chạy
   */
  static subscribeRealtime(onNewItem?: (tx: PendingBankTransaction) => void): () => void {
    if (!this.isSupported()) {
      return () => {};
    }

    const subscription = DeviceEventEmitter.addListener(
      'onBankNotificationReceived',
      async (payload: RawNotificationPayload) => {
        try {
          const enabled = await storage.isBankNotificationEnabled();
          if (!enabled) return;

          const parsed = parseBankNotification(payload);
          if (parsed) {
            const added = await storage.addPendingBankTransaction(parsed);
            if (added && onNewItem) {
              onNewItem(parsed);
            }
          }
        } catch (e) {
          console.error('Lỗi xử lý realtime notification:', e);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }
}

