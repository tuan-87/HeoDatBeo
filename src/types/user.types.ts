import { IncomeCategory, CategoryBudget, CustomFund } from './budget.types';

export interface SavingHistoryItem {
  year: number;
  target: number;
  achieved: number;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  initialBalance: number;
  initialBalanceTimestamp: number;
  savingTarget?: number;
  savingTargetTimestamp?: number;
  savingYear?: number; // Năm của mục tiêu hiện tại (YC Mới)
  savingHistory?: SavingHistoryItem[]; // Lịch sử tiết kiệm các năm trước
  incomeCategories?: IncomeCategory[];
  incomeCategoryIcons?: Record<string, string>; // Mapping tên danh mục thu -> tên icon (YC Mới)
  categoryBudgets?: CategoryBudget[]; // Danh mục chi kèm ngân sách
  customFunds?: CustomFund[]; // Quỹ tùy biến của người dùng
  spendingFundIcon?: string; // Icon cho Quỹ Tiêu Sài (Spending)
  savingFundIcon?: string; // Icon cho Quỹ Tiết Kiệm (Saving)
  hasSeenGuide?: boolean;
  inputMethod?: 'keypad' | 'manual';
  avatar?: string;
  nickname?: string;
  bio?: string;
  job?: string;
  education?: string;
  hobby?: string;
  birthday?: string;
  gender?: string;
  joinDate?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  instagram?: string;
  thread?: string;
  streakCount?: number;           // Số ngày giữ chuỗi hiện tại
  lastStreakTimestamp?: number;   // Timestamp ms của lần gần nhất được ghi nhận giữ chuỗi
  streakRecoveriesCount?: number;     // Số lần khôi phục chuỗi trong tháng hiện tại
  lastRecoveryMonthYear?: string;     // Tháng/Năm khôi phục gần nhất (dạng "MM/YYYY")
  avatarHistory?: string[];           // Lịch sử đường dẫn ảnh đại diện đã dùng (tối đa 10 ảnh)
  mascot?: string;                    // Linh vật hiện tại được chọn (YC Mới)
  mascotLastChanged?: number;         // Timestamp ms lần cuối đổi linh vật
}

