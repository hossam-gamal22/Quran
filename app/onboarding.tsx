// app/onboarding.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme-provider";
import { BORDER_RADIUS, SPACING, FONT_SIZES } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "@onboarding_done_v2";

// دوال للتحقق من حالة الـ onboarding
export async function isOnboardingDone(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return true;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {}
}

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: [string, string, string];
}

const SLIDES: Slide[] = [
  {
    id: "1",
    emoji: "🕌",
    title: "أهلاً بك في أذكاري",
    subtitle: "رفيقك الإيماني اليومي",
    description: "تطبيق شامل للأذكار والقرآن الكريم وأوقات الصلاة",
    gradient: ["#0D2B2B", "#1B8A8A", "#0D2B2B"],
  },
  {
    id: "2",
    emoji: "📖",
    title: "القرآن الكريم",
    subtitle: "اقرأ واستمع وتدبر",
    description: "قراءة سهلة مع تفسير وترجمات متعددة وتلاوات بأصوات مختلفة",
    gradient: ["#1B4B5A", "#2DB3B3", "#1B4B5A"],
  },
  {
    id: "3",
    emoji: "🤲",
    title: "الأذكار والأدعية",
    subtitle: "حصّن نفسك بذكر الله",
    description: "أذكار الصباح والمساء والنوم وأدعية من القرآن والسنة",
    gradient: ["#2D1B4B", "#7C4DFF", "#2D1B4B"],
  },
  {
    id: "4",
    emoji: "🕐",
    title: "أوقات الصلاة",
    subtitle: "لا تفوّت صلاة أبداً",
    description: "مواقيت دقيقة مع تنبيهات واتجاه القبلة والتقويم الهجري",
    gradient: ["#1B3D2F", "#00BFA5", "#1B3D2F"],
  },
  {
    id: "5",
    emoji: "✨",
    title: "ابدأ رحلتك",
    subtitle: "جاهز للانطلاق",
    description: "اللهم اجعل هذا التطبيق نافعاً لي ولجميع المسلمين",
    gradient: ["#3D2B1B", "#D4AF37", "#3D2B1B"],
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleFinish();
  };

  const handleFinish = async () => {
    await markOnboardingDone();
    router.replace("/(tabs)");
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <LinearGradient
        colors={item.gradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.slideContent}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => {
        const inputRange = [
          (index - 1) * SCREEN_WIDTH,
          index * SCREEN_WIDTH,
          (index + 1) * SCREEN_WIDTH,
        ];
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.8, 1.2, 0.8],
          extrapolate: "clamp",
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: "#FFFFFF",
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {renderDots()}

        <View style={styles.buttonsContainer}>
          {currentIndex < SLIDES.length - 1 ? (
            <>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>تخطي</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextText}>التالي</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: "#D4AF37" }]}
              onPress={handleFinish}
            >
              <Text style={styles.startText}>ابدأ الآن</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1F1F",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  skipText: {
    fontSize: FONT_SIZES.md,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
  },
  nextText: {
    fontSize: FONT_SIZES.md,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  startButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
  },
  startText: {
    fontSize: FONT_SIZES.lg,
    color: "#1A1A1A",
    fontWeight: "700",
  },
});
