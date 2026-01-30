// src/components/MediaUploader.tsx
import React, { useCallback, useState } from 'react'
import { Upload, X, Image, Video, Loader2 } from 'lucide-react'
import { mediaService } from '../services'
import { ApartmentMedia } from '../types/database'

interface MediaUploaderProps {
  apartmentId: string
  onUploadComplete: (media: ApartmentMedia[]) => void
}

interface FilePreview {
  file: File
  preview: string
  type: 'photo' | 'video'
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function MediaUploader({ apartmentId, onUploadComplete }: MediaUploaderProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const validFiles = fileArray.filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    const previews: FilePreview[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'photo',
      status: 'pending' as const,
    }))

    setFiles(prev => [...prev, ...previews])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    const uploadedMedia: ApartmentMedia[] = []

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue

      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading' as const } : f
      ))

      try {
        const media = await mediaService.upload(apartmentId, files[i].file)
        uploadedMedia.push(media)

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'done' as const } : f
        ))
      } catch (err: any) {
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error' as const, error: err.message } : f
        ))
      }
    }

    setUploading(false)

    if (uploadedMedia.length > 0) {
      onUploadComplete(uploadedMedia)
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 mb-2">
          Drag & drop photos or videos here
        </p>
        <p className="text-gray-400 text-sm mb-3">or</p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
            Browse Files
          </span>
        </label>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
              >
                {file.type === 'photo' ? (
                  <img
                    src={file.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={file.preview}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Type indicator */}
                <div className="absolute top-2 left-2 bg-black/50 rounded-full p-1">
                  {file.type === 'photo' ? (
                    <Image className="w-4 h-4 text-white" />
                  ) : (
                    <Video className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Status overlay */}
                {file.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {file.status === 'done' && (
                  <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                )}
                {file.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <span className="text-white text-xs px-2 text-center">{file.error}</span>
                  </div>
                )}

                {/* Remove button */}
                {file.status === 'pending' && (
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {pendingCount > 0 && (
            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
