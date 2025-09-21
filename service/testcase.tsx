import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const getAllTestCases = async (scenario_id:number ) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/test-cases/scenario/${scenario_id}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test cases:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test cases:", error);
        throw error;
    }
}
const getTestCaseById = async (id: number) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/test-cases/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test case:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test case:", error);
        throw error;
    }
}
const createTestCase = async (data: any) => {
    // Chỉ gửi các field mà BE cần
    const payload = {
        scenarioId: data.scenarioId,
        testItem: data.testItem,
        testClassification: data.testClassification,
        runConfig: data.runConfig
        // Bỏ configDetails
    };
    
    console.log('Sending simplified payload:', payload);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/test-cases`, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error creating test case:", error.response?.data);
        } else {
            console.error("Error creating test case:", error);
        }
        throw error;
    }
}

export { getAllTestCases, getTestCaseById, createTestCase };