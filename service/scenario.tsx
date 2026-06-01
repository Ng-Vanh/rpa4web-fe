// services/scenario.ts
import axios from "axios";
import { apiClient } from "./api-client";

const API_BASE = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL; // kept for compatibility comments

export type ScenarioWire = {
  id: number;
  srsId: number;
  title: string;
  description?: any; // backend có thể trả string hoặc JSON, ta sẽ parse mềm
  webUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

// --- helpers: chuyển đổi mô phỏng Map<String,String> ---
function toBodyStrings(input: {
  srsId?: number;
  title?: string;
  description?: any;  // object | string | undefined
  webUrl?: string;
}) {
  const body: Record<string, string> = {};
  if (input.srsId !== undefined) body.srsId = String(input.srsId);
  if (input.title !== undefined) body.title = input.title ?? "";
  if (input.webUrl !== undefined) body.webUrl = input.webUrl ?? "";
  if (input.description !== undefined) {
    body.description =
      typeof input.description === "string"
        ? input.description
        : JSON.stringify(input.description); // stringify nếu là object
  }
  return body;
}

function tryParseJSON(maybeJSON: any) {
  if (typeof maybeJSON !== "string") return maybeJSON;
  try { return JSON.parse(maybeJSON); } catch { return maybeJSON; }
}

// --- API calls ---
export async function getAllScenarios(): Promise<ScenarioWire[]> {
  const res = await apiClient.get(`/scenarios`);
  // parse mềm description nếu backend trả string
  return res.data.map((s: any) => ({ ...s, description: tryParseJSON(s.description) }));
}

export async function getScenario(id: number): Promise<ScenarioWire> {
  const res = await apiClient.get(`/scenarios/${id}`);
  const s = res.data;
  return { ...s, description: tryParseJSON(s.description) };
}

export async function getScenariosBySrsId(srsId: number): Promise<ScenarioWire[]> {
  const res = await apiClient.get(`/scenarios/srs/${srsId}`);
  return res.data.map((s: any) => ({ ...s, description: tryParseJSON(s.description) }));
}

export async function createScenario(input: {
  srsId: number;
  title: string;
  description?: any;
  webUrl?: string;
}): Promise<ScenarioWire> {
  const payload = toBodyStrings(input);
  const res = await apiClient.post(`/scenarios`, payload, {
    validateStatus: () => true,
  });
  if (res.status === 201) {
    const s = res.data;
    return { ...s, description: tryParseJSON(s.description) };
  }
  // Backend: 400 "SrsDocument not found"
  throw new Error(typeof res.data === "string" ? res.data : `HTTP ${res.status}`);
}

export async function updateScenario(id: number, input: {
  title?: string;
  description?: any;
  webUrl?: string;
}): Promise<ScenarioWire> {
  const payload = toBodyStrings(input);
  const res = await apiClient.patch(`/scenarios/${id}`, payload, {
    validateStatus: () => true,
  });
  if (res.status === 200) {
    const s = res.data;
    return { ...s, description: tryParseJSON(s.description) };
  }
  // Backend: 404 nếu không tồn tại
  throw new Error(typeof res.data === "string" ? res.data : `HTTP ${res.status}`);
}

export async function deleteScenario(id: number): Promise<void> {
  const res = await apiClient.delete(`/scenarios/${id}`, {
    validateStatus: () => true,
  });
  if (res.status === 200 || res.status === 204) return;
  if (res.status === 404) throw new Error("Not found");
  throw new Error(`HTTP ${res.status}`);
}
