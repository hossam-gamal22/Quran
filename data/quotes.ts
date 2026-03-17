// data/quotes.ts
// 50+ curated Islamic wisdom quotes and sayings
// From scholars, companions, and Islamic literature

export interface IslamicQuote {
  arabic: string;
  translation: string;
  author: string;
  source?: string;
}

const ISLAMIC_QUOTES: IslamicQuote[] = [
  // === أقوال الصحابة والتابعين ===
  { arabic: 'قيمة كل امرئ ما يحسنه', translation: 'The value of a person is what he excels at.', author: 'علي بن أبي طالب رضي الله عنه' },
  { arabic: 'العلم يرفع الوضيع، والجهل يضع الرفيع', translation: 'Knowledge elevates the lowly, and ignorance degrades the noble.', author: 'علي بن أبي طالب رضي الله عنه' },
  { arabic: 'الناس أعداء ما جهلوا', translation: 'People are enemies of what they do not know.', author: 'علي بن أبي طالب رضي الله عنه' },
  { arabic: 'من زاد علمه على عقله كان وبالاً عليه', translation: 'He whose knowledge exceeds his wisdom, it becomes a burden on him.', author: 'عمر بن الخطاب رضي الله عنه' },
  { arabic: 'لا خير في قول بلا عمل', translation: 'There is no good in speech without action.', author: 'عمر بن الخطاب رضي الله عنه' },
  { arabic: 'حاسبوا أنفسكم قبل أن تحاسبوا', translation: 'Hold yourselves accountable before you are held accountable.', author: 'عمر بن الخطاب رضي الله عنه' },
  { arabic: 'ما ندمت على سكوتي مرة، ولقد ندمت على الكلام مراراً', translation: 'I never regretted my silence once, but I often regretted speaking.', author: 'أبو بكر الصديق رضي الله عنه' },
  { arabic: 'أحسن الكلام ما صدقه العمل', translation: 'The best speech is that which is confirmed by action.', author: 'عثمان بن عفان رضي الله عنه' },
  
  // === أقوال العلماء والحكماء ===
  { arabic: 'من تواضع لله رفعه، ومن تكبر وضعه', translation: 'Whoever humbles himself for Allah, He elevates him; whoever is arrogant, He degrades him.', author: 'الحسن البصري' },
  { arabic: 'العلم بلا عمل كالشجر بلا ثمر', translation: 'Knowledge without action is like a tree without fruit.', author: 'الإمام الشافعي' },
  { arabic: 'كن عالماً أو متعلماً أو مستمعاً أو محباً ولا تكن الخامسة فتهلك', translation: 'Be a scholar, a learner, a listener, or a lover of knowledge, but do not be the fifth or you will perish.', author: 'الإمام الشافعي' },
  { arabic: 'ما ضاق مكان بمتحابين', translation: 'No place is too small for those who love each other.', author: 'الإمام الشافعي' },
  { arabic: 'من لم يتحمل ذل التعلم ساعة بقي في ذل الجهل أبداً', translation: 'He who cannot bear the humility of learning for an hour will remain in the humiliation of ignorance forever.', author: 'الإمام الشافعي' },
  { arabic: 'إذا هبت رياحك فاغتنمها', translation: 'When your winds blow favorably, seize the opportunity.', author: 'الإمام الشافعي' },
  { arabic: 'الصبر مفتاح الفرج', translation: 'Patience is the key to relief.', author: 'حكمة عربية' },
  { arabic: 'القناعة كنز لا يفنى', translation: 'Contentment is a treasure that never runs out.', author: 'حكمة إسلامية' },
  { arabic: 'رب أخ لك لم تلده أمك', translation: 'Many a brother of yours was not born of your mother.', author: 'حكمة عربية' },
  { arabic: 'من جد وجد ومن زرع حصد', translation: 'He who strives finds, and he who sows reaps.', author: 'حكمة عربية' },
  { arabic: 'العقل زينة، والأدب حلية', translation: 'The mind is an adornment, and manners are a jewel.', author: 'حكمة عربية' },
  { arabic: 'التأني من الرحمن والعجلة من الشيطان', translation: 'Deliberation is from the Most Merciful, and haste is from Satan.', author: 'حكمة إسلامية' },
  
  // === أقوال الإمام الغزالي ===
  { arabic: 'اعمل لدنياك كأنك تعيش أبداً، واعمل لآخرتك كأنك تموت غداً', translation: 'Work for your worldly life as if you will live forever, and work for your afterlife as if you will die tomorrow.', author: 'الإمام الغزالي' },
  { arabic: 'العلم بلا عمل جنون، والعمل بلا علم لا يكون', translation: 'Knowledge without action is madness, and action without knowledge is impossible.', author: 'الإمام الغزالي' },
  { arabic: 'لا تحقرن صغيرة، إن الجبال من الحصى', translation: 'Do not despise anything small, for mountains are made of pebbles.', author: 'الإمام الغزالي' },
  
  // === أقوال ابن القيم ===
  { arabic: 'في القلب شعث لا يلمه إلا الإقبال على الله', translation: 'There is a scattering in the heart that can only be gathered by turning to Allah.', author: 'ابن القيم' },
  { arabic: 'الدنيا مزرعة الآخرة', translation: 'This world is the farm for the Hereafter.', author: 'ابن القيم' },
  { arabic: 'من أراد الوصول إلى الله فليلزم باب العبودية', translation: 'Whoever wants to reach Allah must commit to the door of servitude.', author: 'ابن القيم' },
  { arabic: 'أعظم الهجرة هجرة القلب من محبة غير الله', translation: 'The greatest migration is the heart\'s migration from loving other than Allah.', author: 'ابن القيم' },
  
  // === أقوال ابن تيمية ===
  { arabic: 'العلم كالماء جعله الله تعالى للملائكة قوتاً وللقلوب حياة', translation: 'Knowledge is like water: Allah made it sustenance for the angels and life for the hearts.', author: 'ابن تيمية' },
  { arabic: 'من عبد الله بالحب وحده فهو زنديق', translation: 'He who worships Allah with love alone is a heretic.', author: 'ابن تيمية' },
  
  // === أقوال متنوعة ===
  { arabic: 'ما خاب من استخار، ولا ندم من استشار', translation: 'He who seeks guidance from Allah is never disappointed, and he who consults is never regretful.', author: 'حكمة إسلامية' },
  { arabic: 'إن الله يحب إذا عمل أحدكم عملاً أن يتقنه', translation: 'Allah loves that when one of you does something, he perfects it.', author: 'حكمة نبوية' },
  { arabic: 'خير الناس أنفعهم للناس', translation: 'The best of people are those who are most beneficial to others.', author: 'حكمة نبوية' },
  { arabic: 'اليد العليا خير من اليد السفلى', translation: 'The upper hand (that gives) is better than the lower hand (that takes).', author: 'حكمة نبوية' },
  { arabic: 'الإنسان عدو ما يجهل', translation: 'Man is an enemy of what he does not know.', author: 'حكمة عربية' },
  { arabic: 'من أصلح سريرته أصلح الله علانيته', translation: 'Whoever rectifies his inner self, Allah will rectify his outward state.', author: 'حكمة إسلامية' },
  { arabic: 'الحكمة ضالة المؤمن', translation: 'Wisdom is the lost property of the believer.', author: 'حكمة نبوية' },
  { arabic: 'من حسن إسلام المرء تركه ما لا يعنيه', translation: 'Part of the perfection of one\'s Islam is leaving that which does not concern him.', author: 'حكمة نبوية' },
  { arabic: 'لا يغني حذر من قدر', translation: 'Caution does not protect against fate.', author: 'حكمة عربية' },
  { arabic: 'من يزرع الرياح يحصد العواصف', translation: 'He who sows the wind reaps the storm.', author: 'حكمة عربية' },
  { arabic: 'أول العلم الصمت، والثاني الاستماع', translation: 'The first step to knowledge is silence, the second is listening.', author: 'حكمة عربية' },
  { arabic: 'رأس الحكمة مخافة الله', translation: 'The beginning of wisdom is the fear of Allah.', author: 'حكمة إسلامية' },
  { arabic: 'المرء بأصغريه: قلبه ولسانه', translation: 'A person is judged by two small things: his heart and his tongue.', author: 'حكمة عربية' },
  { arabic: 'إذا تم العقل نقص الكلام', translation: 'When intellect is complete, speech decreases.', author: 'حكمة عربية' },
  { arabic: 'العاقل من اتعظ بغيره، والجاهل من اتعظ بنفسه', translation: 'The wise learn from others, the foolish learn from themselves.', author: 'حكمة عربية' },
  { arabic: 'لكل داء دواء يستطب به، إلا الحماقة أعيت من يداويها', translation: 'Every illness has a cure, except foolishness which exhausts those who treat it.', author: 'حكمة عربية' },
  { arabic: 'من جالس العلماء وقر، ومن جالس السفهاء حُقر', translation: 'He who sits with scholars is honored, and he who sits with fools is despised.', author: 'حكمة عربية' },
  { arabic: 'الوقت كالسيف إن لم تقطعه قطعك', translation: 'Time is like a sword: if you do not cut it, it will cut you.', author: 'الإمام الشافعي' },
  { arabic: 'من طلب العلى سهر الليالي', translation: 'He who seeks greatness must endure sleepless nights.', author: 'حكمة عربية' },
  { arabic: 'أحسن إلى الناس تستعبد قلوبهم', translation: 'Be good to people and you will enslave their hearts.', author: 'حكمة عربية' },
];

