// components/ScriptPreview.tsx - FIXED: Don't show old progress
import { ParsedLine, StepProgress } from "../types"
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react"

interface ScriptPreviewProps {
  lines: ParsedLine[]
  progress?: StepProgress[]
  isRunning?: boolean
  currentStep?: number
  totalSteps?: number
}

export function ScriptPreview({ 
  lines, 
  progress = [],
  isRunning = false,
  currentStep = 0,
  totalSteps = 0
}: ScriptPreviewProps) {
  const contentLines = lines.filter(line => 
    line.type === "image" || (line.type === "text" && line.content.trim())
  )

  const hasContent = contentLines.length > 0
  
  // ✅ FIXED: Chỉ hiển thị progress nếu có actual progress data
  const hasProgress = progress.length > 0 && progress.some(p => p.status !== 'pending')

  const getStatusIcon = (status?: StepProgress['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null // ✅ CHANGED: Return null instead of empty circle
    }
  }

  const getStatusColor = (status?: StepProgress['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-white border-slate-200'
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Preview {isRunning && <span className="text-blue-600 font-semibold">(Running...)</span>}
        </h3>
        {isRunning && totalSteps > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Step {currentStep}/{totalSteps}</span>
          </div>
        )}
      </div>

      {/* Preview Box */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
        {!hasContent ? (
          <div className="flex items-center justify-center min-h-[80px] p-6">
            <p className="text-slate-400 text-sm">
              Your script preview will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {contentLines.map((line, index) => {
              const stepProgress = progress[index]
              
              // ✅ FIXED: Chỉ áp dụng status color nếu có progress thực sự
              const statusColor = (hasProgress && stepProgress) 
                ? getStatusColor(stepProgress.status) 
                : 'bg-white border-slate-200'
              
              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-3 transition-all duration-300 ${statusColor}`}
                >
                  {/* Step Number */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-sm font-medium text-slate-700">
                      {index + 1}
                    </div>
                    {/* ✅ FIXED: Chỉ hiển thị status icon nếu có progress */}
                    {hasProgress && stepProgress && getStatusIcon(stepProgress.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    {line.type === "image" ? (
                      <>
                        {line.prefix && (
                          <span className="text-sm text-slate-700 font-medium truncate">
                            {line.prefix}
                          </span>
                        )}
                        <div className="flex-shrink-0">
                          <img
                            src={line.imageUrl}
                            alt={`Step ${index + 1}`}
                            className="h-10 w-auto rounded border border-slate-300 shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "data:image/svg+xml;utf8," +
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
                      <span className="text-sm text-slate-700 font-medium truncate">
                        {line.content}
                      </span>
                    )}
                  </div>

                  {/* Status Message - Chỉ hiển thị khi có progress */}
                  {hasProgress && stepProgress?.message && (
                    <span className={`text-xs flex-shrink-0 font-medium ${
                      stepProgress.status === 'success' ? 'text-green-700' :
                      stepProgress.status === 'error' ? 'text-red-700' :
                      stepProgress.status === 'running' ? 'text-blue-700' :
                      'text-slate-500'
                    }`}>
                      {stepProgress.message}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Running Summary */}
      {isRunning && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Executing script...
            </span>
          </div>
          <span className="text-xs text-blue-700 font-medium">
            {currentStep} of {totalSteps} steps completed
          </span>
        </div>
      )}
    </div>
  )
}