import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { fetchQiblaDirection } from '@/lib/prayer-api';
import { getPrayerLocation, savePrayerLocation } from '@/lib/storage';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';

export default function QiblaScreen() {
  const colors = useColors();
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [compassAngle, setCompassAngle] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prevAngleRef = useRef(0);

  useEffect(() => {
    const loadQibla = async () => {
      try {
        let location = await getPrayerLocation();
        if (!location && Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            await savePrayerLocation(location);
          } else {
            setError(true);
            setLoading(false);
            return;
          }
        } else if (!location) {
          // Web fallback
          location = { latitude: 21.3891, longitude: 39.8579 };
        }

        const qiblaData = await fetchQiblaDirection(location.latitude, location.longitude);
        setQiblaAngle(qiblaData.bearing);

        // Calculate distance to Mecca
        const R = 6371;
        const lat1 = (location.latitude * Math.PI) / 180;
        const lat2 = (21.3891 * Math.PI) / 180;
        const dLat = ((21.3891 - location.latitude) * Math.PI) / 180;
        const dLon = ((39.8579 - location.longitude) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setDistance(Math.round(R * c));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadQibla();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Magnetometer.addListener(data => {
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      setCompassAngle(angle);
    });
    Magnetometer.setUpdateInterval(100);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (qiblaAngle === null) return;
    const targetAngle = qiblaAngle - compassAngle;
    const normalizedTarget = ((targetAngle % 360) + 360) % 360;

    // Smooth rotation
    let diff = normalizedTarget - prevAngleRef.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const newAngle = prevAngleRef.current + diff;
    prevAngleRef.current = newAngle;

    Animated.timing(rotateAnim, {
      toValue: newAngle,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [compassAngle, qiblaAngle]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    compassContainer: {
      width: 280,
      height: 280,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compassOuter: {
      width: 280,
      height: 280,
      borderRadius: 140,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    kaabaIcon: {
      fontSize: 40,
      marginBottom: 8,
    },
    kaabaLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    infoCard: {
      marginTop: 32,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    infoTitle: { fontSize: 14, color: colors.muted, marginBottom: 4 },
    infoValue: { fontSize: 22, fontWeight: '700', color: colors.foreground },
    infoUnit: { fontSize: 14, color: colors.muted, marginTop: 2 },
    angleRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 16,
    },
    angleItem: { alignItems: 'center' },
    angleLabel: { fontSize: 12, color: colors.muted },
    angleValue: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 4 },
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    errorText: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 26 },
    retryBtn: {
      marginTop: 20,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    webNote: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 22,
    },
  });

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <Text style={s.title}>اتجاه القبلة</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  if (error || qiblaAngle === null) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <Text style={s.title}>اتجاه القبلة</Text>
        </View>
        <View style={s.errorContainer}>
          <Text style={{ fontSize: 48 }}>🧭</Text>
          <Text style={s.errorText}>
            يحتاج التطبيق إلى الوصول لموقعك لتحديد اتجاه القبلة
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); setError(false); }}>
            <Text style={s.retryBtnText}>المحاولة مجدداً</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={s.header}>
        <Text style={s.title}>اتجاه القبلة</Text>
      </View>

      <View style={s.container}>
        {/* Compass */}
        <View style={s.compassContainer}>
          <Animated.View
            style={[
              s.compassOuter,
              Platform.OS !== 'web' && { transform: [{ rotate: rotation }] },
            ]}
          >
            <Text style={s.kaabaIcon}>🕋</Text>
            <Text style={s.kaabaLabel}>القبلة</Text>
          </Animated.View>
        </View>

        {Platform.OS === 'web' && (
          <Text style={s.webNote}>
            البوصلة تعمل على الأجهزة المحمولة فقط
          </Text>
        )}

        {/* Info Card */}
        <View style={s.infoCard}>
          {distance && (
            <>
              <Text style={s.infoTitle}>المسافة إلى مكة المكرمة</Text>
              <Text style={s.infoValue}>{distance.toLocaleString('ar-SA')}</Text>
              <Text style={s.infoUnit}>كيلومتر</Text>
            </>
          )}
          <View style={s.angleRow}>
            <View style={s.angleItem}>
              <Text style={s.angleLabel}>اتجاه القبلة</Text>
              <Text style={s.angleValue}>{Math.round(qiblaAngle)}°</Text>
            </View>
            {Platform.OS !== 'web' && (
              <View style={s.angleItem}>
                <Text style={s.angleLabel}>اتجاه البوصلة</Text>
                <Text style={s.angleValue}>{Math.round(compassAngle)}°</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
