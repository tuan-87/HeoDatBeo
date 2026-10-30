import { PendingBankTransaction } from '../types';

export interface RawNotificationPayload {
  packageName: string;
  title: string;
  content: string;
  postTime: number;
  notificationKey?: string;
}

export const BANK_PACKAGE_INFO: Record<string, { name: string; shortName: string; color: string }> = {
  'com.VCB': { name: 'Vietcombank', shortName: 'VCB', color: '#006633' },
  'com.tcb': { name: 'Techcombank', shortName: 'TCB', color: '#e31837' },
  'vn.com.techcombank.bb.app': { name: 'Techcombank', shortName: 'TCB', color: '#e31837' },
  'com.techcombank.mobile': { name: 'Techcombank', shortName: 'TCB', color: '#e31837' },
  'vn.com.techcombank.business': { name: 'Techcombank', shortName: 'TCB', color: '#e31837' },
  'com.mbmobile': { name: 'MB Bank', shortName: 'MB', color: '#1c429c' },
  'com.tpb.mb.gprsandroid': { name: 'TPBank', shortName: 'TPB', color: '#79298e' },
  'com.vietinbank.ipay': { name: 'VietinBank', shortName: 'CTG', color: '#0054a6' },
  'mobile.acb.com.vn': { name: 'ACB', shortName: 'ACB', color: '#0072bc' },
  'com.vnpay.vpbankonline': { name: 'VPBank', shortName: 'VPB', color: '#00a859' },
  'com.cake.mobile': { name: 'Cake by VPBank', shortName: 'CAKE', color: '#ff4d88' },
  'com.vnpay.bidv': { name: 'BIDV', shortName: 'BIDV', color: '#004f9e' },
  'com.mservice.momotransfer': { name: 'MoMo', shortName: 'MOMO', color: '#a50064' },
  'vn.com.vng.zalopay': { name: 'ZaloPay', shortName: 'ZLP', color: '#008fe5' },
  'com.zing.zalo': { name: 'ZaloPay', shortName: 'ZLP', color: '#008fe5' },
  'com.shb.mobile': { name: 'SHB', shortName: 'SHB', color: '#f26522' },
  'com.seabank.mb': { name: 'SeABank', shortName: 'SEA', color: '#ed1c24' },
  'vn.com.scb.mb': { name: 'SCB', shortName: 'SCB', color: '#00529c' },
  'com.vnpay.hdbank': { name: 'HDBank', shortName: 'HDB', color: '#ea1d24' },
  'com.ocb.omni.app': { name: 'OCB', shortName: 'OCB', color: '#008744' },
  'vn.lienvietpostbank.mobile': { name: 'LPBank', shortName: 'LPB', color: '#f15a24' },
  'com.vnpay.msbbanking': { name: 'MSB', shortName: 'MSB', color: '#e4002b' },
  'com.vibe.tnex': { name: 'TNEX', shortName: 'TNEX', color: '#0066ff' },
  'vn.vib.mobile': { name: 'MyVIB', shortName: 'VIB', color: '#004a99' },
  'vn.viettel.viettelpay': { name: 'Viettel Money', shortName: 'VTM', color: '#ee0033' },
};

/**
 * Xóa dấu, ký tự thừa và chuẩn hóa số tiền
 */
