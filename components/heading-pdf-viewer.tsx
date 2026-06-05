"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { loadPdfDocument, loadPdfJs } from "@/lib/load-pdfjs"
import { searchHeadingsInPdf, type HeadingPdfMatch } from "@/lib/heading-pdf-search"
import type { HeadingSearchTarget } from "@/service/tracking-heading"

const PDF_RENDER_SCALE = 1.5

interface HeadingPdfViewerProps {
  pdfUrl: string
  searchTargets: HeadingSearchTarget[]
  selectedKey: string | null
  matchIndex: number
  shouldScroll: boolean
  onSearchResults?: (results: Record<string, HeadingPdfMatch[]>) => void
}

export function HeadingPdfViewer({
  pdfUrl,
  searchTargets,
  selectedKey,
  matchIndex,
  shouldScroll,
  onSearchResults,
}: HeadingPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [pagesRendered, setPagesRendered] = useState(false)
  const [matchesByKey, setMatchesByKey] = useState<Record<string, HeadingPdfMatch[]>>({})

  const searchTargetsKey = useMemo(() => JSON.stringify(searchTargets), [searchTargets])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setPagesRendered(false)
      setMatchesByKey({})

      try {
        const pdfjs = await loadPdfJs()
        if (!pdfjs) throw new Error("Không thể load PDF.js")

        const pdfDoc = await loadPdfDocument(pdfjs, pdfUrl)
        if (cancelled) return

        pdfDocRef.current = pdfDoc
        setTotalPages(pdfDoc.numPages)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Không thể tải PDF")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pdfUrl])

  useEffect(() => {
    const pdfDoc = pdfDocRef.current
    const container = containerRef.current
    if (!pdfDoc || !container || totalPages === 0) return

    let cancelled = false

    async function renderPages() {
      container!.innerHTML = ""
      setPagesRendered(false)

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (cancelled) return

        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!context) continue

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.className = "mb-4 shadow-lg mx-auto"

        await page.render({ canvasContext: context, viewport }).promise

        const pageContainer = document.createElement("div")
        pageContainer.className = "relative flex justify-center mb-4"
        pageContainer.id = `heading-pdf-page-${pageNum}`

        const overlay = document.createElement("div")
        overlay.className = "absolute top-0 left-0 pointer-events-none"
        overlay.style.width = `${viewport.width}px`
        overlay.style.height = `${viewport.height}px`
        overlay.id = `heading-pdf-overlay-${pageNum}`

        pageContainer.appendChild(canvas)
        pageContainer.appendChild(overlay)
        container!.appendChild(pageContainer)
      }

      if (!cancelled) setPagesRendered(true)
    }

    void renderPages()
    return () => {
      cancelled = true
    }
  }, [totalPages, pdfUrl])

  const drawHighlights = useCallback(
    (matches: Record<string, HeadingPdfMatch[]>, activeKey: string | null) => {
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const overlay = document.getElementById(`heading-pdf-overlay-${pageNum}`)
        if (overlay) overlay.innerHTML = ""
      }

      const keysToDraw = activeKey ? [activeKey] : Object.keys(matches)

      keysToDraw.forEach((key) => {
        const keyMatches = matches[key] ?? []
        keyMatches.forEach((match, index) => {
          const overlay = document.getElementById(`heading-pdf-overlay-${match.pageNum}`)
          if (!overlay) return

          const highlight = document.createElement("div")
          highlight.dataset.headingKey = key
          highlight.dataset.matchIndex = String(index)
          highlight.className = "absolute pointer-events-auto"
          highlight.style.left = `${match.x}px`
          highlight.style.top = `${match.y}px`
          highlight.style.width = `${match.width}px`
          highlight.style.height = `${match.height}px`
          highlight.style.backgroundColor =
            activeKey === key
              ? "rgba(251, 146, 60, 0.35)"
              : "rgba(253, 186, 116, 0.25)"
          highlight.title = match.matchedText
          overlay.appendChild(highlight)
        })
      })
    },
    [totalPages],
  )

  useEffect(() => {
    const pdfDoc = pdfDocRef.current
    if (!pdfDoc || !pagesRendered || searchTargets.length === 0) return

    let cancelled = false

    async function runSearch() {
      setSearching(true)
      try {
        const pdfjs = await loadPdfJs()
        if (!pdfjs || cancelled) return

        const results = await searchHeadingsInPdf(pdfjs, pdfDoc, searchTargets, PDF_RENDER_SCALE)
        if (cancelled) return

        setMatchesByKey(results)
        onSearchResults?.(results)
        drawHighlights(results, null)
      } catch (err) {
        console.error("Heading PDF search failed:", err)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }

    void runSearch()
    return () => {
      cancelled = true
    }
  }, [pagesRendered, searchTargetsKey, onSearchResults, drawHighlights])

  useEffect(() => {
    if (Object.keys(matchesByKey).length === 0) return
    drawHighlights(matchesByKey, selectedKey)
  }, [selectedKey, matchesByKey, drawHighlights])

  useEffect(() => {
    if (!shouldScroll || !selectedKey || !pagesRendered) return

    const keyMatches = matchesByKey[selectedKey]
    if (!keyMatches?.length) return

    const actualIndex = matchIndex % keyMatches.length
    const match = keyMatches[actualIndex]

    const scrollToMatch = (retries = 8) => {
      const overlay = document.getElementById(`heading-pdf-overlay-${match.pageNum}`)
      const highlight = overlay?.querySelector(
        `[data-heading-key="${CSS.escape(selectedKey)}"][data-match-index="${actualIndex}"]`,
      ) as HTMLElement | null

      if (highlight) {
        highlight.scrollIntoView({ behavior: "smooth", block: "center" })
        return
      }

      if (retries > 0) {
        setTimeout(() => scrollToMatch(retries - 1), 120)
        return
      }

      document.getElementById(`heading-pdf-page-${match.pageNum}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }

    setTimeout(() => scrollToMatch(), 80)
  }, [shouldScroll, selectedKey, matchIndex, matchesByKey, pagesRendered])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Đang tải PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gray-100 p-4 overscroll-contain">
      {searching && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang tìm heading trong PDF...
        </div>
      )}
      <div ref={containerRef} className="flex flex-col items-center" />
    </div>
  )
}
