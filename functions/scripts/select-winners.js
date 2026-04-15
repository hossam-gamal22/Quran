const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function selectMonthlyWinners() {
  const now = new Date();
  const prevMonth = new Date(
    now.getFullYear(), 
    now.getMonth() - 1
  );
  const monthKey = `${prevMonth.getFullYear()}-${String(
    prevMonth.getMonth() + 1
  ).padStart(2, '0')}-v2`;

  console.log(`Selecting winners for month: ${monthKey}`);

  // Dedup check: skip if already processed this month
  const configRef = db.collection('config').doc('rewards-settings');
  const configSnap = await configRef.get();
  const configData = configSnap.data() || {};
  if (configData.processedMonth === monthKey) {
    console.log(`Already processed month ${monthKey}, skipping.`);
    return;
  }

  // Mark as processing immediately (prevents dual execution)
  await configRef.update({ processedMonth: monthKey });

  // Read winnersCount from config (default 3)
  const winnersCount = configData.winnersCount || 3;

  // Query top users for previous month
  const snapshot = await db
    .collection('users')
    .where('monthlyEngagement.month', '==', monthKey)
    .orderBy('monthlyEngagement.score', 'desc')
    .limit(winnersCount)
    .get();

  if (snapshot.empty) {
    console.log('No users found for previous month');
    return;
  }

  const winners = snapshot.docs.map((doc, index) => ({
    userId: doc.id,
    rank: index + 1,
    score: doc.data().monthlyEngagement?.score || 0,
    displayName: doc.data().displayName || 'مستخدم',
    fcmToken: doc.data().fcmToken,
  }));

  console.log(`Found ${winners.length} winners`);

  // Grant premium to each winner (30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const batch = db.batch();

  for (const winner of winners) {
    const userRef = db.collection('users').doc(winner.userId);
    batch.update(userRef, {
      adminPremium: {
        granted: true,
        grantedBy: 'auto_reward_system',
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        month: monthKey,
        rank: winner.rank,
      },
    });
    console.log(
      `Granted premium to: ${winner.displayName} (rank ${winner.rank})`
    );
  }

  await batch.commit();

  // Save winners list to config (use currentWinners to match client-side reader)
  await db.collection('config').doc('rewards-settings').update({
    currentWinners: winners.map(w => ({
      userId: w.userId,
      displayName: w.displayName,
      score: w.score,
      rank: w.rank,
    })),
    currentMonth: monthKey,
    lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
    processedMonth: monthKey,
  });

  // Send push notifications via Expo
  const tokens = winners
    .filter(w => w.fcmToken)
    .map(w => ({
      to: w.fcmToken,
      title: '🏆 مبروك! أنت في لوحة الشرف',
      body: `حصلت على المركز ${w.rank} وتم منحك اشتراك مجاني!`,
      sound: 'default',
      data: { type: 'honor_board_winner' },
    }));

  if (tokens.length > 0) {
    const response = await fetch(
      'https://exp.host/--/api/v2/push/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens),
      }
    );
    console.log('Push notifications sent:', response.status);
  }

  console.log('Done! Winners selected and premium granted.');
}

selectMonthlyWinners().catch(console.error);
