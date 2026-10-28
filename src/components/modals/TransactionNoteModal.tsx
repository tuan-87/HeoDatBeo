import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrency } from '../../utils/format';
import { styles } from '../../styles/MoneyDiaryScreen';

export interface TransactionNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
  categoryName: string;
  amount: number;
  note: string;
  onChangeNote: (text: string) => void;
  txDate: Date;
  onChangeDate: (date: Date) => void;
  suggestedNotes: string[];
}

export const TransactionNoteModal: React.FC<TransactionNoteModalProps> = ({
  visible,
  onClose,
  onBack,
  onConfirm,
  categoryName,
  amount,
  note,
  onChangeNote,
  txDate,
  onChangeDate,
  suggestedNotes,
}) => {
  const { t } = useLanguage();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const openDatePicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      onChangeDate(selectedDate);
    }
  };

  const formatTxDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTxTime = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.noteModalOverlay}>
        <View style={styles.noteModalContent}>
          <View style={styles.noteModalHeader}>
            <Text style={styles.noteModalTitle}>{t('diary.noteModalTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.noteModalCategoryText}>
            {categoryName} • {t('diary.amountLabel')}:{' '}
            {formatCurrency(amount)} {t('common.currencySymbol')}
          </Text>

          <Text style={styles.noteModalLabel}>
            {t('diary.inputNoteLabel')}
            {categoryName === 'Khác' && (
              <Text style={{ color: '#ef4444', fontWeight: 'bold' }}> *</Text>
            )}
          </Text>

          <TextInput
            style={styles.noteModalInput}
            value={note}
            onChangeText={onChangeNote}
            placeholder={
              categoryName === 'Khác'
                ? 'Bắt buộc nhập ghi chú...'
                : 'Ví dụ: Ăn sáng, mua cá, đổ xăng...'
            }
            placeholderTextColor="#94a3b8"
            autoFocus
            maxLength={100}
          />

          {/* DateTime Pickers */}
          <View style={styles.dateTimePickerRow}>
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => openDatePicker('date')}
            >
              <Text style={styles.dateTimeBtnLabel}>{t('diary.dateLabel')}</Text>
              <Text style={styles.dateTimeBtnValue}>
                {formatTxDate(txDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => openDatePicker('time')}
            >
              <Text style={styles.dateTimeBtnLabel}>{t('diary.timeLabel')}</Text>
              <Text style={styles.dateTimeBtnValue}>
                {formatTxTime(txDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={txDate}
              mode={pickerMode}
              is24Hour={true}
              display="default"
              onChange={handleDateChange}
            />
          )}

          {/* Ghi chú gợi ý */}
          {suggestedNotes.length > 0 && (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedLabel}>{t('diary.recentNotes')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedList}
              >
                {suggestedNotes.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestedChip}
                    onPress={() => onChangeNote(item)}
                  >
                    <Text style={styles.suggestedChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={styles.noteModalCancelBtn}
              onPress={onBack}
            >
              <Text style={styles.noteModalCancelText}>{t('diary.backBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.noteModalConfirmBtn}
              onPress={onConfirm}
            >
              <Text style={styles.noteModalConfirmText}>{t('diary.saveTransaction')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

