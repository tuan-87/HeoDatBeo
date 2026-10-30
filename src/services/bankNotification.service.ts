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
   * Mở màn hình cài đặt Tối ưu hoá pin để chọn Không hạn chế (Unrestricted)
   */
  /**
   * Mở màn hình cài đặt Chi tiết ứng dụng (App Info) để người dùng chọn Pin -> "Không hạn chế" (Unrestricted)
   */
  /**
   * Mở màn hình cài đặt Tự khởi chạy (Autostart) trên Xiaomi (MIUI / HyperOS)
   */
  static openAutostartSettings(): void {
    if (!this.isSupported()) return;
    try {
      if (BankNotificationModule.openAutostartSettings) {
        BankNotificationModule.openAutostartSettings();
      } else {
        this.openAppDetailsSettings();
      }
    } catch {
      this.openAppDetailsSettings();
    }
  }

  static openAppDetailsSettings(): void {
    if (!this.isSupported()) return;
    try {
      if (BankNotificationModule.openAppDetailsSettings) {
        BankNotificationModule.openAppDetailsSettings();
      } else {
        BankNotificationModule.openBatteryOptimizationSettings();
      }
    } catch (e) {
      console.warn('Lỗi mở cài đặt chi tiết ứng dụng:', e);
    }
  }

  /**
   * Mở màn hình cài đặt Tối ưu hoá pin để chọn Không hạn chế (Unrestricted)
   */
  static openBatteryOptimizationSettings(): void {
    if (!this.isSupported()) return;
    try {
      BankNotificationModule.openBatteryOptimizationSettings();
    } catch (e) {
      console.warn('Lỗi mở cài đặt tối ưu hoá pin:', e);
    }
  }

  /**
   * Yêu cầu quyền gửi thông báo POST_NOTIFICATIONS trên Android 13+ (API 33+)
   */
  static async requestPostNotificationsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (e) {
      console.warn('Lỗi xin quyền POST_NOTIFICATIONS:', e);
      return true;
    }
  }

  /**
   * Kiểm tra quyền gửi thông báo POST_NOTIFICATIONS trên Android 13+ (API 33+)
   */
  static async checkPostNotificationsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const { PermissionsAndroid } = require('react-native');
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  /**
   * Quét nhanh tất cả thông báo đang có sẵn trên thanh trạng thái (Active Notifications)
   */
  static async scanActiveNotifications(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (BankNotificationModule.scanActiveNotifications) {
        return await BankNotificationModule.scanActiveNotifications();
      }
      return false;
    } catch (e) {
      console.warn('Lỗi scan active notifications:', e);
      return false;
    }
  }

  /**
   * Yêu cầu Android kết nối lại NotificationListenerService nếu bị ngắt quãng
   */
  static async forceRebind(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await BankNotificationModule.forceRebind();
    } catch (e) {
      console.warn('Lỗi rebind service:', e);
      return false;
    }
  }

  /**
   * Lấy danh sách các notificationKey mà người dùng đã bấm "Bỏ qua" trên notification
   */
  static async getAndClearIgnoredNotificationKeys(): Promise<string[]> {
    if (!this.isSupported()) return [];
    try {
      return await BankNotificationModule.getAndClearIgnoredNotificationKeys();
    } catch (e) {
      console.warn('Lỗi lấy danh sách ignored keys:', e);
      return [];
    }
  }

  /**
   * Hủy thông báo native trên thanh trạng thái theo key
   */
  static cancelNotificationByKey(notificationKey: string): void {
    if (!this.isSupported() || !notificationKey) return;
    try {
      BankNotificationModule.cancelNotificationByKey(notificationKey);
    } catch (_: unknown) {}
  }

  /**
   * Đồng bộ các thông báo đã lưu trong SharedPreferences (khi app mở lên)
   */
  static async syncQueuedNotifications(): Promise<number> {
    if (!this.isSupported()) return 0;

    const enabled = await storage.isBankNotificationEnabled();
    if (!enabled) return 0;

    try {
      // 0. Quét nhanh các thông báo ngân hàng đang chờ sẵn trên thanh thông báo hệ thống
      await this.scanActiveNotifications();

      // 1. Đồng bộ các giao dịch đã bị bấm "Bỏ qua" trên thanh thông báo
      const ignoredKeys = await this.getAndClearIgnoredNotificationKeys();
      if (Array.isArray(ignoredKeys) && ignoredKeys.length > 0) {
        for (const key of ignoredKeys) {
          await storage.removePendingBankTransactionByNotificationKey(key);
        }
      }

      // 2. Lấy các thông báo mới tích lũy trong hàng đợi
      const rawJson = await BankNotificationModule.getQueuedNotifications();
      if (!rawJson) return 0;

      const items: RawNotificationPayload[] = JSON.parse(rawJson);
      if (!Array.isArray(items) || items.length === 0) return 0;

      let addedCount = 0;
      for (const item of items) {
        if (item.notificationKey && ignoredKeys.includes(item.notificationKey)) {
          continue;
        }
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
  /**
   * Lắng nghe sự kiện dịch vụ native kết nối thành công để sync ngay
   */
  static subscribeServiceConnected(onConnected: () => void): () => void {
    if (!this.isSupported()) {
      return () => {};
    }

    const subscription = DeviceEventEmitter.addListener(
      'onBankServiceConnected',
      () => {
        onConnected();
      }
    );

    return () => {
      subscription.remove();
    };
  }

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

  /**
   * Lắng nghe yêu cầu mở modal duyệt giao dịch từ nút "Duyệt" trên notification
   */
  static subscribeOpenBankModal(onOpen: () => void): () => void {
    if (!this.isSupported()) {
      return () => {};
    }

    const subscription = DeviceEventEmitter.addListener(
      'onOpenBankModalRequest',
      () => {
        onOpen();
      }
    );

    return () => {
      subscription.remove();
    };
  }

  /**
   * Lắng nghe khi người dùng bấm "Bỏ qua" trên notification
   */
  static subscribeNotificationIgnored(onIgnored: (key: string) => void): () => void {
    if (!this.isSupported()) {
      return () => {};
    }

    const subscription = DeviceEventEmitter.addListener(
      'onBankNotificationIgnored',
      (payload: { notificationKey: string }) => {
        if (payload?.notificationKey) {
          onIgnored(payload.notificationKey);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }

  /**
   * Kiểm tra xem app có được mở từ nút "Duyệt" trên notification không
   */
  static async getInitialOpenBankModal(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await BankNotificationModule.getInitialOpenBankModal();
    } catch {
      return false;
    }
  }
}

