// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Badge } from "@/components/ui/badge"
// import { ArrowLeft, Plus, X, Play, CheckCircle2, AlertCircle, Upload, Trash2, Edit, Save } from "lucide-react"
// import { RunConfigManagementScreen } from "./run-config-management-screen"

// interface TestCaseCreationScreenProps {
//   onBack: () => void
//   onContinue: (testCase: any) => void
//   scenarioId: number
// }

// export function TestCaseCreationScreen({ onBack, onContinue, scenarioId }: TestCaseCreationScreenProps) {
//   const [currentView, setCurrentView] = useState<"creation" | "config-management">("creation")

//   const [testCase, setTestCase] = useState({
//     test_item: "",
//     test_classification: "Functional",
//     input_data_procedure: [""],
//     expected_output: "",
//   })

//   const [selectedRunConfig, setSelectedRunConfig] = useState<string>("")

//   const mockRunConfigs = [
//     {
//       id: "config1",
//       name: "Chrome Windows Config",
//       browser: "Chrome",
//       browserVersion: "116.0",
//       os: "Windows",
//       osVersion: "11",
//       device: "Laptop",
//       chromeDriverPath: "C:/drivers/chromedriver.exe",
//     },
//     {
//       id: "config2",
//       name: "Firefox Linux Config",
//       browser: "Firefox",
//       browserVersion: "115.0",
//       os: "Linux",
//       osVersion: "Ubuntu 22.04",
//       device: "Desktop",
//       chromeDriverPath: "/usr/local/bin/geckodriver",
//     },
//   ]

//   const [executedSteps, setExecutedSteps] = useState<{ [key: number]: { success: boolean; message: string } }>({})
//   const [currentExecutingStep, setCurrentExecutingStep] = useState<number | null>(null)
//   const [stepImages, setStepImages] = useState<{ [key: number]: { file: File | null; url: string } }>({})

//   const addTestStep = () => {
//     setTestCase((prev) => ({
//       ...prev,
//       input_data_procedure: [...prev.input_data_procedure, ""],
//     }))
//   }

//   const removeTestStep = (index: number) => {
//     setTestCase((prev) => ({
//       ...prev,
//       input_data_procedure: prev.input_data_procedure.filter((_, i) => i !== index),
//     }))
//     const newExecutedSteps = { ...executedSteps }
//     delete newExecutedSteps[index]
//     const newStepImages = { ...stepImages }
//     delete newStepImages[index]
//     const adjustedSteps: { [key: number]: { success: boolean; message: string } } = {}
//     const adjustedImages: { [key: number]: { file: File | null; url: string } } = {}
//     Object.entries(newExecutedSteps).forEach(([key, value]) => {
//       const stepIndex = Number.parseInt(key)
//       if (stepIndex > index) {
//         adjustedSteps[stepIndex - 1] = value
//       } else {
//         adjustedSteps[stepIndex] = value
//       }
//     })
//     Object.entries(newStepImages).forEach(([key, value]) => {
//       const stepIndex = Number.parseInt(key)
//       if (stepIndex > index) {
//         adjustedImages[stepIndex - 1] = value
//       } else {
//         adjustedImages[stepIndex] = value
//       }
//     })
//     setExecutedSteps(adjustedSteps)
//     setStepImages(adjustedImages)
//   }

//   const updateTestStep = (index: number, value: string) => {
//     setTestCase((prev) => ({
//       ...prev,
//       input_data_procedure: prev.input_data_procedure.map((step, i) => (i === index ? value : step)),
//     }))
//     if (executedSteps[index]) {
//       const newExecutedSteps = { ...executedSteps }
//       delete newExecutedSteps[index]
//       setExecutedSteps(newExecutedSteps)
//     }
//   }

//   const handleImageUpload = (stepIndex: number, file: File) => {
//     const imageUrl = URL.createObjectURL(file)
//     setStepImages((prev) => ({
//       ...prev,
//       [stepIndex]: { file, url: imageUrl },
//     }))
//   }

//   const handleImageRemove = (stepIndex: number) => {
//     setStepImages((prev) => {
//       const newImages = { ...prev }
//       delete newImages[stepIndex]
//       return newImages
//     })
//   }

