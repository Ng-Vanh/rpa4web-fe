"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react"

interface RunConfigManagementScreenProps {
  onBack: () => void
}

interface RunConfig {
  id: string
  name: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  chromeDriverPath: string
}

export function RunConfigManagementScreen({ onBack }: RunConfigManagementScreenProps) {
  const [configs, setConfigs] = useState<RunConfig[]>([
    {
      id: "config1",
      name: "Chrome Windows Config",
      browser: "Chrome",
      browserVersion: "116.0",
      os: "Windows",
      osVersion: "11",
      device: "Laptop",
      chromeDriverPath: "C:/drivers/chromedriver.exe",
    },
    {
      id: "config2",
      name: "Firefox Linux Config",
      browser: "Firefox",
      browserVersion: "115.0",
      os: "Linux",
      osVersion: "Ubuntu 22.04",
      device: "Desktop",
      chromeDriverPath: "/usr/local/bin/geckodriver",
    },
  ])

  const [editingConfig, setEditingConfig] = useState<RunConfig | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newConfig, setNewConfig] = useState<Omit<RunConfig, "id">>({
    name: "",
    browser: "Chrome",
    browserVersion: "",
    os: "Windows",
    osVersion: "",
    device: "Desktop",
    chromeDriverPath: "",
  })

  const handleCreateConfig = () => {
    if (newConfig.name.trim()) {
      const config: RunConfig = {
        ...newConfig,
        id: `config${Date.now()}`,
      }
      setConfigs((prev) => [...prev, config])
      setNewConfig({
        name: "",
        browser: "Chrome",
        browserVersion: "",
        os: "Windows",
        osVersion: "",
        device: "Desktop",
        chromeDriverPath: "",
      })
      setIsCreateDialogOpen(false)
    }
  }

  const handleEditConfig = (config: RunConfig) => {
    setEditingConfig({ ...config })
  }

  const handleSaveEdit = () => {
    if (editingConfig) {
      setConfigs((prev) => prev.map((c) => (c.id === editingConfig.id ? editingConfig : c)))
      setEditingConfig(null)
    }
  }

  const handleDeleteConfig = (id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id))
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
            <h1 className="text-xl font-semibold">Run Config Management</h1>
            <p className="text-sm text-muted-foreground">Manage your test execution configurations</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create New Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Run Config</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Config Name</label>
                  <Input
                    value={newConfig.name}
                    onChange={(e) => setNewConfig((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter config name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Browser</label>
                    <Select
                      value={newConfig.browser}
                      onValueChange={(value) => setNewConfig((prev) => ({ ...prev, browser: value }))}
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
                      value={newConfig.browserVersion}
                      onChange={(e) => setNewConfig((prev) => ({ ...prev, browserVersion: e.target.value }))}
                      placeholder="e.g., 116.0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">OS</label>
                    <Select
                      value={newConfig.os}
                      onValueChange={(value) => setNewConfig((prev) => ({ ...prev, os: value }))}
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
                      value={newConfig.osVersion}
                      onChange={(e) => setNewConfig((prev) => ({ ...prev, osVersion: e.target.value }))}
                      placeholder="e.g., 11, Ubuntu 22.04"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Device</label>
                  <Select
                    value={newConfig.device}
                    onValueChange={(value) => setNewConfig((prev) => ({ ...prev, device: value }))}
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
                    value={newConfig.chromeDriverPath}
                    onChange={(e) => setNewConfig((prev) => ({ ...prev, chromeDriverPath: e.target.value }))}
                    placeholder="Path to driver executable"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateConfig} disabled={!newConfig.name.trim()}>
                    Create Config
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <div className="p-8">
        <div className="grid gap-6">
          {configs.map((config) => (
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
                  <Button variant="outline" size="sm" onClick={() => handleEditConfig(config)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteConfig(config.id)}>
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Run Config</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Config Name</label>
                <Input
                  value={editingConfig.name}
                  onChange={(e) => setEditingConfig((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Browser</label>
                  <Select
                    value={editingConfig.browser}
                    onValueChange={(value) => setEditingConfig((prev) => (prev ? { ...prev, browser: value } : null))}
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
                    value={editingConfig.browserVersion}
                    onChange={(e) =>
                      setEditingConfig((prev) => (prev ? { ...prev, browserVersion: e.target.value } : null))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">OS</label>
                  <Select
                    value={editingConfig.os}
                    onValueChange={(value) => setEditingConfig((prev) => (prev ? { ...prev, os: value } : null))}
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
                    value={editingConfig.osVersion}
                    onChange={(e) => setEditingConfig((prev) => (prev ? { ...prev, osVersion: e.target.value } : null))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Device</label>
                <Select
                  value={editingConfig.device}
                  onValueChange={(value) => setEditingConfig((prev) => (prev ? { ...prev, device: value } : null))}
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
                  value={editingConfig.chromeDriverPath}
                  onChange={(e) =>
                    setEditingConfig((prev) => (prev ? { ...prev, chromeDriverPath: e.target.value } : null))
                  }
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingConfig(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
