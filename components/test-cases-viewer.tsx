"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Play, Eye, EyeOff, Copy, Download, Edit3, Save, X, Trash2, Loader2, Check } from "lucide-react"
import { generateTestCases, createTestCaseWithSteps, getTestCasesWithSteps } from "@/service/testcase"

interface Scenario {
  UC_id: string
  S_id: string
  "Title": string
  Precondition: string
  Steps: string[]
  "Expected Result": string
  s_id: string
  id?: number // ID từ database để update
}

interface GeneratedTestCase {
  test_item: string
  test_classification: string
  steps: {
    step_order: number
    action_description: string
    input_data: any
    expected_output: string
  }[]
}

interface GeneratedTestCases {
  test_cases: GeneratedTestCase[]
}

interface DatabaseTestCase {
  id: number
  scenarioId: number
  testItem: string
  testClassification: string
  runConfig: any
  createdAt: string
  updatedAt: string
  steps: DatabaseTestCaseStep[]
}

interface DatabaseTestCaseStep {
  id: number
  testCaseId: number
  stepOrder: number
  actionDescription: string
  inputData: string
  expectedOutput: string
  scriptCode: string
  stepImage: string | null
  createdAt: string
  updatedAt: string
}

interface TestCasesViewerProps {
  data: {
    scenarios?: Scenario[]
  }
  onBack?: () => void
}

