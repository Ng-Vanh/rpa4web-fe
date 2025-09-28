"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Play, Eye, EyeOff, Copy, Download, Edit3, Save, X, Trash2 } from "lucide-react"

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
  const [editingScenario, setEditingScenario] = useState<string | null>(null)
  const [editedScenarios, setEditedScenarios] = useState<Record<string, Scenario>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [scenariosState, setScenariosState] = useState<Scenario[]>(data.scenarios || [])

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

  const handleEdit = (sId: string) => {
    const scenario = scenarios.find(s => s.S_id === sId)
    if (scenario) {
      setEditingScenario(sId)
      setEditedScenarios(prev => ({
        ...prev,
        [sId]: { ...scenario }
      }))
    }
  }

  const handleCancelEdit = (sId: string) => {
    setEditingScenario(null)
    setEditedScenarios(prev => {
      const newState = { ...prev }
      delete newState[sId]
      return newState
    })
  }

  const handleFieldChange = (sId: string, field: keyof Scenario, value: string | string[]) => {
    setEditedScenarios(prev => ({
      ...prev,
      [sId]: {
        ...prev[sId],
        [field]: value
      }
    }))
  }

  const handleStepChange = (sId: string, stepIndex: number, value: string) => {
    setEditedScenarios(prev => {
      const scenario = prev[sId]
      if (!scenario) return prev
      
      const newSteps = [...scenario.Steps]
      newSteps[stepIndex] = value
      
      return {
        ...prev,
        [sId]: {
          ...scenario,
          Steps: newSteps
        }
      }
    })
  }

  const handleAddStep = (sId: string) => {
    setEditedScenarios(prev => {
      const scenario = prev[sId]
      if (!scenario) return prev
      
      return {
        ...prev,
        [sId]: {
          ...scenario,
          Steps: [...scenario.Steps, ""]
        }
      }
    })
  }

  const handleRemoveStep = (sId: string, stepIndex: number) => {
    setEditedScenarios(prev => {
      const scenario = prev[sId]
      if (!scenario) return prev
      
      const newSteps = scenario.Steps.filter((_, index) => index !== stepIndex)
      
      return {
        ...prev,
        [sId]: {
          ...scenario,
          Steps: newSteps
        }
      }
    })
  }

  const handleSave = async (sId: string) => {
    const editedScenario = editedScenarios[sId]
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
          delete newState[sId]
          return newState
        })
        // Cập nhật state cục bộ với data đã edit
        setScenariosState(prev => prev.map(s => s.S_id === sId ? editedScenario : s))
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

  const handleDelete = async (sId: string) => {
    const scenario = scenarios.find(s => s.S_id === sId)
    if (!scenario || !scenario.id) return

    // Xác nhận trước khi xóa
    if (!confirm(`Bạn có chắc chắn muốn xóa scenario "${scenario.Title}"?`)) {
      return
    }

    setIsDeleting(sId)
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
        setScenariosState(prev => prev.filter(s => s.S_id !== sId))
        // Nếu đang edit item vừa bị xóa, thoát edit mode
        if (editingScenario === sId) {
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
            const isEditing = editingScenario === scenario.S_id
            const editedScenario = editedScenarios[scenario.S_id] || scenario
            
            return (
              <Card key={scenario.S_id} className="hover:shadow-md transition-shadow">
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
                                onChange={(e) => handleFieldChange(scenario.S_id, "Title", e.target.value)}
                                className="flex-1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 text-sm">UC_id:</span>
                              <Input
                                value={editedScenario.UC_id}
                                onChange={(e) => handleFieldChange(scenario.S_id, "UC_id", e.target.value)}
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
                            onClick={() => handleSave(scenario.S_id)}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelEdit(scenario.S_id)}
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
                            onClick={() => handleEdit(scenario.S_id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(scenario.S_id)}
                            disabled={isDeleting === scenario.S_id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {isDeleting === scenario.S_id ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTestCase(scenario.S_id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Gen TCs
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
                          onChange={(e) => handleFieldChange(scenario.S_id, "Precondition", e.target.value)}
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
                            {editedScenario.Steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center space-x-2">
                                <span className="text-sm font-mono text-gray-500 w-6">{stepIndex + 1}.</span>
                                <Input
                                  value={step}
                                  onChange={(e) => handleStepChange(scenario.S_id, stepIndex, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveStep(scenario.S_id, stepIndex)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddStep(scenario.S_id)}
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
                          onChange={(e) => handleFieldChange(scenario.S_id, "Expected Result", e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                      ) : (
                        <span className="text-gray-600">{scenario["Expected Result"]}</span>
                      )}
                    </div>
                  </div>

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
