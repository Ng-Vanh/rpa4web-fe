"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAllExecutionConfigs } from "@/service/config" // Adjust import path as needed

interface SimpleTestCaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (testCase: any) => void
  scenarioId: number
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

export function SimpleTestCaseModal({ open, onOpenChange, onSave, scenarioId }: SimpleTestCaseModalProps) {
  const [formData, setFormData] = useState({
    testClassification: "",
    runConfig: "",
    testItem: "",
  })

  const [executionConfigs, setExecutionConfigs] = useState<ExecutionConfig[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false)

  const testClassifications = [
    "Functional Testing",
    "UI Testing",
    "Integration Testing",
    "Performance Testing",
    "Security Testing",
    "Usability Testing",
    "Compatibility Testing",
    "Regression Testing",
  ]

  // Load execution configs when modal opens
  useEffect(() => {
    if (open) {
      loadExecutionConfigs()
    }
  }, [open])

  const loadExecutionConfigs = async () => {
    setIsLoadingConfigs(true)
    try {
      const configs = await getAllExecutionConfigs()
      setExecutionConfigs(configs)
    } catch (error) {
      console.error("Error loading execution configs:", error)
      // You might want to show an error message to the user
    } finally {
      setIsLoadingConfigs(false)
    }
  }

  const handleSave = () => {
    if (!formData.testClassification || !formData.runConfig || !formData.testItem.trim()) {
      return
    }

    // Find the selected config to get more details if needed
    const selectedConfig = executionConfigs.find(config => config.id.toString() === formData.runConfig)

    // Prepare data for API call
    const apiData = {
      scenarioId: scenarioId.toString(),
      testItem: formData.testItem,
      testClassification: formData.testClassification,
      runConfig: formData.runConfig, // Include runConfig for frontend use
      configDetails: selectedConfig, // Include full config details if needed
    }

    onSave(apiData)

    // Reset form
    setFormData({
      testClassification: "",
      runConfig: "",
      testItem: "",
    })

    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      testClassification: "",
      runConfig: "",
      testItem: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Test Case</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-classification">Test Classification</Label>
            <Select
              value={formData.testClassification}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, testClassification: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select test classification" />
              </SelectTrigger>
              <SelectContent>
                {testClassifications.map((classification) => (
                  <SelectItem key={classification} value={classification}>
                    {classification}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-config">Choose Run Config</Label>
            <Select
              value={formData.runConfig}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, runConfig: value }))}
              disabled={isLoadingConfigs}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={isLoadingConfigs ? "Loading configurations..." : "Select run configuration"} 
                />
              </SelectTrigger>
              <SelectContent>
                {executionConfigs.length === 0 && !isLoadingConfigs ? (
                  <SelectItem value="no-configs" disabled>
                    No execution configs available
                  </SelectItem>
                ) : (
                  executionConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name} ({config.browser} {config.browserVersion} on {config.os} {config.osVersion})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {executionConfigs.length === 0 && !isLoadingConfigs && (
              <p className="text-sm text-muted-foreground">
                No execution configs found. Please create one in the Configuration Management section.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-item">Test Item</Label>
            <Textarea
              id="test-item"
              placeholder="Describe what will be tested..."
              value={formData.testItem}
              onChange={(e) => setFormData((prev) => ({ ...prev, testItem: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.testClassification || 
                !formData.runConfig || 
                !formData.testItem.trim() || 
                isLoadingConfigs ||
                executionConfigs.length === 0
              }
            >
              Save & Continue to Steps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
