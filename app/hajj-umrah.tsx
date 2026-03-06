// app/hajj-umrah.tsx
// صفحة مناسك الحج والعمرة - ثابتة دائماً

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassSegmentedControl } from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');

// ========================================
// البيانات
// ========================================

const HAJJ_STEPS = [
  {
    id: 1,
    title: 'الإحرام',
    description: 'يبدأ الحاج بالاغتسال والتطيب ولبس ثياب الإحرام (إزار ورداء أبيضين للرجال) عند الميقات المحدد. ثم ينوي الحج بقلبه ويلبي: "لبيك اللهم حجاً". يجب تجنب محظورات الإحرام كقص الشعر والأظافر والطيب وتغطية الرأس للرجال.',
    dua: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
    icon: 'human-handsup',
  },
  {
    id: 2,
    title: 'طواف القدوم',
    description: 'عند الوصول إلى مكة المكرمة يطوف الحاج حول الكعبة سبعة أشواط بدءاً من الحجر الأسود. يُسن الاضطباع (كشف الكتف الأيمن) والرَّمَل (الإسراع في المشي) في الأشواط الثلاثة الأولى. يصلي ركعتين خلف مقام إبراهيم بعد الطواف ويشرب من ماء زمزم.',
    dua: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    icon: 'rotate-3d-variant',
  },
  {
    id: 3,
    title: 'السعي بين الصفا والمروة',
    description: 'يسعى الحاج سبعة أشواط بين جبلي الصفا والمروة اقتداءً بالسيدة هاجر عليها السلام. يبدأ من الصفا وينتهي بالمروة. يُسن للرجال الهرولة (الإسراع) بين العلمين الأخضرين. يدعو الله عند الصعود على كل من الصفا والمروة.',
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ، أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
    icon: 'walk',
  },
  {
    id: 4,
    title: 'يوم التروية (٨ ذو الحجة)',
    description: 'في اليوم الثامن من ذي الحجة يتوجه الحاج إلى منى مُحرِماً ويبيت بها. يصلي الظهر والعصر والمغرب والعشاء والفجر قصراً دون جمع، كلٌ في وقتها. يُكثر من الذكر والتلبية والدعاء استعداداً ليوم عرفة.',
    dua: 'اللَّهُمَّ هَذِهِ مِنَى فَامْنُنْ عَلَيَّ بِمَا مَنَنْتَ بِهِ عَلَى أَوْلِيَائِكَ وَأَهْلِ طَاعَتِكَ',
    icon: 'tent',
  },
  {
    id: 5,
    title: 'الوقوف بعرفة (٩ ذو الحجة)',
    description: 'ركن الحج الأعظم الذي لا يصح الحج بدونه. قال النبي ﷺ: "الحج عرفة". يقف الحاج بعرفة من بعد الزوال إلى غروب الشمس، ويُكثر من الدعاء والذكر والاستغفار والتلبية. يُجمع صلاتي الظهر والعصر جمع تقديم مع القصر.',
    dua: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    icon: 'mountain',
  },
  {
    id: 6,
    title: 'المبيت بمزدلفة',
    description: 'بعد غروب شمس يوم عرفة ينفر الحاج إلى مزدلفة. يجمع صلاتي المغرب والعشاء جمع تأخير مع القصر. يبيت بمزدلفة ويصلي الفجر في أول وقتها، ثم يقف عند المشعر الحرام فيذكر الله ويدعوه. يجمع سبع حصيات أو أكثر لرمي الجمرات.',
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ أَنْ تَرْزُقَنِيَ جَوَامِعَ الْخَيْرِ، وَأَعُوذُ بِكَ مِنْ سُوءِ الْقَضَاءِ',
    icon: 'weather-night',
  },
  {
    id: 7,
    title: 'رمي جمرة العقبة (١٠ ذو الحجة)',
    description: 'يوم النحر (عيد الأضحى). يرمي الحاج جمرة العقبة الكبرى بسبع حصيات متتابعات، يُكبِّر مع كل حصاة "بسم الله، الله أكبر". يرمي بعد طلوع الشمس ويقطع التلبية عند أول حصاة.',
    dua: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ، اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا',
    icon: 'bullseye-arrow',
  },
  {
    id: 8,
    title: 'النحر والحلق أو التقصير',
    description: 'يذبح الحاج هديه (واجب على المتمتع والقارن) بعد رمي جمرة العقبة. ثم يحلق رأسه أو يقصر شعره (الحلق أفضل للرجال). المرأة تقص من أطراف شعرها قدر أنملة. بعد ذلك يحصل التحلل الأول فيباح كل شيء إلا الجماع.',
    dua: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ تَقَبَّلْ مِنِّي',
    icon: 'content-cut',
  },
  {
    id: 9,
    title: 'طواف الإفاضة والسعي',
    description: 'ركن من أركان الحج لا يصح بدونه. يطوف الحاج حول الكعبة سبعة أشواط ثم يسعى بين الصفا والمروة إن لم يكن سعى بعد طواف القدوم. بعد هذا الطواف يحصل التحلل الثاني فيحل له كل شيء حتى الجماع.',
    dua: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    icon: 'kabaddi',
  },
  {
    id: 10,
    title: 'أيام التشريق (١١-١٢-١٣ ذو الحجة)',
    description: 'يبيت الحاج بمنى ليالي أيام التشريق. يرمي الجمرات الثلاث كل يوم بعد الزوال: الصغرى ثم الوسطى ثم الكبرى، كل واحدة بسبع حصيات. يقف بعد الجمرة الصغرى والوسطى ليدعو. يجوز التعجل فينفر في اليوم الثاني عشر قبل الغروب.',
    dua: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا وَعَمَلًا صَالِحًا مَقْبُولًا',
    icon: 'calendar-range',
  },
  {
    id: 11,
    title: 'طواف الوداع',
    description: 'آخر ما يفعله الحاج قبل مغادرة مكة المكرمة. يطوف حول الكعبة سبعة أشواط وداعاً للبيت الحرام. واجب على غير الحائض والنفساء. يُستحب الدعاء والوقوف عند الملتزم (بين الحجر الأسود والباب) للتضرع إلى الله.',
    dua: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ',
    icon: 'exit-run',
  },
];

