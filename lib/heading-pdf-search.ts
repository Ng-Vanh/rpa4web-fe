import type { HeadingSearchTarget } from "@/service/tracking-heading"

export interface HeadingPdfMatch {
  pageNum: number
  x: number
  y: number
  width: number
  height: number
  matchedText: string
}

interface CharRef {
  itemIndex: number
  charIndex: number
}

interface ViewportBox {
  left: number
  top: number
  width: number
  height: number
}

function normalizeText(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim()
}

function normalizeNumbering(value: string): string {
  return normalizeText(value).replace(/\.$/, "")
}

function queryIncludesNumbering(query: string, numbering: string): boolean {
  const q = normalizeText(query)
  const n = normalizeNumbering(numbering)
  return q.startsWith(n) || q.startsWith(`${n}.`)
}

/** Kiểm tra vùng text quanh match có chứa numbering (vd. "4.1.3" hoặc "4.1.3.") */
function matchContextHasNumbering(pageText: string, matchStart: number, numbering: string): boolean {
  const n = normalizeNumbering(numbering)
  if (!n) return true

  const ctx = pageText.slice(Math.max(0, matchStart - n.length - 4), matchStart + n.length + 4)
  return ctx.includes(n) || ctx.includes(`${n}.`)
}

function isMatchAllowed(
  pageText: string,
  matchStart: number,
  query: string,
  numbering?: string,
): boolean {
  if (!numbering) return true
  if (queryIncludesNumbering(query, numbering)) return true
  return matchContextHasNumbering(pageText, matchStart, numbering)
}

/** Ghép text trang — gom whitespace giống normalizeText để query khớp */
function buildPageIndex(items: Array<{ str?: string }>) {
  let text = ""
  const charRefs: Array<CharRef | null> = []

  const appendChar = (itemIndex: number, charIndex: number, ch: string) => {
    text += ch.toLowerCase()
    charRefs.push({ itemIndex, charIndex })
  }

  items.forEach((item, itemIndex) => {
    const chunk = String(item.str ?? "").normalize("NFC")
    if (!chunk.trim()) return

    if (text.length > 0 && !text.endsWith(" ")) {
      text += " "
      charRefs.push(null)
    }

    for (let i = 0; i < chunk.length; i++) {
      if (/\s/.test(chunk[i])) {
        if (text.length > 0 && !text.endsWith(" ")) {
          text += " "
          charRefs.push(null)
        }
        continue
      }
      appendChar(itemIndex, i, chunk[i])
    }
  })

  return { text: text.trim(), charRefs }
}

function getItemBox(
  pdfjs: any,
  viewport: any,
  item: any,
  startChar: number,
  endChar: number,
): ViewportBox | null {
  const raw = String(item.str ?? "")
  const textLen = raw.length
  if (!textLen) return null

  const start = Math.max(0, Math.min(startChar, textLen))
  const end = Math.max(start, Math.min(endChar, textLen))
  if (end <= start) return null

  const tx = pdfjs.Util.transform(viewport.transform, item.transform)
  const tm = item.transform
  const tmX = tm[0] || 1
  const charWidthUser = item.width / textLen

  const ux = (tx[0] / tmX) * charWidthUser
  const x1 = tx[4] + ux * start
  const x2 = tx[4] + ux * end
  const height = Math.abs(tx[3]) || Math.hypot(tx[2], tx[3]) || 12
  const top = tx[5] - height

  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)

  return clampBox(
    {
      left,
      top,
      width: Math.max(right - left, 2),
      height: Math.max(height, 2),
    },
    viewport.width,
    viewport.height,
  )
}

function clampBox(box: ViewportBox, viewportWidth: number, viewportHeight: number): ViewportBox {
  const left = Math.max(0, Math.min(box.left, viewportWidth - 2))
  const top = Math.max(0, Math.min(box.top, viewportHeight - 2))
  const right = Math.max(left + 2, Math.min(box.left + box.width, viewportWidth))
  const bottom = Math.max(top + 2, Math.min(box.top + box.height, viewportHeight))
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function unionBoxes(boxes: ViewportBox[]): ViewportBox | null {
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((b) => b.left))
  const top = Math.min(...boxes.map((b) => b.top))
  const right = Math.max(...boxes.map((b) => b.left + b.width))
  const bottom = Math.max(...boxes.map((b) => b.top + b.height))
  return {
    left,
    top,
    width: Math.max(right - left, 2),
    height: Math.max(bottom - top, 2),
  }
}

function spansFromRange(
  charRefs: Array<CharRef | null>,
  start: number,
  end: number,
): Array<{ itemIndex: number; startChar: number; endChar: number }> {
  const spans: Array<{ itemIndex: number; startChar: number; endChar: number }> = []
  let current: { itemIndex: number; startChar: number; endChar: number } | null = null

  for (let i = start; i < end; i++) {
    const ref = charRefs[i]
    if (!ref) continue

    if (
      current &&
      current.itemIndex === ref.itemIndex &&
      current.endChar === ref.charIndex
    ) {
      current.endChar = ref.charIndex + 1
      continue
    }

    current = {
      itemIndex: ref.itemIndex,
      startChar: ref.charIndex,
      endChar: ref.charIndex + 1,
    }
    spans.push(current)
  }

  return spans
}

