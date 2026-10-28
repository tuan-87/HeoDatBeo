import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Mic,
  Square,
  Check,
  X,
  Sparkles,
  ChevronDown,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Volume2,
} from 'lucide-react-native';
import { Alert } from './CustomAlert';
import {
  startRecording,
  stopRecording,
  cancelRecording,
} from '../services/audio.service';
import {
  parseTransactionsFromVoice,
  getGeminiApiKey,
  VoiceParsedTransaction,
} from '../services/gemini.service';
import { formatCurrency } from '../utils/format';
import { styles } from '../styles/VoiceRecordingModal';

export interface EditableTransactionItem {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  amountStr: string;
  categoryId: string;
  categoryName: string;
  note: string;
  daysAgo: number;
}

interface VoiceRecordingModalProps {
  visible: boolean;
  onClose: () => void;
  categories: { id: string; name: string; type?: 'income' | 'expense' }[];
  onSaveTransactions: (
    items: {
      type: 'expense' | 'income';
      amount: number;
      categoryId: string;
      categoryName: string;
      note: string;
      timestamp: number;
    }[]
  ) => Promise<void>;
}

type ModalState = 'idle' | 'recording' | 'analyzing' | 'confirm' | 'empty';

export const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  visible,
  onClose,
  categories,
  onSaveTransactions,
}) => {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [editableTxs, setEditableTxs] = useState<EditableTransactionItem[]>([]);
  const [categoryPickerTargetIndex, setCategoryPickerTargetIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Animation cho sóng âm / pulse khi đang ghi âm
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) {
      handleReset();
    }
  }, [visible]);

  useEffect(() => {
    if (modalState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();

      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [modalState]);

  const handleReset = () => {
    cancelRecording();
    setModalState('idle');
    setRecordSeconds(0);
    setEditableTxs([]);
    setCategoryPickerTargetIndex(null);
    setIsSaving(false);
  };

  const handleStartRecording = async () => {
    // 1. Kiểm tra API Key Gemini từ hệ thống (.env)
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      Alert.alert('Thông báo', 'Chức năng này đang được nâng cấp');
      return;
    }

    // 2. Bắt đầu thu âm
    const started = await startRecording();
    if (!started) {
      Alert.alert(
        'Không thể ghi âm',
        'Vui lòng cấp quyền truy cập Microphone trong Cài đặt của điện thoại để sử dụng tính năng này.'
      );
      return;
    }

    setModalState('recording');
  };

  const handleCancelCurrentRecording = async () => {
    await cancelRecording();
    setModalState('idle');
    setRecordSeconds(0);
  };

  const handleStopRecording = async () => {
    setModalState('analyzing');
    try {
      const audioResult = await stopRecording();
      if (!audioResult || !audioResult.base64) {
        setModalState('empty');
        return;
      }

      // 3. Gửi lên Gemini phân tích
      const parsedItems: VoiceParsedTransaction[] = await parseTransactionsFromVoice(
        audioResult.base64,
        audioResult.mimeType,
        categories
      );

      if (!parsedItems || parsedItems.length === 0) {
        setModalState('empty');
        return;
      }

      // Chuẩn hoá dữ liệu để người dùng kiểm tra / chỉnh sửa
      const formattedItems: EditableTransactionItem[] = parsedItems.map((item, idx) => {
        const itemType = item.type === 'income' ? 'income' : 'expense';
        
        // Tìm danh mục khớp nhất
        let matchedCat = categories.find(
          (c) =>
            (c.type ? c.type === itemType : true) &&
            ((item.categoryId && c.id === item.categoryId) ||
              (item.categoryName && c.name.toLowerCase() === item.categoryName.toLowerCase()))
        );

        if (!matchedCat) {
          // Gán mặc định danh mục đầu tiên của loại đó hoặc "Khác"
          const fallbackList = categories.filter((c) => (c.type ? c.type === itemType : true));
          matchedCat = fallbackList[0] || { id: 'other', name: item.categoryName || 'Khác' };
        }

        return {
          id: `${Date.now()}_${idx}`,
          type: itemType,
          amount: Math.max(0, item.amount || 0),
          amountStr: (item.amount || 0).toString(),
          categoryId: matchedCat.id,
          categoryName: matchedCat.name,
          note: item.note || '',
          daysAgo: item.daysAgo || 0,
        };
      });

      setEditableTxs(formattedItems);
      setModalState('confirm');
    } catch (error: any) {
      console.error('Lỗi phân tích giọng nói:', error);
      if (error?.message === 'NO_API_KEY') {
        Alert.alert('Thông báo', 'Chức năng này đang được nâng cấp');
        onClose();
        return;
      }
      setModalState('empty');
    }
  };

  const handleUpdateItem = (
    index: number,
    field: keyof EditableTransactionItem,
    value: any
  ) => {
    setEditableTxs((prev) => {
      const updated = [...prev];
      if (field === 'amountStr') {
        const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
        updated[index] = {
          ...updated[index],
          amountStr: value,
          amount: num,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleToggleType = (index: number) => {
    setEditableTxs((prev) => {
      const updated = [...prev];
      const newType = updated[index].type === 'expense' ? 'income' : 'expense';
      // Tìm lại danh mục mặc định theo loại mới
      const defaultCat = categories.find((c) => (c.type ? c.type === newType : true)) || {
        id: 'other',
        name: 'Khác',
      };
      updated[index] = {
        ...updated[index],
        type: newType,
        categoryId: defaultCat.id,
        categoryName: defaultCat.name,
      };
      return updated;
    });
  };

  const handlePickCategory = (cat: { id: string; name: string }) => {
    if (categoryPickerTargetIndex !== null) {
      setEditableTxs((prev) => {
        const updated = [...prev];
        updated[categoryPickerTargetIndex] = {
          ...updated[categoryPickerTargetIndex],
          categoryId: cat.id,
          categoryName: cat.name,
        };
        return updated;
      });
    }
    setCategoryPickerTargetIndex(null);
  };

  const handleConfirmSave = async () => {
    if (editableTxs.length === 0) return;

    for (const item of editableTxs) {
      if (item.amount <= 0) {
        Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0 cho tất cả giao dịch.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const now = Date.now();
      const itemsToSave = editableTxs.map((item) => {
        let txTimestamp = now;
        if (item.daysAgo > 0) {
          txTimestamp = now - item.daysAgo * 24 * 60 * 60 * 1000;
        }
        return {
          type: item.type,
          amount: item.amount,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          note: item.note.trim(),
          timestamp: txTimestamp,
        };
      });

      await onSaveTransactions(itemsToSave);
      onClose();
    } catch (e: any) {
      console.error('Lỗi khi lưu giao dịch từ giọng nói:', e);
      Alert.alert('Lỗi', e?.message || 'Không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Lọc danh mục cho category picker sub-modal theo type của item đang chọn
  const activePickerType =
    categoryPickerTargetIndex !== null && editableTxs[categoryPickerTargetIndex]
      ? editableTxs[categoryPickerTargetIndex].type
      : 'expense';

  const availableCategoriesForPicker = categories.filter((c) =>
    c.type ? c.type === activePickerType : true
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={modalState === 'recording' ? undefined : onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles color="#3b82f6" size={20} />
              <Text style={styles.headerTitle}>Ghi chép bằng giọng nói</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={modalState === 'recording' ? handleCancelCurrentRecording : onClose}
            >
              <X color="#64748b" size={18} />
            </TouchableOpacity>
          </View>

          {/* State: IDLE */}
          {modalState === 'idle' && (
            <View style={styles.idleContainer}>
              <View style={styles.sampleBox}>
                <Text style={styles.sampleTitle}>💡 Bạn có thể nói tự nhiên như:</Text>
                <Text style={styles.sampleItem}>• "Ăn bún chả 45 cành"</Text>
                <Text style={styles.sampleItem}>• "Đổ xăng xe 50k sáng nay"</Text>
                <Text style={styles.sampleItem}>• "Uống trà sữa 35k và mua bánh 20k"</Text>
                <Text style={styles.sampleItem}>• "Nhận thưởng dự án 2 củ"</Text>
              </View>

              <Text style={styles.instructionText}>
                Nhấn vào nút Micro bên dưới, nói to rõ ràng khoản thu/chi của bạn.
              </Text>

              <TouchableOpacity
                style={styles.micButtonContainer}
                activeOpacity={0.85}
                onPress={handleStartRecording}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.micButtonGradient}
                >
                  <Mic color="#ffffff" size={36} />
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.micTapLabel}>Chạm để bắt đầu nói</Text>
            </View>
          )}

          {/* State: RECORDING */}
          {modalState === 'recording' && (
            <View style={styles.recordingContainer}>
              <Text style={styles.recordingStatusText}>Đang lắng nghe...</Text>

              <Animated.View
                style={[
                  styles.micButtonContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                    shadowColor: '#ef4444',
                  },
                ]}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.micButtonGradient}
                >
                  <Volume2 color="#ffffff" size={36} />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.recordingTimer}>{formatTimer(recordSeconds)}</Text>
              <Text style={styles.recordingHint}>
                Hãy nói to rõ ràng số tiền và nội dung. Bấm "Xong" khi nói xong nhé!
              </Text>

              <View style={styles.stopButtonRow}>
                <TouchableOpacity
                  style={styles.cancelRecordingBtn}
                  onPress={handleCancelCurrentRecording}
                >
                  <Text style={styles.cancelRecordingText}>Huỷ bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stopRecordingBtn}
                  onPress={handleStopRecording}
                >
                  <Check color="#ffffff" size={18} />
                  <Text style={styles.stopRecordingText}>Xong & Phân tích</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* State: ANALYZING */}
          {modalState === 'analyzing' && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.analyzingTitle}>Heo Đất đang lắng nghe & bóc tách...</Text>
              <Text style={styles.analyzingSubtitle}>
                Đang nhận diện số tiền, loại giao dịch và danh mục phù hợp.
              </Text>
            </View>
          )}

          {/* State: EMPTY (Không nhận diện được) */}
          {modalState === 'empty' && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🐷❓</Text>
              <Text style={styles.emptyTitle}>Heo Đất chưa nghe rõ giao dịch</Text>
              <Text style={styles.emptySubtitle}>
                Chưa nhận diện được khoản tiền nào trong lời nói hoặc có quá nhiều tiếng ồn. Bạn hãy thử nói lại gần micro hơn nhé!
              </Text>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setModalState('idle')}
              >
                <Text style={styles.retryBtnText}>Thử nói lại 🎙️</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* State: CONFIRM / PREVIEW */}
          {modalState === 'confirm' && (
            <View style={styles.confirmContainer}>
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {editableTxs.map((item, index) => (
                  <View key={item.id} style={styles.cardItem}>
                    <View style={styles.cardTopRow}>
                      {/* Type Toggle */}
                      <View style={styles.typeToggleContainer}>
                        <TouchableOpacity
                          style={[
                            styles.typeToggleBtn,
                            item.type === 'expense' && styles.typeToggleBtnActiveExpense,
                          ]}
                          onPress={() => handleUpdateItem(index, 'type', 'expense')}
                        >
                          <Text
                            style={[
                              styles.typeToggleText,
                              item.type === 'expense' && styles.typeToggleTextActive,
                            ]}
                          >
                            Chi tiêu
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.typeToggleBtn,
                            item.type === 'income' && styles.typeToggleBtnActiveIncome,
                          ]}
                          onPress={() => handleUpdateItem(index, 'type', 'income')}
                        >
                          <Text
                            style={[
                              styles.typeToggleText,
                              item.type === 'income' && styles.typeToggleTextActive,
                            ]}
                          >
                            Thu nhập
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Date Badge */}
                      <Text style={styles.dateBadge}>
                        {item.daysAgo === 0
                          ? 'Hôm nay'
                          : item.daysAgo === 1
                          ? 'Hôm qua'
                          : `${item.daysAgo} ngày trước`}
                      </Text>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.amountRow}>
                      <TextInput
                        style={[
                          styles.amountInput,
                          { color: item.type === 'expense' ? '#ef4444' : '#10b981' },
                        ]}
                        keyboardType="numeric"
                        value={formatCurrency(item.amount)}
                        onChangeText={(txt) => handleUpdateItem(index, 'amountStr', txt)}
                      />
                      <Text style={styles.amountCurrency}>đ</Text>
                    </View>

                    {/* Category Selector */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Danh mục:</Text>
                      <TouchableOpacity
                        style={styles.categorySelector}
                        onPress={() => setCategoryPickerTargetIndex(index)}
                      >
                        <Text style={styles.categorySelectorText}>{item.categoryName}</Text>
                        <ChevronDown color="#64748b" size={18} />
                      </TouchableOpacity>
                    </View>

                    {/* Note Input */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Ghi chú:</Text>
                      <TextInput
                        style={styles.noteInput}
                        value={item.note}
                        placeholder="Nội dung giao dịch..."
                        placeholderTextColor="#94a3b8"
                        onChangeText={(txt) => handleUpdateItem(index, 'note', txt)}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Confirm Actions */}
              <View style={styles.confirmActionRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setModalState('idle')}
                >
                  <Text style={styles.retryBtnText}>Nói lại 🎙️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveAllBtn}
                  activeOpacity={0.85}
                  disabled={isSaving}
                  onPress={handleConfirmSave}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    style={styles.saveAllGradient}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveAllBtnText}>
                        Lưu {editableTxs.length > 1 ? `(${editableTxs.length})` : ''} giao dịch ✓
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sub-modal: Category Picker */}
          <Modal
            visible={categoryPickerTargetIndex !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setCategoryPickerTargetIndex(null)}
          >
            <View style={styles.catModalOverlay}>
              <View style={styles.catModalContent}>
                <Text style={styles.catModalTitle}>Chọn danh mục</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {availableCategoriesForPicker.map((cat) => {
                    const isSelected =
                      categoryPickerTargetIndex !== null &&
                      editableTxs[categoryPickerTargetIndex]?.categoryId === cat.id;

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catItem, isSelected && styles.catItemActive]}
                        onPress={() => handlePickCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.catItemText,
                            isSelected && styles.catItemTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.retryBtn, { marginTop: 12 }]}
                  onPress={() => setCategoryPickerTargetIndex(null)}
                >
                  <Text style={styles.retryBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