export function TestCasesViewer({ data, onBack }: TestCasesViewerProps) {
  const [showTestData, setShowTestData] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set())
  const [editingScenario, setEditingScenario] = useState<number | null>(null)
  const [editedScenarios, setEditedScenarios] = useState<Record<number, Scenario>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [scenariosState, setScenariosState] = useState<Scenario[]>(data.scenarios || [])
  const [generatedTestCases, setGeneratedTestCases] = useState<Record<string, GeneratedTestCases>>({})
  const [isGeneratingTC, setIsGeneratingTC] = useState<string | null>(null)
  const [isAcceptingTC, setIsAcceptingTC] = useState<string | null>(null)
  const [acceptedTestCases, setAcceptedTestCases] = useState<Set<string>>(new Set())
  const [databaseTestCases, setDatabaseTestCases] = useState<Record<string, DatabaseTestCase[]>>({})
  const [isLoadingDatabaseTC, setIsLoadingDatabaseTC] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())

  // Đồng bộ state khi props data thay đổi
  useEffect(() => {
    setScenariosState(data.scenarios || [])
  }, [data.scenarios])

  const toggleTestCase = (sId: string) => {
    const newExpanded = new Set(expandedCases)
    if (newExpanded.has(sId)) {
      newExpanded.delete(sId)
    } else {
      newExpanded.add(sId)
    }
    setExpandedCases(newExpanded)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "test_cases.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleAllTestData = () => {
    // Nếu đang hiển thị rồi thì ẩn ngay lập tức
    if (showTestData) {
      setShowTestData(false)
      return
    }
    // Chưa hiển thị: mô phỏng generate 4 giây rồi mới hiện
    setIsGeneratingAll(true)
    setTimeout(() => {
      setShowTestData(true)
      setIsGeneratingAll(false)
    }, 4000)
  }

  const handleEdit = (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (scenario) {
      setEditingScenario(scenarioId)
      setEditedScenarios(prev => ({
        ...prev,
        [scenarioId]: { ...scenario }
      }))
    }
  }

  const handleCancelEdit = (scenarioId: number) => {
    setEditingScenario(null)
    setEditedScenarios(prev => {
      const newState = { ...prev }
      delete newState[scenarioId]
      return newState
    })
  }

  const handleFieldChange = (scenarioId: number, field: keyof Scenario, value: string | string[]) => {
    setEditedScenarios(prev => ({
      ...prev,
      [scenarioId]: {
        ...prev[scenarioId],
        [field]: value
      }
    }))
  }

  const handleStepChange = (scenarioId: number, stepIndex: number, value: string) => {
    setEditedScenarios(prev => {
      const scenario = prev[scenarioId]
      if (!scenario) return prev
      
      const newSteps = [...scenario.Steps]
      newSteps[stepIndex] = value
      
      return {
        ...prev,
        [scenarioId]: {
          ...scenario,
          Steps: newSteps
        }
      }
    })
  }

  const handleAddStep = (scenarioId: number) => {
    setEditedScenarios(prev => {
      const scenario = prev[scenarioId]
      if (!scenario) return prev
      
      return {
        ...prev,
        [scenarioId]: {
          ...scenario,
          Steps: [...scenario.Steps, ""]
        }
      }
    })
  }

  const handleRemoveStep = (scenarioId: number, stepIndex: number) => {
    setEditedScenarios(prev => {
      const scenario = prev[scenarioId]
      if (!scenario) return prev
      
      const newSteps = scenario.Steps.filter((_, index) => index !== stepIndex)
      
      return {
        ...prev,
        [scenarioId]: {
          ...scenario,
          Steps: newSteps
        }
      }
    })
  }

  const handleSave = async (scenarioId: number) => {
    const editedScenario = editedScenarios[scenarioId]
    if (!editedScenario || !editedScenario.id) return

    setIsSaving(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/${editedScenario.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedScenario.Title,
          description: JSON.stringify(editedScenario),
          webUrl: ""
        })
      })

      if (response.ok) {
        console.log("Scenario updated successfully")
        setEditingScenario(null)
        setEditedScenarios(prev => {
          const newState = { ...prev }
          delete newState[scenarioId]
          return newState
        })
        // Cập nhật state cục bộ với data đã edit
        setScenariosState(prev => prev.map(s => s.id === scenarioId ? editedScenario : s))
        // Có thể thêm toast notification ở đây
      } else {
        console.error("Failed to update scenario:", response.statusText)
      }
    } catch (error) {
      console.error("Error updating scenario:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario || !scenario.id) return

    // Xác nhận trước khi xóa
    if (!confirm(`Bạn có chắc chắn muốn xóa scenario "${scenario.Title}"?`)) {
      return
    }

    setIsDeleting(scenarioId.toString())
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/${scenario.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        console.log("Scenario deleted successfully")
        // Cập nhật danh sách cục bộ, không reload trang
        setScenariosState(prev => prev.filter(s => s.id !== scenarioId))
        // Dọn dẹp các state liên quan để tránh trùng/lưu vết trên UI
        setExpandedCases(prev => {
          const next = new Set(prev)
          next.delete(scenario.S_id)
          return next
        })
        setGeneratedTestCases(prev => {
          const next = { ...prev }
          delete next[scenario.S_id]
          return next
        })
        setDatabaseTestCases(prev => {
          const next = { ...prev }
          delete next[scenario.S_id]
          return next
        })
        setAcceptedTestCases(prev => {
          const next = new Set(prev)
          next.delete(scenario.S_id)
          return next
        })
        // Nếu đang edit item vừa bị xóa, thoát edit mode
        if (editingScenario === scenarioId) {
          setEditingScenario(null)
        }
        // Có thể thêm toast notification ở đây
      } else {
        console.error("Failed to delete scenario:", response.statusText)
        alert("Không thể xóa scenario. Vui lòng thử lại.")
      }
    } catch (error) {
      console.error("Error deleting scenario:", error)
      alert("Có lỗi xảy ra khi xóa scenario. Vui lòng thử lại.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleGenerateTestCases = async (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario) return

    const sId = scenario.S_id // Sử dụng S_id làm key cho generatedTestCases
    setIsGeneratingTC(sId)
    try {
      const result = await generateTestCases(scenario)
      setGeneratedTestCases(prev => ({
        ...prev,
        [sId]: result
      }))
    } catch (error) {
      console.error("Error generating test cases:", error)
      alert("Có lỗi xảy ra khi tạo test cases. Vui lòng thử lại.")
    } finally {
      setIsGeneratingTC(null)
    }
  }

  const handleAcceptTestCases = async (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    const sId = scenario?.S_id
    const testCases = sId ? generatedTestCases[sId] : null
    
    if (!scenario || !scenario.id || !testCases || !sId) return

    setIsAcceptingTC(sId)
    try {
      await createTestCaseWithSteps(scenario.id, testCases.test_cases)
      
      // Đánh dấu đã accept
      setAcceptedTestCases(prev => new Set([...prev, sId]))
      
      // Load lại test cases từ database
      await loadDatabaseTestCases(sId)
      
      alert(`Đã lưu thành công ${testCases.test_cases.length} test cases vào database!`)
    } catch (error) {
      console.error("Error accepting test cases:", error)
      alert("Có lỗi xảy ra khi lưu test cases. Vui lòng thử lại.")
    } finally {
      setIsAcceptingTC(null)
    }
  }

  const loadDatabaseTestCases = async (sId: string) => {
    const scenario = scenarios.find(s => s.S_id === sId)
    if (!scenario || !scenario.id) return

    setIsLoadingDatabaseTC(sId)
    try {
      const testCases = await getTestCasesWithSteps(scenario.id)
      setDatabaseTestCases(prev => ({
        ...prev,
        [sId]: testCases
      }))
    } catch (error) {
      console.error("Error loading database test cases:", error)
    } finally {
      setIsLoadingDatabaseTC(null)
    }
  }

  const toggleTestCaseExpansion = (tcId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(tcId)) {
      newExpanded.delete(tcId)
    } else {
      newExpanded.add(tcId)
    }
    setExpandedTestCases(newExpanded)
  }

  const scenarios = scenariosState

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-xl font-semibold">Generated Scenarios</h1>
          <div className="ml-auto flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllTestData}
              disabled={isGeneratingAll}
              className={showTestData ? "bg-blue-50 border-blue-200" : ""}
            >
              {showTestData ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Test Data
                </>
              ) : isGeneratingAll ? (
                <>Generating...</>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Generate All TCs
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadJSON}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Total Scenarios: {scenarios.length}</Badge>
                <Badge variant="outline">Use Cases: {new Set(scenarios.map(s => s.UC_id)).size}</Badge>
                <Badge variant="outline">
                  {showTestData ? "Test Data: Visible" : "Test Data: Hidden"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {scenarios.map((scenario, index) => {
            const isExpanded = expandedCases.has(scenario.S_id)
            const isEditing = editingScenario === scenario.id
            const editedScenario = scenario.id ? editedScenarios[scenario.id] || scenario : scenario
            
            return (
              <Card key={scenario.id ?? scenario.S_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header với S_id: Title (UC_id: "") */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {isEditing ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-blue-600">{scenario.s_id}:</span>
                              <Input
                                value={editedScenario["Title"]}
                                onChange={(e) => handleFieldChange(scenario.id!, "Title", e.target.value)}
                                className="flex-1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 text-sm">UC_id:</span>
                              <Input
                                value={editedScenario.UC_id}
                                onChange={(e) => handleFieldChange(scenario.id!, "UC_id", e.target.value)}
                                className="w-32"
                              />
                            </div>
                          </div>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900">
                            <span className="font-mono text-blue-600">{scenario.s_id}:</span> {scenario["Title"]} <span className="text-gray-500 text-sm">({scenario.UC_id})</span>
                          </h3>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(scenario.id!)}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelEdit(scenario.id!)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(scenario.id!)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(scenario.id!)}
                            disabled={isDeleting === String(scenario.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {isDeleting === scenario.S_id ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateTestCases(scenario.id!)}
                            disabled={isGeneratingTC === scenario.S_id}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {isGeneratingTC === scenario.S_id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              "Gen TCs"
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Precondition */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Precondition:</span>
                      {isEditing ? (
                        <Textarea
                          value={editedScenario.Precondition}
                          onChange={(e) => handleFieldChange(scenario.id!, "Precondition", e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                      ) : (
                        <span className="text-gray-600">{scenario.Precondition}</span>
                      )}
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Steps:</span>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            {editedScenario.Steps.map((step: string, stepIndex: number) => (
                              <div key={stepIndex} className="flex items-center space-x-2">
                                <span className="text-sm font-mono text-gray-500 w-6">{stepIndex + 1}.</span>
                                <Input
                                  value={step}
                                  onChange={(e) => handleStepChange(scenario.id!, stepIndex, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveStep(scenario.id!, stepIndex)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddStep(scenario.id!)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              + Add Step
                            </Button>
                          </div>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1">
                            {scenario.Steps.map((step, stepIndex) => {
                              const raw = typeof step === 'string' ? step : String(step)
                              // Loại bỏ số thứ tự có sẵn ở đầu chuỗi (vd: "1. ", "2) ")
                              const cleaned = raw.replace(/^\s*\d+[\.)]\s*/, '')
                              return (
                                <li key={stepIndex} className="text-gray-600">
                                  {cleaned}
                                </li>
                              )
                            })}
                          </ol>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expected */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Expected:</span>
                      {isEditing ? (
                        <Textarea
                          value={editedScenario["Expected Result"]}
                          onChange={(e) => handleFieldChange(scenario.id!, "Expected Result", e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                      ) : (
                        <span className="text-gray-600">{scenario["Expected Result"]}</span>
                      )}
                    </div>
                  </div>

                  {/* Generated Test Cases */}
                  {generatedTestCases[scenario.S_id] && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Generated TCs:</span>
                        <div className="flex-1">
                          <div className="bg-gray-50 p-4 rounded-lg border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-600">
                                {generatedTestCases[scenario.S_id].test_cases.length} test cases generated
                              </span>
                              {acceptedTestCases.has(scenario.S_id) ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <Check className="h-3 w-3 mr-1" />
                                  Accepted
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptTestCases(scenario.id!)}
                                  disabled={isAcceptingTC === scenario.S_id}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {isAcceptingTC === scenario.S_id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Accept
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                              {JSON.stringify(generatedTestCases[scenario.S_id], null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Database Test Cases */}
                  {databaseTestCases[scenario.S_id] && databaseTestCases[scenario.S_id].length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Saved TCs:</span>
                        <div className="flex-1">
                          <div className="space-y-3">
                            {databaseTestCases[scenario.S_id].map((testCase, tcIndex) => (
                              <Card key={testCase.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-semibold text-gray-900">
                                        {tcIndex + 1}. {testCase.testItem}
                                      </h4>
                                      <Badge 
                                        variant={testCase.testClassification === 'Positive' ? 'default' : 'secondary'}
                                        className={testCase.testClassification === 'Positive' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                                      >
                                        {testCase.testClassification}
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleTestCaseExpansion(`${scenario.S_id}-${testCase.id}`)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      {expandedTestCases.has(`${scenario.S_id}-${testCase.id}`) ? 'Collapse' : 'Expand'}
                                    </Button>
                                  </div>
                                  
                                  {expandedTestCases.has(`${scenario.S_id}-${testCase.id}`) && (
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-600 mb-3">
                                        <strong>Steps ({testCase.steps.length}):</strong>
                                      </div>
                                      {testCase.steps
                                        .sort((a, b) => a.stepOrder - b.stepOrder)
                                        .map((step, stepIndex) => (
                                        <div key={step.id} className="bg-white p-3 rounded border">
                                          <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                              {step.stepOrder}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                              <div>
                                                <span className="font-medium text-gray-900">Action:</span>
                                                <p className="text-gray-700 mt-1">{step.actionDescription}</p>
                                              </div>
                                              {step.inputData && step.inputData !== '{}' && (
                                                <div>
                                                  <span className="font-medium text-gray-900">Input Data:</span>
                                                  <p className="text-gray-700 mt-1 text-sm bg-gray-50 p-2 rounded">
                                                    {step.inputData}
                                                  </p>
                                                </div>
                                              )}
                                              <div>
                                                <span className="font-medium text-gray-900">Expected Output:</span>
                                                <p className="text-gray-700 mt-1">{step.expectedOutput}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Load Database Test Cases Button */}
                  {!databaseTestCases[scenario.S_id] && scenario.id && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Saved TCs:</span>
                        <div className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadDatabaseTestCases(scenario.S_id)}
                            disabled={isLoadingDatabaseTC === scenario.S_id}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {isLoadingDatabaseTC === scenario.S_id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Load Saved Test Cases
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Data - chỉ hiển thị khi showTestData = true
                  {showTestData && scenario["Test Data"] && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Test Data:</span>
                        <div className="flex-1">
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <code className="text-sm text-gray-700 whitespace-pre-wrap">
                              {testCase["Test Data"]}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* Divider */}
                  {index < scenarios.length - 1 && (
                    <hr className="border-gray-200 mt-4" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {scenarios.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Scenarios Found</h3>
              <p className="text-muted-foreground">
                No scenarios were generated from the SRS document.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
