// types.ts - Chứa tất cả interface và type definitions

export interface ParsedLine {
  type: "text" | "image"
  content: string
  imageUrl?: string
  prefix?: string
}

export interface UploadedImage {
  filename: string
  url: string
  size: string
}

export interface TestCase {
  id: number
  testItem: string
  testClassification: string
  runConfig?: string
}

export interface TestCaseDetailScreenProps {
  onBack?: () => void
  testCase?: TestCase
  initialView?: string
}

export interface TimingInfo {
  pythonExecutionTime?: number
  totalProcessingTime?: number
  startTimestamp?: number
  endTimestamp?: number
}

export interface ApiResponse {
  status: "success" | "error"
  message?: string
  url?: string
  images?: UploadedImage[]
  output?: string
  generatedScript?: string
  scenario?: string
  content?: string
  stepId?: number
  id?: number
  actionDescription?: string
  scriptCode?: string
  stepOrder?: number
  inputData?: string
  expectedOutput?: string
  timing?: TimingInfo
  fullOutput?: string
  exitCode?: number
}