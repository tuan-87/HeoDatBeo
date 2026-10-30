import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import {
  Landmark,
  X,
  CheckCircle2,
  AlertTriangle,
  BatteryCharging,
  RefreshCw,
} from "lucide-react-native";
import { useBankWatcher } from "../../hooks";
import { styles } from "../../styles/SettingsScreen";

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
    isPostNotifGranted,
    toggleEnabled,
    requestPermission,
    requestPostNotificationsPermission,
    openBatteryOptimizationSettings,
    openAppDetailsSettings,
    openAutostartSettings,
    forceRebind,
  } = useBankWatcher();

  const [rebindStatus, setRebindStatus] = React.useState<string | null>(null);

  const handleRebind = async () => {
    setRebindStatus("Đang làm mới...");
    await forceRebind();
    setRebindStatus("Đã kết nối lại dịch vụ thành công!");
    setTimeout(() => {
      setRebindStatus(null);
    }, 3000);
  };

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
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Landmark color="#2563eb" size={22} />
              <Text style={styles.modalTitle}>Thông báo ngân hàng</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Toggle Switch Card */}
            <View
              style={[
                styles.card,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  backgroundColor: "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  padding: 14,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.cardTitle, { fontSize: 15 }]}>
                  Tự động nhận diện giao dịch
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Khi có biến động số dư từ Vietcombank, Techcombank, MB,
                  MoMo..., Heo Đất sẽ tự động nhận diện và lưu vào danh sách chờ
                  bạn phân loại.
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={toggleEnabled}
                trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                thumbColor={isEnabled ? "#2563eb" : "#f1f5f9"}
              />
            </View>

            {/* Quyền Notification Access */}
            <View
              style={[
                styles.card,
                {
                  flexDirection: "column",
                  alignItems: "stretch",
                  marginBottom: 16,
                  backgroundColor: "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  padding: 14,
                },
              ]}
            >
              <Text
                style={[styles.cardTitle, { fontSize: 14, marginBottom: 6 }]}
              >
                Quyền hệ thống Android
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {isPermissionGranted ? (
                  <>
                    <CheckCircle2 color="#10b981" size={18} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#10b981",
                        fontWeight: "700",
                      }}
                    >
                      Đã cấp quyền truy cập thông báo
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle color="#f59e0b" size={18} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#f59e0b",
                        fontWeight: "700",
                      }}
                    >
                      Chưa cấp quyền truy cập thông báo
                    </Text>
                  </>
                )}
              </View>

              {Platform.OS === "android" ? (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#eff6ff",
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#bfdbfe",
                    }}
                    onPress={requestPermission}
                  >
                    <Text
                      style={{
                        color: "#2563eb",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {isPermissionGranted
                        ? "Kiểm tra / Mở cài đặt Quyền truy cập thông báo"
                        : "Mở Cài đặt để Cấp quyền đọc thông báo"}
                    </Text>
                  </TouchableOpacity>

                  {Platform.Version >= 33 && !isPostNotifGranted && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#fef3c7",
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#fde68a",
                      }}
                      onPress={requestPostNotificationsPermission}
                    >
                      <Text
                        style={{
                          color: "#b45309",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        🔔 Cấp quyền hiển thị banner thông báo (Android 13+)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: "#ef4444" }}>
                  * Tính năng này chỉ hỗ trợ hệ điều hành Android do chính sách
                  bảo mật của Apple.
                </Text>
              )}
            </View>

            {/* Giữ chạy ngầm & Tối ưu hoá Pin */}
            {Platform.OS === "android" && (
              <View
                style={[
                  styles.card,
                  {
                    flexDirection: "column",
                    alignItems: "stretch",
                    marginBottom: 16,
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    padding: 14,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <BatteryCharging color="#2563eb" size={18} />
                  <Text style={[styles.cardTitle, { fontSize: 14 }]}>
                    Tối ưu pin & Giữ chạy ngầm
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 18,
                    marginBottom: 10,
                  }}
                >
                  Một số dòng máy (Samsung, Xiaomi, Oppo, Vivo...) thường tự tắt
                  dịch vụ đọc thông báo khi máy tắt màn hình. Để nhận diện 100%
                  giao dịch:
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#334155",
                    fontWeight: "600",
                    marginBottom: 10,
                    lineHeight: 18,
                  }}
                >
                  • Hãy chọn "Không hạn chế" (Unrestricted) trong cài đặt Pin.
                  {"\n"}• Máy Xiaomi: Bật "Tự khởi chạy" và KHÓA app trong màn
                  hình Đa nhiệm (Nhấn giữ app ➔ bấm Ổ khóa).
                  {"\n"}• Nếu thấy tính năng bị ngắt kết nối, hãy bấm nút "Làm
                  mới kết nối" bên dưới.
                </Text>

                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#eff6ff",
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#bfdbfe",
                    }}
                    onPress={openAppDetailsSettings}
                  >
                    <Text
                      style={{
                        color: "#2563eb",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      Mở Cài đặt Ứng dụng (Chọn Pin: Không hạn chế)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: "#fff7ed",
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#fed7aa",
                    }}
                    onPress={openAutostartSettings}
                  >
                    <Text
                      style={{
                        color: "#c2410c",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      ⚡ Mở Tự khởi chạy (Autostart - Dành cho Xiaomi)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: "#f1f5f9",
                      paddingVertical: 9,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onPress={handleRebind}
                  >
                    <RefreshCw color="#475569" size={15} />
                    <Text
                      style={{
                        color: "#334155",
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Làm mới kết nối dịch vụ
                    </Text>
                  </TouchableOpacity>

                  {rebindStatus && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#10b981",
                        textAlign: "center",
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      ✓ {rebindStatus}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Ngân hàng hỗ trợ */}
            <View
              style={[
                styles.card,
                {
                  flexDirection: "column",
                  alignItems: "stretch",
                  marginBottom: 16,
                  backgroundColor: "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  padding: 14,
                },
              ]}
            >
              <Text
                style={[styles.cardTitle, { fontSize: 14, marginBottom: 8 }]}
              >
                Ngân hàng & Ví hỗ trợ
              </Text>
              <View style={{ gap: 4 }}>
                <Text
                  style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}
                >
                  • Vietcombank, Techcombank, MB Bank, TPBank
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}
                >
                  • ACB, VietinBank, VPBank, Cake by VPBank
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}
                >
                  • BIDV, SHB, SeABank, HDBank, OCB, LPBank
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}
                >
                  • Ví điện tử: MoMo, ZaloPay, Viettel Money
                </Text>
              </View>
            </View>

            {/* Cam kết bảo mật */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: "#f0fdf4",
                  borderColor: "#bbf7d0",
                  borderWidth: 1,
                  flexDirection: "column",
                  alignItems: "stretch",
                  padding: 14,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#166534",
                  marginBottom: 4,
                }}
              >
                🔒 Bảo mật tuyệt đối
              </Text>
              <Text style={{ fontSize: 12, color: "#15803d", lineHeight: 18 }}>
                Thông báo chỉ được đọc và phân tích trực tiếp trên máy của bạn.
                Heo Đất Béo cam kết không bao giờ gửi tin nhắn hay số dư tài
                khoản của bạn ra máy chủ bên ngoài.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
