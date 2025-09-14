"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface SimpleTestCaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (testCase: any) => void
  scenarioId: number
}

export function SimpleTestCaseModal({ open, onOpenChange, onSave, scenarioId }: SimpleTestCaseModalProps) {
  const [formData, setFormData] = useState({
    test_classification: "",
    run_config: "",
    test_item: "",
  })

  const mockRunConfigs = [
    { id: "chrome-win", name: "Chrome Windows", browser: "Chrome", version: "116", os: "Windows 11" },
    { id: "firefox-mac", name: "Firefox macOS", browser: "Firefox", version: "118", os: "macOS 13" },
    { id: "safari-mac", name: "Safari macOS", browser: "Safari", version: "16", os: "macOS 13" },
    { id: "edge-win", name: "Edge Windows", browser: "Edge", version: "116", os: "Windows 11" },
  ]

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

  const handleSave = () => {
    if (!formData.test_classification || !formData.run_config || !formData.test_item.trim()) {
      return
    }

    const newTestCase = {
      id: Date.now(),
      scenario_id: scenarioId,
      test_classification: formData.test_classification,
      run_config: formData.run_config,
      test_item: formData.test_item,
      steps: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    onSave(newTestCase)

    // Reset form
    setFormData({
      test_classification: "",
      run_config: "",
      test_item: "",
    })

    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      test_classification: "",
      run_config: "",
      test_item: "",
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
              value={formData.test_classification}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, test_classification: value }))}
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
              value={formData.run_config}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, run_config: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select run configuration" />
              </SelectTrigger>
              <SelectContent>
                {mockRunConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name} ({config.browser} on {config.os})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-item">Test Item</Label>
            <Textarea
              id="test-item"
              placeholder="Describe what will be tested..."
              value={formData.test_item}
              onChange={(e) => setFormData((prev) => ({ ...prev, test_item: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.test_classification || !formData.run_config || !formData.test_item.trim()}
            >
              Save & Continue to Steps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
