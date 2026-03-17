const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'constants', 'translations.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add missing keys to each language's settings block
const replacements = [
  // English
  {
    old: `    surahReadingTime: 'Time to read Surah number',
  },
  worship: {
    title: 'Worship',`,
    new: `    surahReadingTime: 'Time to read Surah number',
    prayerAndAzkarAlerts: 'Prayer & Azkar Alerts',
    liveActivities: 'Live Activities',
  },
  worship: {
    title: 'Worship',`
  },
  // French
  {
    old: `    surahReadingTime: 'C\\'est l\\'heure de lire la sourate numéro',
  },
  worship: {`,
    new: `    surahReadingTime: 'C\\'est l\\'heure de lire la sourate numéro',
    prayerAndAzkarAlerts: 'Alertes de prière et Azkar',
    liveActivities: 'Activités en direct',
  },
  worship: {`
  },
  // German
  {
    old: `    surahReadingTime: 'Zeit, Sure Nummer zu lesen',
  },
  worship: {`,
    new: `    surahReadingTime: 'Zeit, Sure Nummer zu lesen',
    prayerAndAzkarAlerts: 'Gebets- und Azkar-Benachrichtigungen',
    liveActivities: 'Live-Aktivitäten',
  },
  worship: {`
  },
  // Turkish
  {
    old: `    surahReadingTime: 'Sure numarasını okuma zamanı',
  },
  worship: {`,
    new: `    surahReadingTime: 'Sure numarasını okuma zamanı',
    prayerAndAzkarAlerts: 'Namaz ve Zikir Bildirimleri',
    liveActivities: 'Canlı Etkinlikler',
  },
  worship: {`
  },
  // Spanish
  {
    old: `    surahReadingTime: 'Es hora de leer la sura número',
  },
  worship: {`,
    new: `    surahReadingTime: 'Es hora de leer la sura número',
    prayerAndAzkarAlerts: 'Alertas de Oración y Azkar',
    liveActivities: 'Actividades en vivo',
  },
  worship: {`
  },
  // Urdu
  {
    old: `    surahReadingTime: 'سورت نمبر پڑھنے کا وقت',
  },
  worship: {`,
    new: `    surahReadingTime: 'سورت نمبر پڑھنے کا وقت',
    prayerAndAzkarAlerts: 'نماز اور اذکار کی اطلاعات',
    liveActivities: 'لائیو سرگرمیاں',
  },
  worship: {`
  },
  // Indonesian
  {
    old: `    surahReadingTime: 'Waktunya membaca surah nomor',
  },
  worship: {`,
    new: `    surahReadingTime: 'Waktunya membaca surah nomor',
    prayerAndAzkarAlerts: 'Notifikasi Shalat & Dzikir',
    liveActivities: 'Aktivitas Langsung',
  },
  worship: {`
  },
  // Malay
  {
    old: `    surahReadingTime: 'Masa untuk membaca surah nombor',
  },
  worship: {`,
    new: `    surahReadingTime: 'Masa untuk membaca surah nombor',
    prayerAndAzkarAlerts: 'Pemberitahuan Solat & Zikir',
    liveActivities: 'Aktiviti Langsung',
  },
  worship: {`
  },
  // Hindi
  {
    old: `    surahReadingTime: 'सूरह नंबर पढ़ने का समय',
  },
  worship: {`,
    new: `    surahReadingTime: 'सूरह नंबर पढ़ने का समय',
    prayerAndAzkarAlerts: 'नमाज़ और अज़कार अलर्ट',
    liveActivities: 'लाइव गतिविधियाँ',
  },
  worship: {`
  },
  // Bengali
  {
    old: `    surahReadingTime: 'সূরা নম্বর পড়ার সময়',
  },
  worship: {`,
    new: `    surahReadingTime: 'সূরা নম্বর পড়ার সময়',
    prayerAndAzkarAlerts: 'নামাজ ও আজকার সতর্কতা',
    liveActivities: 'লাইভ কার্যকলাপ',
  },
  worship: {`
  },
  // Russian
  {
    old: `    surahReadingTime: 'Время читать суру номер',
  },
  worship: {`,
    new: `    surahReadingTime: 'Время читать суру номер',
    prayerAndAzkarAlerts: 'Уведомления о молитве и азкарах',
    liveActivities: 'Живые действия',
  },
  worship: {`
  },
];

let count = 0;
for (const r of replacements) {
  if (content.includes(r.old)) {
    content = content.replace(r.old, r.new);
    count++;
  }
}

fs.writeFileSync(filePath, content);
console.log(`✅ Updated ${count} language blocks`);
