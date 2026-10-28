import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Alert } from '../components/CustomAlert';
import { BankNotificationService } from '../services/bankNotification.service';
import { storage } from '../store/storage';
import { PendingBankTransaction } from '../types';

export function useBankWatcher() {
  const [pendingTransactions, setPendingTransactions] = useState<PendingBankTransaction[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    const unsubscribe = BankNotificationService.subscribeRealtime(() => {
      syncTransactions();
    });

    return () => {
      unsubscribe();
    };
  }, [syncTransactions]);

  // Bật/Tắt tính năng
  const toggleEnabled = async (val: boolean) => {
    if (val && Platform.OS === 'android') {
      const granted = await BankNotificationService.checkPermission();
      setIsPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Cần cấp quyền thông báo',
          'Để Heo Đất Béo tự động đọc biến động số dư, bạn cần cấp Quyền truy cập thông báo trong Cài đặt hệ thống.',
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Cấp quyền ngay',
              onPress: () => BankNotificationService.requestPermission(),
            },
          ]
        );
      }
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
    await storage.removePendingBankTransaction(id);
    const updated = await storage.getPendingBankTransactions();
    setPendingTransactions(updated);
  };

  // Bỏ qua tất cả giao dịch
  const clearAllTransactions = async () => {
    await storage.clearAllPendingBankTransactions();
    setPendingTransactions([]);
  };

  return {
    pendingTransactions,
    isEnabled,
    isPermissionGranted,
    isLoading,
    syncTransactions,
    toggleEnabled,
    requestPermission,
    ignoreTransaction,
    clearAllTransactions,
  };
}

