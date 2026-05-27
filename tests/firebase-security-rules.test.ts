import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const firestoreRules = readFileSync('firestore.rules', 'utf8');
const storageRules = readFileSync('storage.rules', 'utf8');

describe('Firebase security rules', () => {
  it('does not allow public Firestore writes or deletes', () => {
    expect(firestoreRules).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/);
    expect(firestoreRules).not.toMatch(/allow\s+write\s*:\s*if\s+true\s*;/);
    expect(firestoreRules).not.toMatch(/allow\s+delete\s*:\s*if\s+true\s*;/);
    expect(firestoreRules).not.toMatch(/allow\s+update\s*,\s*delete\s*:\s*if\s+true\s*;/);
  });

  it('keeps user writes protected while allowing legacy leaderboard reads', () => {
    expect(firestoreRules).toMatch(/match\s+\/users\/\{userId\}\s+\{\s+allow\s+read\s*:\s*if\s+true\s*;/);
    expect(firestoreRules).toMatch(/allow\s+create\s*:\s*if\s+safeUserCreate\(\)\s*\|\|\s*adminWrite\(\)\s*;/);
    expect(firestoreRules).toMatch(/allow\s+update\s*:\s*if\s+safeUserUpdate\(\)\s*\|\|\s*adminWrite\(\)\s*;/);
    expect(firestoreRules).toMatch(/allow\s+delete\s*:\s*if\s+adminWrite\(\)\s*;/);
  });

  it('prevents client updates from lowering same-month leaderboard scores', () => {
    expect(firestoreRules).toMatch(/function\s+noMonthlyScoreDecrease\(\)\s+\{[\s\S]*?monthlyEngagement\.score\s+>=\s+resource\.data\.monthlyEngagement\.score/);
    expect(firestoreRules).toMatch(/function\s+sameMonthlyEngagementMonth\(\)\s+\{[\s\S]*?resource\.data\.monthlyEngagement\.month\s+==\s+request\.resource\.data\.monthlyEngagement\.month/);
    expect(firestoreRules).toMatch(/function\s+safeUserUpdate\(\)\s+\{[\s\S]*?&&\s+noMonthlyScoreDecrease\(\)\s*;/);
  });

  it('allows direct question answer reads without public question listing', () => {
    expect(firestoreRules).toMatch(/match\s+\/userQuestions\/\{docId\}\s+\{[\s\S]*?allow\s+get\s*:\s*if\s+true\s*;/);
    expect(firestoreRules).toMatch(/match\s+\/userQuestions\/\{docId\}\s+\{[\s\S]*?allow\s+list\s*:\s*if\s+isAdmin\(\)\s*;/);
  });

  it('keeps admin-managed Firestore collections behind adminWrite', () => {
    const adminManagedCollections = [
      'appContent',
      'dailyContent',
      'azkar',
      'azkar_categories',
      'duas',
      'notifications',
      'config',
      'sdui_screens',
      'splashScreens',
      'dailyWisdomStories',
    ];

    for (const collection of adminManagedCollections) {
      const collectionBlock = new RegExp(
        `match\\s+/${collection}/\\{[^}]+\\}\\s+\\{[\\s\\S]*?allow\\s+write\\s*:\\s*if\\s+adminWrite\\(\\)\\s*;`,
      );
      expect(firestoreRules).toMatch(collectionBlock);
    }
  });

  it('does not allow public Storage writes or deletes', () => {
    expect(storageRules).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/);
    expect(storageRules).not.toMatch(/allow\s+write\s*:\s*if\s+true\s*;/);
    expect(storageRules).not.toMatch(/allow\s+delete\s*:\s*if\s+true\s*;/);
  });

  it('does not grant broad public Storage reads to private backup paths', () => {
    expect(storageRules).toMatch(/match\s+\/\{allPaths=\*\*\}\s+\{\s+allow\s+read\s*:\s*if\s+false\s*;/);
    expect(storageRules).toMatch(/match\s+\/userBackups\/\{userId\}\/\{allPaths=\*\*\}\s+\{[\s\S]*?allow\s+read\s*:\s*if\s+signedIn\(\)\s*;/);
  });

  it('requires admin claim for admin-managed Storage uploads', () => {
    const adminUploadPaths = [
      'uploads',
      'adhkar-audio',
      'category-icons',
      'backgrounds',
      'content-videos',
      'pdf-uploads',
    ];

    for (const path of adminUploadPaths) {
      const pathBlock = new RegExp(
        `match\\s+/${path}/[\\s\\S]*?allow\\s+write\\s*:\\s*if\\s+isAdmin\\(\\)`,
      );
      expect(storageRules).toMatch(pathBlock);
    }
  });
});
