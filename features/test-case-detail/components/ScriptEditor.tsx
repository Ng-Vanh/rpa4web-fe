// components/ScriptEditor.tsx

import type React from "react"

interface ScriptEditorProps {
  editorRef: React.RefObject<HTMLDivElement>
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void
  onInput: () => void
}

export function ScriptEditor({ editorRef, onPaste, onInput }: ScriptEditorProps) {
  return (
    <div>
    <p className="text-xs text-slate-500 mb-2">
  💡 Bạn có thể gõ text và paste ảnh trực tiếp (Ctrl+V).
</p>

      <div
        ref={editorRef}
        contentEditable
        onPaste={onPaste}
        onInput={onInput}
        className="min-h-[200px] p-3 font-mono text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white overflow-auto"
        style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
        suppressContentEditableWarning
      />
    </div>
  )
}