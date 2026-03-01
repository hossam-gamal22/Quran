// app/(tabs)/qibla.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.75;

type CompassStyle = 'default' | 'modern' | 'classic' | 'minimal';

interface CompassStyleOption {
  id: CompassStyle;
  icon: string;
}

export default function QiblaScreen() {
  const [qiblaDirection, setQiblaDirection] = useState(292);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [isFacingQibla, setIsFacingQibla] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CompassStyle>('default');
  const [locationName, setLocationName] = useState('القاهرة، مصر');

  const compassStyles: CompassStyleOption[] = [
    { id: 'default', icon: 'compass' },
    { id: 'modern', icon: 'navigate' },
    { id: 'classic', icon: 'compass-outline' },
    { id: 'minimal', icon: 'locate' },
  ];

  useEffect(() => {
    // Simulate compass movement for demo
    const interval = setInterval(() => {
      setCurrentHeading((prev) => {
        const newHeading = (prev + Math.random() * 2 - 1) % 360;
        const diff = Math.abs(newHeading - qiblaDirection);
        setIsFacingQibla(diff < 5 || diff > 355);
        return newHeading;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [qiblaDirection]);

  const getRotation = () => {
    return `${-currentHeading}deg`;
  };

  const getQiblaRotation = () => {
    return `${qiblaDirection - currentHeading}deg`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="location-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>القبلة: {qiblaDirection}°</Text>
          <Text style={styles.headerSubtitle}>{locationName}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Map Preview */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={48} color={Colors.textMuted} />
          <Text style={styles.mapText}>خريطة اتجاه القبلة</Text>
          <View style={styles.mapLine} />
          <View style={styles.kaabaIcon}>
            <Text style={styles.kaabaEmoji}>🕋</Text>
          </View>
          <View style={styles.userIcon}>
            <Ionicons name="person-circle" size={32} color={Colors.primary} />
          </View>
        </View>
      </View>

      {/* Compass */}
      <View style={styles.compassContainer}>
        <View
          style={[
            styles.compass,
            isFacingQibla && styles.compassFacingQibla,
          ]}
        >
          {/* Compass Rose */}
          <View
            style={[
              styles.compassRose,
              { transform: [{ rotate: getRotation() }] },
            ]}
          >
            {/* Cardinal Directions */}
            <Text style={[styles.direction, styles.directionN]}>N</Text>
            <Text style={[styles.direction, styles.directionE]}>E</Text>
            <Text style={[styles.direction, styles.directionS]}>S</Text>
            <Text style={[styles.direction, styles.directionW]}>W</Text>

            {/* Compass Ticks */}
            {[...Array(72)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  i % 6 === 0 ? styles.tickMajor : styles.tickMinor,
                  {
                    transform: [
                      { rotate: `${i * 5}deg` },
                      { translateY: -COMPASS_SIZE / 2 + 20 },
                    ],
                  },
                ]}
              />
            ))}

            {/* Qibla Indicator */}
            <View
              style={[
                styles.qiblaIndicator,
                {
                  transform: [
                    { rotate: `${qiblaDirection}deg` },
                    { translateY: -COMPASS_SIZE / 2 + 40 },
                  ],
                },
              ]}
            >
              <Text style={styles.kaabaSmall}>🕋</Text>
            </View>
          </View>

          {/* Center Needle */}
          <View style={styles.needleContainer}>
            <View style={styles.needle}>
              <View style={styles.needleTop} />
              <View style={styles.needleBottom} />
            </View>
            <View style={styles.needleCenter} />
          </View>
        </View>

        {/* Status Text */}
        <View style={styles.statusContainer}>
          {isFacingQibla ? (
            <View style={styles.statusSuccess}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.statusTextSuccess}>أنت تواجه القبلة الآن</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              أدر هاتفك حتى يشير السهم إلى الكعبة
            </Text>
          )}
        </View>
      </View>

      {/* Compass Style Selector */}
      <View style={styles.styleSelector}>
        {compassStyles.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.styleOption,
              selectedStyle === style.id && styles.styleOptionActive,
            ]}
            onPress={() => setSelectedStyle(style.id)}
          >
            <Ionicons
              name={style.icon as any}
              size={24}
              color={selectedStyle === style.id ? Colors.textLight : Colors.text}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="compass" size={20} color={Colors.primary} />
            <Text style={styles.infoLabel}>الاتجاه</Text>
            <Text style={styles.infoValue}>{Math.round(currentHeading)}°</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
            <Text style={styles.infoLabel}>القبلة</Text>
            <Text style={styles.infoValue}>{qiblaDirection}°</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="airplane" size={20} color={Colors.primary} />
            <Text style={styles.infoLabel}>المسافة</Text>
            <Text style={styles.infoValue}>٣٬٥٠٠ كم</Text>
          </View>
        </View>
      </View>

      {/* Calibration Notice */}
      <TouchableOpacity style={styles.calibrationNotice}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.calibrationText}>
          حرّك هاتفك بشكل ∞ لمعايرة البوصلة
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  mapContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  mapLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: Colors.accent,
    opacity: 0.5,
    transform: [{ rotate: '45deg' }],
  },
  kaabaIcon: {
    position: 'absolute',
    top: 20,
    right: 40,
  },
  kaabaEmoji: {
    fontSize: 24,
  },
  userIcon: {
    position: 'absolute',
    bottom: 20,
    left: 40,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  compass: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: Colors.border,
  },
  compassFacingQibla: {
    borderColor: Colors.success,
    borderWidth: 4,
  },
  compassRose: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  direction: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  directionN: {
    top: 30,
    color: Colors.error,
  },
  directionE: {
    right: 30,
  },
  directionS: {
    bottom: 30,
  },
  directionW: {
    left: 30,
  },
  tick: {
    position: 'absolute',
    width: 2,
    backgroundColor: Colors.textMuted,
  },
  tickMajor: {
    height: 15,
    backgroundColor: Colors.text,
  },
  tickMinor: {
    height: 8,
  },
  qiblaIndicator: {
    position: 'absolute',
  },
  kaabaSmall: {
    fontSize: 28,
  },
  needleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  needle: {
    alignItems: 'center',
  },
  needleTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
  },
  needleBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.textMuted,
  },
  needleCenter: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  statusContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  statusTextSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  styleSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  styleOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  styleOptionActive: {
    backgroundColor: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  calibrationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  calibrationText: {
    fontSize: 12,
    color: Colors.primary,
  },
});