//   const executeStep = async (index: number) => {
//     const step = testCase.input_data_procedure[index]
//     if (!step.trim()) return

//     setCurrentExecutingStep(index)

//     await new Promise((resolve) => setTimeout(resolve, 1500))

//     const success = Math.random() > 0.2
//     const message = success ? "Step executed successfully" : "Step execution failed - please verify the action"

//     setExecutedSteps((prev) => ({
//       ...prev,
//       [index]: { success, message },
//     }))

//     setCurrentExecutingStep(null)
//   }

//   const handleContinue = () => {
//     const newTestCase = {
//       id: Date.now(),
//       scenario_id: scenarioId,
//       test_item: testCase.test_item,
//       test_classification: testCase.test_classification,
//       input_data_procedure: testCase.input_data_procedure.filter((step) => step.trim() !== ""),
//       expected_output: testCase.expected_output,
//       run_config: selectedRunConfig,
//     }
//     onContinue(newTestCase)
//   }

//   const canContinue =
//     testCase.test_item.trim() !== "" && testCase.input_data_procedure.some((step) => step.trim() !== "")

//   if (currentView === "config-management") {
//     return <RunConfigManagementScreen onBack={() => setCurrentView("creation")} />
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <nav className="border-b bg-card">
//         <div className="flex h-16 items-center px-6">
//           <Button variant="ghost" onClick={onBack} className="mr-4">
//             <ArrowLeft className="h-4 w-4 mr-2" />
//             Back to Test Scenarios
//           </Button>
//           <div className="flex-1">
//             <h1 className="text-xl font-semibold">Create New Test Case</h1>
//             <p className="text-sm text-muted-foreground">Define test steps and verify execution</p>
//           </div>
//         </div>
//       </nav>

//       <div className="p-8">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between">
//             <CardTitle className="text-2xl">Test Case Details</CardTitle>
//             <Button variant="outline" size="sm">
//               <Edit className="h-4 w-4 mr-2" />
//               Edit Mode
//             </Button>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             <div className="grid grid-cols-2 gap-6">
//               <div>
//                 <h3 className="font-semibold text-sm text-muted-foreground mb-2">ID:</h3>
//                 <p className="text-base">
//                   {testCase.test_item ? testCase.test_item.replace(/\s+/g, "_") + "_001" : "NEW_TEST_CASE_001"}
//                 </p>
//               </div>
//               <div>
//                 <h3 className="font-semibold text-sm text-muted-foreground mb-2">Test Item:</h3>
//                 <Textarea
//                   value={testCase.test_item}
//                   onChange={(e) => setTestCase((prev) => ({ ...prev, test_item: e.target.value }))}
//                   placeholder="Enter test item description"
//                   className="text-base min-h-[80px]"
//                 />
//               </div>
//               <div>
//                 <h3 className="font-semibold text-sm text-muted-foreground mb-2">Test Classification:</h3>
//                 <Select
//                   value={testCase.test_classification}
//                   onValueChange={(value) => setTestCase((prev) => ({ ...prev, test_classification: value }))}
//                 >
//                   <SelectTrigger className="text-base">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Functional">Functional</SelectItem>
//                     <SelectItem value="Integration">Integration</SelectItem>
//                     <SelectItem value="UI">UI</SelectItem>
//                     <SelectItem value="Performance">Performance</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="col-span-2">
//                 <h3 className="font-semibold text-sm text-muted-foreground mb-2">Choose Run Config:</h3>
//                 <Select value={selectedRunConfig} onValueChange={setSelectedRunConfig}>
//                   <SelectTrigger className="text-base">
//                     <SelectValue placeholder="Select a run configuration" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {mockRunConfigs.map((config) => (
//                       <SelectItem key={config.id} value={config.id}>
//                         <div className="flex flex-col">
//                           <span className="font-medium">{config.name}</span>
//                           <span className="text-xs text-muted-foreground">
//                             {config.browser} {config.browserVersion} • {config.os} {config.osVersion}
//                           </span>
//                         </div>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="font-semibold text-sm text-muted-foreground">Input Data and Test Procedure:</h3>
//                 <Button type="button" variant="outline" size="sm" onClick={addTestStep}>
//                   <Plus className="h-3 w-3 mr-1" />
//                   Add Step
//                 </Button>
//               </div>
//               <div className="space-y-4">
//                 {testCase.input_data_procedure.map((step, index) => {
//                   const stepResult = executedSteps[index]
//                   const isExecuting = currentExecutingStep === index
//                   const stepImage = stepImages[index]

