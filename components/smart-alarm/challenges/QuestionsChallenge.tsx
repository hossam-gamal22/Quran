import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import { getLanguage } from '@/lib/i18n';
import type { Difficulty } from '@/lib/smart-alarm/types';

interface Question {
  q: { ar: string; en: string };
  options: { ar: string; en: string }[];
  /** Index of the correct option (0-based) */
  answer: number;
}

const POOL: Question[] = [
  // ── Salah ──
  { q: { ar: 'كم عدد ركعات صلاة الفجر؟', en: 'How many rakahs in Fajr prayer?' },
    options: [{ ar: 'ركعتان', en: 'Two' }, { ar: 'ثلاث', en: 'Three' }, { ar: 'أربع', en: 'Four' }, { ar: 'ركعة', en: 'One' }],
    answer: 0 },
  { q: { ar: 'كم عدد ركعات صلاة الظهر؟', en: 'How many rakahs in Dhuhr?' },
    options: [{ ar: 'ركعتان', en: 'Two' }, { ar: 'ثلاث', en: 'Three' }, { ar: 'أربع', en: 'Four' }, { ar: 'خمس', en: 'Five' }],
    answer: 2 },
  { q: { ar: 'كم عدد ركعات صلاة المغرب؟', en: 'How many rakahs in Maghrib?' },
    options: [{ ar: 'اثنتان', en: 'Two' }, { ar: 'ثلاث', en: 'Three' }, { ar: 'أربع', en: 'Four' }, { ar: 'خمس', en: 'Five' }],
    answer: 1 },
  { q: { ar: 'ما عدد الصلوات المفروضة في اليوم؟', en: 'How many obligatory prayers daily?' },
    options: [{ ar: 'ثلاث', en: 'Three' }, { ar: 'أربع', en: 'Four' }, { ar: 'خمس', en: 'Five' }, { ar: 'ست', en: 'Six' }],
    answer: 2 },
  { q: { ar: 'ماذا قال النبي ﷺ عن صلاة الفجر؟', en: "What did the Prophet ﷺ say about Fajr?" },
    options: [{ ar: 'الصلاة خير من النوم', en: 'Prayer is better than sleep' }, { ar: 'الصلاة عماد الدين', en: 'Prayer is the pillar of religion' }, { ar: 'الصلاة نور', en: 'Prayer is light' }, { ar: 'كل ما سبق', en: 'All of the above' }],
    answer: 3 },
  // ── Quran ──
  { q: { ar: 'ما أول سورة في المصحف؟', en: 'First surah in the Quran?' },
    options: [{ ar: 'البقرة', en: 'Al-Baqarah' }, { ar: 'الفاتحة', en: 'Al-Fatihah' }, { ar: 'العلق', en: 'Al-Alaq' }, { ar: 'يس', en: 'Yaseen' }],
    answer: 1 },
  { q: { ar: 'كم عدد آيات سورة الفاتحة؟', en: 'How many verses in Al-Fatihah?' },
    options: [{ ar: 'خمس', en: 'Five' }, { ar: 'ست', en: 'Six' }, { ar: 'سبع', en: 'Seven' }, { ar: 'ثمان', en: 'Eight' }],
    answer: 2 },
  { q: { ar: 'ما أطول سورة في القرآن؟', en: 'Longest surah in the Quran?' },
    options: [{ ar: 'البقرة', en: 'Al-Baqarah' }, { ar: 'آل عمران', en: 'Al-Imran' }, { ar: 'النساء', en: 'An-Nisa' }, { ar: 'المائدة', en: 'Al-Maidah' }],
    answer: 0 },
  { q: { ar: 'ما أقصر سورة في القرآن؟', en: 'Shortest surah in the Quran?' },
    options: [{ ar: 'الإخلاص', en: 'Al-Ikhlas' }, { ar: 'الكوثر', en: 'Al-Kawthar' }, { ar: 'الناس', en: 'An-Nas' }, { ar: 'الفلق', en: 'Al-Falaq' }],
    answer: 1 },
  { q: { ar: 'كم عدد سور القرآن؟', en: 'How many surahs in the Quran?' },
    options: [{ ar: '112', en: '112' }, { ar: '113', en: '113' }, { ar: '114', en: '114' }, { ar: '115', en: '115' }],
    answer: 2 },
  { q: { ar: 'كم عدد أجزاء القرآن؟', en: 'How many juz in the Quran?' },
    options: [{ ar: '25', en: '25' }, { ar: '28', en: '28' }, { ar: '30', en: '30' }, { ar: '33', en: '33' }],
    answer: 2 },
  { q: { ar: 'في أي شهر نزل القرآن؟', en: 'In which month was the Quran revealed?' },
    options: [{ ar: 'شعبان', en: "Sha'ban" }, { ar: 'ذو الحجة', en: 'Dhul-Hijjah' }, { ar: 'محرم', en: 'Muharram' }, { ar: 'رمضان', en: 'Ramadan' }],
    answer: 3 },
  // ── Pillars & beliefs ──
  { q: { ar: 'كم عدد أركان الإسلام؟', en: 'How many pillars of Islam?' },
    options: [{ ar: 'ثلاثة', en: 'Three' }, { ar: 'أربعة', en: 'Four' }, { ar: 'خمسة', en: 'Five' }, { ar: 'ستة', en: 'Six' }],
    answer: 2 },
  { q: { ar: 'كم عدد أركان الإيمان؟', en: 'How many pillars of Iman?' },
    options: [{ ar: 'خمسة', en: 'Five' }, { ar: 'ستة', en: 'Six' }, { ar: 'سبعة', en: 'Seven' }, { ar: 'ثمانية', en: 'Eight' }],
    answer: 1 },
  { q: { ar: 'ما أول ركن من أركان الإسلام؟', en: 'First pillar of Islam?' },
    options: [{ ar: 'الصلاة', en: 'Prayer' }, { ar: 'الزكاة', en: 'Zakat' }, { ar: 'الصوم', en: 'Fasting' }, { ar: 'الشهادتان', en: 'Shahada' }],
    answer: 3 },
  { q: { ar: 'كم عدد أبواب الجنة؟', en: 'How many gates does Paradise have?' },
    options: [{ ar: 'سبعة', en: 'Seven' }, { ar: 'ثمانية', en: 'Eight' }, { ar: 'تسعة', en: 'Nine' }, { ar: 'عشرة', en: 'Ten' }],
    answer: 1 },
  // ── Prophet ﷺ ──
  { q: { ar: 'ما اسم أم النبي ﷺ؟', en: "Name of the Prophet ﷺ's mother?" },
    options: [{ ar: 'آمنة بنت وهب', en: 'Aminah bint Wahb' }, { ar: 'خديجة', en: 'Khadijah' }, { ar: 'حليمة السعدية', en: 'Halimah al-Saadiyyah' }, { ar: 'فاطمة', en: 'Fatimah' }],
    answer: 0 },
  { q: { ar: 'ما اسم جد النبي ﷺ؟', en: "Name of the Prophet ﷺ's grandfather?" },
    options: [{ ar: 'أبو طالب', en: 'Abu Talib' }, { ar: 'عبد المطلب', en: 'Abdul-Muttalib' }, { ar: 'هاشم', en: 'Hashim' }, { ar: 'عبد مناف', en: 'Abd Manaf' }],
    answer: 1 },
  { q: { ar: 'ما اسم أول زوجة للنبي ﷺ؟', en: "Name of the Prophet ﷺ's first wife?" },
    options: [{ ar: 'عائشة', en: 'Aisha' }, { ar: 'حفصة', en: 'Hafsa' }, { ar: 'خديجة', en: 'Khadijah' }, { ar: 'سودة', en: 'Sawda' }],
    answer: 2 },
  { q: { ar: 'في أي مدينة وُلد النبي ﷺ؟', en: 'In which city was the Prophet ﷺ born?' },
    options: [{ ar: 'المدينة', en: 'Madinah' }, { ar: 'مكة', en: 'Makkah' }, { ar: 'الطائف', en: "Ta'if" }, { ar: 'القدس', en: 'Jerusalem' }],
    answer: 1 },
  { q: { ar: 'كم سنة استمرت الدعوة المكية؟', en: 'How many years was the Makkan call?' },
    options: [{ ar: '10 سنوات', en: '10 years' }, { ar: '13 سنة', en: '13 years' }, { ar: '15 سنة', en: '15 years' }, { ar: '20 سنة', en: '20 years' }],
    answer: 1 },
  { q: { ar: 'إلى أين هاجر النبي ﷺ؟', en: 'Where did the Prophet ﷺ emigrate to?' },
    options: [{ ar: 'الحبشة', en: 'Abyssinia' }, { ar: 'الطائف', en: "Ta'if" }, { ar: 'المدينة', en: 'Madinah' }, { ar: 'اليمن', en: 'Yemen' }],
    answer: 2 },
  // ── Sahabah ──
  { q: { ar: 'من أول الخلفاء الراشدين؟', en: 'First of the Rightly-Guided Caliphs?' },
    options: [{ ar: 'عمر', en: 'Umar' }, { ar: 'عثمان', en: 'Uthman' }, { ar: 'أبو بكر', en: 'Abu Bakr' }, { ar: 'علي', en: 'Ali' }],
    answer: 2 },
  { q: { ar: 'من جامع القرآن في مصحف واحد؟', en: 'Who compiled the Quran into one mushaf?' },
    options: [{ ar: 'أبو بكر', en: 'Abu Bakr' }, { ar: 'عمر', en: 'Umar' }, { ar: 'عثمان', en: 'Uthman' }, { ar: 'علي', en: 'Ali' }],
    answer: 2 },
  { q: { ar: 'من هو "الفاروق"؟', en: 'Who is "Al-Faruq"?' },
    options: [{ ar: 'أبو بكر', en: 'Abu Bakr' }, { ar: 'عمر بن الخطاب', en: 'Umar ibn Al-Khattab' }, { ar: 'عثمان بن عفان', en: 'Uthman ibn Affan' }, { ar: 'علي بن أبي طالب', en: 'Ali ibn Abi Talib' }],
    answer: 1 },
  // ── Qiblah, Eid, Hajj ──
  { q: { ar: 'ما القبلة الأولى للمسلمين؟', en: 'First qiblah of the Muslims?' },
    options: [{ ar: 'الكعبة', en: "Al-Ka'bah" }, { ar: 'بيت المقدس', en: 'Bayt al-Maqdis' }, { ar: 'مسجد قباء', en: "Quba' Mosque" }, { ar: 'المسجد النبوي', en: "Prophet's Mosque" }],
    answer: 1 },
  { q: { ar: 'متى يكون يوم عرفة؟', en: 'When is the Day of Arafah?' },
    options: [{ ar: '8 ذي الحجة', en: '8 Dhul-Hijjah' }, { ar: '9 ذي الحجة', en: '9 Dhul-Hijjah' }, { ar: '10 ذي الحجة', en: '10 Dhul-Hijjah' }, { ar: '11 ذي الحجة', en: '11 Dhul-Hijjah' }],
    answer: 1 },
  { q: { ar: 'كم شوطًا في طواف الكعبة؟', en: 'How many rounds in Tawaf around the Kaaba?' },
    options: [{ ar: 'خمسة', en: 'Five' }, { ar: 'ستة', en: 'Six' }, { ar: 'سبعة', en: 'Seven' }, { ar: 'ثمانية', en: 'Eight' }],
    answer: 2 },
  { q: { ar: 'في أي شهر يكون الحج؟', en: 'In which month is Hajj performed?' },
    options: [{ ar: 'شوال', en: 'Shawwal' }, { ar: 'ذو القعدة', en: "Dhul-Qi'dah" }, { ar: 'ذو الحجة', en: 'Dhul-Hijjah' }, { ar: 'محرم', en: 'Muharram' }],
    answer: 2 },
  // ── Zakat, fasting, dhikr ──
  { q: { ar: 'كم نصاب زكاة الذهب تقريبًا؟', en: 'Approximate Zakat threshold for gold?' },
    options: [{ ar: '50 جرام', en: '50 g' }, { ar: '85 جرام', en: '85 g' }, { ar: '100 جرام', en: '100 g' }, { ar: '200 جرام', en: '200 g' }],
    answer: 1 },
  { q: { ar: 'متى تجب زكاة الفطر؟', en: 'When is Zakat al-Fitr due?' },
    options: [{ ar: 'أول رمضان', en: 'Start of Ramadan' }, { ar: 'منتصف رمضان', en: 'Mid Ramadan' }, { ar: 'قبل صلاة العيد', en: 'Before Eid prayer' }, { ar: 'بعد عيد الأضحى', en: 'After Eid al-Adha' }],
    answer: 2 },
  { q: { ar: 'كم تكبيرة في صلاة العيد للركعة الأولى؟', en: 'Takbirat in first rakah of Eid prayer?' },
    options: [{ ar: 'خمس', en: 'Five' }, { ar: 'ست', en: 'Six' }, { ar: 'سبع', en: 'Seven' }, { ar: 'ثمان', en: 'Eight' }],
    answer: 2 },
];

