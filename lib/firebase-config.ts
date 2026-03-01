// lib/firebase-config.ts
import { initializeApp } from 'firebase/app';
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// الإعدادات الافتراضية
export const DEFAULT_APP_CONFIG = {
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  version: '1.0.0',
  primaryColor: '#1B4332',
  maintenanceMode: false,
  forceUpdate: false,
  minVersion: '1.0.0',
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
  },
  downloadLinks: {
    android: '',
    ios: '',
  },
  features: {
    quran: true,
    azkar: true,
    prayer: true,
    qibla: true,
    tasbih: true,
    names: true,
    ruqyah: true,
    hijri: true,
  },
};

export type AppConfig = typeof DEFAULT_APP_CONFIG;

// جلب الإعدادات من Firebase
export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    const docRef = doc(db, 'config', 'app-settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as AppConfig;
      await AsyncStorage.setItem('app_config_cache', JSON.stringify(data));
      console.log('✅ تم جلب الإعدادات من Firebase');
      return { ...DEFAULT_APP_CONFIG, ...data };
    }
  } catch (error) {
    console.log('⚠️ فشل الاتصال بـ Firebase:', error);
  }
  
  try {
    const cached = await AsyncStorage.getItem('app_config_cache');
    if (cached) {
      console.log('✅ تم استخدام الإعدادات المحفوظة');
      return { ...DEFAULT_APP_CONFIG, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة الـ Cache');
  }
  
  return DEFAULT_APP_CONFIG;
};
