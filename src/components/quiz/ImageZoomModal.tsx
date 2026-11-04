import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ZoomIn, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageZoomModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export const ImageZoomModal = ({ imageUrl, isOpen, onClose, alt = "Question image" }: ImageZoomModalProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
  };

  const getCenter = (touch1: React.Touch, touch2: React.Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistance.current = getDistance(e.touches[0], e.touches[1]);
      lastTouchCenter.current = getCenter(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = newDistance / lastTouchDistance.current;
      
      setScale(prev => Math.min(Math.max(prev * scaleChange, 1), 4));
      lastTouchDistance.current = newDistance;

      // Pan while zooming
      if (lastTouchCenter.current) {
        const newCenter = getCenter(e.touches[0], e.touches[1]);
        setPosition(prev => ({
          x: prev.x + (newCenter.x - lastTouchCenter.current!.x),
          y: prev.y + (newCenter.y - lastTouchCenter.current!.y),
        }));
        lastTouchCenter.current = newCenter;
      }
    } else if (e.touches.length === 1 && isDragging && dragStart.current && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.current.x;
      const newY = e.touches[0].clientY - dragStart.current.y;
      
      // Limit panning based on zoom level
      const maxPan = (scale - 1) * 150;
      setPosition({
        x: Math.min(Math.max(newX, -maxPan), maxPan),
        y: Math.min(Math.max(newY, -maxPan), maxPan),
      });
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    dragStart.current = null;
    setIsDragging(false);

    // Reset position if zoomed out
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      if (scale > 1) {
        handleReset();
      } else {
        setScale(2);
      }
    }
    lastTap.current = now;
  }, [scale, handleReset]);

  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-border">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {scale > 1 && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleReset}
              className="rounded-full bg-background/80 hover:bg-background"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
            aria-label="Close image"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Zoom indicator */}
        {scale > 1 && (
          <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-background/80 text-xs font-medium text-foreground">
            {Math.round(scale * 100)}%
          </div>
        )}

        <div 
          ref={containerRef}
          className="flex items-center justify-center p-4 min-h-[300px] touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[80vh] object-contain rounded-lg transition-transform duration-100"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? "grab" : "default",
            }}
            onTouchEnd={handleDoubleTap}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
            draggable={false}
          />
        </div>

        {/* Mobile hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 text-xs text-muted-foreground sm:hidden">
          Pinch to zoom • Double-tap to reset
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ClickableQuestionImageProps {
  imageUrl: string | null;
  onImageClick: () => void;
  className?: string;
}

export const ClickableQuestionImage = ({ imageUrl, onImageClick, className = "" }: ClickableQuestionImageProps) => {
  if (!imageUrl) return null;

  return (
    <div 
      className={`mb-6 rounded-lg border border-border overflow-hidden bg-muted/30 cursor-pointer group relative ${className}`}
      onClick={onImageClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onImageClick();
        }
      }}
      aria-label="Click to expand image"
    >
      <img 
        src={imageUrl} 
        alt="Question diagram"
        className="w-full max-h-64 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-2 shadow-lg">
          <ZoomIn className="w-5 h-5 text-foreground" />
        </div>
      </div>
    </div>
  );
};
