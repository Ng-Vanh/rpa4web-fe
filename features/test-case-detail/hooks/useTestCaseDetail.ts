// hooks/useTestCaseDetail.ts - Custom hook chứa logic

import { useState, useRef, useEffect } from "react"
import { UploadedImage, TestCase } from "../types"
import { apiService } from "../api"
import { getScriptContentFromEditor } from "../utils"

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
  
  // ⭐ Track loại script gần nhất: "dom" | "image" | null
  const [lastRunType, setLastRunType] = useState<"dom" | "image" | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

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
    
    if (!script.trim()) {
      alert("Vui lòng nhập script trước khi chạy!")
      return
    }

    setIsRunning(true)
    try {
      const data = await apiService.runScriptDOM(script, "https://nhandan.vn/")
      
      if (data.status === "success") {
        alert("Script đã chạy thành công!")
        if (data.generatedScript) {
          setGeneratedScriptContent(data.generatedScript)
          // ⭐ Đánh dấu đã chạy DOM
          setLastRunType("dom")
        }
        console.log("Output:", data.output)
      } else {
        alert(`Lỗi khi chạy script: ${data.message || data.output}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
    } finally {
      setIsRunning(false)
    }
  }

  const handleRunImage = async () => {
    const script = getScriptContentFromEditor(editorRef.current)
    
    if (!script.trim()) {
      alert("Vui lòng nhập script trước khi chạy!")
      return
    }

    setIsRunningImage(true)
    try {
      const data = await apiService.runScriptImage(script, "https://nhandan.vn/")
      
      if (data.status === "success") {
        alert("Script Image đã chạy thành công!")
        if (data.generatedScript) {
          setGeneratedScriptContent(data.generatedScript)
          // ⭐ Đánh dấu đã chạy Image
          setLastRunType("image")
        }
        console.log("Output:", data.output)
      } else {
        alert(`Lỗi khi chạy script: ${data.message || data.output}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
    } finally {
      setIsRunningImage(false)
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
    // Mở dialog thay vì chạy trực tiếp
    setIsGenScenarioDialogOpen(true)
  }

  const handleUploadFlowchartImage = async (file: File): Promise<string | null> => {
    try {
      const data = await apiService.uploadImage(file)
      if (data.status === "success" && data.url) {
        // Trả về URL đầy đủ: http://localhost:8123/uploads/stepImg/obj_upload/obj_xxx.png
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
        alert(`❌ Lỗi khi tạo test scenario: ${data.message}\n\nOutput: ${data.output || 'N/A'}`)
      }
    } catch (error) {
      console.error("Error:", error)
      const clientTotalTime = Date.now() - startTime
      alert(`❌ Không thể kết nối đến server.\n⏱️ Client time: ${clientTotalTime}ms\n\nVui lòng kiểm tra backend đang chạy.`)
    } finally {
      setIsGeneratingScenario(false)
    }
  }

  // ⭐ LOGIC MỚI - View Script với fallback
  const handleViewScript = async () => {
    if (!testCase?.id) {
      alert("Không tìm thấy Test Case ID!")
      return
    }

    setIsLoadingScript(true)
    try {
      let scriptContent = ""
      let fromFile = false

      // Bước 1: Thử lấy từ file nếu đã chạy Run (DOM) hoặc Run (Image)
      if (lastRunType === "dom") {
        try {
          const data = await apiService.viewScriptDOM()
          if (data.status === "success" && data.content) {
            scriptContent = data.content
            fromFile = true
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
          }
        } catch (error) {
          console.log("Không tìm thấy file Image, sẽ lấy từ database")
        }
      }

      // Bước 2: Nếu không có từ file, lấy từ database
      if (!scriptContent) {
        const data = await apiService.getTestCaseStep(testCase.id, 1)
        if (data.status === "success" && data.scriptCode && data.scriptCode.trim()) {
          scriptContent = data.scriptCode
        }
      }

      // Bước 3: Hiển thị hoặc báo lỗi
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