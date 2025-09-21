// generate-test-cases.tsx
// Service để gọi API generate test cases từ SRS document

const API_URL = process.env.NEXT_PUBLIC_GEN_TC_BACKEND_URL as string;

export async function getScenariosJSONByAbsPath(absPath: string) {
  // LƯU Ý: dùng forward slash hoặc escape backslash
  const safePath = absPath.replace(/\\/g, "/");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abs_path: safePath }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Trường hợp này server trả JSON object
  return await res.json();
}

// Interface cho response từ API
export interface GeneratedTestCasesResponse {
  scenarios?: any[];
  testCases?: any[];
  [key: string]: any; // Cho phép các field khác từ backend
}

// Helper function để validate response
export function validateResponse(data: any): GeneratedTestCasesResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format from server');
  }
  
  return data as GeneratedTestCasesResponse;
}
