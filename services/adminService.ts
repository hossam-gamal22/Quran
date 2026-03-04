// services/adminService.ts
import { db } from '../lib/firebase-config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  AppSettings,
  AdSettings,
  CountryPricing,
  DynamicContent,
  PushNotification,
  ReciterConfig,
  Subscriber,
  AppStats,
} from '../types/admin';

class AdminService {
  // ==================== إعدادات التطبيق ====================
  
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const docRef = doc(db, 'config', 'appSettings');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as AppSettings) : null;
    } catch (error) {
      console.error('Error getting app settings:', error);
      return null;
    }
  }

  async updateAppSettings(settings: Partial<AppSettings>): Promise<boolean> {
    try {
      const docRef = doc(db, 'config', 'appSettings');
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating app settings:', error);
      return false;
    }
  }

  // ==================== إعدادات الإعلانات ====================

  async getAdSettings(): Promise<AdSettings | null> {
    try {
      const docRef = doc(db, 'config', 'adSettings');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as AdSettings) : null;
    } catch (error) {
      console.error('Error getting ad settings:', error);
      return null;
    }
  }

  async updateAdSettings(settings: Partial<AdSettings>): Promise<boolean> {
    try {
      const docRef = doc(db, 'config', 'adSettings');
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating ad settings:', error);
      return false;
    }
  }

  // ==================== أسعار الاشتراكات ====================

  async getAllPricing(): Promise<CountryPricing[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'pricing'));
      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        countryCode: doc.id,
      })) as CountryPricing[];
    } catch (error) {
      console.error('Error getting pricing:', error);
      return [];
    }
  }

  async getPricingByCountry(countryCode: string): Promise<CountryPricing | null> {
    try {
      const docRef = doc(db, 'pricing', countryCode);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as CountryPricing) : null;
    } catch (error) {
      console.error('Error getting country pricing:', error);
      return null;
    }
  }

  async setCountryPricing(pricing: CountryPricing): Promise<boolean> {
    try {
      const docRef = doc(db, 'pricing', pricing.countryCode);
      await setDoc(docRef, pricing);
      return true;
    } catch (error) {
      console.error('Error setting country pricing:', error);
      return false;
    }
  }

  async deleteCountryPricing(countryCode: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'pricing', countryCode);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting country pricing:', error);
      return false;
    }
  }

  // ==================== المحتوى الديناميكي ====================

  async getDynamicContent(type?: string): Promise<DynamicContent[]> {
    try {
      let q = query(collection(db, 'content'), orderBy('priority', 'desc'));
      
      if (type) {
        q = query(
          collection(db, 'content'),
          where('type', '==', type),
          orderBy('priority', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DynamicContent[];
    } catch (error) {
      console.error('Error getting dynamic content:', error);
      return [];
    }
  }

  async addDynamicContent(content: Omit<DynamicContent, 'id'>): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, 'content'), content);
      return docRef.id;
    } catch (error) {
      console.error('Error adding dynamic content:', error);
      return null;
    }
  }

  async updateDynamicContent(id: string, content: Partial<DynamicContent>): Promise<boolean> {
    try {
      const docRef = doc(db, 'content', id);
      await updateDoc(docRef, content);
      return true;
    } catch (error) {
      console.error('Error updating dynamic content:', error);
      return false;
    }
  }

  async deleteDynamicContent(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'content', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting dynamic content:', error);
      return false;
    }
  }

  // ==================== الإشعارات ====================

  async getNotifications(): Promise<PushNotification[]> {
    try {
      const q = query(collection(db, 'notifications'), orderBy('scheduledTime', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PushNotification[];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async addNotification(notification: Omit<PushNotification, 'id'>): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), notification);
      return docRef.id;
    } catch (error) {
      console.error('Error adding notification:', error);
      return null;
    }
  }

  async updateNotification(id: string, notification: Partial<PushNotification>): Promise<boolean> {
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, notification);
      return true;
    } catch (error) {
      console.error('Error updating notification:', error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'notifications', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // ==================== القراء ====================

  async getReciters(): Promise<ReciterConfig[]> {
    try {
      const q = query(collection(db, 'reciters'), orderBy('sortOrder', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ReciterConfig[];
    } catch (error) {
      console.error('Error getting reciters:', error);
      return [];
    }
  }

  async addReciter(reciter: Omit<ReciterConfig, 'id'>): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, 'reciters'), reciter);
      return docRef.id;
    } catch (error) {
      console.error('Error adding reciter:', error);
      return null;
    }
  }

  async updateReciter(id: string, reciter: Partial<ReciterConfig>): Promise<boolean> {
    try {
      const docRef = doc(db, 'reciters', id);
      await updateDoc(docRef, reciter);
      return true;
    } catch (error) {
      console.error('Error updating reciter:', error);
      return false;
    }
  }

  async deleteReciter(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'reciters', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting reciter:', error);
      return false;
    }
  }

  // ==================== المشتركين ====================

  async getSubscribers(): Promise<Subscriber[]> {
    try {
      const q = query(collection(db, 'subscribers'), orderBy('startDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscriber[];
    } catch (error) {
      console.error('Error getting subscribers:', error);
      return [];
    }
  }

  async getActiveSubscribers(): Promise<Subscriber[]> {
    try {
      const q = query(
        collection(db, 'subscribers'),
        where('isActive', '==', true),
        orderBy('endDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscriber[];
    } catch (error) {
      console.error('Error getting active subscribers:', error);
      return [];
    }
  }

  // ==================== الإحصائيات ====================

  async getStats(): Promise<AppStats> {
    try {
      const subscribers = await this.getSubscribers();
      const activeSubscribers = subscribers.filter((s) => s.isActive);
      
      const totalRevenue = subscribers.reduce((sum, s) => sum + s.amount, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRevenue = subscribers
        .filter((s) => new Date(s.startDate) >= today)
        .reduce((sum, s) => sum + s.amount, 0);

      // حساب أعلى الدول
      const countryMap: { [key: string]: number } = {};
      subscribers.forEach((s) => {
        countryMap[s.country] = (countryMap[s.country] || 0) + 1;
      });
      
      const topCountries = Object.entries(countryMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalUsers: 0, // يتم تحديثه من Analytics
        activeUsers: 0,
        premiumUsers: activeSubscribers.length,
        totalRevenue,
        todayRevenue,
        topCountries,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        premiumUsers: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        topCountries: [],
      };
    }
  }

  // ==================== الاستماع للتغييرات ====================

  subscribeToSettings(callback: (settings: AppSettings) => void): () => void {
    const docRef = doc(db, 'config', 'appSettings');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as AppSettings);
      }
    });
  }

  subscribeToAdSettings(callback: (settings: AdSettings) => void): () => void {
    const docRef = doc(db, 'config', 'adSettings');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as AdSettings);
      }
    });
  }
}

export const adminService = new AdminService();
