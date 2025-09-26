"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, FileText, Calendar, User, ExternalLink, Play, CheckCircle, History, Eye, Info, Edit3 } from "lucide-react"
import { TestScenarioScreen } from "@/components/test-scenario-screen"
import { getScenariosJSONByAbsPath, validateResponse } from "@/service/generate-test-cases"
import { JSONViewer } from "@/components/json-viewer"
import { TestCasesViewer } from "@/components/test-cases-viewer"
import { createScenario, getScenariosBySrsId } from "@/service/scenario"

interface SRSWorkspaceProps {
  srs: any
  onBack: () => void
}

export function SRSWorkspace({ srs, onBack }: SRSWorkspaceProps) {
  const [currentView, setCurrentView] = useState<"workspace" | "scenarios" | "json-viewer" | "test-cases">("workspace")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [generatedStats, setGeneratedStats] = useState({ scenarios: 0, testCases: 0 })
  const [showExportReport, setShowExportReport] = useState(false)
  const [generatedData, setGeneratedData] = useState<any>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [customFilePath, setCustomFilePath] = useState<string>("")
  const [showCustomPathInput, setShowCustomPathInput] = useState(false)
  const [hasExistingScenarios, setHasExistingScenarios] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)

  // Kiểm tra DB đã có scenarios cho SRS này chưa
  useEffect(() => {
    let cancelled = false
    async function loadExisting() {
      if (!srs?.id) return
      setLoadingExisting(true)
      try {
        const list = await getScenariosBySrsId(srs.id)
        if (cancelled) return
        setHasExistingScenarios(Array.isArray(list) && list.length > 0)
      } catch (e) {
        if (!cancelled) setHasExistingScenarios(false)
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }
    loadExisting()
    return () => { cancelled = true }
  }, [srs?.id])

  const handleViewScenarios = () => {
    setCurrentView("scenarios")
  }

  const handleBackToWorkspace = () => {
    setCurrentView("workspace")
  }

  const handleViewJSON = () => {
    setCurrentView("json-viewer")
  }

  const handleViewTestCases = () => {
    // Nếu DB đã có scenario, load từ DB vào viewer
    if (hasExistingScenarios && srs?.id) {
      ;(async () => {
        try {
          const list = await getScenariosBySrsId(srs.id)
          const descriptions = Array.isArray(list) ? list.map((s: any) => s.description).filter(Boolean) : []
          setGeneratedData({ test_cases: descriptions })
        } catch (e) {
          console.warn("[SRSWorkspace] Load existing scenarios failed", e)
        } finally {
          setCurrentView("test-cases")
        }
      })()
      return
    }

    // Chưa có DB: mở viewer ngay và đồng thời lưu vào DB ở background (tuần tự để giữ thứ tự)
    setCurrentView("test-cases")
    try {
      const cases = (generatedData?.test_cases ?? generatedData?.testCases) || []
      if (Array.isArray(cases) && cases.length > 0 && srs?.id) {
        ;(async () => {
          let failed = 0
          for (let i = 0; i < cases.length; i++) {
            const tc = cases[i]
            try {
              const title = tc?.["Test Objective"] ?? ""
              const description = tc
              const webUrl = ""
              await createScenario({ srsId: srs.id, title, description, webUrl })
            } catch (e) {
              failed++
              console.warn(`[SRSWorkspace] Persist scenario index ${i} failed`, e)
            }
          }
          if (failed > 0) {
            console.warn(`[SRSWorkspace] Persist scenarios: ${failed} failed / ${cases.length}`)
          }
        })().catch((e) => {
          console.warn("[SRSWorkspace] Persist scenarios unexpected error", e)
        })
      }
    } catch (e) {
      console.warn("[SRSWorkspace] Persist scenarios error", e)
    }
  }

  const handleGenerateTestCases = async () => {
    setIsGenerating(true)
    setGenerationComplete(false)
    setGenerationError(null)
    setGeneratedData(null)

    try {
      // Sử dụng custom path nếu có, nếu không thì dùng filePath từ SRS
      let absPath = customFilePath || srs.filePath
      
      if (!absPath) {
        throw new Error("SRS file path not found")
      }

      // Nếu filePath chỉ là tên file, thêm đường dẫn đầy đủ
      if (!absPath.includes('/') && !absPath.includes('\\')) {
        // Giả sử file được lưu trong thư mục uploads
        absPath = `uploads/${absPath}`
      }

      console.log("Generating test cases for path:", absPath)
      console.log("SRS object:", srs)
      
      // Gọi API để generate test cases
      const response = await getScenariosJSONByAbsPath(absPath)
      
      // Validate response
      const validatedData = validateResponse(response)
      
      // Lưu data để hiển thị
      setGeneratedData(validatedData)
      
      // Tính stats từ response
      const scenarios = validatedData.scenarios?.length || 0
      const testCases = validatedData.testCases?.length || 0
      
      setGeneratedStats({ scenarios, testCases })
      setGenerationComplete(true)
      
      console.log("Generated test cases:", validatedData)
      
    } catch (error: any) {
      console.error("Error generating test cases:", error)
      setGenerationError(error.message || "Failed to generate test cases")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportReport = () => {
    setShowExportReport(true)
  }

  const generateReportData = () => {
    const totalTestCases = 13
    const successfulTestCases = 9
    const failedTestCases = 4
    const successRate = Math.round((successfulTestCases / totalTestCases) * 100)

    return {
      srsName: srs.name,
      totalScenarios: generationComplete ? generatedStats.scenarios : 3,
      totalTestCases,
      successfulTestCases,
      failedTestCases,
      successRate,
      generatedDate: new Date().toLocaleDateString(),
      testSteps: 45,
      executedSteps: 32,
      stepSuccessRate: Math.round((32 / 45) * 100),
    }
  }

  const downloadReport = () => {
    const reportData = generateReportData()
    const reportContent = `
SRS Test Report
===============

SRS Document: ${reportData.srsName}
Generated: ${reportData.generatedDate}

SUMMARY
-------
Total Scenarios: ${reportData.totalScenarios}
Total Test Cases: ${reportData.totalTestCases}
Successful Test Cases: ${reportData.successfulTestCases}
Failed Test Cases: ${reportData.failedTestCases}
Overall Success Rate: ${reportData.successRate}%

TEST STEPS
----------
Total Steps: ${reportData.testSteps}
Executed Steps: ${reportData.executedSteps}
Step Success Rate: ${reportData.stepSuccessRate}%

DETAILED BREAKDOWN
------------------
- Functional Tests: 8 cases (75% success rate)
- Integration Tests: 3 cases (67% success rate)
- UI Tests: 2 cases (100% success rate)

Generated by RPA4Web Testing Tool
    `.trim()

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${srs.name.replace(/\s+/g, "_")}_Test_Report.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportReport(false)
  }

  if (currentView === "scenarios") {
    return <TestScenarioScreen onBack={handleBackToWorkspace} srsId={srs.id} />
  }

  if (currentView === "json-viewer" && generatedData) {
    return <JSONViewer data={generatedData} title="Generated Test Cases" onBack={handleBackToWorkspace} />
  }

  if (currentView === "test-cases" && generatedData) {
    return <TestCasesViewer data={generatedData} onBack={handleBackToWorkspace} />
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SRS List
          </Button>
          <h1 className="text-xl font-semibold">Workspace - {srs.name}</h1>
        </div>
      </nav>

      <div className="px-12 py-8">
        {generationComplete && !generationError && (
          <div className="mb-8">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      Test cases generated successfully! {generatedStats.scenarios} scenarios and{" "}
                      {generatedStats.testCases} test cases created.
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleViewTestCases}
                      className="text-blue-800 border-blue-300 hover:bg-blue-100"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View Test Cases
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleViewJSON}
                      className="text-gray-600 border-gray-300 hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View JSON
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {generationError && (
          <div className="mb-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <span className="font-medium">
                    Error generating test cases: {generationError}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-8">
          {/* Debug section - remove in production */}
          <Card className="mb-4 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p><strong>Original filePath:</strong> {srs.filePath}</p>
                <p><strong>Custom filePath:</strong> {customFilePath || "Not set"}</p>
                <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_GEN_TC_BACKEND_URL || "Not configured"}</p>
                <p><strong>Will use path:</strong> {customFilePath || (srs.filePath.includes('/') || srs.filePath.includes('\\') ? srs.filePath : `uploads/${srs.filePath}`)}</p>
              </div>
              <div className="text-xs text-yellow-700">
                <p><strong>Note:</strong> Backend cần đường dẫn đầy đủ đến file PDF trên máy local.</p>
                <p>Nếu vẫn lỗi "File not found", hãy kiểm tra:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>File có tồn tại tại đường dẫn đó không</li>
                  <li>Backend server có đang chạy không</li>
                  <li>Đường dẫn file có đúng format không</li>
                </ul>
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCustomPathInput(!showCustomPathInput)}
                  className="text-yellow-800 border-yellow-300"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {showCustomPathInput ? "Hide" : "Set Custom Path"}
                </Button>
                {showCustomPathInput && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Nhập đường dẫn đầy đủ đến file PDF..."
                      value={customFilePath}
                      onChange={(e) => setCustomFilePath(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-yellow-600">
                      Ví dụ: C:\Users\YourName\Documents\file.pdf hoặc /home/user/documents/file.pdf
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {srs.name}
              </CardTitle>
              <CardDescription>{srs.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">File Path</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{srs.filePath}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Uploaded By</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{srs.uploadedBy.username}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last modified: {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Processing:</span>
                    <Badge variant="secondary">Complete</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Test Cases:</span>
                    <Badge>{generationComplete ? `${generatedStats.testCases} Generated` : "3 Generated"}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Scenarios:</span>
                    <Badge>{generationComplete ? `${generatedStats.scenarios} Active` : "1 Active"}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Info className="h-5 w-5 mr-2" />
                Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-blue-700">
                <div className="flex items-start space-x-2">
                  <span className="font-medium">First time:</span>
                  <span>
                    When uploading an SRS for the first time, click "Generate Test Case" to create test scenarios and
                    cases automatically.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">Subsequent times:</span>
                  <span>
                    For existing SRS documents, go to "Test Scenario Management" to view, edit, and manage your test
                    scenarios.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={hasExistingScenarios ? handleViewTestCases : handleGenerateTestCases}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold">{hasExistingScenarios ? "View Test Cases" : (isGenerating ? "Generating..." : "Generate Test Cases")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasExistingScenarios ? "Open existing test cases from database" : (isGenerating ? "Creating test cases..." : "Automatically generate test cases from SRS")}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewScenarios}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Test Scenario Management</h3>
                </div>
                <p className="text-sm text-muted-foreground">Manage test scenarios for this SRS</p>
                
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Eye className="h-5 w-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold">View SRS Document</h3>
                </div>
                <p className="text-sm text-muted-foreground">View the original SRS document content</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <History className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold">View History</h3>
                </div>
                <p className="text-sm text-muted-foreground">Review test execution history and changes</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleExportReport}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Export Report</h3>
                </div>
                <p className="text-sm text-muted-foreground">Generate comprehensive test execution report</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showExportReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Test Report - {srs.name}</CardTitle>
              <CardDescription>Comprehensive test case and execution summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const reportData = generateReportData()
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Test Cases Overview</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total Test Cases:</span>
                            <span className="font-medium">{reportData.totalTestCases}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Successful:</span>
                            <span className="font-medium text-green-600">{reportData.successfulTestCases}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="font-medium text-red-600">{reportData.failedTestCases}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Success Rate:</span>
                            <span className="font-medium">{reportData.successRate}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Test Steps Overview</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total Steps:</span>
                            <span className="font-medium">{reportData.testSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Executed:</span>
                            <span className="font-medium text-blue-600">{reportData.executedSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending:</span>
                            <span className="font-medium text-orange-600">
                              {reportData.testSteps - reportData.executedSteps}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Step Success Rate:</span>
                            <span className="font-medium">{reportData.stepSuccessRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Scenarios Summary</h4>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Total Scenarios:</span>
                          <span className="font-medium">{reportData.totalScenarios}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setShowExportReport(false)}>
                        Cancel
                      </Button>
                      <Button onClick={downloadReport}>
                        <FileText className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
