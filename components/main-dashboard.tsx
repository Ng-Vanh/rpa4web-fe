"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LogOut, Upload, FolderOpen, Plus, Settings, ChevronDown } from "lucide-react"
import { SRSManagement } from "@/components/srs-management"
import { SRSUploadScreen } from "@/components/srs-upload-screen"
import { SRSWorkspace } from "@/components/srs-workspace"
import { RunConfigManagementScreen } from "@/components/run-config-management-screen"

interface MainDashboardProps {
  user: any
  onLogout: () => void
}

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [selectedSRS, setSelectedSRS] = useState<any>(null)
  const [currentScreen, setCurrentScreen] = useState<
    "dashboard" | "srs" | "upload" | "workspace" | "runConfigManagement"
  >("dashboard")

  const [llmConfigOpen, setLlmConfigOpen] = useState(false)
  const [runConfigOpen, setRunConfigOpen] = useState(false)

  const [llmConfig, setLlmConfig] = useState({
    model: "",
    key: "",
  })

  const [runConfig, setRunConfig] = useState({
    configName: "",
    browser: "",
    browserVersion: "",
    os: "",
    osVersion: "",
    device: "",
    chromeDriverPath: "",
  })

  const handleOpenSRS = () => {
    setCurrentScreen("srs")
  }

  const handleUploadSRS = () => {
    setCurrentScreen("upload")
  }

  const handleBackToDashboard = () => {
    setCurrentScreen("dashboard")
    setSelectedSRS(null)
  }

  const handleContinueToWorkspace = (srsData: any) => {
    setSelectedSRS(srsData)
    setCurrentScreen("workspace")
  }

  const handleNavigateToWorkspace = (srs: any) => {
    setSelectedSRS(srs)
    setCurrentScreen("workspace")
  }

  const handleManageRunConfigs = () => {
    setCurrentScreen("runConfigManagement")
  }

  if (currentScreen === "srs") {
    return <SRSManagement onBack={handleBackToDashboard} onNavigateToWorkspace={handleNavigateToWorkspace} />
  }

  if (currentScreen === "upload") {
    return <SRSUploadScreen onBack={handleBackToDashboard} onContinueToWorkspace={handleContinueToWorkspace} />
  }

  if (currentScreen === "workspace" && selectedSRS) {
    return <SRSWorkspace srs={selectedSRS} onBack={handleBackToDashboard} />
  }

  if (currentScreen === "runConfigManagement") {
    return <RunConfigManagementScreen onBack={handleBackToDashboard} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">RPA4Web Testing Tool</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={handleManageRunConfigs}>
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>



            <Dialog open={llmConfigOpen} onOpenChange={setLlmConfigOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>LLM Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={llmConfig.model}
                      onChange={(e) => setLlmConfig((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="Enter model name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="key">Key</Label>
                    <Input
                      id="key"
                      type="password"
                      value={llmConfig.key}
                      onChange={(e) => setLlmConfig((prev) => ({ ...prev, key: e.target.value }))}
                      placeholder="Enter API key"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setLlmConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setLlmConfigOpen(false)}>Save Configuration</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={runConfigOpen} onOpenChange={setRunConfigOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Run Configuration (per execution)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="configName">Config Name</Label>
                      <Input
                        id="configName"
                        value={runConfig.configName}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, configName: e.target.value }))}
                        placeholder="Enter config name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="browser">Browser</Label>
                      <Select
                        value={runConfig.browser}
                        onValueChange={(value) => setRunConfig((prev) => ({ ...prev, browser: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select browser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="browserVersion">Browser Version</Label>
                      <Input
                        id="browserVersion"
                        value={runConfig.browserVersion}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, browserVersion: e.target.value }))}
                        placeholder="e.g., 120.0.6099.109"
                      />
                    </div>
                    <div>
                      <Label htmlFor="os">OS</Label>
                      <Select
                        value={runConfig.os}
                        onValueChange={(value) => setRunConfig((prev) => ({ ...prev, os: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select OS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="macos">macOS</SelectItem>
                          <SelectItem value="linux">Linux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="osVersion">OS Version</Label>
                      <Input
                        id="osVersion"
                        value={runConfig.osVersion}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, osVersion: e.target.value }))}
                        placeholder="e.g., Windows 11, macOS 14.2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="device">Device</Label>
                      <Input
                        id="device"
                        value={runConfig.device}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, device: e.target.value }))}
                        placeholder="e.g., Desktop, Mobile"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="chromeDriverPath">Chrome Driver Path</Label>
                      <Input
                        id="chromeDriverPath"
                        value={runConfig.chromeDriverPath}
                        onChange={(e) => setRunConfig((prev) => ({ ...prev, chromeDriverPath: e.target.value }))}
                        placeholder="/path/to/chromedriver"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setRunConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setRunConfigOpen(false)}>Save Configuration</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Badge variant="secondary">Welcome, {user.username}</Badge>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleUploadSRS}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-blue-600" />
                Upload New SRS
              </CardTitle>
              <CardDescription>Upload a new Software Requirements Specification document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="text-center">
                  <Plus className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload file</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenSRS}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2 text-green-600" />
                Open Existing SRS
              </CardTitle>
              <CardDescription>Browse and open previously uploaded SRS documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="text-center">
                  <FolderOpen className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to browse files</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest testing activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <p className="font-medium">SRS Booking System</p>
                  <p className="text-muted-foreground">Last modified 2 hours ago</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Payment Flow Tests</p>
                  <p className="text-muted-foreground">Last modified 1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">R4W</span>
            </div>
            <span className="font-medium">rpa4web</span>
          </div>
        </div>
      </div>
    </div>
  )
}
