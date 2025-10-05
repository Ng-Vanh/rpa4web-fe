"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  ImageIcon,
  Target,
  FileText,
  Edit,
  Code,
  FileCode,
  Save,
  X,
  Upload,
  Trash2,
  Layers,
  Eye,
} from "lucide-react";
import {
  mockExpectedResults,
  mockExecutionSteps,
  mockVerifications,
} from "@/lib/mock-data";
import { StepEditModal } from "@/components/step-edit-modal";
import { ImageViewerModal } from "@/components/image-viewer-modal";
import { getTestCaseById } from "@/service/testcase";
import {
  getAllTestCaseSteps,
  createNewTestCaseStep,
  updateTestCaseStep,
  deleteTestCaseStep,
  uploadStepImage,
  validateImageFile,
} from "@/service/testcase-step";
import {
  generateTestScript,
  generateAllTestScripts,
  getTestScript,
} from "@/service/gen-script";
import {
  executeStep,
  getExecutionSteps,
  checkScore,
} from "@/service/testcase-step";
import { IconExpandButton } from "./ui/icon-expand-button";

interface TestCaseDetailScreenProps {
  onBack: () => void;
  testCase: any;
  initialView?: "details" | "execution";
}

interface TestCaseStep {
  id: number;
  testCaseId: number;
  stepOrder: number;
  actionDescription: string;
  inputData: string;
  expectedOutput: string;
  scriptCode?: string;
  imgUrl?: string;
  objectImgUrl?: string;
  relatedObjectImgUrl?: string;
  expectedPageUrl?: string;
}

interface TestExecutionStep {
  id: number;
  stepId: number;
  screenshotUrl?: string;
  executionResult?: string;
  status?: string;
  executedAt?: string;
}

interface TestCaseDetail {
  id: number;
  scenario: {
    id: number;
    name: string;
  };
  testItem: string;
  testClassification: string;
  createdAt: string;
  updatedAt: string;
  expected_output?: string;
  environment_condition?: string;
}

