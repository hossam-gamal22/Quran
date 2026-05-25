import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordHonorBoardNameReminderOpen } from '@/lib/honor-board-name-reminder';

const localDate = (day: number) => new Date(2026, 4, day, 12, 0, 0);

describe('honor board name reminder', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('prompts after seven consecutive daily opens without a display name', async () => {
    for (let day = 1; day <= 6; day += 1) {
      await expect(recordHonorBoardNameReminderOpen(localDate(day))).resolves.toMatchObject({
        shouldPrompt: false,
        streak: day,
      });
    }

    await expect(recordHonorBoardNameReminderOpen(localDate(7))).resolves.toMatchObject({
      shouldPrompt: true,
      streak: 7,
    });
  });

  it('does not prompt more than once on the same day', async () => {
    for (let day = 1; day <= 7; day += 1) {
      await recordHonorBoardNameReminderOpen(localDate(day));
    }

    await expect(recordHonorBoardNameReminderOpen(localDate(7))).resolves.toMatchObject({
      shouldPrompt: false,
      streak: 7,
    });
  });

  it('resets the streak when a day is missed', async () => {
    await recordHonorBoardNameReminderOpen(localDate(1));
    await recordHonorBoardNameReminderOpen(localDate(2));

    await expect(recordHonorBoardNameReminderOpen(localDate(4))).resolves.toMatchObject({
      shouldPrompt: false,
      streak: 1,
    });
  });

  it('suppresses and resets tracking when the user has a display name', async () => {
    await recordHonorBoardNameReminderOpen(localDate(1));
    await AsyncStorage.setItem('@rooh_display_name', 'Hossam Gamal');

    await expect(recordHonorBoardNameReminderOpen(localDate(2))).resolves.toMatchObject({
      shouldPrompt: false,
      streak: 0,
    });

    await AsyncStorage.removeItem('@rooh_display_name');
    await expect(recordHonorBoardNameReminderOpen(localDate(3))).resolves.toMatchObject({
      shouldPrompt: false,
      streak: 1,
    });
  });
});

