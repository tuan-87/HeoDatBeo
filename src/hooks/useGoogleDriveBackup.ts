import { useState, useEffect, useCallback } from 'react';
import { Alert } from '../components/CustomAlert';
import { storage } from '../store/storage';
import {
  initGoogleDrive,
  signInGoogle,
  signOutGoogle,
  uploadBackupToGoogleDrive,
  getAccessToken,
  restoreLatestBackupFromGoogleDrive,
  checkLatestBackupOnGoogleDrive,
  getLatestBackupDetailsOnGoogleDrive,
} from '../utils/googleDrive';

export function useGoogleDriveBackup(t?: (key: string) => string) {
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number>(0);
  const [lastBackupStatus, setLastBackupStatus] = useState<string>('none');

  const translate = (key: string, fallback: string) => {
    return t ? t(key) || fallback : fallback;
  };

  const checkGoogleSignInStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      setIsGoogleSignedIn(!!token);
      if (token) {
        const userInfo = await storage.getUserProfile();
        setGoogleUserEmail(userInfo?.facebook || 'Google Account');
      } else {
        setGoogleUserEmail(null);
      }
    } catch {
      setIsGoogleSignedIn(false);
      setGoogleUserEmail(null);
    }
  }, []);

  const loadBackupSettings = useCallback(async () => {
    try {
      const autoEnabled = await storage.isGoogleDriveAutoBackupEnabled();
      setIsAutoBackupEnabled(autoEnabled);
      const lastTs = await storage.getGoogleDriveLastBackupTimestamp();
      setLastBackupTimestamp(lastTs);
      const lastSt = await storage.getGoogleDriveLastBackupStatus();
      setLastBackupStatus(lastSt);
    } catch (e) {
      console.error('Error loading backup settings', e);
    }
  }, []);

  useEffect(() => {
    initGoogleDrive();
    checkGoogleSignInStatus();
    loadBackupSettings();
  }, [checkGoogleSignInStatus, loadBackupSettings]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await signInGoogle();
      if (res.success && res.userInfo) {
        setIsGoogleSignedIn(true);
        const userInfoAny = res.userInfo as any;
        setGoogleUserEmail(userInfoAny.user?.email || null);

        let lastTimestamp = await storage.getGoogleDriveLastBackupTimestamp();
        let lastStatus = await storage.getGoogleDriveLastBackupStatus();

        if (!lastTimestamp || lastTimestamp === 0) {
          const driveCheck = await checkLatestBackupOnGoogleDrive();
          if (driveCheck?.success && driveCheck.timestamp) {
            lastTimestamp = driveCheck.timestamp;
            lastStatus = 'success';
            await storage.setGoogleDriveLastBackupTimestamp(lastTimestamp);
            await storage.setGoogleDriveLastBackupStatus(lastStatus);
          }
        }

        const autoEnabled = await storage.isGoogleDriveAutoBackupEnabled();
        setIsAutoBackupEnabled(autoEnabled);
        setLastBackupTimestamp(lastTimestamp);
        setLastBackupStatus(lastStatus);

        Alert.alert(
          translate('common.success', 'Thành công'),
          `Đã liên kết Google Drive với tài khoản: ${userInfoAny.user?.email}`
        );
      } else {
        Alert.alert(
          translate('settings.googleLoginError', 'Lỗi đăng nhập Google'),
          res.error || 'Không thể đăng nhập Google Drive.'
        );
      }
    } catch (e: any) {
      Alert.alert(translate('common.error', 'Lỗi'), e?.message || 'Đã xảy ra lỗi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    Alert.alert(
      translate('settings.confirmLogout', 'Đăng xuất Google Drive'),
      translate('settings.confirmLogoutMsg', 'Bạn có chắc chắn muốn ngắt kết nối Google Drive?'),
      [
        { text: translate('common.cancel', 'Huỷ'), style: 'cancel' },
        {
          text: translate('settings.logoutBtn', 'Đăng xuất'),
          style: 'destructive',
          onPress: async () => {
            const res = await signOutGoogle();
            if (res.success) {
              setIsGoogleSignedIn(false);
              setGoogleUserEmail(null);
              setIsAutoBackupEnabled(false);
              await storage.setGoogleDriveAutoBackupEnabled(false);
              Alert.alert(
                translate('settings.logoutSuccess', 'Đã ngắt kết nối'),
                translate('settings.logoutSuccessMsg', 'Đã hủy liên kết Google Drive thành công.')
              );
            }
          },
        },
      ]
    );
  };

  const handleToggleAutoBackup = async (value: boolean) => {
    if (!isGoogleSignedIn) {
      Alert.alert(
        translate('settings.loginRequired', 'Yêu cầu đăng nhập'),
        translate('settings.loginRequiredMsg', 'Vui lòng đăng nhập Google Drive trước.')
      );
      return;
    }
    const success = await storage.setGoogleDriveAutoBackupEnabled(value);
    if (success) {
      setIsAutoBackupEnabled(value);
    }
  };

  const handleManualBackup = async () => {
    if (!isGoogleSignedIn) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần liên kết tài khoản Google trước.');
      return;
    }
    setIsBackingUp(true);
    try {
      const dataStr = await storage.exportData();
      const res = await uploadBackupToGoogleDrive(dataStr);
      const now = Date.now();
      if (res.success) {
        await storage.setGoogleDriveLastBackupTimestamp(now);
        await storage.setGoogleDriveLastBackupStatus('success');
        setLastBackupTimestamp(now);
        setLastBackupStatus('success');
        Alert.alert(
          translate('common.success', 'Thành công'),
          translate('settings.backupSuccess', 'Đã sao lưu lên Google Drive thành công!')
        );
      } else {
        await storage.setGoogleDriveLastBackupStatus('failed');
        setLastBackupStatus('failed');
        Alert.alert(translate('common.error', 'Lỗi'), res.message || 'Sao lưu thất bại.');
      }
    } catch (e: any) {
      Alert.alert(translate('common.error', 'Lỗi'), e?.message || 'Đã xảy ra lỗi khi sao lưu.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromGoogleDrive = async (onRestoreSuccess?: () => void) => {
    if (!isGoogleSignedIn) {
      Alert.alert(
        translate('settings.loginRequired', 'Yêu cầu đăng nhập'),
        translate('settings.loginRequiredMsg', 'Vui lòng đăng nhập Google Drive trước.')
      );
      return;
    }

    setIsRestoring(true);
    try {
      const detailsRes = await getLatestBackupDetailsOnGoogleDrive();
      if (!detailsRes.success || !detailsRes.name || !detailsRes.timestamp) {
        Alert.alert(
          translate('settings.backupNotFound', 'Không tìm thấy bản sao lưu'),
          detailsRes.message || 'Không có bản sao lưu nào trên Google Drive của bạn.'
        );
        setIsRestoring(false);
        return;
      }

      const date = new Date(detailsRes.timestamp);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const formattedTime = `${dd}/${mm}/${yyyy} lúc ${hh}:${min}`;

      setIsRestoring(false);

      Alert.alert(
        translate('settings.restoreConfirmTitle', 'Khôi phục dữ liệu'),
        `Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu (${detailsRes.name}, tạo lúc ${formattedTime})? Dữ liệu hiện tại trên máy sẽ bị thay thế.`,
        [
          { text: translate('settings.restoreCancelBtn', 'Huỷ'), style: 'cancel' },
          {
            text: translate('settings.restoreConfirmBtn', 'Khôi phục ngay'),
            style: 'destructive',
            onPress: async () => {
              setIsRestoring(true);
              try {
                const res = await restoreLatestBackupFromGoogleDrive();
                if (res.success && res.content) {
                  const success = await storage.importData(res.content);
                  if (success) {
                    const backupTime = res.timestamp || detailsRes.timestamp || Date.now();
                    await storage.setGoogleDriveLastBackupTimestamp(backupTime);
                    await storage.setGoogleDriveLastBackupStatus('success');
                    setLastBackupTimestamp(backupTime);
                    setLastBackupStatus('success');
                    Alert.alert(
                      translate('common.success', 'Thành công'),
                      'Khôi phục dữ liệu thành công!'
                    );
                    onRestoreSuccess?.();
                  } else {
                    Alert.alert(translate('settings.restoreError', 'Lỗi'), 'Không thể khôi phục dữ liệu.');
                  }
                } else {
                  Alert.alert(translate('common.error', 'Lỗi'), res.message || 'Lỗi khôi phục.');
                }
              } catch (e: any) {
                Alert.alert(translate('common.error', 'Lỗi'), e?.message || 'Đã xảy ra lỗi.');
              } finally {
                setIsRestoring(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(translate('common.error', 'Lỗi'), e?.message || 'Đã xảy ra lỗi.');
      setIsRestoring(false);
    }
  };

  const formatLastBackupTime = (ts: number): string => {
    if (!ts || ts === 0) return 'Chưa từng sao lưu';
    const date = new Date(ts);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} lúc ${hh}:${min}`;
  };

  return {
    isGoogleSignedIn,
    googleUserEmail,
    isAutoBackupEnabled,
    isBackingUp,
    isRestoring,
    isLoggingIn,
    lastBackupTimestamp,
    lastBackupStatus,
    checkGoogleSignInStatus,
    loadBackupSettings,
    handleGoogleLogin,
    handleGoogleLogout,
    handleToggleAutoBackup,
    handleManualBackup,
    handleRestoreFromGoogleDrive,
    formatLastBackupTime,
  };
}
