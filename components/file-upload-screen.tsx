"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, FileText, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadScreenProps {
  onComplete: (fileData: any) => void
  onBack: () => void
}

export function FileUploadScreen({ onComplete, onBack }: FileUploadScreenProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)

    // Simulate file upload process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsUploading(false)
    setUploadSuccess(true)

    // Simulate successful upload with file data
    const fileData = {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      uploadedAt: new Date().toISOString(),
    }

    // Auto-proceed to config after successful upload
    setTimeout(() => {
      onComplete(fileData)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Upload SRS Document</h1>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload SRS File
            </CardTitle>
            <CardDescription>Select and upload your Software Requirements Specification document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="srs-file">SRS Document</Label>
              <Input
                id="srs-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                disabled={isUploading || uploadSuccess}
              />
              <p className="text-sm text-muted-foreground">Supported formats: PDF, DOC, DOCX, TXT</p>
            </div>

            {selectedFile && !uploadSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}

            {uploadSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>File uploaded successfully! Proceeding to configuration...</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleUpload} disabled={!selectedFile || isUploading || uploadSuccess} className="w-full">
              {isUploading ? "Uploading..." : uploadSuccess ? "Upload Complete" : "Upload File"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
