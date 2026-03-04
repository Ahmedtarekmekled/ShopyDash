import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, RotateCcw } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  aspect?: number;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({ open, onClose, imageSrc, onCropComplete, aspect = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    },
    [aspect]
  );

  const handleReset = () => {
    if (imgRef.current) {
      const { naturalWidth: width, naturalHeight: height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const getCroppedImage = useCallback(async () => {
    if (!imgRef.current || !crop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };

    // Use percentage-based crop
    if (crop.unit === "px") {
      pixelCrop.x = crop.x * scaleX;
      pixelCrop.y = crop.y * scaleY;
      pixelCrop.width = crop.width * scaleX;
      pixelCrop.height = crop.height * scaleY;
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
          onCropComplete(file);
          onClose();
        }
      },
      "image/jpeg",
      0.92
    );
  }, [crop, onCropComplete, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle>تعديل الصورة</DialogTitle>
            <DialogDescription>اسحب لتحديد الجزء المطلوب من الصورة</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={aspect}
            className="max-h-[50vh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              onLoad={onImageLoad}
              alt="Crop"
              className="max-h-[50vh] max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        <div className="p-4 border-t bg-background flex gap-3">
          <Button onClick={getCroppedImage} className="flex-1 gap-2">
            <Check className="w-4 h-4" />
            تأكيد القص
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} title="إعادة ضبط">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
