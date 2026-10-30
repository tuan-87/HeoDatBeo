import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { Alert } from '../components/CustomAlert';
import { BankNotificationService } from '../services/bankNotification.service';
import { storage } from '../store/storage';
import { PendingBankTransaction } from '../types';

export function useBankWatcher() {
  const [pendingTransactions, setPendingTransactions] = useState<PendingBankTransaction[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isPostNotifGranted, setIsPostNotifGranted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalRequested, setIsModalRequested] = useState(false);

  // Đồng bộ trạng thái cấu hình & danh sách giao dịch
  const syncTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      await BankNotificationService.syncQueuedNotifications();
      const list = await storage.getPendingBankTransactions();
      setPendingTransactions(list);

      const enabled = await storage.isBankNotificationEnabled();
      setIsEnabled(enabled);

      if (Platform.OS === 'android') {
        const granted = await BankNotificationService.checkPermission();
        setIsPermissionGranted(granted);
        const postGranted = await BankNotificationService.checkPostNotificationsPermission();
        setIsPostNotifGranted(postGranted);
      }
    } catch (e) {
      console.warn('Lỗi sync bank notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lắng nghe realtime khi có thông báo ngân hàng mới
  useEffect(() => {
    syncTransactions();

    // Re-sync sau 1000ms & 2500ms để bắt kịp lúc Android rebind service
    const timer1 = setTimeout(() => {
      syncTransactions();
    }, 1000);
    const timer2 = setTimeout(() => {
      syncTransactions();
    }, 2500);

    // Đồng bộ lại mỗi khi người dùng quay lại app (từ ngân hàng chuyển sang Heo Đất Béo)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncTransactions();
      }
    });

    // Lắng nghe khi dịch vụ Native kết nối thành công
    const unsubscribeServiceConnected = BankNotificationService.subscribeServiceConnected(() => {
      syncTransactions();
    });

    // Kiểm tra xem app có được mở từ nút "Duyệt" trên notification không
    BankNotificationService.getInitialOpenBankModal().then((openedFromNotification) => {
      if (openedFromNotification) {
        setIsModalRequested(true);
      }
    });

    const unsubscribeRealtime = BankNotificationService.subscribeRealtime(() => {
      syncTransactions();
      setIsModalRequested(true); // Tự động mở modal khi có giao dịch mới lúc app đang mở
    });

    // Lắng nghe khi người dùng bấm "Duyệt" trên notification trong lúc app đang chạy
    const unsubscribeOpenModal = BankNotificationService.subscribeOpenBankModal(() => {
      syncTransactions();
      setIsModalRequested(true);
    });

    // Lắng nghe khi người dùng bấm "Bỏ qua" trên notification
    const unsubscribeIgnored = BankNotificationService.subscribeNotificationIgnored(async (key: string) => {
      if (key) {
        await storage.removePendingBankTransactionByNotificationKey(key);
      }
      syncTransactions();
    });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      appStateSub.remove();
      unsubscribeServiceConnected();
      unsubscribeRealtime();
      unsubscribeOpenModal();
      unsubscribeIgnored();
    };
  }, [syncTransactions]);

  // Bật/Tắt tính năng
  const toggleEnabled = async (val: boolean) => {
    if (val && Platform.OS === 'android') {
      // 1. Kiểm tra quyền Notification Access
      const granted = await BankNotificationService.checkPermission();
      setIsPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Cần cấp quyền thông báo',
          'Để Heo Đất Béo tự động đọc biến động số dư, bạn cần cấp Quyền truy cập thông báo trong Cài đặt hệ thống.',
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Cấp quyền',
              onPress: () => BankNotificationService.requestPermission(),
            },
          ]
        );
      }
      // 2. Yêu cầu quyền POST_NOTIFICATIONS (Android 13+) để hiện thông báo ngay lập tức
      const postGranted = await BankNotificationService.requestPostNotificationsPermission();
      setIsPostNotifGranted(postGranted);
    }
    await storage.setBankNotificationEnabled(val);
    setIsEnabled(val);
  };

  // Mở màn hình cấp quyền
  const requestPermission = () => {
    BankNotificationService.requestPermission();
  };

  // Bỏ qua một giao dịch
  const ignoreTransaction = async (id: string) => {
    const tx = pendingTransactions.find((t) => t.id === id);
    if (tx?.notificationKey) {
      BankNotificationService.cancelNotificationByKey(tx.notificationKey);
    }
    await storage.removePendingBankTransaction(id);
    const updated = await storage.getPendingBankTransactions();
    setPendingTransactions(updated);
  };

  // Bỏ qua tất cả giao dịch
  const clearAllTransactions = async () => {
    await storage.clearAllPendingBankTransactions();
    setPendingTransactions([]);
  };

  // Mở màn hình tối ưu hoá pin
  const openBatteryOptimizationSettings = () => {
    BankNotificationService.openBatteryOptimizationSettings();
  };

  // Mở màn hình chi tiết ứng dụng (App Info) để đặt Pin -> Không hạn chế (Unrestricted)
  const openAppDetailsSettings = () => {
    BankNotificationService.openAppDetailsSettings();
  };

  // Mở màn hình cài đặt Tự khởi chạy trên Xiaomi (MIUI / HyperOS)
  const openAutostartSettings = () => {
    BankNotificationService.openAutostartSettings();
  };

  // Yêu cầu quyền gửi thông báo (Android 13+)
  const requestPostNotificationsPermission = async () => {
    const granted = await BankNotificationService.requestPostNotificationsPermission();
    setIsPostNotifGranted(granted);
    return granted;
  };

  // Làm mới kết nối dịch vụ thông báo
  const forceRebind = async () => {
    const success = await BankNotificationService.forceRebind();
    await syncTransactions();
    return success;
  };

  return {
    pendingTransactions,
    isEnabled,
    isPermissionGranted,
    isPostNotifGranted,
    isLoading,
    isModalRequested,
    resetModalRequested: () => setIsModalRequested(false),
    syncTransactions,
    toggleEnabled,
    requestPermission,
    requestPostNotificationsPermission,
    openBatteryOptimizationSettings,
    openAppDetailsSettings,
    openAutostartSettings,
    forceRebind,
    ignoreTransaction,
    clearAllTransactions,
  };
}

