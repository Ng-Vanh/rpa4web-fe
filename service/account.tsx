// account.ts
import axios from "axios";
import { MAIN_API_BASE_URL } from "./api-client";

const API_BASE_URL = MAIN_API_BASE_URL;

// Interface response từ backend
interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  token?: string;
}

// Helper function để safely handle localStorage
const safeLocalStorage = {
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting localStorage ${key}:`, error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(key);
        return item && item !== 'undefined' ? item : null;
      }
      return null;
    } catch (error) {
      console.error(`Error getting localStorage ${key}:`, error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage ${key}:`, error);
    }
  },
  
  clear: (): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

const signup = async (
  username: string,
  password: string,
  role: string = "user"
): Promise<AuthResponse> => {
  try {
    console.log('🚀 Calling signup API:', `${API_BASE_URL}/auth/signup`);
    
    const res = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/signup`, {
      username,
      password,
      role,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Signup response:', res.data);
    return res.data;
  } catch (err: any) {
    console.error('❌ Signup error:', err);
    const msg = err.response?.data?.message || err.message || "Signup failed";
    throw new Error(msg);
  }
};

const login = async (
  usernameOrEmail: string,
  password: string
): Promise<AuthResponse> => {
  try {
    console.log('🚀 Calling login API:', `${API_BASE_URL}/auth/login`);
    console.log('Login payload:', { usernameOrEmail, password: '***' });
    
    const res = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, {
      usernameOrEmail: usernameOrEmail.trim(),
      password: password.trim(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Login response:', res.data);

    // Kiểm tra response structure và lưu vào localStorage
    if (res.data.success) {
      if (res.data.token) {
        console.log('💾 Saving token to localStorage');
        safeLocalStorage.setItem("token", res.data.token);
      }
      
      if (res.data.user) {
        console.log('💾 Saving user to localStorage');
        safeLocalStorage.setItem("user", JSON.stringify(res.data.user));
      }
      
      // Verify sau khi lưu
      console.log('🔍 Verification:');
      console.log('Token in storage:', safeLocalStorage.getItem("token"));
      console.log('User in storage:', safeLocalStorage.getItem("user"));
    }

    return res.data;
  } catch (err: any) {
    console.error('❌ Login error:', err);
    
    // Clear any invalid tokens
    safeLocalStorage.removeItem("token");
    safeLocalStorage.removeItem("user");
    
    const msg = err.response?.data?.message || err.message || "Login failed";
    throw new Error(msg);
  }
};

// Hàm logout
const logout = (): void => {
  console.log('🚪 Logging out...');
  safeLocalStorage.removeItem("token");
  safeLocalStorage.removeItem("user");
  console.log('✅ Logged out successfully');
};

// Hàm lấy token
const getAuthToken = (): string | null => {
  return safeLocalStorage.getItem("token");
};

// Hàm lấy user info
const getUserInfo = (): any | null => {
  try {
    const userStr = safeLocalStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
};

// Hàm kiểm tra authentication
const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getUserInfo();
  return !!(token && user);
};

// Axios instance có Authorization header
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm Authorization header
authAxios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Added Authorization header to request');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor để handle 401 errors
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('🚨 401 Unauthorized - clearing auth data');
      logout();
      
      // Có thể redirect về login page
      if (typeof window !== 'undefined') {
        // window.location.href = '/login'; // uncomment nếu cần redirect
      }
    }
    return Promise.reject(error);
  }
);

// Debug function để check localStorage
const debugAuthState = (): void => {
  console.log('=== AUTH DEBUG INFO ===');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Token:', getAuthToken());
  console.log('User:', getUserInfo());
  console.log('Is Authenticated:', isAuthenticated());
  console.log('======================');
};

export { 
  signup, 
  login, 
  logout,
  getAuthToken, 
  getUserInfo,
  isAuthenticated,
  authAxios,
  debugAuthState
};
