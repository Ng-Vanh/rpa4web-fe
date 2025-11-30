"use client"

import React, { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

// Dynamic import PDF.js để tránh lỗi SSR
let pdfjsLib: any = null
let pdfjsLoading: Promise<any> | null = null

const loadPdfJs = async () => {
  if (typeof window === "undefined") return null
  if (pdfjsLib) return pdfjsLib
  
  // Nếu đang load, đợi promise hiện tại
  if (pdfjsLoading) {
    return pdfjsLoading
  }
  
  pdfjsLoading = (async () => {
    try {
      // Kiểm tra xem PDF.js đã được load từ CDN chưa
      if ((window as any).pdfjsLib) {
        pdfjsLib = (window as any).pdfjsLib
        console.log("Using cached PDF.js from window")
        return pdfjsLib
      }
      
      // Kiểm tra xem script đã được load chưa
      if ((window as any).pdfjs) {
        pdfjsLib = (window as any).pdfjs
        console.log("Using PDF.js from window.pdfjs (CDN)")
        return pdfjsLib
      }
      
      console.log("Loading PDF.js from CDN...")
      
      // Load PDF.js từ CDN bằng script tag để tránh webpack issues
      // Sử dụng version 3.11.174 (ổn định hơn, có sẵn trên CDN)
      const scriptId = "pdfjs-script"
      
      // Kiểm tra xem script đã tồn tại chưa
      if (document.getElementById(scriptId)) {
        // Script đã tồn tại, đợi nó load
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if ((window as any).pdfjs) {
              clearInterval(checkInterval)
              resolve(true)
            }
          }, 100)
          
          // Timeout sau 10 giây
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve(false)
          }, 10000)
        })
        
        if ((window as any).pdfjs) {
          pdfjsLib = (window as any).pdfjs
          (window as any).pdfjsLib = pdfjsLib
          return pdfjsLib
        }
      }
      
      // Tạo và load script
      return new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.id = scriptId
        // Thử nhiều CDN khác nhau với version khác
        const cdnUrls = [
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`,
          `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js`,
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js`,
        ]
        
        let currentCdnIndex = 0
        
        const tryLoadScript = (urlIndex: number) => {
          if (urlIndex >= cdnUrls.length) {
            reject(new Error("Tất cả CDN đều không load được. Kiểm tra kết nối internet hoặc firewall."))
            return
          }
          
          script.src = cdnUrls[urlIndex]
          script.async = true
          script.crossOrigin = "anonymous"
          
          script.onload = () => {
            try {
              // Đợi một chút để đảm bảo pdfjs đã được define
              setTimeout(() => {
                pdfjsLib = (window as any).pdfjs || (window as any).pdfjsLib
                
                if (!pdfjsLib) {
                  console.warn("window.pdfjs not found, trying alternative...")
                  // Thử cách khác
                  if ((window as any).pdfjsDist) {
                    pdfjsLib = (window as any).pdfjsDist
                  }
                }
                
                if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
                  console.error("PDF.js object:", pdfjsLib)
                  console.error("window keys:", Object.keys(window).filter(k => k.toLowerCase().includes('pdf')))
                  throw new Error("PDF.js không có getDocument function sau khi load từ CDN")
                }
                
                // Set worker path
                if (pdfjsLib.GlobalWorkerOptions) {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
                }
                
                // Lưu vào window để dùng lại
                (window as any).pdfjsLib = pdfjsLib
                
                console.log(" PDF.js loaded successfully from CDN:", cdnUrls[urlIndex])
                console.log("PDF.js functions available:", {
                  hasGetDocument: typeof pdfjsLib.getDocument === "function",
                  hasUtil: !!pdfjsLib.Util,
                  hasGlobalWorkerOptions: !!pdfjsLib.GlobalWorkerOptions,
                  version: pdfjsLib.version
                })
                
                resolve(pdfjsLib)
              }, 100)
            } catch (error) {
              console.error("Error initializing PDF.js from CDN:", error)
              // Thử CDN tiếp theo
              if (urlIndex < cdnUrls.length - 1) {
                console.log(`Trying next CDN...`)
                document.head.removeChild(script)
                tryLoadScript(urlIndex + 1)
              } else {
                reject(error)
              }
            }
          }
          
          script.onerror = (error) => {
            console.error(`Error loading PDF.js from CDN ${cdnUrls[urlIndex]}:`, error)
            // Thử CDN tiếp theo
            if (urlIndex < cdnUrls.length - 1) {
              console.log(`Trying next CDN...`)
              document.head.removeChild(script)
              tryLoadScript(urlIndex + 1)
            } else {
              reject(new Error(`Không thể load PDF.js script từ bất kỳ CDN nào. Đã thử: ${cdnUrls.join(", ")}`))
            }
          }
          
          // Xóa script cũ nếu có
          const oldScript = document.getElementById(scriptId)
          if (oldScript) {
            document.head.removeChild(oldScript)
          }
          
          document.head.appendChild(script)
        }
        
        tryLoadScript(0)
      })
    } catch (error: any) {
      console.error("❌ Error loading PDF.js:", error)
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      })
      pdfjsLoading = null
      return null
    }
  })()
  
  return pdfjsLoading
}