function boxesFromSpans(
  pdfjs: any,
  viewport: any,
  items: any[],
  spans: Array<{ itemIndex: number; startChar: number; endChar: number }>,
): ViewportBox[] {
  return spans
    .map((span) => getItemBox(pdfjs, viewport, items[span.itemIndex], span.startChar, span.endChar))
    .filter((box): box is ViewportBox => box !== null)
}

function isReasonableHeadingBox(box: ViewportBox, viewportWidth: number): boolean {
  if (box.width < 2 || box.height < 2) return false
  if (box.width > viewportWidth * 0.95) return false
  if (box.height > 80) return false
  return true
}

function pushMatch(
  matches: HeadingPdfMatch[],
  pageNum: number,
  query: string,
  box: ViewportBox,
) {
  matches.push({
    pageNum,
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height,
    matchedText: query,
  })
}

function findInSingleItem(
  pdfjs: any,
  viewport: any,
  item: any,
  pageNum: number,
  query: string,
  numbering?: string,
): HeadingPdfMatch[] {
  const pageIndex = buildPageIndex([item])
  return findInPageIndex(pdfjs, viewport, [item], pageNum, query, pageIndex, numbering)
}

function findInPageIndex(
  pdfjs: any,
  viewport: any,
  items: any[],
  pageNum: number,
  query: string,
  pageIndex: ReturnType<typeof buildPageIndex>,
  numbering?: string,
): HeadingPdfMatch[] {
  const normalizedQuery = normalizeText(query)
  if (normalizedQuery.length < 2) return []

  const matches: HeadingPdfMatch[] = []
  let from = 0

  while (from < pageIndex.text.length) {
    const at = pageIndex.text.indexOf(normalizedQuery, from)
    if (at === -1) break

    if (!isMatchAllowed(pageIndex.text, at, query, numbering)) {
      from = at + 1
      continue
    }

    const spans = spansFromRange(pageIndex.charRefs, at, at + normalizedQuery.length)
    const merged = unionBoxes(boxesFromSpans(pdfjs, viewport, items, spans))

    if (merged && isReasonableHeadingBox(merged, viewport.width)) {
      pushMatch(matches, pageNum, query, merged)
    }

    from = at + 1
  }

  return matches
}

function findQueryOnPage(
  pdfjs: any,
  viewport: any,
  items: any[],
  pageNum: number,
  query: string,
  pageIndex: ReturnType<typeof buildPageIndex>,
  numbering?: string,
): HeadingPdfMatch[] {
  const perItem = items.flatMap((item) =>
    findInSingleItem(pdfjs, viewport, item, pageNum, query, numbering),
  )
  if (perItem.length > 0) return perItem

  return findInPageIndex(pdfjs, viewport, items, pageNum, query, pageIndex, numbering)
}

async function searchPage(
  pdfjs: any,
  page: any,
  pageNum: number,
  targets: HeadingSearchTarget[],
  scale: number,
): Promise<Record<string, HeadingPdfMatch[]>> {
  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent({ normalizeWhitespace: true })
  const items = (textContent.items || []).filter((item: any) => String(item.str ?? "").trim())
  const pageIndex = buildPageIndex(items)
  const pageResults: Record<string, HeadingPdfMatch[]> = {}

  for (const target of targets) {
    const found: HeadingPdfMatch[] = []

    for (const query of target.queries) {
      found.push(
        ...findQueryOnPage(
          pdfjs,
          viewport,
          items,
          pageNum,
          query,
          pageIndex,
          target.numbering,
        ),
      )
      if (found.length > 0) break
    }

    if (found.length > 0) {
      pageResults[target.key] = found
    }
  }

  return pageResults
}

function dedupeMatches(matches: HeadingPdfMatch[]): HeadingPdfMatch[] {
  const seen = new Set<string>()
  return matches.filter((match) => {
    const key = `${match.pageNum}:${Math.round(match.x / 4)}:${Math.round(match.y / 4)}:${Math.round(match.width / 4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchHeadingsInPdf(
  pdfjs: any,
  pdfDoc: any,
  targets: HeadingSearchTarget[],
  scale = 1.5,
): Promise<Record<string, HeadingPdfMatch[]>> {
  const results: Record<string, HeadingPdfMatch[]> = {}
  targets.forEach((target) => {
    results[target.key] = []
  })

  if (targets.length === 0) return results

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const pageResults = await searchPage(pdfjs, page, pageNum, targets, scale)

    Object.entries(pageResults).forEach(([key, matches]) => {
      results[key].push(...matches)
    })
  }

  Object.keys(results).forEach((key) => {
    results[key] = dedupeMatches(results[key]).sort((a, b) => {
      if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum
      return a.y - b.y
    })
  })

  return results
}
