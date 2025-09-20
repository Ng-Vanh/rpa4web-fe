"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Play, Settings, User, Globe, CheckCircle } from "lucide-react"
import { TestCaseDetailScreen } from "@/components/test-case-detail-screen"
import { SimpleTestCaseModal } from "@/components/simple-test-case-modal"
import { getListTestScenarios } from "@/service/testscenario"
import { getAllTestCases, createTestCase } from "@/service/testcase"
import { toast } from "@/components/ui/use-toast" // Thêm toast để hiển thị thông báo

interface TestScenarioScreenProps {
  onBack: () => void
  srsId: number
}

interface TestScenario {
  id: number,
  srsDocument:{
    id: number,
    name: string,
    filePath: string
  },
  title: string,
  description: string,
  webUrl: string,
  history: string,
  created_at: string,
  updated_at: string
}

interface TestCase {
  id: number,
  scenario: {
    id: number,
    name: string
  },
  testItem: string,
  testClassification: string,
  runConfig?: string, // Thêm runConfig
  createdAt: string,
  updatedAt: string
}

export function TestScenarioScreen({ onBack, srsId }: TestScenarioScreenProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null)
  const [currentView, setCurrentView] = useState<"scenarios" | "testcase" | "create-testcase">("scenarios")
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isSimpleTestCaseModalOpen, setIsSimpleTestCaseModalOpen] = useState(false)
  const [selectedLLMConfig, setSelectedLLMConfig] = useState("")
  const [selectedRunConfig, setSelectedRunConfig] = useState("")
  const [loading, setLoading] = useState(true)
  const [testCasesLoading, setTestCasesLoading] = useState(false)
  const [createTestCaseLoading, setCreateTestCaseLoading] = useState(false) // Thêm loading state



  // Fetch test scenarios when component mounts
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true)
        const response = await getListTestScenarios(srsId)
        setScenarios(response.data || response)
        if ((response.data || response).length > 0) {
          setSelectedScenario((response.data || response)[0])
        }
      } catch (error) {
        console.error("Failed to fetch test scenarios:", error)
        setScenarios([])
        toast({
          title: "Error",
          description: "Failed to load test scenarios",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchScenarios()
  }, [srsId])

  // Fetch test cases when selected scenario changes
  useEffect(() => {
    const fetchTestCases = async () => {
      if (!selectedScenario) {
        setTestCases([])
        return
      }

      try {
        setTestCasesLoading(true)
        const response = await getAllTestCases(selectedScenario.id)
        setTestCases(response.data || response)
      } catch (error) {
        console.error("Failed to fetch test cases:", error)
        setTestCases([])
        toast({
          title: "Error",
          description: "Failed to load test cases",
          variant: "destructive",
        })
      } finally {
        setTestCasesLoading(false)
      }
    }

    fetchTestCases()
  }, [selectedScenario])

  const handleNewTestCase = () => {
    if (!selectedScenario) {
      toast({
        title: "Error",
        description: "Please select a scenario first",
        variant: "destructive",
      })
      return
    }
    setIsSimpleTestCaseModalOpen(true)
  }

  const handleTestCaseClick = (testCase: any) => {
    setSelectedTestCase(testCase)
    setCurrentView("testcase")
  }

  const handleBackToScenarios = () => {
    setCurrentView("scenarios")
    setSelectedTestCase(null)
  }

  const handleConfigSelection = () => {
    console.log("Selected configs:", { llm: selectedLLMConfig, run: selectedRunConfig })
    setIsConfigDialogOpen(false)
  }

  // Sửa lại hàm handleSaveSimpleTestCase để gọi API
  const handleSaveSimpleTestCase = async (testCaseData: any) => {
    try {
      setCreateTestCaseLoading(true)
      
      // Gọi API để tạo test case
      const createdTestCase = await createTestCase(testCaseData)
      
      // Cập nhật local state với test case mới được tạo
      setTestCases((prev) => [...prev, createdTestCase])
      
      // Chuyển đến view chi tiết test case
      setSelectedTestCase(createdTestCase)
      setCurrentView("testcase")
      
      // Hiển thị thông báo thành công
      toast({
        title: "Success",
        description: "Test case created successfully",
      })
      
    } catch (error) {
      console.error("Failed to create test case:", error)
      
      // Hiển thị thông báo lỗi
      toast({
        title: "Error",
        description: "Failed to create test case. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreateTestCaseLoading(false)
    }
  }

  const handleScenarioSelect = (scenario: TestScenario) => {
    setSelectedScenario(scenario)
  }

  if (currentView === "testcase" && selectedTestCase) {
    return <TestCaseDetailScreen onBack={handleBackToScenarios} testCase={selectedTestCase} initialView="execution" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SRS
          </Button>
          <h1 className="text-xl font-semibold">Test Scenarios</h1>
          <div className="ml-auto">
            <Button 
              onClick={handleNewTestCase} 
              disabled={!selectedScenario || createTestCaseLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createTestCaseLoading ? "Creating..." : "New Test Case"}
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Test Scenarios */}
        <div className="w-80 border-r bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Test Scenarios</h2>
            <p className="text-sm text-muted-foreground">Select a scenario to view test cases</p>
          </div>
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading scenarios...</div>
            ) : scenarios.length === 0 ? (
              <div className="text-center text-muted-foreground">No scenarios found</div>
            ) : (
              scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={`cursor-pointer transition-colors ${
                    selectedScenario?.id === scenario.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{scenario.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Globe className="h-3 w-3 mr-1" />
                        <span className="truncate">{scenario.webUrl}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{scenario.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {testCases.length} test cases
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Test Cases */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedScenario?.title || "Select a scenario"}</h2>
                <p className="text-muted-foreground">{selectedScenario?.description || ""}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Showing 1 to {testCases.length} of {testCases.length} entries
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            {testCasesLoading ? (
              <div className="text-center text-muted-foreground">Loading test cases...</div>
            ) : testCases.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {selectedScenario ? "No test cases found for this scenario" : "Select a scenario to view test cases"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase, index) => (
                    <TableRow
                      key={testCase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTestCaseClick(testCase)}
                    >
                      {/* <TableCell>
                        <input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} />
                      </TableCell> */}
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {index + 1}. {testCase.testItem}
                          </div>
                          <div className="text-sm text-muted-foreground">{testCase.testClassification}</div>
                          {testCase.runConfig && (
                            <div className="text-xs text-muted-foreground">Config: {testCase.runConfig}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(testCase.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            System
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(testCase.updatedAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>-</div>
                          <div className="text-muted-foreground">-</div>
                        </div>
                      </TableCell>
                      {/* <TableCell>
                        <div className="text-sm">-</div>
                      </TableCell> */}
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </TableCell>
                     
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* SimpleTestCaseModal */}
      <SimpleTestCaseModal
        open={isSimpleTestCaseModalOpen}
        onOpenChange={setIsSimpleTestCaseModalOpen}
        onSave={handleSaveSimpleTestCase}
        scenarioId={selectedScenario?.id || 0}
      />
    </div>
  )
}