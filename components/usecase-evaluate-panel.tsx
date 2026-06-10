"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getIssuesForField,
  type TrackingUsecaseAnalysis,
  type TrackingUsecaseIssue,
} from "@/service/tracking-usecase"

interface UsecaseEvaluatePanelProps {
  analyses: TrackingUsecaseAnalysis[]
}

function severityVariant(severity?: string): "default" | "secondary" | "destructive" | "outline" {
  const value = severity?.toLowerCase()
  if (value === "high") return "destructive"
  if (value === "medium") return "default"
  return "secondary"
}

function IssueBlock({ issue }: { issue: TrackingUsecaseIssue }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {issue.type && <Badge variant="outline">{issue.type}</Badge>}
        {issue.severity && <Badge variant={severityVariant(issue.severity)}>{issue.severity}</Badge>}
        {issue.location && (
          <span className="text-xs text-muted-foreground font-mono">{issue.location}</span>
        )}
      </div>
      {issue.description && <p>{issue.description}</p>}
      {issue.reason && (
        <p>
          <span className="font-medium text-muted-foreground">Lý do: </span>
          {issue.reason}
        </p>
      )}
      {issue.suggestion && (
        <p>
          <span className="font-medium text-muted-foreground">Gợi ý: </span>
          {issue.suggestion}
        </p>
      )}
    </div>
  )
}

function FieldComment({ issues }: { issues: TrackingUsecaseIssue[] }) {
  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <IssueBlock key={`${issue.location}-${index}`} issue={issue} />
      ))}
    </div>
  )
}

export function UsecaseEvaluatePanel({ analyses }: UsecaseEvaluatePanelProps) {
  const analysesWithComments = analyses.filter((analysis) => {
    const issues = analysis.evaluation?.issues
    return Array.isArray(issues) && issues.length > 0
  })

  if (analysesWithComments.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Không có nhận xét LLM cho các bảng use case.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {analysesWithComments.map((analysis) => {
        const rows = Array.isArray(analysis.data) ? analysis.data : []
        const evaluation = analysis.evaluation
        const issues = Array.isArray(evaluation?.issues) ? evaluation!.issues! : []
        const matchedIssueIndexes = new Set<number>()

        rows.forEach((row) => {
          getIssuesForField(issues, row["0"] || "").forEach((issue) => {
            matchedIssueIndexes.add(issues.indexOf(issue))
          })
        })

        const unmatchedIssues = issues.filter((_, index) => !matchedIssueIndexes.has(index))

        return (
          <Card key={analysis.table_id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base">
                    {analysis.caption?.trim() || `Bảng ${analysis.table_id}`}
                  </CardTitle>
                  <CardDescription>
                    {analysis.pages?.range ? `Trang ${analysis.pages.range}` : null}
                    {analysis.description ? ` · ${analysis.description}` : null}
                  </CardDescription>
                </div>
                {evaluation?.is_consistent != null && (
                  <Badge variant={evaluation.is_consistent ? "secondary" : "destructive"}>
                    {evaluation.is_consistent ? "Nhất quán" : "Có vấn đề"}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {evaluation?.summary && (
                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-muted-foreground mb-1">Tổng quan LLM</p>
                  <p>{evaluation.summary}</p>
                </div>
              )}

              {rows.length > 0 && (
              <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden min-h-[240px]">
                <div className="border-r bg-slate-50/60 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Bảng gốc
                  </h3>
                </div>
                <div className="bg-amber-50/40 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Nhận xét LLM
                  </h3>
                </div>

                {rows.map((row, index) => {
                  const fieldName = row["0"] || `Trường ${index + 1}`
                  const fieldValue = row["1"] || ""
                  const fieldIssues = getIssuesForField(issues, fieldName)

                  return (
                    <div key={`${analysis.table_id}-${index}`} className="contents">
                      <div className="border-t border-r p-3 bg-white">
                        <p className="text-xs font-semibold text-muted-foreground mb-1 whitespace-pre-wrap">
                          {fieldName}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{fieldValue || "—"}</p>
                      </div>
                      <div className="border-t p-3 bg-white">
                        {fieldIssues.length > 0 && <FieldComment issues={fieldIssues} />}
                      </div>
                    </div>
                  )
                })}

                {unmatchedIssues.length > 0 && (
                  <>
                    <div className="border-t border-r p-3 bg-white">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Nhận xét chung</p>
                      <p className="text-sm text-muted-foreground">Các vấn đề không gắn trực tiếp với một trường cụ thể.</p>
                    </div>
                    <div className="border-t p-3 bg-white space-y-2">
                      {unmatchedIssues.map((issue, index) => (
                        <IssueBlock key={`unmatched-${analysis.table_id}-${index}`} issue={issue} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
