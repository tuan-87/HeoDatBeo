import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
  TextInput,
  Image,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import DateTimePicker from "@react-native-community/datetimepicker";
import { storage } from "../store/storage";
import {
  Transaction,
  UserProfile,
  CategoryBudget,
  NotificationHistoryItem,
} from "../types";
import { formatCurrency } from "../utils/format";
import { resolveCategoryName, isCategoryIdMatch } from "../utils/category";
import { syncNotificationHistory } from "../utils/notifications";
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { X, MoreHorizontal, PencilLine, PenOff } from "lucide-react-native";
import Keypad from "../components/Keypad";
import { BarChart } from "react-native-gifted-charts";
import { EXPENSE_ICONS, getIncomeIconSource } from "./MoneyDiaryScreen";
import CustomPieChart from "../components/CustomPieChart";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { styles } from "../styles/StatisticsScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/LanguageContext";
import { getMascotImage } from "../utils/mascot";

const screenWidth = Dimensions.get("window").width;

type FilterPeriod = "day" | "month" | "year" | "all" | "custom";
type FilterType = "all" | "expense" | "income";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Ăn uống",
  "Xăng cộ",
  "Grab",
  "Tiền Trọ",
  "Khác",
];
const DEFAULT_INCOME_CATEGORIES = ["Lương", "Khác"];

// --- Component thẻ giao dịch — tách ra ngoài để React.memo hoạt động hiệu quả ---
const getTransactionIconSource = (
  tx: Transaction,
  profile: UserProfile | null,
  categoryBudgets: CategoryBudget[],
) => {
  if (tx.note === "Số dư đầu tiên") {
    return require("../../assets/income_icon/default.png");
  }

  if (
    tx.categoryId === "system_tiet_kiem" ||
    tx.categoryId === "system_rut_tiet_kiem"
  ) {
    return require("../../assets/fund_icon/save.png");
  }

  if (
    tx.categoryId === "system_xoa_quy" ||
    tx.categoryId?.startsWith("fund_")
  ) {
    return require("../../assets/fund_icon/default.png");
  }

  if (tx.type === "income") {
    return getIncomeIconSource(tx.categoryId || "income_khac", profile);
  }

  const match = categoryBudgets.find(
    (c) => tx.categoryId && c.id && isCategoryIdMatch(c.id, tx.categoryId),
  );
  const iconKey = match?.icon || "default";
  return EXPENSE_ICONS[iconKey] || EXPENSE_ICONS["default"];
};

// --- Component thẻ giao dịch — tách ra ngoài để React.memo hoạt động hiệu quả ---
type TransactionCardProps = {
  item: Transaction;
  onOpenOptions: (tx: Transaction) => void;
  profile: UserProfile | null;
  categoryBudgets: CategoryBudget[];
};

