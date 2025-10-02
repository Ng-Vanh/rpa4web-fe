"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Play, Eye, EyeOff, Copy, Download, Edit3, Save, X, Trash2, Loader2, Check } from "lucide-react"
import { generateTestCases, createTestCaseWithSteps, getTestCasesWithSteps, updateTestCase, deleteTestCase } from "@/service/testcase"
import { updateTestCaseStep, deleteTestCaseStep } from "@/service/testcase-step"
import { getAuthHeaders } from "@/service/auth-utils"

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

  // Đồng bộ state khi props data thay đổi
  useEffect(() => {
    setScenariosState(data.scenarios || [])
  }, [data.scenarios])

  // Check scenarios có test case hay không khi scenarios thay đổi
  useEffect(() => {
    const checkAllScenarios = async () => {
      for (const scenario of scenariosState) {
        if (scenario.S_id && scenario.id) {
          await checkScenarioHasTestCases(scenario.S_id)
        }
      }
    }
    
    if (scenariosState.length > 0) {
      checkAllScenarios()
    }
  }, [scenariosState])

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
    if (!confirm(`Bạn có chắc chắn muốn xóa scenario "${scenario.Title}" và tất cả test cases liên quan?`)) {
      return
    }

    setIsDeleting(scenarioId.toString())
    try {
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
        setScenariosWithTestCases(prev => {
          const next = new Set(prev)
          next.delete(scenario.S_id)
          return next
        })
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


  const checkScenarioHasTestCases = async (sId: string) => {
    if (!sId) return false

    try {
      const scenario = scenarios.find(s => s.S_id === sId)
      if (!scenario || !scenario.id) {
        return false
      }

      const testCases = await getTestCasesWithSteps(scenario.id)
      const hasTestCases = testCases && testCases.length > 0
      
      setScenariosWithTestCases(prev => {
        const newSet = new Set(prev)
        if (hasTestCases) {
          newSet.add(sId)
        } else {
          newSet.delete(sId)
        }
        return newSet
      })

      return hasTestCases
    } catch (error) {
      console.error("Error checking scenario test cases:", error)
      return false
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

  const toggleGeneratedTestCaseExpansion = (tcId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(tcId)) {
      newExpanded.delete(tcId)
    } else {
      newExpanded.add(tcId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleEditGeneratedTestCase = (sId: string, tcIndex: number) => {
    const generatedData = generatedTestCases[sId]
    if (!generatedData || !generatedData.test_cases[tcIndex]) return

    const testCase = generatedData.test_cases[tcIndex]
    const editKey = `${sId}-${tcIndex}`
    
    setEditingGeneratedTC(editKey)
    setEditedGeneratedTCs(prev => ({
      ...prev,
      [editKey]: { ...testCase }
    }))

    // Initialize all steps in edit mode
    const stepsEditData: Record<string, any> = {}
    testCase.steps.forEach((step, stepIndex) => {
      const stepKey = `${sId}-${tcIndex}-${stepIndex}`
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

  const handleSaveEditGeneratedTC = (sId: string, tcIndex: number) => {
    const editKey = `${sId}-${tcIndex}`
    const editedTC = editedGeneratedTCs[editKey]
    if (!editedTC) return

    setGeneratedTestCases(prev => {
      const current = prev[sId]
      if (!current) return prev

      const newTestCases = [...current.test_cases]
      const updatedSteps = newTestCases[tcIndex].steps.map((step, stepIndex) => {
        const stepKey = `${sId}-${tcIndex}-${stepIndex}`
        return editedGeneratedSteps[stepKey] || step
      })
      
      newTestCases[tcIndex] = {
        ...editedTC,
        steps: updatedSteps
      }

      return {
        ...prev,
        [sId]: {
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
        // Update all steps in database
        const stepUpdatePromises: Promise<any>[] = []
        Object.keys(editedDatabaseSteps).forEach(stepKey => {
          if (stepKey.startsWith(`${tcId}-`)) {
            const editedStep = editedDatabaseSteps[stepKey]
            if (editedStep && editedStep.id) {
              stepUpdatePromises.push(
                updateTestCaseStep(editedStep.id, {
                  stepOrder: editedStep.stepOrder,
                  actionDescription: editedStep.actionDescription,
                  inputData: editedStep.inputData,
                  expectedOutput: editedStep.expectedOutput,
                  scriptCode: editedStep.scriptCode || ""
                })
              )
            }
          }
        })

        // Wait for all step updates to complete
        if (stepUpdatePromises.length > 0) {
          await Promise.all(stepUpdatePromises)
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

  const handleDeleteGeneratedTestCase = (sId: string, tcIndex: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa test case này?")) {
      return
    }

    setGeneratedTestCases(prev => {
      const current = prev[sId]
      if (!current) return prev

      const newTestCases = current.test_cases.filter((_, index) => index !== tcIndex)
      
      if (newTestCases.length === 0) {
        // Nếu không còn test case nào, xóa luôn entry
        const newState = { ...prev }
        delete newState[sId]
        return newState
      }

      return {
        ...prev,
        [sId]: {
          ...current,
          test_cases: newTestCases
        }
      }
    })
  }

  const handleSaveGeneratedTestCaseToDB = async (scenarioId: number, tcIndex: number) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario || !scenario.id) return

    const sId = scenario.S_id
    const generatedData = generatedTestCases[sId]
    if (!generatedData || !generatedData.test_cases[tcIndex]) return

    const testCase = generatedData.test_cases[tcIndex]
    const loadingKey = `${sId}-${tcIndex}`

    setIsSavingGeneratedTC(loadingKey)
    try {
      // Lưu test case vào database
      await createTestCaseWithSteps(scenario.id, [testCase])
      
      // Load lại database test cases để hiển thị
      await loadDatabaseTestCases(sId)
      
      // Update scenarios with test cases
      setScenariosWithTestCases(prev => new Set(prev).add(sId))
      
      // Xóa test case khỏi generated list
      setGeneratedTestCases(prev => {
        const current = prev[sId]
        if (!current) return prev

        const newTestCases = current.test_cases.filter((_, index) => index !== tcIndex)
        
        if (newTestCases.length === 0) {
          // Nếu không còn test case nào, xóa luôn entry
          const newState = { ...prev }
          delete newState[sId]
          return newState
        }

        return {
          ...prev,
          [sId]: {
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
                          <div className="space-y-3">
                            {generatedTestCases[scenario.S_id].test_cases.map((testCase, tcIndex) => {
                              const editKey = `${scenario.S_id}-${tcIndex}`
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
                                            onClick={() => handleSaveEditGeneratedTC(scenario.S_id, tcIndex)}
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancelEditGeneratedTC(editKey)}
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
                                            onClick={() => handleSaveGeneratedTestCaseToDB(scenario.id!, tcIndex)}
                                            disabled={isSavingGeneratedTC === `${scenario.S_id}-${tcIndex}`}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            {isSavingGeneratedTC === `${scenario.S_id}-${tcIndex}` ? (
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
                                            onClick={() => handleEditGeneratedTestCase(scenario.S_id, tcIndex)}
                                            className="text-blue-600 hover:text-blue-700"
                                          >
                                            <Edit3 className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteGeneratedTestCase(scenario.S_id, tcIndex)}
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
                                        onClick={() => toggleGeneratedTestCaseExpansion(`${scenario.S_id}-generated-${tcIndex}`)}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {expandedTestCases.has(`${scenario.S_id}-generated-${tcIndex}`) ? 'Collapse' : 'Expand'}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {expandedTestCases.has(`${scenario.S_id}-generated-${tcIndex}`) && (
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
                                                  <span className="font-medium text-gray-900">Action:</span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.action_description}
                                                      onChange={(e) => handleFieldChangeGeneratedStep(stepKey, 'action_description', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Action description..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <p className="text-gray-700 mt-1">{step.action_description}</p>
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Input Data:</span>
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
                                                      <p className="text-gray-700 mt-1 text-sm bg-gray-50 p-2 rounded">
                                                        {JSON.stringify(step.input_data)}
                                                      </p>
                                                    ) : (
                                                      <p className="text-gray-500 mt-1 text-sm italic">No input data</p>
                                                    )
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Expected Output:</span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.expected_output}
                                                      onChange={(e) => handleFieldChangeGeneratedStep(stepKey, 'expected_output', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Expected output..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <p className="text-gray-700 mt-1">{step.expected_output}</p>
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
                  {databaseTestCases[scenario.S_id] && databaseTestCases[scenario.S_id].length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Saved TCs:</span>
                        <div className="flex-1">
                          <div className="space-y-3">
                            {databaseTestCases[scenario.S_id].map((testCase, tcIndex) => {
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
                                            onClick={() => handleSaveEditDatabaseTC(testCase.id)}
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancelEditDatabaseTC(testCase.id)}
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
                                            onClick={() => handleEditDatabaseTestCase(testCase.id)}
                                            className="text-blue-600 hover:text-blue-700"
                                          >
                                            <Edit3 className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteDatabaseTestCase(testCase.id)}
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
                                        onClick={() => toggleTestCaseExpansion(`${scenario.S_id}-${testCase.id}`)}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        {expandedTestCases.has(`${scenario.S_id}-${testCase.id}`) ? 'Collapse' : 'Expand'}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {expandedTestCases.has(`${scenario.S_id}-${testCase.id}`) && (
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-600 mb-3">
                                        <strong>Steps ({testCase.steps.length}):</strong>
                                      </div>
                                      {testCase.steps
                                        .sort((a, b) => a.stepOrder - b.stepOrder)
                                        .map((step, stepIndex) => {
                                          const stepKey = `${testCase.id}-${stepIndex}`
                                          const isEditingStep = isEditing
                                          const editedStep = editedDatabaseSteps[stepKey] || step
                                          
                                          return (
                                          <div key={step.id} className="bg-white p-3 rounded border">
                                            <div className="flex items-start space-x-3">
                                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                                {isEditingStep ? (
                                                  <Input
                                                    value={editedStep.stepOrder}
                                                    onChange={(e) => handleFieldChangeDatabaseStep(stepKey, 'stepOrder', parseInt(e.target.value) || 1)}
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
                                                  <span className="font-medium text-gray-900">Action:</span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.actionDescription}
                                                      onChange={(e) => handleFieldChangeDatabaseStep(stepKey, 'actionDescription', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Action description..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <p className="text-gray-700 mt-1">{step.actionDescription}</p>
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Input Data:</span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.inputData}
                                                      onChange={(e) => handleFieldChangeDatabaseStep(stepKey, 'inputData', e.target.value)}
                                                      className="mt-1 text-sm"
                                                      placeholder="Input data..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    step.inputData && step.inputData !== '{}' ? (
                                                      <p className="text-gray-700 mt-1 text-sm bg-gray-50 p-2 rounded">
                                                        {step.inputData}
                                                      </p>
                                                    ) : (
                                                      <p className="text-gray-500 mt-1 text-sm italic">No input data</p>
                                                    )
                                                  )}
                                                </div>
                                                <div>
                                                  <span className="font-medium text-gray-900">Expected Output:</span>
                                                  {isEditingStep ? (
                                                    <Textarea
                                                      value={editedStep.expectedOutput}
                                                      onChange={(e) => handleFieldChangeDatabaseStep(stepKey, 'expectedOutput', e.target.value)}
                                                      className="mt-1"
                                                      placeholder="Expected output..."
                                                      rows={2}
                                                    />
                                                  ) : (
                                                    <p className="text-gray-700 mt-1">{step.expectedOutput}</p>
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

                  {/* Load Database Test Cases Button */}
                  {!databaseTestCases[scenario.S_id] && scenario.id && scenariosWithTestCases.has(scenario.S_id) && (
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
