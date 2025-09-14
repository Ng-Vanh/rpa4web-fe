import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const getListSrsDocuments = async (userId: number) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/srs/user/${userId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched SRS documents:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching SRS documents:", error);
        throw error;
    }
}
