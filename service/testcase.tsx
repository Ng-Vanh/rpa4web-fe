import axios from "axios";
import { getAuthHeaders } from "./auth-utils";
import { createNewTestCaseStep, getAllTestCaseSteps } from "./testcase-step";
const API_BASE_URL = process.env.NEXT_PUBLIC_MAIN_BACKEND_URL;

const getAllTestCases = async (scenario_id:number ) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/test-cases/scenario/${scenario_id}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test cases:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test cases:", error);
        throw error;
    }
}
const getTestCaseById = async (id: number) => {
    try{
        const response = await axios.get(`${API_BASE_URL}/test-cases/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Fetched test case:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching test case:", error);
        throw error;
    }
}
const createTestCase = async (data: any) => {
    // Chỉ gửi các field mà BE cần
    const payload = {
        scenarioId: data.scenarioId,
        testItem: data.testItem,
        testClassification: data.testClassification,
        runConfig: data.runConfig
        // Bỏ configDetails
    };
    
    console.log('Sending simplified payload:', payload);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/test-cases`, payload, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error creating test case:", error.response?.data);
        } else {
            console.error("Error creating test case:", error);
        }
        throw error;
    }
}

const generateTestCases = async (scenario: any) => {
    try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_GEN_TC_BACKEND_URL}/gentc`, scenario, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log('Generated test cases:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error generating test cases:", error);
        throw error;
    }
}

const createTestCaseWithSteps = async (scenarioId: number, testCases: any[]) => {
    try {
        const results = [];
        
        for (const testCase of testCases) {
            // Tạo test case
            const testCaseData = {
                scenarioId: scenarioId,
                testItem: testCase.test_item,
                testClassification: testCase.test_classification,
                runConfig: null // Có thể để null hoặc thêm config mặc định
            };
            
            const createdTestCase = await createTestCase(testCaseData);
            console.log('Created test case:', createdTestCase);
            
            // Tạo các steps cho test case này
            const stepResults = [];
            for (const step of testCase.steps) {
                const stepData = {
                    testCaseId: createdTestCase.id,
                    stepOrder: step.step_order,
                    actionDescription: step.action_description,
                    inputData: JSON.stringify(step.input_data),
                    expectedOutput: step.expected_output,
                    scriptCode: "" // Có thể để trống hoặc thêm script mặc định
                };
                
                const createdStep = await createNewTestCaseStep(stepData);
                stepResults.push(createdStep);
                console.log('Created test case step:', createdStep);
            }
            
            results.push({
                testCase: createdTestCase,
                steps: stepResults
            });
        }
        
        return results;
    } catch (error) {
        console.error("Error creating test cases with steps:", error);
        throw error;
    }
}

const getTestCasesWithSteps = async (scenarioId: number) => {
    try {
        // Lấy danh sách test cases của scenario
        const testCases = await getAllTestCases(scenarioId);
        
        // Lấy steps cho từng test case
        const testCasesWithSteps = await Promise.all(
            testCases.map(async (testCase: any) => {
                const steps = await getAllTestCaseSteps(testCase.id);
                return {
                    ...testCase,
                    steps: steps
                };
            })
        );
        
        console.log('Fetched test cases with steps:', testCasesWithSteps);
        return testCasesWithSteps;
    } catch (error) {
        console.error("Error fetching test cases with steps:", error);
        throw error;
    }
}

const updateTestCase = async (tcId: number, data: any) => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/test-cases/${tcId}`, data, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Updated test case:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error updating test case:", error);
        throw error;
    }
}

const deleteTestCase = async (tcId: number) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/test-cases/${tcId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });
        console.log('Deleted test case:', tcId);
        return response.data;
    } catch (error) {
        console.error("Error deleting test case:", error);
        throw error;
    }
}

export { getAllTestCases, getTestCaseById, createTestCase, generateTestCases, createTestCaseWithSteps, getTestCasesWithSteps, updateTestCase, deleteTestCase };