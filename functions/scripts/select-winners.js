const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const EXPO_PUSH_URL = 'https://api.expo.dev/v2/push/send';

function getPreviousMonthKey(now = new Date()) {
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-v2`;
}

async function sendPush(messages) {
  if (messages.length === 0) return false;

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.warn('Push notifications failed:', response.status, await response.text());
    return false;
  }

  console.log('Push notifications sent:', response.status);
  return true;
}

async function selectMonthlyWinners() {
  // `--force` (or FORCE_WINNER_SELECTION=1) re-runs selection even when the
  // month was already marked processed. Use it to correct a prior bad run
  // (e.g. winners chosen before the lastFinalizedMonth union fix).
  const force = process.argv.includes('--force') || process.env.FORCE_WINNER_SELECTION === '1';
  const monthKey = getPreviousMonthKey();
  console.log(`Selecting winners for month: ${monthKey}${force ? ' (FORCE)' : ''}`);

  const configRef = db.collection('config').doc('rewards-settings');
  const configSnap = await configRef.get();
  const configData = configSnap.data() || {};

  if (configData.enabled === false) {
    console.log('Rewards system is disabled, skipping winner selection.');
    return;
  }

  if (!force && (configData.currentMonth === monthKey || configData.processedMonth === monthKey)) {
    console.log(`Already processed month ${monthKey}, skipping. (pass --force to re-run)`);
    return;
  }

  const winnersCount = configData.winnersCount || 3;
  const rewardDurationDays = configData.rewardDurationDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);
  const expiresAtIso = expiresAt.toISOString();
  const candidateLimit = Math.max(winnersCount * 5, 20);

  // Query users in two ways and union the results (mirrors the deployed
  // `selectMonthlyWinners` Cloud Function):
  // 1) Users whose monthlyEngagement still points at the previous month —
  //    they haven't opened the app under the new month yet.
  // 2) Users who already rolled over into the new month but kept a
  //    denormalised snapshot of their final previous-month score in
  //    lastFinalizedMonth. Active users fall in this bucket, so querying
  //    only monthlyEngagement.month would silently drop the top scorers.
  const [activeSnapshot, finalizedSnapshot] = await Promise.all([
    db.collection('users')
      .where('monthlyEngagement.month', '==', monthKey)
      .orderBy('monthlyEngagement.score', 'desc')
      .limit(candidateLimit)
      .get(),
    db.collection('users')
      .where('lastFinalizedMonth.month', '==', monthKey)
      .orderBy('lastFinalizedMonth.score', 'desc')
      .limit(candidateLimit)
      .get(),
  ]);

  const candidatesById = new Map();
  const consider = (userId, data, score, displayName) => {
    if (!displayName || score <= 0) return;
    if (data.hiddenFromLeaderboard || data.placeholder) return;
    const existing = candidatesById.get(userId);
    if (!existing || score > existing.score) {
      candidatesById.set(userId, { userId, displayName, score, data });
    }
  };

  activeSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    consider(
      docSnap.id,
      data,
      Number(data.monthlyEngagement?.score) || 0,
      String(data.displayName || '').trim(),
    );
  });

  finalizedSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const finalized = data.lastFinalizedMonth;
    consider(
      docSnap.id,
      data,
      Number(finalized?.score) || 0,
      String(finalized?.displayName || data.displayName || '').trim(),
    );
  });

  const winners = Array.from(candidatesById.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, winnersCount)
    .map((candidate, index) => ({
      userId: candidate.userId,
      rank: index + 1,
      score: candidate.score,
      displayName: candidate.displayName,
      fcmToken: candidate.data.fcmToken,
      rewardedAt: new Date().toISOString(),
      notified: false,
      premiumExpiresAt: expiresAtIso,
    }));

  console.log(`Found ${winners.length} eligible winners`);

  if (winners.length === 0) {
    await configRef.set({
      currentMonth: monthKey,
      processedMonth: monthKey,
      lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('No eligible winners found for previous month.');
    return;
  }

  const batch = db.batch();
  for (const winner of winners) {
    const userRef = db.collection('users').doc(winner.userId);
    batch.update(userRef, {
      adminPremium: {
        granted: true,
        grantedBy: 'auto_reward_system',
        grantedAt: new Date().toISOString(),
        plan: 'monthly',
        expiresAt: expiresAtIso,
        reason: `فائز في مسابقة الشهر ${monthKey}`,
        month: monthKey,
        rank: winner.rank,
      },
    });
    console.log(`Granted premium to: ${winner.displayName} (rank ${winner.rank})`);
  }
  await batch.commit();

  const pushMessages = winners
    .filter((winner) => winner.fcmToken && winner.fcmToken.startsWith('ExponentPushToken'))
    .map((winner) => {
      winner.notified = true;
      return {
        to: winner.fcmToken,
        title: '🏆 مبروك! أنت في لوحة الشرف',
        body: `حصلت على المركز ${winner.rank} وتم منحك اشتراك مجاني!`,
        sound: 'default',
        priority: 'high',
        channelId: 'general',
        data: {
          type: 'honor_board_winner',
          actionType: 'screen',
          actionUrl: '/honor-board',
        },
      };
    });

  await sendPush(pushMessages);

  const persistedWinners = winners.map(({ fcmToken, ...winner }) => winner);
  const historyEntry = {
    month: monthKey,
    winners: persistedWinners,
    selectedAt: new Date().toISOString(),
    selectedBy: 'auto',
  };

  await configRef.set({
    currentWinners: persistedWinners,
    currentMonth: monthKey,
    history: [historyEntry, ...(configData.history || []).slice(0, 11)],
    processedMonth: monthKey,
    lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log('Done! Winners selected and premium granted.');
}

selectMonthlyWinners().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
