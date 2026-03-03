// admin-panel/src/lib/api.ts
// API Client للربط مع Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.roohmuslim.com';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'حدث خطأ في الاتصال',
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'فشل الاتصال بالخادم',
      };
    }
  }

  // ==================== Auth ====================
  
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  // ==================== Dashboard ====================
  
  async getDashboardStats() {
    return this.request<{
      totalUsers: number;
      activeUsers: number;
      dailyActiveUsers: number;
      avgSessionDuration: number;
      totalAzkarRead: number;
      totalQuranPages: number;
      totalPrayers: number;
    }>('/admin/dashboard/stats');
  }

  async getRecentActivity() {
    return this.request<{
      id: string;
      type: string;
      description: string;
      time: string;
      country?: string;
    }[]>('/admin/dashboard/activity');
  }

  // ==================== Users ====================
  
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      users: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/admin/users?${query}`);
  }

  async getUserById(id: string) {
    return this.request<any>(`/admin/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // ==================== Content ====================
  
  async getContent(type?: string) {
    const query = type ? `?type=${type}` : '';
    return this.request<any[]>(`/admin/content${query}`);
  }

  async createContent(data: any) {
    return this.request('/admin/content', {
      method: 'POST',
      body: data,
    });
  }

  async updateContent(id: string, data: any) {
    return this.request(`/admin/content/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteContent(id: string) {
    return this.request(`/admin/content/${id}`, { method: 'DELETE' });
  }

  // ==================== Splash Screens ====================
  
  async getSplashScreens() {
    return this.request<any[]>('/admin/splash-screens');
  }

  async createSplashScreen(data: any) {
    return this.request('/admin/splash-screens', {
      method: 'POST',
      body: data,
    });
  }

  async updateSplashScreen(id: string, data: any) {
    return this.request(`/admin/splash-screens/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteSplashScreen(id: string) {
    return this.request(`/admin/splash-screens/${id}`, { method: 'DELETE' });
  }

  // ==================== Notifications ====================
  
  async getNotifications() {
    return this.request<any[]>('/admin/notifications');
  }

  async sendNotification(data: {
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    targetAudience: string;
    scheduledAt?: string;
  }) {
    return this.request('/admin/notifications/send', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== Seasonal Content ====================
  
  async getSeasonalContent() {
    return this.request<any[]>('/admin/seasonal');
  }

  async createSeasonalContent(data: any) {
    return this.request('/admin/seasonal', {
      method: 'POST',
      body: data,
    });
  }

  async updateSeasonalContent(id: string, data: any) {
    return this.request(`/admin/seasonal/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteSeasonalContent(id: string) {
    return this.request(`/admin/seasonal/${id}`, { method: 'DELETE' });
  }

  // ==================== Analytics ====================
  
  async getAnalytics(dateRange: string) {
    return this.request<{
      totalUsers: number;
      activeUsers: number;
      avgSessionDuration: number;
      retentionRate: number;
      topCountries: { country: string; users: number }[];
      topAzkar: { name: string; count: number }[];
      platformDistribution: { platform: string; count: number }[];
    }>(`/admin/analytics?range=${dateRange}`);
  }

  // ==================== Settings ====================
  
  async getSettings() {
    return this.request<any>('/admin/settings');
  }

  async updateSettings(data: any) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: data,
    });
  }

  // ==================== Themes ====================
  
  async getThemes() {
    return this.request<any[]>('/admin/themes');
  }

  async updateTheme(id: string, data: any) {
    return this.request(`/admin/themes/${id}`, {
      method: 'PUT',
      body: data,
    });
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
export default api;