function parseAmount(numStr: string): number {
  if (!numStr) return 0;
  // Bỏ dấu phân cách hàng nghìn (chấm, phẩy) và khoảng trắng
  const cleaned = numStr.replace(/[,.\sđVNDvnd]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Sinh mã hash định danh duy nhất chống trùng lặp:
 * 1. Nếu có refCode (Mã GD / Mã tham chiếu): dùng refCode.
 * 2. Nếu có balanceAfter (Số dư sau GD): dùng [bank]_[account]_[amount]_[type]_[balanceAfter].
 * 3. Fallback: dùng [bank]_[amount]_[type]_[note]_[khối 2 giây].
 */
export function generateTransactionHash(data: {
  bankName: string;
  accountNumber?: string;
  amount: number;
  type: 'expense' | 'income';
  balanceAfter?: number;
  refCode?: string;
  note: string;
  postTime: number;
}): string {
  if (data.refCode && data.refCode.trim().length > 3) {
    return `${data.bankName}_${data.refCode.trim().toUpperCase()}`;
  }

  if (data.balanceAfter !== undefined && data.balanceAfter > 0) {
    return `${data.bankName}_${data.accountNumber || 'acc'}_${data.type}_${data.amount}_${data.balanceAfter}`;
  }

  const cleanNote = data.note
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  const timeBlock2Seconds = Math.floor(data.postTime / 2000);
  return `${data.bankName}_${data.amount}_${data.type}_${cleanNote}_${timeBlock2Seconds}`;
}

/**
 * Trích xuất nội dung biến động số dư ngân hàng
 */
export function parseBankNotification(payload: RawNotificationPayload): PendingBankTransaction | null {
  const { packageName, title, content, postTime } = payload;
  const fullText = `${title || ''} ${content || ''}`.trim();
  if (!fullText) return null;

  // Lọc thông báo OTP thuần túy (không chứa số tiền biến động) hoặc cảnh báo bảo mật/đăng nhập
  const lower = fullText.toLowerCase();
  const hasOtpKeyword = lower.includes('ma otp') || lower.includes('mã otp') || lower.includes('otp:');
  const hasBalanceKeywords =
    lower.includes('so du') ||
    lower.includes('số dư') ||
    lower.includes('bien dong') ||
    lower.includes('biến động') ||
    lower.includes('+') ||
    lower.includes('-');
  if (hasOtpKeyword && !hasBalanceKeywords) {
    return null;
  }

  const isSecurityAlert =
    lower.includes('đăng nhập trên thiết bị mới') ||
    lower.includes('dang nhap tren thiet bi moi') ||
    lower.includes('cảnh báo đăng nhập') ||
    lower.includes('canh bao dang nhap') ||
    lower.includes('khóa thẻ thành công') ||
    lower.includes('khoa the thanh cong');

  if (isSecurityAlert) {
    return null;
  }

  const bankInfo = BANK_PACKAGE_INFO[packageName] || {
    name: 'Ngân hàng',
    shortName: 'BANK',
    color: '#3b82f6',
  };

  let type: 'expense' | 'income' = 'expense';
  let amount = 0;
  let balanceAfter: number | undefined;
  let accountNumber: string | undefined;
  let refCode: string | undefined;
  let note = '';

  const CURRENCY_PATTERN = '(?:VND|đ|VNĐ|đồng|dong|d\\b)';
  const CURRENCY_BEFORE = '(?:VND|đ|VNĐ|đồng|dong)';
  const NUMBER_PATTERN = '([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)';

  // 1. Trích xuất Mã GD / Ref Code (nếu có)
  const refMatch = fullText.match(/(?:Ref|Mã GD|Trace|F\/T|FT|GD)[\s:]*([A-Za-z0-9]{6,25})/i);
  if (refMatch) {
    refCode = refMatch[1].trim();
  }

  // 2. Trích xuất Số tài khoản (nếu có: TK 0123... hoặc TK ...1234)
  const accMatch = fullText.match(/(?:TK|Tai khoan|Tài khoản)[\s:*_]*([0-9xX*]{3,16})/i);
  if (accMatch) {
    accountNumber = accMatch[1].slice(-4); // Lấy 4 số cuối
  }

  // 3. Trích xuất Số dư cuối (Số dư: VND 1,950,000 hoặc Số dư: 1,950,000 VND hoặc SD: 1.950.000đ)
  const balMatch = fullText.match(new RegExp(`(?:Số dư|So du|SD)[\\s:]*(?:${CURRENCY_BEFORE})?\\s*${NUMBER_PATTERN}\\s*(?:${CURRENCY_PATTERN})?`, 'i'));
  if (balMatch) {
    balanceAfter = parseAmount(balMatch[1]);
  }

  // 4. Trích xuất Loại GD & Số tiền
  // Case A1: Techcombank dạng: + VND 15,000 hoặc - VND 50,000
  const explicitCurrencyFirst = fullText.match(new RegExp(`([+-])\\s*${CURRENCY_BEFORE}\\s*${NUMBER_PATTERN}`, 'i'));

  // Case A2: Vietcombank / MB / ACB dạng: + 15,000 VND hoặc - 50.000đ
  const explicitWithUnit = !explicitCurrencyFirst ? fullText.match(new RegExp(`([+-])\\s*${NUMBER_PATTERN}\\s*${CURRENCY_PATTERN}`, 'i')) : null;

  // Case A3: Dạng có dấu +/- nhưng không có đơn vị tiền liền kề: + 15,000 hoặc - 50.000
  const explicitWithoutUnit = (!explicitCurrencyFirst && !explicitWithUnit) ? fullText.match(/([+-])\s*([0-9]{1,3}(?:[.,][0-9]{3})+)/i) : null;

  const explicitSignMatch = explicitCurrencyFirst || explicitWithUnit || explicitWithoutUnit;

  if (explicitSignMatch && parseAmount(explicitSignMatch[2]) > 0) {
    type = explicitSignMatch[1] === '+' ? 'income' : 'expense';
    amount = parseAmount(explicitSignMatch[2]);
  } else {
    // Case B: Ví MoMo / ZaloPay hoặc thông báo có chữ "Thanh toán", "Nhận tiền"
    const isIncome =
      lower.includes('nhan duoc') ||
      lower.includes('nhận được') ||
      lower.includes('nhận tiền') ||
      lower.includes('cong tien') ||
      lower.includes('cộng tiền') ||
      lower.includes('hoàn tiền');

    type = isIncome ? 'income' : 'expense';

    // Case B1: Đơn vị tiền trước số tiền: VND 45,000
    const amtCurrFirst = fullText.match(new RegExp(`(?:GD|thanh toán|chuyển|nhận|tiền|thành công|biến động|trừ|cộng)?[\\s:]*${CURRENCY_BEFORE}\\s*${NUMBER_PATTERN}`, 'i'));
    // Case B2: Số tiền trước đơn vị tiền: 45,000 VND
    const amtCurrLast = !amtCurrFirst ? fullText.match(new RegExp(`(?:GD|thanh toán|chuyển|nhận|tiền|thành công|biến động|trừ|cộng)?[\\s:]*${NUMBER_PATTERN}\\s*${CURRENCY_PATTERN}`, 'i')) : null;

    const amtMatch = amtCurrFirst || amtCurrLast;
    if (amtMatch) {
      amount = parseAmount(amtMatch[1]);
    }
  }

  if (amount <= 0) {
    return null; // Không bóc tách được số tiền hợp lệ
  }

  // 5. Trích xuất Nội dung / Ghi chú (ND: ... hoặc Lời nhắn: ...)
  const noteMatch = fullText.match(/(?:ND|Noi dung|Nội dung|Lời nhắn|cho|tại|từ)[\s:]*([^\n.;]{3,80})/i);
  if (noteMatch) {
    note = noteMatch[1].trim();
  } else if (title && title !== bankInfo.name) {
    note = title.trim();
  } else {
    note = type === 'expense' ? `Chi tiêu ${bankInfo.shortName}` : `Thu tiền ${bankInfo.shortName}`;
  }

  // 6. Tạo hash chống trùng lặp
  const hashId = generateTransactionHash({
    bankName: bankInfo.shortName,
    accountNumber,
    amount,
    type,
    balanceAfter,
    refCode,
    note,
    postTime,
  });

  return {
    id: hashId,
    bankName: bankInfo.name,
    accountNumber,
    amount,
    type,
    note,
    balanceAfter,
    refCode,
    timestamp: postTime || Date.now(),
    rawText: fullText,
    notificationKey: payload.notificationKey,
  };
}

