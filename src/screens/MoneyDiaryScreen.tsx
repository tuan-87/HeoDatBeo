import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import DateTimePicker from "@react-native-community/datetimepicker";
import LinearGradient from 'react-native-linear-gradient';
import { VoiceRecordingModal } from '../components/VoiceRecordingModal';
import { getGeminiApiKey } from '../services/gemini.service';
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronRight,
  RotateCcw,
  Mic,
  Sparkles,
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
  getStreakLevel,
  getStreakLevelImage,
  getStreakLevelInfo,
} from "../utils/streak";
import { updateHomeScreenWidget } from "../utils/widget";
import { isCategoryIdMatch } from "../utils/category";
import { styles } from "../styles/MoneyDiaryScreen";

const DEFAULT_INCOME_CATEGORIES = ["Lương", "Thưởng", "Bán hàng"];

export const EXPENSE_ICONS: Record<string, any> = {
  badminton: require("../../assets/expense_icon/badminton.png"),
  beer_mug: require("../../assets/expense_icon/beer-mug.png"),
  bicycle: require("../../assets/expense_icon/bicycle.png"),
  bill: require("../../assets/expense_icon/bill.png"),
  bill_1: require("../../assets/expense_icon/bill_1.png"),
  brand: require("../../assets/expense_icon/brand.png"),
  bus: require("../../assets/expense_icon/bus.png"),
  candies: require("../../assets/expense_icon/candies.png"),
  "card-games": require("../../assets/expense_icon/card-games.png"),
  "clean-clothes": require("../../assets/expense_icon/clean-clothes.png"),
  competitors: require("../../assets/expense_icon/competitors.png"),
  cooking: require("../../assets/expense_icon/cooking.png"),
  cosmetics: require("../../assets/expense_icon/cosmetics.png"),
  date: require("../../assets/expense_icon/date.png"),
  default: require("../../assets/expense_icon/default.png"),
  drink: require("../../assets/expense_icon/drink.png"),
  "electric-car": require("../../assets/expense_icon/electric-car.png"),
  "engine-oil": require("../../assets/expense_icon/engine-oil.png"),
  "flash-card": require("../../assets/expense_icon/flash-card.png"),
  fried_rice: require("../../assets/expense_icon/fried-rice.png"),
  "game-console": require("../../assets/expense_icon/game-console.png"),
  "gas-stove": require("../../assets/expense_icon/gas-stove.png"),
  "gift-card": require("../../assets/expense_icon/gift-card.png"),
  gift: require("../../assets/expense_icon/gift.png"),
  gloves: require("../../assets/expense_icon/gloves.png"),
  "hair-cut": require("../../assets/expense_icon/hair-cut.png"),
  http: require("../../assets/expense_icon/http.png"),
  "ice-cream": require("../../assets/expense_icon/ice-cream.png"),
  "interior-design": require("../../assets/expense_icon/interior-design.png"),
  maintenance: require("../../assets/expense_icon/maintenance.png"),
  internet: require("../../assets/expense_icon/internet.png"),
  internet_2: require("../../assets/expense_icon/internet_2.png"),
  invoice: require("../../assets/expense_icon/invoice.png"),
  iphone: require("../../assets/expense_icon/iphone.png"),
  jewelry: require("../../assets/expense_icon/jewelry.png"),
  keyboard: require("../../assets/expense_icon/keyboard.png"),
  kitchen: require("../../assets/expense_icon/kitchen.png"),
  lockers: require("../../assets/expense_icon/lockers.png"),
  main_meal: require("../../assets/expense_icon/main_meal.png"),
  moon: require("../../assets/expense_icon/moon.png"),
  motorbike: require("../../assets/expense_icon/motorbike.png"),
  motorbike_1: require("../../assets/expense_icon/motorbike_1.png"),
  motorcycle: require("../../assets/expense_icon/motorcycle.png"),
  napkin: require("../../assets/expense_icon/napkin.png"),
  noodle: require("../../assets/expense_icon/noodle.png"),
  other: require("../../assets/expense_icon/other.png"),
  outreach: require("../../assets/expense_icon/outreach.png"),
  "parking-car": require("../../assets/expense_icon/parking-car.png"),
  party: require("../../assets/expense_icon/party.png"),
  petrol: require("../../assets/expense_icon/petrol.png"),
  pizza: require("../../assets/expense_icon/pizza.png"),
  plugin: require("../../assets/expense_icon/plugin.png"),
  premium: require("../../assets/expense_icon/premium.png"),
  private: require("../../assets/expense_icon/private.png"),
  rent_house: require("../../assets/expense_icon/rent_house.png"),
  review: require("../../assets/expense_icon/review.png"),
  ring: require("../../assets/expense_icon/ring.png"),
  shampoo: require("../../assets/expense_icon/shampoo.png"),
  shoes: require("../../assets/expense_icon/shoes.png"),
  smoothie: require("../../assets/expense_icon/smoothie.png"),
  "strawberry-cake": require("../../assets/expense_icon/strawberry-cake.png"),
  sweets: require("../../assets/expense_icon/sweets.png"),
  "teddy-bear": require("../../assets/expense_icon/teddy-bear.png"),
  tent: require("../../assets/expense_icon/tent.png"),
  "travel-luggage": require("../../assets/expense_icon/travel-luggage.png"),
  tree: require("../../assets/expense_icon/tree.png"),
  trophy: require("../../assets/expense_icon/trophy.png"),
  "watching-a-movie": require("../../assets/expense_icon/watching-a-movie.png"),
  "water-tap": require("../../assets/expense_icon/water-tap.png"),
  wedding: require("../../assets/expense_icon/wedding.png"),
  wrench: require("../../assets/expense_icon/wrench.png"),
  wristwatch: require("../../assets/expense_icon/wristwatch.png"),
};

