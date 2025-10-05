"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Trash2, Upload, X } from "lucide-react";

interface StepEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: any;
  onSave: (stepData: any) => void;
}

// Component hiển thị ảnh với thông tin kích thước
function ImagePreview({
  imageUrl,
  altText,
  emptyText = "No image uploaded",
}: {
  imageUrl: string;
  altText: string;
  emptyText?: string;
}) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[120px]">
        <div className="text-center text-muted-foreground py-8">
          <Upload className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg overflow-hidden">
      <div className="flex items-center justify-center min-h-[120px] p-4">
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-[300px] object-contain"
        />
      </div>
      {dimensions && (
        <div className="px-3 py-2 bg-muted/50 border-t text-xs text-muted-foreground text-center">
          {dimensions.width} × {dimensions.height} px
        </div>
      )}
    </div>
  );
}

export function StepEditModal({
  isOpen,
  onClose,
  step,
  onSave,
}: StepEditModalProps) {
  const [formData, setFormData] = useState({
    actionDescription: "",
    inputData: "",
    expectedOutput: "",
  });

  // State cho 3 loại ảnh
  const [stepImage, setStepImage] = useState<File | null>(null);
  const [stepImageUrl, setStepImageUrl] = useState<string>("");

  const [objectImage, setObjectImage] = useState<File | null>(null);
  const [objectImageUrl, setObjectImageUrl] = useState<string>("");

  const [relatedObjectImage, setRelatedObjectImage] = useState<File | null>(
    null
  );
  const [relatedObjectImageUrl, setRelatedObjectImageUrl] =
    useState<string>("");

  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // ===== THÊM STATE ĐỂ ĐÁNH DẤU XÓA ẢNH =====
  const [removeStepImage, setRemoveStepImage] = useState(false);
  const [removeObjectImage, setRemoveObjectImage] = useState(false);
  const [removeRelatedObjectImage, setRemoveRelatedObjectImage] =
    useState(false);
  // ===== KẾT THÚC THÊM STATE =====

  useEffect(() => {
    if (step && isOpen) {
      setFormData({
        actionDescription:
          step.actionDescription || step.action_description || "",
        inputData: step.inputData || step.input_data || "",
        expectedOutput:
          step.expectedOutput ||
          step.expected_output ||
          step.expectedResult ||
          step.expected_result ||
          "",
      });

      // Set step image
      setStepImageUrl(step.imgUrl || step.stepImageUrl || step.img_url || "");
      setStepImage(step.stepImage || null);
      setRemoveStepImage(false);

      // Set object image
      setObjectImageUrl(
        step.objectImgUrl || step.objectImageUrl || step.object_img_url || ""
      );
      setObjectImage(step.objectImage || null);
      setRemoveObjectImage(false);

      // Set related object image
      setRelatedObjectImageUrl(
        step.relatedObjectImgUrl ||
          step.relatedObjectImageUrl ||
          step.related_object_img_url ||
          ""
      );
      setRelatedObjectImage(step.relatedObjectImage || null);
      setRemoveRelatedObjectImage(false);
    }
  }, [step, isOpen]);

  const handleSave = async () => {
    try {
      setImageUploadLoading(true);

      const updatedStep = {
        ...step,
        actionDescription: formData.actionDescription,
        inputData: formData.inputData,
        expectedOutput: formData.expectedOutput,
        stepImage: stepImage instanceof File ? stepImage : undefined,
        objectImage: objectImage instanceof File ? objectImage : undefined,
        relatedObjectImage:
          relatedObjectImage instanceof File ? relatedObjectImage : undefined,
        imgUrl: stepImageUrl,
        objectImgUrl: objectImageUrl,
        relatedObjectImgUrl: relatedObjectImageUrl,
        // ===== THÊM CÁC FLAG ĐỂ ĐÁNH DẤU ẢNH CẦN XÓA =====
        removeStepImage: removeStepImage,
        removeObjectImage: removeObjectImage,
        removeRelatedObjectImage: removeRelatedObjectImage,
        // ===== KẾT THÚC THÊM FLAG =====
      };

      await onSave(updatedStep);
      onClose();
    } catch (error) {
      console.error("Error saving step:", error);
      alert("Error saving step. Please try again.");
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleCancel = () => {
    if (step) {
      setFormData({
        actionDescription:
          step.actionDescription || step.action_description || "",
        inputData: step.inputData || step.input_data || "",
        expectedOutput:
          step.expectedOutput ||
          step.expected_output ||
          step.expectedResult ||
          step.expected_result ||
          "",
      });

      // Reset step image
      setStepImageUrl(step.imgUrl || step.stepImageUrl || step.img_url || "");
      setStepImage(step.stepImage || null);
      setRemoveStepImage(false);

      // Reset object image
      setObjectImageUrl(
        step.objectImgUrl || step.objectImageUrl || step.object_img_url || ""
      );
      setObjectImage(step.objectImage || null);
      setRemoveObjectImage(false);

      // Reset related object image
      setRelatedObjectImageUrl(
        step.relatedObjectImgUrl ||
          step.relatedObjectImageUrl ||
          step.related_object_img_url ||
          ""
      );
      setRelatedObjectImage(step.relatedObjectImage || null);
      setRemoveRelatedObjectImage(false);
    }
    onClose();
  };

  const handleStepImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setStepImage(file);
    setStepImageUrl(imageUrl);
    setRemoveStepImage(false); // Reset flag khi upload ảnh mới
  };

  // ===== CẬP NHẬT HÀM XÓA ẢNH STEP =====
  const handleStepImageRemove = () => {
    setStepImage(null);
    setStepImageUrl("");
    // Đánh dấu cần xóa ảnh từ database nếu step đã có ảnh
    if (step.imgUrl || step.stepImageUrl || step.img_url) {
      setRemoveStepImage(true);
    }
  };

  const handleObjectImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setObjectImage(file);
    setObjectImageUrl(imageUrl);
    setRemoveObjectImage(false); // Reset flag khi upload ảnh mới
  };

  // ===== CẬP NHẬT HÀM XÓA ẢNH OBJECT =====
  const handleObjectImageRemove = () => {
    setObjectImage(null);
    setObjectImageUrl("");
    if (step.objectImgUrl || step.objectImageUrl || step.object_img_url) {
      setRemoveObjectImage(true);
    }
  };

  const handleRelatedObjectImageUpload = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setRelatedObjectImage(file);
    setRelatedObjectImageUrl(imageUrl);
    setRemoveRelatedObjectImage(false); // Reset flag khi upload ảnh mới
  };

  // ===== CẬP NHẬT HÀM XÓA ẢNH RELATED OBJECT =====
  const handleRelatedObjectImageRemove = () => {
    setRelatedObjectImage(null);
    setRelatedObjectImageUrl("");
    if (
      step.relatedObjectImgUrl ||
      step.relatedObjectImageUrl ||
      step.related_object_img_url
    ) {
      setRemoveRelatedObjectImage(true);
    }
  };

  if (!step) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step.id && typeof step.id === "number" && step.id > 0
              ? "Edit"
              : "Add New"}{" "}
            Step {step.stepOrder}
          </DialogTitle>
          <DialogDescription>
            Modify the step attributes and upload reference images to help
            describe UI elements or actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step Description */}
          <div className="space-y-2">
            <Label htmlFor="actionDescription">Step Description *</Label>
            <Textarea
              id="actionDescription"
              value={formData.actionDescription}
              onChange={(e) =>
                setFormData({ ...formData, actionDescription: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, inputData: e.target.value })
              }
              placeholder="Enter input data (optional)"
            />
          </div>

          {/* Expected Output */}
          <div className="space-y-2">
            <Label htmlFor="expectedOutput">Expected Output</Label>
            <Textarea
              id="expectedOutput"
              value={formData.expectedOutput}
              onChange={(e) =>
                setFormData({ ...formData, expectedOutput: e.target.value })
              }
              placeholder="Enter the expected output of this step..."
              className="min-h-[80px]"
            />
          </div>

          {/* Step Reference Image */}
          <div className="space-y-2">
            <Label>Step Reference Image</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an image to help describe this step (e.g., highlight a
              button, show UI elements)
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
                      const file = e.target.files?.[0];
                      if (file) handleStepImageUpload(file);
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStepImageRemove}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Object Image */}
          <div className="space-y-2">
            <Label>Object Image</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an image of the specific UI object being tested (e.g., a
              button, input field)
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <ImagePreview
                  imageUrl={objectImageUrl}
                  altText={`Step ${step.stepOrder} object image`}
                  emptyText="No object image uploaded"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleObjectImageUpload(file);
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                {objectImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleObjectImageRemove}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Related Object Image */}
          <div className="space-y-2">
            <Label>Related Object Image</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an image of related UI objects or context (e.g.,
              surrounding elements, form fields)
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <ImagePreview
                  imageUrl={relatedObjectImageUrl}
                  altText={`Step ${step.stepOrder} related object image`}
                  emptyText="No related object image uploaded"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRelatedObjectImageUpload(file);
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                {relatedObjectImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRelatedObjectImageRemove}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={imageUploadLoading}
          >
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
  );
}
