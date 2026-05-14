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
  const monthKey = getPreviousMonthKey();
  console.log(`Selecting winners for month: ${monthKey}`);

  const configRef = db.collection('config').doc('rewards-settings');
  const configSnap = await configRef.get();
  const configData = configSnap.data() || {};

  if (configData.enabled === false) {
    console.log('Rewards system is disabled, skipping winner selection.');
    return;
  }

  if (configData.currentMonth === monthKey || configData.processedMonth === monthKey) {
    console.log(`Already processed month ${monthKey}, skipping.`);
    return;
  }

  const winnersCount = configData.winnersCount || 3;
  const rewardDurationDays = configData.rewardDurationDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);
  const expiresAtIso = expiresAt.toISOString();

  const snapshot = await db
    .collection('users')
    .where('monthlyEngagement.month', '==', monthKey)
    .orderBy('monthlyEngagement.score', 'desc')
    .limit(Math.max(winnersCount * 5, 20))
    .get();

  const winners = snapshot.docs
    .filter((docSnap) => {
      const data = docSnap.data();
      const displayName = String(data.displayName || '').trim();
      const score = data.monthlyEngagement?.score || 0;
      return displayName && score > 0 && !data.hiddenFromLeaderboard && !data.placeholder;
    })
    .slice(0, winnersCount)
    .map((docSnap, index) => {
      const data = docSnap.data();
      return {
        userId: docSnap.id,
        rank: index + 1,
        score: data.monthlyEngagement?.score || 0,
        displayName: String(data.displayName || '').trim(),
        fcmToken: data.fcmToken,
        rewardedAt: new Date().toISOString(),
        notified: false,
        premiumExpiresAt: expiresAtIso,
      };
    });

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
