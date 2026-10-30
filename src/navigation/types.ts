import { NavigatorScreenParams } from '@react-navigation/native';

export type BottomTabParamList = {
  Home: undefined;
  Budget: undefined;
  Funds: undefined;
  Statistics: { openHistory?: boolean } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Setup: undefined;
  MainApp: NavigatorScreenParams<BottomTabParamList>;
  Savings: undefined;
  SavingHistory: undefined;
  FundHistory: undefined;
  Guide: undefined;
  BarChart: { selectedMonth: string | null };
  Profile: undefined;
  BankQR: undefined;
  GoldHistory: undefined;
  DeletedCategories: undefined;
  DeletedFunds: undefined;
  YearlyReport: undefined;
  AIAssistant: { initialPeriod?: 'day' | 'week' | 'month' | 'year' | 'all' } | undefined;
};
