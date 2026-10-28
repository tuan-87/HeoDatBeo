export interface IncomeCategory {
  id: string;
  name: string;
  icon?: string;
  deleteAt?: number | null;
}

export interface CategoryBudget {
  id?: string;       // ID danh mục chi
  name: string;      // Tên danh mục chi
  budget: number;    // Số tiền còn lại trong "túi" danh mục
  spent?: number;    // Số tiền đã tiêu (được cache để tối ưu hiệu suất)
  type?: 'recharge' | 'direct';   // Loại danh mục: nạp tiền để chi hoặc không cần nạp
  icon?: string;     // Key biểu tượng từ assets/expense_icon
  deleteAt?: number | null;
}

export interface CustomFund {
  id: string;
  name: string;
  balance: number;
  icon?: string;
  deleteAt?: number | null;
}

