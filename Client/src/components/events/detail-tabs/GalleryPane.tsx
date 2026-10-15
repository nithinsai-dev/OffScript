import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface GalleryPaneProps {
  galleryImages?: string[]
}

export function GalleryPane({ galleryImages = [] }: GalleryPaneProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Escape key closes lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null)
    }
    if (selectedImage) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
            VISUAL ARCHIVE
          </span>
          <span className="font-mono text-[10px] text-bone/50 uppercase">
            {galleryImages.length} Photographs
          </span>
        </div>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Pass Gallery
        </h3>
      </div>

      {galleryImages.length === 0 ? (
        <p className="font-sans text-sm text-bone/70">
          Photographs and event stage previews will be uploaded following the campus inauguration.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Native scroll-snap rail (No wheel capture, wheel continues normal page scroll) */}
          <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar snap-x snap-mandatory">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImage(img)}
                aria-label={`Open photo ${idx + 1} in lightbox`}
                className="w-72 sm:w-80 aspect-video shrink-0 overflow-hidden border-2 border-bone/20 hover:border-volt group transition-colors snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt relative"
              >
                <motion.img
                  layoutId={`gallery-img-${idx}`}
                  src={img}
                  alt={`Pass gallery preview ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 right-2 bg-ink/80 text-volt font-mono text-[9px] px-1.5 py-0.5 border border-volt/40 uppercase">
                  ZOOM
                </span>
              </button>
            ))}
          </div>

          <p className="font-mono text-[11px] text-bone/50">
            Swipe horizontally or click any preview to enlarge in full-bleed lightbox.
          </p>
        </div>
      )}

      {/* Lightbox Modal with shared layout zoom and exit animation */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[85vh] border-2 border-bone/35 bg-ink p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="w-full h-full object-contain max-h-[75vh]"
              />

              <div className="flex items-center justify-between pt-3 px-2 border-t border-bone/15 font-mono text-xs">
                <span className="text-volt font-bold">OFFSCRIPT GALLERY</span>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="border border-bone/30 px-3 py-1 text-bone hover:border-volt hover:text-volt uppercase font-bold transition-colors"
                >
                  [ESC] CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default GalleryPane
