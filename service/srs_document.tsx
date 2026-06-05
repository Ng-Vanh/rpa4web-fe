import axios from "axios";
import { clearAuthData, getUserId } from "./auth-utils";
import { apiClient, MAIN_API_BASE_URL } from "./api-client";
const API_BASE_URL = MAIN_API_BASE_URL;

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
    const response = await apiClient.get(`/srs/user/${userId}`);
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

const getSrsDocumentById = async (srsId: number) => {
  try {
    const response = await apiClient.get(`/srs/${srsId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching SRS document by id:", error);

    if (error.response?.status === 401) {
      clearAuthData();
      throw new Error("Authentication failed. Please login again.");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || "Failed to fetch SRS document");
  }
};

// Thêm các function khác nếu cần
const uploadSrsDocument = async (formData: FormData) => {
  try {
    // Lấy user ID từ token (fallback method)
    let userId = getUserId();
    
    // Nếu không lấy được từ token, gọi API /me để lấy thông tin user
    if (!userId) {
      console.log('Getting user info from API /me...');
      const userInfo = await getCurrentUser();
      userId = (userInfo as any)?.id || (userInfo as any)?.userId;
      
      if (!userId) {
        throw new Error("User not authenticated. Please login again.");
      }
    }

    // Thêm user ID vào FormData
    formData.append('userId', userId.toString());

    console.log('Uploading SRS document for user ID:', userId);
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    const response = await apiClient.post("/srs/upload-file", formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Error uploading SRS document:", error);
    console.error("Error response:", error.response);
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
    
    if (error.response?.status === 401) {
      clearAuthData();
      throw new Error("Authentication failed. Please login again.");
    }
    
    // Hiển thị thông tin lỗi chi tiết từ backend
    if (error.response?.data?.message) {
      throw new Error(`Backend error: ${error.response.data.message}`);
    }
    
    if (error.response?.data?.error) {
      throw new Error(`Backend error: ${error.response.data.error}`);
    }
    
    if (error.response?.status === 500) {
      throw new Error(`Server error (500): ${error.response?.data?.message || 'Internal server error. Please check backend logs.'}`);
    }
    
    throw new Error(error.message || "Failed to upload SRS document");
  }
};

// Lấy thông tin user hiện tại từ API /me
const getCurrentUser = async () => {
  try {
    const response = await apiClient.get(`/auth/me`);
    return response.data;
  } catch (error: any) {
    console.error("Error getting current user:", error);
    
    if (error.response?.status === 401) {
      clearAuthData();
      throw new Error("Authentication failed. Please login again.");
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || "Failed to get current user");
  }
};

const deleteSrsDocument = async (srsId: number) => {
  try {
    const response = await apiClient.delete(`/srs/${srsId}`);
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
  getSrsDocumentById,
  uploadSrsDocument, 
  deleteSrsDocument,
  getCurrentUser
};

// Lấy preview PDF (byte stream) cho SRS
export const getSrsPreview = async (srsId: number, rangeHeader?: string) => {
  const baseAuth = getAuthHeaders();
  const headers: Record<string, string> = {
    Accept: 'application/pdf',
  };
  if (baseAuth && (baseAuth as any).Authorization) {
    headers['Authorization'] = (baseAuth as any).Authorization as string;
  }
  if (rangeHeader) headers['Range'] = rangeHeader; // ví dụ: 'bytes=0-1048575'

  const response = await axios.get(`${API_BASE_URL}/srs/${srsId}/preview`, {
    headers,
    responseType: 'blob', // nhận về blob (PDF)
    validateStatus: () => true,
    timeout: 10000, // 10 seconds timeout
  });

  if (response.status === 200 || response.status === 206) {
    return response.data as Blob; // PDF blob
  }

  throw new Error(typeof response.data === 'string' ? response.data : `HTTP ${response.status}`);
};