// components/TestCaseInfo.tsx

import { Badge } from "@/components/ui/badge"
import { TestCase } from "../types"

interface TestCaseInfoProps {
  testCase: TestCase
}

export function TestCaseInfo({ testCase }: TestCaseInfoProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 font-medium">ID:</span>
        <span className="font-semibold text-slate-900">#{testCase.id}</span>
      </div>
      <div className="h-4 w-px bg-slate-300" />
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 font-medium">Test Item:</span>
        <span className="text-slate-900">{testCase.testItem}</span>
      </div>
      <div className="h-4 w-px bg-slate-300" />
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0">
        {testCase.testClassification}
      </Badge>
      <div className="h-4 w-px bg-slate-300" />
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 font-medium">Run Config: Chrome</span>
        <span className="text-slate-700">{testCase.runConfig}</span>
      </div>
    </div>
  )
}