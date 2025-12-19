// api.ts - Chứa tất cả API calls

import { LOAD_IMAGE_URL, AUTO_TEST_DOM_URL, AUTO_TEST_IMAGE_URL, TEST_CASE_STEP_URL } from "./constants"
import { ApiResponse } from "./types"

export const apiService = {
    openChrome: async (): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_DOM_URL}/open-chrome`, {
        method: "POST",
        })
        return response.json()
    },

    // GEN TEST SCENARIO CALL Gemini API - UPDATED
    generateTestScenario: async (imageUrl: string): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_DOM_URL}/gen-test-scenario`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            imageUrl: imageUrl
        }),
        })
        return response.json()
    },

    // ⭐ XÓA uploadFlowchart - Dùng uploadImage thay thế

    // PROCESS IMAGE CALLS
    uploadImage: async (file: File): Promise<ApiResponse> => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${LOAD_IMAGE_URL}/upload-image`, {
        method: "POST",
        body: formData,
        })

        return response.json()
    },

    listImages: async (): Promise<ApiResponse> => {
        const response = await fetch(`${LOAD_IMAGE_URL}/list-images`)
        return response.json()
    },

    deleteImage: async (filename: string): Promise<ApiResponse> => {
        const response = await fetch(`${LOAD_IMAGE_URL}/delete-image/${filename}`, {
        method: "DELETE",
        })
        return response.json()
    },


    // RUN SCRIPT - DOM 
    runScriptDOM: async (script: string, url: string): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_DOM_URL}/run-script-dom`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ script, url }),
        })
        return response.json()
    },

    viewScriptDOM: async (): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_DOM_URL}/view-script-dom`)
        return response.json()
    },


    // RUN SCRIPT - IMAGE 
    runScriptImage: async (script: string, url: string): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_IMAGE_URL}/run-script-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ script, url }),
        })
        return response.json()
    },

    viewScriptImage: async (): Promise<ApiResponse> => {
        const response = await fetch(`${AUTO_TEST_IMAGE_URL}/view-script-image`)
        return response.json()
    },

    // TEST CASE STEP APIs
    saveActionDescription: async (testCaseId: number, actionDescription: string, stepOrder: number = 1): Promise<ApiResponse> => {
        const response = await fetch(`${TEST_CASE_STEP_URL}/save-action-description`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ testCaseId, actionDescription, stepOrder }),
        })
        return response.json()
    },

    saveScriptCode: async (testCaseId: number, scriptCode: string, stepOrder: number = 1): Promise<ApiResponse> => {
        const response = await fetch(`${TEST_CASE_STEP_URL}/save-script-code`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ testCaseId, scriptCode, stepOrder }),
        })
        return response.json()
    },

    getTestCaseStep: async (testCaseId: number, stepOrder: number = 1): Promise<ApiResponse> => {
        const response = await fetch(`${TEST_CASE_STEP_URL}/${testCaseId}/${stepOrder}`)
        return response.json()
    },
}