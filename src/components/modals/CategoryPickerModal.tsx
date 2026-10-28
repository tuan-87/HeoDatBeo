import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrency } from '../../utils/format';
import { isCategoryIdMatch } from '../../utils/category';
import { EXPENSE_ICONS, getIncomeIconSource } from '../../constants/categoryIcons';
import { styles } from '../../styles/MoneyDiaryScreen';
import { CategoryBudget, UserProfile } from '../../types';

export interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'expense' | 'income';
  amount: number;
  budgets: CategoryBudget[];
  profile: UserProfile | null;
  pickerCategories: Array<{ id: string; name: string; icon?: string; type?: string }>;
  onSelectCategory: (category: { id: string; name: string; icon?: string; type?: string }) => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  onClose,
  type,
  amount,
  budgets,
  profile,
  pickerCategories,
  onSelectCategory,
}) => {
  const { t } = useLanguage();

  const totalAllocated = budgets.reduce((s, b) => s + b.budget, 0);
  const unallocated = profile
    ? Math.max(0, profile.initialBalance - totalAllocated)
    : 0;

  const categoriesData = [
    ...pickerCategories,
    ...(type === 'expense'
      ? [
          {
            id: 'expense_khac',
            name: 'Khác',
            icon: 'default',
            type: 'direct' as const,
          },
        ]
      : [
          {
            id: 'income_khac',
            name: 'Khác',
            icon: 'default',
          },
        ]),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.catPickerOverlay}>
        <View style={styles.catPickerModal}>
          <View style={styles.catPickerHeader}>
            <View>
              <Text style={styles.customCatTitle}>
                {type === 'expense'
                  ? t('diary.selectExpenseCategory')
                  : t('diary.selectIncomeSource')}
              </Text>
              <Text style={styles.catPickerSubtitle}>
                {t('diary.amountLabel')}: {formatCurrency(amount)} {t('common.currencySymbol')}
                {type === 'expense' && (
                  <Text style={{ fontWeight: '600', color: '#7c3aed' }}>
                    {' '}
                    • {t('diary.unallocatedLabel')}: {formatCurrency(unallocated)} {t('common.currencySymbol')}
                  </Text>
                )}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          {pickerCategories.length === 0 ? (
            <View style={styles.emptyCatContainer}>
              <Text style={styles.emptyCatText}>
                Chưa có danh mục. Vào màn hình "Chia Tiền" để tạo danh mục.
              </Text>
            </View>
          ) : (
            <FlatList
              showsVerticalScrollIndicator={false}
              data={categoriesData}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={styles.catPickerGridColumnWrapper}
              contentContainerStyle={styles.catPickerGrid}
              renderItem={({ item }) => {
                let iconSource;
                if (type === 'expense') {
                  iconSource =
                    EXPENSE_ICONS[item.icon || 'default'] ||
                    EXPENSE_ICONS['default'];
                } else {
                  iconSource = getIncomeIconSource(item.id, profile);
                }

                let isExceeded = false;
                if (type === 'expense') {
                  if (item.name === 'Khác' || (item as any).type === 'direct') {
                    isExceeded = amount > unallocated;
                  } else {
                    const catBudget = budgets.find(
                      (b) =>
                        (item.id && b.id && isCategoryIdMatch(b.id, item.id)) ||
                        b.name === item.name,
                    );
                    const remaining = catBudget ? catBudget.budget : 0;
                    isExceeded = amount > remaining;
                  }
                }

                return (
                  <TouchableOpacity
                    style={[
                      styles.catPickerGridItem,
                      isExceeded && styles.catPickerItemExceeded,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onSelectCategory(item)}
                  >
                    <View style={styles.catPickerIconBox}>
                      <Image source={iconSource} style={styles.catPickerIconImg} />
                    </View>
                    <Text
                      style={[
                        styles.catPickerGridItemName,
                        isExceeded && styles.catPickerItemNameExceeded,
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

