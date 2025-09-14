"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Eye, ArrowRight } from "lucide-react"

interface SRSUploadScreenProps {
  onBack: () => void
  onContinueToWorkspace: (srsData: any) => void
}

export function SRSUploadScreen({ onBack, onContinueToWorkspace }: SRSUploadScreenProps) {
  const [uploadStep, setUploadStep] = useState<"select" | "uploading" | "success">("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [uploadedSRS, setUploadedSRS] = useState<any>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadedFileContent(null)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedFile) return

    setUploadStep("uploading")

    // Simulate upload process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockPdfContent = `
Software Requirements Specification
${selectedFile.name}

1. INTRODUCTION
This document specifies the requirements for the ${selectedFile.name.replace(/\.[^/.]+$/, "")} system.

2. FUNCTIONAL REQUIREMENTS
2.1 User Authentication
- The system shall provide user login functionality
- The system shall validate user credentials
- The system shall maintain user sessions

2.2 Data Management
- The system shall allow data input and validation
- The system shall store data securely
- The system shall provide data retrieval capabilities

3. NON-FUNCTIONAL REQUIREMENTS
3.1 Performance
- The system shall respond within 2 seconds for standard operations
- The system shall support up to 100 concurrent users

3.2 Security
- All data transmissions shall be encrypted
- User passwords shall be hashed and salted
- The system shall implement role-based access control

4. USER INTERFACE REQUIREMENTS
- The interface shall be responsive and mobile-friendly
- The system shall provide clear error messages
- Navigation shall be intuitive and consistent

This is a simulated PDF content for demonstration purposes.
    `.trim()

    const newSRS = {
      id: Date.now(),
      name: selectedFile.name.replace(/\.[^/.]+$/, ""),
      description: `SRS document for ${selectedFile.name.replace(/\.[^/.]+$/, "")} system`,
      file_path: `/uploads/${selectedFile.name}`,
      uploaded_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setUploadedFileContent(mockPdfContent)
    setUploadedSRS(newSRS)
    setUploadStep("success")
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

                {uploadedFileContent && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="h-5 w-5 mr-2" />
                        Document Content Preview
                      </CardTitle>
                      <CardDescription>Preview of the uploaded SRS document</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 overflow-y-auto bg-muted/30 p-6 rounded-lg border w-full">
                        <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                          {uploadedFileContent}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
