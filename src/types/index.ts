export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId?: string; // Khóa ngoại tham chiếu ID danh mục
  note?: string;            // Ghi chú thêm cho giao dịch
  timestamp: number;
}

export interface IncomeCategory {
  id: string;
  name: string;
  icon?: string;
  deleteAt?: number | null;
}

// Có thể xóa estimatedEndDate và estimatedEndDateSetAt
export interface CategoryBudget {
  id?: string;       // ID danh mục chi
  name: string;      // Tên danh mục chi
  budget: number;    // Số tiền còn lại trong "túi" danh mục
  spent?: number;    // Số tiền đã tiêu (được cache để tối ưu hiệu suất)
  type?: 'recharge' | 'direct';   // Loại danh mục: nạp tiền để chi hoặc không cần nạp
  icon?: string;     // Key biểu tượng từ assets/expense_icon
  deleteAt?: number | null;
}

// Index tháng/năm có giao dịch — dùng để hiển thị modal lọc nhanh mà không scan toàn bộ transactions
export interface TransactionDateIndex {
  months: string[];  // format "YYYY-MM", e.g. "2026-04"
  years: number[];   // e.g. [2025, 2026]
}

export interface SavingHistoryItem {
  year: number;
  target: number;
  achieved: number;
  timestamp: number;
}

export interface CustomFund {
  id: string;
  name: string;
  balance: number;
  icon?: string;
  deleteAt?: number | null;
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

export interface NotificationHistoryItem {
  id: string;
  dateStr: string;      // The date reported (e.g. "18/05/2026")
  triggerTime: number;  // Timestamp of the 2:00 AM trigger time (e.g. 19/05/2026 02:00:00)
  title: string;
  body: string;
  type?: 'day' | 'month' | 'year';
}

export interface GoldItem {
  id: string;
  rawQuantity: number;
  rawUnit: 'phân' | 'chỉ' | 'cây';
  quantityInPhan: number; // 1 chỉ = 10 phân, 1 cây = 100 phân
  buyDate: number; // Timestamp
  buyPrice: number; // Lượng tiền mua
  status: 'Tích trữ' | 'Đã bán' | 'Đã quy đổi';
  craftFee: number; // Phí gia công, mặc định là 0
  isExchanged: boolean; // true nếu miếng này được đổi từ miếng khác, false nếu mua từ đầu
  exchangedFromIds?: string[]; // IDs các miếng vàng dùng để đổi ra miếng này
  exchangeFee?: number; // Phí đổi vàng / số tiền cần bù khi đổi (nếu có)
  goldType?: string; // Loại vàng (VD: Nhẫn tròn trơn, SJC 9999, PNJ)
  oneChiPrice?: number; // Giá trị của một chỉ vàng lúc mua
}

export interface SoldItemSnapshot {
  id: string;
  buyDate: number; // Ngày mua
  quantityInPhan: number; // Số lượng (phân)
  rawQuantity: number;
  rawUnit: 'phân' | 'chỉ' | 'cây';
  goldType?: string; // Loại vàng
  craftFee: number; // Phí gia công
  exchangeFee?: number; // Phí đổi
  buyPrice?: number; // Giá mua vào
  oneChiPrice?: number; // Giá một chỉ lúc mua
  oneChiSellPrice?: number; // Giá một chỉ lúc bán
}

export interface GoldSaleRecord {
  id: string;
  sellDate: number; // Timestamp
  sellPrice: number; // Giá bán ra
  buyPrice: number; // Tổng giá mua vào (bao gồm phí gia công, phí đổi nếu có)
  difference: number; // Giá bán ra - Giá mua vào
  status: 'Lời' | 'Lỗ';
  soldItemIds: string[]; // Danh sách IDs các miếng vàng đã bán
  soldItems?: SoldItemSnapshot[]; // Chi tiết các miếng vàng đã bán tại thời điểm bán
}

export type AIPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface AIChatItem {
  id: string;
  period: AIPeriod;
  periodLabel: string;
  question: string;
  answer: string;
  timestamp: number;
}

