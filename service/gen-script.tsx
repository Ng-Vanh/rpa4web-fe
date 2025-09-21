import axios from "axios";
import { getAuthHeaders } from "./auth-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const generateTestScript = async (testCaseId: number) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gen/generate/${testCaseId}`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Error generating test script:", error);
        throw error;
    }
};

export { generateTestScript };
