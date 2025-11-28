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
                
                console.log("✅ PDF.js loaded successfully from CDN:", cdnUrls[urlIndex])
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

interface PDFViewerWithHighlightProps {
  pdfUrl: string | null
  highlightTexts: string[] // Danh sách UC_id cần highlight
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
}

export function PDFViewerWithHighlight({
  pdfUrl,
  highlightTexts,
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
        // Với blob URL, cần convert sang ArrayBuffer để tránh lỗi
        let pdfSource: any
        
        if (pdfUrl.startsWith('blob:')) {
          try {
            // Fetch blob và convert sang ArrayBuffer
            const response = await fetch(pdfUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/pdf',
              },
            })
            
            if (!response.ok) {
              throw new Error(`Không thể fetch blob URL: ${response.status} ${response.statusText}`)
            }
            
            const arrayBuffer = await response.arrayBuffer()
            
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
              throw new Error("Blob URL trả về dữ liệu rỗng")
            }
            
            pdfSource = { data: new Uint8Array(arrayBuffer) }
            console.log("✅ PDF loaded from blob as Uint8Array, size:", arrayBuffer.byteLength, "bytes")
          } catch (fetchError: any) {
            console.error("❌ Error fetching blob URL:", fetchError)
            console.error("Error details:", {
              message: fetchError?.message,
              name: fetchError?.name,
              stack: fetchError?.stack,
            })
            throw new Error(`Không thể load PDF từ blob URL: ${fetchError?.message || 'Unknown error'}`)
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
        console.log("✅ PDF loaded successfully:", {
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

  // Render pages và extract text để highlight
  useEffect(() => {
    if (!pdfDoc || !containerRef.current || !highlightTexts || highlightTexts.length === 0) return

    const renderPages = async () => {
      // Clear container trước khi render
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }

      const matchesByUcId: Record<string, MatchLocation[]> = {}
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
        const textContent = await page.getTextContent()
        const linesMap = new Map<number, any[]>()

        // Group text items by line
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const tx = pdfjs.Util.transform(viewport.transform, item.transform)
            const y = Math.round(tx[5])
            
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

        // Tìm UC_id trong từng line
        linesMap.forEach((lineItems, yKey) => {
          lineItems.sort((a, b) => a.x - b.x)
          const lineText = lineItems.map((item) => item.str).join(" ")
          
          // Tìm UC_id trong line text
          for (const ucId of highlightTexts) {
            if (!ucId || !ucId.trim()) continue
            
            const ucIdLower = ucId.toLowerCase().trim()
            const lineTextLower = lineText.toLowerCase()
            
            const index = lineTextLower.indexOf(ucIdLower)
            if (index !== -1) {
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
  }, [pdfDoc, totalPages, highlightTexts])

  // Draw highlights với màu cam
  const drawHighlights = (matches: Record<string, MatchLocation[]>) => {
    // Clear existing highlights
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const overlay = document.getElementById(`pdf-overlay-${pageNum}`)
      if (overlay) {
        overlay.innerHTML = ""
      }
    }

    // Vẽ highlights cho tất cả matches
    Object.keys(matches).forEach((ucId) => {
      matches[ucId].forEach((match, index) => {
        const overlay = document.getElementById(`pdf-overlay-${match.pageNum}`)
        if (!overlay) return

        const highlight = document.createElement("div")
        highlight.setAttribute('data-uc-id', ucId)
        highlight.setAttribute('data-match-index', String(index))
        highlight.className = `absolute cursor-pointer transition-all ${
          selectedText === ucId
            ? "bg-orange-400 opacity-90 ring-2 ring-blue-500"
            : "bg-orange-300 opacity-70 hover:opacity-90"
        }`
        highlight.style.left = `${match.x}px`
        highlight.style.top = `${match.y - match.height}px`
        highlight.style.width = `${Math.max(match.width, 30)}px`
        highlight.style.height = `${Math.max(match.height, 15)}px`
        highlight.style.pointerEvents = "auto"
        highlight.title = `UC_id: ${ucId} (${index + 1}/${matches[ucId].length}) - Click để scroll đến scenario`
        highlight.onclick = () => {
          if (onHighlightClick) {
            onHighlightClick(ucId)
          }
        }

        overlay.appendChild(highlight)
      })
    })
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
                  hl.classList.add('ring-4', 'ring-blue-500')
                  hl.style.zIndex = '10'
                } else {
                  hl.classList.remove('ring-4', 'ring-blue-500')
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
