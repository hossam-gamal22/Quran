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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

// ========================================
// البيانات
// ========================================

const HAJJ_STEPS = [
  {
    id: 1,
    title: 'الإحرام',
    description: 'النية والتلبية من الميقات',
    dua: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
    icon: 'human-handsup',
  },
  {
    id: 2,
    title: 'الطواف',
    description: '7 أشواط حول الكعبة',
    dua: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    icon: 'rotate-3d-variant',
  },
  {
    id: 3,
    title: 'السعي',
    description: '7 أشواط بين الصفا والمروة',
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ',
    icon: 'walk',
  },
  {
    id: 4,
    title: 'يوم التروية',
    description: 'التوجه إلى منى (8 ذو الحجة)',
    dua: 'اللَّهُمَّ هَذِهِ مِنَى فَامْنُنْ عَلَيَّ بِمَا مَنَنْتَ بِهِ عَلَى أَوْلِيَائِكَ',
    icon: 'tent',
  },
  {
    id: 5,
    title: 'الوقوف بعرفة',
    description: 'ركن الحج الأعظم (9 ذو الحجة)',
    dua: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    icon: 'mountain',
  },
  {
    id: 6,
    title: 'المبيت بمزدلفة',
    description: 'جمع الجمرات والمبيت',
    dua: 'اللَّهُمَّ هَذِهِ مُزْدَلِفَةُ جُمِعَتْ فِيهَا أَلْسُنٌ مُخْتَلِفَةٌ',
    icon: 'weather-night',
  },
  {
    id: 7,
    title: 'رمي الجمرات',
    description: 'رمي جمرة العقبة الكبرى',
    dua: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ',
    icon: 'bullseye-arrow',
  },
  {
    id: 8,
    title: 'الهدي والحلق',
    description: 'ذبح الهدي والحلق أو التقصير',
    dua: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ مِنْكَ وَلَكَ',
    icon: 'content-cut',
  },
  {
    id: 9,
    title: 'طواف الإفاضة',
    description: 'ركن من أركان الحج',
    dua: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    icon: 'kabaddi',
  },
  {
    id: 10,
    title: 'أيام التشريق',
    description: 'المبيت بمنى ورمي الجمرات',
    dua: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا',
    icon: 'calendar-range',
  },
  {
    id: 11,
    title: 'طواف الوداع',
    description: 'آخر عهد بالبيت الحرام',
    dua: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ',
    icon: 'exit-run',
  },
];

const UMRAH_STEPS = [
  {
    id: 1,
    title: 'الإحرام',
    description: 'النية والتلبية من الميقات',
    dua: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
    icon: 'human-handsup',
  },
  {
    id: 2,
    title: 'الطواف',
    description: '7 أشواط حول الكعبة',
    dua: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    icon: 'rotate-3d-variant',
  },
  {
    id: 3,
    title: 'صلاة ركعتين',
    description: 'خلف مقام إبراهيم',
    dua: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى',
    icon: 'human-handsdown',
  },
  {
    id: 4,
    title: 'السعي',
    description: '7 أشواط بين الصفا والمروة',
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ',
    icon: 'walk',
  },
  {
    id: 5,
    title: 'الحلق أو التقصير',
    description: 'التحلل من العمرة',
    dua: 'الْحَمْدُ لِلَّهِ الَّذِي قَضَى عَنِّي نُسُكِي',
    icon: 'content-cut',
  },
];

const DUAS = [
  {
    title: 'دعاء رؤية الكعبة',
    text: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً، وَزِدْ مَنْ شَرَّفَهُ وَكَرَّمَهُ مِمَّنْ حَجَّهُ أَوِ اعْتَمَرَهُ تَشْرِيفًا وَتَكْرِيمًا وَتَعْظِيمًا وَبِرًّا',
  },
  {
    title: 'دعاء الطواف',
    text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  },
  {
    title: 'دعاء السعي',
    text: 'رَبِّ اغْفِرْ وَارْحَمْ وَاعْفُ وَتَكَرَّمْ وَتَجَاوَزْ عَمَّا تَعْلَمُ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ',
  },
  {
    title: 'دعاء يوم عرفة',
    text: 'خَيْرُ الدُّعَاءِ دُعَاءُ يَوْمِ عَرَفَةَ، وَخَيْرُ مَا قُلْتُ أَنَا وَالنَّبِيُّونَ مِنْ قَبْلِي: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
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
    <Pressable onPress={onPress}>
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
    </Pressable>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function HajjUmrahScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const [activeTab, setActiveTab] = useState<'hajj' | 'umrah' | 'duas'>('hajj');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const steps = activeTab === 'hajj' ? HAJJ_STEPS : UMRAH_STEPS;

  const handleTabChange = (tab: 'hajj' | 'umrah' | 'duas') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setExpandedStep(null);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <SafeAreaView style={styles.safeArea}>
        {/* الهيدر */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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
          {[
            { id: 'hajj', label: 'الحج', icon: 'kaaba' },
            { id: 'umrah', label: 'العمرة', icon: 'star-crescent' },
            { id: 'duas', label: 'الأدعية', icon: 'hand-heart' },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => handleTabChange(tab.id as any)}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
              ]}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#fff' : '#2f7659'}
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
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
    </View>
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
    borderRadius: 12,
    backgroundColor: 'rgba(47,118,89,0.1)',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#2f7659',
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
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepCardDark: {
    backgroundColor: '#1a2332',
  },
  stepCardExpanded: {
    borderColor: '#2f7659',
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  stepNumberText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    color: '#fff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
    color: '#333',
  },
  stepDescription: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  stepDua: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(47,118,89,0.2)',
  },
  duaLabel: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  duaText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 16,
    color: '#333',
    lineHeight: 28,
    textAlign: 'right',
  },
  
  // كارت الدعاء
  duaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  duaCardDark: {
    backgroundColor: '#1a2332',
  },
  duaCardTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
    color: '#2f7659',
    marginBottom: 12,
  },
  duaCardText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 18,
    color: '#333',
    lineHeight: 32,
    textAlign: 'right',
  },
  
  // النصوص
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
});
