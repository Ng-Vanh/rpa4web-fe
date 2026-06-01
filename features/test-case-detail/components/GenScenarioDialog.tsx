"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Image as ImageIcon, Link as LinkIcon } from "lucide-react"

interface GenScenarioDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (imageUrl: string) => Promise<void>
  onUploadImage: (file: File) => Promise<string | null>
}

export function GenScenarioDialog({ 
  isOpen, 
  onOpenChange, 
  onGenerate,
  onUploadImage 
}: GenScenarioDialogProps) {
  const [imageUrl, setImageUrl] = useState("")
  const [pastedImage, setPastedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [inputMethod, setInputMethod] = useState<"url" | "paste">("url")
  const pasteAreaRef = useRef<HTMLDivElement>(null)

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Xử lý paste ảnh
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        const file = new File([blob], `flowchart-${Date.now()}.png`, { type: blob.type })
        setPastedImage(file)
        
        // Tạo preview
        const preview = URL.createObjectURL(blob)
        setPreviewUrl(preview)
        setInputMethod("paste")
        return
      }
      
      // Xử lý paste text (URL)
      if (item.type === "text/plain") {
        item.getAsString((text) => {
          if (text.match(/^https?:\/\//i)) {
            setImageUrl(text)
            setInputMethod("url")
          }
        })
      }
    }
  }

  const handleGenerate = async () => {
    try {
      let finalImageUrl = imageUrl

      // Nếu có ảnh paste, upload lên server trước
      if (pastedImage && inputMethod === "paste") {
        setIsUploading(true)
        const uploadedUrl = await onUploadImage(pastedImage)
        
        if (!uploadedUrl) {
          alert("Lỗi khi upload ảnh!")
          setIsUploading(false)
          return
        }
        
        finalImageUrl = uploadedUrl
        setIsUploading(false)
      }

      // Kiểm tra có URL không
      if (!finalImageUrl.trim()) {
        alert("Vui lòng nhập URL ảnh hoặc paste ảnh!")
        return
      }

      // Gọi hàm generate với URL
      await onGenerate(finalImageUrl)
      
      // Reset và đóng dialog
      handleClose()
    } catch (error) {
      console.error("Error in handleGenerate:", error)
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setImageUrl("")
    setPastedImage(null)
    setPreviewUrl(null)
    setInputMethod("url")
    onOpenChange(false)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setInputMethod("url")
    // Clear pasted image nếu đang nhập URL
    setPastedImage(null)
    setPreviewUrl(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Test Scenario from Flowchart</DialogTitle>
          <DialogDescription>
            Paste an image URL or paste an image directly from your clipboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Image URL
            </label>
            <Input
              placeholder="https://example.com/flowchart.png"
              value={imageUrl}
              onChange={handleUrlChange}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-500 uppercase">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Paste Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Paste Image (Ctrl+V)
            </label>
            <div
              ref={pasteAreaRef}
              contentEditable
              onPaste={handlePaste}
              className="min-h-[150px] p-4 border-2 border-dashed border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 flex items-center justify-center cursor-text"
            >
              {previewUrl ? (
                <div className="space-y-2 text-center">
                  <img 
                    src={previewUrl} 
                    alt="Pasted preview" 
                    className="max-h-32 mx-auto rounded border border-slate-300"
                  />
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Image ready to upload
                  </p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Click here and press Ctrl+V to paste image</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview URL input if image was pasted */}
          {inputMethod === "paste" && pastedImage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📸 Image will be uploaded to: <code className="bg-blue-100 px-1 py-0.5 rounded">uploads/stepImg/obj_upload/</code>
              </p>
            </div>
          )}

          {/* Preview URL if entered */}
          {inputMethod === "url" && imageUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">Preview:</p>
              <img 
                src={imageUrl} 
                alt="URL preview" 
                className="max-h-32 rounded border border-slate-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.parentElement!.innerHTML += '<p class="text-red-500 text-sm">❌ Invalid image URL</p>'
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isUploading || (!imageUrl && !pastedImage)}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Generate Scenario
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}