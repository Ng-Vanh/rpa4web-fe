"use client"
// components/ViewScriptDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, Save, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface ViewScriptDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  content: string
  onSaveScriptCode: (content: string) => Promise<void>
  isSavingScript: boolean
}

export function ViewScriptDialog({ 
  isOpen, 
  onOpenChange, 
  content, 
  onSaveScriptCode,
  isSavingScript 
}: ViewScriptDialogProps) {
  const [editableContent, setEditableContent] = useState(content)
  const [copied, setCopied] = useState(false)

  // Update editableContent when content prop changes
  useEffect(() => {
    setEditableContent(content)
  }, [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error copying:", error)
    }
  }

  const handleSave = async () => {
    await onSaveScriptCode(editableContent)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col"
        style={{ 
          maxWidth: "90vw", 
          width: "1000px",
          maxHeight: "85vh",
          height: "85vh"
        }}
      >
        <DialogHeader>
          <DialogTitle>Generated Script</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden relative pt-2">
          <div className="absolute top-4 right-2 z-10 flex gap-2">
            {/* Nút Save Script Code */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSavingScript}
              className="gap-2 bg-white shadow-sm hover:bg-green-50 border-green-300 text-green-700"
            >
              {isSavingScript ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>

            {/* Nút Copy */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2 bg-white shadow-sm hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <textarea
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            className="w-full h-full bg-slate-50 p-4 pr-32 rounded-lg overflow-auto text-sm font-mono text-slate-800 border-2 border-slate-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
            placeholder="No script content available"
            spellCheck={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}