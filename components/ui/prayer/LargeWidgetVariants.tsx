import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import CircularAnalogClock from './CircularAnalogClock';

interface PrayerTime {
  name: string;
  time: string;
  isNext?: boolean;
}

interface LargeWidgetVariantsProps {
  variant?: 'next' | 'schedule';
  nextPrayer?: PrayerTime;
  schedule?: PrayerTime[];
}

const LargeWidgetVariants: React.FC<LargeWidgetVariantsProps> = ({
  variant = 'next',
  nextPrayer = { name: 'الفجر', time: '04:12', isNext: true },
  schedule = [
    { name: 'الفجر', time: '04:12' },
    { name: 'الظهر', time: '12:03' },
    { name: 'العصر', time: '15:27' },
    { name: 'المغرب', time: '18:45' },
    { name: 'العشاء', time: '20:00' },
  ],
}) => {
  if (variant === 'schedule') {
    return (
      <BlurView intensity={60} tint="default" style={styles.container}>
        <Text style={styles.header}>مواقيت اليوم</Text>
        <View style={styles.scheduleList}>
          {schedule.map((p) => (
            <View
              key={p.name}
              style={[styles.scheduleRow, p.name === nextPrayer.name && styles.nextRow]}
            >
              <Text style={[styles.scheduleName, p.name === nextPrayer.name && styles.nextName]}>{p.name}</Text>
              <Text style={[styles.scheduleTime, p.name === nextPrayer.name && styles.nextTime]}>{p.time}</Text>
            </View>
          ))}
        </View>
      </BlurView>
    );
  }

  // Next Prayer Focus
  return (
    <BlurView intensity={70} tint="default" style={styles.container}>
      <View style={styles.nextRowMain}>
        <View style={styles.nextLeft}>
          <View style={styles.iconBubble} />
          <Text style={styles.prayerName}>{nextPrayer.name}</Text>
        </View>

        <View style={styles.nextCenter}>
          <CircularAnalogClock size={120} timeLabel={nextPrayer.time} />
          <Text style={styles.countdownLabel}>باقي على الأذان</Text>
        </View>

        <View style={styles.nextRight}>
          <TouchableOpacity style={styles.pill}>
            <Text style={styles.pillText}>التذكير</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    color: '#eafbf4',
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    marginBottom: 12,
    textAlign: 'left',
  },
  scheduleList: {
    width: '100%',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  nextRow: {
    backgroundColor: 'rgba(126,249,222,0.06)',
    borderRadius: 10,
  },
  scheduleName: { color: '#dffbf4', fontSize: 16, fontFamily: 'Cairo-Medium' },
  scheduleTime: { color: '#ffffff', fontSize: 16, fontFamily: 'Cairo-Bold' },
  nextName: { color: '#0b3f34' },
  nextTime: { color: '#0b3f34' },

  nextRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLeft: { width: 120, alignItems: 'center' },
  iconBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 8 },
  prayerName: { color: '#eafbf4', fontSize: 16, fontFamily: 'Cairo-Bold' },
  nextCenter: { flex: 1, alignItems: 'center' },
  countdownLabel: { color: '#d7f3eb', marginTop: 8, fontFamily: 'Cairo-Medium' },
  nextRight: { width: 120, alignItems: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  pillText: { color: '#7ef9de', fontFamily: 'Cairo-SemiBold' },
});

export default LargeWidgetVariants;
