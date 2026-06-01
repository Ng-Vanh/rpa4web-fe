"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, FileText, Calendar, User, ExternalLink, Play, History, Eye, Info } from "lucide-react"
import { TestScenarioScreen } from "@/components/test-scenario-screen"
import { getScenariosJSONByAbsPath, validateResponse, GeneratedScenariosResponse } from "@/service/generate-test-cases"
import { JSONViewer } from "@/components/json-viewer"
import { TestCasesViewer } from "@/components/test-cases-viewer"
import { createScenario, getScenariosBySrsId } from "@/service/scenario"
import { getSrsPreview } from "@/service/srs_document"
import { getAllTestCases } from "@/service/testcase"
import { getAllTestCaseSteps, getLatestScore } from "@/service/testcase-step"

interface SRSWorkspaceProps {
  srs: any
  onBack: () => void
}

export function SRSWorkspace({ srs, onBack }: SRSWorkspaceProps) {
  const [currentView, setCurrentView] = useState<"workspace" | "scenarios" | "json-viewer" | "scenario-viewer">("workspace")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [generatedStats, setGeneratedStats] = useState({ scenarios: 0, testCases: 0 })
  const [showExportReport, setShowExportReport] = useState(false)
  const [generatedData, setGeneratedData] = useState<GeneratedScenariosResponse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [hasExistingScenarios, setHasExistingScenarios] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [reportStats, setReportStats] = useState<{
    totalScenarios: number
    totalTestCases: number
    totalSteps: number
    executedSteps: number
    stepsWithHighScore: number
  } | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const uploadedByLabel =
    typeof srs?.uploadedBy === "object" && srs?.uploadedBy?.username
      ? srs.uploadedBy.username
      : srs?.uploadedBy
        ? `User #${srs.uploadedBy}`
        : "Unknown"

  // Kiểm tra DB đã có scenarios cho SRS này chưa
  useEffect(() => {
    let cancelled = false
    async function loadExisting() {
      if (!srs?.id) return
      setLoadingExisting(true)
      try {
        console.log("Checking existing scenarios for SRS ID:", srs.id)
        console.log("API URL:", `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/srs/${srs.id}`)
        
        const list = await getScenariosBySrsId(srs.id)
        console.log("Existing scenarios response:", list)
        
        if (cancelled) return
        const hasScenarios = Array.isArray(list) && list.length > 0
        setHasExistingScenarios(hasScenarios)
        console.log("Has existing scenarios:", hasScenarios)
      } catch (e) {
        console.error("Error checking existing scenarios:", e)
        if (!cancelled) setHasExistingScenarios(false)
      } finally {
        if (!cancelled) setLoadingExisting(false)
      }
    }
    loadExisting()
    return () => { cancelled = true }
  }, [srs?.id])

  const handleViewScenariosManagement = () => {
    setCurrentView("scenarios")
  }

  const handleBackToWorkspace = () => {
    setCurrentView("workspace")
  }

  const handleViewJSON = () => {
    setCurrentView("json-viewer")
  }

  const handleViewSrsDocument = async () => {
    if (!srs?.id) return

    try {
      const blob = await getSrsPreview(srs.id)
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      console.error("Failed to open SRS preview:", error)
      setGenerationError("Không tải được preview PDF. Vui lòng kiểm tra file upload hoặc đăng nhập lại.")
    }
  }

  const handleViewScenarios = () => {
    // Luôn request API để lấy scenarios từ database
    if (srs?.id) {
      ;(async () => {
        try {
          console.log("Loading scenarios for SRS ID:", srs.id)
          console.log("API URL:", `${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/srs/${srs.id}`)
          
          const list = await getScenariosBySrsId(srs.id)
          console.log("Raw API response:", list)
          
          const scenarios = Array.isArray(list) ? list.map(normalizeScenarioForViewer).filter(Boolean) : []
          
          console.log("Parsed scenarios:", scenarios)
          
          // Cập nhật data và chuyển sang viewer
          setGeneratedData({ scenarios })
          setGenerationComplete(true) // Đánh dấu là đã có data
          setGeneratedStats({ scenarios: scenarios.length, testCases: 0 })
          console.log("Loaded scenarios from database:", scenarios)
          
          // Chuyển sang viewer
          setCurrentView("scenario-viewer")
        } catch (e) {
          console.error("[SRSWorkspace] Load existing scenarios failed", e)
          setGeneratedData({ scenarios: [] })
          setCurrentView("scenario-viewer")
        }
      })()
      return
    }

    // Không có SRS ID: mở viewer với data rỗng
    setGeneratedData({ scenarios: [] })
    setCurrentView("scenario-viewer")
  }

  const handleGenerateScenarios = async () => {
    setIsGenerating(true)
    setGenerationComplete(false)
    setGenerationError(null)
    setGeneratedData(null)

    try {
      // Sử dụng custom path nếu có, nếu không thì dùng filePath từ SRS
      let absPath = srs.filePath
      
      if (!absPath) {
        throw new Error("SRS file path not found")
      }

      // Nếu filePath chỉ là tên file, thêm đường dẫn đầy đủ
      if (!absPath.includes('/') && !absPath.includes('\\')) {
        // Giả sử file được lưu trong thư mục uploads
        absPath = `uploads/${absPath}`
      }

      console.log("Generating scenarios for path:", absPath)
      console.log("SRS object:", srs)
      
      // Gọi API để generate scenarios
      const response = await getScenariosJSONByAbsPath(absPath)
      
      // Validate response
      const validatedData = validateResponse(response)
      
      // Lưu data để hiển thị
      setGeneratedData(validatedData)
      
      // Tính stats từ response
      const scenarios = validatedData.scenarios?.length || 0
      
      setGeneratedStats({ scenarios, testCases: 0 })
      setGenerationComplete(true)
      
      // Lưu scenarios vào database ngay lập tức
      if (validatedData.scenarios && validatedData.scenarios.length > 0 && srs?.id) {
        const scenarios = validatedData.scenarios
        ;(async () => {
          let failed = 0
          for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i]
            try {
              const title = scenario.Title || ""
              const description = JSON.stringify(scenario, null, 2) // Toàn bộ nội dung scenario
              const webUrl = ""
              await createScenario({ srsId: srs.id, title, description, webUrl })
            } catch (e) {
              failed++
              console.warn(`[SRSWorkspace] Persist scenario index ${i} failed`, e)
            }
          }
          if (failed > 0) {
            console.warn(`[SRSWorkspace] Persist scenarios: ${failed} failed / ${scenarios.length}`)
          } else {
            console.log(`[SRSWorkspace] Successfully saved ${scenarios.length} scenarios to database`)
            // Cập nhật state để nút chuyển thành "View Scenarios"
            setHasExistingScenarios(true)
          }
        })().catch((e) => {
          console.warn("[SRSWorkspace] Persist scenarios unexpected error", e)
        })
      }
      
      console.log("Generated scenarios:", validatedData)
      
    } catch (error: any) {
      console.error("Error generating scenarios:", error)
      setGenerationError(error.message || "Failed to generate scenarios")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportReport = async () => {
    setShowExportReport(true)
    setReportLoading(true)
    try {
      const scenarios = await getScenariosBySrsId(srs.id)
      const scenarioList = Array.isArray(scenarios) ? scenarios : []

      // Fetch test cases for all scenarios in parallel
      const testCasesPerScenario = await Promise.all(
        scenarioList.map((s: any) =>
          getAllTestCases(s.id).then((r: any) => r.data || r).catch(() => [])
        )
      )
      const allTestCases = testCasesPerScenario.flat()

      // Fetch steps for all test cases in parallel
      const stepsPerTestCase = await Promise.all(
        allTestCases.map((tc: any) =>
          getAllTestCaseSteps(tc.id).then((r: any) => r.data || r).catch(() => [])
        )
      )
      const allSteps = stepsPerTestCase.flat()

      // Fetch latest score for all steps in parallel
      const scores = await Promise.all(
        allSteps.map((step: any) => getLatestScore(step.id))
      )

      const executedSteps = scores.filter((s) => s !== null).length
      const stepsWithHighScore = scores.filter((s) => s !== null && s >= 0.5).length

      setReportStats({
        totalScenarios: scenarioList.length,
        totalTestCases: allTestCases.length,
        totalSteps: allSteps.length,
        executedSteps,
        stepsWithHighScore,
      })
    } catch (e) {
      console.error("Failed to load report stats:", e)
    } finally {
      setReportLoading(false)
    }
  }

  const generateReportData = () => {
    const totalScenarios = reportStats?.totalScenarios ?? (generationComplete ? generatedStats.scenarios : 0)
    const totalTestCases = reportStats?.totalTestCases ?? 0
    const totalSteps = reportStats?.totalSteps ?? 0
    const executedSteps = reportStats?.executedSteps ?? 0
    const stepsWithHighScore = reportStats?.stepsWithHighScore ?? 0
    const pendingSteps = totalSteps - executedSteps
    const successRate = executedSteps > 0 ? Math.round((stepsWithHighScore / executedSteps) * 100) : 0
    const stepSuccessRate = totalSteps > 0 ? Math.round((stepsWithHighScore / totalSteps) * 100) : 0

    return {
      srsName: srs.name,
      totalScenarios,
      totalTestCases,
      totalSteps,
      executedSteps,
      pendingSteps,
      stepsWithHighScore,
      successRate,
      stepSuccessRate,
      generatedDate: new Date().toLocaleDateString(),
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

TEST STEPS
----------
Total Steps: ${reportData.totalSteps}
Executed Steps: ${reportData.executedSteps}
Pending Steps: ${reportData.pendingSteps}
Steps Passed (score >= 50%): ${reportData.stepsWithHighScore}
Step Pass Rate: ${reportData.stepSuccessRate}%
Overall Score Rate (executed): ${reportData.successRate}%

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
    return <JSONViewer data={generatedData} title="Generated Scenarios" onBack={handleBackToWorkspace} />
  }

  if (currentView === "scenario-viewer" && generatedData) {
    return <TestCasesViewer data={generatedData} onBack={handleBackToWorkspace} srsId={srs.id} />
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

        {generationError && (
          <div className="mb-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <span className="font-medium">
                    Error generating scenarios: {generationError}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-8">

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
                    <span className="text-sm">{uploadedByLabel}</span>
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
                    <span className="text-sm text-muted-foreground">Scenarios:</span>
                    <Badge>{generationComplete ? `${generatedStats.scenarios} Generated` : "0 Generated"}</Badge>
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
                  <span className="font-medium">Generate Scenarios:</span>
                  <span>
                    Click "Generate Scenarios" to create test scenarios automatically from SRS document.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">View Scenarios:</span>
                  <span>
                    Click "View Scenarios" to see the generated scenarios in a structured format.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={hasExistingScenarios ? handleViewScenarios : handleGenerateScenarios}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold">{hasExistingScenarios ? "View Scenarios" : (isGenerating ? "Generating..." : "Generate Scenarios")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasExistingScenarios ? "View scenarios from database" : (isGenerating ? "Creating scenarios..." : "Automatically generate scenarios from SRS")}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewScenariosManagement}>
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

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleViewSrsDocument}>
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

            {/* <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <History className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold">View History</h3>
                </div>
                <p className="text-sm text-muted-foreground">Review test execution history and changes</p>
              </CardContent>
            </Card> */}

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
              {reportLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading report data...</div>
              ) : (() => {
                const reportData = generateReportData()
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Scenarios & Test Cases</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total Scenarios:</span>
                            <span className="font-medium">{reportData.totalScenarios}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Test Cases:</span>
                            <span className="font-medium">{reportData.totalTestCases}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Test Steps Overview</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total Steps:</span>
                            <span className="font-medium">{reportData.totalSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Executed:</span>
                            <span className="font-medium text-blue-600">{reportData.executedSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending:</span>
                            <span className="font-medium text-orange-600">{reportData.pendingSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Passed (score ≥ 50%):</span>
                            <span className="font-medium text-green-600">{reportData.stepsWithHighScore}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Pass Rate (of executed):</span>
                            <span className="font-medium">{reportData.successRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pass Rate (of total):</span>
                            <span className="font-medium">{reportData.stepSuccessRate}%</span>
                          </div>
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

function normalizeScenarioForViewer(rawScenario: any) {
  try {
    let description: any = rawScenario?.description
    if (typeof description === "string") {
      description = JSON.parse(description)
    }

    const normalizedDescription = description && typeof description === "object" ? description : {}
    const id = Number(rawScenario?.id)
    const title =
      normalizedDescription.Title ||
      normalizedDescription.title ||
      rawScenario?.title ||
      `Scenario ${id || ""}`.trim()

    const steps = Array.isArray(normalizedDescription.Steps)
      ? normalizedDescription.Steps
      : Array.isArray(normalizedDescription.steps)
        ? normalizedDescription.steps
        : []

    return {
      ...normalizedDescription,
      id,
      UC_id: normalizedDescription.UC_id || normalizedDescription.ucId || `UC_${id || "NEW"}`,
      S_id: normalizedDescription.S_id || normalizedDescription.s_id || `S_${id || "NEW"}`,
      s_id: normalizedDescription.s_id || normalizedDescription.S_id || `S_${id || "NEW"}`,
      Title: title,
      Precondition:
        normalizedDescription.Precondition ||
        normalizedDescription.precondition ||
        normalizedDescription.purpose ||
        "",
      Postcondition:
        normalizedDescription.Postcondition ||
        normalizedDescription.postcondition ||
        "",
      Steps: steps.map((step: any) => String(step)),
      "Expected Result":
        normalizedDescription["Expected Result"] ||
        normalizedDescription.expectedResult ||
        normalizedDescription.expected_output ||
        "",
    }
  } catch (e) {
    console.warn("Failed to normalize scenario:", e, rawScenario)
    return null
  }
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
