import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import { writeAsStringAsync, readAsStringAsync } from "expo-file-system/legacy";
import { Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { storage } from "../store/storage";
import {
  initGoogleDrive,
  signInGoogle,
  signOutGoogle,
  uploadBackupToGoogleDrive,
  getAccessToken,
  restoreLatestBackupFromGoogleDrive,
  checkLatestBackupOnGoogleDrive,
  getLatestBackupDetailsOnGoogleDrive,
} from "../utils/googleDrive";
import {
  CommonActions,
  useNavigation,
  useIsFocused,
} from "@react-navigation/native";
import {
  Download,
  Upload,
  Trash2,
  List,
  Plus,
  X,
  BookOpen,
  Settings as SettingsIcon,
  User,
  Cloud,
  Database,
  PencilLine,
  Bitcoin,
  FileText,
  Settings,
  ChartNoAxesCombined,
  Globe,
  Landmark,
} from "lucide-react-native";
import { useLanguage } from "../i18n/LanguageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserProfile, CategoryBudget, IncomeCategory } from "../types";
import { EXPENSE_ICONS } from "./MoneyDiaryScreen";
import { scheduleTestNotification } from "../utils/notifications";
import {
  GoogleDriveModal,
  OfflineBackupModal,
  BankSettingsModal,
  LanguageSelectModal,
} from "../components/modals";
import { styles } from "../styles/SettingsScreen";
import { isCategoryIdMatch, isProhibitedCategoryName } from "../utils/category";

const DEFAULT_INCOME_CATEGORIES = ["Lương", "Thưởng", "Bán hàng"];

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

  // Fallback for legacy key lookup
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

import VERSION_HISTORY from "../../version_history.json";
import {
  BanknoteArrowUp,
  CopyMinus,
  FileX,
  FolderMinus,
  ShieldUser,
} from "lucide-react-native/icons";

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = 64 + Math.max(insets.bottom, 12);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Category Modal State (income only)
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Modal Chọn Icon Thu nhập
  const [isIconModalVisible, setIconModalVisible] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState("");
  const [pendingCategoryId, setPendingCategoryId] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    "income" | "expense"
  >("income");
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);

  // Rename states
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
    type: "income" | "expense";
  } | null>(null);
  const [renameInputText, setRenameInputText] = useState("");

  // Settings Modal State
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

  // Google Drive Backup States
  const [isDriveModalVisible, setDriveModalVisible] = useState(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number>(0);
  const [lastBackupStatus, setLastBackupStatus] = useState<string>("none");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isOfflineModalVisible, setOfflineModalVisible] = useState(false);
  const [isNotesModalVisible, setNotesModalVisible] = useState(false);
  const { language, changeLanguage, t } = useLanguage();
  const [isLangModalVisible, setLangModalVisible] = useState(false);
  const [isBankSettingsModalVisible, setBankSettingsModalVisible] = useState(false);
  const [notesTab, setNotesTab] = useState<"expense" | "income">("expense");
  const [newNoteText, setNewNoteText] = useState("");
  const [suggestedNotes, setSuggestedNotes] = useState<string[]>([]);

  useEffect(() => {
    initGoogleDrive();
    checkGoogleSignInStatus();
    loadBackupSettings();
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadProfile();
      checkGoogleSignInStatus();
      loadBackupSettings();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isNotesModalVisible) {
      loadSuggestedNotes();
    }
  }, [isNotesModalVisible, notesTab]);

  const loadSuggestedNotes = async () => {
    const notes = await storage.getSuggestedNotes(notesTab);
    setSuggestedNotes(notes);
  };

  const handleAddNote = async () => {
    const trimmed = newNoteText.trim();
    if (!trimmed) return;
    if (suggestedNotes.includes(trimmed)) {
      Alert.alert(t("common.error"), t("settings.noteDuplicateError"));
      return;
    }
    await storage.addSuggestedNote(notesTab, trimmed);
    setNewNoteText("");
    loadSuggestedNotes();
  };

  const handleDeleteNote = async (note: string) => {
    Alert.alert(
      t("common.warning"),
      `${t("settings.confirmDeleteNote")}\n"${note}"`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await storage.deleteSuggestedNote(notesTab, note);
            loadSuggestedNotes();
          },
        },
      ],
    );
  };

  const checkGoogleSignInStatus = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setIsGoogleSignedIn(true);
        const {
          GoogleSignin,
        } = require("@react-native-google-signin/google-signin");
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser && currentUser.user) {
          setGoogleUserEmail(currentUser.user.email);
        }
      } else {
        setIsGoogleSignedIn(false);
        setGoogleUserEmail(null);
      }
    } catch (e) {
      setIsGoogleSignedIn(false);
      setGoogleUserEmail(null);
    }
  };

  const loadBackupSettings = async () => {
    const autoEnabled = await storage.isGoogleDriveAutoBackupEnabled();
    const lastTimestamp = await storage.getGoogleDriveLastBackupTimestamp();
    const lastStatus = await storage.getGoogleDriveLastBackupStatus();
    setIsAutoBackupEnabled(autoEnabled);
    setLastBackupTimestamp(lastTimestamp);
    setLastBackupStatus(lastStatus);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await signInGoogle();
      if (res.success && res.userInfo) {
        const userInfoAny = res.userInfo as any;
        setIsGoogleSignedIn(true);
        setGoogleUserEmail(userInfoAny.user.email);

        let lastTimestamp = await storage.getGoogleDriveLastBackupTimestamp();
        let lastStatus = await storage.getGoogleDriveLastBackupStatus();

        if (lastTimestamp === 0) {
          const driveBackup = await checkLatestBackupOnGoogleDrive();
          if (driveBackup && driveBackup.success && driveBackup.timestamp) {
            lastTimestamp = driveBackup.timestamp;
            lastStatus = "success";
            await storage.setGoogleDriveLastBackupTimestamp(lastTimestamp);
            await storage.setGoogleDriveLastBackupStatus(lastStatus);
          }
        }

        const autoEnabled = await storage.isGoogleDriveAutoBackupEnabled();
        setIsAutoBackupEnabled(autoEnabled);
        setLastBackupTimestamp(lastTimestamp);
        setLastBackupStatus(lastStatus);

        Alert.alert(
          t("common.success"),
          `${t("settings.googleLoginSuccess")} ${userInfoAny.user.email}`,
        );
      } else {
        Alert.alert(
          t("settings.googleLoginError"),
          res.error || t("settings.googleLoginErrorMsg"),
        );
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("settings.generalError"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    Alert.alert(
      t("settings.confirmLogout"),
      t("settings.confirmLogoutMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.logoutBtn"),
          style: "destructive",
          onPress: async () => {
            const res = await signOutGoogle();
            if (res.success) {
              setIsGoogleSignedIn(false);
              setGoogleUserEmail(null);
              setIsAutoBackupEnabled(false);
              await storage.setGoogleDriveAutoBackupEnabled(false);
              Alert.alert(
                t("settings.logoutSuccess"),
                t("settings.logoutSuccessMsg"),
              );
            }
          },
        },
      ],
    );
  };

  const handleToggleAutoBackup = async (value: boolean) => {
    if (!isGoogleSignedIn) {
      Alert.alert(
        t("settings.loginRequired"),
        t("settings.loginRequiredMsg"),
      );
      return;
    }
    const success = await storage.setGoogleDriveAutoBackupEnabled(value);
    if (success) {
      setIsAutoBackupEnabled(value);
    }
  };

  const handleManualBackup = async () => {
    if (!isGoogleSignedIn) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần liên kết tài khoản Google trước.",
      );
      return;
    }
    setIsBackingUp(true);
    try {
      const dataStr = await storage.exportData();
      const res = await uploadBackupToGoogleDrive(dataStr);
      const now = Date.now();
      await storage.setGoogleDriveLastBackupTimestamp(now);
      await storage.setGoogleDriveLastBackupStatus(
        res.success ? "success" : "failed",
      );

      setLastBackupTimestamp(now);
      setLastBackupStatus(res.success ? "success" : "failed");

      if (res.success) {
        Alert.alert(t("common.success"), t("settings.backupSuccess"));
      } else {
        Alert.alert(t("settings.backupError"), res.message);
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("settings.generalError"));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFromGoogleDrive = async () => {
    if (!isGoogleSignedIn) {
      Alert.alert(
        t("settings.loginRequired"),
        t("settings.loginRequiredMsg"),
      );
      return;
    }

    setIsRestoring(true);
    try {
      // 1. Tải thông tin bản sao lưu mới nhất trước để hiển thị xác nhận cho người dùng
      const detailsRes = await getLatestBackupDetailsOnGoogleDrive();
      if (!detailsRes.success || !detailsRes.name || !detailsRes.timestamp) {
        Alert.alert(
          t("settings.backupNotFound"),
          detailsRes.message || t("settings.backupNotFoundMsg"),
        );
        setIsRestoring(false);
        return;
      }

      // Định dạng ngày giờ bản sao lưu
      const date = new Date(detailsRes.timestamp);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      const formattedTime = `${dd}/${mm}/${yyyy} ${t("settings.atTime")} ${hh}:${min}:${ss}`;

      setIsRestoring(false); // Tắt spinner để hiển thị hộp thoại xác nhận

      Alert.alert(
        t("settings.restoreConfirmTitle"),
        t("settings.restoreConfirmMsg").replace("{name}", detailsRes.name!).replace("{time}", formattedTime),
        [
          { text: t("settings.restoreCancelBtn"), style: "cancel" },
          {
            text: t("settings.restoreConfirmBtn"),
            style: "destructive",
            onPress: async () => {
              setIsRestoring(true);
              try {
                const res = await restoreLatestBackupFromGoogleDrive();
                if (res.success && res.content) {
                  const success = await storage.importData(res.content);
                  if (success) {
                    const backupTime =
                      res.timestamp || detailsRes.timestamp || Date.now();
                    await storage.setGoogleDriveLastBackupTimestamp(backupTime);
                    await storage.setGoogleDriveLastBackupStatus("success");
                    setLastBackupTimestamp(backupTime);
                    setLastBackupStatus("success");
                    Alert.alert(
                      t("common.success"),
                      t("settings.restoreSuccess"),
                    );
                    loadProfile();
                  } else {
                    Alert.alert(
                      t("settings.restoreError"),
                      t("settings.restoreErrorMsg"),
                    );
                  }
                } else {
                  Alert.alert(t("settings.restoreGenericError"), res.message);
                }
              } catch (e: any) {
                Alert.alert(t("common.error"), e.message || t("settings.generalError"));
              } finally {
                setIsRestoring(false);
              }
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("settings.generalError"));
      setIsRestoring(false);
    }
  };

  const formatLastBackupTime = (ts: number) => {
    if (!ts || ts === 0) return t("settings.neverBackedUp");
    const date = new Date(ts);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${t("settings.atTime")} ${hh}:${min}:${ss}`;
  };

  const loadProfile = async () => {
    const p = await storage.getUserProfile();
    setProfile(p);
    const budgets = await storage.getCategoryBudgets();
    const activeBudgets = budgets.filter(
      (b) => b.deleteAt === null || b.deleteAt === undefined,
    );
    setCategoryBudgets(activeBudgets);
  };

  const handleExport = async () => {
    try {
      const dataStr = await storage.exportData();
      const baseDir = Paths.document?.uri || Paths.cache?.uri;
      if (!baseDir) {
        Alert.alert(t("common.error"), t("settings.exportFileError"));
        return;
      }
      const fileUri =
        baseDir + (baseDir.endsWith("/") ? "" : "/") + "heodatbeo_backup.txt";
      await writeAsStringAsync(fileUri, dataStr, { encoding: "utf8" });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: t("settings.backupSuccess"),
        });
      } else {
        Alert.alert(
          t("common.error"),
          t("settings.exportShareError"),
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t("common.error"), t("settings.exportError"));
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileContent = await readAsStringAsync(result.assets[0].uri, {
          encoding: "utf8",
        });

        const success = await storage.importData(fileContent);
        if (success) {
          Alert.alert(
            t("common.success"),
            t("settings.importSuccess"),
          );
          loadProfile();
        } else {
          Alert.alert(
            t("common.error"),
            t("settings.importError"),
          );
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t("common.error"), t("settings.importGenericError"));
    }
  };

  const handleReset = () => {
    Alert.alert(
      t("settings.resetWarning"),
      t("settings.resetWarningMsg"),
      [
        { text: t("settings.resetCancelBtn"), style: "cancel" },
        {
          text: t("settings.resetBtn"),
          style: "destructive",
          onPress: async () => {
            try {
              await signOutGoogle();
            } catch (e) {
              console.error(
                "Error signing out Google during factory reset:",
                e,
              );
            }
            const success = await storage.clearUserResetData();
            if (success) {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Setup" }],
                }),
              );
            } else {
              Alert.alert(t("common.error"), t("settings.resetError"));
            }
          },
        },
      ],
    );
  };

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || !profile) return;

    if (isProhibitedCategoryName(trimmedName)) {
      Alert.alert(
        t("common.error"),
        t("settings.categoryProhibitedError").replace("{name}", trimmedName),
      );
      return;
    }

    if (activeCategoryTab === "income") {
      const current = profile.incomeCategories || [];
      const isActiveExisting = current.some((c: any) => {
        if (typeof c === "string") return c === trimmedName;
        return (
          c.name === trimmedName &&
          (c.deleteAt === null || c.deleteAt === undefined)
        );
      });
      if (isActiveExisting) {
        Alert.alert(t("common.error"), t("settings.categoryDuplicateError"));
        return;
      }

      const softDeletedCat = current.find((c: any) => {
        if (typeof c === "string") return false;
        return (
          c.name === trimmedName &&
          c.deleteAt !== null &&
          c.deleteAt !== undefined
        );
      });

      if (softDeletedCat) {
        const restoredCats = current.map((c: any) => {
          if (typeof c === "object" && c.name === trimmedName) {
            return { ...c, deleteAt: null };
          }
          return c;
        });
        const updatedProfile = {
          ...profile,
          incomeCategories: restoredCats,
        };
        const success = await storage.saveUserProfile(updatedProfile);
        if (success) {
          setProfile(updatedProfile);
          setNewCategoryName("");
          setCategoryModalVisible(true);
          Alert.alert(
            t("common.success"),
            t("settings.categoryRestored").replace("{name}", trimmedName),
          );
        }
        return;
      }

      const newId =
        "income_" +
        trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "_") +
        "_" +
        Math.random().toString(36).substr(2, 5);
      setPendingCategoryId(newId);
      setPendingCategoryName(trimmedName);
      setCategoryModalVisible(false);
      setIconModalVisible(true);
    } else {
      Alert.alert(
        t("settings.categoryExpenseInfo"),
        t("settings.categoryExpenseInfoMsg"),
      );
    }
  };

  const handleSelectIncomeIcon = async (iconKey: string) => {
    if (!pendingCategoryName || !profile) return;
    const catId =
      pendingCategoryId ||
      "income_" +
        pendingCategoryName.toLowerCase().replace(/[^a-z0-9]/g, "_") +
        "_" +
        Math.random().toString(36).substr(2, 5);
    const catName = pendingCategoryName;

    const current =
      profile.incomeCategories && profile.incomeCategories.length > 0
        ? profile.incomeCategories
        : DEFAULT_INCOME_CATEGORIES.map((c) => ({
            id: "income_" + c.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            name: c,
            icon:
              c === "Lương"
                ? "salary"
                : c === "Thưởng"
                  ? "gift-box"
                  : c === "Bán hàng"
                    ? "sell"
                    : "default",
          }));

    const isExisting = current.some((c: any) =>
      typeof c === "string"
        ? c === catName
        : (c.id === catId || c.name === catName) &&
          (c.deleteAt === null || c.deleteAt === undefined),
    );

    let updatedProfile;
    if (isExisting) {
      const updatedCats = current.map((c: any) => {
        if (typeof c === "string") {
          if (c === catName) {
            return { id: catId, name: c, icon: iconKey };
          }
          const fallbackId =
            "income_" + c.toLowerCase().replace(/[^a-z0-9]/g, "_");
          return { id: fallbackId, name: c };
        }
        const isMatch =
          typeof c === "object" && (c.id === catId || c.name === catName);
        return isMatch ? { ...c, icon: iconKey } : c;
      });
      updatedProfile = {
        ...profile,
        incomeCategories: updatedCats as any,
      };
    } else {
      const newCategory = { id: catId, name: catName, icon: iconKey };
      const normalizedCurrent = current.map((c: any) => {
        if (typeof c === "string") {
          const fallbackId =
            "income_" + c.toLowerCase().replace(/[^a-z0-9]/g, "_");
          return { id: fallbackId, name: c };
        }
        return c;
      });

      updatedProfile = {
        ...profile,
        incomeCategories: [...normalizedCurrent, newCategory] as any,
      };
    }

    const success = await storage.saveUserProfile(updatedProfile);
    if (success) {
      setProfile(updatedProfile);
      setNewCategoryName("");
      setPendingCategoryId("");
      setPendingCategoryName("");
      setIconModalVisible(false);
      setCategoryModalVisible(true);
    }
  };

  const handleCancelIncomeIcon = () => {
    if (!pendingCategoryName || !profile) {
      setIconModalVisible(false);
      setCategoryModalVisible(true);
      return;
    }
    const current = profile.incomeCategories || [];
    const isExisting = current.some((c: any) =>
      typeof c === "string"
        ? c === pendingCategoryName
        : c.id === pendingCategoryId || c.name === pendingCategoryName,
    );

    if (isExisting) {
      setPendingCategoryId("");
      setPendingCategoryName("");
      setIconModalVisible(false);
      setCategoryModalVisible(true);
    } else {
      handleSelectIncomeIcon("default");
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!profile) return;

    if (
      catName === "Tiết kiệm" ||
      catName === "Rút tiết kiệm" ||
      catName === "Nuôi heo béo" ||
      catName === "Heo giảm cân" ||
      catName === "Số dư đầu tiên" ||
      catName === "Khác"
    ) {
      Alert.alert(t("common.warning"), t("settings.categorySystemError"));
      return;
    }

    const txs = await storage.getTransactions();
    const hasTx = txs.some(
      (t) => t.categoryId && catId && isCategoryIdMatch(t.categoryId, catId),
    );

    Alert.alert(t("common.warning"), t("settings.confirmDeleteCategory").replace("{name}", catName), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (activeCategoryTab === "income") {
            const current = profile.incomeCategories || [];
            let updatedCats: any[];
            if (hasTx) {
              updatedCats = current.map((c: any) => {
                if (typeof c === "string") {
                  const fallbackId =
                    "income_" +
                    c.toLowerCase().replace(/[^a-z0-9]/g, "_") +
                    "_" +
                    Math.random().toString(36).substr(2, 5);
                  if (c === catName) {
                    return { id: fallbackId, name: c, deleteAt: Date.now() };
                  }
                  return { id: fallbackId, name: c };
                }
                if (c.id === catId || c.name === catName) {
                  return { ...c, deleteAt: Date.now() };
                }
                return c;
              });
            } else {
              updatedCats = current.filter((c: any) =>
                typeof c === "string" ? c !== catName : c.id !== catId,
              );
            }
            const updatedProfile = {
              ...profile,
              incomeCategories: updatedCats,
            };
            const success = await storage.saveUserProfile(updatedProfile);
            if (success) {
              setProfile(updatedProfile);
            }
          } else {
            // Delete Expense Category (CategoryBudget)
            const allBudgets = await storage.getCategoryBudgets();
            let updatedBudgets: CategoryBudget[];
            if (hasTx) {
              updatedBudgets = allBudgets.map((b) => {
                const isMatch =
                  b.id && catId
                    ? isCategoryIdMatch(b.id, catId)
                    : b.name === catName;
                return isMatch ? { ...b, deleteAt: Date.now(), budget: 0 } : b;
              });
            } else {
              updatedBudgets = allBudgets.filter(
                (b) => b.id !== catId && b.name !== catName,
              );
            }
            const success = await storage.saveCategoryBudgets(updatedBudgets);
            if (success) {
              setCategoryBudgets(
                updatedBudgets.filter(
                  (b) => b.deleteAt === null || b.deleteAt === undefined,
                ),
              );
            }
          }
        },
      },
    ]);
  };

  const handleOpenRenameModal = (catId: string, catName: string) => {
    if (
      catName === "Tiết kiệm" ||
      catName === "Rút tiết kiệm" ||
      catName === "Nuôi heo béo" ||
      catName === "Heo giảm cân" ||
      catName === "Số dư đầu tiên" ||
      catName === "Khác"
    ) {
      Alert.alert(t("common.error"), t("settings.categoryRenameSystemError"));
      return;
    }
    setRenameTarget({ id: catId, name: catName, type: activeCategoryTab });
    setRenameInputText(catName);
    setRenameModalVisible(true);
  };

  const handleRenameConfirm = async () => {
    const trimmedNewName = renameInputText.trim();
    if (!trimmedNewName || !profile || !renameTarget) return;

    if (isProhibitedCategoryName(trimmedNewName)) {
      Alert.alert(t("common.error"), t("settings.categoryRenameProhibited"));
      return;
    }

    if (renameTarget.type === "income") {
      const current = profile.incomeCategories || [];
      const isConflicting = current.some((c: any) =>
        typeof c === "string"
          ? c === trimmedNewName
          : c.id &&
            renameTarget.id &&
            !isCategoryIdMatch(c.id, renameTarget.id) &&
            c.name === trimmedNewName,
      );
      if (isConflicting) {
        Alert.alert(t("common.error"), t("settings.categoryRenameDuplicate"));
        return;
      }

      const updatedIncomeCats = current.map((c: any) => {
        if (typeof c === "string") {
          if (c === renameTarget.name) {
            const newId =
              "income_" +
              trimmedNewName.toLowerCase().replace(/[^a-z0-9]/g, "_") +
              "_" +
              Math.random().toString(36).substr(2, 5);
            return { id: newId, name: trimmedNewName };
          }
          const fallbackId =
            "income_" + c.toLowerCase().replace(/[^a-z0-9]/g, "_");
          return { id: fallbackId, name: c };
        }
        return c.id &&
          renameTarget.id &&
          isCategoryIdMatch(c.id, renameTarget.id)
          ? { ...c, name: trimmedNewName }
          : c;
      });

      const updatedProfile = {
        ...profile,
        incomeCategories: updatedIncomeCats as any,
      };

      const success = await storage.saveUserProfile(updatedProfile);
      if (success) {
        setProfile(updatedProfile);
      }
    } else {
      // Expense category rename
      const isConflicting = categoryBudgets.some(
        (b) =>
          b.id &&
          renameTarget.id &&
          !isCategoryIdMatch(b.id, renameTarget.id) &&
          b.name === trimmedNewName,
      );
      if (isConflicting) {
        Alert.alert(t("common.error"), t("settings.categoryRenameDuplicate"));
        return;
      }

      const updatedBudgets = categoryBudgets.map((b) =>
        b.id && renameTarget.id && isCategoryIdMatch(b.id, renameTarget.id)
          ? { ...b, name: trimmedNewName }
          : b,
      );

      const success = await storage.saveCategoryBudgets(updatedBudgets);
      if (success) {
        setCategoryBudgets(updatedBudgets);
      }
    }

    setRenameModalVisible(false);
    setRenameTarget(null);
    setRenameInputText("");
    Alert.alert(t("common.success"), t("settings.renameSuccess"));
  };

  const handleUpdateInputMethod = async (method: "keypad" | "manual") => {
    if (!profile) return;
    const updatedProfile = { ...profile, inputMethod: method };
    const success = await storage.saveUserProfile(updatedProfile);
    if (success) {
      setProfile(updatedProfile);
    }
  };

  const renderCategoryItem = ({
    item,
  }: {
    item: { id: string; name: string };
  }) => {
    const iconSource =
      activeCategoryTab === "income"
        ? getIncomeIconSource(item.id, profile)
        : (() => {
            const budget = categoryBudgets.find(
              (b) => b.id === item.id || b.name === item.name,
            );
            return budget && budget.icon
              ? EXPENSE_ICONS[budget.icon]
              : EXPENSE_ICONS["default"];
          })();

    return (
      <View style={styles.categoryListItem}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => handleOpenRenameModal(item.id, item.name)}
          >
            <Settings color="#cbd5e1" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.categoryIconContainer}
            onPress={() => {
              setPendingCategoryId(item.id);
              setPendingCategoryName(item.name);
              setCategoryModalVisible(false);
              setIconModalVisible(true);
            }}
          >
            <Image source={iconSource} style={styles.categoryIcon} />
          </TouchableOpacity>
          <Text style={styles.categoryListName}>{item.name}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity
            onPress={() => handleDeleteCategory(item.id, item.name)}
          >
            <Trash2 color="#cccccc" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getActiveCategories = () => {
    if (activeCategoryTab === "income") {
      const raw = profile?.incomeCategories || DEFAULT_INCOME_CATEGORIES;
      return raw
        .map((c: any) => {
          if (typeof c === "string") {
            return {
              id: "income_" + c.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              name: c,
            };
          }
          return c;
        })
        .filter((c: any) => c.deleteAt === null || c.deleteAt === undefined);
    } else {
      return categoryBudgets.map((b) => ({
        id:
          b.id || "expense_" + b.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: b.name,
      }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
      </View>

      <ScrollView
          showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => setLangModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#e0e7ff" }]}>
            <Globe color="#4f46e5" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.language")}</Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {language === "vi"
                ? "Tiếng Việt"
                : language === "en"
                  ? "English"
                  : "Deutsch"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => (navigation as any).navigate("Profile")}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#f3e8ff" }]}>
            <ShieldUser color="#a855f7" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.personalInfo")}</Text>
          </View>
        </TouchableOpacity>

        {/* Cài đặt Đọc thông báo ngân hàng */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setBankSettingsModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#dbeafe" }]}>
            <Landmark color="#2563eb" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Đọc thông báo ngân hàng</Text>
            <Text style={{ fontSize: 12, color: "#2563eb", marginTop: 2 }}>
              Tự động nhận diện giao dịch VCB, TCB, MB, MoMo...
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setCategoryModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}>
            <BanknoteArrowUp color="#d97706" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {t("settings.incomeCategories")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => (navigation as any).navigate("GoldHistory")}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}>
            <Bitcoin color="#d97706" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.goldManagement")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setSettingsModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#e0f2fe" }]}>
            <SettingsIcon color="#0284c7" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.inputSettings")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => (navigation as any).navigate("Guide")}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
            <BookOpen color="#16a34a" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.userGuide")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setDriveModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#ecfeff" }]}>
            <Cloud color="#0891b2" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.onlineBackup")}</Text>
            {isGoogleSignedIn && (
              <Text style={{ fontSize: 12, color: "#0891b2", marginTop: 2 }}>
                Đã liên kết tài khoản
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setOfflineModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#e0e7ff" }]}>
            <Database color="#4f46e5" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.offlineBackup")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setNotesModalVisible(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
            <PencilLine color="#16a34a" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {t("settings.noteSuggestions")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => (navigation as any).navigate("YearlyReport")}
        >
          <View style={[styles.iconContainer, { backgroundColor: "#ecfeff" }]}>
            <ChartNoAxesCombined color="#0891b2" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.yearlyReport")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handleReset}>
          <View style={[styles.iconContainer, { backgroundColor: "#fee2e2" }]}>
            <FileX color="#dc2626" size={18} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t("settings.factoryReset")}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer cố định phía dưới */}
      <View
        style={[styles.footerInfo, { paddingBottom: bottomTabBarHeight + 12 }]}
      >
        <View style={styles.versionRow}>
          <Text style={styles.versionText}>
            {t("settings.currentVersion", {
              version: VERSION_HISTORY[0]?.version,
            })}
          </Text>
          <Text style={styles.versionSeparator}>|</Text>
          <TouchableOpacity onPress={() => setHistoryModalVisible(true)}>
            <Text style={styles.versionHistoryBtn}>
              {t("settings.versionHistory", { count: VERSION_HISTORY.length })}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.authorText}>
          {t("settings.developedBy")}{" "}
          <Text style={styles.authorHighlight}>SatsBoy87</Text>
        </Text>
      </View>

      {/* Modal Lịch sử Phiên bản */}
      <GoogleDriveModal
        visible={isDriveModalVisible}
        onClose={() => setDriveModalVisible(false)}
        onRestoreSuccess={loadProfile}
        t={t}
      />

      {/* Modal: Quản lý thông báo ngân hàng */}
      <BankSettingsModal
        visible={isBankSettingsModalVisible}
        onClose={() => setBankSettingsModalVisible(false)}
      />

      <OfflineBackupModal
        visible={isOfflineModalVisible}
        onClose={() => setOfflineModalVisible(false)}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Modal: Quản lý ghi chú gợi ý */}
      

      {/* Modal Chọn Ngôn ngữ */}
      <LanguageSelectModal
        visible={isLangModalVisible}
        onClose={() => setLangModalVisible(false)}
        language={language}
        onSelectLanguage={changeLanguage}
        t={t}
      />
    </View>
  );
};

export default SettingsScreen;
