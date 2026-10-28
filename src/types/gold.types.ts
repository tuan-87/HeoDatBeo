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

