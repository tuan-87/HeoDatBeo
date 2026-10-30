import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../store/storage';
import { AIPeriod, Transaction, UserProfile, CategoryBudget } from '../types';
import { formatCurrency } from '../utils/format';
import { resolveCategoryName } from '../utils/category';

export const PERIOD_LABELS: Record<AIPeriod, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  year: 'Năm nay',
  all: 'Toàn thời gian',
};

export async function getCurrentAppLanguage(): Promise<'vi' | 'en' | 'de'> {
  try {
    const lang = await AsyncStorage.getItem('@appLanguage');
    if (lang === 'en' || lang === 'de' || lang === 'vi') {
      return lang;
    }
  } catch (e) {
    console.warn('Failed to get app language for Gemini:', e);
  }
  return 'vi';
}

export async function getGeminiApiKey(): Promise<string> {
  const envKey =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  const userKey = await storage.getUserGeminiApiKey();
  if (userKey && userKey.trim().length > 0) {
    return userKey.trim();
  }
  return '';
}

export async function buildFinancialSummary(period: AIPeriod): Promise<{
  summaryText: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  streakCount: number;
  piggySavings: number;
  piggyTarget: number;
}> {
  const allTxs: Transaction[] = await storage.getTransactions();
  const profile = await storage.getUserProfile();
  const categoryBudgets = await storage.getCategoryBudgets();
  const goldItems = await storage.getGoldItems();

  const now = new Date();
  let startTimestamp = 0;
  let endTimestamp = now.getTime();

  if (period === 'day') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    startTimestamp = startOfDay.getTime();
  } else if (period === 'week') {
    // 7 ngày gần nhất
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startOfWeek.setHours(0, 0, 0, 0);
    startTimestamp = startOfWeek.getTime();
  } else if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    startTimestamp = startOfMonth.getTime();
  } else if (period === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    startTimestamp = startOfYear.getTime();
  } else {
    startTimestamp = 0;
  }

  // Lọc giao dịch trong kỳ (bỏ qua giao dịch chuyển quỹ hệ thống để tính đúng thu chi tiêu dùng)
  const periodTxs = allTxs.filter((tx) => {
    if (tx.timestamp < startTimestamp || tx.timestamp > endTimestamp) return false;
    if (
      tx.categoryId === 'system_tiet_kiem' ||
      tx.categoryId === 'system_rut_tiet_kiem' ||
      tx.categoryId === 'system_xoa_quy' ||
      tx.categoryId?.startsWith('fund_')
    ) {
      return false;
    }
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const expenseByCategory: Record<string, number> = {};

  periodTxs.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      const catName = resolveCategoryName(tx, profile, categoryBudgets);
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + tx.amount;
    }
  });

  const netAmount = totalIncome - totalExpense;

  // Sắp xếp top danh mục chi
  const sortedExpenses = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => {
      const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
      return `- ${cat}: ${formatCurrency(amt)} đ (${pct}%)`;
    })
    .join('\n');

  // Kiểm tra hũ ngân sách báo động
  const warningBudgets: string[] = [];
  categoryBudgets
    .filter((b) => b.deleteAt === null || b.deleteAt === undefined)
    .forEach((b) => {
      const spent = b.spent || 0;
      if (b.budget > 0) {
        const usage = (spent / b.budget) * 100;
        if (usage >= 100) {
          warningBudgets.push(`- Hũ '${b.name}': Đã vượt ngân sách (${Math.round(usage)}%)`);
        } else if (usage >= 85) {
          warningBudgets.push(`- Hũ '${b.name}': Sắp cạn định mức (${Math.round(usage)}%)`);
        }
      }
    });

  // Tiến độ heo đất
  const piggyTarget = profile?.savingTarget || 0;
  // Tính tổng đã tích lũy vào heo đất
  let piggySavings = 0;
  allTxs.forEach((tx) => {
    if (tx.categoryId === 'system_tiet_kiem') piggySavings += tx.amount;
    if (tx.categoryId === 'system_rut_tiet_kiem') piggySavings -= tx.amount;
  });
  if (piggySavings < 0) piggySavings = 0;
  const piggyPct = piggyTarget > 0 ? Math.round((piggySavings / piggyTarget) * 100) : 0;

  // Chuỗi streak
  const streakCount = profile?.streakCount || 0;

  // Tổng tài sản khả dụng (ví + heo + quỹ)
  let customFundsTotal = 0;
  (profile?.customFunds || []).forEach((f) => {
    if (f.deleteAt === null || f.deleteAt === undefined) customFundsTotal += f.balance || 0;
  });
  const totalBalance = (profile?.initialBalance || 0) + piggySavings + customFundsTotal;

  // Vàng
  const activeGoldCount = goldItems.filter((g) => g.status === 'Tích trữ').length;

  const summaryText = `
BỐI CẢNH TÀI CHÍNH KỲ: [${PERIOD_LABELS[period].toUpperCase()}]
- Tổng thu nhập: ${formatCurrency(totalIncome)} đ
- Tổng chi tiêu: ${formatCurrency(totalExpense)} đ
- Chênh lệch (Thu - Chi): ${netAmount >= 0 ? '+' : ''}${formatCurrency(netAmount)} đ (${netAmount >= 0 ? 'Thặng dư / Đang có lời' : 'Bội chi / Thâm hụt'})
${sortedExpenses ? `- Top danh mục chi nhiều nhất:\n${sortedExpenses}` : '- Chưa có khoản chi nào trong kỳ này.'}
${warningBudgets.length > 0 ? `- Cảnh báo hũ chi tiêu:\n${warningBudgets.join('\n')}` : '- Các hũ chi tiêu đều đang trong mức an toàn.'}
- Quỹ Tiết kiệm Heo Đất: Hiện có ${formatCurrency(piggySavings)} đ / Mục tiêu năm ${formatCurrency(piggyTarget)} đ (Đạt ${piggyPct}%)
- Chuỗi kỷ luật ghi chép liên tiếp: ${streakCount} ngày
- Tổng tài sản tích lũy hiện tại: ${formatCurrency(totalBalance)} đ
${activeGoldCount > 0 ? `- Đang tích trữ ${activeGoldCount} miếng/chỉ vàng trong sổ vàng.` : ''}
`.trim();

  return {
    summaryText,
    totalIncome,
    totalExpense,
    netAmount,
    streakCount,
    piggySavings,
    piggyTarget,
  };
}

