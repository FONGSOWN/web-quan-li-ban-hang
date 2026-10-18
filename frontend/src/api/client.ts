const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: Array<{ field: string; message: string }>;
}

export function getToken(): string | null {
  return localStorage.getItem('qlbh_token');
}

export function setToken(token: string): void {
  localStorage.setItem('qlbh_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('qlbh_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle CSV or blob responses
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      const blob = await response.blob();
      return {
        success: true,
        data: blob as any,
      };
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        // Notify session expired if needed
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      throw new Error(data.message || 'Yêu cầu không thành công.');
    }

    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ API (http://localhost:3000). Vui lòng kiểm tra backend.');
    }
    throw error;
  }
}

