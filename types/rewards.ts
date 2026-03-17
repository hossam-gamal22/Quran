// types/rewards.ts
// أنواع نظام المكافآت الشهرية

export type ActivityType = 'app_open' | 'azkar' | 'quran' | 'prayer' | 'tasbih' | 'khatma';

export interface ScoreWeights {
  app_open: number;
  azkar: number;
  quran: number;
  prayer: number;
  tasbih: number;
  khatma: number;
}

export interface Winner {
  userId: string;
  displayName?: string;
  score: number;
  rewardedAt: string;
  notified: boolean;
  premiumExpiresAt: string;
}

export interface RewardHistoryEntry {
  month: string; // YYYY-MM
  winners: Winner[];
  selectedAt: string;
  selectedBy: 'auto' | 'admin';
}

export interface RewardsConfig {
  enabled: boolean;
  winnersCount: number;
  rewardDurationDays: number;
  autoSelect: boolean;
  autoNotify: boolean;
  scoreWeights: ScoreWeights;
  currentMonth: string; // YYYY-MM
  currentWinners: Winner[];
  history: RewardHistoryEntry[];
}

export interface MonthlyEngagement {
  month: string; // YYYY-MM
  score: number;
}
