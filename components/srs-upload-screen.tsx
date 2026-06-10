"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Eye, ArrowRight, Maximize2, X } from "lucide-react"
import { uploadSrsDocument } from "@/service/srs_document"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getSrsPreview } from "@/service/srs_document"

interface SRSUploadScreenProps {
  onBack: () => void
  onContinueToWorkspace: (srsData: any) => void
}

export function SRSUploadScreen({ onBack, onContinueToWorkspace }: SRSUploadScreenProps) {
  const [uploadStep, setUploadStep] = useState<"select" | "uploading" | "success">("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedSRS, setUploadedSRS] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadedFileContent(null)
      setUploadError(null)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile) return

    setUploadStep("uploading")
    setUploadError(null)

    try {
      // Tạo FormData để upload file
      const formData = new FormData()
      
      // Debug file info
      console.log('Selected file info:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified
      })
      
      // Kiểm tra file có empty không
      if (selectedFile.size === 0) {
        throw new Error("File is empty. Please select a valid file.");
      }
      
      // Kiểm tra file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        throw new Error(`File type ${selectedFile.type} is not supported. Please select PDF, DOC, DOCX, or TXT file.`);
      }
      
      formData.append('file', selectedFile)
      formData.append('name', selectedFile.name.replace(/\.[^/.]+$/, ""))
      formData.append('description', `SRS document for ${selectedFile.name.replace(/\.[^/.]+$/, "")} system`)
      formData.append('originalName', selectedFile.name) // Thêm original name

      // Gọi API upload thật
      const response = await uploadSrsDocument(formData)
      
      console.log('Upload response:', response)
      console.log('Upload response data:', (response as any)?.data)
      console.log('Upload response status:', (response as any)?.status)

      // Chuẩn hóa đối tượng trả về và ID SRS
      const resp: any = response as any
      const srsId: number | undefined =
        resp?.document?.id ?? resp?.id ?? resp?.srsId ?? resp?.data?.id ?? resp?.data?.srsId
      if (!srsId) {
        throw new Error("Không lấy được SRS id từ phản hồi upload")
      }

      const backendDoc = resp?.document ?? (resp?.data?.document)
      const newSRS = backendDoc || {
        id: srsId,
        name: selectedFile.name.replace(/\.[^/.]+$/, ""),
        description: `SRS document for ${selectedFile.name.replace(/\.[^/.]+$/, "")} system`,
        filePath: resp?.filePath || `/uploads/${selectedFile.name}`,
        uploadedBy: { id: 0, username: "" },
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      // đảm bảo có id đúng
      newSRS.id = newSRS.id ?? srsId
      
      // Gọi preview API để lấy PDF blob và tạo object URL
      // try {
      //   const blob = await getSrsPreview(srsId)
      //   const url = URL.createObjectURL(blob)
      //   setPreviewUrl(url)
      // } catch (e) {
      //   console.warn('Load preview failed:', e)
      // }

      // ducpreview
      try {  // Đợi 2 giây để backend xử lý file lớn  
        await new Promise(resolve => setTimeout(resolve, 2000))    
      // Retry logic với max 3 lần  
        let blob: Blob | null = null  
        let lastError: any = null    
        
        for (let attempt = 1; attempt <= 3; attempt++) {    
          try {      
            blob = await getSrsPreview(srsId)      
            break // Thành công, thoát loop    
          } catch (e) {      
            lastError = e      
            console.warn(`Preview attempt ${attempt}/3 failed:`, e)   
          
            // Đợi thêm trước lần retry tiếp theo (2s, 4s, 8s)      
            if (attempt < 3) {        
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt))      
            }    
          }  
        }    
        if (blob) {    
          const url = URL.createObjectURL(blob)    
          setPreviewUrl(url)  
        } else {    
          console.warn('Load preview failed after 3 attempts:', lastError)  
        }
      } catch (e) {  
        console.warn('Load preview failed:', e)
      }

      setUploadedFileContent(null)
      setUploadedSRS(newSRS)
      setUploadStep("success")
      
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || "Failed to upload file")
      setUploadStep("select")
    }
  }

  const handleContinue = () => {
    if (uploadedSRS) {
      onContinueToWorkspace(uploadedSRS)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-xl font-semibold">Upload SRS Document</h1>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            {/* <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload SRS Document
            </CardTitle> */}
            <CardDescription>
              {uploadStep === "select" && "Select an SRS file to upload"}
              {uploadStep === "uploading" && "Uploading your SRS document..."}
              {/* {uploadStep === "success" && "Upload completed successfully!"} */}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {uploadStep === "select" && (
              <>
                <div className="space-y-4">
                  <input
                    type="file"
                    id="srs-file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="srs-file"
                    className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : "Click to select SRS file"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOC, DOCX, TXT</p>
                    </div>
                  </label>
                </div>

                {uploadError && (
                  <Alert variant="destructive">
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={onBack}>
                    Cancel
                  </Button>
                  <Button onClick={handleUploadFile} disabled={!selectedFile}>
                    Upload
                  </Button>
                </div>
              </>
            )}

            {uploadStep === "uploading" && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Processing your SRS document...</p>
              </div>
            )}

            {uploadStep === "success" && (
              <>
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Upload Successful!</h3>
                  {/* <p className="text-sm text-muted-foreground">
                    Your SRS document has been uploaded and processed successfully.
                  </p> */}
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Eye className="h-5 w-5 mr-2" />
                          Document Content Preview
                        </CardTitle>
                        <CardDescription>Preview of the uploaded SRS document</CardDescription>
                      </div>
                      {previewUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPreviewModalOpen(true)}
                          className="flex items-center"
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Expand View
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-96 rounded-lg border"
                        title="SRS Preview"
                      />
                    ) : (
                      <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                        Không tải được preview PDF. Kiểm tra API /srs/{"{id}"}/preview.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleContinue} className="flex items-center">
                    Continue to Workspace
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent
          className="
            w-[100vw] h-[100vh]      /* chiếm đủ màn hình */
            max-w-none               /* bỏ mọi giới hạn max-width mặc định */
            sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none
            p-0 flex flex-col
          "
        >
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              SRS Document - Full View
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-0 flex-1">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full rounded-lg border" title="SRS Document Full View" />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground border rounded-lg">
                Không tải được preview PDF. Kiểm tra API /srs/{"{id}"}/preview.
              </div>
            )}
          </div>
        </DialogContent>
        {/* <DialogContent 
          className="max-w-[200vw] max-h-[100vh] w-[100vw] h-[100vh] p-0 flex flex-col"
          style={{
            maxWidth: '200vw !important',
            maxHeight: '100vh !important',
            width: '200vw !important',
            height: '100vh !important',
            margin: '0 !important'
          }}
        >
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              SRS Document - Full View
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-0 flex-1">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border"
                title="SRS Document Full View"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground border rounded-lg">
                Không tải được preview PDF. Kiểm tra API /srs/{"{id}"}/preview.
              </div>
            )}
          </div>
        </DialogContent> */}
      </Dialog>

    </div>
  )
}