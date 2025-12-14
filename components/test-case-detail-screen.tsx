// "use client"

// import type React from "react"
// import { useState, useRef, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { ArrowLeft, Play, Eye, Image as ImageIcon, Upload, Trash2, Chrome, Wand2, Loader2, Copy, Check } from "lucide-react"

// interface ParsedLine {
//   type: "text" | "image"
//   content: string
//   imageUrl?: string
//   prefix?: string
// }

// interface UploadedImage {
//   filename: string
//   url: string
//   size: string
// }

// interface TestCaseDetailScreenProps {
//   onBack?: () => void
//   testCase?: {
//     id: number
//     testItem: string
//     testClassification: string
//     runConfig?: string
//   }
// }

// const API_BASE_URL = "http://localhost:8123/api/auto-test"

// export function TestCaseDetailScreen({ onBack, testCase }: TestCaseDetailScreenProps) {
//   const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
//   const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false)
//   const [isViewScriptOpen, setIsViewScriptOpen] = useState(false)
//   const [isRunning, setIsRunning] = useState(false)
//   const [isRunningImage, setIsRunningImage] = useState(false)
//   const [isLoadingScript, setIsLoadingScript] = useState(false)
//   const [isUploading, setIsUploading] = useState(false)
//   const [generatedScriptContent, setGeneratedScriptContent] = useState("")
//   const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const editorRef = useRef<HTMLDivElement>(null)
//   const [editorContent, setEditorContent] = useState("")

//   const defaultTestCase = {
//     id: 1,
//     testItem: "Login Functionality",
//     testClassification: "Functional Test",
//     runConfig: "Chrome - Desktop",
//   }

//   const currentTestCase = testCase || defaultTestCase

//   useEffect(() => {
//     if (isImageLibraryOpen) {
//       loadImages()
//     }
//   }, [isImageLibraryOpen])

//   // Xử lý paste ảnh
//   const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
//     const items = e.clipboardData.items

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i]
      
//       if (item.type.indexOf("image") !== -1) {
//         e.preventDefault()
        
//         const blob = item.getAsFile()
//         if (!blob) continue

//         // Upload ảnh lên server
//         const formData = new FormData()
//         formData.append("file", blob, `pasted-${Date.now()}.png`)

//         try {
//           const response = await fetch(`${API_BASE_URL}/upload-image`, {
//             method: "POST",
//             body: formData,
//           })

//           const data = await response.json()

//           if (data.status === "success") {
//             // Chèn ảnh vào editor
//             const img = document.createElement("img")
//             img.src = data.url
//             img.className = "inline-block max-w-xs h-auto rounded border border-slate-300 mx-1 my-1"
//             img.contentEditable = "false"

//             const selection = window.getSelection()
//             if (selection && selection.rangeCount > 0) {
//               const range = selection.getRangeAt(0)
//               range.deleteContents()
//               range.insertNode(img)
              
//               // Di chuyển cursor sau ảnh
//               range.setStartAfter(img)
//               range.setEndAfter(img)
//               selection.removeAllRanges()
//               selection.addRange(range)
//             } else if (editorRef.current) {
//               editorRef.current.appendChild(img)
//             }

//             // Reload image library
//             await loadImages()
//           } else {
//             alert(`Lỗi upload: ${data.message}`)
//           }
//         } catch (error) {
//           console.error("Error uploading pasted image:", error)
//           alert("Lỗi khi upload ảnh")
//         }
//       }
//     }
//   }

//   // Lấy nội dung script (text + image URLs)
//   const getScriptContent = (): string => {
//     if (!editorRef.current) return ""
    
//     const lines: string[] = []
//     const children = Array.from(editorRef.current.childNodes)

//     children.forEach((node) => {
//       if (node.nodeType === Node.TEXT_NODE) {
//         const text = node.textContent || ""
//         if (text.trim()) {
//           lines.push(text)
//         }
//       } else if (node.nodeName === "IMG") {
//         const img = node as HTMLImageElement
//         lines.push(img.src)
//       } else if (node.nodeName === "DIV" || node.nodeName === "BR") {
//         // Xử lý xuống dòng
//         if (lines.length > 0 && lines[lines.length - 1] !== "") {
//           lines.push("")
//         }
//       }
//     })

