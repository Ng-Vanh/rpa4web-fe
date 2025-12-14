// components/ScriptPreview.tsx
import { ParsedLine } from "../types"

interface ScriptPreviewProps {
  lines: ParsedLine[]
}

export function ScriptPreview({ lines }: ScriptPreviewProps) {
  // Kiểm tra xem có nội dung thực sự không
  const hasContent = lines.some(line => 
    line.type === "image" || (line.type === "text" && line.content.trim())
  )

  return (
    <div className="mt-4">
      {/* Header nằm ngoài box */}
      <h3 className="text-sm font-medium text-slate-700 mb-2">Preview</h3>

      {/* Box chứa content */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        {!hasContent ? (
          // Empty state - centered
          <div className="flex items-center justify-center min-h-[30px]">
            <p className="text-slate-400 text-sm">
              Your script preview will appear here
            </p>
          </div>
        ) : (
          // Có content - hiển thị bình thường
          <div className="space-y-3">
            {lines.map((line, index) => {
              // Bỏ qua dòng text rỗng
              if (line.type === "text" && !line.content.trim()) {
                return null
              }

              return (
                <div key={index} className="flex items-start gap-3">
                  {line.type === "image" ? (
                    <>
                      {line.prefix && (
                        <span className="text-sm text-slate-700 whitespace-nowrap py-1">
                          {line.prefix}
                        </span>
                      )}
                      <div className="flex-shrink-0">
                        <img
                          src={line.imageUrl || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-10 h-auto rounded border border-slate-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src =
                                "data:image/svg+xml;utf8," +
                                encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="3" y1="3" x2="21" y2="21"/>
                                </svg>
                                `)
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-slate-700 py-1">
                      {line.content}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}