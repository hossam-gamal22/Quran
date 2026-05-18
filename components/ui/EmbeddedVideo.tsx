import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

import { fontMedium, fontSemiBold } from '@/lib/fonts';
import { getLanguage, isRTL } from '@/lib/i18n';
import { extractVimeoId, extractYouTubeId, normalizeVideoEmbedUrl } from '@/lib/video-embed';

interface EmbeddedVideoProps {
  source?: string | null;
  title?: string | null;
  colors: {
    text: string;
    textLight?: string;
  };
  style?: StyleProp<ViewStyle>;
}

// Matches direct video files (incl. Firebase Storage URLs which keep the
// extension in the encoded object path before the query string).
const DIRECT_VIDEO_RE = /\.(mp4|mov|m4v|webm|m3u8)(?:[?#]|$)/i;
const DIRECT_VIDEO_ENCODED_RE = /%2F[^?#]*\.(mp4|mov|m4v|webm|m3u8)/i;

function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_RE.test(url) || DIRECT_VIDEO_ENCODED_RE.test(url);
}

function buildYouTubeHtml(id: string, start?: number): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
      #player { position: absolute; inset: 0; width: 100%; height: 100%; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      function post(payload) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
      }
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = function () { post({ type: 'embed-error', reason: 'api-load' }); };
      document.body.appendChild(tag);
      var player;
      window.onYouTubeIframeAPIReady = function () {
        try {
          player = new YT.Player('player', {
            host: 'https://www.youtube-nocookie.com',
            videoId: '${id}',
            playerVars: {
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              start: ${start ?? 0}
            },
            events: {
              onReady: function () { post({ type: 'embed-ready' }); },
              onError: function (e) { post({ type: 'embed-error', reason: 'player-error', code: e.data }); }
            }
          });
        } catch (err) {
          post({ type: 'embed-error', reason: 'init-failed' });
        }
      };
      setTimeout(function () {
        if (!player) post({ type: 'embed-error', reason: 'timeout' });
      }, 8000);
    </script>
  </body>
</html>`;
}

function buildVimeoHtml(id: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
    </style>
  </head>
  <body>
    <iframe
      src="https://player.vimeo.com/video/${id}?playsinline=1"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

function DirectVideoPlayer({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });
  return (
    <VideoView
      player={player}
      style={style as any}
      allowsFullscreen
      allowsPictureInPicture
      contentFit="contain"
      nativeControls
    />
  );
}

export function EmbeddedVideo({ source, title, colors, style }: EmbeddedVideoProps) {
  const trimmedSource = source?.trim();
  const direct = useMemo(
    () => (trimmedSource && isDirectVideoUrl(trimmedSource) ? trimmedSource : null),
    [trimmedSource],
  );
  const youtube = useMemo(() => (direct ? null : extractYouTubeId(trimmedSource)), [trimmedSource, direct]);
  const vimeoId = useMemo(
    () => (direct || youtube ? null : extractVimeoId(trimmedSource)),
    [trimmedSource, direct, youtube],
  );
  const fallbackEmbed = useMemo(
    () => (direct || youtube || vimeoId ? null : normalizeVideoEmbedUrl(trimmedSource)),
    [trimmedSource, direct, youtube, vimeoId],
  );
  const [hasError, setHasError] = useState(false);
  const rtl = isRTL();
  const lang = getLanguage();

  if (!trimmedSource || (!direct && !youtube && !vimeoId && !fallbackEmbed)) return null;

  const displayTitle =
    title?.trim() || (lang === 'ar' ? 'فيديو القصة' : 'Story video');
  const fallbackLabel = lang === 'ar' ? 'افتح الفيديو على يوتيوب' : 'Open video on YouTube';
  const fallbackHint =
    lang === 'ar' ? 'تعذّر تشغيل الفيديو هنا' : 'Video could not play here';

  const handleOpenExternal = () => {
    Linking.openURL(trimmedSource).catch(() => {
      if (youtube) {
        Linking.openURL(`https://www.youtube.com/watch?v=${youtube.id}`).catch(() => {});
      } else if (vimeoId) {
        Linking.openURL(`https://vimeo.com/${vimeoId}`).catch(() => {});
      }
    });
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data || '{}');
      if (parsed?.type === 'embed-error') setHasError(true);
    } catch {}
  };

  const webViewSource = youtube
    ? { html: buildYouTubeHtml(youtube.id, youtube.start), baseUrl: 'https://www.youtube.com' }
    : vimeoId
      ? { html: buildVimeoHtml(vimeoId), baseUrl: 'https://player.vimeo.com' }
      : { uri: fallbackEmbed as string };

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.title,
          { color: colors.text, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' },
        ]}
      >
        {displayTitle}
      </Text>
      <View style={[styles.frame, { borderColor: colors.textLight ?? 'rgba(255,255,255,0.16)' }]}>
        {direct ? (
          <DirectVideoPlayer uri={direct} style={styles.webview} />
        ) : hasError ? (
          <Pressable
            onPress={handleOpenExternal}
            style={styles.fallbackInner}
            accessibilityRole="button"
            accessibilityLabel={fallbackLabel}
          >
            <MaterialCommunityIcons name="youtube" size={44} color="#ff3b30" />
            <Text style={styles.fallbackHint}>{fallbackHint}</Text>
            <View style={styles.fallbackButton}>
              <MaterialCommunityIcons name="open-in-new" size={16} color="#fff" />
              <Text style={styles.fallbackLabel}>{fallbackLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <WebView
            source={webViewSource as any}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            originWhitelist={['https://*', 'http://*', 'about:*']}
            onMessage={handleMessage}
            onError={() => setHasError(true)}
            onHttpError={({ nativeEvent }) => {
              if (nativeEvent.statusCode >= 400) setHasError(true);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontFamily: fontSemiBold(),
    fontSize: 15,
    lineHeight: 24,
  },
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallbackInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0b',
    gap: 12,
    paddingHorizontal: 20,
  },
  fallbackHint: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fontMedium(),
    fontSize: 13,
    textAlign: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  fallbackLabel: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: 14,
  },
});