function questionsRequired(d: Difficulty): number {
  switch (d) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
  }
}

function pickQuestions(n: number): Question[] {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

interface QuestionsChallengeProps {
  difficulty: Difficulty;
  onSolved: () => void;
}

export function QuestionsChallenge({ difficulty, onSolved }: QuestionsChallengeProps) {
  const target = questionsRequired(difficulty);
  const [questions, setQuestions] = useState<Question[]>(() => pickQuestions(target));
  const [step, setStep] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const lang = getLanguage();
  const isAr = lang === 'ar';

  const current = questions[step];

  const onPick = useCallback(
    (idx: number) => {
      if (!current) return;
      if (idx === current.answer) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (step + 1 >= target) {
          onSolved();
        } else {
          setStep((s) => s + 1);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setWrongFlash(idx);
        setTimeout(() => setWrongFlash(null), 400);
        // Reroll the current question with a different one
        setQuestions((qs) => {
          const next = [...qs];
          const used = new Set(qs.map((q) => q.q.en));
          const candidates = POOL.filter((q) => !used.has(q.q.en));
          if (candidates.length > 0) {
            next[step] = candidates[Math.floor(Math.random() * candidates.length)];
          }
          return next;
        });
      }
    },
    [current, step, target, onSolved],
  );

  if (!current) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.progressLabel}>
        {step + 1} / {target}
      </Text>
      <View style={styles.questionBox}>
        <Text
          style={[
            styles.questionText,
            { textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' },
          ]}
        >
          {current.q[isAr ? 'ar' : 'en']}
        </Text>
      </View>
      <View style={styles.optionsCol}>
        {current.options.map((opt, idx) => (
          <TouchableOpacity
            key={`${step}-${idx}`}
            onPress={() => onPick(idx)}
            activeOpacity={0.7}
            style={[
              styles.optionBtn,
              wrongFlash === idx && styles.optionBtnWrong,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                { textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' },
              ]}
            >
              {opt[isAr ? 'ar' : 'en']}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingVertical: 8 },
  progressLabel: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 8,
    writingDirection: 'ltr',
  },
  questionBox: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    lineHeight: 30,
  },
  optionsCol: { gap: 10 },
  optionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  optionBtnWrong: { borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.15)' },
  optionText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: '#FFFFFF',
  },
});
