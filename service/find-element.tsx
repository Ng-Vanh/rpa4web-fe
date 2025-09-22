import axios from "axios";
import { getAuthHeaders } from "./auth-utils"; 

const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL; // Base URL của BE

/**
 * Gọi API để tìm element bằng text.
 * @param text Văn bản cần tìm (string).
 * @returns Response từ API (string chứa XPath hoặc lỗi).
 */
const findElementByText = async (text: string): Promise<string> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/find_element_by_text`, 
            null, // Không có body, vì API dùng param
            {
                params: { text }, // Truyền param 'text'
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(), // Nếu cần auth, thêm header xác thực (bỏ nếu không cần)
                },
                timeout: 30000, // Timeout 30 giây để tránh treo nếu script Python chậm
            }
        );
        
        // Trả về data từ response (giả sử là string)
        console.log('Find element by text success:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error finding element by text:", error);
        
        // Xử lý lỗi chi tiết
        let errorMessage = "Error finding element by text. Please try again.";
        if (axios.isAxiosError(error)) {
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            if (error.response?.status === 500) {
                errorMessage = error.response?.data || 'Server error occurred';
            } else if (error.response?.status === 400) {
                errorMessage = error.response?.data?.error || 'Invalid request data';
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage); // Throw lỗi để component gọi có thể catch
    }
};

/**
 * Gọi API để tìm element bằng image.
 * @param file URL của hình ảnh cần tìm (string).
 * @returns Response từ API (string chứa XPath hoặc lỗi).
 */

const findElementByImage = async (file: string): Promise<string> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/find_element_by_image`, 
            { file }, // Body với 'file' là URL
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(), 
                },
                timeout: 600000, // Timeout 10 phút để tránh treo nếu script Python chậm
            }
        );
        
        // Trả về data từ response (giả sử là string)
        console.log('Find element by image success:', response.data);
        return response.data;
    }catch (error) {
        console.error("Error finding element by image:", error);
        
        // Xử lý lỗi chi tiết
        let errorMessage = "Error finding element by image. Please try again.";
        if (axios.isAxiosError(error)) {
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            if (error.response?.status === 500) {
                errorMessage = error.response?.data || 'Server error occurred';
            } else if (error.response?.status === 400) {
                errorMessage = error.response?.data?.error || 'Invalid request data';
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage); // Throw lỗi để component gọi có thể catch
    }
};

export { findElementByText, findElementByImage };