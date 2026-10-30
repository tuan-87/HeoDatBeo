import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabParamList } from "./types";
import MoneyDiaryScreen from "../screens/MoneyDiaryScreen";
import StatisticsScreen from "../screens/StatisticsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import BudgetScreen from "../screens/BudgetScreen";
import FundScreen from "../screens/FundScreen";
import { useLanguage } from "../i18n/LanguageContext";
import {
  PieChart,
  Settings,
  Layers,
  Wallet,
} from "lucide-react-native";
import CustomTabBar from "../components/CustomTabBar";

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#cbd5e1",
      }}
    >
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarLabel: t("nav.spending"),
          tabBarIcon: ({ color, size }) => <Layers color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: t("nav.stats"),
          tabBarIcon: ({ color, size }) => (
            <PieChart color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={MoneyDiaryScreen}
        options={{
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Funds"
        component={FundScreen}
        options={{
          tabBarLabel: t("nav.funds"),
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t("nav.settings"),
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
