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
import { uploadStepImage } from "@/service/testcase-step"
import { Save, Trash2, Upload, X } from "lucide-react"

// ... existing imports ...

interface StepEditModalProps {
  isOpen: boolean
  onClose: () => void
  step: any
  onSave: (stepData: any) => void
}

export function StepEditModal({ isOpen, onClose, step, onSave }: StepEditModalProps) {
  const [formData, setFormData] = useState({
    actionDescription: "",
    inputData: "",
    expectedOutput: "", // Changed from expectedResult to expectedOutput to match API
  })
  const [stepImage, setStepImage] = useState<File | null>(null)
  const [stepImageUrl, setStepImageUrl] = useState<string>("")
  const [imageUploadLoading, setImageUploadLoading] = useState(false)

  useEffect(() => {
    if (step && isOpen) {
      setFormData({
        actionDescription: step.actionDescription || step.action_description || "",
        inputData: step.inputData || step.input_data || "",
        expectedOutput: step.expectedOutput || step.expected_output || step.expectedResult || step.expected_result || "",
      })
      setStepImageUrl(step.imgUrl || step.stepImageUrl || step.img_url || "")
      setStepImage(step.stepImage || null)
    }
  }, [step, isOpen])

  const handleSave = async () => {
    try {
      setImageUploadLoading(true);

      const updatedStep = {
        ...step,
        // Use consistent field names that match API expectations
        actionDescription: formData.actionDescription,
        inputData: formData.inputData,
        expectedOutput: formData.expectedOutput,
        stepImage: stepImage instanceof File ? stepImage : undefined, // Send actual file to API
        imgUrl: stepImageUrl, // Keep for UI display
      }

      await onSave(updatedStep);
      onClose();
    } catch (error) {
      console.error("Error saving step:", error);
      alert("Error saving step. Please try again.");
    } finally {
      setImageUploadLoading(false);
    }
  }

  const handleCancel = () => {
    if (step) {
      setFormData({
        actionDescription: step.actionDescription || step.action_description || "",
        inputData: step.inputData || step.input_data || "",
        expectedOutput: step.expectedOutput || step.expected_output || step.expectedResult || step.expected_result || "",
      })
      setStepImageUrl(step.imgUrl || step.stepImageUrl || step.img_url || "")
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
    setStepImageUrl("")
  }

  if (!step) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step.id && typeof step.id === 'number' && step.id > 0 ? 'Edit' : 'Add New'} Step {step.stepOrder}
          </DialogTitle>
          <DialogDescription>
            Modify the step attributes and upload a reference image to help describe UI elements or actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step Description */}
          <div className="space-y-2">
            <Label htmlFor="actionDescription">Step Description *</Label>
            <Textarea
              id="actionDescription"
              value={formData.actionDescription}
              onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
              placeholder="Enter step description..."
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Input Data */}
          <div className="space-y-2">
            <Label htmlFor="inputData">Input Data</Label>
            <Input
              id="inputData"
              value={formData.inputData}
              onChange={(e) => setFormData({ ...formData, inputData: e.target.value })}
              placeholder="Enter input data (optional)"
            />
          </div>

          {/* Expected Output */}
          <div className="space-y-2">
            <Label htmlFor="expectedOutput">Expected Output</Label>
            <Textarea
              id="expectedOutput"
              value={formData.expectedOutput}
              onChange={(e) => setFormData({ ...formData, expectedOutput: e.target.value })}
              placeholder="Enter the expected output of this step..."
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
                  {stepImageUrl ? (
                    <img
                      src={stepImageUrl}
                      alt={`Step ${step.stepOrder} reference image`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No image uploaded</p>
                      </div>
                    </div>
                  )}
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
                {stepImageUrl && (
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
          <Button variant="outline" onClick={handleCancel} disabled={imageUploadLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.actionDescription.trim() || imageUploadLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {imageUploadLoading ? "Uploading..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}