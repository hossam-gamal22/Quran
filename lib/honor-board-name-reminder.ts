import AsyncStorage from '@react-native-async-storage/async-storage';

const DISPLAY_NAME_KEY = '@rooh_display_name';
const REMINDER_STATE_KEY = '@honor_board_name_reminder_state';
const REQUIRED_STREAK_DAYS = 7;
const PROMPT_COOLDOWN_DAYS = 7;

type ReminderState = {
  streak: number;
  lastOpenDate: string | null;
  lastPromptDate: string | null;
};

const DEFAULT_STATE: ReminderState = {
  streak: 0,
  lastOpenDate: null,
  lastPromptDate: null,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

const daysBetween = (olderDateKey: string, newerDateKey: string): number | null => {
  const older = parseDateKey(olderDateKey);
  const newer = parseDateKey(newerDateKey);
  if (older === null || newer === null) return null;
  return Math.round((newer - older) / MS_PER_DAY);
};

const readState = async (): Promise<ReminderState> => {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ReminderState>;
    return {
      streak: Number.isFinite(parsed.streak) ? Math.max(0, Number(parsed.streak)) : 0,
      lastOpenDate: typeof parsed.lastOpenDate === 'string' ? parsed.lastOpenDate : null,
      lastPromptDate: typeof parsed.lastPromptDate === 'string' ? parsed.lastPromptDate : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const hasDisplayName = async (): Promise<boolean> => {
  try {
    const name = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
    return !!name && name.trim().length > 0;
  } catch {
    return false;
  }
};

export const resetHonorBoardNameReminder = async (): Promise<void> => {
  await AsyncStorage.removeItem(REMINDER_STATE_KEY);
};

export const recordHonorBoardNameReminderOpen = async (
  date = new Date(),
): Promise<{ shouldPrompt: boolean; streak: number }> => {
  const today = getLocalDateKey(date);

  if (await hasDisplayName()) {
    await resetHonorBoardNameReminder().catch(() => {});
    return { shouldPrompt: false, streak: 0 };
  }

  const state = await readState();
  const daysSinceLastOpen = state.lastOpenDate
    ? daysBetween(state.lastOpenDate, today)
    : null;

  let nextStreak = state.streak;
  if (state.lastOpenDate !== today) {
    nextStreak = daysSinceLastOpen === 1 ? state.streak + 1 : 1;
  }

  const daysSincePrompt = state.lastPromptDate
    ? daysBetween(state.lastPromptDate, today)
    : null;
  const promptCooldownPassed =
    !state.lastPromptDate ||
    (daysSincePrompt !== null && daysSincePrompt >= PROMPT_COOLDOWN_DAYS);
  const shouldPrompt = nextStreak >= REQUIRED_STREAK_DAYS && promptCooldownPassed;

  const nextState: ReminderState = {
    streak: nextStreak,
    lastOpenDate: today,
    lastPromptDate: shouldPrompt ? today : state.lastPromptDate,
  };

  await AsyncStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(nextState));

  return { shouldPrompt, streak: nextStreak };
};

