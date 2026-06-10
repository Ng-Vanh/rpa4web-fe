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

const parseBlobError = async (blob: Blob, status: number): Promise<string> => {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    if (parsed.message) return parsed.message;
    return text || `HTTP ${status}`;
  } catch {
    return `HTTP ${status}`;
  }
};

const normalizePdfBlob = (blob: Blob): Blob => {
  if (blob.type === 'application/pdf') return blob;
  return new Blob([blob], { type: 'application/pdf' });
};

// Lấy preview PDF (byte stream) cho SRS.
// Dùng /document thay vì /preview để tránh ad blocker chặn URL chứa "preview".
export const getSrsPreview = async (srsId: number | string, rangeHeader?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/pdf',
  };
  if (rangeHeader) headers['Range'] = rangeHeader;

  try {
    const response = await apiClient.get(`/srs/${srsId}/document`, {
      headers,
      responseType: 'blob',
      timeout: 60000,
      withCredentials: true,
    });

    const blob = response.data as Blob;
    if (!blob || blob.size === 0) {
      throw new Error('PDF preview rỗng hoặc không hợp lệ');
    }

    if (blob.type.includes('json')) {
      throw new Error(await parseBlobError(blob, response.status));
    }

    return normalizePdfBlob(blob);
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (data instanceof Blob) {
      throw new Error(await parseBlobError(data, status || 0));
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || 'Không tải được preview PDF');
  }
};