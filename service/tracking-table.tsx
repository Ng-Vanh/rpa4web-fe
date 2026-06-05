import { apiClient } from "./api-client"
import type { EvaluateRequestOptions } from "./tracking-heading"

export interface TableOcrRequestOptions extends EvaluateRequestOptions {
  ngrokBase?: string
}

export async function processTrackingTable(srsId: number, options: TableOcrRequestOptions = {}) {
  const response = await apiClient.post(`/generation/srs/${srsId}/evaluate/table-ocr`, {
    useCache: options.useCache ?? true,
    ngrokBase: options.ngrokBase,
  })
  return response.data
}

export interface TableContentItem {
  name: string
  content: string
}

export interface TrackingTableHtmlFile {
  filename: string
  content: string
}

export interface TrackingTableResponse {
  html_files?: TrackingTableHtmlFile[]
  [key: string]: unknown
}

function isTableHtml(value: string): boolean {
  return /<table[\s>]/i.test(value)
}

function toTableContentItem(value: unknown, fallbackName: string): TableContentItem | null {
  if (typeof value === "string" && value.trim()) {
    return { name: fallbackName, content: value }
  }

  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const content =
    typeof record.content === "string"
      ? record.content
      : typeof record.html === "string"
        ? record.html
        : typeof record.table === "string"
          ? record.table
          : null

  if (!content?.trim()) return null

  const name =
    typeof record.filename === "string" && record.filename.trim()
      ? record.filename.trim()
      : typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : typeof record.file === "string" && record.file.trim()
          ? record.file.trim()
          : fallbackName

  return { name, content }
}

export function extractTableContentItems(data: unknown): TableContentItem[] {
  if (data == null) return []

  if (typeof data === "string") {
    return isTableHtml(data) ? [{ name: "Kết quả", content: data }] : []
  }

  if (typeof data !== "object") return []

  const record = data as TrackingTableResponse
  const htmlFiles = record.html_files
  if (Array.isArray(htmlFiles)) {
    return htmlFiles.flatMap((item, index) => {
      const parsed = toTableContentItem(item, `table_${index + 1}.html`)
      return parsed ? [parsed] : []
    })
  }

  const arrayKeys = ["files", "tables", "items", "results"]

  for (const key of arrayKeys) {
    const items = record[key]
    if (!Array.isArray(items)) continue

    const mapped = items.flatMap((item, index) => {
      const parsed = toTableContentItem(item, `${key} ${index + 1}`)
      return parsed ? [parsed] : []
    })

    if (mapped.length > 0) return mapped
  }

  const single = toTableContentItem(data, "Kết quả")
  if (single && isTableHtml(single.content)) return [single]

  return []
}