interface BBox {
  x0: number
  x1: number
  top: number
  bottom: number
  page: number
}

interface UCIdWithBBox {
  ucId: string
  bbox: BBox
}

interface PDFViewerWithHighlightProps {
  pdfUrl: string | null
  highlightTexts?: string[] // Danh sách UC_id cần highlight (deprecated - dùng bboxes thay thế)
  bboxes?: UCIdWithBBox[] // Danh sách UC_id với bbox để highlight
  onHighlightClick?: (text: string) => void // Callback khi click vào highlight
  selectedText?: string | null // UC_id đang được chọn
  selectedTextMatchIndex?: number // Index của match hiện tại cho selectedText
}

interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  pageNum: number
  ucId?: string // UC_id khớp với text này
}

interface MatchLocation {
  pageNum: number
  x: number
  y: number
  width: number
  height: number
  text: string
  ucId: string
  pdfplumberBbox?: BBox // Lưu bbox gốc từ pdfplumber để convert
}

export function PDFViewerWithHighlight({
  pdfUrl,
  highlightTexts = [],
  bboxes = [],
  onHighlightClick,
  selectedText,
  selectedTextMatchIndex = 0,
}: PDFViewerWithHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const [allMatches, setAllMatches] = useState<Record<string, MatchLocation[]>>({}) // Lưu tất cả matches cho mỗi UC_id

  // Load PDF
  useEffect(() => {
    if (!pdfUrl) return

    const loadPdf = async () => {
      setLoading(true)
      setError(null)
      try {
        // Load PDF.js library trước
        const pdfjs = await loadPdfJs()
        if (!pdfjs) {
          console.error("loadPdfJs returned null/undefined")
          throw new Error("Không thể load PDF.js library. Kiểm tra console để xem chi tiết lỗi.")
        }
        
        // Kiểm tra lại xem có getDocument không
        if (typeof pdfjs.getDocument !== "function") {
          console.error("pdfjs.getDocument is not a function", {
            pdfjs: pdfjs,
            keys: Object.keys(pdfjs),
            type: typeof pdfjs.getDocument
          })
          throw new Error("PDF.js library không có getDocument function")
        }

        // Load PDF từ blob URL
        // Với blob URL, thử dùng URL trực tiếp trước, nếu không được thì mới convert
        let pdfSource: any
        
        if (pdfUrl.startsWith('blob:')) {
          try {
            // Thử dùng URL trực tiếp trước (nhanh hơn, ít tốn memory hơn)
            pdfSource = { url: pdfUrl }
            console.log(" Using blob URL directly for PDF.js")
            
            // Test xem URL có hoạt động không bằng cách thử load
            const testTask = pdfjs.getDocument({
              url: pdfUrl,
              cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '3.11.174'}/cmaps/`,
              cMapPacked: true,
              verbosity: 0,
            })
            
            // Chỉ test promise, không await để tránh block
            testTask.promise.catch((testError: any) => {
              console.warn("Blob URL direct load failed, will try ArrayBuffer method:", testError)
            })
          } catch (directError: any) {
            console.warn("Direct blob URL failed, trying ArrayBuffer method:", directError)
            
            // Fallback: convert sang ArrayBuffer (chỉ khi cần thiết)
            try {
              const response = await fetch(pdfUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/pdf',
                },
              })
              
              if (!response.ok) {
                throw new Error(`Không thể fetch blob URL: ${response.status} ${response.statusText}`)
              }
              
              // Kiểm tra size trước khi allocate
              const contentLength = response.headers.get('content-length')
              if (contentLength) {
                const sizeInMB = parseInt(contentLength) / (1024 * 1024)
                if (sizeInMB > 100) {
                  throw new Error(`PDF quá lớn (${sizeInMB.toFixed(2)}MB). Vui lòng sử dụng PDF nhỏ hơn.`)
                }
              }
              
              const arrayBuffer = await response.arrayBuffer()
              
              if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error("Blob URL trả về dữ liệu rỗng")
              }
              
              // Kiểm tra size sau khi load
              const sizeInMB = arrayBuffer.byteLength / (1024 * 1024)
              if (sizeInMB > 100) {
                throw new Error(`PDF quá lớn (${sizeInMB.toFixed(2)}MB). Vui lòng sử dụng PDF nhỏ hơn.`)
              }
              
              pdfSource = { data: new Uint8Array(arrayBuffer) }
              console.log(" PDF loaded from blob as Uint8Array, size:", arrayBuffer.byteLength, "bytes (", sizeInMB.toFixed(2), "MB)")
            } catch (fetchError: any) {
              console.error("❌ Error fetching blob URL:", fetchError)
              throw new Error(`Không thể load PDF từ blob URL: ${fetchError?.message || 'Unknown error'}`)
            }
          }
        } else {
          pdfSource = { url: pdfUrl }
        }
        
        const loadingTask = pdfjs.getDocument({
          ...pdfSource,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '3.11.174'}/cmaps/`,
          cMapPacked: true,
          verbosity: 0, // Giảm log
        })

        const pdf = await loadingTask.promise
        console.log(" PDF loaded successfully:", {
          numPages: pdf.numPages,
          pdfUrl: pdfUrl
        })
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
      } catch (err: any) {
        console.error("Error loading PDF:", err)
        setError(err.message || "Không thể tải PDF")
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [pdfUrl])

  // Render pages và highlight dựa trên bbox hoặc text search
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return
    
    // Ưu tiên dùng bboxes, nếu không có thì mới dùng highlightTexts (text search)
    const useBboxes = bboxes && bboxes.length > 0
    const useTextSearch = !useBboxes && highlightTexts && highlightTexts.length > 0
    
    if (!useBboxes && !useTextSearch) return

    const renderPages = async () => {
      // Clear container trước khi render
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }

      const matchesByUcId: Record<string, MatchLocation[]> = {}
      
      // Nếu có bboxes, dùng bboxes trực tiếp
      if (useBboxes) {
        console.log("✅ Using bboxes for highlighting:", bboxes)
        
        bboxes.forEach(({ ucId, bbox }) => {
          if (!matchesByUcId[ucId]) {
            matchesByUcId[ucId] = []
          }
          
          // pdfplumber bbox: origin ở bottom-left
          // Lưu bbox coordinates từ pdfplumber (sẽ convert sang viewport sau)
          matchesByUcId[ucId].push({
            pageNum: bbox.page,
            x: bbox.x0, // x0 từ pdfplumber
            y: bbox.top, // top từ pdfplumber (trong hệ bottom-left)
            width: bbox.x1 - bbox.x0,
            height: bbox.bottom - bbox.top,
            text: ucId,
            ucId: ucId,
            // Lưu thêm bbox gốc để convert sau
            pdfplumberBbox: bbox,
          })
        })
        
        // Render pages với highlights từ bboxes
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.5 })
          
          // Tạo canvas cho mỗi trang
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue

          canvas.height = viewport.height
          canvas.width = viewport.width
          canvas.className = "mb-4 shadow-lg mx-auto"
          canvas.id = `pdf-page-${pageNum}`

          // Render PDF page vào canvas
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          }
          await page.render(renderContext).promise

          // Tạo page container với overlay cho highlights
          const pageContainer = document.createElement("div")
          pageContainer.className = "relative flex justify-center mb-4"
          pageContainer.id = `pdf-page-container-${pageNum}`

          const overlay = document.createElement("div")
          overlay.className = "absolute top-0 left-0 pointer-events-none"
          overlay.style.width = `${viewport.width}px`
          overlay.style.height = `${viewport.height}px`
          overlay.id = `pdf-overlay-${pageNum}`

          pageContainer.appendChild(canvas)
          pageContainer.appendChild(overlay)
          
          if (containerRef.current) {
            containerRef.current.appendChild(pageContainer)
          }

          canvasRefs.current.set(pageNum, canvas)
        }
        
        // Lưu tất cả matches
        setAllMatches(matchesByUcId)
        console.log("Matches from bboxes:", matchesByUcId)
        
        // Vẽ highlights
        drawHighlights(matchesByUcId)
        return // Không cần text search nữa
      }
      
      // Fallback: Text search (code cũ)
      const pdfjs = await loadPdfJs()
      if (!pdfjs) {
        console.error("PDF.js not loaded")
        return
      }

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })

        // Tạo canvas cho mỗi trang
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width
        canvas.className = "mb-4 shadow-lg mx-auto"
        canvas.id = `pdf-page-${pageNum}`

        // Render PDF page vào canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        await page.render(renderContext).promise

        // Extract text từ page để tìm UC_id
        // Thử nhiều cách extract text
        let textContent: any
        try {
          textContent = await page.getTextContent({
            normalizeWhitespace: true, // Normalize whitespace
            disableCombineTextItems: false, // Combine text items
          })
        } catch (textError) {
          console.warn(`Error extracting text from page ${pageNum}:`, textError)
          // Fallback: thử không có options
          textContent = await page.getTextContent()
        }

        console.log(`Page ${pageNum} - Text items count:`, textContent.items.length)
        
        // Log một số text items để debug
        if (textContent.items.length > 0) {
          const sampleTexts = textContent.items.slice(0, 10).map((item: any) => item.str).join(" | ")
          console.log(`Page ${pageNum} - Sample texts:`, sampleTexts)
        }

        const linesMap = new Map<number, any[]>()

        // Group text items by line với tolerance cho y position
        const Y_TOLERANCE = 5 // Cho phép sai số 5px cho cùng một dòng
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const tx = pdfjs.Util.transform(viewport.transform, item.transform)
            const y = Math.round(tx[5] / Y_TOLERANCE) * Y_TOLERANCE // Round để group các items gần nhau
            
            if (!linesMap.has(y)) {
              linesMap.set(y, [])
            }
            
            linesMap.get(y)!.push({
              str: item.str,
              x: tx[4],
              y: tx[5],
              width: item.width || 0,
              height: item.height || 0,
            })
          }
        })
        
        console.log(`Page ${pageNum} - Lines found:`, linesMap.size)

        // Tìm UC_id trong từng line
        linesMap.forEach((lineItems, yKey) => {
          lineItems.sort((a, b) => a.x - b.x)
          // Thử nhiều cách join: với space, không space, với hyphen
          const lineText = lineItems.map((item) => item.str).join(" ")
          const lineTextNoSpace = lineItems.map((item) => item.str).join("")
          const lineTextWithHyphen = lineItems.map((item) => item.str).join("-")
          
          // Tìm UC_id trong line text với nhiều cách
          for (const ucId of highlightTexts) {
            if (!ucId || !ucId.trim()) continue
            
            const ucIdLower = ucId.toLowerCase().trim()
            const ucIdNoSpace = ucIdLower.replace(/\s+/g, "")
            const lineTextLower = lineText.toLowerCase()
            const lineTextNoSpaceLower = lineTextNoSpace.toLowerCase()
            
            // Tìm với nhiều cách: có space, không space, có hyphen
            let index = lineTextLower.indexOf(ucIdLower)
            let searchText = lineText
            let searchTextLower = lineTextLower
            
            if (index === -1) {
              // Thử không có space
              index = lineTextNoSpaceLower.indexOf(ucIdNoSpace)
              if (index !== -1) {
                searchText = lineTextNoSpace
                searchTextLower = lineTextNoSpaceLower
              }
            }
            
            if (index === -1) {
              // Thử với hyphen
              const lineTextHyphenLower = lineTextWithHyphen.toLowerCase()
              index = lineTextHyphenLower.indexOf(ucIdLower)
              if (index !== -1) {
                searchText = lineTextWithHyphen
                searchTextLower = lineTextHyphenLower
              }
            }
            
            if (index !== -1) {
              console.log(` Found UC_id "${ucId}" in page ${pageNum}, line: "${lineText.substring(0, 50)}..."`)
              // Tính toán vị trí highlight
              let currentTextPos = 0
              let highlightStartX = lineItems[0].x
              let highlightEndX = lineItems[lineItems.length - 1].x + lineItems[lineItems.length - 1].width
              let foundStart = false
              
              for (const item of lineItems) {
                const itemTextLength = item.str.length
                
                if (!foundStart && currentTextPos + itemTextLength > index) {
                  const offsetInItem = index - currentTextPos
                  highlightStartX = item.x + (offsetInItem / itemTextLength) * item.width
                  foundStart = true
                }
                
                if (currentTextPos + itemTextLength >= index + ucId.length) {
                  const offsetInItem = index + ucId.length - currentTextPos
                  highlightEndX = item.x + (offsetInItem / itemTextLength) * item.width
                  break
                }
                
                currentTextPos += itemTextLength + 1
              }
              
              const avgY = lineItems.reduce((sum, item) => sum + item.y, 0) / lineItems.length
              const maxHeight = Math.max(...lineItems.map((item) => item.height))
              
              // Lưu match location
              if (!matchesByUcId[ucId]) {
                matchesByUcId[ucId] = []
              }
              
              matchesByUcId[ucId].push({
                pageNum: pageNum,
                x: highlightStartX,
                y: avgY,
                width: Math.max(highlightEndX - highlightStartX, 30),
                height: maxHeight,
                text: lineText.substring(index, index + ucId.length),
                ucId: ucId,
              })
            }
          }
        })

        // Tạo page container với overlay cho highlights
        const pageContainer = document.createElement("div")
        pageContainer.className = "relative flex justify-center mb-4"
        pageContainer.id = `pdf-page-container-${pageNum}`

        const overlay = document.createElement("div")
        overlay.className = "absolute top-0 left-0 pointer-events-none"
        overlay.style.width = `${viewport.width}px`
        overlay.style.height = `${viewport.height}px`
        overlay.id = `pdf-overlay-${pageNum}`

        pageContainer.appendChild(canvas)
        pageContainer.appendChild(overlay)
        
        if (containerRef.current) {
          containerRef.current.appendChild(pageContainer)
        }

        canvasRefs.current.set(pageNum, canvas)
      }

      // Lưu tất cả matches
      setAllMatches(matchesByUcId)
      console.log("✅ Matches found:", matchesByUcId)
      
      // Vẽ highlights
      drawHighlights(matchesByUcId)
    }

    renderPages()
  }, [pdfDoc, totalPages, highlightTexts, bboxes])

  // Draw highlights với màu cam
  const drawHighlights = async (matches: Record<string, MatchLocation[]>) => {
    // Clear existing highlights
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const overlay = document.getElementById(`pdf-overlay-${pageNum}`)
      if (overlay) {
        overlay.innerHTML = ""
      }
    }

    // Vẽ highlights cho tất cả matches
    for (const ucId of Object.keys(matches)) {
      for (let index = 0; index < matches[ucId].length; index++) {
        const match = matches[ucId][index]
        const overlay = document.getElementById(`pdf-overlay-${match.pageNum}`)
        if (!overlay) continue

        // Lấy viewport của page để convert coordinates
        const page = await pdfDoc.getPage(match.pageNum)
        const viewport = page.getViewport({ scale: 1.5 })
        
        // Convert pdfplumber bbox sang viewport coordinates
        // pdfplumber: origin ở bottom-left (0,0 ở góc dưới trái)
        // PDF.js viewport: origin ở top-left (0,0 ở góc trên trái)
        let viewportX: number
        let viewportY: number
        let viewportWidth: number
        let viewportHeight: number
        
        if (match.pdfplumberBbox) {
          // Có bbox từ pdfplumber, cần convert
          const bbox = match.pdfplumberBbox
          const pageRect = page.getViewport({ scale: 1.0 }) // Get page size at scale 1.0
          const pageHeight = pageRect.height
          
          console.log(`Converting bbox for page ${match.pageNum}:`, {
            pdfplumber: { x0: bbox.x0, x1: bbox.x1, top: bbox.top, bottom: bbox.bottom },
            pageHeight,
            viewportSize: { width: viewport.width, height: viewport.height },
            pageRectSize: { width: pageRect.width, height: pageRect.height }
          })
          
          // Convert từ pdfplumber (bottom-left) sang viewport (top-left)
          // x: giữ nguyên, scale theo viewport
          viewportX = bbox.x0 * (viewport.width / pageRect.width)
          viewportWidth = (bbox.x1 - bbox.x0) * (viewport.width / pageRect.width)
          
          // y: flip (page_height - y)
          // pdfplumber: top và bottom là khoảng cách từ bottom (bottom-left origin)
          // viewport: cần khoảng cách từ top (top-left origin)
          // 
          // pdfplumber: top > bottom (top cao hơn bottom trong hệ bottom-left)
          // viewport: cần top < bottom (top thấp hơn bottom trong hệ top-left)
          //
          // Công thức đúng:
          // - viewport top = pageHeight - pdfplumber bottom (vì bottom gần bottom nhất)
          // - viewport bottom = pageHeight - pdfplumber top (vì top xa bottom nhất)
          //
          // Scale factor
          const scaleX = viewport.width / pageRect.width
          const scaleY = viewport.height / pageHeight
          
          // X: giữ nguyên, chỉ scale
          viewportX = bbox.x0 * scaleX
          viewportWidth = (bbox.x1 - bbox.x0) * scaleX
          
          // Y: convert và scale
          // Nếu highlight bị đảo (ở trên nhưng highlight ở dưới), có thể pdfplumber đã dùng top-left origin
          // Thử không flip trước (nếu vẫn sai thì mới flip)
          
          // Cách 1: Không flip (nếu pdfplumber đã dùng top-left origin - thử cách này trước)
          let viewportTopFromTop = bbox.top * scaleY
          let viewportBottomFromTop = bbox.bottom * scaleY
          
          // Cách 2: Flip (nếu pdfplumber dùng bottom-left origin)
          // Nếu cách 1 bị đảo, uncomment 2 dòng này:
          // viewportTopFromTop = (pageHeight - bbox.bottom) * scaleY
          // viewportBottomFromTop = (pageHeight - bbox.top) * scaleY
          
          viewportY = viewportTopFromTop
          viewportHeight = viewportBottomFromTop - viewportTopFromTop
          
          // Debug: log để kiểm tra
          console.log(`Y conversion:`, {
            pdfplumber: { top: bbox.top, bottom: bbox.bottom },
            pageHeight,
            scaleY,
            viewportTop: viewportTopFromTop.toFixed(2),
            viewportBottom: viewportBottomFromTop.toFixed(2),
            viewportHeight: viewportHeight.toFixed(2)
          })
          
          console.log(`Converted coordinates:`, {
            viewportX,
            viewportY,
            viewportWidth,
            viewportHeight
          })
        } else {
          // Fallback: dùng match coordinates trực tiếp (từ text search)
          viewportX = match.x
          const pdfY = match.y
          viewportY = viewport.height - pdfY - match.height
          viewportWidth = match.width
          viewportHeight = match.height
        }
        
        const highlight = document.createElement("div")
        highlight.setAttribute('data-uc-id', ucId)
        highlight.setAttribute('data-match-index', String(index))
        // highlight.className = `absolute cursor-pointer transition-all ${
        //   selectedText === ucId
        //     ? "bg-orange-400 opacity-90 ring-2 ring-blue-500"
        //     : "bg-orange-300 opacity-70 hover:opacity-90"
        // }`
        highlight.className = `absolute cursor-pointer transition-all ${
          selectedText === ucId
            // ? "ring-2 ring-blue-500"
            ? ""
            : ""
        }`
        // Dùng inline style với rgba để màu trong suốt, vẫn nhìn thấy chữ
        if (selectedText === ucId) {
          // Màu cam nhạt cho selected (alpha ~0.3 = 30% opacity)
          highlight.style.backgroundColor = "rgba(251, 146, 60, 0.3)" // orange-400 với alpha 0.3
        } else {
          // Màu cam nhạt hơn cho không selected (alpha ~0.25 = 25% opacity)
          highlight.style.backgroundColor = "rgba(253, 186, 116, 0.25)" // orange-300 với alpha 0.25
        }

        highlight.style.left = `${viewportX}px`
        highlight.style.top = `${viewportY}px`
        highlight.style.width = `${Math.max(viewportWidth, 30)}px`
        highlight.style.height = `${Math.max(viewportHeight, 15)}px`
        highlight.style.pointerEvents = "auto"
        highlight.title = `UC_id: ${ucId} (${index + 1}/${matches[ucId].length}) - Click để scroll đến scenario`
        highlight.onclick = () => {
          if (onHighlightClick) {
            onHighlightClick(ucId)
          }
        }

        overlay.appendChild(highlight)
      }
    }
  }

  // Re-draw highlights khi selectedText thay đổi
  useEffect(() => {
    if (Object.keys(allMatches).length > 0) {
      drawHighlights(allMatches)
    }
  }, [selectedText, allMatches, totalPages])

  // Scroll to match khi selectedText hoặc selectedTextMatchIndex thay đổi
  useEffect(() => {
    if (selectedText && allMatches[selectedText] && allMatches[selectedText].length > 0) {
      // Sử dụng selectedTextMatchIndex từ props, nếu không có thì dùng 0
      const index = selectedTextMatchIndex !== undefined ? selectedTextMatchIndex : 0
      const actualIndex = index % allMatches[selectedText].length // Cycle nếu vượt quá
      const match = allMatches[selectedText][actualIndex]
      
      if (match) {
        const pageContainer = document.getElementById(`pdf-page-container-${match.pageNum}`)
        if (pageContainer) {
          // Scroll đến page container
          pageContainer.scrollIntoView({ behavior: "smooth", block: "center" })
          
          // Highlight match hiện tại (làm nổi bật hơn)
          setTimeout(() => {
            const overlay = document.getElementById(`pdf-overlay-${match.pageNum}`)
            if (overlay) {
              const highlights = overlay.querySelectorAll('div[data-uc-id]')
              highlights.forEach((hl: any) => {
                if (hl.getAttribute('data-uc-id') === selectedText && 
                    hl.getAttribute('data-match-index') === String(actualIndex)) {
                  // blue ring cho selected
                  // hl.classList.add('ring-4', 'ring-blue-500')
                  hl.style.zIndex = '10'
                } else {
                  // blue ring
                  // hl.classList.remove('ring-4', 'ring-blue-500')
                  hl.style.zIndex = '1'
                }
              })
            }
          }, 300)
        }
      }
    }
  }, [selectedText, selectedTextMatchIndex, allMatches])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Đang tải PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="mb-2">Lỗi: {error}</p>
        </div>
      </div>
    )
  }

  if (!pdfDoc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p>Không có PDF để hiển thị</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-100 p-4 overscroll-contain">
      <div ref={containerRef} className="flex flex-col items-center">
        {/* Pages will be rendered here */}
      </div>
    </div>
  )
}
