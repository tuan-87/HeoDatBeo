import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getStreakLevel,
  getStreakLevelImage,
  getStreakLevelInfo,
} from '../../utils/streak';
import { styles } from '../../styles/MoneyDiaryScreen';

export interface StreakLevelModalProps {
  visible: boolean;
  onClose: () => void;
  streakData: {
    status: string;
    count: number;
  } | null;
}

export const StreakLevelModal: React.FC<StreakLevelModalProps> = ({
  visible,
  onClose,
  streakData,
}) => {
  const { t } = useLanguage();

  const count = streakData?.count || 1;
  const level = getStreakLevel(count);
  const levelInfo = getStreakLevelInfo(level, t);
  const streakImage = getStreakLevelImage(level);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.streakModalOverlay}>
        <View style={styles.streakModalContent}>
          <Text style={styles.streakModalStatus}>
            {streakData?.status === 'increased'
              ? '🔥 ĐÃ TĂNG CHUỖI GIỮ LỬA!'
              : streakData?.status === 'preserved'
                ? '✨ CHUỖI LỬA ĐÃ ĐƯỢC DUY TRÌ!'
                : '🆕 BẮT ĐẦU CHUỖI LỬA MỚI!'}
          </Text>

          <Text style={styles.streakModalCount}>
            {count} ngày
          </Text>

          {streakData && (
            <Image
              source={streakImage}
              style={styles.streakModalImg}
            />
          )}

          <View style={styles.streakModalLevelBadge}>
            <Text style={styles.streakModalLevelTxt}>
              Cấp độ: {levelInfo.name}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: -4,
              marginBottom: 12,
            }}
          >
            {levelInfo.description}
          </Text>

          <Text style={styles.streakModalHint}>
            {streakData?.status === 'increased'
              ? 'Ghi chép giao dịch liên tục giúp nuôi dưỡng Heo béo tốt!'
              : streakData?.status === 'preserved'
                ? 'Thật may mắn, chuỗi lửa đã được khôi phục kịp thời!'
                : 'Hãy duy trì ghi chép mỗi ngày từ hôm nay nhé!'}
          </Text>

          <TouchableOpacity
            style={styles.streakModalBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.streakModalBtnText}>Tuyệt vời</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

