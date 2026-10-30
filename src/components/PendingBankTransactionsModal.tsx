import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Alert } from "./CustomAlert";
import {
  Landmark,
  X,
  ChevronDown,
  Check,
  Trash2,
  Sparkles,
} from "lucide-react-native";
import { PendingBankTransaction } from "../types";
import { formatCurrency } from "../utils/format";
import { styles } from "../styles/PendingBankTransactionsModal";

interface CategoryItem {
  id: string;
  name: string;
  type?: "expense" | "income";
}

interface PendingBankTransactionsModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: PendingBankTransaction[];
  categories: CategoryItem[];
  onConfirmTransaction: (
    tx: PendingBankTransaction,
    categoryId: string,
    categoryName: string,
    note: string,
  ) => Promise<void>;
  onIgnoreTransaction: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const PendingBankTransactionsModal: React.FC<
  PendingBankTransactionsModalProps
> = ({
  visible,
  onClose,
  transactions,
  categories,
  onConfirmTransaction,
  onIgnoreTransaction,
  onClearAll,
}) => {
  // Lưu danh mục được chọn riêng cho từng giao dịch: { [txId]: categoryId }
  const [selectedCatMap, setSelectedCatMap] = useState<Record<string, string>>(
    {},
  );
  // Lưu ghi chú được nhập riêng cho từng giao dịch: { [txId]: noteText }
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  // Quản lý sub-modal chọn danh mục: txId đang được chọn
  const [activePickerTxId, setActivePickerTxId] = useState<string | null>(null);

  const getCurrentNote = (tx: PendingBankTransaction): string => {
    if (notesMap[tx.id] !== undefined) {
      return notesMap[tx.id];
    }
    return "";
  };

  const handleConfirmItem = (
    tx: PendingBankTransaction,
    chosenCatId: string,
    chosenCatName: string,
    currentNote: string,
  ) => {
    const isOtherCategory =
      chosenCatName.trim().toLowerCase() === "khác" ||
      chosenCatName.trim().toLowerCase() === "other" ||
      chosenCatId === "other" ||
      chosenCatId === "expense_khac" ||
      chosenCatId === "income_khac";

    const trimmed = currentNote.trim();
    if (isOtherCategory && !trimmed) {
      Alert.alert(
        "Ghi chú bắt buộc",
        'Vui lòng nhập ghi chú khi chọn danh mục "Khác" để phân loại giao dịch.',
      );
      return;
    }

    onConfirmTransaction(tx, chosenCatId, chosenCatName, trimmed);
  };

  // Lấy danh sách danh mục cho từng loại giao dịch, luôn bảo đảm có danh mục "Khác"
  const getCategoriesForTx = (txType: "expense" | "income"): CategoryItem[] => {
    const filtered = categories.filter((c) =>
      c.type ? c.type === txType : true,
    );
    const otherId = txType === "income" ? "income_khac" : "expense_khac";
    const hasKhac = filtered.some(
      (c) =>
        c.id === otherId ||
        c.id === "other" ||
        c.name.trim().toLowerCase() === "khác" ||
        c.name.trim().toLowerCase() === "other",
    );
    if (!hasKhac) {
      return [...filtered, { id: otherId, name: "Khác", type: txType }];
    }
    return filtered;
  };

  // Helper tìm danh mục gợi ý ban đầu dựa theo note
  const getInitialCategoryId = (tx: PendingBankTransaction): string => {
    if (selectedCatMap[tx.id]) return selectedCatMap[tx.id];

    const noteLower = tx.note.toLowerCase();
    const otherCatId = tx.type === "income" ? "income_khac" : "expense_khac";
    const txCats = getCategoriesForTx(tx.type);

    // Tìm kiếm từ khóa thông thường
    const matched = txCats.find((c) => {
      const catName = c.name.toLowerCase();
      if (catName === "khác" || catName === "other") return false;
      if (
        catName === "ăn uống" &&
        (noteLower.includes("ăn") ||
          noteLower.includes("cafe") ||
          noteLower.includes("bún") ||
          noteLower.includes("cơm") ||
          noteLower.includes("trà"))
      ) {
        return true;
      }
      if (
        catName === "mua sắm" &&
        (noteLower.includes("shopee") ||
          noteLower.includes("lazada") ||
          noteLower.includes("mua") ||
          noteLower.includes("siêu thị") ||
          noteLower.includes("mart"))
      ) {
        return true;
      }
      if (
        catName === "xăng xe" ||
        catName === "di chuyển" ||
        catName === "đi lại"
      ) {
        if (
          noteLower.includes("xăng") ||
          noteLower.includes("grab") ||
          noteLower.includes("be ") ||
          noteLower.includes("taxi")
        )
          return true;
      }
      return noteLower.includes(catName);
    });

    if (matched) return matched.id;
    return txCats[0]?.id || otherCatId;
  };

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    const date = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${hours}:${mins} • ${date}/${month}`;
  };

  const activePickerTx = transactions.find((t) => t.id === activePickerTxId);
  const activePickerCategories = activePickerTx
    ? getCategoriesForTx(activePickerTx.type)
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Landmark color="#2563eb" size={20} />
              <Text style={styles.headerTitle}>Giao dịch ngân hàng</Text>
              {transactions.length > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {transactions.length}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#64748b" size={18} />
            </TouchableOpacity>
          </View>

          {transactions.length > 0 && (
            <Text style={styles.subHeaderDesc}>
              Heo Đất đã tự động bắt được biến động số dư. Hãy kiểm tra và chọn
              Hũ ngân sách tương ứng để lưu nhé!
            </Text>
          )}

          {/* Danh sách giao dịch */}
          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎉🐷</Text>
              <Text style={styles.emptyTitle}>Hết giao dịch chờ duyệt!</Text>
              <Text style={styles.emptySubtitle}>
                Tất cả các biến động số dư từ ngân hàng đã được bạn phân loại
                đầy đủ.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
            >
              {transactions.map((tx) => {
                const txCats = getCategoriesForTx(tx.type);
                const chosenCatId =
                  selectedCatMap[tx.id] || getInitialCategoryId(tx);
                const chosenCat = txCats.find((c) => c.id === chosenCatId);
                const chosenCatName = chosenCat?.name || "Khác";
                const currentNote = getCurrentNote(tx);
                const isOtherCategory =
                  chosenCatName.trim().toLowerCase() === "khác" ||
                  chosenCatName.trim().toLowerCase() === "other" ||
                  chosenCatId === "other" ||
                  chosenCatId === "expense_khac" ||
                  chosenCatId === "income_khac";

                return (
                  <View key={tx.id} style={styles.card}>
                    {/* Top Row: Bank name & time */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.bankTag}>
                        <Landmark size={14} color="#2563eb" />
                        <Text style={styles.bankTagName}>{tx.bankName}</Text>
                      </View>
                      <Text style={styles.cardTime}>
                        {formatTimestamp(tx.timestamp)}
                      </Text>
                    </View>

                    {/* Amount & Account */}
                    <View style={styles.amountRow}>
                      <Text
                        style={[
                          styles.amountText,
                          tx.type === "expense"
                            ? styles.expenseAmount
                            : styles.incomeAmount,
                        ]}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </Text>
                      <Text style={styles.currency}>đ</Text>
                      {tx.accountNumber && (
                        <Text style={styles.accountText}>
                          TK: *{tx.accountNumber}
                        </Text>
                      )}
                    </View>

                    {/* Category Selector */}
                    <Text style={styles.categoryLabel}>Chọn danh mục:</Text>
                    <TouchableOpacity
                      style={styles.categoryPickerBtn}
                      onPress={() => setActivePickerTxId(tx.id)}
                    >
                      <Text style={styles.categoryPickerBtnText}>
                        {chosenCatName}
                      </Text>
                      <ChevronDown size={16} color="#64748b" />
                    </TouchableOpacity>

                    {/* Note Input */}
                    <Text style={styles.noteInputLabel}>
                      Ghi chú giao dịch:
                      {isOtherCategory ? (
                        <Text style={{ color: "#ef4444", fontWeight: "700" }}>
                          {" "}
                          *
                        </Text>
                      ) : (
                        <Text style={{ color: "#94a3b8", fontWeight: "400" }}>
                          {" "}
                          (Không bắt buộc)
                        </Text>
                      )}
                    </Text>
                    <TextInput
                      style={[
                        styles.noteInput,
                        isOtherCategory &&
                          !currentNote.trim() && {
                            borderColor: "#ef4444",
                            borderWidth: 1.5,
                          },
                      ]}
                      value={currentNote}
                      onChangeText={(txt) =>
                        setNotesMap((prev) => ({ ...prev, [tx.id]: txt }))
                      }
                      placeholder={
                        isOtherCategory
                          ? "Nhập ghi chú cho danh mục Khác..."
                          : "Ví dụ: Cơm trưa, cà phê, đổ xăng..."
                      }
                      placeholderTextColor="#94a3b8"
                      maxLength={100}
                    />

                    {tx.note ? (
                      <Text style={styles.rawNoteHint} numberOfLines={1}>
                        Nội dung gốc: {tx.note}
                      </Text>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.ignoreBtn}
                        onPress={() => onIgnoreTransaction(tx.id)}
                      >
                        <Text style={styles.ignoreBtnText}>Bỏ qua</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() =>
                          handleConfirmItem(
                            tx,
                            chosenCatId,
                            chosenCatName,
                            currentNote,
                          )
                        }
                      >
                        <Text style={styles.confirmBtnText}>Lưu vào hũ ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {transactions.length > 1 && (
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={onClearAll}
                >
                  <Text style={styles.clearAllBtnText}>
                    Bỏ qua tất cả giao dịch này
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* Sub-modal: Pick category for transaction */}
          <Modal
            visible={activePickerTxId !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setActivePickerTxId(null)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 20,
                  width: "100%",
                  maxHeight: "70%",
                  padding: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0f172a",
                    marginBottom: 12,
                    textAlign: "center",
                  }}
                >
                  Chọn danh mục phân bổ
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {activePickerCategories.map((cat) => {
                    const isSelected =
                      activePickerTxId &&
                      (selectedCatMap[activePickerTxId] === cat.id ||
                        (!selectedCatMap[activePickerTxId] &&
                          getInitialCategoryId(activePickerTx!) === cat.id));

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor: isSelected
                            ? "#eff6ff"
                            : "transparent",
                          borderBottomWidth: 1,
                          borderBottomColor: "#f1f5f9",
                        }}
                        onPress={() => {
                          if (activePickerTxId) {
                            setSelectedCatMap((prev) => ({
                              ...prev,
                              [activePickerTxId]: cat.id,
                            }));
                          }
                          setActivePickerTxId(null);
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isSelected ? "700" : "500",
                            color: isSelected ? "#2563eb" : "#334155",
                          }}
                        >
                          {cat.name}
                        </Text>
                        {isSelected && <Check size={18} color="#2563eb" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: "#f1f5f9",
                    alignItems: "center",
                  }}
                  onPress={() => setActivePickerTxId(null)}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#64748b",
                    }}
                  >
                    Đóng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
