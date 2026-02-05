'use client';

import {useState, useRef, useCallback} from 'react';
import {X, Loader2, Image as ImageIcon} from 'lucide-react';
import Cropper, {Area} from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import {Button} from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined, cid: string | undefined) => void;
  tokenSymbol?: string;
  disabled?: boolean;
  className?: string;
}

interface UploadResponse {
  success: boolean;
  cid: string;
  url: string;
  ipfsUrl: string;
  error?: string;
}

const MAX_OUTPUT_SIZE = 1920;

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise(resolve => {
    image.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use original crop dimensions (no resizing here)
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not create blob'));
        }
      },
      'image/jpeg',
      0.95,
    );
  });
}

async function compressImage(blob: Blob): Promise<Blob> {
  // Check if compression is needed (larger than FHD)
  const img = new Image();
  const url = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    // If image is within FHD bounds, return as-is
    if (img.width <= MAX_OUTPUT_SIZE && img.height <= MAX_OUTPUT_SIZE) {
      return blob;
    }

    // Compress to FHD
    const file = new File([blob], 'image.jpg', {type: 'image/jpeg'});
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: MAX_OUTPUT_SIZE,
      useWebWorker: true,
      fileType: 'image/jpeg',
    });

    return compressed;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
  isUploading,
}: {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onConfirm: (blob: Blob) => void;
  isUploading: boolean;
}) {
  const [crop, setCrop] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    try {
      const cropped = await getCroppedImg(imageUrl, croppedAreaPixels);
      const compressed = await compressImage(cropped);
      onConfirm(compressed);
    } catch (error) {
      console.error('Failed to crop image:', error);
    }
  }, [imageUrl, croppedAreaPixels, onConfirm]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isUploading) {
        onClose();
      }
    },
    [isUploading, onClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isUploading}>
        <DialogHeader>
          <DialogTitle>crop image</DialogTitle>
          <DialogDescription className="text-sm">
            drag to reposition, scroll to zoom. image will be cropped to a
            square.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-72 bg-black my-4">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              minZoom={0.999}
              maxZoom={3}
              aspect={1}
              restrictPosition={zoom > 1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid={false}
              style={{
                containerStyle: {
                  background: '#000',
                },
                cropAreaStyle: {
                  border: '2px solid #22c55e',
                },
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-dim">
          <span>zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            disabled={isUploading}
            className="flex-1 accent-green"
          />
          <span>{Math.round(zoom * 100)}%</span>
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                uploading...
              </>
            ) : (
              'crop & upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImageUpload({
  value,
  onChange,
  tokenSymbol,
  disabled,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        const file = new File([blob], 'token-image.jpg', {type: 'image/jpeg'});
        formData.append('file', file);
        if (tokenSymbol) {
          formData.append('tokenSymbol', tokenSymbol);
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data: UploadResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        onChange(data.url, data.cid);
        setShowCropModal(false);
        if (pendingImageUrl) {
          URL.revokeObjectURL(pendingImageUrl);
        }
        setPendingImageUrl(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        onChange(undefined, undefined);
      } finally {
        setIsUploading(false);
      }
    },
    [tokenSymbol, onChange, pendingImageUrl],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (pendingImageUrl) {
          URL.revokeObjectURL(pendingImageUrl);
        }
        const url = URL.createObjectURL(file);
        setPendingImageUrl(url);
        setShowCropModal(true);
      }
    },
    [pendingImageUrl],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        if (pendingImageUrl) {
          URL.revokeObjectURL(pendingImageUrl);
        }
        const url = URL.createObjectURL(file);
        setPendingImageUrl(url);
        setShowCropModal(true);
      } else {
        setError('Please upload an image file');
      }
    },
    [pendingImageUrl],
  );

  const handleRemove = useCallback(() => {
    onChange(undefined, undefined);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  const handleCropModalClose = useCallback(() => {
    if (!isUploading) {
      setShowCropModal(false);
      if (pendingImageUrl) {
        URL.revokeObjectURL(pendingImageUrl);
      }
      setPendingImageUrl(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [isUploading, pendingImageUrl]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div className="w-40 h-40 border border-border overflow-hidden flex items-center justify-center bg-background">
            <img
              src={value}
              alt="Token logo"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-2 left-2 text-sm text-dim bg-background/80 px-2 py-1">
            IPFS
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            w-40 h-40 border border-dashed border-border
            flex flex-col items-center justify-center gap-1
            cursor-pointer transition-colors
            ${dragActive ? 'border-green bg-green/5' : 'hover:border-dim'}
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 text-green animate-spin" />
              <span className="text-sm text-dim">uploading...</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border border-border flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-dim" />
              </div>
              <span className="text-sm text-dim text-center px-2">1:1</span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red text-sm mt-2">{error}</p>}

      <ImageCropModal
        isOpen={showCropModal}
        onClose={handleCropModalClose}
        imageUrl={pendingImageUrl}
        onConfirm={uploadBlob}
        isUploading={isUploading}
      />
    </div>
  );
}
