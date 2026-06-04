import { getAuthHeaders } from "./auth-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

export async function generateScenariosForSrs(srsId: number | string, filePath?: string) {
  const res = await fetch(`${API_BASE_URL}/generation/srs/${srsId}/scenarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ filePath }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Trường hợp này server trả JSON object
  return await res.json();
}

export async function getScenariosJSONByAbsPath(absPath: string, srsId?: number | string) {
  if (!srsId) {
    throw new Error("SRS id is required for scenario generation");
  }
  return generateScenariosForSrs(srsId, absPath.replace(/\\/g, "/"));
}

// Interface cho response từ API
export interface GeneratedScenariosResponse {
  scenarios?: {
    UC_id: string;
    S_id: string;
    Title: string;
    Precondition: string;
    Postcondition?: string;
    Steps: string[];
    "Expected Result": string;
    s_id: string;
  }[];
  [key: string]: any; // Cho phép các field khác từ backend
}

// Helper function để validate response
export function validateResponse(data: any): GeneratedScenariosResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format from server');
  }
  
  return data as GeneratedScenariosResponse;
}
