import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import LargeWidgetVariants from './LargeWidgetVariants';

const { width } = Dimensions.get('window');

interface GlassWidgetPreviewProps {
  size?: 'small' | 'medium' | 'large';
}

export const GlassWidgetPreview: React.FC<GlassWidgetPreviewProps> = ({ size = 'large' }) => {
  // layout grid tokens
  const padding = size === 'large' ? 24 : size === 'medium' ? 16 : 12;
  const [variant, setVariant] = useState<'next' | 'schedule'>('next');

  return (
    <ScrollView contentContainerStyle={{ padding }}>
      <View style={styles.container}>
        {/* Variant toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setVariant('next')}
            style={[styles.toggleButton, variant === 'next' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, variant === 'next' && styles.toggleTextActive]}>Next Prayer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setVariant('schedule')}
            style={[styles.toggleButton, variant === 'schedule' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, variant === 'schedule' && styles.toggleTextActive]}>Full Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Large widget variants (embedded) */}
        <View style={{ width: '100%', marginBottom: 12 }}>
          <LargeWidgetVariants variant={variant} />
        </View>

        {/* Secondary row: two medium cards */}
        <View style={styles.row}>
          <BlurView intensity={50} tint="default" style={[styles.card, { marginRight: 12 }]}>
            <Text style={styles.cardTitle}>التالي</Text>
            <Text style={styles.cardTime}>الظهر · 12:03</Text>
          </BlurView>

          <BlurView intensity={50} tint="default" style={styles.card}>
            <Text style={styles.cardTitle}>التذكير</Text>
            <Text style={styles.cardTime}>مفعل</Text>
          </BlurView>
        </View>

        {/* Small card row */}
        <View style={styles.smallRow}>
          <BlurView intensity={40} tint="default" style={styles.smallCard}>
            <Text style={styles.smallTime}>00:47</Text>
            <Text style={styles.smallLabel}>باقي على الظهر</Text>
          </BlurView>

          <BlurView intensity={40} tint="default" style={styles.smallCard}>
            <Text style={styles.smallTime}>04</Text>
            <Text style={styles.smallLabel}>تنبيهات</Text>
          </BlurView>
        </View>
      </View>
    </ScrollView>
  );
};

const BORDER = 'rgba(255,255,255,0.2)';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  heroCard: {
    width: width - 48,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    width: 120,
    alignItems: 'center',
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  prayerName: {
    color: '#eafbf4',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  },
  centerCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroTime: {
    color: '#fff',
    fontSize: 62,
    fontFamily: 'Cairo-ExtraLight',
    lineHeight: 66,
  },
  heroLabel: {
    color: '#d7f3eb',
    fontSize: 14,
    marginTop: 6,
    fontFamily: 'Cairo-Medium',
  },
  rightCol: {
    width: 120,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  pillText: {
    color: '#7ef9de',
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  row: {
    flexDirection: 'row',
    marginTop: 12,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  cardTitle: {
    color: '#dffbf4',
    fontSize: 12,
    fontFamily: 'Cairo-Medium',
  },
  cardTime: {
    color: '#fff',
    fontSize: 18,
    marginTop: 6,
    fontFamily: 'Cairo-Bold',
  },
  smallRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  smallCard: {
    width: (width - 72) / 2,
    borderRadius: 14,
    padding: 10,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  smallTime: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Cairo-ExtraLight',
  },
  smallLabel: {
    color: '#cfeee7',
    fontSize: 11,
    marginTop: 6,
    fontFamily: 'Cairo-Regular',
  },
});

export default GlassWidgetPreview;
