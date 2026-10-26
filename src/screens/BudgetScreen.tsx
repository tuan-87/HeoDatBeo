import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import {
  PlusCircle,
  Trash2,
  X,
  Wallet,
  Eye,
  EyeOff,
  ArrowRightLeft,
  RotateCcw,
  HelpCircle,
  PencilLine,
  Settings,
  Sparkles,
} from "lucide-react-native";
import { storage } from "../store/storage";
import { CategoryBudget, UserProfile } from "../types";
import { formatCurrency } from "../utils/format";
import { isCategoryIdMatch, isProhibitedCategoryName } from "../utils/category";
import Keypad from "../components/Keypad";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { styles } from "../styles/BudgetScreen";
import { Archive } from "lucide-react-native/icons";
import { useLanguage } from "../i18n/LanguageContext";
import { getStreakLevel, getStreakLevelInfo } from "../utils/streak";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMascotImage } from "../utils/mascot";
import FloatingMascotAI from "../components/FloatingMascotAI";

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
// Màn hình BudgetScreen: Quản lý chia tiền vào các danh mục chi tiêu theo tháng
const BudgetScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = 64 + Math.max(insets.bottom, 12);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 5) return t("home.greeting.early") || "Chào sáng sớm 🌅";
    if (hr < 12) return t("home.greeting.morning") || "Xin chào buổi sáng ☀️";
    if (hr < 13) return t("home.greeting.noon") || "Xin chào buổi trưa 🌞";
    if (hr < 18) return t("home.greeting.afternoon") || "Xin chào buổi chiều 🌤️";
    if (hr < 22) return t("home.greeting.evening") || "Xin chào buổi tối 🌙";
    return t("home.greeting.night") || "Xin chào đêm khuya 🌃";
  };

  const handleShowTotalFundInfo = () => {
    Alert.normal(
      "TỔNG QUỸ TIÊU SÀI",
      "Đây là tổng số tiền trong các danh mục bạn đã chia tiền\n",
      [
        {
          text: "Hướng dẫn",
          onPress: () => {
            navigation.navigate("Guide");
          },
        },
        {
          text: "Đóng",
          style: "cancel",
        },
      ],
    );
  };

  const handleShowUnallocatedInfo = () => {
    Alert.normal(
      "SỐ DƯ CHƯA PHÂN BỔ",
      "Số dư chưa phân bổ là số tiền bạn dùng để phân chia vào danh mục cần nạp tiền và các loại quỹ.",
      [
        {
          text: "Hướng dẫn",
          onPress: () => {
            navigation.navigate("Guide");
          },
        },
        {
          text: "Đóng",
          style: "cancel",
        },
      ],
    );
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [unallocated, setUnallocated] = useState<number>(0); // Số dư chưa phân bổ

  // Modal: Chọn Icon
  const [iconModalVisible, setIconModalVisible] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<{
    name: string;
    type: "direct";
  } | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(
    null,
  );

  // Modal: Thêm danh mục mới
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [showAmount, setShowAmount] = useState(false);

  // Rename state for expense category
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CategoryBudget | null>(null);
  const [renameInputText, setRenameInputText] = useState("");

  const now = new Date();
  const currentMonthStr = `Tháng ${now.getMonth() + 1}`;

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    const p = await storage.getUserProfile();
    let cats = await storage.getCategoryBudgets();
    const txs = await storage.getTransactions();

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spentMap: Record<string, number> = {};
    txs.forEach((tx) => {
      if (tx.type === "expense") {
        const d = new Date(tx.timestamp);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const match = cats.find(
            (c) =>
              tx.categoryId && c.id && isCategoryIdMatch(c.id, tx.categoryId),
          );
          if (match && match.id) {
            spentMap[match.id] = (spentMap[match.id] || 0) + tx.amount;
          } else {
            const catId = tx.categoryId || "expense_khac";
            spentMap[catId] = (spentMap[catId] || 0) + tx.amount;
          }
        }
      }
    });

    cats = cats.map((c) => {
      const key = c.id || c.name;
      return {
        ...c,
        spent: spentMap[key] || 0,
      };
    });

    setProfile(p);
    const activeCats = cats.filter(
      (c) => c.deleteAt === null || c.deleteAt === undefined,
    );
    setBudgets(activeCats);
    if (p) {
      const totalAllocated = activeCats.reduce((sum, c) => sum + c.budget, 0);
      setUnallocated(Math.max(0, p.initialBalance - totalAllocated));
    }
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

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;

    if (isProhibitedCategoryName(name)) {
      Alert.alert(t("common.error"), "Tên danh mục này đã được sử dụng hệ thống.");
      return;
    }

    const allBudgets = await storage.getCategoryBudgets();
    const activeExists = allBudgets.some(
      (b) =>
        (b.deleteAt === null || b.deleteAt === undefined) && b.name === name,
    );
    if (activeExists) {
      Alert.alert(t("common.error"), "Danh mục này đã tồn tại.");
      return;
    }

    const softDeletedCat = allBudgets.find(
      (b) => b.deleteAt !== null && b.deleteAt !== undefined && b.name === name,
    );
    if (softDeletedCat) {
      const updated = allBudgets.map((b) => {
        return b.name === name ? { ...b, deleteAt: null } : b;
      });
      const success = await storage.saveCategoryBudgets(updated);
      if (success) {
        await loadData();
        setNewCatName("");
        setAddCatModalVisible(false);
        Alert.alert(t("common.success"), t("deletedCategories.restoreSuccess", { name }));
      }
      return;
    }

    // Chuyển sang bước chọn icon
    setPendingCategory({ name, type: "direct" });
    setAddCatModalVisible(false);
    setIconModalVisible(true);
  };

  const openEditIconModal = (cat: CategoryBudget) => {
    setEditingCategory(cat);
    setPendingCategory(null);
    setIconModalVisible(true);
  };

  const handleSelectIcon = async (iconKey: string) => {
    const allBudgets = await storage.getCategoryBudgets();
    if (editingCategory) {
      const updated = allBudgets.map((b) => {
        const isMatch =
          b.id && editingCategory.id
            ? isCategoryIdMatch(b.id, editingCategory.id)
            : b.name === editingCategory.name;
        if (isMatch) {
          return { ...b, icon: iconKey };
        }
        return b;
      });
      const success = await storage.saveCategoryBudgets(updated);
      if (success) {
        await loadData();
        setEditingCategory(null);
        setIconModalVisible(false);
      }
      return;
    }

    if (!pendingCategory) return;
    const { name, type } = pendingCategory;
    const newId =
      "expense_" +
      name.toLowerCase().replace(/[^a-z0-9]/g, "_") +
      "_" +
      Math.random().toString(36).substr(2, 5);

    const updated = [
      ...allBudgets,
      { id: newId, name, budget: 0, spent: 0, type: "direct" as const, icon: iconKey },
    ];
    const success = await storage.saveCategoryBudgets(updated);
    if (success) {
      await loadData();
      setNewCatName("");
      setPendingCategory(null);
      setIconModalVisible(false);
    }
  };

  const handleOpenDeleteConfirm = async (cat: CategoryBudget) => {
const txs = await storage.getTransactions();
    const hasTx = txs.some(
      (t) => t.categoryId && cat.id && isCategoryIdMatch(t.categoryId, cat.id),
    );

    Alert.alert(
      t("common.warning"),
      t("budget.confirmDelete", { name: cat.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => executeDeletion(cat, hasTx),
        },
      ],
    );
  };

  const executeDeletion = async (cat: CategoryBudget, hasTx: boolean) => {
    const allBudgets = await storage.getCategoryBudgets();
    let updated: CategoryBudget[];
    if (hasTx) {
      updated = allBudgets.map((b) => {
        const isMatch =
          b.id && cat.id
            ? isCategoryIdMatch(b.id, cat.id)
            : b.name === cat.name;
        return isMatch ? { ...b, deleteAt: Date.now(), budget: 0 } : b;
      });
    } else {
      updated = allBudgets.filter((b) =>
        b.id && cat.id ? !isCategoryIdMatch(b.id, cat.id) : b.name !== cat.name,
      );
    }
    const success = await storage.saveCategoryBudgets(updated);
    if (success) {
      await loadData();
      Alert.alert(t("common.success"), t("budget.categoryDeleted", { name: cat.name }));
    }
  };

  const handleOpenRenameModal = (cat: CategoryBudget) => {
    if (
      cat.name === "Tiết kiệm" ||
      cat.name === "Rút tiết kiệm" ||
      cat.name === "Nuôi heo béo" ||
      cat.name === "Heo giảm cân" ||
      cat.name === "Số dư đầu tiên" ||
      cat.name === "Khác"
    ) {
      Alert.alert(t("common.error"), t("budget.cannotRenameSystemCategory"));
      return;
    }
    setRenameTarget(cat);
    setRenameInputText(cat.name);
    setRenameModalVisible(true);
  };

  const handleRenameConfirm = async () => {
    const trimmedNewName = renameInputText.trim();
    if (!trimmedNewName || !renameTarget) return;

    if (isProhibitedCategoryName(trimmedNewName)) {
      Alert.alert(t("common.error"), t("budget.prohibitedCategoryName"));
      return;
    }

    const allBudgets = await storage.getCategoryBudgets();
    const isConflicting = allBudgets.some(
      (b) =>
        b.id &&
        renameTarget.id &&
        !isCategoryIdMatch(b.id, renameTarget.id) &&
        b.name === trimmedNewName,
    );
    if (isConflicting) {
      Alert.alert(t("common.error"), t("budget.categoryNameExists"));
      return;
    }

    const targetId =
      renameTarget.id ||
      "expense_" +
        renameTarget.name.toLowerCase().replace(/[^a-z0-9]/g, "_") +
        "_" +
        Math.random().toString(36).substr(2, 5);

    const updatedBudgets = allBudgets.map((b) => {
      const isMatch =
        b.id && renameTarget.id
          ? isCategoryIdMatch(b.id, renameTarget.id)
          : b.name === renameTarget.name;
      return isMatch ? { ...b, id: targetId, name: trimmedNewName } : b;
    });

    const success = await storage.saveCategoryBudgets(updatedBudgets);
    if (success) {
      await loadData();
      setRenameModalVisible(false);
      setRenameTarget(null);
      setRenameInputText("");
      Alert.alert(t("common.success"), t("profile.updateSuccess"));
    } else {
      Alert.alert(t("common.error"), t("common.error"));
    }
  };

  const totalSpent = budgets.reduce((sum, c) => sum + (c.spent || 0), 0);

  const renderCategoryItem = (cat: CategoryBudget) => {
    const spent = cat.spent || 0;
    const iconSource =
      EXPENSE_ICONS[cat.icon || "default"] || EXPENSE_ICONS["default"];

    return (
      <TouchableOpacity
        key={cat.name}
        style={[styles.catCard, { padding: 22 }]}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 10,
            padding: 4,
          }}
          onPress={() => handleOpenRenameModal(cat)}
        >
          <Settings color="#cbd5e1" size={14} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.catIconContainer}
          onPress={() => openEditIconModal(cat)}
        >
          <Image source={iconSource} style={styles.catIcon} />
        </TouchableOpacity>
        <View style={styles.catInfo}>
          <View style={styles.catNameRow}>
            <Text style={styles.catName}>{cat.name}</Text>
          </View>
          <Text
            style={[
              {
                color: spent > 0 ? "#ef4444" : "#64748b",
                marginTop: 4,
                fontSize: 12,
              },
            ]}
          >
            {t("budget.spentLabel")}{showAmount ? `-${formatCurrency(spent)} ${t("common.currencySymbol")}` : "******"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleOpenDeleteConfirm(cat)}
          >
            <Trash2 color="#dddddd" size={16} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Top bar with User Profile and quick settings/bell */}
        <View style={styles.headerTopBar}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {profile?.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </Text>
              )}
              <View style={styles.avatarStatus} />
            </View>
            <View style={styles.profileTextWrapper}>
              <Text style={styles.greetingLabel}>{getGreeting()}</Text>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.name || "Người dùng"}
              </Text>
            </View>
          </View>

          {profile?.streakCount ? (
            <TouchableOpacity
              onPress={() => {
                const currentStreak = profile.streakCount || 0;
                const level = getStreakLevel(currentStreak);
                const levelInfo = getStreakLevelInfo(level, t);
                Alert.alert(
                  t("streak.alertTitle"),
                  t("streak.alertBody", {
                    count: currentStreak,
                    name: levelInfo.name,
                    desc: levelInfo.description,
                  }),
                );
              }}
              style={styles.streakHeaderChip}
              activeOpacity={0.8}
            >
              <Image
                source={require("../../assets/series/icon-series.gif")}
                style={{ width: 36, height: 36, resizeMode: "contain" }}
              />
              <Text style={styles.streakHeaderTxt}>{profile.streakCount}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Guide" as never)}
              style={styles.actionBtn}
              activeOpacity={0.85}
            >
              <Sparkles color="#ffffff" size={20} />
              <View style={styles.actionBadge} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("Settings" as never);
              }}
              style={styles.actionBtn}
              activeOpacity={0.85}
            >
              <Settings color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bank Card */}
        <View style={styles.bankCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardBrandWrapper}>
              <Wallet color="#f59e0b" size={16} />
              <Text style={styles.cardBrandText}>{t("budget.title")}</Text>
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("DeletedCategories")
                }
                style={styles.eyeBtn}
              >
                <Archive color="#ffffff" size={15} />
              </TouchableOpacity>
              <View style={styles.cardChip} />
            </View>
          </View>

          <View style={styles.cardBalanceLabelContainer}>
            <Text style={styles.cardBalanceLabel}>{t("budget.unallocated")}</Text>
            <TouchableOpacity
              onPress={handleShowUnallocatedInfo}
              style={styles.helpIconTouch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <HelpCircle color="#94a3b8" size={12} />
            </TouchableOpacity>
          </View>
          <View style={styles.rowmb10}>
            <Text style={styles.cardBalanceAmount}>
              {showAmount ? `${formatCurrency(unallocated)} ${t("common.currencySymbol")}` : `•••••• ${t("common.currencySymbol")}`}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAmount(!showAmount)}
              style={styles.eyeBtn}
            >
              {showAmount ? (
                <Eye color="#ffffff" size={15} />
              ) : (
                <EyeOff color="#ffffff" size={15} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <View style={styles.cardStatLabelContainer}>
                <Text style={styles.cardStatLabel}>{t("budget.totalSpent")}</Text>
                <TouchableOpacity
                  onPress={handleShowTotalFundInfo}
                  style={styles.helpIconTouch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <HelpCircle color="#94a3b8" size={12} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardStatValue}>
                {showAmount ? `${formatCurrency(totalSpent)} ${t("common.currencySymbol")}` : "••••••"}
              </Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStat}>
              <Text style={styles.cardStatLabel}>{t("budget.currentPeriod")}</Text>
              <Text style={styles.cardStatValue}>{currentMonthStr}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={styles.addCatBtn}
            onPress={() => {
              setAddCatModalVisible(true);
            }}
          >
            <PlusCircle color="#7c3aed" size={20} />
            <Text style={styles.addCatText}>{t("budget.addCategory")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabNoteBox}>
          <Text style={styles.tabNoteText}>
            {t("budget.note")}
          </Text>
        </View>

        {budgets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {t("budget.empty")}
            </Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            {[...budgets]
              .sort((a, b) => (b.spent || 0) - (a.spent || 0))
              .map((cat) => renderCategoryItem(cat))}
          </View>
        )}
        <View style={{ height: bottomTabBarHeight + 16 }} />
      </ScrollView>

      {/* Modal: Thêm danh mục */}
      <Modal
        visible={addCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCatModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.inputModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("budget.addTitle")}</Text>
              <TouchableOpacity onPress={() => setAddCatModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={t("budget.addPlaceholder")}
              placeholderTextColor="#94a3b8"
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              onSubmitEditing={handleAddCategory}
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleAddCategory}
            >
              <Text style={styles.confirmBtnText}>{t("budget.addSubmit")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Chọn Icon */}
      <Modal
        visible={iconModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          handleSelectIcon(
            editingCategory ? editingCategory.icon || "default" : "default",
          )
        }
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.iconModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("budget.selectIconTitle")}</Text>
              <TouchableOpacity
                onPress={() =>
                  handleSelectIcon(
                    editingCategory
                      ? editingCategory.icon || "default"
                      : "default",
                  )
                }
              >
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.iconModalSubtitle}>
              {t("budget.selectIconSubtitle", { name: pendingCategory?.name || editingCategory?.name || "" })}
            </Text>

            <ScrollView
              contentContainerStyle={styles.iconGrid}
              showsVerticalScrollIndicator={false}
            >
              {Object.keys(EXPENSE_ICONS).map((iconKey) => {
                return (
                  <TouchableOpacity
                    key={iconKey}
                    style={styles.iconGridItem}
                    onPress={() => handleSelectIcon(iconKey)}
                  >
                    <Image
                      source={EXPENSE_ICONS[iconKey]}
                      style={styles.iconItemImage}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: "#64748b", marginTop: 16 },
              ]}
              onPress={() =>
                handleSelectIcon(
                  editingCategory
                    ? editingCategory.icon || "default"
                    : "default",
                )
              }
            >
              <Text style={styles.confirmBtnText}>
                {editingCategory ? t("common.cancel") : t("budget.useDefaultIcon")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Đổi tên danh mục */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.inputModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("budget.renameTitle")}</Text>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
              {t("budget.renameLabel", { name: renameTarget?.name || "" })}
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder={t("budget.renamePlaceholder")}
              value={renameInputText}
              onChangeText={setRenameInputText}
              onSubmitEditing={handleRenameConfirm}
              autoFocus={true}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { flex: 1, backgroundColor: "#64748b", marginTop: 0 },
                ]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.confirmBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleRenameConfirm}
              >
                <Text style={styles.confirmBtnText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Linh vật nổi di chuyển tự do */}
      <FloatingMascotAI
        mascot={profile?.mascot}
        onPress={() =>
          navigation.navigate("AIAssistant", { initialPeriod: "month" })
        }
      />
    </View>
  );
};

export default BudgetScreen;
