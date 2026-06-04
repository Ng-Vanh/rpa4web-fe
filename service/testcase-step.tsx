import axios from "axios";
import { getAuthHeaders } from "./auth-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const hasImageFile = (data: any) =>
  data?.stepImage instanceof File ||
  data?.objectImage instanceof File ||
  data?.relatedObjectImage instanceof File;

const assertNoStepImageFiles = (data: any) => {
  if (hasImageFile(data)) {
    throw new Error(
      "Step image upload is not supported by the current test-step API yet"
    );
  }
};

const buildCreateStepPayload = (data: any) => ({
  testCaseId: String(data.testCaseId),
  stepOrder: Number(data.stepOrder),
  actionDescription: data.actionDescription || "",
  inputData: data.inputData || "",
  expectedOutput: data.expectedOutput || "",
  scriptCode: data.scriptCode || "",
});

const buildUpdateStepPayload = (data: any) => {
  const payload: Record<string, any> = {};

  if (data.testCaseId !== undefined && data.testCaseId !== null) {
    payload.testCaseId = String(data.testCaseId);
  }
  if (data.stepOrder !== undefined && data.stepOrder !== null) {
    payload.stepOrder = Number(data.stepOrder);
  }
  if (data.actionDescription !== undefined && data.actionDescription !== null) {
    payload.actionDescription = data.actionDescription;
  }
  if (data.inputData !== undefined && data.inputData !== null) {
    payload.inputData = data.inputData;
  }
  if (data.expectedOutput !== undefined && data.expectedOutput !== null) {
    payload.expectedOutput = data.expectedOutput;
  }
  if (data.scriptCode !== undefined && data.scriptCode !== null) {
    payload.scriptCode = data.scriptCode;
  }
  if (data.stepType !== undefined && data.stepType !== null) {
    payload.stepType = data.stepType;
  }
  if (data.scriptLanguage !== undefined && data.scriptLanguage !== null) {
    payload.scriptLanguage = data.scriptLanguage;
  }
  if (data.imgUrl !== undefined && data.imgUrl !== null) {
    payload.imgUrl = data.imgUrl;
  }
  if (data.objectImgUrl !== undefined && data.objectImgUrl !== null) {
    payload.objectImgUrl = data.objectImgUrl;
  }
  if (data.relatedObjectImgUrl !== undefined && data.relatedObjectImgUrl !== null) {
    payload.relatedObjectImgUrl = data.relatedObjectImgUrl;
  }

  return payload;
};

const getAllTestCaseSteps = async (testCaseId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/test-steps/test-case/${testCaseId}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      }
    );
    console.log("Fetched test case steps:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching test case steps:", error);
    throw error;
  }
};

const createNewTestCaseStep = async (data: any) => {
  try {
    // Validate required fields
    if (!data.testCaseId || !data.stepOrder || !data.actionDescription) {
      throw new Error(
        "Missing required fields: testCaseId, stepOrder, or actionDescription"
      );
    }

    assertNoStepImageFiles(data);
    const payload = buildCreateStepPayload(data);

    console.log("Creating test case step with data:", {
      ...payload,
      hasStepImage: !!(data.stepImage && data.stepImage instanceof File),
      hasObjectImage: !!(data.objectImage && data.objectImage instanceof File),
      hasRelatedObjectImage: !!(
        data.relatedObjectImage && data.relatedObjectImage instanceof File
      ),
    });

    const response = await axios.post(`${API_BASE_URL}/test-steps`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      timeout: 30000,
    });

    console.log("Created test case step:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating test case step:", error);

    if (axios.isAxiosError(error)) {
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || "Invalid request data");
      } else if (error.response?.status === 500) {
        throw new Error(error.response?.data?.error || "Server error occurred");
      }
    }

    throw error;
  }
};

