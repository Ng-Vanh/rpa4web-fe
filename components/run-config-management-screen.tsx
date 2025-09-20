"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Edit, Trash2, Save, Settings, Bot } from "lucide-react"
import { 
  getAllExecutionConfigs, 
  createNewExecutionConfig, 
  updateExecutionConfig, 
  getLlmConfig, 
  createLlmConfig 
} from "@/service/config" 

interface RunConfigManagementScreenProps {
  onBack: () => void
  userId?: number // Add userId prop for LLM config
}

interface ExecutionConfig {
  id: number
  name: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  chromeDriverPath: string
}

interface LlmConfig {
  id?: number
  modelName: string
  apiKey: string
  userId: number
}

export function RunConfigManagementScreen({ onBack, userId = 1 }: RunConfigManagementScreenProps) {
  // Execution Config State
  const [executionConfigs, setExecutionConfigs] = useState<ExecutionConfig[]>([])
  const [editingExecutionConfig, setEditingExecutionConfig] = useState<ExecutionConfig | null>(null)
  const [isCreateExecutionDialogOpen, setIsCreateExecutionDialogOpen] = useState(false)
  const [newExecutionConfig, setNewExecutionConfig] = useState<Omit<ExecutionConfig, "id">>({
    name: "",
    browser: "Chrome",
    browserVersion: "",
    os: "Windows",
    osVersion: "",
    device: "Desktop",
    chromeDriverPath: "",
  })

  // LLM Config State
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null)
  const [isLlmConfigDialogOpen, setIsLlmConfigDialogOpen] = useState(false)
  const [newLlmConfig, setNewLlmConfig] = useState<LlmConfig>({
    modelName: "gpt-3.5-turbo",
    apiKey: "",
    userId: userId,
  })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isExecutionConfigLoading, setIsExecutionConfigLoading] = useState(false)
  const [isLlmConfigLoading, setIsLlmConfigLoading] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load execution configs
      const executionConfigsData = await getAllExecutionConfigs()
      setExecutionConfigs(executionConfigsData)

      // Load LLM config
      try {
        const llmConfigData = await getLlmConfig(userId)
        setLlmConfig(llmConfigData)
      } catch (error) {
        console.log("No LLM config found for user")
        setLlmConfig(null)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Execution Config Functions
  const handleCreateExecutionConfig = async () => {
    if (newExecutionConfig.name.trim()) {
      setIsExecutionConfigLoading(true)
      try {
        const createdConfig = await createNewExecutionConfig(newExecutionConfig)
        setExecutionConfigs((prev) => [...prev, createdConfig])
        setNewExecutionConfig({
          name: "",
          browser: "Chrome",
          browserVersion: "",
          os: "Windows",
          osVersion: "",
          device: "Desktop",
          chromeDriverPath: "",
        })
        setIsCreateExecutionDialogOpen(false)
      } catch (error) {
        console.error("Error creating execution config:", error)
        alert("Failed to create execution config")
      } finally {
        setIsExecutionConfigLoading(false)
      }
    }
  }

  const handleEditExecutionConfig = (config: ExecutionConfig) => {
    setEditingExecutionConfig({ ...config })
  }

  const handleSaveExecutionConfigEdit = async () => {
    if (editingExecutionConfig) {
      setIsExecutionConfigLoading(true)
      try {
        const updatedConfig = await updateExecutionConfig(editingExecutionConfig.id, editingExecutionConfig)
        setExecutionConfigs((prev) => 
          prev.map((c) => (c.id === editingExecutionConfig.id ? updatedConfig : c))
        )
        setEditingExecutionConfig(null)
      } catch (error) {
        console.error("Error updating execution config:", error)
        alert("Failed to update execution config")
      } finally {
        setIsExecutionConfigLoading(false)
      }
    }
  }

  const handleDeleteExecutionConfig = async (id: number) => {
    if (confirm("Are you sure you want to delete this execution config?")) {
      // Note: You'll need to add a delete API endpoint
      setExecutionConfigs((prev) => prev.filter((c) => c.id !== id))
    }
  }

  // LLM Config Functions
  const handleCreateOrUpdateLlmConfig = async () => {
    if (newLlmConfig.modelName.trim() && newLlmConfig.apiKey.trim()) {
      setIsLlmConfigLoading(true)
      try {
        const savedConfig = await createLlmConfig(newLlmConfig)
        setLlmConfig(savedConfig)
        setIsLlmConfigDialogOpen(false)
      } catch (error) {
        console.error("Error saving LLM config:", error)
        alert("Failed to save LLM config")
      } finally {
        setIsLlmConfigLoading(false)
      }
    }
  }

  const handleEditLlmConfig = () => {
    if (llmConfig) {
      setNewLlmConfig({
        modelName: llmConfig.modelName,
        apiKey: llmConfig.apiKey,
        userId: userId,
      })
    }
    setIsLlmConfigDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading configurations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Configuration Management</h1>
            <p className="text-sm text-muted-foreground">Manage your execution and LLM configurations</p>
          </div>
        </div>
      </nav>

      <div className="p-8">
        <Tabs defaultValue="execution" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="execution" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Execution Configs
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              LLM Config
            </TabsTrigger>
          </TabsList>

          {/* Execution Configs Tab */}
          <TabsContent value="execution" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Execution Configurations</h2>
              <Dialog open={isCreateExecutionDialogOpen} onOpenChange={setIsCreateExecutionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Config
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Execution Config</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Config Name</label>
                      <Input
                        value={newExecutionConfig.name}
                        onChange={(e) => setNewExecutionConfig((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter config name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Browser</label>
                        <Select
                          value={newExecutionConfig.browser}
                          onValueChange={(value) => setNewExecutionConfig((prev) => ({ ...prev, browser: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Chrome">Chrome</SelectItem>
                            <SelectItem value="Firefox">Firefox</SelectItem>
                            <SelectItem value="Safari">Safari</SelectItem>
                            <SelectItem value="Edge">Edge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Browser Version</label>
                        <Input
                          value={newExecutionConfig.browserVersion}
                          onChange={(e) => setNewExecutionConfig((prev) => ({ ...prev, browserVersion: e.target.value }))}
                          placeholder="e.g., 116.0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">OS</label>
                        <Select
                          value={newExecutionConfig.os}
                          onValueChange={(value) => setNewExecutionConfig((prev) => ({ ...prev, os: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Windows">Windows</SelectItem>
                            <SelectItem value="macOS">macOS</SelectItem>
                            <SelectItem value="Linux">Linux</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">OS Version</label>
                        <Input
                          value={newExecutionConfig.osVersion}
                          onChange={(e) => setNewExecutionConfig((prev) => ({ ...prev, osVersion: e.target.value }))}
                          placeholder="e.g., 11, Ubuntu 22.04"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Device</label>
                      <Select
                        value={newExecutionConfig.device}
                        onValueChange={(value) => setNewExecutionConfig((prev) => ({ ...prev, device: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Desktop">Desktop</SelectItem>
                          <SelectItem value="Laptop">Laptop</SelectItem>
                          <SelectItem value="Mobile">Mobile</SelectItem>
                          <SelectItem value="Tablet">Tablet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Chrome Driver Path</label>
                      <Input
                        value={newExecutionConfig.chromeDriverPath}
                        onChange={(e) => setNewExecutionConfig((prev) => ({ ...prev, chromeDriverPath: e.target.value }))}
                        placeholder="Path to driver executable"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateExecutionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateExecutionConfig} 
                        disabled={!newExecutionConfig.name.trim() || isExecutionConfigLoading}
                      >
                        {isExecutionConfigLoading ? "Creating..." : "Create Config"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {executionConfigs.map((config) => (
                <Card key={config.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="outline">
                          {config.browser} {config.browserVersion}
                        </Badge>
                        <Badge variant="outline">
                          {config.os} {config.osVersion}
                        </Badge>
                        <Badge variant="outline">{config.device}</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditExecutionConfig(config)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteExecutionConfig(config.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        <strong>Driver Path:</strong> {config.chromeDriverPath}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* LLM Config Tab */}
          <TabsContent value="llm" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">LLM Configuration</h2>
              <Dialog open={isLlmConfigDialogOpen} onOpenChange={setIsLlmConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {llmConfig ? "Update Config" : "Create Config"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{llmConfig ? "Update LLM Config" : "Create LLM Config"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Model Name</label>
                      <Select
                        value={newLlmConfig.modelName}
                        onValueChange={(value) => setNewLlmConfig((prev) => ({ ...prev, modelName: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                          <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">API Key</label>
                      <Input
                        type="password"
                        value={newLlmConfig.apiKey}
                        onChange={(e) => setNewLlmConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsLlmConfigDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateOrUpdateLlmConfig} 
                        disabled={!newLlmConfig.modelName.trim() || !newLlmConfig.apiKey.trim() || isLlmConfigLoading}
                      >
                        {isLlmConfigLoading ? "Saving..." : (llmConfig ? "Update Config" : "Create Config")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {llmConfig ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Current LLM Configuration</CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant="outline">{llmConfig.modelName}</Badge>
                      <Badge variant="outline">API Key Configured</Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleEditLlmConfig}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Model:</strong> {llmConfig.modelName}
                    </p>
                    <p>
                      <strong>API Key:</strong> ••••••••••••••••
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No LLM Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create an LLM configuration to enable AI-powered features
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Execution Config Dialog */}
      <Dialog open={!!editingExecutionConfig} onOpenChange={() => setEditingExecutionConfig(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Execution Config</DialogTitle>
          </DialogHeader>
          {editingExecutionConfig && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Config Name</label>
                <Input
                  value={editingExecutionConfig.name}
                  onChange={(e) => setEditingExecutionConfig((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Browser</label>
                  <Select
                    value={editingExecutionConfig.browser}
                    onValueChange={(value) => setEditingExecutionConfig((prev) => (prev ? { ...prev, browser: value } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chrome">Chrome</SelectItem>
                      <SelectItem value="Firefox">Firefox</SelectItem>
                      <SelectItem value="Safari">Safari</SelectItem>
                      <SelectItem value="Edge">Edge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Browser Version</label>
                  <Input
                    value={editingExecutionConfig.browserVersion}
                    onChange={(e) =>
                      setEditingExecutionConfig((prev) => (prev ? { ...prev, browserVersion: e.target.value } : null))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">OS</label>
                  <Select
                    value={editingExecutionConfig.os}
                    onValueChange={(value) => setEditingExecutionConfig((prev) => (prev ? { ...prev, os: value } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows">Windows</SelectItem>
                      <SelectItem value="macOS">macOS</SelectItem>
                      <SelectItem value="Linux">Linux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">OS Version</label>
                  <Input
                    value={editingExecutionConfig.osVersion}
                    onChange={(e) => setEditingExecutionConfig((prev) => (prev ? { ...prev, osVersion: e.target.value } : null))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Device</label>
                <Select
                  value={editingExecutionConfig.device}
                  onValueChange={(value) => setEditingExecutionConfig((prev) => (prev ? { ...prev, device: value } : null))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Chrome Driver Path</label>
                <Input
                  value={editingExecutionConfig.chromeDriverPath}
                  onChange={(e) =>
                    setEditingExecutionConfig((prev) => (prev ? { ...prev, chromeDriverPath: e.target.value } : null))
                  }
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingExecutionConfig(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveExecutionConfigEdit} disabled={isExecutionConfigLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isExecutionConfigLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}