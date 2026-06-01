"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Play, Settings, User, Globe, CheckCircle, X, Trash2 } from "lucide-react"
import { TestCaseDetailScreen } from "@/components/test-case-detail-screen"
import { SimpleTestCaseModal } from "@/components/simple-test-case-modal"
import { getListTestScenarios, createTestScenario } from "@/service/testscenario"
import { getAllTestCases, createTestCase, deleteTestCase } from "@/service/testcase"
import { deleteScenario } from "@/service/scenario"
import { toast } from "@/components/ui/use-toast"

interface TestScenarioScreenProps {
  onBack: () => void
  srsId: number
}

interface TestScenario {
  id: number,
  srsDocument: {
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
  description: string,
  testClassification: string,
  runConfig?: string,
  createdAt: string,
  updatedAt: string
}

function formatScenarioDescription(description: unknown): string {
  if (!description) return ""

  if (typeof description === "string") {
    try {
      const parsed = JSON.parse(description)
      return formatScenarioDescription(parsed)
    } catch {
      return description
    }
  }

  if (typeof description === "object") {
    const value = description as Record<string, unknown>
    const preferred =
      value.purpose ??
      value.Title ??
      value.title ??
      value.expectedResult ??
      value.precondition

    if (typeof preferred === "string") return preferred
    return JSON.stringify(value)
  }

  return String(description)
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
  const [createTestCaseLoading, setCreateTestCaseLoading] = useState(false)
  const [scenarioCaseCounts, setScenarioCaseCounts] = useState<{ [scenarioId: number]: number }>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: "", description: "", onConfirm: () => {} })

  // States cho Create Test Scenario Dialog
  const [isCreateScenarioDialogOpen, setIsCreateScenarioDialogOpen] = useState(false)
  const [scenarioFormData, setScenarioFormData] = useState({
    title: '',
    webUrl: '',
  })
  const [purpose, setPurpose] = useState('')
  const [additionalFields, setAdditionalFields] = useState<{ key: string; value: string }[]>([])
  const [createScenarioLoading, setCreateScenarioLoading] = useState(false)
  const [scenarioError, setScenarioError] = useState('')

  // Fetch test scenarios
  useEffect(() => {
    fetchScenarios()
  }, [srsId])

  const fetchScenarios = async () => {
    try {
      setLoading(true)
      const response = await getListTestScenarios(srsId)
      const list: TestScenario[] = response.data || response
      setScenarios(list)
      if (list.length > 0) {
        setSelectedScenario(list[0])
      }
      // fetch test case counts for all scenarios in parallel
      const counts = await Promise.all(
        list.map(async (s) => {
          try {
            const r = await getAllTestCases(s.id)
            return { id: s.id, count: (r.data || r).length }
          } catch {
            return { id: s.id, count: 0 }
          }
        })
      )
      const countsMap: { [id: number]: number } = {}
      counts.forEach(({ id, count }) => { countsMap[id] = count })
      setScenarioCaseCounts(countsMap)
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
        const cases = response.data || response
        setTestCases(cases)
        setScenarioCaseCounts((prev) => ({ ...prev, [selectedScenario.id]: cases.length }))
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

  // Handle Create Test Scenario
  const handleAddField = () => {
    setAdditionalFields([...additionalFields, { key: '', value: '' }])
  }

  const handleRemoveField = (index: number) => {
    setAdditionalFields(additionalFields.filter((_, i) => i !== index))
  }

  const handleUpdateField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...additionalFields]
    updated[index][field] = value
    setAdditionalFields(updated)
  }

  const handleCreateScenario = async () => {
    setScenarioError('')

    // Validate
    if (!scenarioFormData.title || !scenarioFormData.webUrl) {
      setScenarioError('Please fill all required fields')
      return
    }

    if (!purpose.trim()) {
      setScenarioError('Purpose is required in description')
      return
    }

    setCreateScenarioLoading(true)
    try {
      // Build description JSON
      const descriptionObj: any = {
        purpose: purpose.trim()
      }

      // Add additional fields
      additionalFields.forEach(field => {
        if (field.key.trim()) {
          descriptionObj[field.key.trim()] = field.value.trim()
        }
      })

      const payload = {
        srsId: srsId.toString(),
        title: scenarioFormData.title,
        description: JSON.stringify(descriptionObj),
        webUrl: scenarioFormData.webUrl
      }

      const result = await createTestScenario(payload)
      
      // Reset form
      setScenarioFormData({ title: '', webUrl: '' })
      setPurpose('')
      setAdditionalFields([])
      setIsCreateScenarioDialogOpen(false)
      
      // Refresh scenarios list
      await fetchScenarios()
      
      toast({
        title: "Success",
        description: "Test scenario created successfully",
      })
    } catch (err: any) {
      setScenarioError(err.message || 'Failed to create test scenario')
      toast({
        title: "Error",
        description: "Failed to create test scenario",
        variant: "destructive",
      })
    } finally {
      setCreateScenarioLoading(false)
    }
  }

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

  const handleSaveSimpleTestCase = async (testCaseData: any) => {
    try {
      setCreateTestCaseLoading(true)
      const createdTestCase = await createTestCase(testCaseData)
      setTestCases((prev) => [...prev, createdTestCase])
      setSelectedTestCase(createdTestCase)
      setCurrentView("testcase")
      toast({
        title: "Success",
        description: "Test case created successfully",
      })
    } catch (error) {
      console.error("Failed to create test case:", error)
      toast({
        title: "Error",
        description: "Failed to create test case. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreateTestCaseLoading(false)
    }
  }

  const handleDeleteTestCase = async (e: React.MouseEvent, testCaseId: number) => {
    e.stopPropagation()
    setConfirmDialog({
      open: true,
      title: "Delete Test Case",
      description: "Are you sure you want to delete this test case? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteTestCase(testCaseId)
          const updated = testCases.filter((tc) => tc.id !== testCaseId)
          setTestCases(updated)
          if (selectedScenario) {
            setScenarioCaseCounts((prev) => ({ ...prev, [selectedScenario.id]: updated.length }))
          }
          toast({ title: "Success", description: "Test case deleted successfully" })
        } catch (error) {
          console.error("Failed to delete test case:", error)
          toast({ title: "Error", description: "Failed to delete test case", variant: "destructive" })
        }
      },
    })
  }

  const handleDeleteScenario = async (e: React.MouseEvent, scenarioId: number) => {
    e.stopPropagation()
    setConfirmDialog({
      open: true,
      title: "Delete Scenario",
      description: "Are you sure you want to delete this scenario and all its test cases? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteScenario(scenarioId)
          const updated = scenarios.filter((s) => s.id !== scenarioId)
          setScenarios(updated)
          if (selectedScenario?.id === scenarioId) {
            setSelectedScenario(updated[0] ?? null)
            setTestCases([])
          }
          setScenarioCaseCounts((prev) => {
            const next = { ...prev }
            delete next[scenarioId]
            return next
          })
          toast({ title: "Success", description: "Scenario deleted successfully" })
        } catch (error) {
          console.error("Failed to delete scenario:", error)
          toast({ title: "Error", description: "Failed to delete scenario", variant: "destructive" })
        }
      },
    })
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
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">Test Scenarios</h2>
              <p className="text-sm text-muted-foreground">Select a scenario to view test cases</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateScenarioDialogOpen(true)}
              className="ml-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            {loading ? (
              <div className="text-center text-muted-foreground">Loading scenarios...</div>
            ) : scenarios.length === 0 ? (
              <div className="text-center text-muted-foreground">No scenarios found</div>
            ) : (
              scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={`cursor-pointer transition-colors ${selectedScenario?.id === scenario.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{scenario.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="">
                      <div className="flex items-center text-sm text-muted-foreground">
                        {/* <Globe className="h-3 w-3 mr-1" /> */}
                        <span className="truncate">{scenario.webUrl}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {formatScenarioDescription(scenario?.description)}
                      </p>
                      <div className="flex items-center justify-between pt-4">
                        <Badge variant="secondary" className="text-xs">
                          {scenarioCaseCounts[scenario.id] ?? 0} test cases
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
                <p className="text-muted-foreground">
                  {formatScenarioDescription(selectedScenario?.description)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Showing 1 to {testCases.length} of {testCases.length} entries
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
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
                    <TableHead>Test Item</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase, index) => (
                    <TableRow
                      key={testCase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTestCaseClick(testCase)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {index + 1}. {testCase.testItem}
                          </div>
                          {testCase.runConfig && (
                            <div className="text-xs text-muted-foreground">Config: {testCase.runConfig}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-sm">{testCase.testClassification}</div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteTestCase(e, testCase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      
                      {/* <TableCell>
                        <div className="text-sm">
                          <div>-</div>
                          <div className="text-muted-foreground">-</div>
                        </div>
                      </TableCell> */}
                      {/* <TableCell>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Create Test Scenario Dialog */}
      <Dialog open={isCreateScenarioDialogOpen} onOpenChange={setIsCreateScenarioDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Test Scenario</DialogTitle>
          </DialogHeader>

          {scenarioError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {scenarioError}
            </div>
          )}

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={scenarioFormData.title}
                onChange={(e) => setScenarioFormData({ ...scenarioFormData, title: e.target.value })}
                placeholder="Enter scenario title"
              />
            </div>

            {/* Web URL */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Web URL <span className="text-red-500">*</span>
              </label>
              <Input
                type="url"
                value={scenarioFormData.webUrl}
                onChange={(e) => setScenarioFormData({ ...scenarioFormData, webUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            {/* Description Section */}
            <div className="border-t pt-5">
              <h4 className="text-md font-semibold mb-4">Description (JSON)</h4>
              
              {/* Purpose - Required */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Verify that users can successfully log in and handle login failures"
                  rows={3}
                />
              </div>

              {/* Additional Fields */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">
                    Additional Properties <span className="text-gray-400">(Optional)</span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddField}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {additionalFields.length > 0 && (
                  <div className="space-y-3">
                    {additionalFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-md border">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={field.key}
                            onChange={(e) => handleUpdateField(index, 'key', e.target.value)}
                            placeholder="Key (e.g., module)"
                            className="text-sm"
                          />
                          <Input
                            value={field.value}
                            onChange={(e) => handleUpdateField(index, 'value', e.target.value)}
                            placeholder="Value (e.g., Authentication)"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveField(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {additionalFields.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No additional fields added</p>
                )}
              </div>

              {/* Preview JSON */}
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-xs font-medium text-gray-600 mb-1">Preview JSON:</p>
                <pre className="text-xs text-gray-800 overflow-x-auto">
                  {JSON.stringify(
                    {
                      purpose: purpose || '...',
                      ...additionalFields.reduce((acc, field) => {
                        if (field.key.trim()) {
                          acc[field.key.trim()] = field.value.trim() || '...';
                        }
                        return acc;
                      }, {} as Record<string, string>)
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateScenarioDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateScenario}
                disabled={createScenarioLoading}
              >
                {createScenarioLoading ? 'Creating...' : 'Create Scenario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SimpleTestCaseModal */}
      <SimpleTestCaseModal
        open={isSimpleTestCaseModalOpen}
        onOpenChange={setIsSimpleTestCaseModalOpen}
        onSave={handleSaveSimpleTestCase}
        scenarioId={selectedScenario?.id || 0}
      />

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setConfirmDialog((prev) => ({ ...prev, open: false }))
                confirmDialog.onConfirm()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