export const INCOME_ICONS: Record<string, any> = {
  bag: require("../../assets/income_icon/bag.png"),
  bank: require("../../assets/income_icon/bank.png"),
  chess: require("../../assets/income_icon/chess.png"),
  coding: require("../../assets/income_icon/coding.png"),
  deal: require("../../assets/income_icon/deal.png"),
  default: require("../../assets/income_icon/default.png"),
  developer: require("../../assets/income_icon/developer.png"),
  driver: require("../../assets/income_icon/driver.png"),
  game: require("../../assets/income_icon/game.png"),
  "gas-pump": require("../../assets/income_icon/gas-pump.png"),
  gem: require("../../assets/income_icon/gem.png"),
  "gift-box": require("../../assets/income_icon/gift-box.png"),
  "gold-price": require("../../assets/income_icon/gold-price.png"),
  lease: require("../../assets/income_icon/lease.png"),
  "live-streaming": require("../../assets/income_icon/live-streaming.png"),
  lucky_money: require("../../assets/income_icon/lucky_money.png"),
  other: require("../../assets/income_icon/other.png"),
  profits: require("../../assets/income_icon/profits.png"),
  salary: require("../../assets/income_icon/salary.png"),
  salary_1: require("../../assets/income_icon/salary_1.png"),
  sell: require("../../assets/income_icon/sell.png"),
  selling: require("../../assets/income_icon/selling.png"),
  "social-media": require("../../assets/income_icon/social-media.png"),
  stock: require("../../assets/income_icon/stock.png"),
  support_4g: require("../../assets/income_icon/support_4g.png"),
  support_opening_dealer: require("../../assets/income_icon/support_opening_dealer.png"),
  surprise: require("../../assets/income_icon/surprise.png"),
  teacher: require("../../assets/income_icon/teacher.png"),
};

