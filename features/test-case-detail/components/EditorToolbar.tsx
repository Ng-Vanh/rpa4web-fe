// components/EditorToolbar.tsx

import { Button } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import { Play, Eye, ImageIcon, Loader2, Save } from "lucide-react"

interface EditorToolbarProps {
  imageCount: number
  isRunning: boolean
  isRunningImage: boolean
  isLoadingScript: boolean
  isSaving: boolean
  onRunDOM: () => void
  onRunImage: () => void
  onViewScript: () => void
  onSaveActionDescription: () => void
}

export function EditorToolbar({
  imageCount,
  isRunning,
  isRunningImage,
  isLoadingScript,
  isSaving,
  onRunDOM,
  onRunImage,
  onViewScript,
  onSaveActionDescription,
}: EditorToolbarProps) {
  return (
    <div className="flex gap-2">
      {/* Image Library button - là DialogTrigger */}
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300 hover:bg-slate-100 bg-white"
        >
          <ImageIcon className="w-4 h-4" />
          Image Library ({imageCount})
        </Button>
      </DialogTrigger>

      {/* Nút Save Action Description */}
      <Button
        onClick={onSaveActionDescription}
        disabled={isSaving}
        size="sm"
        variant="outline"
        className="gap-2 border-green-300 hover:bg-green-50 bg-white text-green-700"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Test Case
          </>
        )}
      </Button>

      <Button
        onClick={onRunDOM}
        disabled={isRunning}
        size="sm"
        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run (DOM)
          </>
        )}
      </Button>

      <Button
        onClick={onRunImage}
        disabled={isRunningImage}
        size="sm"
        className="gap-2 bg-blue-600 hover:bg-blue-700"
      >
        {isRunningImage ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            Run (Image)
          </>
        )}
      </Button>

      {/* View Script button - chỉ là button thường, không phải DialogTrigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewScript}
        disabled={isLoadingScript}
        className="gap-2 border-slate-300 hover:bg-slate-100 bg-white"
      >
        {isLoadingScript ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            View Script
          </>
        )}
      </Button>
    </div>
  )
}