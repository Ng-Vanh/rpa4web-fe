"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Eye, EyeOff, Copy, Download } from "lucide-react"

interface TestCase {
  S_id: string
  "Test Objective": string
  Precondition: string
  Steps: string[]
  "Test Data"?: string
  Expected: string
  s_id: string
}

interface TestCasesViewerProps {
  data: {
    test_cases: TestCase[]
  }
  onBack?: () => void
}

export function TestCasesViewer({ data, onBack }: TestCasesViewerProps) {
  const [showTestData, setShowTestData] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set())

  const toggleTestCase = (sId: string) => {
    const newExpanded = new Set(expandedCases)
    if (newExpanded.has(sId)) {
      newExpanded.delete(sId)
    } else {
      newExpanded.add(sId)
    }
    setExpandedCases(newExpanded)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "test_cases.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleAllTestData = () => {
    // Nếu đang hiển thị rồi thì ẩn ngay lập tức
    if (showTestData) {
      setShowTestData(false)
      return
    }
    // Chưa hiển thị: mô phỏng generate 4 giây rồi mới hiện
    setIsGeneratingAll(true)
    setTimeout(() => {
      setShowTestData(true)
      setIsGeneratingAll(false)
    }, 4000)
  }

  const testCases = data.test_cases || []

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
          <h1 className="text-xl font-semibold">Generated Test Cases</h1>
          <div className="ml-auto flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllTestData}
              disabled={isGeneratingAll}
              className={showTestData ? "bg-blue-50 border-blue-200" : ""}
            >
              {showTestData ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Test Data
                </>
              ) : isGeneratingAll ? (
                <>Generating...</>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Generate All TCs
                </>
              )}
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
      </nav>

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Total Test Cases: {testCases.length}</Badge>
                <Badge variant="outline">Scenarios: {new Set(testCases.map(tc => tc.s_id)).size}</Badge>
                <Badge variant="outline">
                  {showTestData ? "Test Data: Visible" : "Test Data: Hidden"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {testCases.map((testCase, index) => {
            const isExpanded = expandedCases.has(testCase.S_id)
            
            return (
              <Card key={testCase.S_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header với S_id và Test Objective */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant="default" className="text-sm font-mono">
                          {testCase.s_id}
                        </Badge>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {testCase["Test Objective"]}
                        </h3>
                      </div>
                    </div>
                    {/* <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTestCase(testCase.S_id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </Button> */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTestCase(testCase.S_id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Gen TCs
                    </Button>
                  </div>

                  {/* Precondition */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Precondition:</span>
                      <span className="text-gray-600">{testCase.Precondition}</span>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Steps:</span>
                      <div className="flex-1">
                        <ol className="list-decimal list-inside space-y-1">
                          {testCase.Steps.map((step, stepIndex) => {
                            const raw = typeof step === 'string' ? step : String(step)
                            // Loại bỏ số thứ tự có sẵn ở đầu chuỗi (vd: "1. ", "2) ")
                            const cleaned = raw.replace(/^\s*\d+[\.)]\s*/, '')
                            return (
                              <li key={stepIndex} className="text-gray-600">
                                {cleaned}
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Expected */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold text-gray-700 min-w-[100px]">Expected:</span>
                      <span className="text-gray-600">{testCase.Expected}</span>
                    </div>
                  </div>

                  {/* Test Data - chỉ hiển thị khi showTestData = true */}
                  {showTestData && testCase["Test Data"] && (
                    <div className="mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">Test Data:</span>
                        <div className="flex-1">
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <code className="text-sm text-gray-700 whitespace-pre-wrap">
                              {testCase["Test Data"]}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {index < testCases.length - 1 && (
                    <hr className="border-gray-200 mt-4" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {testCases.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Test Cases Found</h3>
              <p className="text-muted-foreground">
                No test cases were generated from the SRS document.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
