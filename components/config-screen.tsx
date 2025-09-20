// "use client"

// import type React from "react"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Checkbox } from "@/components/ui/checkbox"
// import { ArrowLeft, Settings, FileText } from "lucide-react"
// import { Alert, AlertDescription } from "@/components/ui/alert"

// interface ConfigScreenProps {
//   onComplete: (config: any) => void
//   onBack: () => void
//   uploadedFile?: any
// }

// export function ConfigScreen({ onComplete, onBack, uploadedFile }: ConfigScreenProps) {
//   const [config, setConfig] = useState({
//     browser: "Chrome",
//     browserVersion: "116.0",
//     os: "Windows",
//     osVersion: "11",
//     device: "Laptop",
//     chromeDriverPath: "C:/drivers/chromedriver.exe",
//     headless: false,
//   })

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     onComplete(config)
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Navigation Bar */}
//       <nav className="border-b bg-card">
//         <div className="flex h-16 items-center px-6">
//           <Button variant="ghost" onClick={onBack} className="mr-4">
//             <ArrowLeft className="h-4 w-4 mr-2" />
//             Back
//           </Button>
//           <h1 className="text-xl font-semibold">Configuration Setup</h1>
//         </div>
//       </nav>

//       {/* Main Content */}
//       <div className="container mx-auto p-6 max-w-2xl">
//         {uploadedFile && (
//           <Alert className="mb-6">
//             <FileText className="h-4 w-4" />
//             <AlertDescription>
//               <strong>Uploaded File:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
//             </AlertDescription>
//           </Alert>
//         )}

//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <Settings className="h-5 w-5 mr-2" />
//               Test Environment Configuration
//             </CardTitle>
//             <CardDescription>Configure your testing environment settings before proceeding</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="browser">Browser</Label>
//                   <Select value={config.browser} onValueChange={(value) => setConfig({ ...config, browser: value })}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="Chrome">Chrome</SelectItem>
//                       <SelectItem value="Firefox">Firefox</SelectItem>
//                       <SelectItem value="Edge">Edge</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="browserVersion">Browser Version</Label>
//                   <Input
//                     id="browserVersion"
//                     value={config.browserVersion}
//                     onChange={(e) => setConfig({ ...config, browserVersion: e.target.value })}
//                     placeholder="116.0"
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="os">Operating System</Label>
//                   <Select value={config.os} onValueChange={(value) => setConfig({ ...config, os: value })}>
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="Windows">Windows</SelectItem>
//                       <SelectItem value="macOS">macOS</SelectItem>
//                       <SelectItem value="Linux">Linux</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="osVersion">OS Version</Label>
//                   <Input
//                     id="osVersion"
//                     value={config.osVersion}
//                     onChange={(e) => setConfig({ ...config, osVersion: e.target.value })}
//                     placeholder="11"
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="device">Device Type</Label>
//                 <Select value={config.device} onValueChange={(value) => setConfig({ ...config, device: value })}>
//                   <SelectTrigger>
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Laptop">Laptop</SelectItem>
//                     <SelectItem value="Desktop">Desktop</SelectItem>
//                     <SelectItem value="Mobile">Mobile</SelectItem>
//                     <SelectItem value="Tablet">Tablet</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="chromeDriverPath">Chrome Driver Path</Label>
//                 <Input
//                   id="chromeDriverPath"
//                   value={config.chromeDriverPath}
//                   onChange={(e) => setConfig({ ...config, chromeDriverPath: e.target.value })}
//                   placeholder="C:/drivers/chromedriver.exe"
//                 />
//               </div>

//               <div className="flex items-center space-x-2">
//                 <Checkbox
//                   id="headless"
//                   checked={config.headless}
//                   onCheckedChange={(checked) => setConfig({ ...config, headless: checked as boolean })}
//                 />
//                 <Label htmlFor="headless">Run in headless mode</Label>
//               </div>

//               <Button type="submit" className="w-full">
//                 Save Configuration & Continue
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
