import React, { useEffect, useState } from 'react';
import { SvgXml } from 'react-native-svg';
import { ActivityIndicator, View, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

/**
 * Loads and renders an SVG XML from a local file path (require or string).
 * @param uri - Local file path (require or string)
 * @param width - Width of the SVG
 * @param height - Height of the SVG
 * @param style - Optional style
 */
export function SvgXmlLoader({ uri, width, height, style }: { uri: any; width?: number; height?: number; style?: any }) {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSvg() {
      setSvgXml(null);
      setError(null);
      try {
        let fileUri: string;
        if (typeof uri === 'number') {
          // require()'d asset
          const asset = Asset.fromModule(uri);
          await asset.downloadAsync();
          fileUri = asset.localUri || asset.uri;
        } else if (typeof uri === 'string') {
          fileUri = uri;
        } else {
          throw new Error('Invalid uri type');
        }
        const contents = await FileSystem.readAsStringAsync(fileUri);
        if (isMounted) setSvgXml(contents);
      } catch (e: any) {
        if (isMounted) setError(e.message || 'Error loading SVG');
      }
    }
    loadSvg();
    return () => { isMounted = false; };
  }, [uri]);

  if (error) {
    return <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}><ActivityIndicator /><View><Text>{error}</Text></View></View>;
  }
  if (!svgXml) {
    return <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}><ActivityIndicator /></View>;
  }
  return <SvgXml xml={svgXml} width={width} height={height} style={style} />;
}