export async function askGemini(
  question: string,
  period: AIPeriod,
  mascotName: string = 'Heo Đất Béo',
  preferredLanguage?: 'vi' | 'en' | 'de',
  mascotPersonality?: string
): Promise<string> {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    return 'NO_API_KEY';
  }

  const lang = preferredLanguage || (await getCurrentAppLanguage());
  const { summaryText } = await buildFinancialSummary(period);

  let langInstruction = '';
  let periodLabelForPrompt = PERIOD_LABELS[period];

  if (lang === 'en') {
    periodLabelForPrompt =
      period === 'day'
        ? 'Today'
        : period === 'week'
        ? 'This week'
        : period === 'month'
        ? 'This month'
        : period === 'year'
        ? 'This year'
        : 'All time';

    langInstruction = `
1. LANGUAGE REQUIREMENT (MANDATORY): The user is currently using the app in ENGLISH. You MUST answer entirely in ENGLISH.
   - Tone: Friendly, adorable, witty, yet sharp and disciplined about personal finance.
   - Persona: Refer to yourself as "${mascotName}" (or "Fat Piggy"), and address the user as "you".
   - Do NOT respond in Vietnamese unless the user explicitly asks to speak Vietnamese.
`.trim();
  } else if (lang === 'de') {
    periodLabelForPrompt =
      period === 'day'
        ? 'Heute'
        : period === 'week'
        ? 'Diese Woche'
        : period === 'month'
        ? 'Diesen Monat'
        : period === 'year'
        ? 'Dieses Jahr'
        : 'Gesamte Zeit';

    langInstruction = `
1. SPRACHANFORDERUNG (VERBINDLICH): Der Benutzer verwendet die App auf DEUTSCH. Du MUSST vollständig auf DEUTSCH antworten.
   - Tonfall: Herzlich, humorvoll, nahbar, aber diszipliniert und klug bei Finanzentscheidungen.
   - Persona: Nenne dich selbst "${mascotName}" (oder "Sparschweinchen") und sprich den Benutzer mit "du" an.
   - Antworte keinesfalls auf Vietnamesisch, es sei denn, der Benutzer bittet ausdrücklich darum.
`.trim();
  } else {
    langInstruction = `
1. QUY TẮC NGÔN NGỮ (BẮT BUỘC): Khách hàng đang sử dụng ứng dụng bằng TIẾNG VIỆT. Phải trả lời hoàn toàn bằng TIẾNG VIỆT.
   - Giọng điệu: Dễ thương, gần gũi, hài hước nhưng sắc sảo và giữ kỷ luật thép về tài chính.
   - Xưng hô: Xưng là "Heo Đất" (hoặc "${mascotName}"), gọi người dùng là "bạn".
`.trim();
  }

  const systemInstruction = `
Bạn là ${mascotName} - chú linh vật tài chính thông minh của ứng dụng Heo Đất Béo.
${mascotPersonality ? `TÍNH CÁCH ĐẶC TRƯNG CỦA BẠN: "${mascotPersonality}". Bạn hãy nhập vai hoàn toàn và thể hiện rõ nét cá tính, giọng điệu đặc trưng này trong từng câu trả lời và lời khuyên tài chính!` : 'Bạn vừa hài hước vừa giữ kỷ luật thép của ứng dụng Heo Đất Béo.'}
Bạn được người dùng tin tưởng nhờ giải đáp thắc mắc và phân tích chi tiêu dựa trên số liệu thực tế được ghi nhận trong ứng dụng.

${summaryText}

QUY TẮC BẮT BUỘC:
${langInstruction}
2. Sử dụng số liệu thực tế trong bản tóm tắt ở trên để trả lời chính xác câu hỏi của người dùng.
3. Nếu người dùng chi tiêu quá đà hoặc các hũ sắp hết tiền, hãy nhắc nhở chân thành và khuyên họ thắt chặt chi tiêu.
4. Nếu người dùng làm tốt, giữ chuỗi streak cao hoặc tiết kiệm đều đặn, hãy khen ngợi và động viên họ tiếp tục.
5. Định dạng câu trả lời gọn gàng, súc tích (khoảng 3 - 5 gạch đầu dòng ngắn hoặc đoạn văn ngắn), dùng các emoji vui vẻ (🐷, 💰, 💡, 🔥, ✨), tránh dài dòng lan man.
`.trim();

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemInstruction}\n\nQuestion [${periodLabelForPrompt}]: "${question.trim()}"`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  };

  // Danh sách model thử nghiệm theo thứ tự ưu tiên (Free tier Google AI Studio)
  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
  ];

  let lastError = '';

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
      } else {
        const errText = await response.text();
        console.warn(`Gemini model ${model} failed with status ${response.status}:`, errText);
        lastError = `HTTP ${response.status}: ${errText}`;
        if (response.status === 503 || response.status === 429 || errText.includes('high demand') || errText.includes('UNAVAILABLE')) {
          throw new Error('OVERLOADED');
        }
      }
    } catch (e: any) {
      if (e?.message === 'OVERLOADED') throw e;
      console.warn(`Error calling model ${model}:`, e);
      lastError = e?.message || 'Network error';
    }
  }

  throw new Error(lastError || 'Không thể kết nối đến máy chủ Gemini AI.');
}


export interface VoiceParsedTransaction {
  type: 'expense' | 'income';
  amount: number;
  categoryId?: string | null;
  categoryName?: string;
  note?: string;
  daysAgo?: number;
}

export async function parseTransactionsFromVoice(
  base64Audio: string,
  mimeType: string,
  categories: { id: string; name: string; type?: 'income' | 'expense' }[]
): Promise<VoiceParsedTransaction[]> {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const expenseCats = categories
    .filter((c) => c.type !== 'income')
    .map((c) => `- ID: "${c.id}", Tên: "${c.name}"`)
    .join('\n');

  const incomeCats = categories
    .filter((c) => c.type === 'income')
    .map((c) => `- ID: "${c.id}", Tên: "${c.name}"`)
    .join('\n');

  const systemInstruction = `
