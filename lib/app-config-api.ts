// lib/app-config-api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { APP_CONFIG } from '../constants/app';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// Initialize Firebase (مرة واحدة فقط)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export interface RemoteAppConfig {
  name: string;
  nameEn: string;
  description: string;
  version: string;
  primaryColor: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
  minVersion: string;
  contact: {
    email: string;
    website: string;
  };
  downloadLinks: {
    android: string;
    ios: string;
  };
  features: {
    quran: boolean;
    azkar: boolean;
    prayer: boolean;
    qibla: boolean;
    tasbih: boolean;
    names: boolean;
    ruqyah: boolean;
    hijri: boolean;
  };
}

// القيم الافتراضية
const DEFAULT_REMOTE_CONFIG: RemoteAppConfig = {
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

// جلب الإعدادات من Firebase
export const fetchAppConfig = async (): Promise<RemoteAppConfig> => {
  try {
    console.log('🔄 جاري جلب الإعدادات من Firebase...');
    
    const docRef = doc(db, 'config', 'app-settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as RemoteAppConfig;
      
      // حفظ في AsyncStorage للاستخدام offline
      await AsyncStorage.setItem('remote_app_config', JSON.stringify(data));
      
      console.log('✅ تم جلب الإعدادات من Firebase بنجاح');
      return { ...DEFAULT_REMOTE_CONFIG, ...data };
    } else {
      console.log('⚠️ لا توجد إعدادات في Firebase، استخدام الافتراضية');
    }
  } catch (error) {
    console.log('❌ خطأ في جلب الإعدادات من Firebase:', error);
  }
  
  // محاولة القراءة من Cache
  try {
    const cached = await AsyncStorage.getItem('remote_app_config');
    if (cached) {
      console.log('✅ تم استخدام الإعدادات المحفوظة (Cache)');
      return { ...DEFAULT_REMOTE_CONFIG, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة Cache');
  }
  
  return DEFAULT_REMOTE_CONFIG;
};

// الحصول على الإعدادات
export const getAppConfig = async (): Promise<RemoteAppConfig> => {
  return await fetchAppConfig();
};
