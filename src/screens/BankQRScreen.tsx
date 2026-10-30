import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StatusBar,
  BackHandler,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeft,
  X,
  Maximize2,
  Sun,
  QrCode,
  Landmark,
  Wallet,
} from "lucide-react-native";
import { BrightnessService } from "../services/brightness.service";
import { styles } from "../styles/BankQRScreen";

interface BankQRItem {
  id: string;
  name: string;
  shortName: string;
  subTitle: string;
  brandColor: string;
  bgLight: string;
  imageSource: any;
  logoSource: any;
}

const BANK_QR_LIST: BankQRItem[] = [
  {
    id: "vietcombank",
    name: "Vietcombank",
    shortName: "VCB",
    subTitle: "Ngân hàng TMCP Ngoại thương Việt Nam",
    brandColor: "#005934",
    bgLight: "#ecfdf5",
    imageSource: require("../../assets/qr_bank/vietcombank_qr.jpg"),
    logoSource: require("../../assets/logo_bank/vietcombank.png"),
  },
  {
    id: "techcombank",
    name: "Techcombank",
    shortName: "TCB",
    subTitle: "Ngân hàng TMCP Kỹ thương Việt Nam",
    brandColor: "#e11b22",
    bgLight: "#fef2f2",
    imageSource: require("../../assets/qr_bank/techcombank_qr.jpg"),
    logoSource: require("../../assets/logo_bank/techcombank.png"),
  },
  {
    id: "momo",
    name: "Ví MoMo",
    shortName: "MoMo",
    subTitle: "Ví điện tử MoMo",
    brandColor: "#a50064",
    bgLight: "#fdf2f8",
    imageSource: require("../../assets/qr_bank/momo_qr.jpg"),
    logoSource: require("../../assets/logo_bank/momo.png"),
  },
];

export const BankQRScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedBank, setSelectedBank] = useState<BankQRItem | null>(null);

  // Xử lý mở QR và tăng độ sáng màn hình
  const handleOpenQR = (bank: BankQRItem) => {
    setSelectedBank(bank);
    BrightnessService.setMaxBrightness();
  };

  // Đóng QR và trả lại độ sáng bình thường
  const handleCloseQR = useCallback(() => {
    BrightnessService.resetBrightness();
    setSelectedBank(null);
  }, []);

  // Xử lý nút Back của Android khi đang mở ảnh QR
  useEffect(() => {
    const onBackPress = () => {
      if (selectedBank) {
        handleCloseQR();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [selectedBank, handleCloseQR]);

  // Đảm bảo reset độ sáng khi rời màn hình hoặc blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        BrightnessService.resetBrightness();
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mã QR Ngân hàng</Text>
          <Text style={styles.headerSubtitle}>
            Chọn ngân hàng để nhận chuyển khoản nhanh chóng
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Danh sách 3 Ngân hàng theo đúng thứ tự: Vietcombank, Techcombank, Momo */}
        {BANK_QR_LIST.map((bank) => (
          <TouchableOpacity
            key={bank.id}
            style={[styles.bankCard, { borderColor: bank.brandColor + "25" }]}
            activeOpacity={0.85}
            onPress={() => handleOpenQR(bank)}
          >
            <View style={styles.bankBadge}>
              <View
                style={[
                  styles.bankIconBubble,
                  { backgroundColor: bank.bgLight },
                ]}
              >
                <Image
                  source={bank.logoSource}
                  style={styles.bankLogoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.bankName}>{bank.name}</Text>
                <Text style={styles.bankSubName}>{bank.subTitle}</Text>
              </View>
            </View>

            <View style={styles.expandTag}>
              <Maximize2 size={16} color="#475569" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal Phóng to QR toàn màn hình & Tăng sáng (Không viền, không nền card, ảnh phủ trọn màn hình) */}
      <Modal
        visible={selectedBank !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseQR}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.fullscreenContainer}
          activeOpacity={1}
          onPress={handleCloseQR}
        >
          <StatusBar hidden={selectedBank !== null} />
          {selectedBank && (
            <Image
              source={selectedBank.imageSource}
              style={styles.fullscreenFullImage}
              resizeMode="contain"
            />
          )}

          {/* Nút đóng nổi ở góc trên bên phải */}
          <TouchableOpacity
            style={styles.floatingCloseBtn}
            onPress={handleCloseQR}
            activeOpacity={0.8}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default BankQRScreen;
