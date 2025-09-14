import axios from "axios";
import { clearAuthData } from "./auth-utils";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

// Helper function để lấy token từ localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function để tạo auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getSrsDocument = async (userId: number) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/srs/user/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    console.log('Fetched SRS documents:', response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching SRS document:", error);
    
    // Xử lý lỗi authentication
    if (error.response?.status === 401) {
      // Token expired hoặc invalid, có thể redirect về login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error("Authentication failed. Please login again.");
    }
    
    // Xử lý các lỗi khác
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || "Failed to fetch SRS documents");
  }
};

// Thêm các function khác nếu cần
const uploadSrsDocument = async (formData: FormData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/srs/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders(),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error uploading SRS document:", error);
    
    if (error.response?.status === 401) {
      clearAuthData();
      throw new Error("Authentication failed. Please login again.");
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || "Failed to upload SRS document");
  }
};

const deleteSrsDocument = async (srsId: number) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/srs/${srsId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error deleting SRS document:", error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error("Authentication failed. Please login again.");
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || "Failed to delete SRS document");
  }
};

export { 
  getSrsDocument, 
  uploadSrsDocument, 
  deleteSrsDocument 
};