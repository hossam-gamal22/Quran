// lib/ads-config.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export interface AdsConfig {
  enabled: boolean;
  bannerAdCode: string;
  interstitialAdCode: string;
  showBannerOnHome: boolean;
  showBannerOnQuran: boolean;
  showBannerOnAzkar: boolean;
  showAdOnAppOpen: boolean;
  interstitialMode: 'pages' | 'time' | 'session';
  interstitialFrequency: number;
  interstitialTimeInterval: number;
  interstitialSessionLimit: number;
  delayFirstAd: boolean;
  firstAdDelay: number;
}

const DEFAULT_ADS_CONFIG: AdsConfig = {
  enabled: true,
  bannerAdCode: 'ca-app-pub-3940256099942544/6300978111', // Test Banner
  interstitialAdCode: 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial
  showBannerOnHome: true,
  showBannerOnQuran: false,
  showBannerOnAzkar: true,
  showAdOnAppOpen: false,
  interstitialMode: 'pages',
  interstitialFrequency: 5,
  interstitialTimeInterval: 3,
  interstitialSessionLimit: 2,
  delayFirstAd: true,
  firstAdDelay: 30,
};

export const fetchAdsConfig = async (): Promise<AdsConfig> => {
  try {
    const docRef = doc(db, 'config', 'ads-settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as AdsConfig;
      await AsyncStorage.setItem('ads_config_cache', JSON.stringify(data));
      return { ...DEFAULT_ADS_CONFIG, ...data };
    }
  } catch (error) {
    console.log('Error fetching ads config:', error);
  }
  
  try {
    const cached = await AsyncStorage.getItem('ads_config_cache');
    if (cached) {
      return { ...DEFAULT_ADS_CONFIG, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.log('Error reading cache');
  }
  
  return DEFAULT_ADS_CONFIG;
};
