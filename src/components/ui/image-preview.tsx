import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"

export function ImagePreview({ src, alt, className }: { src: string, alt: string, className?: string }) {
    if (!src) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <img src={src} alt={alt} className={`cursor-pointer ${className}`} />
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col justify-center items-center bg-transparent border-none shadow-none">
                <DialogTitle className="sr-only">{alt}</DialogTitle>
                <img src={src} alt={alt} className="w-full h-auto max-h-[85vh] object-contain rounded-md shadow-2xl" />
            </DialogContent>
        </Dialog>
    )
}
