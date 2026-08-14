import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://1099backend.searskairos.ai';

const TOKEN_KEY = 'kairos_access_token';
const REFRESH_KEY = 'kairos_refresh_token';
const USER_KEY = 'kairos_user';

export type AuthUser = {
  userId: number;
  role: string;
  vendorId?: number;
  name?: string;
  username?: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
};

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${API_BASE_URL}/api/auth/login`,
    { username, password },
  );
  if (data.success && data.data) {
    // Only allow admin users to login
    const role = data.data.user?.role ?? '';
    if (!role.includes('admin')) {
      return { success: false, message: 'Access denied. Only admin users can access this dashboard.' };
    }
    setTokens(data.data.accessToken, data.data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
  }
  return data;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export async function logout() {
  const token = getAccessToken();
  // Clear local storage first
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  // Call backend logout (fire and forget)
  if (token) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore errors — tokens already cleared locally
    }
  }
}