export const getIncomeIconSource = (
  catNameOrId: string,
  profile: UserProfile | null,
) => {
  const match = (profile?.incomeCategories || []).find(
    (c: any) =>
      typeof c === "object" && (c.id === catNameOrId || c.name === catNameOrId),
  ) as any;
  if (match && match.icon && INCOME_ICONS[match.icon]) {
    return INCOME_ICONS[match.icon];
  }

  const key = profile?.incomeCategoryIcons?.[catNameOrId];
  if (key && INCOME_ICONS[key]) {
    return INCOME_ICONS[key];
  }
  if (match) {
    const keyByMatch =
      profile?.incomeCategoryIcons?.[match.id] ||
      profile?.incomeCategoryIcons?.[match.name];
    if (keyByMatch && INCOME_ICONS[keyByMatch]) {
      return INCOME_ICONS[keyByMatch];
    }
    const catName = match.name;
    if (catName === "Lương") return INCOME_ICONS["salary"];
    if (catName === "Thưởng") return INCOME_ICONS["gift-box"];
    if (catName === "Bán hàng") return INCOME_ICONS["sell"];
  }

  if (catNameOrId === "Lương" || catNameOrId === "income_luong")
    return INCOME_ICONS["salary"];
  if (catNameOrId === "Thưởng" || catNameOrId === "income_thuong")
    return INCOME_ICONS["gift-box"];
  if (catNameOrId === "Bán hàng" || catNameOrId === "income_ban_hang")
    return INCOME_ICONS["sell"];
  return INCOME_ICONS["default"];
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const openDatePicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTxDate(selectedDate);
    }
  };

  const formatTxDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const formatTxTime = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  };

  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const manualInputRef = useRef<TextInput>(null);

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

            {/* Nút Ghi chép bằng Giọng nói */}
            <TouchableOpacity
              style={styles.voiceRecordButton}
              activeOpacity={0.8}
              onPress={handleOpenVoiceModal}
            >
              <LinearGradient
                colors={["#4338ca", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.voiceRecordGradient}
              >
                <Mic color="#ffffff" size={17} />
                <Text style={styles.voiceRecordText}>Ghi chép bằng giọng nói</Text>
                <Sparkles color="#fbbf24" size={15} />
              </LinearGradient>
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
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <View style={styles.catPickerOverlay}>
          <View style={styles.catPickerModal}>
            {(() => {
              const totalAllocated = budgets.reduce((s, b) => s + b.budget, 0);
              const unallocated = profile
                ? Math.max(0, profile.initialBalance - totalAllocated)
                : 0;

              return (
                <>
                  <View style={styles.catPickerHeader}>
                    <View>
                      <Text style={styles.customCatTitle}>
                        {type === "expense"
                          ? t("diary.selectExpenseCategory")
                          : t("diary.selectIncomeSource")}
                      </Text>
                      <Text style={styles.catPickerSubtitle}>
                        {t("diary.amountLabel")}: {formatCurrency(amount)} {t("common.currencySymbol")}
                        {type === "expense" && (
                          <Text style={{ fontWeight: "600", color: "#7c3aed" }}>
                            {" "}
                            • {t("diary.unallocatedLabel")}: {formatCurrency(unallocated)} {t("common.currencySymbol")}
                          </Text>
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCategoryPickerVisible(false)}
                    >
                      <X color="#64748b" size={24} />
                    </TouchableOpacity>
                  </View>

                  {pickerCategories.length === 0 ? (
                    <View style={styles.emptyCatContainer}>
                      <Text style={styles.emptyCatText}>
                        Chưa có danh mục. Vào màn hình "Chia Tiền" để tạo danh
                        mục.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      showsVerticalScrollIndicator={false}
                      data={[
                        ...pickerCategories,
                        ...(type === "expense"
                          ? [
                              {
                                id: "expense_khac",
                                name: "Khác",
                                icon: "default",
                                type: "direct" as const,
                              },
                            ]
                          : [
                              {
                                id: "income_khac",
                                name: "Khác",
                                icon: "default",
                              },
                            ]),
                      ]}
                      keyExtractor={(item) => item.id}
                      numColumns={3}
                      columnWrapperStyle={styles.catPickerGridColumnWrapper}
                      contentContainerStyle={styles.catPickerGrid}
                      renderItem={({ item }) => {
                        let iconSource;
                        if (type === "expense") {
                          iconSource =
                            EXPENSE_ICONS[item.icon || "default"] ||
                            EXPENSE_ICONS["default"];
                        } else {
                          iconSource = getIncomeIconSource(item.id, profile);
                        }

                        let isExceeded = false;
                        if (type === "expense") {
                          if (
                            item.name === "Khác" ||
                            (item as any).type === "direct"
                          ) {
                            isExceeded = amount > unallocated;
                          } else {
                            const catBudget = budgets.find(
                              (b) =>
                                (item.id &&
                                  b.id &&
                                  isCategoryIdMatch(b.id, item.id)) ||
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
                            onPress={() => handlePickCategory(item)}
                          >
                            <View style={styles.catPickerIconBox}>
                              <Image
                                source={iconSource}
                                style={styles.catPickerIconImg}
                              />
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
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal nhập ghi chú */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContent}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>{t("diary.noteModalTitle")}</Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteModalCategoryText}>
              {selectedCategoryNameForSave} • {t("diary.amountLabel")}:{" "}
              {formatCurrency(amount)} {t("common.currencySymbol")}
            </Text>

            <Text style={styles.noteModalLabel}>
              {t("diary.inputNoteLabel")}
              {selectedCategoryNameForSave === "Khác" && (
                <Text style={{ color: "#ef4444", fontWeight: "bold" }}> *</Text>
              )}
            </Text>

            <TextInput
              style={styles.noteModalInput}
              value={modalNoteInput}
              onChangeText={setModalNoteInput}
              placeholder={
                selectedCategoryNameForSave === "Khác"
                  ? "Bắt buộc nhập ghi chú..."
                  : "Ví dụ: Ăn sáng, mua cá, đổ xăng..."
              }
              placeholderTextColor="#94a3b8"
              autoFocus
              maxLength={100}
            />

            {/* DateTime Pickers */}
            <View style={styles.dateTimePickerRow}>
              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => openDatePicker("date")}
              >
                <Text style={styles.dateTimeBtnLabel}>{t("diary.dateLabel")}</Text>
                <Text style={styles.dateTimeBtnValue}>
                  {formatTxDate(txDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => openDatePicker("time")}
              >
                <Text style={styles.dateTimeBtnLabel}>{t("diary.timeLabel")}</Text>
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
                <Text style={styles.suggestedLabel}>{t("diary.recentNotes")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestedList}
                >
                  {suggestedNotes.map((note, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestedChip}
                      onPress={() => setModalNoteInput(note)}
                    >
                      <Text style={styles.suggestedChipText}>{note}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={styles.noteModalCancelBtn}
                onPress={() => {
                  setNoteModalVisible(false);
                  setCategoryPickerVisible(true);
                }}
              >
                <Text style={styles.noteModalCancelText}>{t("diary.backBtn")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteModalConfirmBtn}
                onPress={handleConfirmNote}
              >
                <Text style={styles.noteModalConfirmText}>{t("diary.saveTransaction")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal nhập thủ công */}
      {manualInputModalVisible && (
        <View style={styles.manualInputModalOverlay}>
          <View style={styles.manualInputModalContent}>
            <View style={styles.manualInputHeader}>
              <Text style={styles.manualInputTitle}>
                {t("diary.manualInputTitle")}
              </Text>
              <TouchableOpacity
                onPress={() => setManualInputModalVisible(false)}
              >
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              ref={manualInputRef}
              style={styles.manualTextInput}
              value={amount === 0 ? "" : amount.toString()}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, "");
                setAmount(clean ? parseInt(clean, 10) : 0);
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
                  ? type === "expense"
                    ? styles.saveExpense
                    : styles.saveIncome
                  : styles.saveDisabled,
              ]}
              onPress={() => {
                if (amount < 1000) {
                  Alert.alert(
                    "Số tiền không đủ",
                    "Vui lòng nhập số tiền ít nhất 1.000 đ.",
                  );
                  return;
                }
                setManualInputModalVisible(false);
                setTimeout(handleSave, 300);
              }}
            >
              <Text style={styles.manualInputDoneBtnText}>Tiếp Theo →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal giữ chuỗi (Streak) */}
      <Modal
        visible={streakModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStreakModalVisible(false)}
      >
        <View style={styles.streakModalOverlay}>
          <View style={styles.streakModalContent}>
            <Text style={styles.streakModalStatus}>
              {streakModalData?.status === "increased"
                ? "🔥 ĐÃ TĂNG CHUỖI GIỮ LỬA!"
                : streakModalData?.status === "preserved"
                  ? "✨ CHUỖI LỬA ĐÃ ĐƯỢC DUY TRÌ!"
                  : "🆕 BẮT ĐẦU CHUỖI LỬA MỚI!"}
            </Text>

            <Text style={styles.streakModalCount}>
              {streakModalData?.count || 1} ngày
            </Text>

            {streakModalData && (
              <Image
                source={getStreakLevelImage(
                  getStreakLevel(streakModalData.count),
                )}
                style={styles.streakModalImg}
              />
            )}

            <View style={styles.streakModalLevelBadge}>
              <Text style={styles.streakModalLevelTxt}>
                Cấp độ:{" "}
                {
                  getStreakLevelInfo(
                    getStreakLevel(streakModalData?.count || 1),
                    t,
                  ).name
                }
              </Text>
            </View>
            <Text
              style={{
                fontSize: 10,
                color: "#94a3b8",
                textAlign: "center",
                marginTop: -4,
                marginBottom: 12,
              }}
            >
              {
                getStreakLevelInfo(getStreakLevel(streakModalData?.count || 1), t)
                  .description
              }
            </Text>

            <Text style={styles.streakModalHint}>
              {streakModalData?.status === "increased"
                ? "Ghi chép giao dịch liên tục giúp nuôi dưỡng Heo béo tốt!"
                : streakModalData?.status === "preserved"
                  ? "Thật may mắn, chuỗi lửa đã được khôi phục kịp thời!"
                  : "Hãy duy trì ghi chép mỗi ngày từ hôm nay nhé!"}
            </Text>

            <TouchableOpacity
              style={styles.streakModalBtn}
              onPress={() => setStreakModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.streakModalBtnText}>Tuyệt vời</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal Ghi âm giọng nói */}
      <VoiceRecordingModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        categories={[
          ...expenseCategories.map((c) => ({ id: c.id, name: c.name, type: 'expense' as const })),
          ...incomeCategories.map((c) => ({ id: c.id, name: c.name, type: 'income' as const })),
        ]}
        onSaveTransactions={handleSaveVoiceTransactions}
      />
    </View>
  );
};

export default MoneyDiaryScreen;
