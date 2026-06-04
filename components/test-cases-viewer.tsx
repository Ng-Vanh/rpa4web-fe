"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Play, Eye, EyeOff, Copy, Download, Edit3, Save, X, Trash2, Loader2, Check, Plus, Split, FileText } from "lucide-react"
import { generateTestCases, createTestCaseWithSteps, getTestCasesWithSteps, updateTestCase, deleteTestCase } from "@/service/testcase"
import { updateTestCaseStep, deleteTestCaseStep, createNewTestCaseStep } from "@/service/testcase-step"
import { getAuthHeaders } from "@/service/auth-utils"
import { getSrsPreview } from "@/service/srs_document"
import { PDFViewerWithHighlight } from "@/components/pdf-viewer-with-highlight"

interface Scenario {
  UC_id: string
  S_id: string
  "Title": string
  Precondition: string
  Postcondition?: string
  Steps: string[]
  "Expected Result": string
  s_id: string
  id?: number // ID từ database để update
  caption_bbox?: {
    x0: number
    x1: number
    top: number
    bottom: number
    page: number
  }
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
  srsId?: number
}

function displayText(value: any, fallback = "-") {
  if (value === null || value === undefined) return fallback
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    try {
      const parsed = JSON.parse(trimmed)
      if (isPdfMetadata(parsed)) return fallback
      if (typeof parsed === "string") return parsed || fallback
      if (parsed && typeof parsed === "object") {
        return parsed.Title || parsed.title || parsed.name || fallback
      }
    } catch {
      return trimmed
    }
    return trimmed
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map((item) => displayText(item, "")).filter(Boolean).join(", ") || fallback
  if (typeof value === "object") {
    if (isPdfMetadata(value)) return fallback
    return value.Title || value.title || value.name || fallback
  }
  return fallback
}

