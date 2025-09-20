import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const getAllExecutionConfigs = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/execution-configs`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched execution configs:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching execution configs:", error);
        throw error;
    }
}

const getExecutionConfigById = async (configId: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/execution-configs/${configId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched execution config:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching execution config:", error);
        throw error;
    }
}

const createNewExecutionConfig = async (data: any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/execution-configs`, data);
    return response.data; // trả về ExecutionConfig sau khi lưu
  } catch (error: any) {
    console.error("Error creating execution config:", error);
    throw error.response?.data || error;
  }
};
const updateExecutionConfig = async (configId: number, data: any) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/execution-configs/${configId}`, data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating execution config:", error);
    throw error.response?.data || error;
  }
};

const getLlmConfig = async (userId: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/config/llm/${userId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log("Fetched LLM config:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching LLM config:", error);
        throw error;
    }
};


// Tạo mới LLM config
 const createLlmConfig = async (data: { modelName: string; apiKey: string; userId: number }) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/config/llm`, data, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log("Created LLM config:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating LLM config:", error);
        throw error;
    }
};
export { getAllExecutionConfigs, getExecutionConfigById, createNewExecutionConfig, updateExecutionConfig, getLlmConfig, createLlmConfig };