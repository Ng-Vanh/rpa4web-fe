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

export function PDFViewerWithHighlight({
  pdfUrl,
  highlightTexts,
  onHighlightClick,
  selectedText,
}: PDFViewerWithHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())

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
            const response = await fetch(pdfUrl)
            if (!response.ok) {
              throw new Error(`Không thể fetch blob URL: ${response.status}`)
            }
            const arrayBuffer = await response.arrayBuffer()
            pdfSource = { data: arrayBuffer }
            console.log("PDF loaded from blob as ArrayBuffer, size:", arrayBuffer.byteLength)
          } catch (fetchError: any) {
            console.error("Error fetching blob URL:", fetchError)
            // Fallback: thử dùng URL trực tiếp
            pdfSource = { url: pdfUrl }
          }
        } else {
          pdfSource = { url: pdfUrl }
        }
        
        const loadingTask = pdfjs.getDocument({
          ...pdfSource,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '3.11.174'}/cmaps/`,
          cMapPacked: true,
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

  // Render pages - đơn giản hóa, chỉ hiển thị PDF
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return

    const renderPages = async () => {
      // Clear container trước khi render
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 }) // Giảm scale để load nhanh hơn

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

        // Thêm canvas vào container
        const pageContainer = document.createElement("div")
        pageContainer.className = "flex justify-center mb-4"
        pageContainer.id = `pdf-page-container-${pageNum}`

        pageContainer.appendChild(canvas)
        
        // Check containerRef trước khi append
        if (containerRef.current) {
          containerRef.current.appendChild(pageContainer)
        }

        canvasRefs.current.set(pageNum, canvas)
      }
    }

    renderPages()
  }, [pdfDoc, totalPages])

  // Tạm thời bỏ highlight - chỉ hiển thị PDF

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
