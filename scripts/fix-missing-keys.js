/**
 * Fix missing translation keys in specific language blocks
 * Run with: node scripts/fix-missing-keys.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_FILE = path.join(__dirname, '..', 'constants', 'translations.ts');

let content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

// ============================================================
// Helper: insert text before a specific line in a language block
// ============================================================

function findEndOfBlock(content, langStart) {
  // Given a language block starting at langStart, find its closing `};`
  let braceDepth = 0;
  let started = false;
  for (let i = langStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceDepth++;
      started = true;
    } else if (content[i] === '}') {
      braceDepth--;
      if (started && braceDepth === 0) {
        // Found the matching `};` — return position of `}`
        return i;
      }
    }
  }
  return -1;
}

function hasKeyInBlock(content, blockStart, blockEnd, key) {
  const block = content.substring(blockStart, blockEnd);
  return block.includes(`${key}:`);
}

// ============================================================
// Build language block positions
// ============================================================
const langStarts = {};
const langNames = ['ar', 'en', 'fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];

for (const lang of langNames) {
  const pattern = `const ${lang}: TranslationKeys = {`;
  const idx = content.indexOf(pattern);
  if (idx >= 0) {
    langStarts[lang] = idx;
  }
}

// Sort by position
const sortedLangs = Object.entries(langStarts).sort((a, b) => a[1] - b[1]);

// Find block ends
const langEnds = {};
for (const [lang, start] of sortedLangs) {
  langEnds[lang] = findEndOfBlock(content, start);
}

console.log('Language block positions:');
for (const [lang, start] of sortedLangs) {
  console.log(`  ${lang}: ${start} - ${langEnds[lang]}`);
}

// ============================================================
// Settings keys template
// ============================================================
const settingsKeys = `
    generalFontSize: 'General Font Size',
    preview: 'Preview',
    homeLayout: 'Home Page Layout',
    grid: 'Grid',
    list: 'List',
    colorBackgrounds: 'Color Backgrounds',
    photoBackgrounds: 'Photo Backgrounds',`;

// ============================================================
// Calendar keys template
// ============================================================
const calendarKeys = `
    monthEvents: 'Events This Month',
    adjustTitle: 'Adjust Hijri Date',
    adjustHint: 'You can adjust the Hijri date by adding or subtracting days',`;

// ============================================================
// Names keys template
// ============================================================
const namesKeys = `
    title: 'Names of Allah',
    gridView: 'Grid',
    listView: 'List',
    meaning: 'Meaning',
    explanation: 'Explanation',
    evidence: 'Evidence',
    hadith: 'Hadith',
    whatsapp: 'WhatsApp',
    shareHeader: 'Share Name',
    count99: '99 Names',
    shareAsImage: 'Share as Image',
    shareAsText: 'Share as Text',`;

// ============================================================
// New namespace blocks template
// ============================================================
const newNamespaces = `

  ayatUniverse: {
    title: 'Verses of Allah\\'s Greatness',
    introTitle: 'Verses of the Creator\\'s Greatness',
    introSubtitle: 'Reflect on Allah\\'s signs in the universe',
    readInMushaf: 'Read in Mushaf',
    themeCreation: 'Creation & Formation',
    themeHeavensEarth: 'Heavens & Earth',
    themeNatureWater: 'Nature & Water',
    themeHumanCreation: 'Human Creation',
    themePowerDominion: 'Power & Dominion',
    allThemes: 'All',
  },

  hadithSifat: {
    title: 'Hadiths on Allah\\'s Attributes',
    introTitle: 'Hadiths on the Attributes of Allah',
    introSubtitle: 'Authentic hadiths about the attributes of Allah',
    narrator: 'Narrator',
    source: 'Source',
    hadithNumber: 'Hadith No.',
    shareText: 'Share Hadith',
    savedToFavorites: 'Saved to favorites',
    removedFromFavorites: 'Removed from favorites',
  },

  companions: {
    title: 'Stories of the Companions',
    heroTitle: 'Companions of the Prophet ﷺ',
    heroSubtitle: 'Shining examples from the best generation',
    story: 'Story',
    virtues: 'Virtues & Merits',
    categoryTenPromised: 'Ten Promised Paradise',
    categoryMuhajirun: 'The Muhajirun',
    categoryAnsar: 'The Ansar',
    categoryMothers: 'Mothers of the Believers',
    readMore: 'Read More',
    expandBio: 'Show Biography',
    footerDua: 'May Allah be pleased with them all',
    footerText: 'O Allah, gather us with them',
    searchPlaceholder: 'Search for a companion...',
  },

  seerah: {
    title: 'Prophet\\'s Biography',
    heroTitle: 'Biography of the Final Prophet ﷺ',
    heroSubtitle: 'From birth to passing — a light for all worlds',
    chapters: 'Chapters',
    sectionBirth: 'Birth & Upbringing',
    sectionProphethood: 'Prophethood & Revelation',
    sectionDawah: 'Dawah in Makkah',
    sectionMigration: 'Migration to Madinah',
    sectionMadinah: 'Building the State',
    sectionConquest: 'Conquests',
    sectionFarewell: 'Farewell Pilgrimage & Passing',
  },

  prayerAdjustments: {
    title: 'Adjust Prayer Times',
    reset: 'Reset',
    hint: 'Adjust minutes for each prayer (+ or -)',
    minutesSuffix: 'm',
  },

  liveActivities: {
    title: 'Live Activities',
    enable: 'Enable Live Activities',
    description: 'Show next prayer time on Lock Screen and Dynamic Island permanently. Updates automatically when app is opened.',
    notSupported: 'Live Activities are not supported on this device (requires iOS 16.1+)',
    styleTitle: 'Activity Style',
    preview: 'Preview',
    previewNextPrayer: 'Next Prayer: Maghrib',
    previewSunrise: 'Sunrise: 05:45',
  },

  seasonal: {
    ashura: {
      title: 'Day of Ashura',
      subtitle: 'The Tenth of Muharram',
      description: 'The day Allah saved Musa (Moses) and his people from Pharaoh',
      hadithSource: 'Narrated by Muslim',
      tasua: 'Tasua',
      tasuaDesc: 'The ninth day of Muharram',
      tasuaVirtue: 'Fasting is recommended along with Ashura',
      ashuraDay: 'Ashura',
      ashuraDayDesc: 'The tenth day of Muharram',
      ashuraVirtue: 'Fasting expiates the sins of the previous year',
      eleventh: 'The Eleventh',
      eleventhDesc: 'The eleventh day of Muharram',
      eleventhVirtue: 'May be fasted along with Ashura',
      virtueExpiation: 'Yearly Expiation',
      virtueExpiationDesc: 'Fasting expiates the sins of the previous year',
      virtueHistoric: 'Historic Day',
      virtueHistoricDesc: 'Allah saved Musa and the Children of Israel',
      virtueSunnah: 'Prophetic Tradition',
      virtueSunnahDesc: 'The Prophet ﷺ used to fast it and encourage fasting',
      virtueGratitude: 'Gratitude to Allah',
      virtueGratitudeDesc: 'The Prophet ﷺ fasted it in gratitude for saving Musa',
      actionFast9: 'Fast the 9th',
      actionFast9Sub: 'To be different',
      actionFast10: 'Fast the 10th',
      actionFast10Sub: 'The main day',
      actionDua: 'Supplication',
      actionDuaSub: 'And seeking forgiveness',
      actionSadaqa: 'Charity',
      actionSadaqaSub: 'And generosity to family',
      muharram: 'Muharram',
      recommended: 'Recommended',
      fastingDays: 'Fasting Days',
      virtues: 'Virtues of Ashura',
      recommendedActions: 'Recommended Actions',
      tip: 'Tip',
      tipText: 'It is recommended to fast Tasua (9th) along with Ashura (10th), and the Prophet ﷺ was keen on fasting it.',
    },
    mawlid: {
      title: 'Prophet\\'s Birthday Commemoration',
      prophetName: 'Muhammad ﷺ',
      prophetFullName: 'Muhammad ibn Abdullah ibn Abdul-Muttalib',
      birthDate: '12 Rabi al-Awwal',
      birthPlace: 'Makkah',
      birthYear: 'Year of the Elephant (approx. 570 CE)',
      nameMuhammad: 'Muhammad',
      nameMuhammadMeaning: 'The most praised among all',
      nameAhmad: 'Ahmad',
      nameAhmadMeaning: 'The most praised in all his attributes',
      nameAlMahi: 'Al-Mahi',
      nameAlMahiMeaning: 'The one through whom Allah erases disbelief',
      nameAlHashir: 'Al-Hashir',
      nameAlHashirMeaning: 'People will be gathered before him',
      nameAlAqib: 'Al-Aqib',
      nameAlAqibMeaning: 'The last prophet, none after him',
      nameAlMuqaffi: 'Al-Muqaffi',
      nameAlMuqaffiMeaning: 'The last to follow',
      qualityMercy: 'Mercy',
      qualityMercyDesc: 'We have not sent you except as a mercy to the worlds',
      qualityHonesty: 'Honesty & Trustworthiness',
      qualityHonestyDesc: 'Known as the Truthful and Trustworthy before prophethood',
      qualityBravery: 'Bravery',
      qualityBraveryDesc: 'He was the bravest of people in battle',
      qualityHumility: 'Humility',
      qualityHumilityDesc: 'He served himself and helped his family',
      qualityGenerosity: 'Generosity',
      qualityGenerosityDesc: 'He was the most generous of all people',
      qualityPatience: 'Patience',
      qualityPatienceDesc: 'He endured harm and hardship for the sake of dawah',
      salawatIbrahimiyah: 'Ibrahimiyyah Salawat',
      salawatIbrahimiyahVirtue: 'The best form of sending blessings upon the Prophet ﷺ',
      salawatShort: 'Short Salawat',
      salawatShortVirtue: 'Whoever sends blessings upon me, Allah sends ten upon him',
      salawatSalam: 'Sending Peace upon the Prophet',
      salawatSalamVirtue: 'From the Tashahhud in prayer',
      actionSalawat: 'Increase blessings upon the Prophet ﷺ',
      actionSeerah: 'Read the Prophet\\'s biography',
      actionSunnah: 'Follow his Sunnah ﷺ',
      actionAkhlaq: 'Adopt his noble character ﷺ',
      counterLabel: 'Send blessings upon the Prophet ﷺ',
      counterButton: 'Tap to send blessings',
      namesSection: 'Names of the Prophet ﷺ',
      qualitiesSection: 'His Qualities ﷺ',
      salawatSection: 'Forms of Sending Blessings ﷺ',
      todaySection: 'On This Day',
      reminder: 'Reminder',
      reminderText: 'The best way to commemorate the Prophet\\'s birthday is to follow his Sunnah ﷺ, adopt his character, and send abundant blessings upon him.',
    },
    hajj: {
      title: 'Hajj Season',
      headerSubtitle: 'Dhul Hijjah',
      headerSubtitleWithDay: 'Dhul Hijjah - Day',
      day8Name: 'Day of Tarwiyah',
      day8Desc: 'Entering Ihram from Makkah and heading to Mina',
      day9Name: 'Day of Arafah',
      day9Desc: 'The greatest day of Hajj - Standing at Arafah',
      day10Name: 'Day of Sacrifice',
      day10Desc: 'Blessed Eid al-Adha - The greatest day in the sight of Allah',
      day11Name: 'First day of Tashreeq',
      day11Desc: 'Staying in Mina and stoning the Jamarat',
      day12Name: 'Second day of Tashreeq',
      day12Desc: 'Stoning the Jamarat - early departure permitted',
      day13Name: 'Third day of Tashreeq',
      day13Desc: 'Last day of Hajj for those who stayed',
      ritualIhram: 'Ihram',
      ritualIhramDesc: 'Entering Ihram from Makkah for Hajj',
      ritualMinaStay: 'Staying in Mina',
      ritualMinaStayDesc: 'Heading to Mina and staying overnight',
      ritualPrayers: 'Prayers',
      ritualPrayersDesc: 'Shortening Dhuhr, Asr, Maghrib, and Isha prayers',
      ritualArafah: 'Standing at Arafah',
      ritualArafahDesc: 'The greatest pillar of Hajj',
      ritualDua: 'Supplication',
      ritualDuaDesc: 'Abundantly making dua and dhikr',
      ritualMuzdalifah: 'Staying in Muzdalifah',
      ritualMuzdalifahDesc: 'Heading to Muzdalifah after sunset',
      ritualRami: 'Stoning Jamrat al-Aqaba',
      ritualRamiDesc: 'Throwing seven pebbles at Jamrat al-Aqaba',
      ritualHady: 'Sacrificing the Hady',
      ritualHadyDesc: 'Sacrificing the animal after stoning',
      ritualHalq: 'Shaving or Trimming',
      ritualHalqDesc: 'Shaving or trimming hair after sacrifice',
      ritualTawafIfadah: 'Tawaf al-Ifadah',
      ritualTawafIfadahDesc: 'Circumambulating the Kaaba',
      ritualSai: 'Sa\\'i',
      ritualSaiDesc: 'Walking between Safa and Marwa',
      ritualRami3: 'Stoning the Three Jamarat',
      ritualRami3Desc: 'Stoning the small, middle, then large Jamrah',
      ritualMinaStayTashreeq: 'Staying in Mina',
      ritualMinaStayTashreeqDesc: 'Staying overnight in Mina during Tashreeq nights',
      ritualTakbeer: 'Takbeer',
      ritualTakbeerDesc: 'Saying Takbeer during the days of Tashreeq',
      ritualLeave: 'Early Departure',
      ritualLeaveDesc: 'Permitted to leave after stoning on the 12th before sunset',
      ritualTawafWada: 'Farewell Tawaf',
      ritualTawafWadaDesc: 'The last act before leaving Makkah',
      arafahVirtue1: 'The day Allah frees the most people from Hell',
      arafahVirtue2: 'Fasting it expiates two years (for non-pilgrims)',
      arafahVirtue3: 'Allah boasts of the people of Arafah to the angels',
      tenDaysTitle: 'The First Ten Days of Dhul Hijjah',
      tenDaysSubtitle: 'No good deeds are more beloved to Allah than those done in these days',
      tenDaysVirtue1: 'Fasting',
      tenDaysVirtue2: 'Prayer',
      tenDaysVirtue3: 'Takbeer',
      tenDaysVirtue4: 'Tahleel',
      tenDaysVirtue5: 'Tasbeeh',
      tenDaysVirtue6: 'Charity',
      tenDaysVirtue7: 'Quran Recitation',
      tenDaysVirtue8: 'Sacrifice',
      tenDaysVirtue9: 'Dhikr',
      tenDaysVirtue10: 'Repentance',
      duaTalbiyah: 'Talbiyah',
      duaTalbiyahOccasion: 'Throughout Hajj',
      duaTawaf: 'Dua of Tawaf',
      duaTawafOccasion: 'Between the Yemeni Corner and the Black Stone',
      duaSai: 'Dua of Sa\\'i',
      duaSaiOccasion: 'At Safa and Marwa',
      duaArafah: 'Dua of Arafah',
      duaArafahOccasion: 'Day of Arafah',
      duaRami: 'Dua of Stoning',
      duaRamiOccasion: 'When throwing each pebble',
      duaTakbir: 'Takbeer',
      duaTakbirOccasion: 'Days of Tashreeq',
      dhulHijjah: 'Dhul Hijjah',
      ritualsAndDeeds: 'Rituals & Deeds',
      virtuesSection: 'Virtues',
      duasSection: 'Recommended Supplications',
      ritualsSection: 'Hajj Rituals',
      hajjDuasSection: 'Hajj Supplications',
      tipTitle: 'For Non-Pilgrims',
      tipText: 'Fasting the Day of Arafah expiates the sins of the previous and coming year. Increase dhikr, takbeer, and charity during these blessed days.',
    },
  },`;

// ============================================================
// Process each language block - add missing keys
// ============================================================

// We need to process from end to start to maintain positions
const langsToProcess = [...sortedLangs].reverse();

for (const [lang, blockStart] of langsToProcess) {
  const blockEnd = findEndOfBlock(content, blockStart);
  if (blockEnd < 0) {
    console.log(`  ❌ Could not find end of ${lang} block`);
    continue;
  }
  
  const block = content.substring(blockStart, blockEnd + 2); // include };
  let insertions = [];
  
  // Check for missing settings keys
  if (!block.includes('generalFontSize:')) {
    // Find backgroundLoadError in this block
    const bgIdx = block.indexOf('backgroundLoadError:');
    if (bgIdx >= 0) {
      // Find end of that line
      const lineEnd = block.indexOf('\n', bgIdx);
      if (lineEnd >= 0) {
        const absPos = blockStart + lineEnd;
        insertions.push({ pos: absPos, text: settingsKeys });
        console.log(`  📝 Adding settings keys to ${lang} (after backgroundLoadError)`);
      }
    }
  }
  
  // Check for missing calendar keys
  if (!block.includes('monthEvents:')) {
    const dsIdx = block.indexOf('daysShort:');
    if (dsIdx >= 0) {
      const lineEnd = block.indexOf('\n', dsIdx);
      if (lineEnd >= 0) {
        const absPos = blockStart + lineEnd;
        insertions.push({ pos: absPos, text: calendarKeys });
        console.log(`  📝 Adding calendar keys to ${lang}`);
      }
    }
  }
  
  // Check for missing names keys (title, gridView, etc.)
  if (!block.includes("title: '") || (!block.includes('gridView:') && block.includes('nameCopied:'))) {
    const ncIdx = block.indexOf('nameCopied:');
    if (ncIdx >= 0 && !block.includes('gridView:')) {
      const lineEnd = block.indexOf('\n', ncIdx);
      if (lineEnd >= 0) {
        const absPos = blockStart + lineEnd;
        // Use correct ar values for ar block
        if (lang === 'ar') {
          // ar block should already have these, skip
        } else {
          insertions.push({ pos: absPos, text: namesKeys });
          console.log(`  📝 Adding names keys to ${lang}`);
        }
      }
    }
  }
  
  // Check for missing new namespaces
  if (!block.includes('ayatUniverse:')) {
    // Insert before the closing `};` of the block
    const insertText = newNamespaces;
    const absPos = blockEnd; // position of the `}` in `};`
    insertions.push({ pos: absPos, text: insertText });
    console.log(`  📝 Adding new namespaces to ${lang}`);
  }
  
  // Apply insertions from end to start (to maintain positions)
  insertions.sort((a, b) => b.pos - a.pos);
  for (const ins of insertions) {
    content = content.substring(0, ins.pos) + ins.text + content.substring(ins.pos);
  }
}

// Write the file
fs.writeFileSync(TRANSLATIONS_FILE, content, 'utf-8');
console.log('\n✅ Missing keys fixed!');

// Verify
const newContent = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
console.log(`\nVerification:`);
console.log(`  generalFontSize: ${(newContent.match(/generalFontSize:/g) || []).length} occurrences`);
console.log(`  monthEvents: ${(newContent.match(/monthEvents:/g) || []).length} occurrences`);
console.log(`  premiumTitle: ${(newContent.match(/premiumTitle:/g) || []).length} occurrences`);
console.log(`  ayatUniverse: ${(newContent.match(/ayatUniverse:/g) || []).length} occurrences`);
console.log(`  seasonal: ${(newContent.match(/  seasonal:/g) || []).length} occurrences`);
console.log(`  File lines: ${newContent.split('\n').length}`);
