"use client"

import type React from "react"

import { useState } from "react"
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
import { mockSteps, mockExpectedResults, mockExecutionSteps, mockVerifications } from "@/lib/mock-data"
import { StepEditModal } from "@/components/step-edit-modal"

interface TestCaseDetailScreenProps {
  onBack: () => void
  testCase: any
  initialView?: "details" | "execution"
}

export function TestCaseDetailScreen({ onBack, testCase, initialView = "details" }: TestCaseDetailScreenProps) {
  const [viewMode, setViewMode] = useState<"details" | "execution">(initialView)
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [stepScoreResults, setStepScoreResults] = useState<{ [key: number]: { score: number; status: string } }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isStepModalOpen, setIsStepModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    test_item: testCase.test_item,
    test_classification: testCase.test_classification,
    environment_condition: testCase.environment_condition || "",
    expected_output: testCase.expected_output,
  })
  const [editSteps, setEditSteps] = useState(
    mockSteps
      .filter((s) => s.test_case_id === testCase.id)
      .map((step) => ({
        ...step,
        stepImage: null as File | null,
        stepImageUrl: `/placeholder.svg?height=200&width=300&query=step-${step.step_order}-screenshot`,
      })),
  )
  const [stepColumnWidth, setStepColumnWidth] = useState(425)
  const [isResizing, setIsResizing] = useState(false)

  const steps = mockSteps.filter((s) => s.test_case_id === testCase.id)
  const expectedResults = mockExpectedResults.filter((er) => er.test_case_id === testCase.id)
  const executionSteps = mockExecutionSteps
  const verifications = mockVerifications

  const hasBeenGenerated = steps.length > 0 && steps.some((step) => step.script_code)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    // In a real app, this would save to backend
    console.log("Saving test case changes:", editFormData)
    console.log("Saving step changes:", editSteps)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditFormData({
      test_item: testCase.test_item,
      test_classification: testCase.test_classification,
      environment_condition: testCase.environment_condition || "",
      expected_output: testCase.expected_output,
    })
    setEditSteps(
      mockSteps
        .filter((s) => s.test_case_id === testCase.id)
        .map((step) => ({
          ...step,
          stepImage: null as File | null,
          stepImageUrl: `/placeholder.svg?height=200&width=300&query=step-${step.step_order}-screenshot`,
        })),
    )
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
      test_case_id: testCase.id,
      step_order: steps.length + 1,
      action_description: "",
      input_data: "",
      expected_result: "",
      stepImage: null as File | null,
      stepImageUrl: null,
    }
    setEditingStep(newStep)
    setIsStepModalOpen(true)
  }

  const handleStepModalSave = (updatedStep: any) => {
    if (steps.find((step) => step.id === updatedStep.id)) {
      // Editing existing step
      setEditSteps((prev) => prev.map((step) => (step.id === updatedStep.id ? updatedStep : step)))
      console.log("Saving step changes for step:", updatedStep.id)
    } else {
      // Adding new step
      setEditSteps((prev) => [...prev, updatedStep])
      console.log("Adding new step:", updatedStep.id)
    }
    setIsStepModalOpen(false)
    setEditingStep(null)
  }

  const handleStepModalClose = () => {
    setIsStepModalOpen(false)
    setEditingStep(null)
  }

  const handleStepTextChange = (stepId: number, newText: string) => {
    setEditSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, action_description: newText } : step)))
  }

  const handleImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setEditSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, stepImage: file, stepImageUrl: imageUrl } : step)),
    )
  }

  const handleImageRemove = (stepId: number) => {
    setEditSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              stepImage: null,
              stepImageUrl: `/placeholder.svg?height=200&width=300&query=step-${step.step_order}-screenshot`,
            }
          : step,
      ),
    )
  }

  const handleStepImageUpload = (stepId: number, file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setEditSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, stepImage: file, stepImageUrl: imageUrl } : step)),
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
    return step.script_code && step.script_code.trim() !== ""
  }

  const getStepVerification = (stepId: number) => {
    return verificationResults?.stepResults.find((r: any) => r.stepId === stepId)
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
                <p className="text-base">{testCase.test_item.replace(/\s+/g, "_")}_001</p>
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
              <div className="space-y-4">
                {(isEditing ? editSteps : steps).map((step, index) => (
                  <Card key={step.id} className="p-4">
                    <div className="flex gap-4">
                      {/* Left side - Step content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              Step {index + 1}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => handleStepEdit(step)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Step
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            {step.stepImageUrl && (
                              <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                                <img
                                  src={step.stepImageUrl || "/placeholder.svg"}
                                  alt={`Step ${index + 1} thumbnail`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {!step.stepImageUrl && (
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
                                {step.stepImage && (
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
                            value={step.action_description}
                            onChange={(e) => handleStepTextChange(step.id, e.target.value)}
                            className="text-sm min-h-[60px]"
                            placeholder="Enter step description..."
                          />
                        ) : (
                          <p className="text-sm">
                            {step.action_description}
                            {step.input_data && ` (${step.input_data})`}
                          </p>
                        )}
                      </div>

                      {/* Right side - Image */}
                      <div className="w-48 flex-shrink-0">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <img
                            src={step.stepImageUrl || "/placeholder.svg"}
                            alt={`Step ${index + 1} screenshot`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
                  <span className="font-medium">ID:</span> {testCase.test_item.replace(/\s+/g, "_")}_001
                </div>
                <div>
                  <span className="font-medium">Test Item:</span> {testCase.test_item}
                </div>
                <div>
                  <span className="font-medium">Test Classification:</span> {testCase.test_classification}
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
          <div className="p-4 space-y-3">
            {steps.map((step, index) => {
              const verification = getStepVerification(step.id)
              const expectedResult = expectedResults.find((er) => er.step_id === step.id)
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
                        <CardTitle className="text-sm">Step {step.step_order}</CardTitle>
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
                        {step.img_url && (
                          <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                            <img
                              src={`/step-.jpg?key=x1bas&height=32&width=48&query=step-${step.step_order}-thumbnail`}
                              alt={`Step ${step.step_order} thumbnail`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {!step.img_url && (
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
                        <p className="text-sm font-medium mb-1">{step.action_description}</p>
                        {step.input_data && (
                          <p className="text-xs text-muted-foreground mb-2">Input: {step.input_data}</p>
                        )}
                      </div>
                    </div>
                    {expectedResult && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <div className="flex items-center mb-1">
                          <Target className="h-3 w-3 mr-1" />
                          Expected:
                        </div>
                        <p className="pl-4">{expectedResult.description}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Screenshot available
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
        </div>

        {/* Test Case Expected Output */}
        <div className="border-t p-4">
          <h3 className="font-semibold text-sm mb-2">Overall Expected Output</h3>
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">{testCase.expected_output}</p>
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
                    Step {selectedStep.step_order}: {selectedStep.action_description}
                  </h2>
                  <p className="text-muted-foreground">Expected URL: {selectedStep.expected_page_url}</p>
                </div>
                <Badge variant="outline">Screenshot View</Badge>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Code className="h-4 w-4 mr-2" />
                  <span className="font-medium text-sm">Script Details</span>
                </div>
                <code className="text-xs bg-background p-2 rounded block whitespace-pre-wrap">
                  {selectedStep.script_code}
                </code>
              </div>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-muted/20">
              <Card className="w-full max-w-4xl">
                <CardContent className="p-6">
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Screenshot Preview</p>
                      <p className="text-muted-foreground">
                        Step {selectedStep.step_order} - {selectedStep.action_description}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">Image: {selectedStep.img_url}</p>
                    </div>
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
            <h1 className="text-xl font-semibold">{testCase.test_item}</h1>
            <p className="text-sm text-muted-foreground">{testCase.test_classification}</p>
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