function displaySteps(value: any) {
  if (!Array.isArray(value)) return []
  return value
    .map((step) => displayText(step, ""))
    .filter(Boolean)
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

export function TestCasesViewer({ data, onBack, srsId }: TestCasesViewerProps) {
  const [showTestData, setShowTestData] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 })
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set())
  const [editingScenario, setEditingScenario] = useState<number | null>(null)
  const [editedScenarios, setEditedScenarios] = useState<Record<number, Scenario>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [scenariosState, setScenariosState] = useState<Scenario[]>(data.scenarios || [])
  const [generatedTestCases, setGeneratedTestCases] = useState<Record<string, GeneratedTestCases>>({})
  const [isGeneratingTC, setIsGeneratingTC] = useState<string | null>(null)
  const [databaseTestCases, setDatabaseTestCases] = useState<Record<string, DatabaseTestCase[]>>({})
  const [isLoadingDatabaseTC, setIsLoadingDatabaseTC] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [isSavingGeneratedTC, setIsSavingGeneratedTC] = useState<string | null>(null)
  const [editingGeneratedTC, setEditingGeneratedTC] = useState<string | null>(null)
  const [editingDatabaseTC, setEditingDatabaseTC] = useState<number | null>(null)
  const [editedGeneratedTCs, setEditedGeneratedTCs] = useState<Record<string, GeneratedTestCase>>({})
  const [editedDatabaseTCs, setEditedDatabaseTCs] = useState<Record<number, DatabaseTestCase>>({})
  const [editedGeneratedSteps, setEditedGeneratedSteps] = useState<Record<string, any>>({})
  const [editedDatabaseSteps, setEditedDatabaseSteps] = useState<Record<string, any>>({})
  const [scenariosWithTestCases, setScenariosWithTestCases] = useState<Set<string>>(new Set())
  const [isSplitView, setIsSplitView] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [selectedUcId, setSelectedUcId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [ucIdMatchIndex, setUcIdMatchIndex] = useState<Record<string, number>>({}) // Track match index cho mỗi UC_id
  const [shouldScrollToPdf, setShouldScrollToPdf] = useState(false) // Flag để chỉ cho phép scroll khi click vào UC_id

  // Đồng bộ state khi props data thay đổi
  useEffect(() => {
    setScenariosState(data.scenarios || [])
  }, [data.scenarios])

  // Load PDF khi split view được bật
  useEffect(() => {
    if (isSplitView && srsId && !pdfUrl) {
      loadPdf()
    }
  }, [isSplitView, srsId])

  // Cleanup PDF URL khi component unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const loadPdf = async () => {
    if (!srsId) return
    
    setPdfLoading(true)
    try {
      // Revoke blob URL cũ nếu có để tránh memory leak
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
      
      // Fetch PDF từ API
      const blob = await getSrsPreview(srsId)
      
      // Kiểm tra blob hợp lệ
      if (!blob || blob.size === 0) {
        throw new Error("PDF blob rỗng hoặc không hợp lệ")
      }
      
      console.log("✅ PDF blob received, size:", blob.size, "bytes, type:", blob.type)
      
      // Tạo blob URL mới
      const url = URL.createObjectURL(blob)
      console.log("✅ Blob URL created:", url)
      
      setPdfUrl(url)
    } catch (error: any) {
      console.error("❌ Error loading PDF:", error)
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể tải PDF"
      console.error("PDF Error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: errorMessage
      })
      setPdfUrl(null)
      // Không alert ngay, để user thấy message trong UI
    } finally {
      setPdfLoading(false)
    }
  }

  const handleToggleSplitView = () => {
    setIsSplitView(!isSplitView)
    if (!isSplitView && srsId && !pdfUrl) {
      loadPdf()
    }
  }

  const handleUcIdClick = (ucId: string, event?: React.MouseEvent) => {
    // Chỉ cho phép click trực tiếp vào UC_id span
    if (event) {
      event.stopPropagation()
      // Kiểm tra xem click có phải từ UC_id span không
      const target = event.target as HTMLElement
      const ucIdElement = target.closest('[data-uc-id-click]')
      // Nếu không tìm thấy UC_id element, không cho phép
      if (!ucIdElement) {
        return
      }
    } else {
      // Nếu không có event, có nghĩa là không phải click trực tiếp vào UC_id
      // Không cho phép scroll
      return
    }
    
    // Cycle qua các matches của UC_id này
    const currentIndex = ucIdMatchIndex[ucId] || 0
    
    // Tăng index để scroll đến match tiếp theo
    // Index sẽ được reset về 0 khi vượt quá số lượng matches (xử lý trong PDF viewer)
    setUcIdMatchIndex(prev => ({
      ...prev,
      [ucId]: currentIndex + 1
    }))
    
    // Đánh dấu rằng đây là click hợp lệ vào UC_id, cho phép scroll
    // Set shouldScroll trước khi set selectedUcId để đảm bảo useEffect nhận được flag
    setShouldScrollToPdf(true)
    setSelectedUcId(ucId)
    
    // Reset flag sau khi scroll xong (tăng timeout để đảm bảo scroll hoàn tất)
    setTimeout(() => {
      setShouldScrollToPdf(false)
    }, 1000) // Tăng từ 100ms lên 1000ms để đảm bảo scroll xong
  }

  const handleScenarioClick = (scenarioId: number, fromQuickLink: boolean = false) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (scenario && scenario.UC_id) {
      if (fromQuickLink) {
        // Chỉ cho phép scroll khi click từ quick links
        const currentIndex = ucIdMatchIndex[scenario.UC_id] || 0
        setUcIdMatchIndex(prev => ({
          ...prev,
          [scenario.UC_id]: currentIndex + 1
        }))
        // Set shouldScroll trước khi set selectedUcId để đảm bảo useEffect nhận được flag
        setShouldScrollToPdf(true)
        setSelectedUcId(scenario.UC_id)
        setTimeout(() => {
          setShouldScrollToPdf(false)
        }, 1000) // Tăng từ 100ms lên 1000ms để đảm bảo scroll xong
      }
      // Scroll đến scenario trong danh sách
      const element = document.getElementById(`scenario-${scenarioId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleHighlightClick = (ucId: string) => {
    // Khi click vào highlight trong PDF, tìm scenario tương ứng và scroll đến
    const scenario = scenarios.find(s => s.UC_id === ucId)
    if (scenario && scenario.id) {
      setSelectedUcId(ucId)
      const element = document.getElementById(`scenario-${scenario.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }


  // Cleanup blob URL khi component unmount hoặc pdfUrl thay đổi
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
        console.log("🧹 Cleaned up blob URL:", pdfUrl)
      }
    }
  }, [pdfUrl])

  // Check scenarios có test case hay không khi scenarios thay đổi
  useEffect(() => {
    const checkAllScenarios = async () => {
      for (let i = 0; i < scenariosState.length; i++) {
        const scenario = scenariosState[i]
        if (scenario.id) {
          await checkScenarioHasTestCases(scenario.id)
        }
      }
    }
    
    if (scenariosState.length > 0) {
      checkAllScenarios()
    }
  }, [scenariosState])

  const toggleTestCase = (scenarioId: number) => {
    const newExpanded = new Set(expandedCases)
    const scenarioKey = String(scenarioId)
    if (newExpanded.has(scenarioKey)) {
      newExpanded.delete(scenarioKey)
    } else {
      newExpanded.add(scenarioKey)
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

  const generateAllTestCasesSequentially = async () => {
    if (isGeneratingAll) return // Prevent multiple calls
    
    setIsGeneratingAll(true)
    setGeneratingProgress({ current: 0, total: 0 })
    
    try {
      // Lấy danh sách scenarios có ID (đã lưu trong database)
      const scenariosWithId = scenarios.filter(scenario => scenario.id && scenario.id > 0)
      
      if (scenariosWithId.length === 0) {
        alert("Không có scenario nào để generate test cases!")
        return
      }
      
      setGeneratingProgress({ current: 0, total: scenariosWithId.length })
      
      // Lần lượt generate test cases cho từng scenario
      for (let i = 0; i < scenariosWithId.length; i++) {
        const scenario = scenariosWithId[i]
        if (scenario.id) {
          console.log(`Generating test cases for scenario ${i + 1}/${scenariosWithId.length}: ${scenario.Title}`)
          setGeneratingProgress({ current: i + 1, total: scenariosWithId.length })
          
          await handleGenerateTestCases(scenario.id)
          
          // Đợi một chút trước khi chuyển sang scenario tiếp theo
          if (i < scenariosWithId.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1 giây delay
          }
        }
      }
      
      console.log("All test cases generated successfully!")
      alert(`Đã generate test cases cho ${scenariosWithId.length} scenarios thành công!`)
      
    } catch (error) {
      console.error("Error generating all test cases:", error)
      alert("Có lỗi xảy ra khi generate test cases. Vui lòng thử lại.")
    } finally {
      setIsGeneratingAll(false)
      setGeneratingProgress({ current: 0, total: 0 })
    }
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
    const scenario = scenarios.find(s => s.id === scenarioId)
    const isNewScenario = scenario && scenario.id && scenario.id < 0
    
    if (isNewScenario) {
      // Nếu là scenario mới, xóa luôn khỏi danh sách
      setScenariosState(prev => prev.filter(s => s.id !== scenarioId))
    }
    
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
      // Kiểm tra nếu là scenario mới (ID âm)
      const isNewScenario = editedScenario.id < 0
      
      let response
      if (isNewScenario) {
        // Tạo scenario mới
        response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          } as HeadersInit,
          body: JSON.stringify({
            title: editedScenario.Title,
            description: JSON.stringify(editedScenario),
            webUrl: "",
            srsId: srsId // Cần srsId để liên kết scenario với SRS
          })
        })
      } else {
        // Cập nhật scenario hiện có
        response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/${editedScenario.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          } as HeadersInit,
          body: JSON.stringify({
            title: editedScenario.Title,
            description: JSON.stringify(editedScenario),
            webUrl: ""
          })
        })
      }

      if (response.ok) {
        const result = await response.json()
        console.log(isNewScenario ? "Scenario created successfully" : "Scenario updated successfully")
        
        setEditingScenario(null)
        setEditedScenarios(prev => {
          const newState = { ...prev }
          delete newState[scenarioId]
          return newState
        })
        
        if (isNewScenario) {
          // Cập nhật scenario mới với ID thật từ database
          const updatedScenario = { ...editedScenario, id: result.id }
          setScenariosState(prev => prev.map(s => s.id === scenarioId ? updatedScenario : s))
        } else {
          // Cập nhật state cục bộ với data đã edit
          setScenariosState(prev => prev.map(s => s.id === scenarioId ? editedScenario : s))
        }
        
        alert(isNewScenario ? "Đã tạo scenario mới thành công!" : "Đã cập nhật scenario thành công!")
      } else {
        console.error("Failed to save scenario:", response.statusText)
        alert("Có lỗi xảy ra khi lưu scenario. Vui lòng thử lại.")
      }
    } catch (error) {
      console.error("Error saving scenario:", error)
      alert("Có lỗi xảy ra khi lưu scenario. Vui lòng thử lại.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario || !scenario.id) return

    const scenarioKey = String(scenario.id)

    // Xác nhận trước khi xóa
    if (!confirm(`Bạn có chắc chắn muốn xóa scenario "${scenario.Title}" và tất cả test cases liên quan?`)) {
      return
    }

    setIsDeleting(scenarioId.toString())
    try {
      // Kiểm tra nếu là scenario mới (ID âm) - chưa lưu vào database
      const isNewScenario = scenario.id < 0
      
      if (isNewScenario) {
        // Chỉ xóa khỏi local state và dọn dẹp tất cả state liên quan
        setScenariosState(prev => prev.filter(s => s.id !== scenarioId))
        setEditingScenario(null)
        setEditedScenarios(prev => {
          const newState = { ...prev }
          delete newState[scenarioId]
          return newState
        })
        
        // Dọn dẹp tất cả state liên quan đến test cases
        setExpandedCases(prev => {
          const next = new Set(prev)
          next.delete(scenarioKey)
          return next
        })
        setGeneratedTestCases(prev => {
          const next = { ...prev }
          delete next[scenarioKey]
          return next
        })
        setDatabaseTestCases(prev => {
          const next = { ...prev }
          delete next[scenarioKey]
          return next
        })
        setScenariosWithTestCases(prev => {
          const next = new Set(prev)
          next.delete(scenarioKey)
          return next
        })
        setExpandedTestCases(prev => {
          const next = new Set(prev)
          // Xóa tất cả expanded test cases liên quan đến scenario này
          Array.from(prev).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              next.delete(key)
            }
          })
          return next
        })
        
        // Dọn dẹp các state edit liên quan
        setEditedGeneratedTCs(prev => {
          const newState = { ...prev }
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              delete newState[key]
            }
          })
          return newState
        })
        setEditedGeneratedSteps(prev => {
          const newState = { ...prev }
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              delete newState[key]
            }
          })
          return newState
        })
        
        // Dọn dẹp các state loading/editing liên quan
        if (isGeneratingTC === scenarioKey) {
          setIsGeneratingTC(null)
        }
        if (isLoadingDatabaseTC === scenarioKey) {
          setIsLoadingDatabaseTC(null)
        }
        if (editingGeneratedTC && editingGeneratedTC.startsWith(`${scenarioKey}-`)) {
          setEditingGeneratedTC(null)
        }
        if (isSavingGeneratedTC && isSavingGeneratedTC.startsWith(`${scenarioKey}-`)) {
          setIsSavingGeneratedTC(null)
        }
        
        alert("Đã xóa scenario thành công!")
        return
      }

      // Bước 1: Xóa tất cả test case steps trước
      const testCases = await getTestCasesWithSteps(scenario.id)
      for (const testCase of testCases) {
        if (testCase.steps && testCase.steps.length > 0) {
          for (const step of testCase.steps) {
            try {
              await deleteTestCaseStep(step.id)
            } catch (stepError) {
              console.error(`Error deleting step ${step.id}:`, stepError)
            }
          }
        }
      }

      // Bước 2: Xóa tất cả test cases
      for (const testCase of testCases) {
        try {
          await deleteTestCase(testCase.id)
        } catch (tcError) {
          console.error(`Error deleting test case ${testCase.id}:`, tcError)
        }
      }

      // Bước 3: Xóa scenario
      const authHeaders = getAuthHeaders()
      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_BACKEND_URL}/scenarios/${scenario.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        } as HeadersInit
      })

      if (response.ok) {
        console.log("Scenario and all related test cases deleted successfully")
        // Cập nhật danh sách cục bộ, không reload trang
        setScenariosState(prev => prev.filter(s => s.id !== scenarioId))
        
        // Dọn dẹp các state liên quan để tránh trùng/lưu vết trên UI
        setExpandedCases(prev => {
          const next = new Set(prev)
          next.delete(scenarioKey)
          return next
        })
        setGeneratedTestCases(prev => {
          const next = { ...prev }
          delete next[scenarioKey]
          return next
        })
        setDatabaseTestCases(prev => {
          const next = { ...prev }
          delete next[scenarioKey]
          return next
        })
        setScenariosWithTestCases(prev => {
          const next = new Set(prev)
          next.delete(scenarioKey)
          return next
        })
        setExpandedTestCases(prev => {
          const next = new Set(prev)
          // Xóa tất cả expanded test cases liên quan đến scenario này
          Array.from(prev).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              next.delete(key)
            }
          })
          return next
        })
        
        // Dọn dẹp các state edit liên quan
        setEditedGeneratedTCs(prev => {
          const newState = { ...prev }
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              delete newState[key]
            }
          })
          return newState
        })
        setEditedGeneratedSteps(prev => {
          const newState = { ...prev }
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${scenarioKey}-`)) {
              delete newState[key]
            }
          })
          return newState
        })
        
        // Dọn dẹp các state loading/editing liên quan
        if (isGeneratingTC === scenarioKey) {
          setIsGeneratingTC(null)
        }
        if (isLoadingDatabaseTC === scenarioKey) {
          setIsLoadingDatabaseTC(null)
        }
        if (editingGeneratedTC && editingGeneratedTC.startsWith(`${scenarioKey}-`)) {
          setEditingGeneratedTC(null)
        }
        if (isSavingGeneratedTC && isSavingGeneratedTC.startsWith(`${scenarioKey}-`)) {
          setIsSavingGeneratedTC(null)
        }
        
        // Dọn dẹp database test cases state nếu có
        const currentDatabaseTCs = databaseTestCases[scenarioKey]
        if (currentDatabaseTCs) {
          currentDatabaseTCs.forEach(tc => {
            setEditedDatabaseTCs(prev => {
              const newState = { ...prev }
              delete newState[tc.id]
              return newState
            })
            setEditedDatabaseSteps(prev => {
              const newState = { ...prev }
              Object.keys(newState).forEach(key => {
                if (key.startsWith(`${tc.id}-`)) {
                  delete newState[key]
                }
              })
              return newState
            })
            if (editingDatabaseTC === tc.id) {
              setEditingDatabaseTC(null)
            }
          })
        }
        
        // Nếu đang edit item vừa bị xóa, thoát edit mode
        if (editingScenario === scenarioId) {
          setEditingScenario(null)
        }
        alert("Đã xóa scenario và tất cả test cases liên quan thành công!")
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
    if (!scenario || !scenario.id) return

    const scenarioKey = String(scenario.id) // Sử dụng scenario.id làm key
    setIsGeneratingTC(scenarioKey)
    try {
      await generateTestCases(scenario)
      await loadDatabaseTestCases(scenario.id)
      setScenariosWithTestCases(prev => {
        const next = new Set(prev)
        next.add(scenarioKey)
        return next
      })
    } catch (error) {
      console.error("Error generating test cases:", error)
      alert("Có lỗi xảy ra khi tạo test cases. Vui lòng thử lại.")
    } finally {
      setIsGeneratingTC(null)
    }
  }


  const checkScenarioHasTestCases = async (scenarioId: number) => {
    if (!scenarioId) return false

    try {
      const scenario = scenarios.find(s => s.id === scenarioId)
      if (!scenario || !scenario.id) {
        return false
      }

      const testCases = await getTestCasesWithSteps(scenario.id)
      const hasTestCases = testCases && testCases.length > 0
      const scenarioKey = String(scenario.id)
      
      setScenariosWithTestCases(prev => {
        const newSet = new Set(prev)
        if (hasTestCases) {
          newSet.add(scenarioKey)
        } else {
          newSet.delete(scenarioKey)
        }
        return newSet
      })

      return hasTestCases
    } catch (error) {
      console.error("Error checking scenario test cases:", error)
      return false
    }
  }

  const loadDatabaseTestCases = async (scenarioId: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario || !scenario.id) return

    const scenarioKey = String(scenario.id)
    setIsLoadingDatabaseTC(scenarioKey)
    try {
      const testCases = await getTestCasesWithSteps(scenario.id)
      setDatabaseTestCases(prev => ({
        ...prev,
        [scenarioKey]: testCases
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

  const toggleGeneratedTestCaseExpansion = (tcId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(tcId)) {
      newExpanded.delete(tcId)
    } else {
      newExpanded.add(tcId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleEditGeneratedTestCase = (scenarioId: number, tcIndex: number) => {
    const scenarioKey = String(scenarioId)
    const generatedData = generatedTestCases[scenarioKey]
    if (!generatedData || !generatedData.test_cases[tcIndex]) return

    const testCase = generatedData.test_cases[tcIndex]
    const editKey = `${scenarioKey}-${tcIndex}`
    
    setEditingGeneratedTC(editKey)
    setEditedGeneratedTCs(prev => ({
      ...prev,
      [editKey]: { ...testCase }
    }))

    // Initialize all steps in edit mode
    const stepsEditData: Record<string, any> = {}
    testCase.steps.forEach((step, stepIndex) => {
      const stepKey = `${scenarioKey}-${tcIndex}-${stepIndex}`
      stepsEditData[stepKey] = { ...step }
    })
    setEditedGeneratedSteps(prev => ({
      ...prev,
      ...stepsEditData
    }))
  }

  const handleCancelEditGeneratedTC = (editKey: string) => {
    setEditingGeneratedTC(null)
    setEditedGeneratedTCs(prev => {
      const newState = { ...prev }
      delete newState[editKey]
      return newState
    })

    // Clear all steps edit data for this test case
    setEditedGeneratedSteps(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        if (key.startsWith(editKey)) {
          delete newState[key]
        }
      })
      return newState
    })
  }

  const handleSaveEditGeneratedTC = (scenarioId: number, tcIndex: number) => {
    const scenarioKey = String(scenarioId)
    const editKey = `${scenarioKey}-${tcIndex}`
    const editedTC = editedGeneratedTCs[editKey]
    if (!editedTC) return

    setGeneratedTestCases(prev => {
      const current = prev[scenarioKey]
      if (!current) return prev

      const newTestCases = [...current.test_cases]
      const updatedSteps = newTestCases[tcIndex].steps.map((step, stepIndex) => {
        const stepKey = `${scenarioKey}-${tcIndex}-${stepIndex}`
        return editedGeneratedSteps[stepKey] || step
      })
      
      newTestCases[tcIndex] = {
        ...editedTC,
        steps: updatedSteps
      }

      return {
        ...prev,
        [scenarioKey]: {
          ...current,
          test_cases: newTestCases
        }
      }
    })

    setEditingGeneratedTC(null)
    setEditedGeneratedTCs(prev => {
      const newState = { ...prev }
      delete newState[editKey]
      return newState
    })

    // Clear all steps edit data for this test case
    setEditedGeneratedSteps(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        if (key.startsWith(editKey)) {
          delete newState[key]
        }
      })
      return newState
    })
  }

  const handleFieldChangeGeneratedTC = (editKey: string, field: keyof GeneratedTestCase, value: any) => {
    setEditedGeneratedTCs(prev => ({
      ...prev,
      [editKey]: {
        ...prev[editKey],
        [field]: value
      }
    }))
  }

  const handleEditDatabaseTestCase = (tcId: number) => {
    // Tìm test case trong tất cả scenarios
    let foundTC: DatabaseTestCase | null = null
    for (const sId in databaseTestCases) {
      const tc = databaseTestCases[sId].find(tc => tc.id === tcId)
      if (tc) {
        foundTC = tc
        break
      }
    }
    
    if (!foundTC) return

    setEditingDatabaseTC(tcId)
    setEditedDatabaseTCs(prev => ({
      ...prev,
      [tcId]: { ...foundTC }
    }))

    // Initialize all steps in edit mode
    const stepsEditData: Record<string, any> = {}
    if (foundTC.steps) {
      foundTC.steps.forEach((step, stepIndex) => {
        const stepKey = `${tcId}-${stepIndex}`
        stepsEditData[stepKey] = { ...step }
      })
    }
    setEditedDatabaseSteps(prev => ({
      ...prev,
      ...stepsEditData
    }))
  }

  const handleCancelEditDatabaseTC = (tcId: number) => {
    setEditingDatabaseTC(null)
    setEditedDatabaseTCs(prev => {
      const newState = { ...prev }
      delete newState[tcId]
      return newState
    })

    // Clear all steps edit data for this test case
    setEditedDatabaseSteps(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        if (key.startsWith(`${tcId}-`)) {
          delete newState[key]
        }
      })
      return newState
    })
  }

  const handleSaveEditDatabaseTC = async (tcId: number) => {
    const editedTC = editedDatabaseTCs[tcId]
    if (!editedTC) return

    try {
      // Update test case
      await updateTestCase(tcId, {
        testItem: editedTC.testItem,
        testClassification: editedTC.testClassification,
        runConfig: editedTC.runConfig
      })

                try {
                  // Update existing steps and create new steps
                  const stepUpdatePromises: Promise<any>[] = []
                  const stepCreatePromises: Promise<any>[] = []
                  
                  Object.keys(editedDatabaseSteps).forEach(stepKey => {
                    if (stepKey.startsWith(`${tcId}-`)) {
                      const editedStep = editedDatabaseSteps[stepKey]
                      if (editedStep) {
                        if (editedStep.id) {
                          // Update existing step
                          stepUpdatePromises.push(
                            updateTestCaseStep(editedStep.id, {
                              stepOrder: editedStep.stepOrder,
                              actionDescription: editedStep.actionDescription,
                              inputData: editedStep.inputData,
                              expectedOutput: editedStep.expectedOutput,
                              scriptCode: editedStep.scriptCode || ""
                            })
                          )
                        } else if (editedStep.isNew) {
                          // Create new step
                          stepCreatePromises.push(
                            createNewTestCaseStep({
                              testCaseId: tcId,
                              stepOrder: editedStep.stepOrder,
                              actionDescription: editedStep.actionDescription,
                              inputData: editedStep.inputData,
                              expectedOutput: editedStep.expectedOutput,
                              scriptCode: editedStep.scriptCode || ""
                            })
                          )
                        }
                      }
                    }
                  })

                  // Wait for all step operations to complete
                  if (stepUpdatePromises.length > 0) {
                    await Promise.all(stepUpdatePromises)
                  }
                  if (stepCreatePromises.length > 0) {
                    await Promise.all(stepCreatePromises)
                  }

        // Update local state with all changes
        setDatabaseTestCases(prev => {
          const newState = { ...prev }
          for (const sId in newState) {
            const index = newState[sId].findIndex(tc => tc.id === tcId)
            if (index !== -1) {
              // Update test case
              const updatedTC = { ...editedTC }
              
              // Update steps with edited data
              if (updatedTC.steps) {
                updatedTC.steps = updatedTC.steps.map((step, stepIndex) => {
                  const stepKey = `${tcId}-${stepIndex}`
                  return editedDatabaseSteps[stepKey] || step
                })
              }
              
              newState[sId][index] = updatedTC
              break
            }
          }
          return newState
        })

        setEditingDatabaseTC(null)
        setEditedDatabaseTCs(prev => {
          const newState = { ...prev }
          delete newState[tcId]
          return newState
        })

        // Clear all steps edit data for this test case
        setEditedDatabaseSteps(prev => {
          const newState = { ...prev }
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${tcId}-`)) {
              delete newState[key]
            }
          })
          return newState
        })

                  // Reload test cases để hiển thị steps mới
                  let foundScenarioId: number | null = null
                  for (const sId in databaseTestCases) {
                    const tc = databaseTestCases[sId].find(tc => tc.id === tcId)
                    if (tc) {
                      foundScenarioId = parseInt(sId)
                      break
                    }
                  }
                  if (foundScenarioId) {
                    await loadDatabaseTestCases(foundScenarioId)
                  }
                  
                  alert("Đã cập nhật test case và tất cả steps thành công!")
                } catch (stepError) {
                  console.error("Error updating steps:", stepError)
                  alert(`Có lỗi xảy ra khi cập nhật steps: ${stepError}`)
                }
    } catch (error) {
      console.error("Error updating database test case:", error)
      alert(`Có lỗi xảy ra khi cập nhật test case: ${error}`)
    }
  }

  const handleFieldChangeDatabaseTC = (tcId: number, field: keyof DatabaseTestCase, value: any) => {
    setEditedDatabaseTCs(prev => ({
      ...prev,
      [tcId]: {
        ...prev[tcId],
        [field]: value
      }
    }))
  }


  const handleFieldChangeGeneratedStep = (stepKey: string, field: string, value: any) => {
    setEditedGeneratedSteps(prev => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [field]: value
      }
    }))
  }


  const handleFieldChangeDatabaseStep = (stepKey: string, field: string, value: any) => {
    setEditedDatabaseSteps(prev => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [field]: value
      }
    }))
  }

  const handleDeleteDatabaseTestCase = async (tcId: number) => {
    // Tìm test case trong tất cả scenarios
    let foundTC: DatabaseTestCase | null = null
    let foundSId: string | null = null
    for (const sId in databaseTestCases) {
      const tc = databaseTestCases[sId].find(tc => tc.id === tcId)
      if (tc) {
        foundTC = tc
        foundSId = sId
        break
      }
    }
    
    if (!foundTC || !foundSId) return

    // Xác nhận trước khi xóa
    if (!confirm(`Bạn có chắc chắn muốn xóa test case "${foundTC.testItem}"?`)) {
      return
    }

    try {
      // Bước 1: Xóa tất cả test case steps trước
      if (foundTC.steps && foundTC.steps.length > 0) {
        for (const step of foundTC.steps) {
          try {
            await deleteTestCaseStep(step.id)
          } catch (stepError) {
            console.error(`Error deleting step ${step.id}:`, stepError)
          }
        }
      }

      // Bước 2: Xóa test case
      await deleteTestCase(tcId)

      // Bước 3: Cập nhật local state
      setDatabaseTestCases(prev => {
        const newState = { ...prev }
        if (newState[foundSId!]) {
          newState[foundSId!] = newState[foundSId!].filter(tc => tc.id !== tcId)
          // Nếu không còn test case nào, xóa luôn entry
          if (newState[foundSId!].length === 0) {
            delete newState[foundSId!]
          }
        }
        return newState
      })

      // Bước 4: Cập nhật scenariosWithTestCases state
      setScenariosWithTestCases(prev => {
        const newSet = new Set(prev)
        const remainingTestCases = databaseTestCases[foundSId!]?.filter(tc => tc.id !== tcId)
        if (!remainingTestCases || remainingTestCases.length === 0) {
          newSet.delete(foundSId!)
        }
        return newSet
      })

      alert("Đã xóa test case và tất cả steps liên quan thành công!")
    } catch (error) {
      console.error("Error deleting database test case:", error)
      alert("Có lỗi xảy ra khi xóa test case. Vui lòng thử lại.")
    }
  }

  const handleAddDatabaseStep = (tcId: number) => {
    setEditedDatabaseSteps(prev => {
      const newState = { ...prev }
      
      // Tìm test case để lấy số steps hiện có
      let foundTC: DatabaseTestCase | null = null
      for (const sId in databaseTestCases) {
        const tc = databaseTestCases[sId].find(tc => tc.id === tcId)
        if (tc) {
          foundTC = tc
          break
        }
      }
      
      if (!foundTC) return prev
      
      // Đếm số steps hiện có trong editedDatabaseSteps
      const currentStepsCount = Object.keys(newState).filter(key => 
        key.startsWith(`${tcId}-`)
      ).length
      
      const newStepKey = `${tcId}-${currentStepsCount}` // Sử dụng index tiếp theo
      
      newState[newStepKey] = {
        stepOrder: currentStepsCount + 1,
        actionDescription: "New step", // Đặt giá trị mặc định để tránh validation error
        inputData: "",
        expectedOutput: "",
        scriptCode: "",
        isNew: true // Đánh dấu là step mới
      }
      
      
      return newState
    })
  }

  const getCurrentStepsForTestCase = (tcId: number) => {
    // Tìm test case
    let foundTC: DatabaseTestCase | null = null
    for (const sId in databaseTestCases) {
      const tc = databaseTestCases[sId].find(tc => tc.id === tcId)
      if (tc) {
        foundTC = tc
        break
      }
    }
    
    if (!foundTC || !foundTC.steps) return []
    
    // Kiểm tra xem có đang edit test case này không
    const isEditing = editingDatabaseTC === tcId
    
    if (!isEditing) {
      // Nếu không đang edit, hiển thị tất cả steps từ database
      return foundTC.steps
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step, index) => ({ 
          ...step, 
          stepKey: `${tcId}-${index}`,
          isNew: false 
        }))
    }
    
    // Nếu đang edit, áp dụng logic xóa/thêm
    // Lấy tất cả steps từ editedDatabaseSteps (bao gồm cả existing và new)
    const allEditedSteps = Object.keys(editedDatabaseSteps)
      .filter(key => key.startsWith(`${tcId}-`))
      .map(key => ({ ...editedDatabaseSteps[key], stepKey: key }))
      .sort((a, b) => a.stepOrder - b.stepOrder)
    
    return allEditedSteps
  }

  const handleRemoveDatabaseStep = async (tcId: number, stepKey: string) => {
    // Tìm step trong editedDatabaseSteps
    const editedStep = editedDatabaseSteps[stepKey]
    
    if (editedStep && editedStep.id) {
      // Nếu là step đã lưu trong database, xóa từ database
      try {
        await deleteTestCaseStep(editedStep.id)
        console.log(`Deleted step ${editedStep.id} from database`)
      } catch (error) {
        console.error(`Error deleting step ${editedStep.id}:`, error)
        alert("Có lỗi xảy ra khi xóa step. Vui lòng thử lại.")
        return
      }
    }
    
    // Xóa khỏi local state
    setEditedDatabaseSteps(prev => {
      const newState = { ...prev }
      delete newState[stepKey]
      
      // Cập nhật lại stepOrder cho các steps còn lại
      // Lấy tất cả steps còn lại và sắp xếp theo stepOrder hiện tại
      const remainingSteps = Object.keys(newState)
        .filter(key => key.startsWith(`${tcId}-`))
        .map(key => ({ key, step: newState[key] }))
        .sort((a, b) => a.step.stepOrder - b.step.stepOrder)
      
      // Cập nhật stepOrder từ 1 và cập nhật stepKey mới
      const updatedSteps: Record<string, any> = {}
      remainingSteps.forEach((item, index) => {
        const newStepKey = `${tcId}-${index}`
        updatedSteps[newStepKey] = {
          ...item.step,
          stepOrder: index + 1
        }
      })
      
      // Xóa tất cả steps cũ và thêm steps mới
      Object.keys(newState).forEach(key => {
        if (key.startsWith(`${tcId}-`)) {
          delete newState[key]
        }
      })
      
      // Thêm steps đã cập nhật
      Object.assign(newState, updatedSteps)
      
      return newState
    })
  }

  const handleDeleteGeneratedTestCase = (scenarioId: number, tcIndex: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa test case này?")) {
      return
    }

    const scenarioKey = String(scenarioId)
    setGeneratedTestCases(prev => {
      const current = prev[scenarioKey]
      if (!current) return prev

      const newTestCases = current.test_cases.filter((_, index) => index !== tcIndex)
      
      if (newTestCases.length === 0) {
        // Nếu không còn test case nào, xóa luôn entry
        const newState = { ...prev }
        delete newState[scenarioKey]
        return newState
      }

      return {
        ...prev,
        [scenarioKey]: {
          ...current,
          test_cases: newTestCases
        }
      }
    })
  }

  const handleSaveGeneratedTestCaseToDB = async (scenarioId: number, tcIndex: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario || !scenario.id) return

    const scenarioKey = String(scenario.id)
    const generatedData = generatedTestCases[scenarioKey]
    if (!generatedData || !generatedData.test_cases[tcIndex]) return

    const testCase = generatedData.test_cases[tcIndex]
    const loadingKey = `${scenarioKey}-${tcIndex}`

    setIsSavingGeneratedTC(loadingKey)
    try {
      // Lưu test case vào database
      await createTestCaseWithSteps(scenario.id, [testCase])
      
      // Load lại database test cases để hiển thị
      await loadDatabaseTestCases(scenario.id)
      
      // Update scenarios with test cases
      setScenariosWithTestCases(prev => new Set(prev).add(scenarioKey))
      
      // Xóa test case khỏi generated list
      setGeneratedTestCases(prev => {
        const current = prev[scenarioKey]
        if (!current) return prev

        const newTestCases = current.test_cases.filter((_, index) => index !== tcIndex)
        
        if (newTestCases.length === 0) {
          // Nếu không còn test case nào, xóa luôn entry
          const newState = { ...prev }
          delete newState[scenarioKey]
          return newState
        }

        return {
          ...prev,
          [scenarioKey]: {
            ...current,
            test_cases: newTestCases
          }
        }
      })

      alert("Đã lưu test case vào database thành công!")
    } catch (error) {
      console.error("Error saving generated test case to database:", error)
      alert("Có lỗi xảy ra khi lưu test case. Vui lòng thử lại.")
    } finally {
      setIsSavingGeneratedTC(null)
    }
  }

  const handleAddScenario = () => {
    // Tạo scenario mới với ID tạm thời
    const newScenario: Scenario = {
      UC_id: "UC_NEW",
      S_id: "NEW", // Đơn giản hóa
      "Title": "New Scenario",
      Precondition: "Enter precondition here...",
      Postcondition: "Enter postcondition here...",
      Steps: ["Step 1: Enter action here..."],
      "Expected Result": "Enter expected result here...",
      s_id: "NEW", // Đơn giản hóa
      id: -Date.now() // ID tạm thời (số âm để phân biệt)
    }

    // Thêm vào state và tự động edit
    setScenariosState(prev => [...prev, newScenario])
    setEditingScenario(newScenario.id!)
    
    // Khởi tạo edited scenario
    setEditedScenarios(prev => ({
      ...prev,
      [newScenario.id!]: { ...newScenario }
    }))
  }

  const scenarios = scenariosState

  // Lấy danh sách tất cả UC_id để highlight (deprecated - dùng bboxes thay thế)
  // Sử dụng useMemo để tránh tạo array mới mỗi lần render, chỉ tạo lại khi scenarios thay đổi
  const allUcIds = useMemo(() => {
    return Array.from(new Set(scenarios.map(s => s.UC_id).filter(Boolean)))
  }, [scenarios])

  // Lấy danh sách UC_id với bbox để highlight
  // Sử dụng useMemo để tránh tạo array mới mỗi lần render, chỉ tạo lại khi scenarios thay đổi
  const bboxes = useMemo(() => {
    return scenarios
      .filter(s => s.UC_id && s.caption_bbox)
      .map(s => ({
        ucId: s.UC_id,
        bbox: s.caption_bbox!,
      }))
  }, [scenarios])

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <nav className="border-b bg-card flex-shrink-0">
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
              variant={isSplitView ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSplitView}
              className={isSplitView ? "bg-blue-600 text-white" : ""}
            >
              <Split className="h-4 w-4 mr-2" />
              {isSplitView ? "Single View" : "Split View"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAllTestCasesSequentially}
              disabled={isGeneratingAll}
              className="bg-blue-50 border-blue-200"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generatingProgress.total > 0 
                    ? `Generating ${generatingProgress.current}/${generatingProgress.total}...`
                    : "Generating All TCs..."
                  }
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
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

      <div className={`flex-1 flex ${isSplitView ? 'flex-row' : 'flex-col'} overflow-hidden min-h-0`}>
        {/* Left side - Scenarios - Independent Scrollable Pane */}
        <div className={`${isSplitView ? 'w-1/2' : 'w-full'} h-full overflow-y-auto overscroll-contain ${isSplitView ? 'border-r' : ''} bg-white`}>
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
            const isExpanded = scenario.id ? expandedCases.has(String(scenario.id)) : false
            const isEditing = editingScenario === scenario.id
            const editedScenario = scenario.id ? editedScenarios[scenario.id] || scenario : scenario
            
            return (
              <Card 
                key={scenario.id ?? scenario.S_id} 
                id={`scenario-${scenario.id}`}
                className={`hover:shadow-md transition-shadow ${selectedUcId === scenario.UC_id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardContent className="p-6">
                  {/* Header với S_id: Title (UC_id: "") */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {isEditing ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-blue-600">{index + 1}.</span>
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
                            <span className="font-mono text-blue-600">{index + 1}.</span> {displayText(scenario["Title"], `Scenario ${index + 1}`)} 
                            <span 
                              data-uc-id-click="true"
                              className={`text-sm ml-2 cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 rounded ${
                                selectedUcId === scenario.UC_id 
                                  ? 'text-blue-600 font-bold bg-blue-50 ring-2 ring-blue-300' 
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (scenario.UC_id) {
                                  handleUcIdClick(scenario.UC_id, e)
                                }
                              }}
                              title="Click để scroll đến phần khớp trong PDF (click nhiều lần để xem các match khác)"
                            >
                              ({scenario.UC_id})
                            </span>
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSave(scenario.id!)
                            }}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEdit(scenario.id!)
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(scenario.id!)
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(scenario.id!)
                            }}
                            disabled={isDeleting === String(scenario.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {isDeleting === String(scenario.id) ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateTestCases(scenario.id!)
                            }}
                            disabled={isGeneratingTC === String(scenario.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {isGeneratingTC === String(scenario.id) ? (
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
                        <span className="text-gray-600">{displayText(scenario.Precondition)}</span>
                      )}
                    </div>
                  </div>

                  {/* Postcondition */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Postcondition:</span>
                      {isEditing ? (
                        <Textarea
                          value={editedScenario.Postcondition ?? ""}
                          onChange={(e) => handleFieldChange(scenario.id!, "Postcondition", e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                      ) : (
                        <span className="text-gray-600">{displayText(scenario.Postcondition)}</span>
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveStep(scenario.id!, stepIndex)
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddStep(scenario.id!)
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              + Add Step
                            </Button>
                          </div>
                        ) : (
                          displaySteps(scenario.Steps).length > 0 ? (
                          <ol className="list-decimal list-inside space-y-1">
                            {displaySteps(scenario.Steps).map((step, stepIndex) => {
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
                          ) : (
                            <span className="text-gray-500">-</span>
                          )
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
                        <span className="text-gray-600">{displayText(scenario["Expected Result"])}</span>
                      )}
                    </div>
                  </div>

                  {/* Generated Test Cases */}
                  {scenario.id && generatedTestCases[String(scenario.id)] && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Generated TCs:</span>
                        <div className="flex-1">
                          <div className="space-y-3">
                            {generatedTestCases[String(scenario.id)].test_cases.map((testCase, tcIndex) => {
                              const editKey = `${scenario.id}-${tcIndex}`
                              const isEditing = editingGeneratedTC === editKey
                              const editedTC = editedGeneratedTCs[editKey] || testCase
                              
                              return (
                              <Card key={`generated-${tcIndex}`} className="border-l-4 border-l-orange-500">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                                {isEditing ? (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-mono text-gray-500">{tcIndex + 1}.</span>
                                                        <Textarea
                                                            value={editedTC.test_item}
                                                            onChange={(e) => handleFieldChangeGeneratedTC(editKey, 'test_item', e.target.value)}
                                                            className="flex-1 min-h-[40px] resize-none"
                                                            placeholder="Test item..."
                                                            rows={1}
                                                        />
                                                    </div>
                                                ) : (
                                                    <h4 className="font-semibold text-gray-900">
                                                        {tcIndex + 1}. {testCase.test_item}
                                                    </h4>
                                                )}
                                                {isEditing ? (
                                                    <Input
                                                        value={editedTC.test_classification}
                                                        onChange={(e) => handleFieldChangeGeneratedTC(editKey, 'test_classification', e.target.value)}
                                                        className="px-2 py-1 border rounded text-sm w-32"
                                                        placeholder="Classification..."
                                                    />
                                                ) : (
                                                    <Badge 
                                                        variant={testCase.test_classification === 'Positive' ? 'default' : 'secondary'}
                                                        className={testCase.test_classification === 'Positive' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                                                    >
                                                        {testCase.test_classification}
                                                    </Badge>
                                                )}
                                    </div>
                                    <div className="flex space-x-2">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSaveEditGeneratedTC(scenario.id!, tcIndex)
                                            }}
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCancelEditGeneratedTC(editKey)
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSaveGeneratedTestCaseToDB(scenario.id!, tcIndex)
                                            }}
                                            disabled={isSavingGeneratedTC === `${scenario.id}-${tcIndex}`}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            {isSavingGeneratedTC === `${scenario.id}-${tcIndex}` ? (
                                              <>
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Saving...
                                              </>
                                            ) : (
                                              <>
                                                <Check className="h-3 w-3 mr-1" />
                                                Save
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteGeneratedTestCase(scenario.id!, tcIndex)
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleGeneratedTestCaseExpansion(`${scenario.id}-generated-${tcIndex}`)
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {expandedTestCases.has(`${scenario.id}-generated-${tcIndex}`) ? 'Collapse' : 'Expand'}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {expandedTestCases.has(`${scenario.id}-generated-${tcIndex}`) && (
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-600 mb-3">
                                        <strong>Steps ({testCase.steps.length}):</strong>
                                      </div>
                                      {testCase.steps
                                        .sort((a, b) => a.step_order - b.step_order)
                                        .map((step, stepIndex) => {
                                          const stepKey = `${scenario.S_id}-${tcIndex}-${stepIndex}`
                                          const isEditingStep = isEditing
                                          const editedStep = editedGeneratedSteps[stepKey] || step
                                          
                                          return (
                                          <div key={stepIndex} className="bg-white p-3 rounded border">
                                            <div className="flex items-start space-x-3">
                                              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                                {isEditingStep ? (
                                                  <Input
                                                    value={editedStep.step_order}
                                                    onChange={(e) => handleFieldChangeGeneratedStep(stepKey, 'step_order', parseInt(e.target.value) || 1)}
                                                    className="w-8 h-6 text-center text-xs p-0 border-0 bg-transparent"
                                                    type="number"
                                                    min="1"
                                                  />
                                                ) : (
                                                  step.step_order
                                                )}
                                              </div>
                                              <div className="flex-1 space-y-2">
                                                <div>
                                                  <span className="font-medium text-gray-900">Action: </span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.action_description}
                                                      onChange={(e) => handleFieldChangeGeneratedStep(stepKey, 'action_description', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Action description..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <span className="text-gray-700">{step.action_description}</span>
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Input Data: </span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={typeof editedStep.input_data === 'string' ? editedStep.input_data : JSON.stringify(editedStep.input_data)}
                                                      onChange={(e) => {
                                                        try {
                                                          const parsed = JSON.parse(e.target.value)
                                                          handleFieldChangeGeneratedStep(stepKey, 'input_data', parsed)
                                                        } catch {
                                                          handleFieldChangeGeneratedStep(stepKey, 'input_data', e.target.value)
                                                        }
                                                      }}
                                                      className="mt-1 text-sm"
                                                      placeholder="Input data (JSON format)..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    step.input_data && Object.keys(step.input_data).length > 0 ? (
                                                      <span className="text-gray-700 text-sm bg-gray-50 p-2 rounded">
                                                        {JSON.stringify(step.input_data)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-500 text-sm italic">No input data</span>
                                                    )
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Expected Output: </span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.expected_output}
                                                      onChange={(e) => handleFieldChangeGeneratedStep(stepKey, 'expected_output', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Expected output..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <span className="text-gray-700">{step.expected_output}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          )
                                        })}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Database Test Cases */}
                  {scenario.id && databaseTestCases[String(scenario.id)] && databaseTestCases[String(scenario.id)].length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Saved TCs:</span>
                        <div className="flex-1">
                          <div className="space-y-3">
                            {databaseTestCases[String(scenario.id)].map((testCase, tcIndex) => {
                              const isEditing = editingDatabaseTC === testCase.id
                              const editedTC = editedDatabaseTCs[testCase.id] || testCase
                              
                              return (
                              <Card key={testCase.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                            {isEditing ? (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-mono text-gray-500">{tcIndex + 1}.</span>
                                                    <Textarea
                                                        value={editedTC.testItem}
                                                        onChange={(e) => handleFieldChangeDatabaseTC(testCase.id, 'testItem', e.target.value)}
                                                        className="flex-1 min-h-[40px] resize-none"
                                                        placeholder="Test item..."
                                                        rows={1}
                                                    />
                                                </div>
                                            ) : (
                                                <h4 className="font-semibold text-gray-900">
                                                    {tcIndex + 1}. {testCase.testItem}
                                                </h4>
                                            )}
                                            {isEditing ? (
                                                <Input
                                                    value={editedTC.testClassification}
                                                    onChange={(e) => handleFieldChangeDatabaseTC(testCase.id, 'testClassification', e.target.value)}
                                                    className="px-2 py-1 border rounded text-sm w-32"
                                                    placeholder="Classification..."
                                                />
                                            ) : (
                                                <Badge 
                                                    variant={testCase.testClassification === 'Positive' ? 'default' : 'secondary'}
                                                    className={testCase.testClassification === 'Positive' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                                                >
                                                    {testCase.testClassification}
                                                </Badge>
                                            )}
                                    </div>
                                    <div className="flex space-x-2">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSaveEditDatabaseTC(testCase.id)
                                            }}
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCancelEditDatabaseTC(testCase.id)
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleEditDatabaseTestCase(testCase.id)
                                            }}
                                            className="text-blue-600 hover:text-blue-700"
                                          >
                                            <Edit3 className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteDatabaseTestCase(testCase.id)
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleTestCaseExpansion(`${scenario.id}-${testCase.id}`)
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {expandedTestCases.has(`${scenario.id}-${testCase.id}`) ? 'Collapse' : 'Expand'}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {expandedTestCases.has(`${scenario.id}-${testCase.id}`) && (
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-600 mb-3">
                                        <strong>Steps ({getCurrentStepsForTestCase(testCase.id).length}):</strong>
                                      </div>
                                      {getCurrentStepsForTestCase(testCase.id).length === 0 ? (
                                        <div className="text-gray-500 text-sm italic p-4 text-center">
                                          No steps found for this test case
                                        </div>
                                      ) : (
                                        getCurrentStepsForTestCase(testCase.id).map((step) => {
                                          const isEditingStep = isEditing
                                          const editedStep = editedDatabaseSteps[step.stepKey] || step
                                          
                                          return (
                                          <div key={step.id || step.stepKey} className="bg-white p-3 rounded border">
                                            <div className="flex items-start space-x-3">
                                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                                {isEditingStep ? (
                                                  <Input
                                                    value={editedStep.stepOrder}
                                                    onChange={(e) => handleFieldChangeDatabaseStep(step.stepKey, 'stepOrder', parseInt(e.target.value) || 1)}
                                                    className="w-8 h-6 text-center text-xs p-0 border-0 bg-transparent"
                                                    type="number"
                                                    min="1"
                                                  />
                                                ) : (
                                                  step.stepOrder
                                                )}
                                              </div>
                                              <div className="flex-1 space-y-2">
                                                <div>
                                                  <span className="font-medium text-gray-900">Action: </span>
                                                  {isEditingStep ? (
                                                    <div className="flex items-start space-x-2">
                                                      <Textarea
                                                        value={editedStep.actionDescription}
                                                        onChange={(e) => handleFieldChangeDatabaseStep(step.stepKey, 'actionDescription', e.target.value)}
                                                        className="mt-1 flex-1"
                                                        placeholder="Action description..."
                                                        rows={2}
                                                      />
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleRemoveDatabaseStep(testCase.id, step.stepKey)
                                                        }}
                                                        className="text-red-500 hover:text-red-700 mt-1"
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-700">{step.actionDescription}</span>
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Input Data: </span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.inputData}
                                                      onChange={(e) => handleFieldChangeDatabaseStep(step.stepKey, 'inputData', e.target.value)}
                                                      className="mt-1 text-sm"
                                                      placeholder="Input data..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    step.inputData && step.inputData !== '{}' ? (
                                                      <span className="text-gray-700 text-sm bg-gray-50 p-2 rounded">
                                                        {step.inputData}
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-500 text-sm italic">No input data</span>
                                                    )
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Expected Output: </span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.expectedOutput}
                                                      onChange={(e) => handleFieldChangeDatabaseStep(step.stepKey, 'expectedOutput', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Expected output..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <span className="text-gray-700">{step.expectedOutput}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          )
                                        })
                                      )}
                                      
                                      {/* Add Step Button - chỉ hiển thị khi đang edit */}
                                      {isEditing && (
                                        <div className="mt-3">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleAddDatabaseStep(testCase.id)
                                            }}
                                            className="text-blue-600 hover:text-blue-700"
                                          >
                                            + Add Step
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Load Database Test Cases Button */}
                  {scenario.id && !databaseTestCases[String(scenario.id)] && scenariosWithTestCases.has(String(scenario.id)) && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Saved TCs:</span>
                        <div className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              loadDatabaseTestCases(scenario.id!)
                            }}
                            disabled={isLoadingDatabaseTC === String(scenario.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {isLoadingDatabaseTC === String(scenario.id) ? (
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

        {/* Add Scenario Button at bottom */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={handleAddScenario}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Scenario
          </Button>
        </div>
          </div>
        </div>

        {/* Right side - PDF Viewer - Independent Scrollable Pane */}
        {isSplitView && (
          <div className="w-1/2 h-full flex flex-col border-l bg-gray-50 overflow-hidden">
            {/* Fixed Header */}
            <div className="border-b bg-white p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">SRS Document</h2>
              </div>
              {selectedUcId && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Selected: {selectedUcId}
                </Badge>
              )}
            </div>
            {/* Fixed UC_id Quick Links */}
            <div className="border-b bg-white p-2 overflow-x-auto flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">UC IDs:</span>
                <div className="flex space-x-1">
                  {Array.from(new Set(scenarios.map(s => s.UC_id))).map((ucId) => (
                    <button
                      key={ucId}
                      onClick={(e) => {
                        e.stopPropagation()
                        const scenario = scenarios.find(s => s.UC_id === ucId)
                        if (scenario && scenario.id) {
                          handleScenarioClick(scenario.id, true)
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedUcId === ucId
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`Click để xem ${ucId} trong PDF và scroll đến scenario`}
                    >
                      {ucId}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Scrollable PDF Content - Independent Scroll */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {pdfLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">Đang tải PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <PDFViewerWithHighlight
                  pdfUrl={pdfUrl}
                  bboxes={bboxes}
                  highlightTexts={allUcIds} // Fallback nếu không có bbox
                  onHighlightClick={handleHighlightClick}
                  selectedText={selectedUcId}
                  selectedTextMatchIndex={selectedUcId ? (ucIdMatchIndex[selectedUcId] || 0) : 0}
                  shouldScroll={shouldScrollToPdf}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="mb-2">Không thể tải PDF</p>
                    <p className="text-sm text-gray-400">
                      {srsId ? `SRS ID: ${srsId}` : "Không có SRS ID"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPdf}
                      className="mt-4"
                    >
                      Thử lại
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
