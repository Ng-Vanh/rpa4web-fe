import { X, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title,
}: ImageViewerModalProps) {
  // scale: multiplier relative to "fit-to-container". 1 = fit-to-container, 2 = 200% of fit, ...
  const [scale, setScale] = useState<number>(1);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [fitScale, setFitScale] = useState<number>(1); // computed so that naturalSize * fitScale fits container
  const containerRef = useRef<HTMLDivElement | null>(null); // the scrollable image container
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // reset visual scale to fit (1) when closing (keeps behavior predictable)
      setScale(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // compute effective transform scale = fitScale * scale
  const effectiveScale = fitScale * scale;

  // update natural image size when image loads
  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || img.width || img.clientWidth;
    const h = img.naturalHeight || img.height || img.clientHeight;
    setNaturalSize({ w, h });
  };

  // recompute fitScale based on container size and natural image size
  const updateFitScale = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const { w: nw, h: nh } = naturalSize;
    if (!nw || !nh) return;

    const rect = container.getBoundingClientRect();
    // available area inside the container (it already centers the image)
    const availableW = rect.width;
    const availableH = rect.height;

    const computedFit = Math.min(availableW / nw, availableH / nh, 1);
    setFitScale((prev) => {
      // only update when different enough to avoid infinite loops
      if (Math.abs(prev - computedFit) > 1e-3) return computedFit;
      return prev;
    });
  };

  // observe container size changes (responsive)
  useEffect(() => {
    updateFitScale();
    const ro = new ResizeObserver(() => {
      updateFitScale();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateFitScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFitScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalSize.w, naturalSize.h]);

  // when natural size is known, compute fit scale immediately
  useEffect(() => {
    updateFitScale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalSize.w, naturalSize.h]);

  // center the scroll position when effectiveScale changes (so zoom focuses center)
  useEffect(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    // Give the browser a tick to apply layout changes before reading sizes
    requestAnimationFrame(() => {
      const naturalW = img.naturalWidth || img.clientWidth || 0;
      const naturalH = img.naturalHeight || img.clientHeight || 0;
      const scaledW = naturalW * effectiveScale;
      const scaledH = naturalH * effectiveScale;

      // center scroll (only when scaled is bigger than container)
      container.scrollLeft = Math.max(0, (scaledW - container.clientWidth) / 2);
      container.scrollTop = Math.max(0, (scaledH - container.clientHeight) / 2);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScale]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    // also center
    requestAnimationFrame(() => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return;
      const naturalW = img.naturalWidth || img.clientWidth || 0;
      const naturalH = img.naturalHeight || img.clientHeight || 0;
      const scaledW = naturalW * fitScale;
      const scaledH = naturalH * fitScale;
      container.scrollLeft = Math.max(0, (scaledW - container.clientWidth) / 2);
      container.scrollTop = Math.max(0, (scaledH - container.clientHeight) / 2);
    });
  };

  const handleDownload = async () => {
    const filename =
      title && title.trim().length
        ? title.replace(/[^a-z0-9]/gi, "_") + ".png"
        : "image.png";

    try {
      // try to fetch the image and download as blob (works if server allows CORS)
      const res = await fetch(imageUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Network response not ok");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // fallback: open image in new tab so user can right-click -> Save as...
      const opened = window.open(imageUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        // last resort: try anchor with download (may be blocked by CORS)
        const a = document.createElement("a");
        a.href = imageUrl;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-6 z-10">
        <div className="flex items-center justify-between text-white">
          <h3 className="font-semibold text-lg truncate max-w-2xl">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Container (centered) */}
      <div
        className="w-full h-full flex items-center justify-center p-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={title}
            onLoad={onImgLoad}
            className="transition-transform duration-200 ease-out shadow-2xl object-contain max-w-full max-h-full"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 z-10">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            disabled={scale <= 0.5}
            className="text-white hover:bg-white/20"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="text-white hover:bg-white/20 min-w-[80px]"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {Math.round(scale * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            disabled={scale >= 3}
            className="text-white hover:bg-white/20"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