Bạn là trợ lý tài chính thông minh của ứng dụng Heo Đất Béo.
Nhiệm vụ của bạn: Hãy lắng nghe đoạn ghi âm giọng nói của người dùng tiếng Việt và bóc tách thành danh sách các giao dịch thu chi tài chính.

DANH MỤC CHI TIÊU HIỆN CÓ CỦA NGƯỜI DÙNG:
${expenseCats || '(Chưa có danh mục cụ thể)'}

DANH MỤC THU NHẬP HIỆN CÓ CỦA NGƯỜI DÙNG:
${incomeCats || '(Chưa có danh mục cụ thể)'}

QUY TẮC BÓC TÁCH BẮT BUỘC:
1. Xác định số tiền (amount) thành số nguyên (VND):
   - "k", "nghìn", "ngàn", "cành" = nhân 1.000 (Ví dụ: "45 cành" -> 45000, "50k" -> 50000).
   - "xị", "lít" = nhân 100.000 (Ví dụ: "2 xị" -> 200000, "nửa lít" -> 50000).
   - "củ", "triệu", "chai" = nhân 1.000.000 (Ví dụ: "1 củ" -> 1000000, "nửa củ" -> 500000).
2. Xác định loại giao dịch (type): "expense" (chi tiêu) hoặc "income" (thu tiền). Mặc định là "expense" trừ khi nói về nhận tiền, lương, thưởng, bán hàng, được cho, trúng số...
3. Khớp danh mục (categoryId, categoryName): Chọn danh mục phù hợp nhất từ danh sách trên. Nếu khớp, điền chính xác categoryId và categoryName. Nếu không khớp danh mục nào, để categoryId = null và đặt categoryName ngắn gọn (ví dụ "Khác" hoặc tên phù hợp).
4. Ghi chú (note): Tóm tắt ngắn gọn nội dung chi/thu (ví dụ: "Ăn bún bò", "Đổ xăng", "Mua sắm quần áo", "Uống cà phê").
5. Thời gian (daysAgo):
   - "hôm qua", "tối qua" -> daysAgo: 1
   - "hôm kia" -> daysAgo: 2
   - Mặc định là 0 (hôm nay).
