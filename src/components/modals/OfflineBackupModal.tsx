import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Upload, Download } from 'lucide-react-native';
import { styles } from '../../styles/SettingsScreen';

interface OfflineBackupModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const OfflineBackupModal: React.FC<OfflineBackupModalProps> = ({
  visible,
  onClose,
  onExport,
  onImport,
}) => {
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
            <Text style={styles.modalTitle}>💾 Sao lưu ngoại tuyến</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={[styles.card, { marginBottom: 16 }]}
              onPress={() => {
                onClose();
                onExport();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Upload color="#4f46e5" size={18} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Xuất dữ liệu (.txt)</Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  Xuất dữ liệu ra file văn bản (.txt) mã hóa để lưu trữ hoặc chuyển thiết bị.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { marginBottom: 16 }]}
              onPress={() => {
                onClose();
                onImport();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Download color="#16a34a" size={18} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Nhập dữ liệu (.txt)</Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  Nhập và phục hồi dữ liệu từ file văn bản (.txt) đã xuất trước đó.
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeSettingsBtn, { marginTop: 16 }]}
            onPress={onClose}
          >
            <Text style={styles.closeSettingsBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