const UMRAH_STEPS = [
  {
    id: 1,
    title: 'الإحرام',
    description: 'يغتسل المعتمر ويتطيب ويلبس ثياب الإحرام عند الميقات المحدد (ذو الحليفة لأهل المدينة، الجحفة لأهل الشام، يلملم لأهل اليمن، قرن المنازل لأهل نجد). ينوي العمرة بقلبه ويقول: "لبيك اللهم عمرة" ثم يُكثر من التلبية حتى يصل الحرم.',
    dua: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ',
    icon: 'human-handsup',
  },
  {
    id: 2,
    title: 'الطواف',
    description: 'يطوف المعتمر حول الكعبة سبعة أشواط بدءاً من الحجر الأسود جاعلاً الكعبة عن يساره. يُستحب استلام الحجر الأسود وتقبيله إن تيسر، أو الإشارة إليه من بعيد. يُسن الاضطباع في جميع الأشواط والرَّمَل في الأشواط الثلاثة الأولى. يردد في دعائه ما شاء.',
    dua: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    icon: 'rotate-3d-variant',
  },
  {
    id: 3,
    title: 'صلاة ركعتين خلف المقام',
    description: 'بعد إتمام الطواف يصلي المعتمر ركعتين خلف مقام إبراهيم إن تيسر، وإلا في أي مكان من الحرم. يقرأ في الركعة الأولى سورة الكافرون وفي الثانية سورة الإخلاص. ثم يشرب من ماء زمزم ويدعو بما شاء.',
    dua: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى',
    icon: 'human-handsdown',
  },
  {
    id: 4,
    title: 'السعي بين الصفا والمروة',
    description: 'يسعى سبعة أشواط بين الصفا والمروة بدءاً من الصفا. يصعد على الصفا فيرى الكعبة ويُكبِّر ويدعو، ثم يمشي إلى المروة. يُسن الهرولة بين العلمين الأخضرين للرجال. المروة هي نهاية الشوط السابع.',
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ، أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
    icon: 'walk',
  },
  {
    id: 5,
    title: 'الحلق أو التقصير',
    description: 'بعد إكمال السعي يحلق الرجل رأسه أو يقصر شعره (الحلق أفضل). المرأة تقص من أطراف شعرها قدر أنملة (حوالي ٢ سم). بعد ذلك تتم العمرة ويحل للمعتمر كل ما حُرِّم عليه بالإحرام.',
    dua: 'الْحَمْدُ لِلَّهِ الَّذِي قَضَى عَنِّي نُسُكِي، اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً وَذَنْبًا مَغْفُورًا',
    icon: 'content-cut',
  },
];

