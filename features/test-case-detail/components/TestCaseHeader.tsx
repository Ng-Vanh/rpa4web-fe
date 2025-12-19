// components/TestCaseHeader.tsx

import { Button } from "@/components/ui/button"
import { ArrowLeft, Chrome, Wand2, Loader2 } from "lucide-react"

interface TestCaseHeaderProps {
  onBack: () => void
  onOpenChrome: () => void
  onGenTestScenario: () => void
  isGeneratingScenario?: boolean
}

export function TestCaseHeader({ 
  onBack, 
  onOpenChrome, 
  onGenTestScenario,
  isGeneratingScenario = false
}: TestCaseHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Test Cases
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <h1 className="text-lg font-semibold text-slate-900">Test Case Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onOpenChrome} className="gap-2 bg-transparent">
              <Chrome className="w-4 h-4" />
              Open Chrome
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onGenTestScenario}
              disabled={isGeneratingScenario}
              className="gap-2 bg-transparent min-w-[180px]"
            >
              {isGeneratingScenario ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Gen Test Scenario
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}