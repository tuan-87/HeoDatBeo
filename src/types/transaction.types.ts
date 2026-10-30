export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId?: string; // Khóa ngoại tham chiếu ID danh mục
  note?: string;            // Ghi chú thêm cho giao dịch
  timestamp: number;
}

// Index tháng/năm có giao dịch — dùng để hiển thị modal lọc nhanh mà không scan toàn bộ transactions
export interface TransactionDateIndex {
  months: string[];  // format "YYYY-MM", e.g. "2026-04"
  years: number[];   // e.g. [2025, 2026]
}

export interface PendingBankTransaction {
  id: string; // Hash định danh duy nhất (chống trùng lặp)
  bankName: string;
  accountNumber?: string;
  amount: number;
  type: 'expense' | 'income';
  note: string;
  balanceAfter?: number;
  refCode?: string;
  timestamp: number;
  rawText?: string;
  notificationKey?: string;
}

