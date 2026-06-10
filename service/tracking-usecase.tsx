import { apiClient } from "./api-client"
import type { EvaluateRequestOptions } from "./tracking-heading"

export async function processTrackingUsecase(srsId: number, options: EvaluateRequestOptions = {}) {
  const response = await apiClient.post(`/generation/srs/${srsId}/evaluate/usecase-analysis`, {
    useCache: options.useCache ?? true,
  })
  return response.data
}

export interface TrackingUsecaseTableRow {
  "0": string
  "1": string
}

export interface TrackingUsecaseIssue {
  type?: string
  severity?: string
  location?: string
  description?: string
  reason?: string
  suggestion?: string
}

export interface TrackingUsecaseEvaluation {
  is_consistent?: boolean
  issues?: TrackingUsecaseIssue[]
  summary?: string
}

export interface TrackingUsecaseAnalysis {
  table_id: number
  description?: string
  caption?: string
  pages?: {
    first?: number
    last?: number
    range?: string
  }
  rows?: number
  columns?: number
  data?: TrackingUsecaseTableRow[]
  evaluation?: TrackingUsecaseEvaluation
}

export interface TrackingUsecaseResponse {
  analyses?: TrackingUsecaseAnalysis[]
  [key: string]: unknown
}

export function getUsecaseAnalyses(data: unknown): TrackingUsecaseAnalysis[] {
  if (!data || typeof data !== "object") return []
  const analyses = (data as TrackingUsecaseResponse).analyses
  return Array.isArray(analyses) ? analyses : []
}

export function normalizeFieldLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase()
}

export function getIssuesForField(
  issues: TrackingUsecaseIssue[],
  fieldName: string,
): TrackingUsecaseIssue[] {
  const normalizedField = normalizeFieldLabel(fieldName)
  if (!normalizedField) return []

  return issues.filter((issue) => {
    const location = normalizeFieldLabel(issue.location || "")
    if (!location) return false
    return (
      location.includes(normalizedField) ||
      normalizedField.includes(location) ||
      location.startsWith(normalizedField)
    )
  })
}
