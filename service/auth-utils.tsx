// auth-utils.ts
// Utility functions for handling authentication

interface User {
  id: number;
  username: string;
  role: string;
}

interface DecodedToken {
  sub?: string; // subject (usually user ID)
  userId?: number;
  username?: string;
  role?: string;
  exp?: number; // expiration time
  iat?: number; // issued at time
}

// Helper function to safely get item from localStorage
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(key);
    return item && item !== 'undefined' && item !== 'null' ? item : null;
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return null;
  }
};

// Helper function to safely set item to localStorage
const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting ${key} to localStorage:`, error);
  }
};

// Helper function to remove item from localStorage
const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
};

// Decode JWT token (basic implementation - không verify signature)
const decodeJWTToken = (token: string): DecodedToken | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeJWTToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get user ID from various sources
export const getUserId = (): number | null => {
  try {
    // Thử lấy từ user info trước
    const userStr = getStorageItem('user');
    if (userStr) {
      const user: User = JSON.parse(userStr);
      if (user?.id) {
        return user.id;
      }
    }

    // Fallback: lấy từ token
    const token = getStorageItem('token');
    if (token && !isTokenExpired(token)) {
      const decoded = decodeJWTToken(token);
      if (decoded) {
        // Thử các field có thể chứa user ID
        return decoded.userId || 
               (decoded.sub ? parseInt(decoded.sub) : null);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Get auth token
export const getAuthToken = (): string | null => {
  const token = getStorageItem('token');
  if (token && !isTokenExpired(token)) {
    return token;
  }
  
  // Token expired, clear storage
  if (token) {
    clearAuthData();
  }
  
  return null;
};

// Get user info
export const getUserInfo = (): User | null => {
  try {
    const userStr = getStorageItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  const token = getAuthToken();
  const user = getUserInfo();
  return !!(token && user);
};

// Save auth data after login
export const saveAuthData = (token: string, user: User): void => {
  setStorageItem('token', token);
  setStorageItem('user', JSON.stringify(user));
};

// Clear auth data on logout
export const clearAuthData = (): void => {
  removeStorageItem('token');
  removeStorageItem('user');
};

// Get auth headers for API requests
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};