"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  ImageIcon,
  Target,
  FileText,
  Edit,
  Code,
  Save,
  X,
  Upload,
  Trash2,
} from "lucide-react"
import { mockExpectedResults, mockExecutionSteps, mockVerifications } from "@/lib/mock-data"
import { StepEditModal } from "@/components/step-edit-modal"
import { getTestCaseById } from "@/service/testcase"
import { 
  getAllTestCaseSteps, 
  createNewTestCaseStep, 
  updateTestCaseStep, 
  deleteTestCaseStep,
  uploadStepImage,
  validateImageFile 
} from "@/service/testcase-step"
import { findElementByText, findElementByImage } from "@/service/find-element";

interface TestCaseDetailScreenProps {
  onBack: () => void
  testCase: any
  initialView?: "details" | "execution"
}

interface TestCaseStep {
  id: number
  testCaseId: number
  stepOrder: number
  actionDescription: string
  inputData: string
  expectedOutput: string
  scriptCode?: string
  imgUrl?: string
  expectedPageUrl?: string
}

interface TestCaseDetail {
  id: number
  scenario: {
    id: number
    name: string
  }
  testItem: string
  testClassification: string
  createdAt: string
  updatedAt: string
  expected_output?: string
  environment_condition?: string
}

export function TestCaseDetailScreen({ onBack, testCase: initialTestCase, initialView = "details" }: TestCaseDetailScreenProps) {
  const [viewMode, setViewMode] = useState<"details" | "execution">(initialView)
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [stepScoreResults, setStepScoreResults] = useState<{ [key: number]: { score: number; status: string } }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isStepModalOpen, setIsStepModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<any>(null)
  const [stepColumnWidth, setStepColumnWidth] = useState(425)
  const [isResizing, setIsResizing] = useState(false)
  
  // API data states
  const [testCase, setTestCase] = useState<TestCaseDetail>(initialTestCase)
  const [steps, setSteps] = useState<TestCaseStep[]>([])
  const [loading, setLoading] = useState(true)
  const [stepsLoading, setStepsLoading] = useState(false)

  // State để quản lý lựa chọn radio button (Text hoặc Image) cho mỗi step
  const [stepInputType, setStepInputType] = useState<{ [key: number]: "text" | "image" }>({})
  // State để lưu trữ giá trị text input cho mỗi step khi chọn Text
  const [stepTextInput, setStepTextInput] = useState<{ [key: number]: string }>({})
  // State để lưu trữ kết quả XPath cho mỗi step
  const [stepXPathResult, setStepXPathResult] = useState<{ [key: number]: string }>({})
  // State để quản lý trạng thái loading của nút Detect cho mỗi step
  const [stepDetectLoading, setStepDetectLoading] = useState<{ [key: number]: boolean }>({})
  // State để quản lý trạng thái nút Copy
  const [copyStatus, setCopyStatus] = useState<{ [key: number]: boolean }>({})

  const [editFormData, setEditFormData] = useState({
    test_item: initialTestCase.testItem || initialTestCase.test_item || "",
    test_classification: initialTestCase.testClassification || initialTestCase.test_classification || "",
    environment_condition: initialTestCase.environment_condition || "",
    expected_output: initialTestCase.expected_output || "",
  })

  const [editSteps, setEditSteps] = useState<TestCaseStep[]>([])

  // Keep mock data for features not yet implemented via API
  const expectedOutput = mockExpectedResults.filter((er) => er.test_case_id === testCase.id)
  const executionSteps = mockExecutionSteps
  const verifications = mockVerifications

  // Fetch detailed test case data when component mounts
  useEffect(() => {
    const fetchTestCaseDetail = async () => {
      try {
        setLoading(true)
        const response = await getTestCaseById(testCase.id)
        const detailedTestCase = response.data || response
        setTestCase(detailedTestCase)
        
        // Update form data with fetched details
        setEditFormData({
          test_item: detailedTestCase.testItem || detailedTestCase.test_item || "",
          test_classification: detailedTestCase.testClassification || detailedTestCase.test_classification || "",
          environment_condition: detailedTestCase.environment_condition || "",
          expected_output: detailedTestCase.expected_output || "",
        })
      } catch (error) {
        console.error("Failed to fetch test case details:", error)
        // Keep using initial test case data if API fails
      } finally {
        setLoading(false)
      }
    }

    fetchTestCaseDetail()
  }, [testCase.id])

  // Fetch test case steps
  useEffect(() => {
    const fetchTestCaseSteps = async () => {
      try {
        setStepsLoading(true)
        const response = await getAllTestCaseSteps(testCase.id)
        const fetchedSteps = response.data || response
        
        // Transform steps to match expected format with additional UI fields
        const transformedSteps = fetchedSteps.map((step: TestCaseStep) => ({
          ...step,
          stepImage: null as File | null,
          imgUrl: step.imgUrl || `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
        }))
        
        setSteps(transformedSteps)
        setEditSteps(transformedSteps)
      } catch (error) {
        console.error("Failed to fetch test case steps:", error)
        setSteps([])
        setEditSteps([])
      } finally {
        setStepsLoading(false)
      }
    }

    fetchTestCaseSteps()
  }, [testCase.id])

  const hasBeenGenerated = steps.length > 0 && steps.some((step) => step.scriptCode)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleStepModalSave = async (updatedStep: any) => {
    try {
      const isNewStep = !steps.find((step) => step.id === updatedStep.id && step.id > 0)
      
      if (isNewStep) {
        // Adding new step - call create API
        console.log("Creating new step:", updatedStep)
        
        // Prepare data for API call with consistent field names
        const stepData = {
          testCaseId: updatedStep.testCaseId,
          stepOrder: updatedStep.stepOrder,
          actionDescription: updatedStep.actionDescription,
          inputData: updatedStep.inputData || "",
          expectedOutput: updatedStep.expectedOutput || "", // Consistent field name
          scriptCode: updatedStep.scriptCode || "",
          stepImage: updatedStep.stepImage instanceof File ? updatedStep.stepImage : null
        }
        
        // Call API to create the step
        const createdStep = await createNewTestCaseStep(stepData)
        
        // Update the step with the real data from API response
        const stepWithRealId = {
          ...updatedStep,
          id: createdStep.id,
          testCaseId: createdStep.testCaseId || stepData.testCaseId,
          stepOrder: createdStep.stepOrder || stepData.stepOrder,
          actionDescription: createdStep.actionDescription || stepData.actionDescription,
          inputData: createdStep.inputData || stepData.inputData,
          expectedOutput: createdStep.expectedOutput || stepData.expectedOutput,
          scriptCode: createdStep.scriptCode || stepData.scriptCode,
          imgUrl: createdStep.imgUrl || updatedStep.imgUrl, // Use API response or keep existing
          stepImage: null // Clear the file object after successful upload
        }
        
        setEditSteps((prev) => [...prev, stepWithRealId])
        setSteps((prev) => [...prev, stepWithRealId])
        console.log("Successfully created new step:", stepWithRealId)
        
      } else {
        // Editing existing step - call update API
        console.log("Updating existing step:", updatedStep.id)
        
        // Prepare data for update - only include changed fields
        const updateData: any = {}
        
        const originalStep = steps.find(s => s.id === updatedStep.id)
        if (originalStep) {
          if (updatedStep.stepOrder !== originalStep.stepOrder) {
            updateData.stepOrder = updatedStep.stepOrder
          }
          if (updatedStep.actionDescription !== originalStep.actionDescription) {
            updateData.actionDescription = updatedStep.actionDescription
          }
          if (updatedStep.inputData !== originalStep.inputData) {
            updateData.inputData = updatedStep.inputData || ""
          }
          if (updatedStep.expectedOutput !== originalStep.expectedOutput) {
            updateData.expectedOutput = updatedStep.expectedOutput || ""
          }
          if (updatedStep.scriptCode !== originalStep.scriptCode) {
            updateData.scriptCode = updatedStep.scriptCode || ""
          }
          if (updatedStep.stepImage instanceof File) {
            updateData.stepImage = updatedStep.stepImage
          }
        } else {
          // If we can't find the original step, send all data
          updateData.stepOrder = updatedStep.stepOrder
          updateData.actionDescription = updatedStep.actionDescription
          updateData.inputData = updatedStep.inputData || ""
          updateData.expectedOutput = updatedStep.expectedOutput || ""
          updateData.scriptCode = updatedStep.scriptCode || ""
          if (updatedStep.stepImage instanceof File) {
            updateData.stepImage = updatedStep.stepImage
          }
        }
        
        // Call API to update the step
        const apiResponse = await updateTestCaseStep(updatedStep.id, updateData)
        
        // Merge API response with updated step
        const updatedStepWithApiData = {
          ...updatedStep,
          ...apiResponse,
          imgUrl: apiResponse.imgUrl || updatedStep.imgUrl,
          stepImage: null // Clear the file object after successful upload
        }
        
        setEditSteps((prev) => prev.map((step) => 
          step.id === updatedStep.id ? updatedStepWithApiData : step
        ))
        setSteps((prev) => prev.map((step) => 
          step.id === updatedStep.id ? updatedStepWithApiData : step
        ))
        console.log("Successfully updated step:", updatedStepWithApiData)
      }
      
      setIsStepModalOpen(false)
      setEditingStep(null)
      
    } catch (error) {
      console.error("Error saving step:", error)
      
      // Provide user-friendly error message
      let errorMessage = "Error saving step. Please try again."
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // You might want to use a proper toast notification here
      alert(errorMessage)
      
      // Keep modal open so user can try again
    }
  }

  const handleSave = async () => {
    try {
      // In a real app, this would save to backend
      console.log("Saving test case changes:", editFormData)
      console.log("Saving step changes:", editSteps)
      
      // TODO: Implement API calls to save test case and steps
      // await updateTestCase(testCase.id, editFormData)
      // await updateTestCaseSteps(testCase.id, editSteps)
      
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to save changes:", error)
    }
  }

  const handleCancel = () => {
    setEditFormData({
      test_item: testCase.testItem || testCase.testItem || "",
      test_classification: testCase.testClassification || testCase.testClassification || "",
      environment_condition: testCase.environment_condition || "",
      expected_output: testCase.expected_output || "",
    })
    setEditSteps(steps.map((step) => ({
      ...step,
      stepImage: null as File | null,
      imgUrl: step.imgUrl || `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
    })))
    setIsEditing(false)
  }

  const handleStepEdit = (step: any) => {
    setEditingStep(step)
    setIsStepModalOpen(true)
  }

  const handleAddStep = () => {
    // Create a new step template
    const newStep = {
      id: Date.now(), // Temporary ID for new step
      testCaseId: testCase.id,
      stepOrder: steps.length + 1,
      actionDescription: "",
      inputData: "",
      expectedOutput: "",
      stepImage: null as File | null,
      imgUrl: null,
    }
    setEditingStep(newStep)
    setIsStepModalOpen(true)
  }

  const handleStepModalClose = () => {
    setIsStepModalOpen(false)
    setEditingStep(null)
  }

  const handleStepTextChange = (stepId: number, newText: string) => {
    setEditSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, actionDescription: newText } : step)))
  }

  const handleImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setEditSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, stepImage: file, imgUrl: imageUrl } : step)),
    )
  }

  const handleImageRemove = (stepId: number) => {
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              stepImage: null,
              imgUrl: `/placeholder.svg?height=200&width=300&query=step-${step.stepOrder}-screenshot`,
            }
          : step,
      ),
    )
  }

  const handleStepImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setEditSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, stepImage: file, imgUrl: imageUrl } : step)),
    )
  }

  const truncateScript = (script: string, maxLength = 50) => {
    if (script.length <= maxLength) return script
    return script.substring(0, maxLength) + "..."
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing) return
    const newWidth = Math.max(300, Math.min(600, e.clientX))
    setStepColumnWidth(newWidth)
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  const handleStepClick = (step: any) => {
    setSelectedStep(step)
  }

  const handleVerifyOutputs = () => {
    // Simulate verification process
    setVerificationResults({
      overallScore: 0.95,
      stepResults: steps.map((step) => ({
        stepId: step.id,
        score: Math.random() > 0.2 ? 1 : 0.8,
        status: Math.random() > 0.2 ? "Matched" : "Partial Match",
      })),
    })
  }

  const handleGenerateScript = () => {
    setViewMode("execution")
  }

  const handleCheckStepScore = (stepId: number) => {
    // Simulate score checking for individual step
    const score = Math.random() > 0.2 ? 1 : 0.8
    const status = score === 1 ? "Matched" : "Partial Match"

    setStepScoreResults((prev) => ({
      ...prev,
      [stepId]: { score, status },
    }))
  }

  const isStepExecuted = (step: any) => {
    return step.scriptCode && step.scriptCode.trim() !== ""
  }

  const getStepVerification = (stepId: number) => {
    return verificationResults?.stepResults.find((r: any) => r.stepId === stepId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading test case details...</div>
        </div>
      </div>
    )
  }

  const renderDetailsView = () => (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Test Case Details */}
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
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">ID:</h3>
                <p className="text-base">{editFormData.test_item.replace(/\s+/g, "_")}_001</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Test Item:</h3>
                {isEditing ? (
                  <Input
                    value={editFormData.test_item}
                    onChange={(e) => setEditFormData({ ...editFormData, test_item: e.target.value })}
                    className="text-base"
                  />
                ) : (
                  <p className="text-base">{editFormData.test_item}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Test Classification:</h3>
                {isEditing ? (
                  <Input
                    value={editFormData.test_classification}
                    onChange={(e) => setEditFormData({ ...editFormData, test_classification: e.target.value })}
                    className="text-base"
                  />
                ) : (
                  <p className="text-base">{editFormData.test_classification} Test</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-4">Input Data and Test Procedure:</h3>
              {stepsLoading ? (
                <div className="text-center text-muted-foreground">Loading test steps...</div>
              ) : (
                <div className="space-y-4">
                  {(isEditing ? editSteps : steps).map((step, index) => (
                    <Card key={step.id} className="p-4">
                      <div className="flex gap-4">
                        {/* Left side - Step content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                Step {step.stepOrder}
                              </Badge>
                              <Button variant="outline" size="sm" onClick={() => handleStepEdit(step)}>
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
                                      const file = e.target.files?.[0]
                                      if (file) handleStepImageUpload(step.id, file)
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
                                        const file = e.target.files?.[0]
                                        if (file) handleImageUpload(step.id, file)
                                      }}
                                    />
                                    <Button variant="ghost" size="sm" asChild>
                                      <span>
                                        <Upload className="h-3 w-3" />
                                      </span>
                                    </Button>
                                  </label>
                                  {step.imgUrl && (
                                    <Button variant="ghost" size="sm" onClick={() => handleImageRemove(step.id)}>
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
                              onChange={(e) => handleStepTextChange(step.id, e.target.value)}
                              className="text-sm min-h-[60px]"
                              placeholder="Enter step description..."
                            />
                          ) : (
                            <p className="text-sm">
                              {step.actionDescription}
                              {step.inputData && ` (${step.inputData})`}
                            </p>
                          )}
                        </div>

                        {/* Right side - Image */}
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
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Expected Output:</h3>
              {isEditing ? (
                <Textarea
                  value={editFormData.expected_output}
                  onChange={(e) => setEditFormData({ ...editFormData, expected_output: e.target.value })}
                  className="text-base min-h-[80px]"
                />
              ) : (
                <p className="text-base">{editFormData.expected_output}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Generate Script */}
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
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                {hasBeenGenerated ? "Regenerate Test Script" : "Generate Test Script"}
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
                {hasBeenGenerated
                  ? "Regenerate executable test scripts with latest changes"
                  : "Generate executable test scripts from this test case"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderExecutionView = () => (
    <div className="flex h-[calc(100vh-4rem)]" onMouseMove={handleResizeMove} onMouseUp={handleResizeEnd}>
      {/* Left Panel - Test Steps */}
      <div className="border-r bg-card flex flex-col relative" style={{ width: `${stepColumnWidth}px` }}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Test Steps</h2>
              <p className="text-sm text-muted-foreground">Click a step to view screenshot</p>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span> {editFormData.test_item.replace(/\s+/g, "_")}_001
                </div>
                <div>
                  <span className="font-medium">Test Item:</span> {editFormData.test_item}
                </div>
                <div>
                  <span className="font-medium">Test Classification:</span> {editFormData.test_classification}
                </div>
                <div>
                  <span className="font-medium">Run Config:</span> Chrome 120 - Windows 11 - Desktop
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
            <div className="p-4 text-center text-muted-foreground">Loading test steps...</div>
          ) : (
            <div className="p-4 space-y-3">
              {steps.map((step, index) => {
                const verification = getStepVerification(step.id)
                const expectedResult = expectedOutput.find((er) => er.step_id === step.id)
                const stepScore = stepScoreResults[step.id]
                const executed = isStepExecuted(step)

                return (
                  <Card
                    key={step.id}
                    className={`cursor-pointer transition-colors ${
                      selectedStep?.id === step.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleStepClick(step)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">Step {step.stepOrder}</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStepEdit(step)
                            }}
                            className="text-xs h-6 px-2"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.imgUrl && (
                            <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                              <img
                                src={step.imgUrl}
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
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    // Handle image upload for step
                                    console.log(`Uploading image for step ${step.id}`)
                                  }
                                }}
                              />
                              <div className="w-12 h-8 bg-muted rounded flex items-center justify-center hover:bg-muted/80 transition-colors">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </label>
                          )}
                          {stepScore && (
                            <Badge variant={stepScore.status === "Matched" ? "default" : "secondary"} className="text-xs">
                              {stepScore.score === 1 ? "✓" : "~"} {Math.round(stepScore.score * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">{step.actionDescription}</p>
                          {step.inputData && (
                            <p className="text-xs text-muted-foreground mb-2">Input: {step.inputData}</p>
                          )}
                          {/* Thêm giao diện mới cho radio buttons, input text, và thông báo image */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-medium">Target Element:</span>
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <input
                                type="radio"
                                name={`input-type-${step.id}`}
                                value="text"
                                checked={stepInputType[step.id] === "text" || !stepInputType[step.id]}
                                onChange={() => setStepInputType((prev) => ({ ...prev, [step.id]: "text" }))}
                              />
                              Text
                            </label>
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <input
                                type="radio"
                                name={`input-type-${step.id}`}
                                value="image"
                                checked={stepInputType[step.id] === "image"}
                                onChange={() => setStepInputType((prev) => ({ ...prev, [step.id]: "image" }))}
                              />
                              Image
                            </label>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              disabled={stepDetectLoading[step.id]}
                              onClick={async () => {
                                const inputType = stepInputType[step.id] || "text";
                                if (inputType === "text") {
                                  const text = stepTextInput[step.id] || "";
                                  if (!text) {
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: "Please enter text." }));
                                    return;
                                  }
                                  try {
                                    // Set loading state for the Detect button
                                    setStepDetectLoading((prev) => ({ ...prev, [step.id]: true }));
                                    const xpath = await findElementByText(text);
                                    // Display XPath result below input
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: `XPath: ${xpath}` }));
                                  } catch (error: any) {
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: error.message || "Error detecting element." }));
                                  } finally {
                                    // Clear loading state
                                    setStepDetectLoading((prev) => ({ ...prev, [step.id]: false }));
                                  }
                                } else {
                                  // Xử lý cho image
                                  if (!step.imgUrl) {
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: "No image uploaded. Please upload an image." }));
                                    return;
                                  }
                                  try {
                                    // Set loading state for the Detect button
                                    setStepDetectLoading((prev) => ({ ...prev, [step.id]: true }));
                                    const xpath = await findElementByImage(step.imgUrl);
                                    // Display XPath result below input
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: `XPath: ${xpath}` }));
                                  } catch (error: any) {
                                    setStepXPathResult((prev) => ({ ...prev, [step.id]: error.message || "Error detecting element by image." }));
                                  } finally {
                                    // Clear loading state
                                    setStepDetectLoading((prev) => ({ ...prev, [step.id]: false }));
                                  }
                                }
                              }}
                            >
                              {stepDetectLoading[step.id] ? "Loading..." : "Detect"}
                            </Button>
                          </div>
                          {(stepInputType[step.id] === "text" || !stepInputType[step.id]) && (
                            <>
                              <Input
                                value={stepTextInput[step.id] || ""}
                                onChange={(e) =>
                                  setStepTextInput((prev) => ({ ...prev, [step.id]: e.target.value }))
                                }
                                placeholder="Enter text here..."
                                className="mt-2 text-xs h-6"
                                style={{ fontSize: "14px" }} // Added font size for the input field
                              />
                              {stepXPathResult[step.id] && (
                                <div className="flex items-center gap-2 mt-2">
                                  <p className="text-xs text-muted-foreground">{stepXPathResult[step.id]}</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => {
                                      const xpath = stepXPathResult[step.id].replace("XPath: ", "");
                                      navigator.clipboard.writeText(xpath);
                                      setCopyStatus((prev) => ({ ...prev, [step.id]: true }));
                                      setTimeout(() => {
                                        setCopyStatus((prev) => ({ ...prev, [step.id]: false }));
                                      }, 2000); // Reset sau 2 giây
                                    }}
                                  >
                                    {copyStatus[step.id] ? "Copied!" : "Copy"}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                          {stepInputType[step.id] === "image" && (
                            <>
                              {step.imgUrl ? (
                                <>
                                  {stepXPathResult[step.id] && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <p className="text-xs text-muted-foreground">{stepXPathResult[step.id]}</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6 px-2"
                                        onClick={() => {
                                          const xpath = stepXPathResult[step.id].replace("XPath: ", "");
                                          navigator.clipboard.writeText(xpath);
                                          setCopyStatus((prev) => ({ ...prev, [step.id]: true }));
                                          setTimeout(() => {
                                            setCopyStatus((prev) => ({ ...prev, [step.id]: false }));
                                          }, 2000); // Reset sau 2 giây
                                        }}
                                      >
                                        {copyStatus[step.id] ? "Copied!" : "Copy"}
                                      </Button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-red-500 text-xs mt-2">
                                  No image uploaded. Please upload an image.
                                </p>
                              )}
                            </>
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
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {step.imgUrl ? "Screenshot available" : "No screenshot"}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Execute step logic here
                              console.log(`Executing step ${step.id}`)
                            }}
                            className="text-xs h-6 px-2"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Execute
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckStepScore(step.id)
                            }}
                            disabled={!executed || !!stepScore}
                            className="text-xs h-6 px-2"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Check Score
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Test Case Expected Output */}
        <div className="border-t p-4">
          <h3 className="font-semibold text-sm mb-2">Overall Expected Output</h3>
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">{editFormData.expected_output}</p>
              <div className="mt-3 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={handleVerifyOutputs} disabled={!!verificationResults}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Check
                </Button>
                {verificationResults && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Test Case Score:</span>
                    <Badge variant={verificationResults.overallScore >= 0.9 ? "default" : "secondary"}>
                      {Math.round(verificationResults.overallScore * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Screenshot Display */}
      <div className="flex-1 flex flex-col">
        {selectedStep ? (
          <>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Step {selectedStep.stepOrder}: {selectedStep.actionDescription}
                  </h2>
                </div>
                <Badge variant="outline">Screenshot View</Badge>
              </div>
              {selectedStep.scriptCode && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Code className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">Script Details: </span>
                    <code className="text-xs bg-background p-2 rounded block whitespace-pre-wrap">
                      {selectedStep.scriptCode}
                    </code>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-muted/20">
              <Card className="w-full max-w-4xl">
                <CardContent className="p-6">
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                    {selectedStep.imgUrl ? (
                      <img
                        src={selectedStep.imgUrl}
                        alt={`Step ${selectedStep.stepOrder} screenshot`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No Screenshot Available</p>
                        <p className="text-muted-foreground">
                          Step {selectedStep.stepOrder} - {selectedStep.actionDescription}
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
              <p className="text-muted-foreground">Click on a step from the left panel to view its screenshot</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Test Cases
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{editFormData.test_item}</h1>
            <p className="text-sm text-muted-foreground">{editFormData.test_classification}</p>
          </div>
          {viewMode === "execution" && (
            <div className="flex items-center space-x-2">
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </Button>
              <Button variant="outline">
                <Code className="h-4 w-4 mr-2" />
                Generate Test Script
              </Button>
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
    </div>
  )
}