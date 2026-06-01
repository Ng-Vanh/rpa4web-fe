import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
import { apiClient, MAIN_API_BASE_URL } from "./api-client";
const API_BASE_URL = MAIN_API_BASE_URL;

const getAllExecutionConfigs = async () => {
    try {
        const response = await apiClient.get(`/execution-configs`);
        console.log('Fetched execution configs:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching execution configs:", error);
        throw error;
    }
}

const getExecutionConfigById = async (configId: number) => {
    try {
        const response = await apiClient.get(`/execution-configs/${configId}`);
        console.log('Fetched execution config:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching execution config:", error);
        throw error;
    }
}

const createNewExecutionConfig = async (data: any) => {
  try {
    const response = await apiClient.post(`/execution-configs`, data);
    return response.data; // trả về ExecutionConfig sau khi lưu
  } catch (error: any) {
    console.error("Error creating execution config:", error);
    throw error.response?.data || error;
  }
};
const updateExecutionConfig = async (configId: number, data: any) => {
  try {
    const response = await apiClient.patch(`/execution-configs/${configId}`, data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating execution config:", error);
    throw error.response?.data || error;
  }
};

const getLlmConfig = async (userId: number) => {
    try {
        const response = await apiClient.get(`/config/llm/${userId}`);
        const config = Array.isArray(response.data) ? response.data[0] ?? null : response.data;
        console.log("Fetched LLM config:", config);
        return config;
    } catch (error) {
        console.error("Error fetching LLM config:", error);
        throw error;
    }
};


// Tạo mới LLM config
 const createLlmConfig = async (data: { modelName: string; apiKey: string; userId: number }) => {
    try {
        const response = await apiClient.post(`/config/llm`, {
            userId: String(data.userId),
            provider: "openai",
            modelName: data.modelName,
            apiKeyEncrypted: data.apiKey,
            isDefault: true,
        });
        console.log("Created LLM config:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating LLM config:", error);
        throw error;
    }
};
export { getAllExecutionConfigs, getExecutionConfigById, createNewExecutionConfig, updateExecutionConfig, getLlmConfig, createLlmConfig };
