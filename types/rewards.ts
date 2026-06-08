// types/rewards.ts
// أنواع نظام المكافآت الشهرية

export type ActivityType = 'app_open' | 'azkar' | 'quran' | 'prayer' | 'tasbih' | 'khatma' | 'fasting';

export interface ScoreWeights {
  app_open: number;
  azkar: number;
  quran: number;
  prayer: number;
  tasbih: number;
  khatma: number;
  fasting: number;
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
  processedMonth?: string; // YYYY-MM-v2; set by automatic winner selection guards
  currentWinners: Winner[];
  history: RewardHistoryEntry[];
  // Incremented by the admin panel every time the score weights actually change.
  // The app compares it to the last value it showed the user to decide whether
  // to surface the "points recalculated" banner on the honor board.
  scoreWeightsVersion?: number;
  scoreWeightsUpdatedAt?: string; // ISO timestamp of the last weight change
}

export interface MonthlyEngagement {
  month: string; // YYYY-MM
  score: number;
  // scoreWeightsVersion this score was last computed with. When the admin
  // changes weights, the config version bumps past this and the client is
  // allowed to recompute (and lower) the score for the current month.
  weightsVersion?: number;
  activities?: {
    app_open?: number;
    azkar?: number;
    quran?: number;
    prayer?: number;
    tasbih?: number;
    khatma?: number;
    fasting?: number;
  };
}
