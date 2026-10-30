import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import { VoiceRecordingModal } from '../components/VoiceRecordingModal';
import { PendingBankTransactionsModal } from '../components/PendingBankTransactionsModal';
import {
  CategoryPickerModal,
  TransactionNoteModal,
  StreakLevelModal,
  ManualInputModal,
} from '../components/modals';
import { useBankWatcher } from '../hooks';
import { PendingBankTransaction } from '../types';
import { getGeminiApiKey } from '../services/gemini.service';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronRight,
  RotateCcw,
  Mic,
  Landmark,
} from "lucide-react-native";
import { storage } from "../store/storage";
import { Transaction, UserProfile, CategoryBudget } from "../types";
import { formatCurrency } from "../utils/format";
import { initGoogleDrive, checkAndRunAutoBackup } from "../utils/googleDrive";
import Keypad from "../components/Keypad";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useLanguage } from "../i18n/LanguageContext";
import {
  calculateNewStreak,
  StreakStatus,
} from "../utils/streak";
import { updateHomeScreenWidget } from "../utils/widget";
import { isCategoryIdMatch } from "../utils/category";
import { styles } from "../styles/MoneyDiaryScreen";
import {
  DEFAULT_INCOME_CATEGORIES,
  EXPENSE_ICONS,
  INCOME_ICONS,
  getIncomeIconSource,
} from "../constants/categoryIcons";

export {
  DEFAULT_INCOME_CATEGORIES,
  EXPENSE_ICONS,
  INCOME_ICONS,
  getIncomeIconSource,
};

const MoneyDiaryScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const { t } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const {
    pendingTransactions: pendingBankTxs,
    ignoreTransaction: handleIgnoreBankTransaction,
    clearAllTransactions: handleClearAllBankTransactions,
    isModalRequested,
    resetModalRequested,
  } = useBankWatcher();

  useEffect(() => {
    if (isModalRequested) {
      setBankModalVisible(true);
      resetModalRequested();
    }
  }, [isModalRequested]);
  const [streakModalData, setStreakModalData] = useState<{
    count: number;
    status: StreakStatus;
  } | null>(null);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<number>(0);

  // Modal chọn danh mục
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  // Modal ghi chú (sau khi chọn danh mục)
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedCategoryIdForSave, setSelectedCategoryIdForSave] =
    useState<string>("");
  const [selectedCategoryNameForSave, setSelectedCategoryNameForSave] =
    useState<string>("");
  const [modalNoteInput, setModalNoteInput] = useState("");
  const [suggestedNotes, setSuggestedNotes] = useState<string[]>([]);
  const [txDate, setTxDate] = useState(new Date());
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);

  useEffect(() => {
    initGoogleDrive();
    checkAndRunAutoBackup();

    const intervalId = setInterval(
      () => {
        checkAndRunAutoBackup();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadData();
      checkAndRunAutoBackup();
    }
  }, [isFocused]);

  const loadData = async () => {
    const p = await storage.getUserProfile();
    const cats = await storage.getCategoryBudgets();
    const activeCats = cats.filter(
      (b) => b.deleteAt === null || b.deleteAt === undefined,
    );
    setProfile(p);
    setBudgets(activeCats);

    const txs = await storage.getTransactions();
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();
    const hasRecorded = txs.some(
      (tx) => tx.timestamp >= startOfToday && tx.timestamp <= endOfToday,
    );

    updateHomeScreenWidget(p?.streakCount || 0, hasRecorded);
  };

  const handleSave = () => {
    if (amount <= 0) {
      return;
    }
    setManualInputModalVisible(false);
    setModalNoteInput("");
    setCategoryPickerVisible(true);
  };

  const handlePickCategory = async (cat: { id: string; name: string }) => {
    const { id, name } = cat;
    if (type === "expense") {
      const catBudget = budgets.find(
        (b) => (id && b.id && isCategoryIdMatch(b.id, id)) || b.name === name,
      );
      if (name === "Khác" || (catBudget && catBudget.type === "direct")) {
        if (!profile) return;
        const totalAllocated = budgets.reduce((sum, b) => sum + b.budget, 0);
        const unallocated = Math.max(
          0,
          profile.initialBalance - totalAllocated,
        );
        if (amount > unallocated) {
          Alert.alert(
            t("diary.unallocatedInsufficientTitle"),
            t("diary.unallocatedInsufficientMsg", { amount: formatCurrency(unallocated) + " " + t("common.currencySymbol") }),
          );
          return;
        }
      } else if (catBudget && (catBudget.type || "recharge") === "recharge") {
        if (amount > catBudget.budget) {
          Alert.alert(
            t("diary.budgetInsufficientTitle"),
            t("diary.budgetInsufficientMsg", { name, amount: formatCurrency(catBudget.budget) + " " + t("common.currencySymbol") }),
          );
          return;
        }
      }
    }
    setSelectedCategoryIdForSave(id);
    setSelectedCategoryNameForSave(name);
    setTxDate(new Date());
    setCategoryPickerVisible(false);

    const notes = await storage.getSuggestedNotes(type);
    setSuggestedNotes(notes);

    setNoteModalVisible(true);
  };

  const handleConfirmNote = async () => {
    if (selectedCategoryNameForSave === "Khác" && !modalNoteInput.trim()) {
      Alert.alert(
        t("diary.noteRequiredTitle"),
        t("diary.noteRequiredMsg"),
      );
      return;
    }
    setNoteModalVisible(false);
    await performSave(
      selectedCategoryIdForSave,
      selectedCategoryNameForSave,
      modalNoteInput,
      txDate,
      undefined,
    );
  };

  const performSave = async (
    chosenCategoryId: string,
    chosenCategoryName: string,
    note: string,
    transactionDate: Date,
    customLabel?: string,
    customAmount?: number,
    customType?: 'income' | 'expense',
    silent?: boolean,
  ) => {
    const amountToSave = customAmount !== undefined ? customAmount : amount;
    const txType = customType || type;
    let finalNote = note.trim() || undefined;
    if (customLabel) {
      finalNote = finalNote ? `${customLabel}: ${finalNote}` : customLabel;
    }

    let nextProfile = profile ? { ...profile } : null;
    if (!nextProfile) return;

    if (txType === "expense") {
      const allBudgets = await storage.getCategoryBudgets();
      const catBudget = allBudgets.find(
        (b) =>
          (chosenCategoryId &&
            b.id &&
            isCategoryIdMatch(b.id, chosenCategoryId)) ||
          b.name === chosenCategoryName,
      );

      if (catBudget) {
        if ((catBudget.type || "recharge") === "recharge") {
          if (amountToSave > catBudget.budget) {
            Alert.alert(
              t("diary.budgetInsufficientTitle"),
              t("diary.budgetInsufficientMsg", { name: chosenCategoryName, amount: formatCurrency(catBudget.budget) + " " + t("common.currencySymbol") }),
            );
            return;
          }
          const updatedBudgets = allBudgets.map((b) =>
            (b.id &&
              chosenCategoryId &&
              isCategoryIdMatch(b.id, chosenCategoryId)) ||
            (!b.id && b.name === chosenCategoryName)
              ? {
                  ...b,
                  budget: b.budget - amountToSave,
                  spent: (b.spent || 0) + amountToSave,
                }
              : b,
          );
          await storage.saveCategoryBudgets(updatedBudgets);
          nextProfile.initialBalance =
            nextProfile.initialBalance - amountToSave;
        } else {
          const activeBudgets = allBudgets.filter(
            (b) => b.deleteAt === null || b.deleteAt === undefined,
          );
          const totalAllocated = activeBudgets.reduce(
            (sum, b) => sum + b.budget,
            0,
          );
          const unallocated = Math.max(
            0,
            nextProfile.initialBalance - totalAllocated,
          );
          if (amountToSave > unallocated) {
            Alert.alert(
              t("diary.unallocatedInsufficientTitle"),
              t("diary.unallocatedInsufficientMsg", { amount: formatCurrency(unallocated) + " " + t("common.currencySymbol") }),
            );
            return;
          }
          const updatedBudgets = allBudgets.map((b) =>
            (b.id &&
              chosenCategoryId &&
              isCategoryIdMatch(b.id, chosenCategoryId)) ||
            (!b.id && b.name === chosenCategoryName)
              ? { ...b, spent: (b.spent || 0) + amountToSave }
              : b,
          );
          await storage.saveCategoryBudgets(updatedBudgets);
          nextProfile.initialBalance =
            nextProfile.initialBalance - amountToSave;
        }
      } else {
        const activeBudgets = allBudgets.filter(
          (b) => b.deleteAt === null || b.deleteAt === undefined,
        );
        const totalAllocated = activeBudgets.reduce(
          (sum, b) => sum + b.budget,
          0,
        );
        const unallocated = Math.max(
          0,
          nextProfile.initialBalance - totalAllocated,
        );
        if (amountToSave > unallocated) {
          Alert.alert(
            t("diary.unallocatedInsufficientTitle"),
            t("diary.unallocatedInsufficientMsg", { amount: formatCurrency(unallocated) + " " + t("common.currencySymbol") }),
          );
          return;
        }
        nextProfile.initialBalance = nextProfile.initialBalance - amountToSave;
      }
    } else {
      nextProfile.initialBalance = nextProfile.initialBalance + amountToSave;
    }

    const streakResult = calculateNewStreak(
      nextProfile.lastStreakTimestamp,
      nextProfile.streakCount || 0,
      transactionDate.getTime(),
      nextProfile.streakRecoveriesCount,
      nextProfile.lastRecoveryMonthYear,
    );

    nextProfile.streakRecoveriesCount = streakResult.newRecoveriesCount;
    nextProfile.lastRecoveryMonthYear = streakResult.newRecoveryMonthYear;

    if (streakResult.status !== "none") {
      nextProfile.streakCount = streakResult.newStreakCount;
      nextProfile.lastStreakTimestamp = transactionDate.getTime();
      setStreakModalData({
        count: streakResult.newStreakCount,
        status: streakResult.status,
      });
      setStreakModalVisible(true);
    }

    await storage.saveUserProfile(nextProfile);

    if (finalNote) {
      await storage.addSuggestedNote(txType, finalNote);
    }

    const newTx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type: txType,
      amount: amountToSave,
      categoryId: customLabel
        ? txType === "income"
          ? "income_khac"
          : "expense_khac"
        : chosenCategoryId,
      note: finalNote,
      timestamp: transactionDate.getTime(),
    };
    await storage.saveTransaction(newTx);

    if (!silent) {
      if (txType === "expense") {
        Alert.alert(t("common.success"), "Đã lưu khoản chi.");
      } else {
        Alert.alert(
          t("common.success"),
          'Đã lưu khoản thu. Vào màn hình "Chi Tiêu" để phân bổ.',
        );
      }
    }

    setAmount(0);
    loadData();
  };

  const handleConfirmBankTransaction = async (
    tx: PendingBankTransaction,
    chosenCategoryId: string,
    chosenCategoryName: string,
    note: string,
  ) => {
    await performSave(
      chosenCategoryId,
      chosenCategoryName,
      note,
      new Date(tx.timestamp),
      undefined,
      tx.amount,
      tx.type,
      true
    );
    await handleIgnoreBankTransaction(tx.id);
    Alert.alert(
      t("common.success"),
      `Đã lưu giao dịch ${formatCurrency(tx.amount)} đ vào hũ "${chosenCategoryName}"!`
    );
  };

  const handleOpenVoiceModal = async () => {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      Alert.alert("Thông báo", "Chức năng này đang được nâng cấp");
      return;
    }
    setVoiceModalVisible(true);
  };

  const handleSaveVoiceTransactions = async (
    items: {
      type: 'expense' | 'income';
      amount: number;
      categoryId: string;
      categoryName: string;
      note: string;
      timestamp: number;
    }[]
  ) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await performSave(
        item.categoryId,
        item.categoryName,
        item.note,
        new Date(item.timestamp),
        undefined,
        item.amount,
        item.type,
        true
      );
    }

    Alert.alert(
      t("common.success"),
      items.length > 1
        ? `Đã lưu thành công ${items.length} giao dịch từ giọng nói!`
        : `Đã lưu giao dịch ${items[0]?.note ? `"${items[0].note}"` : ""} thành công!`
    );
  };

  const rawIncomeCategories = (
    profile?.incomeCategories || DEFAULT_INCOME_CATEGORIES
  ).filter(
    (c: any) =>
      typeof c === "string" || c.deleteAt === null || c.deleteAt === undefined,
  );
  const incomeCategories = rawIncomeCategories.map((cat: any) => {
    if (typeof cat === "string") {
      const key =
        profile?.incomeCategoryIcons?.[cat] ||
        (cat === "Lương"
          ? "salary"
          : cat === "Thưởng"
            ? "gift-box"
            : cat === "Bán hàng"
              ? "sell"
              : "default");
      return {
        id: "income_" + cat.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: cat,
        icon: key,
      };
    }
    const iconKey =
      profile?.incomeCategoryIcons?.[cat.id] ||
      profile?.incomeCategoryIcons?.[cat.name] ||
      "default";
    return {
      id: cat.id,
      name: cat.name,
      icon: iconKey,
    };
  });

  const expenseCategories = budgets.map((b) => ({
    id: b.id || "expense_" + b.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    name: b.name,
    icon: b.icon || "default",
    type: b.type,
  }));

  const pickerCategories =
    type === "expense" ? expenseCategories : incomeCategories;
  const canProceed = amount > 0;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner Thông báo biến động số dư ngân hàng */}
          {pendingBankTxs.length > 0 && (
            <TouchableOpacity
              style={styles.bankBanner}
              activeOpacity={0.85}
              onPress={() => setBankModalVisible(true)}
            >
              <View style={styles.bankBannerLeft}>
                <Landmark size={22} color="#2563eb" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankBannerTitle}>
                    Phát hiện {pendingBankTxs.length} giao dịch ngân hàng mới
                  </Text>
                  <Text style={styles.bankBannerSub} numberOfLines={1}>
                    {pendingBankTxs[0].bankName}: {pendingBankTxs[0].type === 'expense' ? '-' : '+'}{formatCurrency(pendingBankTxs[0].amount)} đ • Chạm để phân loại
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Top Tab Section for Expense vs Income */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  type === "expense" && styles.tabActiveExpense,
                ]}
                onPress={() => setType("expense")}
              >
                <ArrowDownCircle
                  color={type === "expense" ? "#ffffff" : "#ef4444"}
                  size={20}
                />
                <Text
                  style={[
                    styles.tabText,
                    type === "expense" && styles.tabTextActive,
                  ]}
                >
                  {t("stats.expenseTitle")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  type === "income" && styles.tabActiveIncome,
                ]}
                onPress={() => setType("income")}
              >
                <ArrowUpCircle
                  color={type === "income" ? "#ffffff" : "#10b981"}
                  size={20}
                />
                <Text
                  style={[
                    styles.tabText,
                    type === "income" && styles.tabTextActive,
                  ]}
                >
                  {t("stats.incomeTitle")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nút Ghi chép bằng Giọng nói (Icon tròn màu xanh dương) */}
            <TouchableOpacity
              style={styles.voiceRecordButton}
              activeOpacity={0.8}
              onPress={handleOpenVoiceModal}
            >
              <Mic color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>

          {profile?.inputMethod === "manual" ? (
            <View style={styles.manualInputSection}>
              <TouchableOpacity
                style={styles.openManualBtn}
                onPress={() => setManualInputModalVisible(true)}
              >
                <Text style={styles.openManualBtnText}>
                  {amount === 0
                    ? t("home.amountPlaceholder")
                    : `${t("stats.total")}: ${formatCurrency(amount)} đ`}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.amountDisplay}>
                <Text
                  style={[
                    styles.amountText,
                    type === "expense" ? styles.expenseText : styles.incomeText,
                  ]}
                >
                  {formatCurrency(amount)}
                </Text>
                <Text style={styles.currencyLabel}>đ</Text>
              </View>
              {amount > 0 && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setAmount(0)}
                  activeOpacity={0.8}
                >
                  <RotateCcw color="gray" size={24} />
                </TouchableOpacity>
              )}
              <View>
                <Keypad
                  amount={amount}
                  onAddAmount={(val) => setAmount((prev) => prev + val)}
                  onClear={() => setAmount(0)}
                  hideClearButton={true}
                />
              </View>
            </>
          )}

          {profile?.inputMethod !== "manual" && (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity
                disabled={amount === 0}
                style={[
                  styles.saveButton,
                  styles.actionNextBtn,
                  canProceed
                    ? type === "expense"
                      ? styles.saveExpense
                      : styles.saveIncome
                    : styles.saveDisabled,
                ]}
                onPress={() => {
                  if (amount < 1000) {
                    Alert.alert(
                      t("common.error"),
                      "Vui lòng nhập số tiền ít nhất 1.000 đ.",
                    );
                    return;
                  }
                  handleSave();
                }}
                activeOpacity={canProceed ? 0.8 : 0.6}
              >
                <Text style={styles.saveButtonText}>{t("common.confirm")} →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal chọn danh mục */}
      <CategoryPickerModal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        type={type}
        amount={amount}
        budgets={budgets}
        profile={profile}
        pickerCategories={pickerCategories}
        onSelectCategory={handlePickCategory}
      />

      {/* Modal nhập ghi chú & ngày giờ */}
      <TransactionNoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        onBack={() => {
          setNoteModalVisible(false);
          setCategoryPickerVisible(true);
        }}
        onConfirm={handleConfirmNote}
        categoryName={selectedCategoryNameForSave}
        amount={amount}
        note={modalNoteInput}
        onChangeNote={setModalNoteInput}
        txDate={txDate}
        onChangeDate={setTxDate}
        suggestedNotes={suggestedNotes}
      />

      {/* Modal nhập thủ công */}
      <ManualInputModal
        visible={manualInputModalVisible}
        onClose={() => setManualInputModalVisible(false)}
        amount={amount}
        onChangeAmount={setAmount}
        type={type}
        canProceed={canProceed}
        onProceed={() => {
          setManualInputModalVisible(false);
          setTimeout(handleSave, 300);
        }}
      />

      {/* Modal giữ chuỗi (Streak) */}
      <StreakLevelModal
        visible={streakModalVisible}
        onClose={() => setStreakModalVisible(false)}
        streakData={streakModalData}
      />

      {/* Modal Giao dịch ngân hàng chờ phân loại */}
      <PendingBankTransactionsModal
        visible={bankModalVisible}
        onClose={() => setBankModalVisible(false)}
        transactions={pendingBankTxs}
        categories={[
          ...expenseCategories.map((c) => ({ id: c.id, name: c.name, type: 'expense' as const })),
          { id: 'expense_khac', name: 'Khác', type: 'expense' as const },
          ...incomeCategories.map((c) => ({ id: c.id, name: c.name, type: 'income' as const })),
          { id: 'income_khac', name: 'Khác', type: 'income' as const },
        ]}
        onConfirmTransaction={handleConfirmBankTransaction}
        onIgnoreTransaction={handleIgnoreBankTransaction}
        onClearAll={handleClearAllBankTransactions}
      />

      {/* Modal Ghi âm giọng nói */}
      <VoiceRecordingModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        categories={[
          ...expenseCategories.map((c) => ({ id: c.id, name: c.name, type: 'expense' as const })),
          { id: 'expense_khac', name: 'Khác', type: 'expense' as const },
          ...incomeCategories.map((c) => ({ id: c.id, name: c.name, type: 'income' as const })),
          { id: 'income_khac', name: 'Khác', type: 'income' as const },
        ]}
        onSaveTransactions={handleSaveVoiceTransactions}
      />
    </View>
  );
};

export default MoneyDiaryScreen;
