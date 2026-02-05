'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './button';

interface ImageUploadProps {
    value?: string; // Current image URL
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
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            onChange(undefined, undefined);
        } finally {
            setIsUploading(false);
        }
    }, [tokenSymbol, onChange]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    }, [uploadFile]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            uploadFile(file);
        } else {
            setError('Please upload an image file');
        }
    }, [uploadFile]);

    const handleRemove = useCallback(() => {
        onChange(undefined, undefined);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [onChange]);

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
                // Preview uploaded image
                <div className="relative group">
                    <div className="w-full h-32 border border-border overflow-hidden flex items-center justify-center bg-background">
                        <img
                            src={value}
                            alt="Token logo"
                            className="max-w-full max-h-full object-contain"
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
                    <div className="absolute bottom-2 left-2 text-xs text-dim bg-background/80 px-2 py-1">
                        IPFS uploaded
                    </div>
                </div>
            ) : (
                // Upload area
                <div
                    onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`
            w-full h-32 border border-dashed border-border 
            flex flex-col items-center justify-center gap-2
            cursor-pointer transition-colors
            ${dragActive ? 'border-green bg-green/5' : 'hover:border-dim'}
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-6 w-6 text-green animate-spin" />
                            <span className="text-xs text-dim">uploading to IPFS...</span>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 border border-border flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-dim" />
                            </div>
                            <span className="text-xs text-dim">
                                click or drag image to upload
                            </span>
                            <span className="text-xs text-dim/60">
                                PNG, JPG, GIF up to 5MB
                            </span>
                        </>
                    )}
                </div>
            )}

            {error && (
                <p className="text-red text-xs mt-2">{error}</p>
            )}
        </div>
    );
}
