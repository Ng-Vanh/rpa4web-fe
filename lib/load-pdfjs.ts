let pdfjsLib: any = null
let pdfjsLoading: Promise<any> | null = null

const PDFJS_VERSION = "3.11.174"
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

export async function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return null
  if (pdfjsLib) return pdfjsLib
  if (pdfjsLoading) return pdfjsLoading

  pdfjsLoading = new Promise((resolve, reject) => {
    const existing = (window as any).pdfjsLib || (window as any).pdfjs
    if (existing?.getDocument) {
      pdfjsLib = existing
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
      }
      resolve(pdfjsLib)
      return
    }

    const scriptId = "pdfjs-script"
    if (document.getElementById(scriptId)) {
      const waitForLib = setInterval(() => {
        const lib = (window as any).pdfjsLib || (window as any).pdfjs
        if (lib?.getDocument) {
          clearInterval(waitForLib)
          pdfjsLib = lib
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
          }
          ;(window as any).pdfjsLib = pdfjsLib
          resolve(pdfjsLib)
        }
      }, 100)
      setTimeout(() => {
        clearInterval(waitForLib)
        reject(new Error("Timeout khi load PDF.js"))
      }, 10000)
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.src = PDFJS_CDN
    script.async = true
    script.crossOrigin = "anonymous"
    script.onload = () => {
      pdfjsLib = (window as any).pdfjs || (window as any).pdfjsLib
      if (!pdfjsLib?.getDocument) {
        reject(new Error("PDF.js không có getDocument"))
        return
      }
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
      }
      ;(window as any).pdfjsLib = pdfjsLib
      resolve(pdfjsLib)
    }
    script.onerror = () => reject(new Error("Không thể load PDF.js từ CDN"))
    document.head.appendChild(script)
  })

  return pdfjsLoading
}

export async function loadPdfDocument(pdfjs: any, pdfUrl: string) {
  let source: { url?: string; data?: Uint8Array } = { url: pdfUrl }

  if (pdfUrl.startsWith("blob:")) {
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`Không thể đọc PDF: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) {
      throw new Error("PDF rỗng")
    }
    source = { data: new Uint8Array(buffer) }
  }

  const task = pdfjs.getDocument({
    ...source,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || PDFJS_VERSION}/cmaps/`,
    cMapPacked: true,
    verbosity: 0,
  })

  return task.promise
}
