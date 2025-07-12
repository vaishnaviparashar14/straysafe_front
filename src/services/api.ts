const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  message?: string;
  [key: string]: any;
}

interface LoginResponse {
  message: string;
  user: any;
  token: string;
}

interface ReportsResponse {
  reports: any[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('straysafe_token');
  }

  // Set authentication token
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('straysafe_token', token);
    } else {
      localStorage.removeItem('straysafe_token');
    }
  }

  // Get authentication headers
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData: any): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser(): Promise<any> {
    return this.request('/auth/me');
  }

  async updateProfile(userData: any): Promise<any> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Reports methods
  async getReports(filters: Record<string, any> = {}): Promise<ReportsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = `/reports${queryString ? `?${queryString}` : ''}`;
    
    return this.request<ReportsResponse>(endpoint);
  }

  async getReport(id: string): Promise<any> {
    return this.request(`/reports/${id}`);
  }

  async createReport(reportData: any): Promise<any> {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  async updateReport(id: string, updates: any): Promise<any> {
    return this.request(`/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async addReportUpdate(id: string, update: any): Promise<any> {
    return this.request(`/reports/${id}/updates`, {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  async followReport(id: string): Promise<any> {
    return this.request(`/reports/${id}/follow`, {
      method: 'POST',
    });
  }

  async getNearbyReports(lat: number, lng: number, radius: number = 10): Promise<any[]> {
    return this.request(`/reports/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  async deleteReport(id: string): Promise<any> {
    return this.request(`/reports/${id}`, {
      method: 'DELETE',
    });
  }

  // NGO methods
  async getNGOs(): Promise<any[]> {
    return this.request('/ngos');
  }

  async getNGO(id: string): Promise<any> {
    return this.request(`/ngos/${id}`);
  }

  async registerNGO(ngoData: any): Promise<any> {
    return this.request('/ngos/register', {
      method: 'POST',
      body: JSON.stringify(ngoData),
    });
  }

  async updateNGO(id: string, updates: any): Promise<any> {
    return this.request(`/ngos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async assignReport(ngoId: string, reportId: string): Promise<any> {
    return this.request(`/ngos/${ngoId}/assign-report`, {
      method: 'POST',
      body: JSON.stringify({ reportId }),
    });
  }

  // User methods
  async getUser(id: string): Promise<any> {
    return this.request(`/users/${id}`);
  }

  async getUserReports(id: string, page: number = 1, limit: number = 10): Promise<any> {
    return this.request(`/users/${id}/reports?page=${page}&limit=${limit}`);
  }

  async getUserNotifications(id: string, page: number = 1, limit: number = 10): Promise<any> {
    return this.request(`/users/${id}/notifications?page=${page}&limit=${limit}`);
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    return this.request(`/users/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(userId: string): Promise<any> {
    return this.request(`/users/${userId}/notifications/read-all`, {
      method: 'PATCH',
    });
  }

  // Upload methods
  async uploadImage(file: File, folder: string = 'straysafe'): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async uploadImages(files: File[], folder: string = 'straysafe'): Promise<any> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('images', file);
    });
    formData.append('folder', folder);

    const response = await fetch(`${this.baseURL}/upload/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async uploadAvatar(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseURL}/upload/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Avatar upload failed');
    }

    return data;
  }

  // Statistics methods
  async getReportStats(): Promise<any> {
    return this.request('/reports/stats/overview');
  }

  async getUserStats(): Promise<any> {
    return this.request('/users/stats/overview');
  }

  async getNGOStats(): Promise<any> {
    return this.request('/ngos/stats/overview');
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;