const TransactionCard = React.memo(
  ({ item, onOpenOptions, profile, categoryBudgets }: TransactionCardProps) => {
    const dateStr = new Date(item.timestamp).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const isExpense = item.type === "expense";
    const displayCategory = resolveCategoryName(item, profile, categoryBudgets);
    const canAction = Date.now() - item.timestamp <= 3 * 24 * 60 * 60 * 1000;

    return (
      <View style={cardStyles.card}>
        <View style={cardStyles.cardRow}>
          <View style={cardStyles.cardLeftContainer}>
            <View
              style={[
                cardStyles.iconWrapper,
                { backgroundColor: isExpense ? "#fee2e2" : "#dcfce7" },
              ]}
            >
              <Image
                source={getTransactionIconSource(
                  item,
                  profile,
                  categoryBudgets,
                )}
                style={cardStyles.categoryIcon}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.cardCategory}>{displayCategory}</Text>
              {item.note ? (
                <Text style={cardStyles.cardNote}>{item.note}</Text>
              ) : null}
            </View>
          </View>
          <Text
            style={[
              cardStyles.cardAmount,
              isExpense ? cardStyles.expenseText : cardStyles.incomeText,
            ]}
          >
            {isExpense ? "-" : "+"}
            {formatCurrency(item.amount)} đ
          </Text>
        </View>
        <View style={cardStyles.cardFooter}>
          <Text style={cardStyles.cardDate}>{dateStr}</Text>
          <View style={cardStyles.actionRow}>
            <TouchableOpacity
              onPress={() => onOpenOptions(item)}
              style={cardStyles.actionButton}
            >
              <MoreHorizontal color="#cccccc" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 0,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  cardName: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontStyle: "italic",
  },
  cardNote: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    alignSelf: "flex-start",
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  expenseText: {
    color: "#ef4444",
  },
  incomeText: {
    color: "#10b981",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: {
    fontSize: 14,
    color: "#94a3b8",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  cardLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryIcon: {
    width: 26,
    height: 26,
    resizeMode: "contain",
  },
});

const renderHistoryBody = (bodyStr: string) => {
  const lines = bodyStr.split("\n");
  let currentSection: "none" | "expense" | "income" = "none";

  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.includes("---")) return null;

        if (trimmed.includes("bạn đã chi tiêu:")) {
          currentSection = "expense";
          return (
            <Text
              key={index}
              style={{
                fontWeight: "600",
                color: "#475569",
                marginTop: 4,
                fontSize: 13,
              }}
            >
              {trimmed}
            </Text>
          );
        }

        if (trimmed.includes("Bạn đã thu:")) {
          currentSection = "income";
          return (
            <Text
              key={index}
              style={{
                fontWeight: "600",
                color: "#475569",
                marginTop: 12,
                fontSize: 13,
              }}
            >
              {trimmed}
            </Text>
          );
        }

        if (trimmed.startsWith("- ")) {
          const parts = trimmed.substring(2).split(": ");
          const cat = parts[0];
          const amt = parts
            .slice(1)
            .join(": ")
            .replace("🔴 ", "")
            .replace("🟢 ", "");
          if (currentSection === "expense") {
            return (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingLeft: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#334155", fontSize: 14 }}>• {cat}</Text>
                <Text
                  style={{ color: "#ef4444", fontWeight: "600", fontSize: 14 }}
                >
                  {amt}
                </Text>
              </View>
            );
          } else if (currentSection === "income") {
            return (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingLeft: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#334155", fontSize: 14 }}>• {cat}</Text>
                <Text
                  style={{ color: "#10b981", fontWeight: "600", fontSize: 14 }}
                >
                  {amt}
                </Text>
              </View>
            );
          }
        }

        if (trimmed.startsWith("Tổng chi:")) {
          const hasSeparator = trimmed.includes(" | ");
          const parts = hasSeparator ? trimmed.split(" | ") : [trimmed];
          let cleanExpense = parts[0].replace("🔴 ", "");
          let cleanIncome = "";

          if (hasSeparator) {
            cleanIncome = parts[1].replace("🟢 ", "");
          } else {
            // Check if next line is "Tổng thu:"
            if (index + 1 < lines.length) {
              const nextTrimmed = lines[index + 1].trim();
              if (nextTrimmed.startsWith("Tổng thu:")) {
                cleanIncome = nextTrimmed.replace("🟢 ", "");
              }
            }
          }

          return (
            <View
              key={index}
              style={{
                backgroundColor: "#f1f5f9",
                padding: 12,
                borderRadius: 0,
                marginTop: 12,
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Text
                style={{ fontWeight: "bold", color: "#ef4444", fontSize: 14 }}
              >
                {cleanExpense}
              </Text>
              {cleanIncome ? (
                <Text
                  style={{ fontWeight: "bold", color: "#10b981", fontSize: 14 }}
                >
                  {cleanIncome}
                </Text>
              ) : null}
            </View>
          );
        }

        if (trimmed.startsWith("Tổng thu:")) {
          const prevTrimmed = index > 0 ? lines[index - 1].trim() : "";
          if (prevTrimmed.startsWith("Tổng chi:")) {
            return null; // Already rendered in the box above
          }
          const cleanP = trimmed.replace("🟢 ", "");
          return (
            <View
              key={index}
              style={{
                backgroundColor: "#f1f5f9",
                padding: 12,
                borderRadius: 0,
                marginTop: 12,
              }}
            >
              <Text
                style={{ fontWeight: "bold", color: "#10b981", fontSize: 14 }}
              >
                {cleanP}
              </Text>
            </View>
          );
        }

        if (trimmed.includes("So với")) {
          return (
            <Text
              key={index}
              style={{
                color: "#64748b",
                fontStyle: "italic",
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
              }}
            >
              {trimmed}
            </Text>
          );
        }

        // Fallback for "Không có chi tiêu", "Không có thu nhập"
        return (
          <Text
            key={index}
            style={{
              color: "#64748b",
              fontStyle: "italic",
              paddingLeft: 8,
              fontSize: 14,
            }}
          >
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
};

const StatisticsScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = 64 + Math.max(insets.bottom, 12);
  const { t } = useLanguage();
  const isFocused = useIsFocused();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);

  // Lịch sử báo cáo tài chính
  const [showNotificationHistoryModal, setShowNotificationHistoryModal] =
    useState(false);
  const [notificationHistory, setNotificationHistory] = useState<
    NotificationHistoryItem[]
  >([]);
  const [historyDayLimit, setHistoryDayLimit] = useState<number>(10);
  const [historyMonthLimit, setHistoryMonthLimit] = useState<number>(3);
  const [historyYearLimit, setHistoryYearLimit] = useState<number>(2);
  const [historyTab, setHistoryTab] = useState<"day" | "month" | "year">("day");

  const loadNotificationHistory = async () => {
    try {
      const txs = await storage.getTransactions();
      await syncNotificationHistory(txs);
    } catch (e) {
      console.error(
        "Failed to sync notification history in loadNotificationHistory:",
        e,
      );
    }
    const data = await storage.getNotificationHistory();
    setNotificationHistory(data);
    setHistoryDayLimit(10);
    setHistoryMonthLimit(3);
    setHistoryYearLimit(2);
  };

  const [period, setPeriod] = useState<FilterPeriod>("day");
  const [type, setType] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState<number>(10);

  // Tháng/năm đang chọn (độc lập với nhau)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // format "YYYY-MM"
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Danh sách tháng/năm có giao dịch (từ index)
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Modal
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showPieChartModal, setShowPieChartModal] = useState(false);
  const [showBarChartModal, setShowBarChartModal] = useState(false);

  // CustomPieChart state
  const [selectedPieCategory, setSelectedPieCategory] = useState<string | null>(
    null,
  );
  const [pieDetailLimit, setPieDetailLimit] = useState<number>(10);

  useEffect(() => {
    setPieDetailLimit(10);
  }, [selectedPieCategory]);

  // BarChart state
  const [selectedBarData, setSelectedBarData] = useState<{
    day: string;
    value: number;
    type: string;
  } | null>(null);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);

  // Transaction options & edit state
  const [selectedTxForAction, setSelectedTxForAction] =
    useState<Transaction | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const editInputRef = React.useRef<TextInput>(null);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editNote, setEditNote] = useState("");
  const editNoteInputRef = React.useRef<TextInput>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isFocused) {
      loadTransactions();
    }
  }, [isFocused]);

  useEffect(() => {
    applyFilters(
      period,
      type,
      categoryFilter,
      transactions,
      customStartDate,
      customEndDate,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    period,
    type,
    categoryFilter,
    transactions,
    customStartDate,
    customEndDate,
    categoryBudgets,
    profile,
    selectedMonth,
    selectedYear,
  ]);

  useEffect(() => {
    if (route.params?.openHistory) {
      loadNotificationHistory();
      setShowNotificationHistoryModal(true);
      // Clear the param so it doesn't reopen if screen re-renders
      navigation.setParams({ openHistory: undefined });
    }
  }, [route.params?.openHistory, navigation]);

  const loadTransactions = async () => {
    const data = await storage.getTransactions();
    const p = await storage.getUserProfile();
    const cats = await storage.getCategoryBudgets();
    const dateIndex = await storage.getTransactionDateIndex();
    setTransactions(data);
    setProfile(p);
    setCategoryBudgets(cats);
    setAvailableMonths(dateIndex.months);
    setAvailableYears(dateIndex.years);
  };

  const toggleInputMethod = async () => {
    const newMethod = profile?.inputMethod === "manual" ? "keypad" : "manual";
    if (profile) {
      const updatedProfile = {
        ...profile,
        inputMethod: newMethod as "manual" | "keypad",
      };
      setProfile(updatedProfile);
      await storage.saveUserProfile(updatedProfile);
    }
  };

  const applyFilters = (
    p: FilterPeriod,
    t: FilterType,
    c: string,
    data: Transaction[],
    start: Date,
    end: Date,
  ) => {
    const now = new Date();
    let filtered = data;

    // Bỏ qua giao dịch tiết kiệm và quỹ tùy chỉnh khỏi Thống kê
    filtered = filtered.filter(
      (tx) =>
        tx.categoryId !== "system_tiet_kiem" &&
        tx.categoryId !== "system_rut_tiet_kiem" &&
        tx.categoryId !== "system_xoa_quy" &&
        !tx.categoryId?.startsWith("fund_"),
    );

    // Filter by Period
    if (p !== "all") {
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.timestamp);
        if (p === "day") {
          return txDate.toDateString() === now.toDateString();
        } else if (p === "month") {
          // Dùng selectedMonth nếu có, fallback tháng hiện tại
          const targetMonth =
            selectedMonth ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
          return txMonth === targetMonth;
        } else if (p === "year") {
          const targetYear = selectedYear ?? now.getFullYear();
          return txDate.getFullYear() === targetYear;
        } else if (p === "custom") {
          const startTime = new Date(start).setHours(0, 0, 0, 0);
          const endTime = new Date(end).setHours(23, 59, 59, 999);
          return tx.timestamp >= startTime && tx.timestamp <= endTime;
        }
        return true;
      });
    }

    // Filter by Type
    if (t !== "all") {
      filtered = filtered.filter((tx) => tx.type === t);
    }

    // Filter by Category
    if (c === "Khác") {
      filtered = filtered.filter((tx) => {
        const resolvedName = resolveCategoryName(tx, profile, categoryBudgets);
        return (
          resolvedName === "Khác" ||
          tx.categoryId === "expense_khac" ||
          tx.categoryId === "income_khac"
        );
      });
    } else if (c !== "all") {
      filtered = filtered.filter(
        (tx) => resolveCategoryName(tx, profile, categoryBudgets) === c,
      );
    }

    setFilteredTransactions(filtered);
    setDisplayLimit(10);
  };

  // YC 1, 2, 3: Hoàn tiền thông minh khi xóa giao dịch
  const handleDelete = useCallback(async (tx: Transaction) => {
    // Chỉ được xóa trong vòng 45 ngày kể từ khi lưu
    const MAX_EDIT_DAYS_MS = 45 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - tx.timestamp;
    if (elapsed > MAX_EDIT_DAYS_MS) {
      Alert.alert("Không thể xóa", "Giao dịch đã quá 45 ngày, không thể xóa.");
      return;
    }

    // Kiểm tra số dư chưa phân bổ nếu là giao dịch thu tiền
    if (tx.type === "income") {
      const p = await storage.getUserProfile();
      const cats = await storage.getCategoryBudgets();
      if (p) {
        const totalAllocated = cats.reduce((sum, b) => sum + b.budget, 0);
        const unallocated = p.initialBalance - totalAllocated;
        if (tx.amount > unallocated) {
          Alert.alert(
            "Không thể xóa",
            "Số tiền này đã được sử dụng hoặc phân bổ vào các Quỹ.",
          );
          return;
        }
      }
    }

    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa giao dịch này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            // Xóa giao dịch trước
            const success = await storage.deleteTransaction(tx.id);
            if (!success) {
              Alert.alert("Lỗi", "Không thể xóa giao dịch.");
              return;
            }

            // Lấy profile & budgets hiện tại
            const p = await storage.getUserProfile();
            const cats = await storage.getCategoryBudgets();
            if (!p) {
              loadTransactions();
              return;
            }

            const catName = resolveCategoryName(tx, p, cats);

            if (tx.type === "expense") {
              if (catName === "Nuôi heo béo") {
                // YC 3: Xóa giao dịch nạp tiết kiệm → hoàn tiền vào tổng và unallocated
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance + tx.amount,
                };
                await storage.saveUserProfile(updatedProfile);
              } else if (
                p.customFunds &&
                p.customFunds.some((f) => f.name === catName)
              ) {
                // Xóa giao dịch nạp quỹ tùy chỉnh -> Trừ quỹ, cộng lại unallocated
                const updatedFunds = p.customFunds.map((f) =>
                  f.name === catName
                    ? { ...f, balance: Math.max(0, f.balance - tx.amount) }
                    : f,
                );
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance + tx.amount,
                  customFunds: updatedFunds,
                };
                await storage.saveUserProfile(updatedProfile);
              } else {
                // YC 1: Xóa giao dịch chi thường
                // Cộng lại initialBalance để tổng số dư tăng
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance + tx.amount,
                };
                await storage.saveUserProfile(updatedProfile);

                // Nếu danh mục vẫn còn tồn tại
                const existingCat = cats.find(
                  (b) => b.id === tx.categoryId || b.name === catName,
                );
                if (existingCat) {
                  const isDirect = existingCat.type === "direct";
                  const updatedCats = cats.map((b) =>
                    b.id === existingCat.id
                      ? {
                          ...b,
                          // Nếu là danh mục nạp tiền thì cộng lại budget, nếu là chi trực tiếp thì giữ nguyên budget (0)
                          budget: isDirect ? b.budget : b.budget + tx.amount,
                          spent: Math.max(0, (b.spent || 0) - tx.amount),
                        }
                      : b,
                  );
                  await storage.saveCategoryBudgets(updatedCats);
                }
                // Nếu danh mục đã bị xóa/đổi tên: tiền về unallocated (initialBalance đã được +)
              }
            } else if (tx.type === "income") {
              if (catName === "Heo giảm cân") {
                // YC 3: Xóa giao dịch rút tiết kiệm → trừ lại khỏi tổng
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance - tx.amount,
                };
                await storage.saveUserProfile(updatedProfile);
              } else if (
                p.customFunds &&
                p.customFunds.some((f) => f.name === catName)
              ) {
                // Xóa giao dịch rút quỹ tùy chỉnh -> Cộng lại quỹ, trừ unallocated
                const updatedFunds = p.customFunds.map((f) =>
                  f.name === catName
                    ? { ...f, balance: f.balance + tx.amount }
                    : f,
                );
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance - tx.amount,
                  customFunds: updatedFunds,
                };
                await storage.saveUserProfile(updatedProfile);
              } else {
                // YC 2: Xóa giao dịch thu tiền thường → trừ khỏi tổng số dư và unallocated
                const updatedProfile = {
                  ...p,
                  initialBalance: p.initialBalance - tx.amount,
                };
                await storage.saveUserProfile(updatedProfile);
              }
            }

            loadTransactions();
          },
        },
      ],
    );
  }, []);

  const handleOpenOptions = useCallback((tx: Transaction) => {
    setSelectedTxForAction(tx);
    setShowOptionsModal(true);
  }, []);

  const handleEditPress = () => {
    if (!selectedTxForAction) return;
    const MAX_EDIT_DAYS_MS = 45 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - selectedTxForAction.timestamp;
    if (elapsed > MAX_EDIT_DAYS_MS) {
      Alert.alert(
        "Không thể sửa",
        "Giao dịch đã quá 45 ngày, không thể sửa số tiền.",
      );
      return;
    }
    setEditAmount(selectedTxForAction.amount);
    setShowOptionsModal(false);
    setShowEditModal(true);
  };

  const handleEditNotePress = () => {
    if (!selectedTxForAction) return;
    const MAX_EDIT_DAYS_MS = 45 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - selectedTxForAction.timestamp;
    if (elapsed > MAX_EDIT_DAYS_MS) {
      Alert.alert(
        "Không thể sửa",
        "Giao dịch đã quá 45 ngày, không thể sửa ghi chú.",
      );
      return;
    }
    setEditNote(selectedTxForAction.note || "");
    setShowOptionsModal(false);
    setShowEditNoteModal(true);
  };

  const handleEditDatePress = () => {
    if (!selectedTxForAction) return;
    const MAX_EDIT_DAYS_MS = 45 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - selectedTxForAction.timestamp;
    if (elapsed > MAX_EDIT_DAYS_MS) {
      Alert.alert(
        "Không thể sửa",
        "Giao dịch đã quá 45 ngày, không thể sửa thời gian.",
      );
      return;
    }
    setEditDate(new Date(selectedTxForAction.timestamp));
    setShowOptionsModal(false);
    setShowEditDatePicker(true);
  };

  const executeEditTransaction = async () => {
    if (!selectedTxForAction) return;
    const tx = selectedTxForAction;
    const oldAmount = tx.amount;
    const newAmount = editAmount;

    if (newAmount === 0) {
      Alert.alert(
        "Số tiền không hợp lệ",
        "Số tiền không thể là 0đ. Nếu bạn muốn hủy giao dịch này, vui lòng sử dụng chức năng Xóa.",
      );
      return;
    }

    const diff = newAmount - oldAmount;

    if (diff === 0) {
      setShowEditModal(false);
      return;
    }

    const p = await storage.getUserProfile();
    const cats = await storage.getCategoryBudgets();
    if (!p) return;

    const catName = resolveCategoryName(tx, p, cats);

    if (tx.type === "expense") {
      // Logic sửa khoản chi
      if (catName === "Nuôi heo béo") {
        // Tăng chi tiêu tiết kiệm -> giảm initialBalance
        await storage.saveUserProfile({
          ...p,
          initialBalance: p.initialBalance - diff,
        });
      } else if (
        p.customFunds &&
        p.customFunds.some((f) => f.name === catName)
      ) {
        // Sửa giao dịch nạp quỹ tùy chỉnh
        const fund = p.customFunds.find((f) => f.name === catName)!;
        if (diff > 0) {
          const totalAllocated = cats.reduce((sum, b) => sum + b.budget, 0);
          const unallocated = Math.max(0, p.initialBalance - totalAllocated);
          if (diff > unallocated) {
            Alert.alert("Lỗi", "Số dư chưa phân bổ không đủ để nạp thêm.");
            return;
          }
        } else if (diff < 0) {
          const loss = Math.abs(diff);
          if (loss > fund.balance) {
            Alert.alert("Lỗi", `Số dư quỹ không đủ để giảm khoản nạp này.`);
            return;
          }
        }
        const updatedFunds = p.customFunds.map((f) =>
          f.name === catName ? { ...f, balance: f.balance + diff } : f,
        );
        await storage.saveUserProfile({
          ...p,
          initialBalance: p.initialBalance - diff,
          customFunds: updatedFunds,
        });
      } else {
        const cat = cats.find((b) => b.name === catName);
        if (cat) {
          // Chi trực tiếp: kiểm tra unallocated balance (số dư khả dụng)
          const unallocated = p.initialBalance;
          if (diff > unallocated) {
            Alert.alert(
              "Lỗi",
              "Số dư chưa phân bổ không đủ để thực hiện sửa đổi này.",
            );
            return;
          }
          // Cập nhật spent và initialBalance
          const updatedCats = cats.map((b) =>
            b.name === catName ? { ...b, spent: (b.spent || 0) + diff } : b,
          );
          await storage.saveCategoryBudgets(updatedCats);
          await storage.saveUserProfile({
            ...p,
            initialBalance: p.initialBalance - diff,
          });
        } else {
          // Danh mục đã bị xóa: chỉ trừ/cộng vào initialBalance (coi như unallocated)
          const unallocated = p.initialBalance;
          if (diff > unallocated) {
            Alert.alert(
              "Lỗi",
              "Số dư chưa phân bổ không đủ để thực hiện sửa đổi này.",
            );
            return;
          }
          await storage.saveUserProfile({
            ...p,
            initialBalance: p.initialBalance - diff,
          });
        }
      }
    } else {
      // Logic sửa khoản thu
      if (catName === "Heo giảm cân") {
        // Thu từ tiết kiệm: chỉ thay đổi initialBalance
        if (diff < 0) {
          const loss = Math.abs(diff);
          const totalAllocated = cats.reduce((sum, b) => sum + b.budget, 0);
          const unallocated = Math.max(0, p.initialBalance - totalAllocated);
          if (loss > unallocated) {
            Alert.alert(
              "Lỗi",
              "Số dư chưa phân bổ không đủ để giảm khoản rút này.",
            );
            return;
          }
        }
        await storage.saveUserProfile({
          ...p,
          initialBalance: p.initialBalance + diff,
        });
      } else if (
        p.customFunds &&
        p.customFunds.some((f) => f.name === catName)
      ) {
        // Sửa giao dịch rút quỹ tùy chỉnh
        const fund = p.customFunds.find((f) => f.name === catName)!;
        if (diff > 0) {
          if (diff > fund.balance) {
            Alert.alert(
              "Lỗi",
              `Quỹ này không đủ số dư để rút thêm ${formatCurrency(diff)} đ.`,
            );
            return;
          }
        } else if (diff < 0) {
          const loss = Math.abs(diff);
          const totalAllocated = cats.reduce((sum, b) => sum + b.budget, 0);
          const unallocated = Math.max(0, p.initialBalance - totalAllocated);
          if (loss > unallocated) {
            Alert.alert(
              "Lỗi",
              "Số dư chưa phân bổ không đủ để giảm khoản rút này.",
            );
            return;
          }
        }
        const updatedFunds = p.customFunds.map((f) =>
          f.name === catName ? { ...f, balance: f.balance - diff } : f,
        );
        await storage.saveUserProfile({
          ...p,
          initialBalance: p.initialBalance + diff,
          customFunds: updatedFunds,
        });
      } else {
        // Thu nhập bình thường: nếu giảm thu nhập, kiểm tra unallocated
        if (diff < 0) {
          const loss = Math.abs(diff);
          const totalAllocated = cats.reduce((sum, b) => sum + b.budget, 0);
          const unallocated = Math.max(0, p.initialBalance - totalAllocated);
          if (loss > unallocated) {
            Alert.alert(
              "Lỗi",
              "Số dư chưa phân bổ không đủ để giảm khoản thu này.",
            );
            return;
          }
        }
        await storage.saveUserProfile({
          ...p,
          initialBalance: p.initialBalance + diff,
        });
      }
    }

    // Cập nhật transaction record
    const allTxs = await storage.getTransactions();
    const updatedTxs = allTxs.map((t) =>
      t.id === tx.id ? { ...t, amount: newAmount } : t,
    );
    await storage.updateTransactionsBulk(updatedTxs);

    loadTransactions();
    setShowEditModal(false);
    setSelectedTxForAction(null);
    Alert.alert("Thành công", "Đã cập nhật giao dịch.");
  };

  const executeEditNote = async () => {
    if (!selectedTxForAction) return;
    const tx = selectedTxForAction;
    const trimmedNote = editNote.trim();

    // Cập nhật transaction record
    const allTxs = await storage.getTransactions();
    const updatedTxs = allTxs.map((t) =>
      t.id === tx.id ? { ...t, note: trimmedNote || undefined } : t,
    );
    await storage.updateTransactionsBulk(updatedTxs);

    loadTransactions();
    setShowEditNoteModal(false);
    setSelectedTxForAction(null);
    Alert.alert("Thành công", "Đã cập nhật ghi chú giao dịch.");
  };

  const handleExecuteEditDate = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEditDatePicker(false);
    }
    if (event.type === "set" && selectedDate && selectedTxForAction) {
      if (Platform.OS === "ios") {
        setShowEditDatePicker(false);
      }
      // Giới hạn chỉ cho chọn ngày hôm nay trở về trước
      if (selectedDate.getTime() > Date.now()) {
        Alert.alert(
          "Không hợp lệ",
          "Thời gian giao dịch chỉ được chọn ngày hôm nay trở về trước.",
        );
        return;
      }

      const tx = selectedTxForAction;
      const oldDate = new Date(tx.timestamp);
      const newDate = new Date(selectedDate);
      // Giữ nguyên giờ, phút, giây của giao dịch cũ
      newDate.setHours(
        oldDate.getHours(),
        oldDate.getMinutes(),
        oldDate.getSeconds(),
        oldDate.getMilliseconds(),
      );
      const finalTimestamp = Math.min(newDate.getTime(), Date.now());

      const allTxs = await storage.getTransactions();
      const updatedTxs = allTxs.map((t) =>
        t.id === tx.id ? { ...t, timestamp: finalTimestamp } : t,
      );
      await storage.updateTransactionsBulk(updatedTxs);
      try {
        await storage._addToTransactionDateIndex(finalTimestamp);
        await storage._rebuildTransactionDateIndex();
        await syncNotificationHistory(updatedTxs);
      } catch (e) {
        console.error(
          "Error updating date index or syncNotificationHistory",
          e,
        );
      }

      loadTransactions();
      setSelectedTxForAction(null);
      Alert.alert("Thành công", "Đã cập nhật thời gian giao dịch.");
    } else if (event.type === "dismissed") {
      setShowEditDatePicker(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard
        item={item}
        onOpenOptions={handleOpenOptions}
        profile={profile}
        categoryBudgets={categoryBudgets}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleOpenOptions, profile, categoryBudgets],
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showPicker;
    if (Platform.OS === "android") setShowPicker(null);
    if (selectedDate) {
      if (currentPicker === "start") {
        setCustomStartDate(selectedDate);
        if (selectedDate > customEndDate) setCustomEndDate(selectedDate);
      } else if (currentPicker === "end") {
        if (selectedDate < customStartDate) {
          Alert.alert("Lỗi", "Ngày đến không được nhỏ hơn ngày từ.");
        } else {
          setCustomEndDate(selectedDate);
        }
      }
    }
  };

  const formatDateShort = (date: Date) => {
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Hiển thị nhãn badge tháng/năm đang chọn
  const getMonthBadgeLabel = () => {
    if (selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      return `${t("stats.month")} ${parseInt(m)}/${y}`;
    }
    const now = new Date();
    return `${t("stats.month")} ${now.getMonth() + 1}/${now.getFullYear()}`;
  };

  const getYearBadgeLabel = () => {
    if (selectedYear) return `${t("stats.year")} ${selectedYear}`;
    return `${t("stats.year")} ${new Date().getFullYear()}`;
  };

  const getFilterDateText = () => {
    if (period === "day") {
      return `${t("stats.today")} (${formatDateShort(new Date())})`;
    } else if (period === "month") {
      const targetMonth =
        selectedMonth ||
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const [y, m] = targetMonth.split("-");
      return `${t("stats.month")} ${parseInt(m)}/${y}`;
    } else if (period === "year") {
      const targetYear = selectedYear ?? new Date().getFullYear();
      return `${t("stats.year")} ${targetYear}`;
    } else if (period === "custom") {
      return `${formatDateShort(customStartDate)} - ${formatDateShort(customEndDate)}`;
    } else {
      return t("stats.allTime");
    }
  };

  // Format tháng để hiển thị trong modal
  const formatMonthDisplay = (monthStr: string) => {
    const [y, m] = monthStr.split("-");
    return `${t("stats.month")} ${parseInt(m)} / ${y}`;
  };

  const getFilterCategories = () => {
    // Filter active expense categories
    const activeExpenseBudgets = categoryBudgets.filter(
      (b) => b.deleteAt === null || b.deleteAt === undefined,
    );
    const expenseCats =
      activeExpenseBudgets.length > 0
        ? activeExpenseBudgets.map((b) => b.name)
        : DEFAULT_EXPENSE_CATEGORIES.filter((c) => c !== "Khác");

    let cats: string[];
    const activeIncomeCategories = (
      profile?.incomeCategories || DEFAULT_INCOME_CATEGORIES
    ).filter(
      (c: any) =>
        typeof c === "string" ||
        c.deleteAt === null ||
        c.deleteAt === undefined,
    );
    const rawIncomeCats = activeIncomeCategories.map((c: any) =>
      typeof c === "string" ? c : c.name,
    );
    if (type === "all") {
      cats = Array.from(new Set([...rawIncomeCats, ...expenseCats]));
    } else if (type === "income") {
      cats = rawIncomeCats;
    } else {
      cats = expenseCats;
    }

    const includesKhac = cats.includes("Khác");
    cats = cats.filter((c) => c !== "Khác");

    // Thêm 'Khác' vào cuối cùng nếu nó có trong danh mục hoặc có giao dịch
    const hasKhacTx = transactions.some((tx) => {
      if (type !== "all" && tx.type !== type) return false;
      return (
        tx.categoryId === "expense_khac" || tx.categoryId === "income_khac"
      );
    });
    if (includesKhac || hasKhacTx) {
      cats.push("Khác");
    }

    return cats;
  };

  const handleTypeChange = (newType: FilterType) => {
    setType(newType);
    setCategoryFilter("all");
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const displayTotal =
    type === "income" ? totalIncome : type === "expense" ? totalExpense : null;

  const getPieChartData = () => {
    const expenses = filteredTransactions.filter((tx) => tx.type === "expense");
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((tx) => {
      const catName = resolveCategoryName(tx, profile, categoryBudgets);
      categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);
    if (total === 0) return [];

    const colors = [
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#84cc16",
      "#10b981",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#d946ef",
      "#f43f5e",
      "#64748b",
    ];

    return Object.keys(categoryTotals)
      .map((catName, index) => ({
        name: catName,
        population: categoryTotals[catName],
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.population - a.population);
  };

  const getNoteDetailsForCategory = (catName: string): Transaction[] => {
    const expenses = filteredTransactions.filter((tx) => tx.type === "expense");
    return expenses
      .filter((tx) => {
        const txCat = resolveCategoryName(tx, profile, categoryBudgets);
        return catName === "Khác"
          ? txCat === "Khác" ||
              tx.categoryId === "expense_khac" ||
              tx.categoryId === "income_khac"
          : txCat === catName;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  const getBarChartData = () => {
    let year, month;
    if (selectedMonth) {
      const parts = selectedMonth.split("-");
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyIncomes = new Array(daysInMonth).fill(0);
    const dailyExpenses = new Array(daysInMonth).fill(0);

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (tx.type === "income") dailyIncomes[day - 1] += tx.amount;
        else if (tx.type === "expense") dailyExpenses[day - 1] += tx.amount;
      }
    });

    const barData = [];
    for (let i = 0; i < daysInMonth; i++) {
      const dayStr = (i + 1).toString();
      barData.push({
        value: dailyIncomes[i],
        frontColor: "#10b981", // Income Green
        spacing: 2,
        label: dayStr,
        labelTextStyle: { color: "#94a3b8", fontSize: 10 },
        onPress: () =>
          setSelectedBarData({
            day: dayStr,
            value: dailyIncomes[i],
            type: "Thu",
          }),
      });
      barData.push({
        value: dailyExpenses[i],
        frontColor: "#ef4444", // Expense Red
        spacing: 16,
        onPress: () =>
          setSelectedBarData({
            day: dayStr,
            value: dailyExpenses[i],
            type: "Chi",
          }),
      });
    }

    return barData;
  };

  const renderBarChartContent = () => {
    const barData = getBarChartData();
    const chartWidth = Math.max(screenWidth - 40, (barData.length / 2) * 45);

    return (
      <View style={{ flex: 1, paddingBottom: 20 }}>
        <View style={styles.barChartHeader}>
          {selectedBarData ? (
            <Text style={styles.barTooltipText}>
              Ngày {selectedBarData.day} - {selectedBarData.type}:{" "}
              {formatCurrency(selectedBarData.value)} đ
            </Text>
          ) : (
            <Text style={styles.chartTitle}>Chạm vào cột để xem chi tiết</Text>
          )}
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          <BarChart
            data={barData}
            width={chartWidth}
            height={220}
            barWidth={12}
            initialSpacing={10}
            noOfSections={5}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: "#94a3b8", fontSize: 10 }}
            formatYLabel={(label) => {
              const val = Number(label);
              if (val >= 1000) return (val / 1000).toFixed(0) + "k";
              return label;
            }}
            hideRules
          />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={styles.headerTitle}>{t("stats.title")}</Text>
            <TouchableOpacity
              onPress={() => {
                loadNotificationHistory();
                setShowNotificationHistoryModal(true);
              }}
              style={styles.chartButton}
            >
              <Image
                source={require("../../assets/common_icons/accounting.png")}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                if (type !== "expense") {
                  Alert.alert(
                    "Thông báo",
                    "Bạn cần lọc theo Chi Tiền để hiển thị biểu đồ.",
                  );
                } else if (filteredTransactions.length === 0) {
                  Alert.alert(
                    "Thông báo",
                    "Dữ liệu không có để hiển thị biểu đồ. Vui lòng chọn thời gian khác",
                  );
                } else {
                  setShowPieChartModal(true);
                }
              }}
              style={[
                styles.chartButton,
                (type !== "expense" || filteredTransactions.length === 0) && {
                  opacity: 0.3,
                },
              ]}
            >
              <Image
                source={require("../../assets/common_icons/pie-chart.png")}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodFilters}
        >
          {(["day", "month", "year", "custom", "all"] as FilterPeriod[]).map(
            (p) => {
              let label = "";
              if (p === "day") label = t("stats.today");
              else if (p === "month")
                label =
                  period === "month" ? getMonthBadgeLabel() : t("stats.month");
              else if (p === "year")
                label =
                  period === "year" ? getYearBadgeLabel() : t("stats.year");
              else if (p === "custom") label = t("stats.custom");
              else if (p === "all") label = t("stats.all");
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBadge,
                    period === p && styles.periodBadgeActive,
                  ]}
                  onPress={() => {
                    setPeriod(p);
                    if (p === "month") setShowMonthModal(true);
                    else if (p === "year") setShowYearModal(true);
                  }}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === p && styles.periodTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>

        {period === "custom" && (
          <View style={styles.customDateContainer}>
            <Text style={styles.dateLabel}>{t("stats.from")}</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowPicker("start")}
            >
              <Text style={styles.dateBtnText}>
                {formatDateShort(customStartDate)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.dateLabel}>{t("stats.to")}</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowPicker("end")}
            >
              <Text style={styles.dateBtnText}>
                {formatDateShort(customEndDate)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, type === "all" && styles.typeTabActive]}
            onPress={() => handleTypeChange("all")}
          >
            <Text
              style={[
                styles.typeTabText,
                type === "all" && styles.typeTabTextActive,
              ]}
            >
              {t("stats.all")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === "expense" && styles.typeTabActiveExpense,
            ]}
            onPress={() => handleTypeChange("expense")}
          >
            <Text
              style={[
                styles.typeTabText,
                type === "expense" && styles.typeTabTextActive,
              ]}
            >
              {t("stats.expenseTitle")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === "income" && styles.typeTabActiveIncome,
            ]}
            onPress={() => handleTypeChange("income")}
          >
            <Text
              style={[
                styles.typeTabText,
                type === "income" && styles.typeTabTextActive,
              ]}
            >
              {t("stats.incomeTitle")}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilters}
        >
          <TouchableOpacity
            style={[
              styles.categoryBadge,
              categoryFilter === "all" && styles.categoryBadgeActive,
            ]}
            onPress={() => setCategoryFilter("all")}
          >
            <Text
              style={[
                styles.categoryText,
                categoryFilter === "all" && styles.categoryTextActive,
              ]}
            >
              {t("stats.all")}
            </Text>
          </TouchableOpacity>
          {getFilterCategories().map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryBadge,
                categoryFilter === cat && styles.categoryBadgeActive,
              ]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  categoryFilter === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTransactions.slice(0, displayLimit)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={() => {
          if (displayLimit < filteredTransactions.length) {
            setDisplayLimit((prev) => prev + 10);
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
          </View>
        }
      />

      {type === "all" ? (
        <View
          style={[
            styles.summaryContainer,
            { paddingBottom: bottomTabBarHeight + 12 },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>
              {t("stats.totalIncome")}:
            </Text>
            <Text style={styles.summaryIncome}>
              +{formatCurrency(totalIncome)} đ
            </Text>
          </View>
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.summaryLabelBold}>
              {t("stats.totalExpense")}:
            </Text>
            <Text style={styles.summaryExpense}>
              -{formatCurrency(totalExpense)} đ
            </Text>
          </View>
        </View>
      ) : displayTotal !== null ? (
        <View
          style={[
            styles.summaryContainer,
            { paddingBottom: bottomTabBarHeight + 12 },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>{t("stats.total")}:</Text>
            <Text
              style={[
                styles.summaryAmount,
                { color: type === "income" ? "#10b981" : "#ef4444" },
              ]}
            >
              {type === "expense" ? "-" : "+"}
              {formatCurrency(displayTotal)} đ
            </Text>
          </View>
        </View>
      ) : null}

      {showPicker && (
        <DateTimePicker
          value={showPicker === "start" ? customStartDate : customEndDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          accentColor="#5596e0ff"
        />
      )}

      {showEditDatePicker && (
        <DateTimePicker
          value={editDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleExecuteEditDate}
          accentColor="#5596e0ff"
        />
      )}

      {/* Modal chọn tháng */}
      <Modal
        visible={showMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("stats.selectMonth")}</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
            {availableMonths.length === 0 ? (
              <Text style={styles.modalEmpty}>{t("stats.noTransactions")}</Text>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {availableMonths.map((m) => {
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  const isSelected = (selectedMonth ?? currentMonth) === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setSelectedMonth(m);
                        setShowMonthModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextActive,
                        ]}
                      >
                        {formatMonthDisplay(m)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal chọn năm */}
      <Modal
        visible={showYearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("stats.selectYear")}</Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
            {availableYears.length === 0 ? (
              <Text style={styles.modalEmpty}>{t("stats.noTransactions")}</Text>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {availableYears.map((y) => {
                  const isSelected =
                    (selectedYear ?? new Date().getFullYear()) === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setSelectedYear(y);
                        setShowYearModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextActive,
                        ]}
                      >
                        {t("stats.year")} {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Lịch sử Báo cáo Tài chính */}
      <Modal
        visible={showNotificationHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationHistoryModal(false)}
      >
        <View style={styles.pieModalOverlay}>
          <View style={styles.pieModalBox}>
            <View style={styles.modalHeader}>
              <Image
                source={require("../../assets/common_icons/monitor.png")}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
              <Text style={styles.modalTitle}>{t("stats.historyTitle")}</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationHistoryModal(false)}
                style={{
                  padding: 8,
                  backgroundColor: "#f1f5f9",
                  borderRadius: 0,
                }}
              >
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>
                  {t("common.close")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Thanh Tab chọn Ngày / Tháng / Năm */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f1f5f9",
                borderRadius: 0,
                padding: 4,
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              {(["day", "month", "year"] as const).map((tab) => {
                const isActive = historyTab === tab;
                const label =
                  tab === "day"
                    ? t("stats.day")
                    : tab === "month"
                      ? t("stats.month")
                      : t("stats.year");
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setHistoryTab(tab)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: "center",
                      borderRadius: 0,
                      backgroundColor: isActive ? "#3b82f6" : "transparent",
                      shadowColor: isActive ? "#3b82f6" : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.2 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: isActive ? "#ffffff" : "#64748b",
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(() => {
              const filteredHistory = notificationHistory.filter((item) => {
                const type = item.type || "day";
                return type === historyTab;
              });

              if (filteredHistory.length === 0) {
                return (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: "#64748b",
                        fontSize: 16,
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      {historyTab === "day"
                        ? "Chưa có báo cáo tài chính hàng ngày."
                        : historyTab === "month"
                          ? "Chưa có báo cáo tài chính hàng tháng."
                          : "Chưa có báo cáo tài chính hàng năm."}
                    </Text>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 13,
                        textAlign: "center",
                        marginTop: 8,
                      }}
                    >
                      {historyTab === "day"
                        ? "Báo cáo chi tiết hàng ngày sẽ tự động xuất hiện lúc 2:00 sáng và được lưu trữ tại đây!"
                        : historyTab === "month"
                          ? "Báo cáo tổng hợp chi tiết hàng tháng sẽ tự động xuất hiện lúc 2:00 sáng ngày đầu tiên của tháng mới!"
                          : "Báo cáo tổng hợp chi tiết hàng năm sẽ tự động xuất hiện lúc 2:00 sáng ngày đầu tiên của năm mới!"}
                    </Text>
                  </View>
                );
              }

              const currentLimit =
                historyTab === "day"
                  ? historyDayLimit
                  : historyTab === "month"
                    ? historyMonthLimit
                    : historyYearLimit;

              const setLimit =
                historyTab === "day"
                  ? setHistoryDayLimit
                  : historyTab === "month"
                    ? setHistoryMonthLimit
                    : setHistoryYearLimit;

              const increment =
                historyTab === "day" ? 10 : historyTab === "month" ? 3 : 2;

              return (
                <FlatList
                  data={filteredHistory.slice(0, currentLimit)}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                  onEndReached={() => {
                    if (currentLimit < filteredHistory.length) {
                      setLimit((prev) => prev + increment);
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: 0,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        shadowColor: "#0f172a",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.02,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottomWidth: 1,
                          borderBottomColor: "#e2e8f0",
                          paddingBottom: 8,
                          marginBottom: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "700",
                            color: "#0f172a",
                            fontSize: 15,
                          }}
                        >
                          {item.title}
                        </Text>
                      </View>
                      {renderHistoryBody(item.body)}
                    </View>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal biểu đồ tròn */}
      <Modal
        visible={showPieChartModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPieChartModal(false);
        }}
      >
        <View style={styles.pieModalOverlay}>
          <View style={styles.pieModalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>{t("stats.pieStructure")}</Text>
                <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {t("stats.filterTime")}: {getFilterDateText()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPieChartModal(false);
                }}
                style={{
                  padding: 8,
                  backgroundColor: "#f1f5f9",
                  borderRadius: 0,
                }}
              >
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pieChartWrapper}>
              <CustomPieChart
                data={getPieChartData()}
                selectedCategory={selectedPieCategory}
                onSelectCategory={setSelectedPieCategory}
                renderNoteDetails={(catName) => {
                  const allTxs = getNoteDetailsForCategory(catName);
                  if (allTxs.length === 0) {
                    return (
                      <Text
                        style={{
                          color: "#94a3b8",
                          fontSize: 13,
                          fontStyle: "italic",
                          paddingVertical: 4,
                        }}
                      >
                        Không có giao dịch nào
                      </Text>
                    );
                  }
                  const txs = allTxs.slice(0, pieDetailLimit);
                  const hasMore = allTxs.length > pieDetailLimit;

                  return (
                    <View style={{ gap: 8 }}>
                      {txs.map((tx) => {
                        const txDateStr = new Date(
                          tx.timestamp,
                        ).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        const iconSource = getTransactionIconSource(
                          tx,
                          profile,
                          categoryBudgets,
                        );
                        return (
                          <View key={tx.id} style={styles.pieDetailTxCard}>
                            <View style={styles.pieDetailTxLeft}>
                              <View style={styles.pieDetailIconWrapper}>
                                <Image
                                  source={iconSource}
                                  style={styles.pieDetailIcon}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={styles.pieDetailName}
                                  numberOfLines={1}
                                >
                                  {resolveCategoryName(
                                    tx,
                                    profile,
                                    categoryBudgets,
                                  )}
                                </Text>
                                {tx.note ? (
                                  <Text
                                    style={styles.pieDetailNote}
                                    numberOfLines={1}
                                  >
                                    {tx.note}
                                  </Text>
                                ) : null}
                                <Text style={styles.pieDetailDate}>
                                  {txDateStr}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.pieDetailAmount}>
                              -{formatCurrency(tx.amount)} đ
                            </Text>
                          </View>
                        );
                      })}

                      {hasMore ? (
                        <TouchableOpacity
                          style={styles.pieDetailLoadMoreBtn}
                          onPress={() => setPieDetailLimit((prev) => prev + 10)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.pieDetailLoadMoreTxt}>
                            Tải thêm
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal biểu đồ cột */}
      <Modal
        visible={showBarChartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBarChartModal(false)}
      >
        <View style={styles.pieModalOverlay}>
          <View style={styles.pieModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Biểu đồ Thu / Chi tháng</Text>
              <TouchableOpacity onPress={() => setShowBarChartModal(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
            {renderBarChartContent()}
          </View>
        </View>
      </Modal>

      {/* Modal Tùy chọn giao dịch (Sửa/Xóa) */}
      {(() => {
        const isOldTx = selectedTxForAction
          ? Date.now() - selectedTxForAction.timestamp >
            45 * 24 * 60 * 60 * 1000
          : false;
        return (
          <Modal
            visible={showOptionsModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowOptionsModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowOptionsModal(false)}
            >
              <View style={styles.optionsBox}>
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={handleEditPress}
                  disabled={isOldTx}
                >
                  <Text
                    style={[
                      styles.optionTextEdit,
                      isOldTx && { color: "#dddddd" },
                    ]}
                  >
                    Sửa số tiền
                  </Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={handleEditNotePress}
                  disabled={isOldTx}
                >
                  <Text
                    style={[
                      styles.optionTextEdit,
                      isOldTx && { color: "#dddddd" },
                    ]}
                  >
                    Sửa ghi chú
                  </Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={handleEditDatePress}
                  disabled={isOldTx}
                >
                  <Text
                    style={[
                      styles.optionTextEdit,
                      isOldTx && { color: "#dddddd" },
                    ]}
                  >
                    Sửa thời gian
                  </Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={() => {
                    setShowOptionsModal(false);
                    if (selectedTxForAction) handleDelete(selectedTxForAction);
                  }}
                  disabled={isOldTx}
                >
                  <Text
                    style={[
                      styles.optionTextDelete,
                      isOldTx && { color: "#dddddd" },
                    ]}
                  >
                    Xóa giao dịch
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionCancelBtn}
                  onPress={() => setShowOptionsModal(false)}
                >
                  <Text style={styles.optionCancelText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onShow={() => {
          if (profile?.inputMethod === "manual") {
            setTimeout(() => {
              editInputRef.current?.focus();
            }, 300);
          }
        }}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa số tiền</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            {profile?.inputMethod === "manual" ? (
              <View style={styles.manualInputWrapper}>
                <TextInput
                  ref={editInputRef}
                  key={showEditModal ? "active" : "inactive"}
                  style={styles.manualInput}
                  keyboardType="numeric"
                  placeholder="Nhập số tiền..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                  showSoftInputOnFocus={true}
                  value={
                    editAmount === 0 ? "" : editAmount.toLocaleString("vi-VN")
                  }
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    setEditAmount(
                      numericValue ? parseInt(numericValue, 10) : 0,
                    );
                  }}
                />
              </View>
            ) : (
              <>
                <View style={styles.editAmountDisplay}>
                  <Text
                    style={[
                      styles.editAmountText,
                      selectedTxForAction?.type === "expense"
                        ? styles.expenseText
                        : styles.incomeText,
                    ]}
                  >
                    {formatCurrency(editAmount)} đ
                  </Text>
                </View>

                <View style={{ paddingHorizontal: 16 }}>
                  <Keypad
                    amount={editAmount}
                    onAddAmount={(val) => setEditAmount((prev) => prev + val)}
                    onClear={() => setEditAmount(0)}
                  />
                </View>
              </>
            )}

            <View style={styles.inputMethodToggleRow}>
              <TouchableOpacity
                style={styles.quickToggleBtnCircle}
                onPress={toggleInputMethod}
              >
                {profile?.inputMethod !== "manual" ? (
                  <PencilLine size={18} color="#3b82f6" />
                ) : (
                  <PenOff size={18} color="#3b82f6" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.editConfirmBtn}
              onPress={executeEditTransaction}
            >
              <Text style={styles.editConfirmBtnText}>Xác nhận sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Sửa ghi chú */}
      <Modal
        visible={showEditNoteModal}
        transparent
        animationType="slide"
        onShow={() => {
          setTimeout(() => {
            editNoteInputRef.current?.focus();
          }, 300);
        }}
        onRequestClose={() => setShowEditNoteModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa ghi chú</Text>
              <TouchableOpacity onPress={() => setShowEditNoteModal(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.manualInputWrapper}>
              <TextInput
                ref={editNoteInputRef}
                style={[
                  styles.manualInput,
                  {
                    fontSize: 18,
                    fontWeight: "normal",
                    textAlign: "left",
                    padding: 16,
                    height: 100,
                    textAlignVertical: "top",
                  },
                ]}
                placeholder="Nhập ghi chú mới..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={editNote}
                onChangeText={setEditNote}
              />
            </View>

            <TouchableOpacity
              style={styles.editConfirmBtn}
              onPress={executeEditNote}
            >
              <Text style={styles.editConfirmBtnText}>Xác nhận sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
export default StatisticsScreen;
