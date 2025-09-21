"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Download, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface JSONViewerProps {
  data: any
  title?: string
  onBack?: () => void
}

export function JSONViewer({ data, title = "Generated Test Cases", onBack }: JSONViewerProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [showRaw, setShowRaw] = useState(false)

  const toggleKey = (key: string) => {
    const newExpanded = new Set(expandedKeys)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedKeys(newExpanded)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "generated_test_cases.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderValue = (value: any, key: string = "", level: number = 0): React.ReactNode => {
    const indent = "  ".repeat(level)
    const isExpanded = expandedKeys.has(key)

    if (value === null) {
      return <span className="text-gray-500">null</span>
    }

    if (typeof value === "string") {
      return <span className="text-green-600">"{value}"</span>
    }

    if (typeof value === "number") {
      return <span className="text-blue-600">{value}</span>
    }

    if (typeof value === "boolean") {
      return <span className="text-purple-600">{value.toString()}</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>
      }

      return (
        <div>
          <span className="text-gray-500">[</span>
          {isExpanded ? (
            <div className="ml-4">
              {value.map((item, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-500 mr-2">{index}:</span>
                  {renderValue(item, `${key}[${index}]`, level + 1)}
                  {index < value.length - 1 && <span className="text-gray-500">,</span>}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => toggleKey(key)}>
              ...{value.length} items
            </span>
          )}
          <span className="text-gray-500">]</span>
        </div>
      )
    }

    if (typeof value === "object") {
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return <span className="text-gray-500">{"{}"}</span>
      }

      return (
        <div>
          <span className="text-gray-500">{"{"}</span>
          {isExpanded ? (
            <div className="ml-4">
              {keys.map((k, index) => (
                <div key={k} className="flex">
                  <span className="text-red-600">"{k}"</span>
                  <span className="text-gray-500 mx-2">:</span>
                  {renderValue(value[k], `${key}.${k}`, level + 1)}
                  {index < keys.length - 1 && <span className="text-gray-500">,</span>}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => toggleKey(key)}>
              ...{keys.length} properties
            </span>
          )}
          <span className="text-gray-500">{"}"}</span>
        </div>
      )
    }

    return <span className="text-gray-500">{String(value)}</span>
  }

  const getDataStats = () => {
    const stats = {
      totalKeys: 0,
      arrays: 0,
      objects: 0,
      strings: 0,
      numbers: 0,
      booleans: 0
    }

    const countTypes = (obj: any) => {
      if (Array.isArray(obj)) {
        stats.arrays++
        obj.forEach(countTypes)
      } else if (obj && typeof obj === "object") {
        stats.objects++
        stats.totalKeys += Object.keys(obj).length
        Object.values(obj).forEach(countTypes)
      } else if (typeof obj === "string") {
        stats.strings++
      } else if (typeof obj === "number") {
        stats.numbers++
      } else if (typeof obj === "boolean") {
        stats.booleans++
      }
    }

    countTypes(data)
    return stats
  }

  const stats = getDataStats()

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Statistics</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRaw(!showRaw)}
                  >
                    {showRaw ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showRaw ? "Hide Raw" : "Show Raw"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Total Keys: {stats.totalKeys}</Badge>
                <Badge variant="outline">Objects: {stats.objects}</Badge>
                <Badge variant="outline">Arrays: {stats.arrays}</Badge>
                <Badge variant="outline">Strings: {stats.strings}</Badge>
                <Badge variant="outline">Numbers: {stats.numbers}</Badge>
                <Badge variant="outline">Booleans: {stats.booleans}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>JSON Data</CardTitle>
          </CardHeader>
          <CardContent>
            {showRaw ? (
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : (
              <div className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
                {renderValue(data, "root")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