//                   return (
//                     <Card key={index} className="p-4">
//                       <div className="flex gap-4">
//                         <div className="flex-1 space-y-3">
//                           <div className="flex items-center justify-between">
//                             <Badge variant="outline" className="text-xs">
//                               Step {index + 1}
//                             </Badge>
//                             <div className="flex space-x-1">
//                               <Button
//                                 type="button"
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={() => executeStep(index)}
//                                 disabled={!step.trim() || isExecuting}
//                                 className="text-xs"
//                               >
//                                 {isExecuting ? (
//                                   <>
//                                     <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
//                                     Executing...
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Play className="h-3 w-3 mr-1" />
//                                     Execute
//                                   </>
//                                 )}
//                               </Button>
//                               <label className="cursor-pointer">
//                                 <input
//                                   type="file"
//                                   accept="image/*"
//                                   className="hidden"
//                                   onChange={(e) => {
//                                     const file = e.target.files?.[0]
//                                     if (file) handleImageUpload(index, file)
//                                   }}
//                                 />
//                                 <Button variant="ghost" size="sm" asChild>
//                                   <span>
//                                     <Upload className="h-3 w-3" />
//                                   </span>
//                                 </Button>
//                               </label>
//                               {stepImage && (
//                                 <Button variant="ghost" size="sm" onClick={() => handleImageRemove(index)}>
//                                   <Trash2 className="h-3 w-3" />
//                                 </Button>
//                               )}
//                               {testCase.input_data_procedure.length > 1 && (
//                                 <Button type="button" variant="ghost" size="sm" onClick={() => removeTestStep(index)}>
//                                   <X className="h-3 w-3" />
//                                 </Button>
//                               )}
//                             </div>
//                           </div>

//                           <Textarea
//                             value={step}
//                             onChange={(e) => updateTestStep(index, e.target.value)}
//                             placeholder="Enter step description..."
//                             className="text-sm min-h-[60px]"
//                           />

//                           {stepResult && (
//                             <div
//                               className={`flex items-center space-x-2 text-sm p-2 rounded-md ${
//                                 stepResult.success
//                                   ? "bg-green-50 text-green-700 border border-green-200"
//                                   : "bg-red-50 text-red-700 border border-red-200"
//                               }`}
//                             >
//                               {stepResult.success ? (
//                                 <CheckCircle2 className="h-4 w-4" />
//                               ) : (
//                                 <AlertCircle className="h-4 w-4" />
//                               )}
//                               <span>{stepResult.message}</span>
//                             </div>
//                           )}
//                         </div>

//                         <div className="w-48 flex-shrink-0">
//                           <div className="aspect-video bg-muted rounded-lg overflow-hidden">
//                             <img
//                               src={
//                                 stepImage?.url ||
//                                 `/placeholder.svg?height=200&width=300&query=step-${index + 1 || "/placeholder.svg"}-screenshot`
//                               }
//                               alt={`Step ${index + 1} screenshot`}
//                               className="w-full h-full object-cover"
//                             />
//                           </div>
//                         </div>
//                       </div>
//                     </Card>
//                   )
//                 })}
//               </div>
//             </div>

//             <div>
//               <h3 className="font-semibold text-sm text-muted-foreground mb-2">Expected Output:</h3>
//               <Textarea
//                 value={testCase.expected_output}
//                 onChange={(e) => setTestCase((prev) => ({ ...prev, expected_output: e.target.value }))}
//                 placeholder="Describe the expected output"
//                 className="text-base min-h-[80px]"
//               />
//             </div>

//             <div className="flex justify-end space-x-4 pt-6 border-t">
//               <Button variant="outline" onClick={onBack} size="lg">
//                 Cancel
//               </Button>
//               <Button
//                 onClick={handleContinue}
//                 disabled={!canContinue}
//                 className="bg-blue-600 hover:bg-blue-700 text-white"
//                 size="lg"
//               >
//                 <Save className="h-4 w-4 mr-2" />
//                 Save Test Case
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
