import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
import { MAIN_API_BASE_URL } from "./api-client";

const API_BASE_URL = MAIN_API_BASE_URL.replace(/\/$/, "");

function requireTestCaseId(testCaseId: number): number {
    if (!Number.isSafeInteger(testCaseId) || testCaseId <= 0) {
        throw new Error("A valid test case id is required to generate scripts");
    }
    return testCaseId;
}

function scriptApiError(error: unknown, action: string): Error {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error : new Error(`${action} failed`);
    }

    const status = error.response?.status;
    const data = error.response?.data;
    let detail: string | undefined;

    if (typeof data === "string") {
        detail = /^\s*<!doctype html/i.test(data)
            ? "Server returned an HTML page instead of an API response"
            : data.slice(0, 300);
    } else if (Array.isArray(data?.message)) {
        detail = data.message.join(", ");
    } else if (typeof data?.message === "string") {
        detail = data.message;
    } else if (typeof data?.error === "string") {
        detail = data.error;
    }

    return new Error(
        `${action}${status ? ` (HTTP ${status})` : ""}${detail ? `: ${detail}` : ""}`,
    );
}

// By Vanh
const generateTestScript = async (testCaseId: number) => {
    const validTestCaseId = requireTestCaseId(testCaseId);
    try {
        const response = await axios.post(`${API_BASE_URL}/gen/generate/${validTestCaseId}`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Error generating test script:", error);
        throw scriptApiError(error, "Test script generation failed");
    }
};
const generateTestScriptByModel = async (testCaseId: number) => {
    const validTestCaseId = requireTestCaseId(testCaseId);
    try {
        const response = await axios.post(`${API_BASE_URL}/generation/scripts/model/${validTestCaseId}`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Error generating test script By model:", error);
        throw scriptApiError(error, "Model script generation failed");
    }
};

const generateTestScriptByLLM = async (testCaseId: number) => {
    const validTestCaseId = requireTestCaseId(testCaseId);
    try {
        const response = await axios.post(`${API_BASE_URL}/generation/scripts/llm/${validTestCaseId}`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Error generating test script By LLM:", error);
        throw scriptApiError(error, "LLM script generation failed");
    }
};



// By Thu

const generateAllTestScripts = async (testCaseId: number) => {
    const validTestCaseId = requireTestCaseId(testCaseId);
    try {
        const response = await axios.post(`${API_BASE_URL}/generation/scripts/llm/${validTestCaseId}`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Error generating all test scripts:", error);
        throw scriptApiError(error, "Generate all test scripts failed");
    }
};

const getTestScript = async (testCaseId: number) => {
    const validTestCaseId = requireTestCaseId(testCaseId);
    try {
        const response = await axios.get(`${API_BASE_URL}/gen-python/get-script/${validTestCaseId}`, {
            headers: getAuthHeaders()
        });
        const script = response.data?.script;
        return typeof script === "string" ? script : "";
    } catch (error) {
        console.error("Error getting test script:", error);
        throw scriptApiError(error, "Get full test script failed");
    }
};

export { generateTestScript, generateTestScriptByModel, generateTestScriptByLLM, generateAllTestScripts, getTestScript };
