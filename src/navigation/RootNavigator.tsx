import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import SetupScreen from "../screens/SetupScreen";
import BottomTabNavigator from "./BottomTabNavigator";
import SavingScreen from "../screens/SavingScreen";
import SavingHistoryScreen from "../screens/SavingHistoryScreen";
import FundHistoryScreen from "../screens/FundHistoryScreen";
import GuideScreen from "../screens/GuideScreen";
import ProfileScreen from "../screens/ProfileScreen";
import BankQRScreen from "../screens/BankQRScreen";
import GoldHistoryScreen from "../screens/GoldHistoryScreen";
import DeletedCategoriesScreen from "../screens/DeletedCategoriesScreen";
import DeletedFundsScreen from "../screens/DeletedFundsScreen";
import YearlyReportScreen from "../screens/YearlyReportScreen";
import AIAssistantScreen from "../screens/AIAssistantScreen";
import { storage } from "../store/storage";
import { View, ActivityIndicator } from "react-native";
import { scheduleDailyReminder } from "../utils/notifications";
import { BankNotificationService } from "../services/bankNotification.service";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const profile = await storage.getUserProfile();
      setHasProfile(!!profile);
      setIsLoading(false);
      // Đăng ký nhắc nhở ghi giao dịch lúc 22h hàng ngày
      scheduleDailyReminder();
      // Quét và đồng bộ thông báo ngân hàng ngay khi khởi chạy app
      BankNotificationService.syncQueuedNotifications();
    };
    checkProfile();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#d946ef" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasProfile ? "MainApp" : "Setup"}
    >
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="MainApp" component={BottomTabNavigator} />
      <Stack.Screen name="Savings" component={SavingScreen} />
      <Stack.Screen name="SavingHistory" component={SavingHistoryScreen} />
      <Stack.Screen name="FundHistory" component={FundHistoryScreen} />
      <Stack.Screen name="Guide" component={GuideScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="BankQR" component={BankQRScreen} />
      <Stack.Screen name="GoldHistory" component={GoldHistoryScreen} />
      <Stack.Screen
        name="DeletedCategories"
        component={DeletedCategoriesScreen}
      />
      <Stack.Screen name="DeletedFunds" component={DeletedFundsScreen} />
      <Stack.Screen name="YearlyReport" component={YearlyReportScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
