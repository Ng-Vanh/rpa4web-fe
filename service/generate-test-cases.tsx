import { getAuthHeaders } from "./auth-utils";
import { MAIN_API_BASE_URL } from "./api-client";

function requireSrsId(srsId: number | string | null | undefined): number | string {
  if (
    srsId === null ||
    srsId === undefined ||
    String(srsId).trim() === "" ||
    String(srsId).trim().toLowerCase() === "undefined"
  ) {
    throw new Error("SRS id is required for scenario generation");
  }

  return srsId;
}

function getErrorMessage(body: string, contentType: string | null): string {
  if (!body) return "No response body";

  if (contentType?.includes("application/json")) {
    try {
      const parsed = JSON.parse(body) as { message?: string | string[]; error?: string };
      if (Array.isArray(parsed.message)) return parsed.message.join(", ");
      if (typeof parsed.message === "string") return parsed.message;
      if (typeof parsed.error === "string") return parsed.error;
    } catch {
      // Fall through to the generic text response below.
    }
  }

  if (contentType?.includes("text/html") || /^\s*<!doctype html/i.test(body)) {
    return "Server returned an HTML page instead of an API response";
  }

  return body.length > 300 ? `${body.slice(0, 300)}...` : body;
}

export async function generateScenariosForSrs(
  srsId: number | string | null | undefined,
  filePath?: string,
) {
  const validSrsId = requireSrsId(srsId);
  const apiBaseUrl = MAIN_API_BASE_URL.replace(/\/$/, "");
  const endpoint = `${apiBaseUrl}/generation/srs/${encodeURIComponent(String(validSrsId))}/scenarios`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authorization = getAuthHeaders().Authorization;
  if (authorization) headers.Authorization = authorization;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ filePath }),
  });

  const contentType = res.headers.get("content-type");
  const body = await res.text();

  if (!res.ok) {
    const message = getErrorMessage(body, contentType);
    throw new Error(`Scenario API request failed (HTTP ${res.status}): ${message}`);
  }

  if (!contentType?.includes("application/json")) {
    throw new Error(
      `Scenario API returned ${contentType || "an unknown content type"} instead of JSON`,
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Scenario API returned invalid JSON");
  }
}

export async function getScenariosJSONByAbsPath(
  absPath: string,
  srsId?: number | string | null,
) {
  requireSrsId(srsId);
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
