"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Loader2 } from "lucide-react"
import { HeadingPdfViewer } from "@/components/heading-pdf-viewer"
import type { HeadingPdfMatch } from "@/lib/heading-pdf-search"
import {
  buildHeadingRowKey,
  extractTitleRaw,
  getEmptyHeadings,
  getHeadingSearchTargets,
  parseHeadingRowKey,
} from "@/service/tracking-heading"

interface HeadingEvaluatePanelProps {
  headingData: unknown
  pdfUrl: string | null
  pdfLoading: boolean
  selectedHeadingKey: string | null
  titleMatchIndex: number
  shouldScrollPdf: boolean
  onHeadingClick: (headingKey: string) => void
  onRetryLoadPdf: () => void
}

export function HeadingEvaluatePanel({
  headingData,
  pdfUrl,
  pdfLoading,
  selectedHeadingKey,
  titleMatchIndex,
  shouldScrollPdf,
  onHeadingClick,
  onRetryLoadPdf,
}: HeadingEvaluatePanelProps) {
  const emptyHeadings = useMemo(() => getEmptyHeadings(headingData), [headingData])
  const searchTargets = useMemo(() => getHeadingSearchTargets(headingData), [headingData])
  const [pdfMatchCounts, setPdfMatchCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    setPdfMatchCounts({})
  }, [headingData, pdfUrl])

  const handleSearchResults = useCallback((results: Record<string, HeadingPdfMatch[]>) => {
    setPdfMatchCounts(
      Object.fromEntries(Object.entries(results).map(([key, matches]) => [key, matches.length])),
    )
  }, [])

  const selectedTitleLabel = selectedHeadingKey
    ? parseHeadingRowKey(selectedHeadingKey)?.title ?? selectedHeadingKey
    : null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <h2 className="text-base font-semibold whitespace-nowrap">Empty Headings</h2>
          <Badge variant="secondary" className="text-xs">
            {emptyHeadings.length}
          </Badge>
        </div>
        {selectedTitleLabel && (
          <Badge variant="outline" className="max-w-[180px] truncate text-xs">
            {selectedTitleLabel}
          </Badge>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-72 max-w-[30%] flex-shrink-0 h-full overflow-y-auto overscroll-contain border-r bg-white p-3">
          {emptyHeadings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có empty heading nào trong response.</p>
          ) : (
            <div className="space-y-2">
              {emptyHeadings.map((item, index) => {
                const titleRaw = extractTitleRaw(item)
                const displayTitle = titleRaw || "(Không có title)"
                const headingKey = titleRaw ? buildHeadingRowKey(index, titleRaw) : null
                const matchCount = headingKey ? pdfMatchCounts[headingKey] ?? null : null

                return (
                  <button
                    key={headingKey ?? `empty-${index}`}
                    type="button"
                    onClick={() => headingKey && onHeadingClick(headingKey)}
                    disabled={!headingKey}
                    className={`w-full text-left rounded-md border p-2 text-xs leading-snug transition-colors ${
                      selectedHeadingKey === headingKey
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    } ${!headingKey ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{index + 1}.</span>
                        {displayTitle}
                      </div>
                      {headingKey && matchCount !== null && (
                        <Badge
                          variant={matchCount > 0 ? "outline" : "destructive"}
                          className="text-[10px] px-1 py-0 flex-shrink-0"
                        >
                          {matchCount > 0 ? `${matchCount} PDF` : "0 PDF"}
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-gray-50">
          <div className="border-b bg-white px-4 py-3 flex items-center space-x-2 flex-shrink-0">
            <FileText className="h-4 w-4 text-gray-600" />
            <h3 className="text-base font-semibold">SRS Document</h3>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 relative">
            {pdfLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600">Đang tải PDF...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <HeadingPdfViewer
                key={pdfUrl}
                pdfUrl={pdfUrl}
                searchTargets={searchTargets}
                selectedKey={selectedHeadingKey}
                matchIndex={titleMatchIndex}
                shouldScroll={shouldScrollPdf}
                onSearchResults={handleSearchResults}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-2">Không thể tải PDF</p>
                  <Button variant="outline" size="sm" onClick={onRetryLoadPdf} className="mt-4">
                    Thử lại
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
