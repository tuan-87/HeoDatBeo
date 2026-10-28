export interface NotificationHistoryItem {
  id: string;
  dateStr: string;      // The date reported (e.g. "18/05/2026")
  triggerTime: number;  // Timestamp of the 2:00 AM trigger time (e.g. 19/05/2026 02:00:00)
  title: string;
  body: string;
  type?: 'day' | 'month' | 'year';
}