6. Nếu người dùng nói nhiều khoản trong một câu (ví dụ: "Ăn phở 40k và uống trà đá 10k"), hãy tách thành từng giao dịch riêng biệt trong mảng kết quả.
7. Nếu trong audio KHÔNG có giọng nói hoặc KHÔNG có giao dịch tài chính nào (chỉ là tiếng thở, tiếng ồn, hoặc câu hỏi chung), hãy trả về mảng rỗng: []

ĐỊNH DẠNG KẾT QUẢ:
Chỉ trả về DUY NHẤT một JSON array chuẩn cú pháp, KHÔNG kèm giải thích, KHÔNG bọc trong markdown:
[
  {
    "type": "expense",
    "amount": 45000,
    "categoryId": "...",
    "categoryName": "Ăn uống",
    "note": "Ăn bún bò",
    "daysAgo": 0
  }
]
  `.trim();

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: systemInstruction,
          },
          {
            inlineData: {
              mimeType: mimeType || 'audio/mp4',
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
  ];

  let lastError = '';

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          if (parsed && typeof parsed === 'object' && parsed.amount) {
            return [parsed];
          }
          return [];
        }
      } else {
        const errText = await response.text();
        console.warn(`Voice parse model ${model} failed with status ${response.status}:`, errText);
        lastError = `HTTP ${response.status}: ${errText}`;
        if (response.status === 503 || response.status === 429 || errText.includes('high demand') || errText.includes('UNAVAILABLE') || errText.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('OVERLOADED');
        }
      }
    } catch (e: any) {
      if (e?.message === 'OVERLOADED') throw e;
      console.warn(`Voice parse call failed for ${model}:`, e);
      lastError = e?.message || 'Network error';
    }
  }

  throw new Error(lastError || 'Không thể kết nối đến máy chủ AI để xử lý giọng nói.');
}
