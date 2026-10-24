import { API_CONFIG } from '../config/api';
import Storage from './storage';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  private customBaseUrl: string | null = null;

  public setBaseUrl(url: string) {
    this.customBaseUrl = url;
  }

  public get baseUrl(): string {
    return this.customBaseUrl || API_CONFIG.BASE_URL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const token = await Storage.getItem('unisphere_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new ApiError(errData.detail || `Erreur HTTP ${response.status}`, response.status, errData);
    }

    return response.json();
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const headers = await this.getHeaders();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new ApiError(errData.detail || `Erreur HTTP ${response.status}`, response.status, errData);
    }

    return response.json();
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const headers = await this.getHeaders();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new ApiError(errData.detail || `Erreur HTTP ${response.status}`, response.status, errData);
    }

    return response.json();
  }
}

export const api = new ApiService();
export default api;