//     return lines.join("\n")
//   }

//   const parseScript = (text: string): ParsedLine[] => {
//     const lines = text.split("\n")
//     const imageExtensions = /\.(png|jpg|jpeg|gif|webp|svg)$/i

//     return lines.map((line) => {
//       const trimmedLine = line.trim()

//       if (trimmedLine.match(/^https?:\/\//i) && imageExtensions.test(trimmedLine)) {
//         return {
//           type: "image" as const,
//           content: line,
//           imageUrl: trimmedLine,
//         }
//       }

//       const matchWithBrackets = line.match(/^(.+?)\s*\[(https?:\/\/[^\]]+)\]/i)
//       if (matchWithBrackets && imageExtensions.test(matchWithBrackets[2])) {
//         return {
//           type: "image" as const,
//           content: line,
//           imageUrl: matchWithBrackets[2],
//           prefix: matchWithBrackets[1].trim(),
//         }
//       }

//       return {
//         type: "text" as const,
//         content: line,
//       }
//     })
//   }

//   const loadImages = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/list-images`)
//       const data = await response.json()

//       if (data.status === "success") {
//         setUploadedImages(data.images)
//       }
//     } catch (error) {
//       console.error("Error loading images:", error)
//     }
//   }

//   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files
//     if (!files || files.length === 0) return

//     setIsUploading(true)

//     try {
//       for (const file of Array.from(files)) {
//         const formData = new FormData()
//         formData.append("file", file)

//         const response = await fetch(`${API_BASE_URL}/upload-image`, {
//           method: "POST",
//           body: formData,
//         })

//         const data = await response.json()

//         if (data.status === "success") {
//           console.log("Uploaded:", data.url)
//         } else {
//           alert(`Lỗi upload ${file.name}: ${data.message}`)
//         }
//       }

//       await loadImages()
//       alert("Upload ảnh thành công!")
//     } catch (error) {
//       console.error("Error uploading images:", error)
//       alert("Lỗi khi upload ảnh")
//     } finally {
//       setIsUploading(false)
//       if (fileInputRef.current) {
//         fileInputRef.current.value = ""
//       }
//     }
//   }

//   const handleCopyUrl = async (url: string) => {
//     try {
//       await navigator.clipboard.writeText(url)
//       setCopiedUrl(url)
//       setTimeout(() => setCopiedUrl(null), 2000)
//     } catch (error) {
//       console.error("Error copying URL:", error)
//       alert("Không thể copy URL")
//     }
//   }

