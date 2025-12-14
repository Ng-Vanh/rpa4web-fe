// utils.ts - Chứa các hàm utility (FIXED)

import { ParsedLine } from "./types"
import { IMAGE_EXTENSIONS } from "./constants"

export const parseScript = (text: string): ParsedLine[] => {
  const lines = text.split("\n")

  return lines.map((line) => {
    const trimmedLine = line.trim()

    // Case 1: URL đứng một mình trên dòng
    if (trimmedLine.match(/^https?:\/\//i) && IMAGE_EXTENSIONS.test(trimmedLine)) {
      return {
        type: "image" as const,
        content: line,
        imageUrl: trimmedLine,
      }
    }

    // Case 2: Text + [URL] (có brackets) - Ưu tiên check trước
    const matchWithBrackets = line.match(/^(.+?)\s*\[(https?:\/\/[^\]]+)\]/i)
    if (matchWithBrackets && IMAGE_EXTENSIONS.test(matchWithBrackets[2])) {
      return {
        type: "image" as const,
        content: line,
        imageUrl: matchWithBrackets[2],
        prefix: matchWithBrackets[1].trim(),
      }
    }

    // Case 3 (MỚI): Text + URL (không có brackets)
    // Tìm URL ảnh ở bất kỳ đâu trong dòng
    const imageUrlMatch = trimmedLine.match(/(https?:\/\/\S+)/i)
    if (imageUrlMatch && IMAGE_EXTENSIONS.test(imageUrlMatch[1])) {
      const imageUrl = imageUrlMatch[1]
      const prefix = trimmedLine.substring(0, trimmedLine.indexOf(imageUrl)).trim()
      
      return {
        type: "image" as const,
        content: line,
        imageUrl: imageUrl,
        prefix: prefix || undefined,
      }
    }

    // Default: Text thường
    return {
      type: "text" as const,
      content: line,
    }
  })
}

export const getScriptContentFromEditor = (editorElement: HTMLDivElement | null): string => {
  if (!editorElement) return ""
  
  const result: string[] = []
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ""
    } else if (node.nodeName === "IMG") {
      const img = node as HTMLImageElement
      return img.src
    } else if (node.nodeName === "BR") {
      return "\n"
    } else if (node.nodeName === "DIV") {
      // Process children of DIV
      const childContent = Array.from(node.childNodes)
        .map(child => processNode(child))
        .join("")
      return "\n" + childContent
    } else {
      // Process children of other elements
      return Array.from(node.childNodes)
        .map(child => processNode(child))
        .join("")
    }
  }
  
  const content = Array.from(editorElement.childNodes)
    .map(node => processNode(node))
    .join("")
  
  return content.trim()
}