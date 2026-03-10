"use client"

import type React from "react"
import { useMemo } from "react" // ← THÊM import
import { Card, CardContent } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"

import { TestCaseDetailScreenProps } from "./types"
import { DEFAULT_TEST_CASE } from "./constants"
import { parseScript, getScriptContentFromEditor } from "./utils"
import { useTestCaseDetail } from "./hooks/useTestCaseDetail"

import { TestCaseHeader } from "./components/TestCaseHeader"
import { TestCaseInfo } from "./components/TestCaseInfo"
import { ImageLibraryDialog } from "./components/ImageLibraryDialog"
import { ScriptEditor } from "./components/ScriptEditor"
import { ScriptPreview } from "./components/ScriptPreview"
import { EditorToolbar } from "./components/EditorToolbar"
import { ViewScriptDialog } from "./components/ViewScriptDialog"
import { GenScenarioDialog } from "./components/GenScenarioDialog"

export function TestCaseDetailScreen({ onBack, testCase, initialView }: TestCaseDetailScreenProps) {
  const currentTestCase = testCase || DEFAULT_TEST_CASE

  const {
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
    editorContent, // ← SỬ DỤNG state này
    runProgress,
    fileInputRef,
    editorRef,
    setIsImageLibraryOpen,
    setIsViewScriptOpen,
    setIsGenScenarioDialogOpen,
    setEditorContent,
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
  } = useTestCaseDetail(testCase)

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()

        const blob = item.getAsFile()
        if (!blob) continue

        const imageUrl = await handlePasteImage(
          new File([blob], `pasted-${Date.now()}.png`, { type: blob.type })
        )

        if (imageUrl) {
          const img = document.createElement("img")
          img.src = imageUrl
          img.className = "inline-block max-h-6 w-auto align-middle mx-1"
          img.contentEditable = "false"
          img.style.display = "inline"
          img.style.verticalAlign = "middle"

          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            range.deleteContents()
            range.insertNode(img)
            
            const space = document.createTextNode(" ")
            range.setStartAfter(img)
            range.insertNode(space)
            
            range.setStartAfter(space)
            range.setEndAfter(space)
            selection.removeAllRanges()
            selection.addRange(range)
          } else if (editorRef.current) {
            editorRef.current.appendChild(img)
          }

          // ✅ THÊM: Update state ngay sau khi insert image
          if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML)
          }
        }
      }
    }
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML)
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      console.log("Navigate back to test cases")
    }
  }

  const handleImageUploadWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageUpload(e.target.files)
    }
  }

  // ✅ FIX: Parse từ editorContent state, memoize để optimize performance
  const parsedLines = useMemo(() => {
    // Tạo temporary div để parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = editorContent
    return parseScript(getScriptContentFromEditor(tempDiv))
  }, [editorContent]) // Re-calculate khi editorContent thay đổi

  return (
    <div className="min-h-screen bg-slate-50">
      <TestCaseHeader
        onBack={handleBack}
        onOpenChrome={handleOpenChrome}
        onGenTestScenario={() => handleGenTestScenario(currentTestCase.id, currentTestCase.testItem)}
        isGeneratingScenario={isGeneratingScenario}
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <TestCaseInfo testCase={currentTestCase} />

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">
                  Paste your script here (text & images):
                </label>

                <Dialog open={isImageLibraryOpen} onOpenChange={setIsImageLibraryOpen}>
                  <EditorToolbar
                    imageCount={uploadedImages.length}
                    isRunning={isRunning}
                    isRunningImage={isRunningImage}
                    isLoadingScript={isLoadingScript}
                    isSaving={isSaving}
                    onRunDOM={handleRunDOM}
                    onRunImage={handleRunImage}
                    onViewScript={handleViewScript}
                    onSaveActionDescription={handleSaveActionDescription}
                  />

                  <ImageLibraryDialog
                    isOpen={isImageLibraryOpen}
                    onOpenChange={setIsImageLibraryOpen}
                    images={uploadedImages}
                    isUploading={isUploading}
                    copiedUrl={copiedUrl}
                    fileInputRef={fileInputRef}
                    onUpload={handleImageUploadWrapper}
                    onCopyUrl={handleCopyUrl}
                    onDelete={handleDeleteImage}
                  />
                </Dialog>
              </div>

              <ScriptEditor editorRef={editorRef} onPaste={handlePaste} onInput={handleEditorInput} />

              {/* ✅ parsedLines giờ được tính từ editorContent state */}
              <ScriptPreview 
                lines={parsedLines}
                progress={runProgress.steps}
                isRunning={runProgress.isRunning}
                currentStep={runProgress.currentStep}
                totalSteps={runProgress.totalSteps}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <ViewScriptDialog
        isOpen={isViewScriptOpen}
        onOpenChange={setIsViewScriptOpen}
        content={generatedScriptContent}
        onSaveScriptCode={handleSaveScriptCode}
        isSavingScript={isSavingScript}
      />

      <GenScenarioDialog
        isOpen={isGenScenarioDialogOpen}
        onOpenChange={setIsGenScenarioDialogOpen}
        onGenerate={handleGenTestScenarioWithImage}
        onUploadImage={handleUploadFlowchartImage}
      />
    </div>
  )
}