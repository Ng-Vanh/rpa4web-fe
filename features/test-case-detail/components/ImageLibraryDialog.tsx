"use client"

import type React from "react"

// components/ImageLibraryDialog.tsx

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Trash2, Copy, Check, Loader2, ImageIcon } from "lucide-react"
import type { UploadedImage } from "../types"

interface ImageLibraryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  images: UploadedImage[]
  isUploading: boolean
  copiedUrl: string | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCopyUrl: (url: string) => void
  onDelete: (filename: string) => void
}

export function ImageLibraryDialog({
  isOpen,
  onOpenChange,
  images,
  isUploading,
  copiedUrl,
  fileInputRef,
  onUpload,
  onCopyUrl,
  onDelete,
}: ImageLibraryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Image Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={onUpload} accept="image/*" multiple className="hidden" />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Images
                </>
              )}
            </Button>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative group border border-slate-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  <img
                    src={img.url || "/placeholder.svg"}
                    alt={img.filename}
                    className="w-full h-40 object-contain rounded mb-2"
                  />
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 truncate">{img.filename}</p>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <input
                        type="text"
                        value={img.url}
                        readOnly
                        className="flex-1 text-xs bg-transparent border-none outline-none min-w-0 truncate"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCopyUrl(img.url)}
                        className="h-7 px-3 shrink-0"
                      >
                        {copiedUrl === img.url ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(img.filename)}
                      className="w-full h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No images uploaded yet</p>
              <p className="text-xs mt-1">Click upload to add images to server</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
