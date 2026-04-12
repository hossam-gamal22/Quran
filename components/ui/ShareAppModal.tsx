// components/ui/ShareAppModal.tsx
// مودال مشاركة التطبيق — محتواه قابل للتعديل من الأدمن بانل

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchAppConfig, getStoreUrls, type ShareModalConfig } from '@/lib/app-config-api';

interface ShareAppModalProps {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => Promise<void>;
  onShared?: () => Promise<void>;
}

// ShareAppModal receives onDismiss but MUST call it when user taps "ليس الآن"

const DEFAULT_CONFIG: ShareModalConfig = {
  enabled: true,
  titleAr: 'انشر الخير مع روح المسلم',
  descriptionAr:
    'كل من شارك هذا التطبيق كان له مثل أجر من انتفع به — اجعله صدقة جارية تعود عليك وعلى من تحب',
  shareMessageAr: 'حمّل تطبيق روح المسلم — صلوات، أذكار، قرآن وأوقات الصلاة',
  shareUrlFallback: 'https://roohmuslim.app',
};

const ShareAppModal: React.FC<ShareAppModalProps> = ({ visible, onClose, onDismiss, onShared }) => {
  const colors = useColors();
  const { t, isDarkMode } = useSettings();

  const [config, setConfig] = useState<ShareModalConfig>(DEFAULT_CONFIG);
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [appConfig, urls] = await Promise.all([fetchAppConfig(), getStoreUrls()]);
        if (!mounted) return;
        if (appConfig.shareModal) {
          setConfig({ ...DEFAULT_CONFIG, ...appConfig.shareModal });
        }
        const sm = appConfig.shareModal;
        const url = Platform.select({
          ios: sm?.shareUrlIos || urls.ios || sm?.shareUrlFallback || DEFAULT_CONFIG.shareUrlFallback,
          android: sm?.shareUrlAndroid || urls.android || sm?.shareUrlFallback || DEFAULT_CONFIG.shareUrlFallback,
          default: sm?.shareUrlFallback || DEFAULT_CONFIG.shareUrlFallback,
        }) || DEFAULT_CONFIG.shareUrlFallback;
        setStoreUrl(url);
      } catch {
        // silently degrade to defaults
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [visible]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = config.shareMessageAr;
    const url = storeUrl || config.shareUrlFallback;
    try {
      const result = await Share.share({
        message: `${message}\n${url}`,
        title: t('common.appName'),
        url: Platform.OS === 'ios' ? url : undefined,
      });
      // Mark as shared if user actually shared (not cancelled)
      if (result.action === Share.sharedAction && onShared) {
        await onShared();
      }
    } catch {
      // user cancelled or error — ignore
    }
    onClose();
  };

  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Track dismiss so we delay next prompt
    if (onDismiss) {
      await onDismiss();
    }
    onClose();
  };

  const cardBg = isDarkMode ? '#0f1a14' : '#ffffff';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const titleColor = isDarkMode ? '#ffffff' : '#111111';
  const descColor = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';
  const closeBorder = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const closeTextColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Dark overlay */}
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <View
            style={{
              width: 320,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: cardBorder,
              backgroundColor: cardBg,
              paddingHorizontal: 28,
              paddingTop: 32,
              paddingBottom: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {/* App Icon */}
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Image
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                source={require('@/assets/images/icons/icon.png')}
                style={{ width: 88, height: 88 }}
                resizeMode="contain"
              />
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <>
                {/* Title */}
                <Text
                  style={{
                    fontFamily: fontBold(),
                    fontSize: 20,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    color: titleColor,
                    marginBottom: 14,
                    lineHeight: 28,
                  }}
                >
                  {config.titleAr}
                </Text>

                {/* Description */}
                <Text
                  style={{
                    fontFamily: fontMedium(),
                    fontSize: 15,
                    textAlign: 'center',
                    writingDirection: 'rtl',
                    color: descColor,
                    lineHeight: 24,
                    marginBottom: 28,
                  }}
                >
                  {config.descriptionAr}
                </Text>
              </>
            )}

            {/* Share Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                backgroundColor: '#0d8e62',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontFamily: fontSemiBold(),
                  fontSize: 17,
                  color: '#ffffff',
                  writingDirection: 'rtl',
                }}
              >
                {t('settings.shareNow')}
              </Text>
            </TouchableOpacity>

            {/* Not Now Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: closeBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleClose}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  fontFamily: fontMedium(),
                  fontSize: 16,
                  color: closeTextColor,
                  writingDirection: 'rtl',
                }}
              >
                {t('settings.notNow')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ShareAppModal;