const DUAS = [
  {
    title: 'دعاء رؤية الكعبة',
    text: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً، وَزِدْ مَنْ شَرَّفَهُ وَكَرَّمَهُ مِمَّنْ حَجَّهُ أَوِ اعْتَمَرَهُ تَشْرِيفًا وَتَكْرِيمًا وَتَعْظِيمًا وَبِرًّا',
  },
  {
    title: 'دعاء بين الركن اليماني والحجر الأسود',
    text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
  },
  {
    title: 'دعاء الطواف',
    text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
  },
  {
    title: 'دعاء السعي على الصفا',
    text: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  },
  {
    title: 'دعاء يوم عرفة',
    text: 'خَيْرُ الدُّعَاءِ دُعَاءُ يَوْمِ عَرَفَةَ، وَخَيْرُ مَا قُلْتُ أَنَا وَالنَّبِيُّونَ مِنْ قَبْلِي: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  },
  {
    title: 'دعاء عند رمي الجمرات',
    text: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ، اللَّهُمَّ اجْعَلْ حَجِّي مَبْرُورًا وَذَنْبِي مَغْفُورًا وَسَعْيِي مَشْكُورًا',
  },
  {
    title: 'دعاء عند شرب زمزم',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
  },
  {
    title: 'دعاء الوقوف عند الملتزم',
    text: 'اللَّهُمَّ يَا رَبَّ الْبَيْتِ الْعَتِيقِ، أَعْتِقْ رِقَابَنَا وَرِقَابَ آبَائِنَا وَأُمَّهَاتِنَا وَإِخْوَانِنَا وَأَوْلَادِنَا مِنَ النَّارِ يَا ذَا الْجُودِ وَالْكَرَمِ وَالْفَضْلِ وَالْمَنِّ وَالْعَطَاءِ وَالْإِحْسَانِ',
  },
];

// ========================================
// مكون الخطوة
// ========================================

interface StepCardProps {
  step: typeof HAJJ_STEPS[0];
  index: number;
  isDarkMode: boolean;
  isExpanded: boolean;
  onPress: () => void;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  isDarkMode,
  isExpanded,
  onPress,
}) => {
  return (
    <Pressable onPress={onPress} style={styles.stepCardOuter}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 50 : 25}
        tint={isDarkMode ? 'dark' : 'light'}
        style={styles.stepCardBlur}
      >
      <View style={[
        styles.stepCard,
        isDarkMode && styles.stepCardDark,
        isExpanded && styles.stepCardExpanded,
      ]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumber, { backgroundColor: '#2f7659' }]}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, isDarkMode && styles.textLight]}>
              {step.title}
            </Text>
            <Text style={[styles.stepDescription, isDarkMode && styles.textMuted]}>
              {step.description}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={step.icon as any}
            size={28}
            color="#2f7659"
          />
        </View>
        
        {isExpanded && (
          <View style={styles.stepDua}>
            <Text style={[styles.duaLabel, isDarkMode && styles.textMuted]}>
              الدعاء:
            </Text>
            <Text style={[styles.duaText, isDarkMode && styles.textLight]}>
              {step.dua}
            </Text>
          </View>
        )}
      </View>
      </BlurView>
    </Pressable>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function HajjUmrahScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'hajj' | 'umrah' | 'duas'>('hajj');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const steps = activeTab === 'hajj' ? HAJJ_STEPS : UMRAH_STEPS;

  const handleTabChange = (tab: 'hajj' | 'umrah' | 'duas') => {
    setActiveTab(tab);
    setExpandedStep(null);
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* الهيدر */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: 'rgba(120,120,128,0.18)', borderRadius: 14 }]}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </Pressable>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            مناسك الحج والعمرة
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* التابات */}
        <View style={styles.tabsContainer}>
          <GlassSegmentedControl
            segments={[
              { key: 'hajj', label: 'الحج', icon: 'star-crescent' },
              { key: 'umrah', label: 'العمرة', icon: 'star-crescent' },
              { key: 'duas', label: 'الأدعية', icon: 'hand-heart' },
            ]}
            selected={activeTab}
            onSelect={(key) => handleTabChange(key as 'hajj' | 'umrah' | 'duas')}
          />
        </View>

        {/* المحتوى */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {activeTab === 'duas' ? (
            // الأدعية
            DUAS.map((dua, index) => (
              <View
                key={index}
                style={[styles.duaCard, isDarkMode && styles.duaCardDark]}
              >
                <Text style={[styles.duaCardTitle, isDarkMode && styles.textLight]}>
                  {dua.title}
                </Text>
                <Text style={[styles.duaCardText, isDarkMode && styles.textLight]}>
                  {dua.text}
                </Text>
              </View>
            ))
          ) : (
            // خطوات الحج أو العمرة
            steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isDarkMode={isDarkMode}
                isExpanded={expandedStep === step.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedStep(expandedStep === step.id ? null : step.id);
                }}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  safeArea: {
    flex: 1,
  },
  
  // الهيدر
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 20,
    color: '#333',
  },
  
  // التابات
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(120,120,128,0.15)',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: 'rgba(47,118,89,0.85)',
    borderColor: 'rgba(47,118,89,0.4)',
  },
  tabText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: '#2f7659',
  },
  tabTextActive: {
    color: '#fff',
  },
  
  // المحتوى
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  
  // كارت الخطوة
  stepCardOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stepCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  stepCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepCardDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  stepCardExpanded: {
    borderColor: '#2f7659',
    borderWidth: 1.5,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  stepNumberText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 15,
    color: '#fff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 17,
    color: '#333',
    lineHeight: 26,
  },
  stepDescription: {
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    lineHeight: 26,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  stepDua: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(47,118,89,0.25)',
  },
  duaLabel: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: '#2f7659',
    marginBottom: 10,
  },
  duaText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 17,
    color: '#333',
    lineHeight: 32,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  
  // كارت الدعاء
  duaCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  duaCardDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  duaCardTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 17,
    color: '#2f7659',
    marginBottom: 14,
  },
  duaCardText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 19,
    color: '#333',
    lineHeight: 36,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  
  // النصوص
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#B8B8B8',
  },
});