//   const handleDeleteImage = async (filename: string) => {
//     if (!confirm(`Bạn có chắc muốn xóa ảnh "${filename}"?`)) {
//       return
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}/delete-image/${filename}`, {
//         method: "DELETE",
//       })

//       const data = await response.json()

//       if (data.status === "success") {
//         alert("Xóa ảnh thành công!")
//         await loadImages()
//       } else {
//         alert(`Lỗi: ${data.message}`)
//       }
//     } catch (error) {
//       console.error("Error deleting image:", error)
//       alert("Lỗi khi xóa ảnh")
//     }
//   }

//   const handleRunDOM = async () => {
//     const script = getScriptContent()
    
//     if (!script.trim()) {
//       alert("Vui lòng nhập script trước khi chạy!")
//       return
//     }

//     setIsRunning(true)
//     try {
//       const response = await fetch(`${API_BASE_URL}/run-script`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           script: script,
//           url: "https://nhandan.vn/",
//         }),
//       })

//       const data = await response.json()

//       if (data.status === "success") {
//         alert("Script đã chạy thành công!")
//         if (data.generatedScript) {
//           setGeneratedScriptContent(data.generatedScript)
//         }
//         console.log("Output:", data.output)
//       } else {
//         alert(`Lỗi khi chạy script: ${data.message || data.output}`)
//       }
//     } catch (error) {
//       console.error("Error:", error)
//       alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
//     } finally {
//       setIsRunning(false)
//     }
//   }

//   const handleRunImage = async () => {
//     const script = getScriptContent()
    
//     if (!script.trim()) {
//       alert("Vui lòng nhập script trước khi chạy!")
//       return
//     }

//     setIsRunningImage(true)
//     try {
//       const response = await fetch(`${API_BASE_URL}/run-script-image`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           script: script,
//           url: "https://nhandan.vn/",
//         }),
//       })

//       const data = await response.json()

//       if (data.status === "success") {
//         alert("Script (Image) đã chạy thành công!")
//         if (data.generatedScript) {
//           setGeneratedScriptContent(data.generatedScript)
//         }
//         console.log("Output:", data.output)
//       } else {
//         alert(`Lỗi khi chạy script (Image): ${data.message || data.output}`)
//       }
//     } catch (error) {
//       console.error("Error:", error)
//       alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
//     } finally {
//       setIsRunningImage(false)
//     }
//   }

//   const handleOpenChrome = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/open-chrome`, {
//         method: "POST",
//       })

//       const data = await response.json()

//       if (data.status === "success") {
//         alert("Chrome đã được mở với remote debugging!")
//       } else {
//         alert(`Lỗi: ${data.message}`)
//       }
//     } catch (error) {
//       console.error("Error:", error)
//       alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
//     }
//   }

//   const handleGenTestScenario = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/gen-test-scenario`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           testCaseId: currentTestCase.id,
//           testItem: currentTestCase.testItem,
//         }),
//       })

//       const data = await response.json()

//       if (data.status === "success") {
//         alert("Test Scenario đã được tạo thành công!")
//         if (data.scenario && editorRef.current) {
//           editorRef.current.innerText = data.scenario
//         }
//         console.log("Generated Scenario:", data.scenario)
//       } else {
//         alert(`Lỗi khi tạo test scenario: ${data.message}`)
//       }
//     } catch (error) {
//       console.error("Error:", error)
//       alert("Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.")
//     }
//   }

//   const handleViewScript = async () => {
//     setIsLoadingScript(true)
//     try {
//       const response = await fetch(`${API_BASE_URL}/view-script`)
//       const data = await response.json()

//       if (data.status === "success") {
//         setGeneratedScriptContent(data.content)
//         setIsViewScriptOpen(true)
//       } else {
//         alert(`Lỗi: ${data.message}`)
//       }
//     } catch (error) {
//       console.error("Error:", error)
//       alert("Không thể tải script. Vui lòng kiểm tra backend đang chạy.")
//     } finally {
//       setIsLoadingScript(false)
//     }
//   }

//   const handleBack = () => {
//     if (onBack) {
//       onBack()
//     } else {
//       console.log("Navigate back to test cases")
//     }
//   }

//   const parsedLines = parseScript(getScriptContent())

//   const handleEditorInput = () => {
//     if (editorRef.current) {
//       setEditorContent(editorRef.current.innerHTML)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-slate-50">
//       <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
//         <div className="max-w-6xl mx-auto px-6 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
//                 <ArrowLeft className="w-4 h-4" />
//                 Back to Test Cases
//               </Button>
//               <div className="h-6 w-px bg-slate-200" />
//               <h1 className="text-lg font-semibold text-slate-900">Test Case Details</h1>
//             </div>
//             <div className="flex items-center gap-2">
//               <Button variant="outline" size="sm" onClick={handleOpenChrome} className="gap-2 bg-transparent">
//                 <Chrome className="w-4 h-4" />
//                 Open Chrome
//               </Button>
//               <Button variant="outline" size="sm" onClick={handleGenTestScenario} className="gap-2 bg-transparent">
//                 <Wand2 className="w-4 h-4" />
//                 Gen Test Scenario
//               </Button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
//         <div className="flex items-center gap-4 text-sm">
//           <div className="flex items-center gap-1.5">
//             <span className="text-slate-500 font-medium">ID:</span>
//             <span className="font-semibold text-slate-900">#{currentTestCase.id}</span>
//           </div>
//           <div className="h-4 w-px bg-slate-300" />
//           <div className="flex items-center gap-1.5">
//             <span className="text-slate-500 font-medium">Test Item:</span>
//             <span className="text-slate-900">{currentTestCase.testItem}</span>
//           </div>
//           <div className="h-4 w-px bg-slate-300" />
//           <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0">
//             {currentTestCase.testClassification}
//           </Badge>
//           <div className="h-4 w-px bg-slate-300" />
//           <div className="flex items-center gap-1.5">
//             <span className="text-slate-500 font-medium">Run Config:</span>
//             <span className="text-slate-700">{currentTestCase.runConfig}</span>
//           </div>
//         </div>

//         <Card className="bg-white border-slate-200 shadow-sm">
//           <CardContent className="p-6 space-y-5">
//             <div>
//               <div className="flex items-center justify-between mb-2">
//                 <label className="text-sm font-medium text-slate-700">Paste your script here (text & images):</label>
//                 <div className="flex gap-2">
//                   <Dialog open={isImageLibraryOpen} onOpenChange={setIsImageLibraryOpen}>
//                     <DialogTrigger asChild>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="gap-2 border-slate-300 hover:bg-slate-100 bg-white"
//                       >
//                         <ImageIcon className="w-4 h-4" />
//                         Image Library ({uploadedImages.length})
//                       </Button>
//                     </DialogTrigger>
//                     <DialogContent className="max-w-4xl max-h-[80vh]">
//                       <DialogHeader>
//                         <DialogTitle>Image Library</DialogTitle>
//                       </DialogHeader>
//                       <div className="space-y-4 overflow-y-auto max-h-[60vh]">
//                         <div className="flex items-center gap-2">
//                           <input
//                             type="file"
//                             ref={fileInputRef}
//                             onChange={handleImageUpload}
//                             accept="image/*"
//                             multiple
//                             className="hidden"
//                           />
//                           <Button
//                             variant="outline"
//                             onClick={() => fileInputRef.current?.click()}
//                             disabled={isUploading}
//                             className="gap-2"
//                           >
//                             {isUploading ? (
//                               <>
//                                 <Loader2 className="w-4 h-4 animate-spin" />
//                                 Uploading...
//                               </>
//                             ) : (
//                               <>
//                                 <Upload className="w-4 h-4" />
//                                 Upload Images
//                               </>
//                             )}
//                           </Button>
//                           {/* <span className="text-xs text-slate-500">Ảnh sẽ được lưu vào server</span> */}
//                         </div>

//                         {uploadedImages.length > 0 ? (
//                           <div className="grid grid-cols-2 gap-4">
//                             {uploadedImages.map((img, index) => (
//                               <div
//                                 key={index}
//                                 className="relative group border border-slate-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
//                               >
//                                 <img
//                                   src={img.url || "/placeholder.svg"}
//                                   alt={img.filename}
//                                   className="w-full h-40 object-contain rounded mb-2"
//                                 />
//                                 <div className="space-y-2">
//                                   <p className="text-xs text-slate-600 truncate">{img.filename}</p>
//                                   <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded border border-slate-200">
//                                     <input
//                                       type="text"
//                                       value={img.url}
//                                       readOnly
//                                       className="flex-1 text-xs bg-transparent border-none outline-none"
//                                     />
//                                     <Button
//                                       size="sm"
//                                       variant="ghost"
//                                       onClick={() => handleCopyUrl(img.url)}
//                                       className="h-6 px-2"
//                                     >
//                                       {copiedUrl === img.url ? (
//                                         <Check className="w-3 h-3 text-green-600" />
//                                       ) : (
//                                         <Copy className="w-3 h-3" />
//                                       )}
//                                     </Button>
//                                   </div>
//                                   <Button
//                                     size="sm"
//                                     variant="destructive"
//                                     onClick={() => handleDeleteImage(img.filename)}
//                                     className="w-full h-7 text-xs"
//                                   >
//                                     <Trash2 className="w-3 h-3 mr-1" />
//                                     Delete
//                                   </Button>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <div className="text-center py-12 text-slate-400">
//                             <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-40" />
//                             <p className="text-sm">No images uploaded yet</p>
//                             <p className="text-xs mt-1">Click upload to add images to server</p>
//                           </div>
//                         )}
//                       </div>
//                     </DialogContent>
//                   </Dialog>

//                   <Button
//                     onClick={handleRunDOM}
//                     disabled={isRunning}
//                     size="sm"
//                     className="gap-2 bg-emerald-600 hover:bg-emerald-700"
//                   >
//                     {isRunning ? (
//                       <>
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                         Running...
//                       </>
//                     ) : (
//                       <>
//                         <Play className="w-4 h-4" />
//                         Run (DOM)
//                       </>
//                     )}
//                   </Button>

//                   <Button
//                     onClick={handleRunImage}
//                     disabled={isRunningImage}
//                     size="sm"
//                     className="gap-2 bg-blue-600 hover:bg-blue-700"
//                   >
//                     {isRunningImage ? (
//                       <>
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                         Running...
//                       </>
//                     ) : (
//                       <>
//                         <ImageIcon className="w-4 h-4" />
//                         Run (Image)
//                       </>
//                     )}
//                   </Button>

//                   <Dialog open={isViewScriptOpen} onOpenChange={setIsViewScriptOpen}>
//                     <DialogTrigger asChild>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={handleViewScript}
//                         disabled={isLoadingScript}
//                         className="gap-2 border-slate-300 hover:bg-slate-100 bg-white"
//                       >
//                         {isLoadingScript ? (
//                           <>
//                             <Loader2 className="w-4 h-4 animate-spin" />
//                             Loading...
//                           </>
//                         ) : (
//                           <>
//                             <Eye className="w-4 h-4" />
//                             View Script
//                           </>
//                         )}
//                       </Button>
//                     </DialogTrigger>
//                     <DialogContent className="max-w-3xl">
//                       <DialogHeader>
//                         <DialogTitle>Generated Script</DialogTitle>
//                       </DialogHeader>
//                       <pre className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono text-slate-800">
//                         {generatedScriptContent || "No script content available"}
//                       </pre>
//                     </DialogContent>
//                   </Dialog>
//                 </div>
//               </div>

//               <div
//                 ref={editorRef}
//                 contentEditable
//                 onPaste={handlePaste}
//                 onInput={handleEditorInput}
//                 className="min-h-[200px] p-3 font-mono text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white overflow-auto"
//                 style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
//                 suppressContentEditableWarning
//               />
//               <p className="text-xs text-slate-500 mt-1">
//                 💡 Bạn có thể gõ text và paste ảnh trực tiếp (Ctrl+V).
//               </p>

//               {parsedLines.length > 0 && (
//                 <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
//                   <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
//                   <div className="space-y-3">
//                     {parsedLines.map((line, index) => (
//                       <div key={index} className="flex items-start gap-3">
//                         {line.type === "image" ? (
//                           <>
//                             {line.prefix && (
//                               <span className="text-sm text-slate-700 whitespace-nowrap py-1">{line.prefix}</span>
//                             )}
//                             <div className="flex-shrink-0">
//                               <img
//                                 src={line.imageUrl || "/placeholder.svg"}
//                                 alt={`Preview ${index + 1}`}
//                                 className="w-10 h-auto rounded border border-slate-300"
//                                 onError={(e) => {
//                                   const target = e.target as HTMLImageElement
//                                   target.src = "/image-error.png"
//                                 }}
//                               />
//                             </div>
//                           </>
//                         ) : (
//                           <span className="text-sm text-slate-700 py-1">{line.content || " "}</span>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   )
// }