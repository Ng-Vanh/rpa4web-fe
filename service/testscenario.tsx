import axios from "axios";
import { clearAuthData, getAuthHeaders } from "./auth-utils";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const getListTestScenarios = async (srsId: number) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/scenarios/srs/${srsId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test scenarios:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test scenarios:", error);
        throw error;
    }
}
const getTestScenarioById = async (id: number) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/scenarios/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test scenario:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test scenario:", error);
        throw error;
    }
}
const createTestScenario = async (testScenarioData: any) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/scenarios`, testScenarioData, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Created test scenario:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error creating test scenario:", error);
        throw error;
    }
}

export { getListTestScenarios, getTestScenarioById, createTestScenario };