import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Alert } from '../CustomAlert';
import { useLanguage } from '../../i18n/LanguageContext';
import { styles } from '../../styles/MoneyDiaryScreen';

export interface ManualInputModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  onChangeAmount: (amount: number) => void;
  type: 'expense' | 'income';
  canProceed: boolean;
  onProceed: () => void;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  visible,
  onClose,
  amount,
  onChangeAmount,
  type,
  canProceed,
  onProceed,
}) => {
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.manualInputModalOverlay}>
      <View style={styles.manualInputModalContent}>
        <View style={styles.manualInputHeader}>
          <Text style={styles.manualInputTitle}>
            {t('diary.manualInputTitle')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#64748b" size={24} />
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.manualTextInput}
          value={amount === 0 ? '' : amount.toString()}
          onChangeText={(text) => {
            const clean = text.replace(/[^0-9]/g, '');
            onChangeAmount(clean ? parseInt(clean, 10) : 0);
          }}
          keyboardType="number-pad"
          placeholder="0 VNĐ"
          placeholderTextColor="#94a3b8"
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.manualInputDoneBtn,
            canProceed
              ? type === 'expense'
                ? styles.saveExpense
                : styles.saveIncome
              : styles.saveDisabled,
          ]}
          onPress={() => {
            if (amount < 1000) {
              Alert.alert(
                'Số tiền không đủ',
                'Vui lòng nhập số tiền ít nhất 1.000 đ.',
              );
              return;
            }
            onProceed();
          }}
        >
          <Text style={styles.manualInputDoneBtnText}>Tiếp Theo →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

