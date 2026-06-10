import { apiClient } from "./api-client"

export interface EvaluateRequestOptions {
  useCache?: boolean
}

export async function processTrackingHeading(srsId: number, options: EvaluateRequestOptions = {}) {
  const response = await apiClient.post(`/generation/srs/${srsId}/evaluate/heading-scan`, {
    useCache: options.useCache ?? true,
  })
  return response.data
}

export interface EmptyHeadingItem {
  level?: number
  numbering?: string
  title?: string
  title_raw?: string
  heading?: string
  text?: string
  page_start?: number
  page_end?: number
  section_id?: string
  [key: string]: unknown
}

export interface TrackingHeadingResponse {
  empty_headings?: EmptyHeadingItem[]
  [key: string]: unknown
}

export interface HeadingSearchTarget {
  key: string
  label: string
  numbering?: string
  queries: string[]
}

export function extractTitleRaw(item: EmptyHeadingItem): string | null {
  const candidates = [item.title_raw, item.title, item.heading, item.text]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function normalizeNumbering(value: string): string {
  return value.trim().replace(/\.$/, "")
}

function buildQueriesFromHeading(item: EmptyHeadingItem): string[] {
  const queries: string[] = []
  const seen = new Set<string>()

  const addQuery = (value: string) => {
    const normalized = value.replace(/(\.\.\.|…|\u2026)\s*$/u, "").trim()
    for (const candidate of [value.trim(), normalized]) {
      if (candidate.length < 2) continue
      const key = candidate.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      queries.push(candidate)
    }
  }

  const title = typeof item.title === "string" ? item.title.trim() : ""
  const titleRaw = typeof item.title_raw === "string" ? item.title_raw.trim() : ""
  const numbering =
    typeof item.numbering === "string" && item.numbering.trim()
      ? normalizeNumbering(item.numbering)
      : ""

  if (titleRaw) addQuery(titleRaw)

  if (numbering && title) {
    addQuery(`${numbering} ${title}`)
    addQuery(`${numbering}. ${title}`)

    const words = title.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      addQuery(`${numbering} ${words.slice(0, 2).join(" ")}`)
      addQuery(`${numbering}. ${words.slice(0, 2).join(" ")}`)
    }
    if (words.length >= 3) {
      addQuery(`${numbering} ${words.slice(0, 3).join(" ")}`)
    }
  }

  if (title) addQuery(title)

  if (!numbering) {
    const words = title.split(/\s+/).filter(Boolean)
    if (words.length >= 3) {
      addQuery(words.slice(0, 3).join(" "))
    }
  }

  if (queries.length === 0 && titleRaw) addQuery(titleRaw)

  return queries
}

export function getEmptyHeadings(data: unknown): EmptyHeadingItem[] {
  if (!data || typeof data !== "object") return []
  const emptyHeadings = (data as TrackingHeadingResponse).empty_headings
  return Array.isArray(emptyHeadings) ? emptyHeadings : []
}

export function buildHeadingRowKey(index: number, title: string): string {
  return `${index}::${title}`
}

export function parseHeadingRowKey(key: string): { index: number; title: string } | null {
  const sep = key.indexOf("::")
  if (sep === -1) return null
  const index = Number(key.slice(0, sep))
  if (!Number.isFinite(index)) return null
  return { index, title: key.slice(sep + 2) }
}

export function getHeadingSearchTargets(data: unknown): HeadingSearchTarget[] {
  return getEmptyHeadings(data).flatMap((item, index) => {
    const label = extractTitleRaw(item)
    if (!label) return []

    const queries = buildQueriesFromHeading(item)
    if (queries.length === 0) return []

    const numbering =
      typeof item.numbering === "string" && item.numbering.trim()
        ? normalizeNumbering(item.numbering)
        : undefined

    return [{
      key: buildHeadingRowKey(index, label),
      label,
      numbering,
      queries,
    }]
  })
}
