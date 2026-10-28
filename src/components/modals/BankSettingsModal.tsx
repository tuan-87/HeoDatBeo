import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Landmark, X, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useBankWatcher } from '../../hooks';
import { styles } from '../../styles/SettingsScreen';

interface BankSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BankSettingsModal: React.FC<BankSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    isEnabled,
    isPermissionGranted,
    toggleEnabled,
    requestPermission,
  } = useBankWatcher();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Landmark color="#2563eb" size={22} />
              <Text style={styles.modalTitle}>Thông báo ngân hàng</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
            {/* Toggle Switch Card */}
            <View
              style={[
                styles.card,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.cardTitle, { fontSize: 15 }]}>Tự động nhận diện giao dịch</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Khi có biến động số dư từ Vietcombank, Techcombank, MB, MoMo..., Heo Đất sẽ tự động nhận diện và lưu vào danh sách chờ bạn phân loại.
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={toggleEnabled}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={isEnabled ? '#2563eb' : '#f1f5f9'}
              />
            </View>

            {/* Quyền Notification Access */}
            <View style={[styles.card, { marginBottom: 16 }]}>
              <Text style={[styles.cardTitle, { fontSize: 14, marginBottom: 6 }]}>
                Quyền hệ thống Android
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                {isPermissionGranted ? (
                  <>
                    <CheckCircle2 color="#10b981" size={18} />
                    <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '700' }}>
                      Đã cấp quyền truy cập thông báo
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle color="#f59e0b" size={18} />
                    <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: '700' }}>
                      Chưa cấp quyền truy cập thông báo
                    </Text>
                  </>
                )}
              </View>

              {Platform.OS === 'android' ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#eff6ff',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                  }}
                  onPress={requestPermission}
                >
                  <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 13 }}>
                    {isPermissionGranted ? 'Kiểm tra / Mở cài đặt quyền' : 'Mở Cài đặt để Cấp quyền'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 12, color: '#ef4444' }}>
                  * Tính năng này chỉ hỗ trợ hệ điều hành Android do chính sách bảo mật của Apple.
                </Text>
              )}
            </View>

            {/* Ngân hàng hỗ trợ */}
            <View style={[styles.card, { marginBottom: 16 }]}>
              <Text style={[styles.cardTitle, { fontSize: 14, marginBottom: 6 }]}>
                Ngân hàng & Ví hỗ trợ
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                • Vietcombank, Techcombank, MB Bank, TPBank{'\n'}
                • ACB, VietinBank, VPBank, Cake by VPBank{'\n'}
                • BIDV, SHB, SeABank, HDBank, OCB, LPBank{'\n'}
                • Ví điện tử: MoMo, ZaloPay, Viettel Money
              </Text>
            </View>

            {/* Cam kết bảo mật */}
            <View
              style={[
                styles.card,
                { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 4 }}>
                🔒 Bảo mật tuyệt đối
              </Text>
              <Text style={{ fontSize: 12, color: '#15803d', lineHeight: 18 }}>
                Thông báo chỉ được đọc và phân tích trực tiếp trên máy của bạn. Heo Đất Béo cam kết không bao giờ gửi tin nhắn hay số dư tài khoản của bạn ra máy chủ bên ngoài.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

