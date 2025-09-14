"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Trash2, Save, X } from "lucide-react"

interface StepEditModalProps {
  isOpen: boolean
  onClose: () => void
  step: any
  onSave: (stepData: any) => void
}

export function StepEditModal({ isOpen, onClose, step, onSave }: StepEditModalProps) {
  const [formData, setFormData] = useState({
    action_description: "",
    input_data: "",
    expected_result: "",
  })
  const [stepImage, setStepImage] = useState<File | null>(null)
  const [stepImageUrl, setStepImageUrl] = useState<string>("")

  useEffect(() => {
    if (step && isOpen) {
      setFormData({
        action_description: step.action_description || "",
        input_data: step.input_data || "",
        expected_result: step.expected_result || "",
      })
      setStepImageUrl(step.stepImageUrl || step.img_url || "")
      setStepImage(step.stepImage || null)
    }
  }, [step, isOpen])

  const handleSave = () => {
    const updatedStep = {
      ...step,
      ...formData,
      stepImage,
      stepImageUrl,
    }
    onSave(updatedStep)
    onClose()
  }

  const handleCancel = () => {
    if (step) {
      setFormData({
        action_description: step.action_description || "",
        input_data: step.input_data || "",
        expected_result: step.expected_result || "",
      })
      setStepImageUrl(step.stepImageUrl || step.img_url || "")
      setStepImage(step.stepImage || null)
    }
    onClose()
  }

  const handleImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file)
    setStepImage(file)
    setStepImageUrl(imageUrl)
  }

  const handleImageRemove = () => {
    setStepImage(null)
    setStepImageUrl(`/placeholder.svg?height=200&width=300&query=step-${step?.step_order || 1}-screenshot`)
  }

  if (!step) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Step {step.step_order}</DialogTitle>
          <DialogDescription>
            Modify the step attributes and upload a reference image to help describe UI elements or actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step Description */}
          <div className="space-y-2">
            <Label htmlFor="action_description">Step Description</Label>
            <Textarea
              id="action_description"
              value={formData.action_description}
              onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
              placeholder="Enter step description..."
              className="min-h-[80px]"
            />
          </div>

          {/* Input Data */}
          <div className="space-y-2">
            <Label htmlFor="input_data">Input Data</Label>
            <Input
              id="input_data"
              value={formData.input_data}
              onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
              placeholder="Enter input data (optional)"
            />
          </div>

          {/* Expected Result */}
          <div className="space-y-2">
            <Label htmlFor="expected_result">Expected Result</Label>
            <Textarea
              id="expected_result"
              value={formData.expected_result}
              onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
              placeholder="Enter the expected result of this step..."
              className="min-h-[80px]"
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Step Reference Image</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an image to help describe this step (e.g., highlight a button, show UI elements)
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={stepImageUrl || "/placeholder.svg"}
                    alt={`Step ${step.step_order} reference image`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                {stepImage && (
                  <Button variant="outline" size="sm" onClick={handleImageRemove}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
