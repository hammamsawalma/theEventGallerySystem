"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    className?: string;
}

export function ImageUploader({ value, onChange, className = "" }: ImageUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [imgSrc, setImgSrc] = useState("");
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);

    // Clean up created object URLs
    useEffect(() => {
        return () => {
            if (imgSrc) URL.revokeObjectURL(imgSrc);
        };
    }, [imgSrc]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            handleNewFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1,
        noClick: false,
    });

    const handleNewFile = (newFile: File) => {
        setCrop(undefined);
        if (imgSrc) {
            URL.revokeObjectURL(imgSrc);
        }
        const src = URL.createObjectURL(newFile);
        setImgSrc(src);
        setFile(newFile);
        setIsCropModalOpen(true);
    };

    // Paste handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        handleNewFile(blob);
                    }
                }
            }
        };
        // Bind only if we don't already have an active modal
        if (!isCropModalOpen) {
            window.addEventListener("paste", handlePaste);
        }
        return () => window.removeEventListener("paste", handlePaste);
    }, [isCropModalOpen]);


    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // Default crop to center 80%
        const size = Math.min(width, height) * 0.8;
        const x = (width - size) / 2;
        const y = (height - size) / 2;
        setCrop({ unit: 'px', x, y, width: size, height: size });
    };

    const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<Blob> => {
        const canvas = document.createElement("canvas");
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const cropWidth = crop.width * scaleX;
        const cropHeight = crop.height * scaleY;
        const cropX = crop.x * scaleX;
        const cropY = crop.y * scaleY;

        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("No 2d context");

        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                resolve(blob);
            }, "image/jpeg", 0.95);
        });
    };

    const handleCropAndUpload = async () => {
        if (!imgRef.current) return;

        setIsUploading(true);
        try {
            let blobToUpload: Blob;

            if (completedCrop && completedCrop.width && completedCrop.height) {
                // If a crop was actually made
                blobToUpload = await getCroppedImg(imgRef.current, completedCrop, file?.name || "image.jpg");
            } else if (file) {
                // Fallback to original file if no crop made
                blobToUpload = file;
            } else {
                throw new Error("No image data");
            }

            const formData = new FormData();
            formData.append("file", blobToUpload, "cropped-" + (file?.name || "image.jpg"));

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            if (data.filepath) {
                onChange(data.filepath);
                setIsCropModalOpen(false);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-lg overflow-hidden text-center cursor-pointer transition-colors flex flex-col items-center justify-center w-full
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                    ${value ? 'h-40 bg-muted/10' : 'h-32 p-6'}
                `}
            >
                <input {...getInputProps()} />
                {value ? (
                    <>
                        <img src={value} alt="Uploaded/Cropped Result" className="object-contain w-full h-full" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 opacity-0 hover:opacity-100 transition-opacity text-foreground font-medium text-sm">
                            <UploadCloud className="w-6 h-6 mb-1 text-primary" />
                            Click, drag, or paste to replace
                        </div>
                    </>
                ) : (
                    <>
                        <UploadCloud className="w-8 h-8 text-muted-foreground mb-1" />
                        <div className="text-sm font-medium">Click, drag, or paste image here</div>
                        <div className="text-xs text-muted-foreground">JPEG, PNG, WEBP</div>
                    </>
                )}
            </div>

            <Dialog open={isCropModalOpen} onOpenChange={(open) => {
                if (!open && !isUploading) setIsCropModalOpen(false);
            }}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crop Image</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center items-center bg-muted/30 rounded border p-2 overflow-hidden" style={{ maxHeight: '60vh' }}>
                        {imgSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1} // Assuming 1:1 aspect ratio based on existing UI cards. User can resize within ratio.
                            >
                                <img
                                    ref={imgRef}
                                    src={imgSrc}
                                    onLoad={onImageLoad}
                                    style={{ maxHeight: '55vh', objectFit: 'contain' }}
                                    alt="Crop target"
                                />
                            </ReactCrop>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCropModalOpen(false)} disabled={isUploading}>Cancel</Button>
                        <Button onClick={handleCropAndUpload} disabled={isUploading}>
                            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Crop & Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
