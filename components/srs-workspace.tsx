"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, FileText, Calendar, User, ExternalLink, Play, History, Eye, Info, ClipboardCheck, Loader2 } from "lucide-react"
import { TestScenarioScreen } from "@/components/test-scenario-screen"
import { getScenariosJSONByAbsPath, validateResponse, GeneratedScenariosResponse } from "@/service/generate-test-cases"
import { JSONViewer } from "@/components/json-viewer"
import { TestCasesViewer } from "@/components/test-cases-viewer"
import { getScenariosBySrsId } from "@/service/scenario"
import { getSrsPreview } from "@/service/srs_document"
import { getAllTestCases } from "@/service/testcase"
import { getAllTestCaseSteps, getLatestScore } from "@/service/testcase-step"
import { HeadingEvaluatePanel } from "@/components/heading-evaluate-panel"
import { UsecaseEvaluatePanel } from "@/components/usecase-evaluate-panel"
import { processTrackingHeading } from "@/service/tracking-heading"
import { extractTableContentItems, processTrackingTable } from "@/service/tracking-table"
import { getUsecaseAnalyses, processTrackingUsecase } from "@/service/tracking-usecase"

interface SRSWorkspaceProps {
  srs: any
  onBack: () => void
}

export function SRSWorkspace({ srs, onBack }: SRSWorkspaceProps) {
  const [currentView, setCurrentView] = useState<"workspace" | "scenarios" | "json-viewer" | "scenario-viewer" | "evaluate">("workspace")
  const [evaluateTab, setEvaluateTab] = useState<"heading" | "table" | "usecase">("heading")
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
  const [headingLoading, setHeadingLoading] = useState(false)
  const [headingError, setHeadingError] = useState<string | null>(null)
  const [headingData, setHeadingData] = useState<unknown>(null)
  const [headingPdfUrl, setHeadingPdfUrl] = useState<string | null>(null)
  const [headingPdfLoading, setHeadingPdfLoading] = useState(false)
  const [selectedHeadingKey, setSelectedHeadingKey] = useState<string | null>(null)
  const [headingTitleMatchIndex, setHeadingTitleMatchIndex] = useState(0)
  const [shouldScrollHeadingPdf, setShouldScrollHeadingPdf] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableError, setTableError] = useState<string | null>(null)
  const [tableData, setTableData] = useState<unknown>(null)
  const [usecaseLoading, setUsecaseLoading] = useState(false)
  const [usecaseError, setUsecaseError] = useState<string | null>(null)
  const [usecaseData, setUsecaseData] = useState<unknown>(null)
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

  useEffect(() => {
    return () => {
      if (headingPdfUrl && headingPdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(headingPdfUrl)
      }
    }
  }, [headingPdfUrl])

  const handleViewScenariosManagement = () => {
    setCurrentView("scenarios")
  }

  const handleBackToWorkspace = () => {
    setCurrentView("workspace")
  }

  const handleOpenEvaluate = () => {
    setEvaluateTab("heading")
    setHeadingError(null)
    setCurrentView("evaluate")
  }

  const loadHeadingPdf = async (force = false) => {
    if (!srs?.id) return
    if (!force && headingPdfUrl) return

    setHeadingPdfLoading(true)
    try {
      if (headingPdfUrl && headingPdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(headingPdfUrl)
      }

      const blob = await getSrsPreview(srs.id)
      if (!blob || blob.size === 0) {
        throw new Error("PDF blob rỗng hoặc không hợp lệ")
      }

      setHeadingPdfUrl(URL.createObjectURL(blob))
    } catch (error: any) {
      console.error("Error loading heading PDF:", error)
      setHeadingPdfUrl(null)
    } finally {
      setHeadingPdfLoading(false)
    }
  }

  const handleRunEvaluateTab = async (tabId: "heading" | "table" | "usecase") => {
    if (!srs?.id) {
      const message = "Không tìm thấy SRS ID để đánh giá"
      if (tabId === "heading") setHeadingError(message)
      if (tabId === "table") setTableError(message)
      if (tabId === "usecase") setUsecaseError(message)
      return
    }

    if (tabId === "heading") {
      setEvaluateTab("heading")
      setHeadingLoading(true)
      setHeadingError(null)
      setSelectedHeadingKey(null)
      setHeadingTitleMatchIndex(0)

      try {
        const response = await processTrackingHeading(srs.id)
        setHeadingData(response)
        void loadHeadingPdf()
      } catch (error: any) {
        console.error("Error processing heading:", error)
        setHeadingError(error?.message || "Không thể xử lý heading")
        setHeadingData(null)
      } finally {
        setHeadingLoading(false)
      }
      return
    }

    if (tabId === "table") {
      setEvaluateTab("table")
      setTableLoading(true)
      setTableError(null)

      try {
        const response = await processTrackingTable(srs.id)
        setTableData(response)
      } catch (error: any) {
        console.error("Error processing table:", error)
        setTableError(error?.message || "Không thể xử lý table")
        setTableData(null)
      } finally {
        setTableLoading(false)
      }
      return
    }

    if (tabId === "usecase") {
      setEvaluateTab("usecase")
      setUsecaseLoading(true)
      setUsecaseError(null)

      try {
        const response = await processTrackingUsecase(srs.id)
        setUsecaseData(response)
      } catch (error: any) {
        console.error("Error processing usecase:", error)
        setUsecaseError(error?.message || "Không thể xử lý usecase")
        setUsecaseData(null)
      } finally {
        setUsecaseLoading(false)
      }
    }
  }

  const handleHeadingClick = (headingKey: string) => {
    setHeadingTitleMatchIndex((prev) =>
      selectedHeadingKey === headingKey ? prev + 1 : 0,
    )
    setSelectedHeadingKey(headingKey)
    setShouldScrollHeadingPdf(true)
    setTimeout(() => setShouldScrollHeadingPdf(false), 1500)
  }

  const withTableBorders = (html: string) => {
    if (!html) return ""
    const bodyHtml = html
      .replace(/<table\b([^>]*)>/gi, "<table $1>")
      .replace(/<th\b([^>]*)>/gi, "<th $1>")
      .replace(/<td\b([^>]*)>/gi, "<td $1>")
      .replace(/<tr\b([^>]*)>/gi, "<tr $1>")
      .replace(/<td\b([^>]*)>\s*<\/td>/gi, '<td $1 class="cell-empty"></td>')
      .replace(/<th\b([^>]*)>\s*<\/th>/gi, '<th $1 class="cell-empty"></th>')

    return `
      <style>
        .analysis-table table,
        .analysis-table tr,
        .analysis-table th,
        .analysis-table td {
          border: 1px solid #000 !important;
        }
        .analysis-table table {
          width: 100% !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
        }
        .analysis-table th,
        .analysis-table td {
          padding: 8px !important;
          vertical-align: top !important;
        }
        .analysis-table td.cell-empty,
        .analysis-table th.cell-empty {
          background: #fee2e2 !important;
        }
      </style>
      <div class="analysis-table">${bodyHtml}</div>
    `
  }

  const evaluateTabs = [
    { id: "heading" as const, label: "Heading" },
    { id: "table" as const, label: "Table" },
    { id: "usecase" as const, label: "Usecase" },
  ]

  const renderUsecaseContent = () => {
    if (usecaseLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang xử lý usecase...</p>
          </div>
        </div>
      )
    }

    if (usecaseError) {
      return (
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-800 text-sm">{usecaseError}</CardContent>
          </Card>
        </div>
      )
    }

    if (usecaseData == null) {
      return (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Nhấn nút thực thi bên cạnh tab Usecase để phân tích use case từ tài liệu SRS.
          </p>
        </div>
      )
    }

    const analyses = getUsecaseAnalyses(usecaseData)
    if (analyses.length > 0) {
      return <UsecaseEvaluatePanel analyses={analyses} />
    }

    if (typeof usecaseData === "string") {
      return (
        <div className="p-6">
          <pre className="text-sm bg-muted p-4 rounded overflow-auto whitespace-pre-wrap">{usecaseData}</pre>
        </div>
      )
    }

    return (
      <div className="p-6">
        <pre className="text-sm bg-muted p-4 rounded overflow-auto whitespace-pre-wrap">
          {JSON.stringify(usecaseData, null, 2)}
        </pre>
      </div>
    )
  }

  const renderTableContent = () => {
    if (tableLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang xử lý table...</p>
          </div>
        </div>
      )
    }

    if (tableError) {
      return (
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-800 text-sm">{tableError}</CardContent>
          </Card>
        </div>
      )
    }

    if (tableData == null) {
      return (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Nhấn nút thực thi bên cạnh tab Table để phân tích bảng từ tài liệu SRS.
          </p>
        </div>
      )
    }

    const tableItems = extractTableContentItems(tableData)
    if (tableItems.length > 0) {
      return (
        <div className="space-y-4 p-6">
          {tableItems.map((file, index) => (
            <Card key={`${file.name}-${index}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-mono">{file.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="text-sm bg-white p-3 rounded overflow-auto [&_table]:border [&_table]:border-black [&_table]:border-collapse [&_th]:border [&_th]:border-black [&_th]:p-2 [&_td]:border [&_td]:border-black [&_td]:p-2"
                  dangerouslySetInnerHTML={{ __html: withTableBorders(file.content) }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (typeof tableData === "string") {
      return (
        <div className="p-6">
          <pre className="text-sm bg-muted p-4 rounded overflow-auto whitespace-pre-wrap">{tableData}</pre>
        </div>
      )
    }

    return (
      <div className="p-6">
        <pre className="text-sm bg-muted p-4 rounded overflow-auto whitespace-pre-wrap">
          {JSON.stringify(tableData, null, 2)}
        </pre>
      </div>
    )
  }

  const renderHeadingContent = () => {
    if (headingLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang xử lý heading...</p>
          </div>
        </div>
      )
    }

    if (headingError) {
      return (
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-800 text-sm">{headingError}</CardContent>
          </Card>
        </div>
      )
    }

    if (headingData == null) {
      return (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Nhấn nút thực thi bên cạnh tab Heading để phân tích tài liệu SRS.
          </p>
        </div>
      )
    }

    if (typeof headingData === "string") {
      return (
        <div className="p-6">
          <pre className="text-sm bg-muted p-4 rounded overflow-auto whitespace-pre-wrap">{headingData}</pre>
        </div>
      )
    }

    return (
      <HeadingEvaluatePanel
        headingData={headingData}
        pdfUrl={headingPdfUrl}
        pdfLoading={headingPdfLoading}
        selectedHeadingKey={selectedHeadingKey}
        titleMatchIndex={headingTitleMatchIndex}
        shouldScrollPdf={shouldScrollHeadingPdf}
        onHeadingClick={handleHeadingClick}
        onRetryLoadPdf={() => void loadHeadingPdf(true)}
      />
    )
  }

  const renderEvaluateTabContent = () => {
    switch (evaluateTab) {
      case "heading":
        return renderHeadingContent()
      case "table":
        return renderTableContent()
      case "usecase":
        return renderUsecaseContent()
    }
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
      const response = await getScenariosJSONByAbsPath(absPath, srs.id)
      
      // Validate response
      const validatedData = validateResponse(response)
      
      // Lưu data để hiển thị
      setGeneratedData(validatedData)
      
      // Tính stats từ response
      const scenarios = validatedData.scenarios?.length || 0
      
      setGeneratedStats({ scenarios, testCases: 0 })
      setGenerationComplete(true)
      
      if (validatedData.scenarios && validatedData.scenarios.length > 0) {
        setHasExistingScenarios(true)
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

  if (currentView === "evaluate") {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <nav className="border-b bg-card flex-shrink-0">
          <div className="flex h-16 items-center px-6">
            <Button variant="ghost" onClick={handleBackToWorkspace} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workspace
            </Button>
            <h1 className="text-xl font-semibold">Evaluate - {srs.name}</h1>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="w-40 h-full border-r bg-slate-50 flex flex-col flex-shrink-0">
            <div className="px-3 py-2 border-b">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tabs</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {evaluateTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 mb-0.5 ${
                    evaluateTab === tab.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setEvaluateTab(tab.id)}
                    className="flex-1 min-w-0 text-left text-xs font-medium truncate"
                  >
                    {tab.label}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    disabled={
                      (tab.id === "heading" && headingLoading) ||
                      (tab.id === "table" && tableLoading) ||
                      (tab.id === "usecase" && usecaseLoading)
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleRunEvaluateTab(tab.id)
                    }}
                    title={`Run ${tab.label}`}
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`flex-1 h-full bg-white ${
              evaluateTab === "heading" && headingData != null && typeof headingData !== "string"
                ? "overflow-hidden"
                : evaluateTab === "usecase" && getUsecaseAnalyses(usecaseData).length > 0
                  ? "overflow-y-auto"
                  : "overflow-y-auto p-6"
            }`}
          >
            {renderEvaluateTabContent()}
          </div>
        </div>
      </div>
    )
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

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenEvaluate}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold">Evaluate</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Đánh giá tài liệu SRS theo Heading, Table và Usecase
                </p>
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
      try {
        description = JSON.parse(description)
      } catch {
        description = {}
      }
    }

    const normalizedDescription =
      description && typeof description === "object" && !isPdfMetadata(description)
        ? description
        : {}
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
        normalizedDescription.expected_output_text ||
        "",
    }
  } catch (e) {
    console.warn("Failed to normalize scenario:", e, rawScenario)
    return null
  }
}

function isPdfMetadata(value: any) {
  return (
    value &&
    typeof value === "object" &&
    ("mimeType" in value || "sizeBytes" in value || "originalName" in value) &&
    !("Title" in value) &&
    !("Steps" in value) &&
    !("Expected Result" in value)
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