export function TestCaseDetailScreen({
  onBack,
  testCase: initialTestCase,
  initialView = "details",
}: TestCaseDetailScreenProps) {
  const [viewMode, setViewMode] = useState<"details" | "execution">(
    initialView
  );
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [stepScoreResults, setStepScoreResults] = useState<{
    [key: number]: { score: number; status: string };
  }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [stepColumnWidth, setStepColumnWidth] = useState(425);
  const [isResizing, setIsResizing] = useState(false);

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAllScripts, setIsGeneratingAllScripts] = useState(false);

  const [executingSteps, setExecutingSteps] = useState<Set<number>>(new Set());

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [fullScript, setFullScript] = useState<string>("");
  const [scriptError, setScriptError] = useState<string>("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [executionSteps, setExecutionSteps] = useState<{
    [stepId: number]: TestExecutionStep;
  }>({});

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const [testCase, setTestCase] = useState<TestCaseDetail>(initialTestCase);
  const [steps, setSteps] = useState<TestCaseStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);

  const [editFormData, setEditFormData] = useState({
    test_item: initialTestCase.testItem || initialTestCase.test_item || "",
    test_classification:
      initialTestCase.testClassification ||
      initialTestCase.test_classification ||
      "",
    environment_condition: initialTestCase.environment_condition || "",
    expected_output: initialTestCase.expected_output || "",
  });

  const [editSteps, setEditSteps] = useState<TestCaseStep[]>([]);

  const handleImageClick = (imageUrl: string, title: string) => {
    setViewingImage({ url: imageUrl, title });
    setImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setViewingImage(null);
  };

  useEffect(() => {
    const fetchTestCaseDetail = async () => {
      try {
        setLoading(true);
        const response = await getTestCaseById(testCase.id);
        const detailedTestCase = response.data || response;
        setTestCase(detailedTestCase);

        setEditFormData({
          test_item:
            detailedTestCase.testItem || detailedTestCase.test_item || "",
          test_classification:
            detailedTestCase.testClassification ||
            detailedTestCase.test_classification ||
            "",
          environment_condition: detailedTestCase.environment_condition || "",
          expected_output: detailedTestCase.expected_output || "",
        });
      } catch (error) {
        console.error("Failed to fetch test case details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestCaseDetail();
  }, [testCase.id]);

  useEffect(() => {
    fetchTestCaseSteps();
  }, [testCase.id]);

  const fetchTestCaseSteps = async () => {
    try {
      setStepsLoading(true);
      const response = await getAllTestCaseSteps(testCase.id);
      const fetchedSteps = response.data || response;

      const transformedSteps = fetchedSteps.map((step: TestCaseStep) => ({
        ...step,
        stepImage: null as File | null,
        imgUrl:
          step.imgUrl ||
          `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
      }));

      setSteps(transformedSteps);
      setEditSteps(transformedSteps);
    } catch (error) {
      console.error("Failed to fetch test case steps:", error);
      setSteps([]);
      setEditSteps([]);
    } finally {
      setStepsLoading(false);
    }
  };

  const getStepDisplayImage = (step: TestCaseStep) => {
    if (viewMode === "execution" && executionSteps[step.id]?.screenshotUrl) {
      return executionSteps[step.id].screenshotUrl;
    }
    return (
      step.imgUrl ||
      `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`
    );
  };

  const hasBeenGenerated =
    steps.length > 0 && steps.some((step) => step.scriptCode);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleStepModalSave = async (updatedStep: any) => {
    try {
      const isNewStep = !steps.find(
        (step) => step.id === updatedStep.id && step.id > 0
      );

      if (isNewStep) {
        console.log("Creating new step:", updatedStep);

        const stepData = {
          testCaseId: updatedStep.testCaseId,
          stepOrder: updatedStep.stepOrder,
          actionDescription: updatedStep.actionDescription,
          inputData: updatedStep.inputData || "",
          expectedOutput: updatedStep.expectedOutput || "",
          scriptCode: updatedStep.scriptCode || "",
          stepImage:
            updatedStep.stepImage instanceof File
              ? updatedStep.stepImage
              : null,
          objectImage:
            updatedStep.objectImage instanceof File
              ? updatedStep.objectImage
              : null,
          relatedObjectImage:
            updatedStep.relatedObjectImage instanceof File
              ? updatedStep.relatedObjectImage
              : null,
        };

        const createdStep = await createNewTestCaseStep(stepData);

        const stepWithRealId = {
          ...updatedStep,
          id: createdStep.id,
          testCaseId: createdStep.testCaseId || stepData.testCaseId,
          stepOrder: createdStep.stepOrder || stepData.stepOrder,
          actionDescription:
            createdStep.actionDescription || stepData.actionDescription,
          inputData: createdStep.inputData || stepData.inputData,
          expectedOutput: createdStep.expectedOutput || stepData.expectedOutput,
          scriptCode: createdStep.scriptCode || stepData.scriptCode,
          imgUrl: createdStep.imgUrl || updatedStep.imgUrl,
          objectImgUrl: createdStep.objectImgUrl || updatedStep.objectImgUrl,
          relatedObjectImgUrl:
            createdStep.relatedObjectImgUrl || updatedStep.relatedObjectImgUrl,
          stepImage: null,
          objectImage: null,
          relatedObjectImage: null,
        };

        setEditSteps((prev) => [...prev, stepWithRealId]);
        setSteps((prev) => [...prev, stepWithRealId]);
        console.log("Successfully created new step:", stepWithRealId);
      } else {
        console.log("Updating existing step:", updatedStep.id);

        const updateData: any = {};

        const originalStep = steps.find((s) => s.id === updatedStep.id);
        if (originalStep) {
          if (updatedStep.stepOrder !== originalStep.stepOrder) {
            updateData.stepOrder = updatedStep.stepOrder;
          }
          if (
            updatedStep.actionDescription !== originalStep.actionDescription
          ) {
            updateData.actionDescription = updatedStep.actionDescription;
          }
          if (updatedStep.inputData !== originalStep.inputData) {
            updateData.inputData = updatedStep.inputData || "";
          }
          if (updatedStep.expectedOutput !== originalStep.expectedOutput) {
            updateData.expectedOutput = updatedStep.expectedOutput || "";
          }
          if (updatedStep.scriptCode !== originalStep.scriptCode) {
            updateData.scriptCode = updatedStep.scriptCode || "";
          }
          if (updatedStep.stepImage instanceof File) {
            updateData.stepImage = updatedStep.stepImage;
          }
          if (updatedStep.objectImage instanceof File) {
            updateData.objectImage = updatedStep.objectImage;
          }
          if (updatedStep.relatedObjectImage instanceof File) {
            updateData.relatedObjectImage = updatedStep.relatedObjectImage;
          }

          if (updatedStep.removeStepImage === true) {
            updateData.removeStepImage = true;
          }
          if (updatedStep.removeObjectImage === true) {
            updateData.removeObjectImage = true;
          }
          if (updatedStep.removeRelatedObjectImage === true) {
            updateData.removeRelatedObjectImage = true;
          }
        } else {
          updateData.stepOrder = updatedStep.stepOrder;
          updateData.actionDescription = updatedStep.actionDescription;
          updateData.inputData = updatedStep.inputData || "";
          updateData.expectedOutput = updatedStep.expectedOutput || "";
          updateData.scriptCode = updatedStep.scriptCode || "";
          if (updatedStep.stepImage instanceof File) {
            updateData.stepImage = updatedStep.stepImage;
          }
          if (updatedStep.objectImage instanceof File) {
            updateData.objectImage = updatedStep.objectImage;
          }
          if (updatedStep.relatedObjectImage instanceof File) {
            updateData.relatedObjectImage = updatedStep.relatedObjectImage;
          }
          if (updatedStep.removeStepImage === true) {
            updateData.removeStepImage = true;
          }
          if (updatedStep.removeObjectImage === true) {
            updateData.removeObjectImage = true;
          }
          if (updatedStep.removeRelatedObjectImage === true) {
            updateData.removeRelatedObjectImage = true;
          }
        }

        const apiResponse = await updateTestCaseStep(
          updatedStep.id,
          updateData
        );

        const updatedStepWithApiData = {
          ...updatedStep,
          ...apiResponse,
          imgUrl: apiResponse.imgUrl || updatedStep.imgUrl,
          objectImgUrl: apiResponse.objectImgUrl || updatedStep.objectImgUrl,
          relatedObjectImgUrl:
            apiResponse.relatedObjectImgUrl || updatedStep.relatedObjectImgUrl,
          stepImage: null,
          objectImage: null,
          relatedObjectImage: null,
        };

        setEditSteps((prev) =>
          prev.map((step) =>
            step.id === updatedStep.id ? updatedStepWithApiData : step
          )
        );
        setSteps((prev) =>
          prev.map((step) =>
            step.id === updatedStep.id ? updatedStepWithApiData : step
          )
        );
        console.log("Successfully updated step:", updatedStepWithApiData);
      }

      setIsStepModalOpen(false);
      setEditingStep(null);
    } catch (error) {
      console.error("Error saving step:", error);

      let errorMessage = "Error saving step. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    }
  };

  const handleSave = async () => {
    try {
      console.log("Saving test case changes:", editFormData);
      console.log("Saving step changes:", editSteps);

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

  const handleCancel = () => {
    setEditFormData({
      test_item: testCase.testItem || testCase.testItem || "",
      test_classification:
        testCase.testClassification || testCase.testClassification || "",
      environment_condition: testCase.environment_condition || "",
      expected_output: testCase.expected_output || "",
    });
    setEditSteps(
      steps.map((step) => ({
        ...step,
        stepImage: null as File | null,
        imgUrl:
          step.imgUrl ||
          `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
      }))
    );
    setIsEditing(false);
  };

  const handleStepEdit = (step: any) => {
    setEditingStep(step);
    setIsStepModalOpen(true);
  };

  const handleAddStep = () => {
    const newStep = {
      id: Date.now(),
      testCaseId: testCase.id,
      stepOrder: steps.length + 1,
      actionDescription: "",
      inputData: "",
      expectedOutput: "",
      stepImage: null as File | null,
      imgUrl: null,
    };
    setEditingStep(newStep);
    setIsStepModalOpen(true);
  };

  const handleStepModalClose = () => {
    setIsStepModalOpen(false);
    setEditingStep(null);
  };

  const handleStepTextChange = (stepId: number, newText: string) => {
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, actionDescription: newText } : step
      )
    );
  };

  const handleImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, stepImage: file, imgUrl: imageUrl }
          : step
      )
    );
  };

  const handleImageRemove = (stepId: number) => {
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              stepImage: null,
              imgUrl: `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
            }
          : step
      )
    );
  };

  const handleStepImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, stepImage: file, imgUrl: imageUrl }
          : step
      )
    );
  };

  const truncateScript = (script: string, maxLength = 50) => {
    if (script.length <= maxLength) return script;
    return script.substring(0, maxLength) + "...";
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(300, Math.min(600, e.clientX));
    setStepColumnWidth(newWidth);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const handleStepClick = (step: any) => {
    setSelectedStep(step);
  };

  const handleVerifyOutputs = () => {
    setVerificationResults({
      overallScore: 0.95,
      stepResults: steps.map((step) => ({
        stepId: step.id,
        score: Math.random() > 0.2 ? 1 : 0.8,
        status: Math.random() > 0.2 ? "Matched" : "Partial Match",
      })),
    });
  };

  const handleGenerateScript = async () => {
    try {
      setIsGeneratingScript(true);
      console.log("Generating test script for test case:", testCase.id);

      const script = await generateTestScript(testCase.id);
      console.log("Generated script:", script);

      await fetchTestCaseSteps();

      setViewMode("execution");
    } catch (error) {
      console.error("Failed to generate test script:", error);

      let errorMessage = "Failed to generate test script. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAllScripts = async () => {
    try {
      setIsGeneratingAllScripts(true);
      console.log("Generating all test scripts for test case:", testCase.id);

      const script = await generateAllTestScripts(testCase.id);
      console.log("Generated all scripts:", script);

      await fetchTestCaseSteps();

      setViewMode("execution");
    } catch (error) {
      console.error("Failed to generate all test scripts:", error);
      let errorMessage =
        "Failed to generate all test scripts. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsGeneratingAllScripts(false);
    }
  };

  const handleViewFullScript = async () => {
    try {
      setScriptError("");
      const script = await getTestScript(testCase.id);
      if (script) {
        setFullScript(script);
        setIsScriptModalOpen(true);
      } else {
        setScriptError(
          "Please run 'Generate All Test Scripts' to generate the script first."
        );
        setIsScriptModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to get test script:", error);
      let errorMessage =
        "Please run 'Generate All Test Scripts' to generate the script first.";
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}. Please run 'Generate All Test Scripts'.`;
      }
      setScriptError(errorMessage);
      setIsScriptModalOpen(true);
    }
  };

  const handleExecuteStep = async (stepId: number) => {
    try {
      setExecutingSteps((prev) => new Set([...prev, stepId]));
      console.log("Executing step:", stepId);

      const result = await executeStep(stepId);
      console.log("Step execution result:", result);

      if (result && result.executionStepId) {
        try {
          console.log(
            "Fetching execution details for execution ID:",
            result.executionStepId
          );

          const executionDetails = await getExecutionSteps(
            result.executionStepId
          );
          console.log("Execution details:", executionDetails);

          if (executionDetails) {
            const executionData = {
              id: result.executionStepId,
              stepId: stepId,
              screenshotUrl:
                executionDetails.screenshotUrl ||
                executionDetails.screenshot_url ||
                null,
              executionResult:
                executionDetails.executionResult ||
                executionDetails.execution_result ||
                null,
              status: executionDetails.status || "completed",
              executedAt:
                executionDetails.executedAt ||
                executionDetails.executed_at ||
                new Date().toISOString(),
            };

            setExecutionSteps((prev) => ({
              ...prev,
              [stepId]: executionData,
            }));

            console.log(
              "Updated execution data for step:",
              stepId,
              executionData
            );
          }
        } catch (fetchError) {
          console.error("Failed to fetch execution details:", fetchError);
          setExecutionSteps((prev) => ({
            ...prev,
            [stepId]: {
              id: result.executionStepId,
              stepId: stepId,
              screenshotUrl: undefined,
              executionResult: undefined,
              status: "completed",
              executedAt: new Date().toISOString(),
            },
          }));
        }
      } else {
        console.warn("No executionStepId returned from execute API");
      }

      if (selectedStep?.id === stepId) {
        setSelectedStep({ ...selectedStep });
      }

      console.log(`Step ${stepId} executed successfully!`);
    } catch (error) {
      console.error("Failed to execute step:", error);

      let errorMessage = "Failed to execute step. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      if (error && typeof error === "object" && "response" in error) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response
        ) {
          // @ts-ignore
          console.error("API Error Response:", error.response.data);
          // @ts-ignore
          errorMessage += ` (${error.response.status}: ${error.response.statusText})`;
        }
      }
      alert(errorMessage);
    } finally {
      setExecutingSteps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

const handleCheckStepScore = async (stepId: number) => {
  try {
    const result = await checkScore(stepId);

    // API trả về { message, executionStepId, score }
    const { message, executionStepId, score } = result;

    setStepScoreResults((prev) => ({
      ...prev,
      [stepId]: { 
        score: score ?? 0, 
        status: message || "Checked" 
      },
    }));
  } catch (error) {
    console.error("Failed to check step score:", error);
    setStepScoreResults((prev) => ({
      ...prev,
      [stepId]: { 
        score: 0, 
        status: "Error" 
      },
    }));
  }
};


  const isStepExecuted = (step: any) => {
    return step.scriptCode && step.scriptCode.trim() !== "";
  };

  const getStepVerification = (stepId: number) => {
    return verificationResults?.stepResults.find(
      (r: any) => r.stepId === stepId
    );
  };

  const isStepExecutionCompleted = (stepId: number) => {
    return executionSteps[stepId] && executionSteps[stepId].screenshotUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading test case details...</div>
        </div>
      </div>
    );
  }

  const renderDetailsView = () => (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Test Case Details</CardTitle>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  ID:
                </h3>
                <p className="text-base">
                  {editFormData.test_item.replace(/\s+/g, "_")}_001
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  Test Item:
                </h3>
                {isEditing ? (
                  <Input
                    value={editFormData.test_item}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        test_item: e.target.value,
                      })
                    }
                    className="text-base"
                  />
                ) : (
                  <p className="text-base">{editFormData.test_item}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  Test Classification:
                </h3>
                {isEditing ? (
                  <Input
                    value={editFormData.test_classification}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        test_classification: e.target.value,
                      })
                    }
                    className="text-base"
                  />
                ) : (
                  <p className="text-base">
                    {editFormData.test_classification} Test
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-4">
                Input Data and Test Procedure:
              </h3>
              {stepsLoading ? (
                <div className="text-center text-muted-foreground">
                  Loading test steps...
                </div>
              ) : (
                <div className="space-y-4">
                  {(isEditing ? editSteps : steps).map((step, index) => (
                    <Card key={step.id} className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                Step {step.stepOrder}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStepEdit(step)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Step
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              {step.imgUrl && (
                                <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                                  <img
                                    src={step.imgUrl || "/placeholder.svg"}
                                    alt={`Step ${step.stepOrder} thumbnail`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              {!step.imgUrl && (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleStepImageUpload(step.id, file);
                                    }}
                                  />
                                  <div className="w-12 h-8 bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-colors">
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </label>
                              )}
                              {isEditing && (
                                <div className="flex space-x-2">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handleImageUpload(step.id, file);
                                      }}
                                    />
                                    <Button variant="ghost" size="sm" asChild>
                                      <span>
                                        <Upload className="h-3 w-3" />
                                      </span>
                                    </Button>
                                  </label>
                                  {step.imgUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleImageRemove(step.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <Textarea
                              value={step.actionDescription}
                              onChange={(e) =>
                                handleStepTextChange(step.id, e.target.value)
                              }
                              className="text-sm min-h-[60px]"
                              placeholder="Enter step description..."
                            />
                          ) : (
                            <p className="text-sm">
                              {step.actionDescription}
                              {step.inputData && ` (${step.inputData})`}
                            </p>
                          )}

                          {(step.objectImgUrl || step.relatedObjectImgUrl) && (
                            <div className="flex gap-2 mt-2">
                              {step.objectImgUrl && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    Object Image:
                                  </span>
                                  <div
                                    className="w-20 h-14 bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() =>
                                      handleImageClick(
                                        step.objectImgUrl!,
                                        `Step ${step.stepOrder} - Object Image`
                                      )
                                    }
                                  >
                                    <img
                                      src={step.objectImgUrl}
                                      alt={`Step ${step.stepOrder} object`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              )}
                              {step.relatedObjectImgUrl && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    Related Object:
                                  </span>
                                  <div
                                    className="w-20 h-14 bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() =>
                                      handleImageClick(
                                        step.relatedObjectImgUrl!,
                                        `Step ${step.stepOrder} - Related Object Image`
                                      )
                                    }
                                  >
                                    <img
                                      src={step.relatedObjectImgUrl}
                                      alt={`Step ${step.stepOrder} related object`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="w-48 flex-shrink-0">
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img
                              src={step.imgUrl || "/placeholder.svg"}
                              alt={`Step ${step.stepOrder} screenshot`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={handleAddStep}
                      className="w-full border-dashed"
                    >
                      <span className="text-lg mr-2">+</span>
                      Add New Step
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Expected Output:
              </h3>
              {isEditing ? (
                <Textarea
                  value={editFormData.expected_output}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      expected_output: e.target.value,
                    })
                  }
                  className="text-base min-h-[80px]"
                />
              ) : (
                <p className="text-base">{editFormData.expected_output}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-96 border-l bg-card p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Test Script Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={handleGenerateScript}
                disabled={!hasBeenGenerated}
                className={`w-full ${
                  hasBeenGenerated
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
                size="lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Test Steps
              </Button>

              <Button
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || steps.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                {isGeneratingScript
                  ? "Generating..."
                  : hasBeenGenerated
                  ? "Regenerate Test Script"
                  : "Generate Test Script"}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>View:</strong>{" "}
                {hasBeenGenerated
                  ? "View the generated test steps and execution details"
                  : "Generate the script first to view test steps"}
              </p>
              <p>
                <strong>Generate:</strong>{" "}
                {isGeneratingScript
                  ? "Generating executable test scripts..."
                  : hasBeenGenerated
                  ? "Regenerate executable test scripts with latest changes"
                  : "Generate executable test scripts from this test case"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExecutionView = () => (
    <div
      className="flex h-[calc(100vh-4rem)]"
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
    >
      <div
        className="border-r bg-card flex flex-col relative"
        style={{ width: `${stepColumnWidth}px` }}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Test Steps</h2>
              <p className="text-sm text-muted-foreground">
                Click a step to view screenshot
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  {editFormData.test_item.replace(/\s+/g, "_")}_001
                </div>
                <div>
                  <span className="font-medium">Test Item:</span>{" "}
                  {editFormData.test_item}
                </div>
                <div>
                  <span className="font-medium">Test Classification:</span>{" "}
                  {editFormData.test_classification}
                </div>
                <div>
                  <span className="font-medium">Run Config:</span> Chrome 120 -
                  Windows 11 - Desktop
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStep}
              className="flex items-center gap-2 bg-transparent"
            >
              <span className="text-lg">+</span>
              Add Step
            </Button>
          </div>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
          onMouseDown={handleResizeStart}
        />

        <div className="flex-1 overflow-auto">
          {stepsLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading test steps...
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {steps.map((step, index) => {
                const verification = getStepVerification(step.id);
                const stepScore = stepScoreResults[step.id];
                const executed = isStepExecuted(step);
                const executionCompleted = isStepExecutionCompleted(step.id);
                const isExecuting = executingSteps.has(step.id);

                return (
                  <Card
                    key={step.id}
                    className={`cursor-pointer transition-colors ${
                      selectedStep?.id === step.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleStepClick(step)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">
                            Step {step.stepOrder}
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepEdit(step);
                            }}
                            className="text-xs h-6 px-2"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStepDisplayImage(step) && (
                            <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                              <img
                                src={step.imgUrl || "/placeholder.svg"}
                                alt={`Step ${step.stepOrder} ${
                                  executionCompleted ? "execution" : "design"
                                } thumbnail`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {!getStepDisplayImage(step) && (
                            <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                              <Upload className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {stepScore && (
                            <Badge
                              variant={
                                stepScore.status === "Matched"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {stepScore.score === 1 ? "✓" : "~"}{" "}
                              {Math.round(stepScore.score * 100)}%
                            </Badge>
                          )}
                          {executionCompleted && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700"
                            >
                              Executed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">
                            {step.actionDescription}
                          </p>
                          {step.inputData && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Input: {step.inputData}
                            </p>
                          )}
                        </div>
                      </div>
                      {step.expectedOutput && (
                        <div className="text-xs text-muted-foreground mb-2">
                          <div className="flex items-center mb-1">
                            <Target className="h-3 w-3 mr-1" />
                            Expected:
                          </div>
                          <p className="pl-4">{step.expectedOutput}</p>
                        </div>
                      )}

                      {(step.objectImgUrl || step.relatedObjectImgUrl) && (
                        <div className="flex gap-2 mb-2 pt-2 border-t">
                          {step.objectImgUrl && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                Object:
                              </span>
                              <div
                                className="w-12 h-9 bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageClick(
                                    step.objectImgUrl!,
                                    `Step ${step.stepOrder} - Object Image`
                                  );
                                }}
                              >
                                <img
                                  src={step.objectImgUrl}
                                  alt="Object"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                          {step.relatedObjectImgUrl && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                Related:
                              </span>
                              <div
                                className="w-12 h-9 bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageClick(
                                    step.relatedObjectImgUrl!,
                                    `Step ${step.stepOrder} - Related Object`
                                  );
                                }}
                              >
                                <img
                                  src={step.relatedObjectImgUrl}
                                  alt="Related"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {executionCompleted
                            ? "Execution screenshot"
                            : step.imgUrl
                            ? "Design screenshot"
                            : "No screenshot"}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteStep(step.id);
                            }}
                            disabled={isExecuting}
                            className="text-xs h-6 px-2"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {isExecuting ? "Executing..." : "Execute"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckStepScore(step.id);
                            }}
                            // disabled={!executionCompleted || !!stepScore}
                            className="text-xs h-6 px-2"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Check Score
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <h3 className="font-semibold text-sm mb-2">
            Overall Expected Output
          </h3>
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">{editFormData.expected_output}</p>
              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyOutputs}
                  disabled={!!verificationResults}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Check
                </Button>
                {verificationResults && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      Test Case Score:
                    </span>
                    <Badge
                      variant={
                        verificationResults.overallScore >= 0.9
                          ? "default"
                          : "secondary"
                      }
                    >
                      {Math.round(verificationResults.overallScore * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedStep ? (
          <>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Step {selectedStep.stepOrder}:{" "}
                    {selectedStep.actionDescription}
                  </h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-muted-foreground">
                      {isStepExecutionCompleted(selectedStep.id)
                        ? "Execution Screenshot"
                        : "Design Screenshot"}
                    </p>
                    {isStepExecutionCompleted(selectedStep.id) &&
                      executionSteps[selectedStep.id]?.executedAt && (
                        <p className="text-xs text-muted-foreground">
                          Executed:{" "}
                          {new Date(
                            executionSteps[selectedStep.id].executedAt ?? ""
                          ).toLocaleString()}
                        </p>
                      )}
                  </div>

                  {(selectedStep.objectImgUrl ||
                    selectedStep.relatedObjectImgUrl) && (
                    <div className="flex gap-3 mt-3">
                      {selectedStep.objectImgUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Object Image:
                          </span>
                          <div
                            className="bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() =>
                              handleImageClick(
                                selectedStep.objectImgUrl!,
                                `Step ${selectedStep.stepOrder} - Object Image`
                              )
                            }
                          >
                            <img
                              src={selectedStep.objectImgUrl}
                              alt="Object"
                              className="w-auto h-auto max-w-full max-h-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                      {selectedStep.relatedObjectImgUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Related Object Image:
                          </span>
                          <div
                            className="bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() =>
                              handleImageClick(
                                selectedStep.relatedObjectImgUrl!,
                                `Step ${selectedStep.stepOrder} - Related Object`
                              )
                            }
                          >
                            <img
                              src={selectedStep.relatedObjectImgUrl}
                              alt="Related"
                              className="w-auto h-auto max-w-full max-h-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {isStepExecutionCompleted(selectedStep.id)
                      ? "Execution View"
                      : "Design View"}
                  </Badge>
                  {isStepExecutionCompleted(selectedStep.id) && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700"
                    >
                      Executed
                    </Badge>
                  )}
                </div>
              </div>
              {selectedStep.scriptCode && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Code className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">Script Details:</span>
                  </div>
                  <code className="text-xs bg-background p-2 rounded block whitespace-pre-wrap">
                    {selectedStep.scriptCode}
                  </code>
                </div>
              )}
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-muted/20">
              <Card className="w-full max-w-4xl">
                <CardContent className="p-6">
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                    {getStepDisplayImage(selectedStep) ? (
                      <img
                        src={
                          getStepDisplayImage(selectedStep) ||
                          "/placeholder.svg"
                        }
                        alt={`Step ${selectedStep.stepOrder} ${
                          isStepExecutionCompleted(selectedStep.id)
                            ? "execution"
                            : "design"
                        } screenshot`}
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                        onClick={() => {
                          const imageUrl = getStepDisplayImage(selectedStep);
                          if (imageUrl) {
                            handleImageClick(
                              imageUrl,
                              `Step ${selectedStep.stepOrder} - ${
                                isStepExecutionCompleted(selectedStep.id)
                                  ? "Execution"
                                  : "Design"
                              } Screenshot`
                            );
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">
                          No Screenshot Available
                        </p>
                        <p className="text-muted-foreground">
                          Step {selectedStep.stepOrder} -{" "}
                          {selectedStep.actionDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a Test Step</h2>
              <p className="text-muted-foreground">
                Click on a step from the left panel to view its screenshot
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Test Cases
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{editFormData.test_item}</h1>
            <p className="text-sm text-muted-foreground">
              {editFormData.test_classification}
            </p>
          </div>
          {viewMode === "execution" && (
            <div className="flex items-center space-x-2">
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </Button>

              <IconExpandButton
                icon={<FileCode className="h-4 w-4" />}
                text={
                  isGeneratingScript ? "Generating..." : "Generate Test Script"
                }
                onClick={handleGenerateScript}
                disabled={isGeneratingScript}
              />

              <IconExpandButton
                icon={<Layers className="h-4 w-4 " />}
                text={
                  isGeneratingAllScripts
                    ? "Generating All..."
                    : "Generate All Test Scripts"
                }
                onClick={handleGenerateAllScripts}
                disabled={isGeneratingAllScripts || steps.length === 0}
              />

              <IconExpandButton
                icon={<Eye className="h-4 w-4 " />}
                text="View Full Script"
                onClick={handleViewFullScript}
                disabled={isGeneratingAllScripts || steps.length === 0}
              />
            </div>
          )}
        </div>
      </nav>

      {viewMode === "details" ? renderDetailsView() : renderExecutionView()}

      <StepEditModal
        isOpen={isStepModalOpen}
        onClose={handleStepModalClose}
        step={editingStep}
        onSave={handleStepModalSave}
      />

      {viewingImage && (
        <ImageViewerModal
          isOpen={imageViewerOpen}
          onClose={handleCloseImageViewer}
          imageUrl={viewingImage.url}
          title={viewingImage.title}
        />
      )}

      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-xl">Full Test Script</CardTitle>
              <p className="text-sm text-muted-foreground">
                {fullScript
                  ? "Below is the complete generated test script."
                  : scriptError || "No script available."}
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              {fullScript ? (
                <div className="relative flex-1 overflow-hidden">
                  <pre className="bg-muted p-4 rounded-lg w-full h-full max-h-[70vh] overflow-auto whitespace-pre-wrap break-words">
                    <code className="text-sm">{fullScript}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-8"
                    onClick={() => {
                      navigator.clipboard.writeText(fullScript);
                      setCopyMessage("Copied!");
                      setTimeout(() => setCopyMessage(null), 2000);
                    }}
                  >
                    {copyMessage === "Copied!" ? (
                      <span className="text-xs">Copied!</span>
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                  <p>{scriptError}</p>
                  <Button
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setIsScriptModalOpen(false);
                      handleGenerateAllScripts();
                    }}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Generate All Test Scripts
                  </Button>
                </div>
              )}
              <div className="mt-4 flex justify-end flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setIsScriptModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