const updateTestCaseStep = async (stepId: number, data: any) => {
  try {
    if (!stepId || stepId <= 0) {
      throw new Error("Invalid step ID");
    }

    assertNoStepImageFiles(data);
    const payload = buildUpdateStepPayload(data);

    console.log(
      "Updating test case step:",
      stepId,
      "with fields:",
      Object.keys(payload)
    );

    const response = await axios.patch(
      `${API_BASE_URL}/test-steps/${stepId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        timeout: 30000,
      }
    );

    console.log("Updated test case step:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating test case step:", error);

    if (axios.isAxiosError(error)) {
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      if (error.response?.status === 404) {
        throw new Error("Test case step not found");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || "Invalid request data");
      } else if (error.response?.status === 500) {
        throw new Error(error.response?.data?.error || "Server error occurred");
      }
    }

    throw error;
  }
};

const deleteTestCaseStep = async (stepId: number) => {
  try {
    if (!stepId || stepId <= 0) {
      throw new Error("Invalid step ID");
    }

    const response = await axios.delete(
      `${API_BASE_URL}/test-steps/${stepId}`,
      {
        headers: {
          ...getAuthHeaders(),
        },
      }
    );

    console.log("Deleted test case step:", stepId);
    return response.data;
  } catch (error) {
    console.error("Error deleting test case step:", error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("Test case step not found");
      }
    }

    throw error;
  }
};

// Utility function to validate image file
const validateImageFile = (file: File): boolean => {
  if (!file.type.startsWith("image/")) {
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  return true;
};

// Image upload service (standalone - for future implementation)
const uploadStepImage = async (file: File): Promise<string> => {
  try {
    if (!validateImageFile(file)) {
      throw new Error("Invalid image file");
    }

    const formData = new FormData();
    formData.append("image", file);

    console.log("Uploading step image:", file.name, "Size:", file.size);

    const response = await axios.post(
      `${API_BASE_URL}/upload/step-image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...getAuthHeaders(),
        },
        timeout: 30000,
      }
    );

    console.log("Image upload response:", response.data);

    if (response.data.success) {
      return response.data.imageUrl;
    } else {
      throw new Error(response.data.error || "Upload failed");
    }
  } catch (error) {
    console.error("Error uploading step image:", error);
    if (axios.isAxiosError(error)) {
      console.error("Upload error response:", error.response?.data);
    }
    throw error;
  }
};

const executeStep = async (stepId: number) => {
  try {
    if (!stepId || stepId <= 0) {
      throw new Error("Invalid step ID");
    }
    const response = await axios.post(
      `${API_BASE_URL}/test-execution-steps/${stepId}/execute`,
      {},
      {
        headers: {
          ...getAuthHeaders(),
        },
      }
    );

    console.log("Executed test case step:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error executing test case step:", error);
    if (axios.isAxiosError(error)) {
      console.error("Execution error response:", error.response?.data);
    }
    throw error;
  }
};

const getExecutionSteps = async (executionId: number) => {
  try {
    if (!executionId || executionId <= 0) {
      throw new Error("Invalid execution ID");
    }

    const response = await axios.get(
      `${API_BASE_URL}/test-execution-steps/${executionId}`,
      {
        headers: {
          ...getAuthHeaders(),
        },
      }
    );

    console.log("Fetched execution steps:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching execution steps:", error);
    if (axios.isAxiosError(error)) {
      console.error("Fetch error response:", error.response?.data);
    }
    throw error;
  }
};

const getLatestScore = async (stepId: number): Promise<number | null> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/test-execution-steps/${stepId}/latest-score`,
      { headers: { ...getAuthHeaders() } }
    );
    return response.data.score ?? null;
  } catch {
    return null;
  }
};

const checkScore = async (stepId: number) => {
    try {
        if (!stepId || stepId <= 0) {
            throw new Error('Invalid step ID');
        }

        const response = await axios.post(`${API_BASE_URL}/test-execution-steps/${stepId}/check-score`, {}, {
            headers: {
                ...getAuthHeaders(),
            },
        });

        console.log('Fetched test case step score:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test case step score:", error);
        if (axios.isAxiosError(error)) {
            console.error('Fetch error response:', error.response?.data);
        }
        throw error;
    }
}

   


export {
  getAllTestCaseSteps,
  createNewTestCaseStep,
  updateTestCaseStep,
  deleteTestCaseStep,
  uploadStepImage,
  validateImageFile,
  executeStep,
  getExecutionSteps,
  checkScore,
  getLatestScore,
};
