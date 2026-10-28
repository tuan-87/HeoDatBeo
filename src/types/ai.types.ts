export type AIPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export interface AIChatItem {
  id: string;
  period: AIPeriod;
  periodLabel: string;
  question: string;
  answer: string;
  timestamp: number;
}