/**
 * Get quote of the day based on current date (deterministic)
 */
export function getQuoteOfTheDay(): IslamicQuote {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % ISLAMIC_QUOTES.length;
  return ISLAMIC_QUOTES[index];
}

/**
 * Get a random quote (optionally excluding a specific index)
 */
export function getRandomQuote(excludeIndex?: number): { quote: IslamicQuote; index: number } {
  let index: number;
  do {
    index = Math.floor(Math.random() * ISLAMIC_QUOTES.length);
  } while (index === excludeIndex && ISLAMIC_QUOTES.length > 1);
  return { quote: ISLAMIC_QUOTES[index], index };
}

/**
 * Get all quotes
 */
export function getAllQuotes(): IslamicQuote[] {
  return ISLAMIC_QUOTES;
}

// ========================================
// Transliteration map for non-Arabic users
// ========================================

const AUTHOR_EN: Record<string, string> = {
  'أبو بكر الصديق رضي الله عنه': 'Abu Bakr As-Siddiq (may Allah be pleased with him)',
  'عمر بن الخطاب رضي الله عنه': 'Umar ibn Al-Khattab (may Allah be pleased with him)',
  'عثمان بن عفان رضي الله عنه': 'Uthman ibn Affan (may Allah be pleased with him)',
  'علي بن أبي طالب رضي الله عنه': 'Ali ibn Abi Talib (may Allah be pleased with him)',
  'الحسن البصري': 'Al-Hasan Al-Basri',
  'الإمام الشافعي': 'Imam Ash-Shafi\'i',
  'الإمام الغزالي': 'Imam Al-Ghazali',
  'ابن القيم': 'Ibn Al-Qayyim',
  'ابن تيمية': 'Ibn Taymiyyah',
  'حكمة عربية': 'Arabic Proverb',
  'حكمة إسلامية': 'Islamic Wisdom',
  'حكمة نبوية': 'Prophetic Wisdom',
};

/**
 * Get transliterated author name for non-Arabic users
 */
export function getAuthorDisplay(author: string, isArabic: boolean): string {
  if (isArabic) return author;
  return AUTHOR_EN[author] || author;
}

export default ISLAMIC_QUOTES;
