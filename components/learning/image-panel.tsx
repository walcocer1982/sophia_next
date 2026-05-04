'use client'

import { useState } from 'react'
import { ChevronRight, Images, ZoomIn, ZoomOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityImage {
  url: string
  description: string
  showWhen?: 'on_start' | 'on_reference' | 'on_demand'
}

interface ImagePanelProps {
  images: ActivityImage[]
  videoUrl?: string | null
  isCollapsed: boolean
  onToggle: () => void
}

export function ImagePanel({
  images,
  videoUrl,
  isCollapsed,
  onToggle,
}: ImagePanelProps) {
  const [selectedImage, setSelectedImage] = useState<ActivityImage | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  const closeModal = () => {
    setSelectedImage(null)
    setZoomLevel(1)
  }

  // When the lesson has a Sophia animated video, it takes over the panel
  // and replaces the image gallery — the video is decorative, not lesson content.
  const hasVideo = !!videoUrl

  return (
    <>
      <aside
        className={cn(
          'bg-white border-l border-gray-200 flex flex-col transition-all duration-300 shrink-0',
          isCollapsed ? 'w-0 overflow-hidden border-none' : 'w-[280px]'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-teal-600 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900">{hasVideo ? 'Sophia' : 'Recursos Visuales'}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {hasVideo ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl!}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          ) : images.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-teal-600">
                <Images className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Galería ({images.length})
                </h3>
              </div>

              <div className="space-y-3">
                {images.map((image, index) => (
                  <div key={index} className="space-y-1.5">
                    <button
                      onClick={() => setSelectedImage(image)}
                      className="w-full aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all group"
                    >
                      <img
                        src={image.url}
                        alt={image.description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {image.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Images className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Sin recursos visuales</p>
              <p className="text-xs text-gray-400">
                Las imágenes aparecerán aquí durante la clase
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!hasVideo && images.length > 0 && (
          <div className="p-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Click en una imagen para ampliar
            </p>
          </div>
        )}
      </aside>

      {/* Modal para imagen ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] p-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Controles */}
            <div className="absolute top-0 right-0 flex items-center gap-2 p-2 bg-black/50 rounded-bl-lg">
              <button
                onClick={handleZoomOut}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-white text-sm min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={closeModal}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Imagen */}
            <img
              src={selectedImage.url}
              alt={selectedImage.description}
              className="max-w-full max-h-[85vh] object-contain rounded-lg transition-transform"
              style={{ transform: `scale(${zoomLevel})` }}
            />

            {/* Descripción en modal */}
            <div className="mt-3 text-center">
              <p className="text-sm text-white/90">{selectedImage.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
