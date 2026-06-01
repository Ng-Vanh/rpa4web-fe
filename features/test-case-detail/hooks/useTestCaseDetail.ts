// hooks/useTestCaseDetail.ts - FIXED: Apply same pattern for both DOM and Image

import { useState, useRef, useEffect } from "react"
import { UploadedImage, TestCase, StepProgress, RunProgress } from "../types"
import { apiService } from "../api"
import { streamingApiService } from "../streamingApi"
import { getScriptContentFromEditor, parseScript } from "../utils"

export const useTestCaseDetail = (testCase?: TestCase) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false)
  const [isViewScriptOpen, setIsViewScriptOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isRunningImage, setIsRunningImage] = useState(false)
  const [isLoadingScript, setIsLoadingScript] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingScript, setIsSavingScript] = useState(false)
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false)
  const [isGenScenarioDialogOpen, setIsGenScenarioDialogOpen] = useState(false)
  const [generatedScriptContent, setGeneratedScriptContent] = useState("")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState("")
  const [lastRunType, setLastRunType] = useState<"dom" | "image" | null>(null)
  
  const [runProgress, setRunProgress] = useState<RunProgress>({
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    isRunning: false
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [contentWhenRunStarted, setContentWhenRunStarted] = useState("")
  
  // ✅ CRITICAL: Prevent duplicate onComplete calls
  const completionHandledRef = useRef(false)
  
  // ✅ Store latest progress in ref for immediate access
  const latestProgressRef = useRef<RunProgress>({
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    isRunning: false
  })

  useEffect(() => {
    if (isImageLibraryOpen) {
      loadImages()
    }
  }, [isImageLibraryOpen])

  useEffect(() => {
    if (testCase?.id) {
      loadTestCaseStep()
    }
  }, [testCase?.id])

  useEffect(() => {
    if (!runProgress.isRunning && 
        runProgress.totalSteps > 0 && 
        contentWhenRunStarted && 
        editorContent !== contentWhenRunStarted) {
      
      console.log("Content changed after run - Resetting progress")
      setRunProgress({
        currentStep: 0,
        totalSteps: 0,
        steps: [],
        isRunning: false
      })
      setContentWhenRunStarted("")
    }
  }, [editorContent, runProgress.isRunning, runProgress.totalSteps, contentWhenRunStarted])

  const loadTestCaseStep = async () => {
    if (!testCase?.id) return

    try {
      const data = await apiService.getTestCaseStep(testCase.id, 1)
      if (data.status === "success" && data.actionDescription && editorRef.current) {
        editorRef.current.innerHTML = data.actionDescription
        setEditorContent(data.actionDescription)
      }
    } catch (error) {
      console.error("Error loading test case step:", error)
    }
  }

  const loadImages = async () => {
    try {
      const data = await apiService.listImages()
      if (data.status === "success" && data.images) {
        setUploadedImages(data.images)
      }
    } catch (error) {
      console.error("Error loading images:", error)
    }
  }

  const handlePasteImage = async (file: File): Promise<string | null> => {
    try {
      const data = await apiService.uploadImage(file)
      if (data.status === "success" && data.url) {
        await loadImages()
        return data.url
      } else {
        alert(`Lỗi upload: ${data.message}`)
        return null
      }
    } catch (error) {
      console.error("Error uploading pasted image:", error)
      alert("Lỗi khi upload ảnh")
      return null
    }
  }

  const handleImageUpload = async (files: FileList) => {
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const data = await apiService.uploadImage(file)
        if (data.status !== "success") {
          alert(`Lỗi upload ${file.name}: ${data.message}`)
        }
      }
      await loadImages()
      alert("Upload ảnh thành công!")
    } catch (error) {
      console.error("Error uploading images:", error)
      alert("Lỗi khi upload ảnh")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error("Error copying URL:", error)
      alert("Không thể copy URL")
    }
  }

  const handleDeleteImage = async (filename: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ảnh "${filename}"?`)) {
      return
    }

    try {
      const data = await apiService.deleteImage(filename)
      if (data.status === "success") {
        alert("Xóa ảnh thành công!")
        await loadImages()
      } else {
        alert(`Lỗi: ${data.message}`)
      }
    } catch (error) {
      console.error("Error deleting image:", error)
      alert("Lỗi khi xóa ảnh")
    }
  }

  const handleRunDOM = async () => {
    const script = getScriptContentFromEditor(editorRef.current)
    const parsedScript = parseScript(script)
    const totalSteps = parsedScript.filter(l => 
      l.type === 'image' || (l.type === 'text' && l.content.trim())
    ).length
    
    if (!script.trim()) {
      alert("Vui lòng nhập script trước khi chạy!")
      return
    }

    console.log(`Starting DOM execution with ${totalSteps} steps`)
    
    // ✅ RESET completion flag
    completionHandledRef.current = false

    setLastRunType("dom")
    setContentWhenRunStarted(editorContent)

    const initialSteps: StepProgress[] = Array(totalSteps).fill(null).map((_, i) => ({
      step: i + 1,
      status: 'pending' as const,
      message: '',
      timestamp: Date.now()
    }))

    const initialProgress = {
      currentStep: 0,
      totalSteps,
      steps: initialSteps,
      isRunning: true,
      startTime: Date.now()
    }

    setRunProgress(initialProgress)
    latestProgressRef.current = initialProgress // ✅ Sync ref

    setIsRunning(true)
    
    try {
      await streamingApiService.runScriptDOMStream(
        script,
        "https://nhandan.vn/",
        {
          onStart: () => {
            console.log('Script execution started')
          },
          
          onStep: (stepData: StepProgress) => {
            console.log('Step update received:', {
              step: stepData.step,
              status: stepData.status,
              message: stepData.message,
              duration: stepData.duration
            })
            
            setRunProgress(prev => {
              const newSteps = [...prev.steps]
              const stepIndex = stepData.step - 1
              
              if (stepIndex >= 0 && stepIndex < newSteps.length) {
                const currentStepStatus = newSteps[stepIndex].status
                
                // ✅ CRITICAL: Never override 'error' status
                if (currentStepStatus === 'error' && stepData.status !== 'error') {
                  console.log(`🛡️ Protecting error status for step ${stepData.step}`)
                  newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    message: newSteps[stepIndex].message,
                    duration: stepData.duration || newSteps[stepIndex].duration,
                    timestamp: Date.now()
                  }
                } else {
                  newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    ...stepData,
                    timestamp: Date.now()
                  }
                }
                
                console.log(`Updated step ${stepData.step}:`, newSteps[stepIndex])
              } else {
                console.warn(`Invalid step index: ${stepIndex} (step ${stepData.step})`)
              }
              
              const newCurrentStep = stepData.step
              
              const newProgress = {
                ...prev,
                steps: newSteps,
                currentStep: newCurrentStep
              }
              
              // ✅ Update ref immediately
              latestProgressRef.current = newProgress
              
              return newProgress
            })
          },
          
          onInfo: (message: string) => {
            console.log('Info:', message)
          },
          
          onComplete: (data) => {
            // ✅ CRITICAL: Prevent duplicate handling
            if (completionHandledRef.current) {
              console.warn('⚠️ onComplete already handled, skipping duplicate call')
              return
            }
            completionHandledRef.current = true

            console.log('Execution complete:', {
              status: data.status,
              exitCode: data.exitCode,
              hasGeneratedScript: !!data.generatedScript
            })
            
            // ✅ FIXED: Use setTimeout like Image handler
            setTimeout(() => {
              // ✅ Read from ref (most up-to-date state)
              const finalSteps = latestProgressRef.current.steps
              const hasFailedSteps = finalSteps.some(s => s.status === 'error')
              const successCount = finalSteps.filter(s => s.status === 'success').length
              const failedCount = finalSteps.filter(s => s.status === 'error').length
              
              console.log('📊 Final Results:', {
                hasFailedSteps,
                successCount,
                failedCount,
                totalSteps,
                steps: finalSteps.map(s => ({ step: s.step, status: s.status }))
              })
              
              setRunProgress(prev => {
                const newProgress = {
                  ...prev,
                  currentStep: hasFailedSteps ? prev.currentStep : totalSteps,
                  isRunning: false,
                  endTime: Date.now()
                }
                latestProgressRef.current = newProgress
                return newProgress
              })
              
              if (data.generatedScript) {
                setGeneratedScriptContent(data.generatedScript)
              }
              
              setIsRunning(false)
              
              // ✅ Show alert based on actual results
              if (data.status === "success" && !hasFailedSteps) {
                alert(`The script ran successfully!\n\n${successCount}/${totalSteps} steps completed`)
              } else if (hasFailedSteps) {
                alert(`Script completed with errors\n\nSuccess: ${successCount}\nFailed: ${failedCount}\n📊 Total: ${totalSteps}`)
              } else {
                alert(`Script thất bại với exit code: ${data.exitCode}`)
              }
            }, 150) // Wait for all events to process
          },
          
          onError: (error: string) => {
            console.error('Stream error:', error)
            
            if (!completionHandledRef.current) {
              setRunProgress(prev => ({
                ...prev,
                isRunning: false,
                endTime: Date.now()
              }))
              
              setIsRunning(false)
              alert(`❌ Lỗi: ${error}`)
            }
          }
        }
      )
    } catch (error) {
      console.error("Connection error:", error)
      
      if (!completionHandledRef.current) {
        setRunProgress(prev => ({
          ...prev,
          isRunning: false,
          endTime: Date.now()
        }))
        
        setIsRunning(false)
        alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
      }
    }
  }

  const handleRunImage = async () => {
    const script = getScriptContentFromEditor(editorRef.current)
    const parsedScript = parseScript(script)
    const totalSteps = parsedScript.filter(l => 
      l.type === 'image' || (l.type === 'text' && l.content.trim())
    ).length
    
    if (!script.trim()) {
      alert("Vui lòng nhập script trước khi chạy!")
      return
    }

    console.log(`Starting Image execution with ${totalSteps} steps`)
    
    // ✅ RESET completion flag
    completionHandledRef.current = false

    setLastRunType("image")
    setContentWhenRunStarted(editorContent)

    const initialSteps: StepProgress[] = Array(totalSteps).fill(null).map((_, i) => ({
      step: i + 1,
      status: 'pending' as const,
      message: '',
      timestamp: Date.now()
    }))

    const initialProgress = {
      currentStep: 0,
      totalSteps,
      steps: initialSteps,
      isRunning: true,
      startTime: Date.now()
    }

    setRunProgress(initialProgress)
    latestProgressRef.current = initialProgress // ✅ Sync ref

    setIsRunningImage(true)
    
    try {
      await streamingApiService.runScriptImageStream(
        script,
        "https://nhandan.vn/",
        {
          onStart: () => {
            console.log('Image script execution started')
          },
          
          onStep: (stepData: StepProgress) => {
            console.log('Step update received:', {
              step: stepData.step,
              status: stepData.status,
              message: stepData.message,
              duration: stepData.duration
            })
            
            setRunProgress(prev => {
              const newSteps = [...prev.steps]
              const stepIndex = stepData.step - 1
              
              if (stepIndex >= 0 && stepIndex < newSteps.length) {
                const currentStepStatus = newSteps[stepIndex].status
                
                // ✅ CRITICAL: Never override 'error' status
                if (currentStepStatus === 'error' && stepData.status !== 'error') {
                  console.log(`🛡️ Protecting error status for step ${stepData.step}`)
                  newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    message: newSteps[stepIndex].message,
                    duration: stepData.duration || newSteps[stepIndex].duration,
                    timestamp: Date.now()
                  }
                } else {
                  newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    ...stepData,
                    timestamp: Date.now()
                  }
                }
                
                console.log(`Updated step ${stepData.step}:`, newSteps[stepIndex])
              } else {
                console.warn(`Invalid step index: ${stepIndex} (step ${stepData.step})`)
              }
              
              const newCurrentStep = stepData.step
              
              const newProgress = {
                ...prev,
                steps: newSteps,
                currentStep: newCurrentStep
              }
              
              // ✅ Update ref immediately
              latestProgressRef.current = newProgress
              
              return newProgress
            })
          },
          
          onInfo: (message: string) => {
            console.log('Info:', message)
          },
          
          onComplete: (data) => {
            // ✅ CRITICAL: Prevent duplicate handling
            if (completionHandledRef.current) {
              console.warn('⚠️ onComplete already handled, skipping duplicate call')
              return
            }
            completionHandledRef.current = true

            console.log('Execution complete:', {
              status: data.status,
              exitCode: data.exitCode,
              hasGeneratedScript: !!data.generatedScript
            })
            
            // ✅ Use setTimeout to ensure all step events are processed
            setTimeout(() => {
              // ✅ Read from ref (most up-to-date state)
              const finalSteps = latestProgressRef.current.steps
              const hasFailedSteps = finalSteps.some(s => s.status === 'error')
              const successCount = finalSteps.filter(s => s.status === 'success').length
              const failedCount = finalSteps.filter(s => s.status === 'error').length
              
              console.log('📊 Final Results:', {
                hasFailedSteps,
                successCount,
                failedCount,
                totalSteps,
                steps: finalSteps.map(s => ({ step: s.step, status: s.status }))
              })
              
              setRunProgress(prev => {
                const newProgress = {
                  ...prev,
                  currentStep: hasFailedSteps ? prev.currentStep : totalSteps,
                  isRunning: false,
                  endTime: Date.now()
                }
                latestProgressRef.current = newProgress
                return newProgress
              })
              
              if (data.generatedScript) {
                setGeneratedScriptContent(data.generatedScript)
              }
              
              setIsRunningImage(false)
              
              // ✅ Show alert based on actual results
              if (data.status === "success" && !hasFailedSteps) {
                alert(`Image script has finished running!\n\n${successCount}/${totalSteps} steps completed successfully`)
              } else if (hasFailedSteps) {
                alert(`Script completed with errors\n\nSuccess: ${successCount}\nFailed: ${failedCount}\n📊 Total: ${totalSteps}`)
              } else {
                alert(`Script failed with exit code: ${data.exitCode}`)
              }
            }, 150) // Wait for all events to process
          },
          
          onError: (error: string) => {
            console.error('Stream error:', error)
            
            if (!completionHandledRef.current) {
              setRunProgress(prev => ({
                ...prev,
                isRunning: false,
                endTime: Date.now()
              }))
              
              setIsRunningImage(false)
              alert(`❌ Lỗi: ${error}`)
            }
          }
        }
      )
    } catch (error) {
      console.error("Connection error:", error)
      
      if (!completionHandledRef.current) {
        setRunProgress(prev => ({
          ...prev,
          isRunning: false,
          endTime: Date.now()
        }))
        
        setIsRunningImage(false)
        alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
      }
    }
  }

  const handleOpenChrome = async () => {
    try {
      const data = await apiService.openChrome()
      if (data.status === "success") {
        alert("Chrome đã được mở với remote debugging!")
      } else {
        alert(`Lỗi: ${data.message}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
    }
  }

  const handleGenTestScenario = async (testCaseId: number, testItem: string, imagePath?: string) => {
    setIsGenScenarioDialogOpen(true)
  }

  const handleUploadFlowchartImage = async (file: File): Promise<string | null> => {
    try {
      const data = await apiService.uploadImage(file)
      if (data.status === "success" && data.url) {
        return data.url
      } else {
        alert(`Lỗi upload: ${data.message}`)
        return null
      }
    } catch (error) {
      console.error("Error uploading flowchart:", error)
      alert("Lỗi khi upload ảnh flowchart")
      return null
    }
  }

  const handleGenTestScenarioWithImage = async (imageUrl: string) => {
    setIsGeneratingScenario(true)
    const startTime = Date.now()
    
    try {
      const data = await apiService.generateTestScenario(imageUrl)
      const endTime = Date.now()
      const clientTotalTime = endTime - startTime
      
      if (data.status === "success") {
        const timing = data.timing
        let message = "Test Scenario đã được tạo thành công!\n\n"
        
        if (data.scenario && editorRef.current) {
          editorRef.current.innerText = data.scenario
          setEditorContent(data.scenario)
        }
        
        alert(message)
        console.log("Generated Scenario:", data.scenario)
        console.log("Full Output:", data.fullOutput)
        console.log("Timing Info:", timing)

        setIsGenScenarioDialogOpen(false)
      } else {
        alert(`Lỗi khi tạo test scenario: ${data.message}\n\nOutput: ${data.output || 'N/A'}`)
      }
    } catch (error) {
      console.error("Error:", error)
      const clientTotalTime = Date.now() - startTime
      alert(`Không thể kết nối đến server.\n\nVui lòng kiểm tra backend đang chạy.`)
    } finally {
      setIsGeneratingScenario(false)
    }
  }

  const handleViewScript = async () => {
    if (!testCase?.id) {
      alert("Không tìm thấy Test Case ID!")
      return
    }

    setIsLoadingScript(true)
    try {
      let scriptContent = ""
      let fromFile = false

      if (lastRunType === "dom") {
        try {
          const data = await apiService.viewScriptDOM()
          if (data.status === "success" && data.content) {
            scriptContent = data.content
            fromFile = true
            console.log("✅ Loaded DOM script from file")
          }
        } catch (error) {
          console.log("Không tìm thấy file DOM, sẽ lấy từ database")
        }
      } else if (lastRunType === "image") {
        try {
          const data = await apiService.viewScriptImage()
          if (data.status === "success" && data.content) {
            scriptContent = data.content
            fromFile = true
            console.log("✅ Loaded Image script from file")
          }
        } catch (error) {
          console.log("Không tìm thấy file Image, sẽ lấy từ database")
        }
      }

      if (!scriptContent) {
        const data = await apiService.getTestCaseStep(testCase.id, 1)
        if (data.status === "success" && data.scriptCode && data.scriptCode.trim()) {
          scriptContent = data.scriptCode
          console.log("📦 Loaded script from database")
        }
      }

      if (scriptContent) {
        setGeneratedScriptContent(scriptContent)
        setIsViewScriptOpen(true)
        console.log(`Script loaded from: ${fromFile ? (lastRunType === "dom" ? "DOM file" : "Image file") : "database"}`)
      } else {
        alert("Chưa có script code!\n\nVui lòng chạy Run (DOM) hoặc Run (Image) trước, hoặc lưu script code vào database.")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Không thể tải script. Vui lòng kiểm tra backend đang chạy.")
    } finally {
      setIsLoadingScript(false)
    }
  }

  const handleSaveActionDescription = async () => {
    if (!testCase?.id) {
      alert("Không tìm thấy Test Case ID!")
      return
    }

    const content = getScriptContentFromEditor(editorRef.current)
    
    if (!content.trim()) {
      alert("Nội dung script trống!")
      return
    }

    setIsSaving(true)
    try {
      const data = await apiService.saveActionDescription(testCase.id, content, 1)
      
      if (data.status === "success") {
        alert("Action Description saved successfully!")
      } else {
        alert(`Lỗi: ${data.message}`)
      }
    } catch (error) {
      console.error("Error saving action description:", error)
      alert("Không thể lưu dữ liệu. Vui lòng kiểm tra backend đang chạy.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveScriptCode = async (scriptCode: string) => {
    if (!testCase?.id) {
      alert("Không tìm thấy Test Case ID!")
      return
    }

    if (!scriptCode.trim()) {
      alert("Nội dung script code trống!")
      return
    }

    setIsSavingScript(true)
    try {
      const data = await apiService.saveScriptCode(testCase.id, scriptCode, 1)
      
      if (data.status === "success") {
        alert("Script code saved successfully!")
      } else {
        alert(`Lỗi: ${data.message}`)
      }
    } catch (error) {
      console.error("Error saving script code:", error)
      alert("Không thể lưu dữ liệu. Vui lòng kiểm tra backend đang chạy.")
    } finally {
      setIsSavingScript(false)
    }
  }

  return {
    // State
    uploadedImages,
    isImageLibraryOpen,
    isViewScriptOpen,
    isRunning,
    isRunningImage,
    isLoadingScript,
    isUploading,
    isSaving,
    isSavingScript,
    isGeneratingScenario,
    isGenScenarioDialogOpen,
    generatedScriptContent,
    copiedUrl,
    editorContent,
    runProgress,
    lastRunType,
    
    // Refs
    fileInputRef,
    editorRef,
    
    // Setters
    setIsImageLibraryOpen,
    setIsViewScriptOpen,
    setIsGenScenarioDialogOpen,
    setEditorContent,
    
    // Handlers
    handlePasteImage,
    handleImageUpload,
    handleCopyUrl,
    handleDeleteImage,
    handleRunDOM,
    handleRunImage,
    handleOpenChrome,
    handleGenTestScenario,
    handleUploadFlowchartImage,
    handleGenTestScenarioWithImage,
    handleViewScript,
    handleSaveActionDescription,
    handleSaveScriptCode,
    loadImages,
  }
}