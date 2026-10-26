import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Alert } from "../components/CustomAlert";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  History,
  Send,
  Trash2,
  X,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
} from "lucide-react-native";
import { storage } from "../store/storage";
import { AIPeriod, AIChatItem, UserProfile } from "../types";
import {
  PERIOD_LABELS,
  askGemini,
  buildFinancialSummary,
} from "../services/gemini.service";
import { getMascotImage, MASCOT_LIST } from "../utils/mascot";
import { styles } from "../styles/AIAssistantScreen";
import { useLanguage } from "../i18n/LanguageContext";

const MAX_HISTORY_ITEMS = 15;

const PERIOD_OPTIONS: { key: AIPeriod; label: string; icon: string }[] = [
  { key: "day", label: "Hôm nay", icon: "📅" },
  { key: "week", label: "Tuần này", icon: "🗓️" },
  { key: "month", label: "Tháng này", icon: "📊" },
  { key: "year", label: "Năm nay", icon: "🎯" },
  { key: "all", label: "Tất cả", icon: "🌐" },
];

const QUICK_PROMPTS: Record<AIPeriod, string[]> = {
  day: [
    "Hôm nay tôi đã tiêu hết bao nhiêu rồi?",
    "Hôm nay có khoản chi nào bất thường không?",
    "Hôm nay tôi còn được tiêu bao nhiêu để an toàn?",
  ],
  week: [
    "Tổng kết thu chi 7 ngày qua giúp tôi",
    "Tuần này khoản chi nào chiếm nhiều nhất?",
    "Tuần này tôi có đang tiêu lố ngân sách không?",
  ],
  month: [
    "Đánh giá sức khỏe tài chính tháng này",
    "Có hũ ngân sách nào của tôi sắp cạn không?",
    "Gợi ý cách cắt giảm 20% chi tiêu tháng này",
    "Tiến độ nuôi heo đất tháng này thế nào?",
  ],
  year: [
    "Tổng kết tình hình tích lũy từ đầu năm",
    "Tôi đã hoàn thành bao nhiêu % mục tiêu heo đất?",
    "Đánh giá chuỗi kỷ luật ghi chép của tôi",
  ],
  all: [
    "Tổng quan tài sản và tích lũy từ trước đến nay",
    "Lời khuyên quản lý tài chính cho tôi",
  ],
};

const AIAssistantScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();

  // Profile & Mascot
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const activeMascot =
    MASCOT_LIST.find((m) => m.key === profile?.mascot) || MASCOT_LIST[0];

  // State chọn khoảng thời gian (BẮT BUỘC CHỌN THÌ Ô NHẬP MỚI SÁNG)
  const [selectedPeriod, setSelectedPeriod] = useState<AIPeriod | null>(
    route.params?.initialPeriod || null,
  );

  // Chat input
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Danh sách tin nhắn trong phiên hiện tại
  interface DisplayMessage {
    id: string;
    sender: "user" | "assistant";
    text: string;
    periodLabel?: string;
    timestamp: number;
  }
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  // Lịch sử các đoạn chat (tối đa 15)
  const [historyList, setHistoryList] = useState<AIChatItem[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      const p = await storage.getUserProfile();
      setProfile(p);
      const h = await storage.getAIChatHistory();
      setHistoryList(h);
    };
    init();
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  // Xử lý gửi tin nhắn
  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputText).trim();
    if (!q) return;

    if (!selectedPeriod) {
      Alert.alert(
        "Chưa chọn thời gian",
        "Vui lòng chọn khoảng thời gian ở thanh phía trên trước khi hỏi Heo AI nhé!",
      );
      return;
    }

    // KIỂM TRA GIỚI HẠN TỐI ĐA 15 ĐOẠN CHAT
    if (historyList.length >= MAX_HISTORY_ITEMS) {
      Alert.alert(
        `Lịch sử đã đầy (${MAX_HISTORY_ITEMS}/${MAX_HISTORY_ITEMS})`,
        `Hệ thống chỉ lưu tối đa ${MAX_HISTORY_ITEMS} đoạn chat để tối ưu bộ nhớ. Bạn vui lòng mở Lịch sử và xóa bớt các đoạn chat cũ để tiếp tục trò chuyện nhé!`,
        [
          { text: "Để sau", style: "cancel" },
          {
            text: "Mở Lịch sử xóa bớt",
            onPress: () => setIsHistoryModalVisible(true),
          },
        ],
      );
      return;
    }

    // Đẩy tin nhắn của User lên giao diện
    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: q,
      periodLabel: PERIOD_LABELS[selectedPeriod],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const answer = await askGemini(
        q,
        selectedPeriod,
        activeMascot.name || "Heo Đất Béo",
        language,
        activeMascot.personality,
      );

      // Tin nhắn phản hồi của AI
      const aiMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: answer,
        periodLabel: PERIOD_LABELS[selectedPeriod],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Lưu đoạn chat này vào Lịch sử
      const chatItem: AIChatItem = {
        id: Date.now().toString(),
        period: selectedPeriod,
        periodLabel: PERIOD_LABELS[selectedPeriod],
        question: q,
        answer: answer,
        timestamp: Date.now(),
      };

      await storage.addAIChatItem(chatItem);
      const updatedHistory = await storage.getAIChatHistory();
      setHistoryList(updatedHistory);
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      const errorMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "Đã xảy ra lỗi. Vui lòng thử lại sau 🐷",
        periodLabel: PERIOD_LABELS[selectedPeriod],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa 1 đoạn chat trong lịch sử
  const handleDeleteHistoryItem = async (id: string) => {
    Alert.alert(
      "Xóa đoạn chat",
      "Bạn có chắc chắn muốn xóa đoạn chat này khỏi lịch sử?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await storage.deleteAIChatItem(id);
            const updated = await storage.getAIChatHistory();
            setHistoryList(updated);
          },
        },
      ],
    );
  };

  // Xóa toàn bộ lịch sử
  const handleClearAllHistory = () => {
    if (historyList.length === 0) return;
    Alert.alert(
      "Xóa toàn bộ lịch sử",
      "Bạn có chắc muốn xóa sạch toàn bộ các đoạn chat với AI?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: async () => {
            await storage.clearAIChatHistory();
            setHistoryList([]);
            Alert.alert("Thành công", "Đã dọn dẹp sạch lịch sử chat.");
          },
        },
      ],
    );
  };

  // Xem lại 1 đoạn chat từ lịch sử
  const handleSelectHistoryItem = (item: AIChatItem) => {
    setSelectedPeriod(item.period);
    setMessages([
      {
        id: item.id + "_q",
        sender: "user",
        text: item.question,
        periodLabel: item.periodLabel,
        timestamp: item.timestamp,
      },
      {
        id: item.id + "_a",
        sender: "assistant",
        text: item.answer,
        periodLabel: item.periodLabel,
        timestamp: item.timestamp,
      },
    ]);
    setIsHistoryModalVisible(false);
  };

  const isInputEnabled = !!selectedPeriod;
  const isSendActive =
    isInputEnabled && inputText.trim().length > 0 && !isLoading;

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft color="#1e293b" size={20} />
          </TouchableOpacity>

          <Image
            source={getMascotImage(profile?.mascot)}
            style={styles.mascotHeaderAvatar}
            resizeMode="contain"
          />

          <View style={styles.headerTitleGroup}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeMascot.name} AI
              </Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>Trợ lý</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              ● {activeMascot.personality || "Trực tuyến"}
            </Text>
          </View>
        </View>

        {/* Nút Lịch sử góc trên bên phải */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setIsHistoryModalVisible(true)}
          activeOpacity={0.8}
        >
          <History color="#7c3aed" size={20} />
          {historyList.length > 0 && (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>
                {historyList.length}/{MAX_HISTORY_ITEMS}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── CHỌN KHOẢNG THỜI GIAN CẦN HỎI AI ── */}
      <View style={styles.periodSection}>
        <View style={styles.periodSectionHeader}>
          <Text style={styles.periodSectionTitle}>
            1. Chọn thời gian phân tích:
          </Text>
          {!selectedPeriod ? (
            <Text style={styles.periodSectionHint}>* Bắt buộc chọn</Text>
          ) : (
            <Text style={{ fontSize: 11, color: "#7c3aed", fontWeight: "700" }}>
              Đã chọn: {PERIOD_LABELS[selectedPeriod]}
            </Text>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScroll}
        >
          {PERIOD_OPTIONS.map((item) => {
            const isSelected = selectedPeriod === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.periodChip,
                  isSelected && styles.periodChipActive,
                ]}
                onPress={() => setSelectedPeriod(item.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    isSelected && styles.periodChipTextActive,
                  ]}
                >
                  {item.icon} {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── KHU VỰC NỘI DUNG CHAT ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card khi chưa có tin nhắn */}
          {messages.length === 0 && (
            <View style={styles.welcomeCard}>
              <Image
                source={getMascotImage(profile?.mascot)}
                style={styles.welcomeMascotImg}
                resizeMode="contain"
              />
              <Text style={styles.welcomeTitle}>
                Chào bạn, mình là {activeMascot.name}! 🐷
              </Text>
              <Text style={styles.welcomeDesc}>
                Hãy chọn một khoảng thời gian ở trên và đặt bất kỳ câu hỏi nào.
                Mình sẽ đọc sổ thu chi và tính toán trả lời bạn ngay lập tức!
              </Text>

              {/* Gợi ý câu hỏi nhanh (Quick Prompts) */}
              {selectedPeriod && (
                <>
                  <Text style={styles.quickPromptLabel}>
                    💡 Gợi ý câu hỏi cho [{PERIOD_LABELS[selectedPeriod]}]:
                  </Text>
                  <View style={styles.quickPromptRow}>
                    {(QUICK_PROMPTS[selectedPeriod] || []).map(
                      (prompt, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.quickPromptChip}
                          onPress={() => handleSend(prompt)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickPromptText}>{prompt}</Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Danh sách tin nhắn */}
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                {!isUser && (
                  <Image
                    source={getMascotImage(profile?.mascot)}
                    style={styles.assistantAvatar}
                    resizeMode="contain"
                  />
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser
                      ? styles.messageBubbleUser
                      : styles.messageBubbleAssistant,
                  ]}
                >
                  {/* Tag thời gian phân tích */}
                  {msg.periodLabel && (
                    <View
                      style={[
                        styles.periodTag,
                        !isUser && styles.periodTagAssistant,
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodTagText,
                          !isUser && styles.periodTagTextAssistant,
                        ]}
                      >
                        ⏱️ {msg.periodLabel}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={
                      isUser
                        ? styles.messageTextUser
                        : styles.messageTextAssistant
                    }
                  >
                    {msg.text}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      isUser
                        ? styles.messageTimeUser
                        : styles.messageTimeAssistant,
                    ]}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={styles.loadingText}>
                {activeMascot.name} đang xem sổ sách và tính toán... 🐷
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── THANH NHẬP CÂU HỎI & NÚT GỬI (CHỈ CÓ ICON) ── */}
        <View style={styles.inputSection}>
          <View
            style={[
              styles.inputWrapper,
              isInputEnabled
                ? styles.inputWrapperActive
                : styles.inputWrapperDisabled,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isInputEnabled
                  ? `Hỏi ${activeMascot.name} về chi tiêu trong [${PERIOD_LABELS[selectedPeriod]}]...`
                  : "👆 Hãy chọn khoảng thời gian ở trên để bắt đầu..."
              }
              placeholderTextColor="#94a3b8"
              editable={isInputEnabled && !isLoading}
              multiline
              maxLength={300}
            />
          </View>

          {/* NÚT GỬI: CHỈ CÓ ICON GỬI, KHÔNG CÓ TEXT */}
          <TouchableOpacity
            style={[styles.sendBtn, !isSendActive && styles.sendBtnDisabled]}
            disabled={!isSendActive}
            onPress={() => handleSend()}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send color="#ffffff" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODAL LỊCH SỬ CHAT (TỐI ĐA 15 ĐOẠN CHAT) ── */}
      <Modal
        visible={isHistoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <History color="#7c3aed" size={20} />
                <Text style={styles.modalTitle}>Lịch sử đoạn chat</Text>
                <Text style={styles.modalLimitText}>
                  {historyList.length}/{MAX_HISTORY_ITEMS} đoạn
                </Text>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                {historyList.length > 0 && (
                  <TouchableOpacity onPress={handleClearAllHistory}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#ef4444",
                        fontWeight: "600",
                      }}
                    >
                      Xóa hết
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsHistoryModalVisible(false)}
                >
                  <X color="#64748b" size={22} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Danh sách lịch sử */}
            <ScrollView
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            >
              {historyList.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <AlertCircle color="#cbd5e1" size={48} />
                  <Text style={styles.emptyHistoryText}>
                    Chưa có đoạn chat nào được lưu
                  </Text>
                  <Text style={styles.emptyHistorySubText}>
                    Các câu hỏi và câu trả lời của bạn với Heo AI sẽ được tự
                    động lưu lại tại đây (tối đa {MAX_HISTORY_ITEMS} đoạn).
                  </Text>
                </View>
              ) : (
                historyList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => handleSelectHistoryItem(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.historyItemHeader}>
                      <View style={styles.historyPeriodBadge}>
                        <Text style={styles.historyPeriodText}>
                          ⏱️ {item.periodLabel}
                        </Text>
                      </View>
                      <Text style={styles.historyTimeText}>
                        {new Date(item.timestamp).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </Text>
                    </View>

                    <Text style={styles.historyQuestion} numberOfLines={2}>
                      ❓ {item.question}
                    </Text>
                    <Text style={styles.historyAnswer} numberOfLines={3}>
                      💬 {item.answer}
                    </Text>

                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        style={styles.deleteHistoryBtn}
                        onPress={() => handleDeleteHistoryItem(item.id)}
                      >
                        <Trash2 color="#ef4444" size={14} />
                        <Text style={styles.deleteHistoryText}>
                          Xóa đoạn này
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AIAssistantScreen;
