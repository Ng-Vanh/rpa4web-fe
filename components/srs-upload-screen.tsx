"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Eye, ArrowRight } from "lucide-react"
import { uploadSrsDocument } from "@/service/srs_document"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
      
      // Thử các field name khác nhau (backend có thể expect field name khác)
      formData.append('file', selectedFile)
      formData.append('document', selectedFile) // Thử field name khác
      formData.append('pdfFile', selectedFile)  // Thử field name khác
      formData.append('srsFile', selectedFile)  // Thử field name khác
      
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
      try {
        const blob = await getSrsPreview(srsId)
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
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
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload SRS Document
            </CardTitle>
            <CardDescription>
              {uploadStep === "select" && "Select an SRS file to upload"}
              {uploadStep === "uploading" && "Uploading your SRS document..."}
              {uploadStep === "success" && "Upload completed successfully!"}
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
                  <p className="text-sm text-muted-foreground">
                    Your SRS document has been uploaded and processed successfully.
                  </p>
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Document Content Preview
                    </CardTitle>
                    <CardDescription>Preview of the uploaded SRS document</CardDescription>
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
    </div>
  )
}
