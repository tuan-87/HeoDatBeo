import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { X, Cloud } from 'lucide-react-native';
import { useGoogleDriveBackup } from '../../hooks';
import { styles } from '../../styles/SettingsScreen';

interface GoogleDriveModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
  t?: (key: string) => string;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  visible,
  onClose,
  onRestoreSuccess,
  t,
}) => {
  const {
    isGoogleSignedIn,
    googleUserEmail,
    isAutoBackupEnabled,
    isBackingUp,
    isRestoring,
    isLoggingIn,
    lastBackupTimestamp,
    lastBackupStatus,
    handleGoogleLogin,
    handleGoogleLogout,
    handleToggleAutoBackup,
    handleManualBackup,
    handleRestoreFromGoogleDrive,
    formatLastBackupTime,
  } = useGoogleDriveBackup(t);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sao lưu dữ liệu tự động</Text>
              <TouchableOpacity onPress={onClose}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Trạng thái liên kết */}
              <View style={styles.driveStatusCard}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Cloud
                    color={isGoogleSignedIn ? '#0891b2' : '#94a3b8'}
                    size={28}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#1e293b',
                      }}
                    >
                      {isGoogleSignedIn
                        ? 'Đã liên kết Google Drive'
                        : 'Chưa liên kết tài khoản'}
                    </Text>
                    {isGoogleSignedIn && googleUserEmail && (
                      <Text
                        style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}
                      >
                        {googleUserEmail}
                      </Text>
                    )}
                  </View>
                </View>

                {isGoogleSignedIn ? (
                  <TouchableOpacity
                    style={styles.driveLogoutBtn}
                    onPress={handleGoogleLogout}
                  >
                    <Text style={styles.driveLogoutBtnText}>
                      Hủy liên kết tài khoản
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.driveLoginBtn}
                    onPress={handleGoogleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.driveLoginBtnText}>
                        Đăng nhập Google
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Tùy chọn Tự động Sao lưu */}
              <View
                style={[
                  styles.driveOptionRow,
                  !isGoogleSignedIn && { opacity: 0.5 },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.driveOptionTitle}>
                    Tự động sao lưu hàng ngày
                  </Text>
                  <Text style={styles.driveOptionDesc}>
                    Tự động đồng bộ và sao lưu dữ liệu lên Google Drive lúc 1:00
                    sáng mỗi ngày.
                  </Text>
                </View>
                <Switch
                  value={isAutoBackupEnabled}
                  onValueChange={handleToggleAutoBackup}
                  disabled={!isGoogleSignedIn}
                  trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
                  thumbColor={isAutoBackupEnabled ? '#0891b2' : '#f1f5f9'}
                />
              </View>

              {/* Sao lưu thủ công */}
              <View
                style={[
                  styles.driveActionBox,
                  !isGoogleSignedIn && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.driveSectionTitle}>Sao lưu thủ công</Text>
                <Text style={styles.driveSectionDesc}>
                  Tải dữ liệu hiện tại lên Google Drive ngay lập tức.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.driveManualBtn,
                    !isGoogleSignedIn && styles.driveBtnDisabled,
                  ]}
                  onPress={handleManualBackup}
                  disabled={!isGoogleSignedIn || isBackingUp}
                >
                  {isBackingUp ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.driveManualBtnText}>
                      Sao lưu ngay bây giờ
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Thông tin lịch sử sao lưu */}
              <View style={styles.driveHistoryBox}>
                <Text style={styles.driveHistoryTitle}>
                  Thông tin sao lưu gần nhất
                </Text>

                <View style={styles.driveHistoryRow}>
                  <Text style={styles.driveHistoryLabel}>Trạng thái:</Text>
                  <Text
                    style={[
                      styles.driveHistoryValue,
                      {
                        fontWeight: 'bold',
                        color:
                          lastBackupStatus === 'success'
                            ? '#16a34a'
                            : lastBackupStatus === 'failed'
                              ? '#dc2626'
                              : '#64748b',
                      },
                    ]}
                  >
                    {lastBackupStatus === 'success'
                      ? 'Thành công'
                      : lastBackupStatus === 'failed'
                        ? 'Thất bại'
                        : 'Chưa thực hiện'}
                  </Text>
                </View>

                <View style={styles.driveHistoryRow}>
                  <Text style={styles.driveHistoryLabel}>Thời gian:</Text>
                  <Text style={styles.driveHistoryValue}>
                    {formatLastBackupTime(lastBackupTimestamp)}
                  </Text>
                </View>

                <View style={styles.driveWarningBox}>
                  <Text style={styles.driveWarningText}>
                    * Lưu ý: Mỗi lần sao lưu sẽ tạo một file riêng có tên dạng
                    heodatbeo_YYYY-MM-DD_[giây UTC].txt. Khi đạt tối đa 20 bản
                    sao lưu trên Google Drive, hệ thống sẽ tự động xóa 17 bản
                    sao lưu cũ nhất và chỉ giữ lại 3 bản sao lưu mới nhất.
                  </Text>
                </View>
              </View>

              {/* Khôi phục dữ liệu từ Google Drive */}
              <View
                style={[
                  styles.driveActionBox,
                  { marginTop: 16 },
                  !isGoogleSignedIn && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.driveSectionTitle}>Khôi phục dữ liệu</Text>
                <Text style={styles.driveSectionDesc}>
                  Khôi phục bản sao lưu mới nhất từ Google Drive của bạn.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.driveRestoreBtn,
                    !isGoogleSignedIn && styles.driveBtnDisabled,
                  ]}
                  onPress={() => handleRestoreFromGoogleDrive(onRestoreSuccess)}
                  disabled={!isGoogleSignedIn || isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.driveRestoreBtnText}>
                      Khôi phục dữ liệu
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Loading khi đang Backup */}
      <Modal visible={isBackingUp} transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.settingsModalBox,
              { alignItems: "center", paddingVertical: 32 },
            ]}
          >
            <View
              style={{
                marginBottom: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Cloud color="#0891b2" size={48} />
              <ActivityIndicator
                size="large"
                color="#0891b2"
                style={{ position: "absolute", transform: [{ scale: 1.6 }] }}
              />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#0f172a",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Đang tải lên dữ liệu...
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#64748b",
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Vui lòng không đóng ứng dụng để quá trình sao lưu hoàn tất.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};
