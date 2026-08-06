"use client"

// =============================================================================
// ImageManager — Admin product image management
//
// Upload flow:
//   1. Admin picks one or more files via the file input (or drag-and-drop).
//   2. Each file is validated client-side (type, size) for fast feedback.
//   3. Files are uploaded one-by-one to POST /api/upload/product-image.
//   4. On success the returned URL is persisted via saveProductImage() Server Action.
//   5. revalidatePath() in the Server Action refreshes the image list.
//
// Reorder flow:
//   Admin drags image cards. On drop, reorderImages() Server Action is called
//   with the new sorted ID array.
//
// Storage:
//   Binary files → Vercel Blob (via Route Handler)
//   URL metadata → PostgreSQL ProductImage table (via Server Action)
//   No binary data in the DB at any point.
// =============================================================================

import {
  useTransition,
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from "react"
import Image from "next/image"
import {
  saveProductImage,
  setPrimaryImage,
  deleteProductImage,
  reorderImages,
} from "@/app/admin/products/actions"
import { getProductImageUrl } from "@/lib/image"
import type { ProductImage } from "@/lib/products"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageManagerProps {
  productId: string
  images: ProductImage[]
}

interface UploadingFile {
  id: string            // local id for React key
  file: File
  previewUrl: string    // object URL for instant preview
  status: "pending" | "uploading" | "done" | "error"
  error?: string
  progress: number      // 0-100
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
const ACCEPT = ".jpg,.jpeg,.png,.webp"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return `"${file.name}" — unsupported type. Use JPG, PNG, or WebP.`
  }
  if (file.size > MAX_BYTES) {
    return `"${file.name}" — ${formatBytes(file.size)} exceeds the 8 MB limit.`
  }
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single uploaded image card with set-primary, delete, and drag handle. */
function ImageCard({
  image,
  productId,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  image: ProductImage
  productId: string
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={[
        "relative group rounded-xl border-2 overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing transition-all select-none",
        isDragOver ? "border-[var(--color-brand-500)] scale-105 shadow-lg" : "border-transparent",
        isDragging ? "opacity-40" : "opacity-100",
        isPending ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
    >
      {/* Image */}
      <div className="relative aspect-square">
        <Image
          src={getProductImageUrl(image.imageUrl)}
          alt={image.altText ?? "Product image"}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 40vw, 160px"
          onError={(e) => {
            // Swap broken image for placeholder gracefully
            ;(e.target as HTMLImageElement).src = "/images/placeholders/product.svg"
          }}
        />
      </div>

      {/* Primary badge */}
      {image.isPrimary && (
        <div className="absolute top-1.5 left-1.5 rounded-full bg-[var(--color-brand-600)] px-2 py-0.5 text-xs font-semibold text-white shadow">
          Main
        </div>
      )}

      {/* Drag handle hint */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md p-1" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5" />
        </svg>
      </div>

      {/* Hover action strip */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!image.isPrimary && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => { await setPrimaryImage(image.id, productId) })}
            className="flex-1 rounded text-xs font-medium text-white hover:text-yellow-300 transition-colors text-left truncate disabled:opacity-50"
            title="Set as main image"
          >
            Set Main
          </button>
        )}
        {image.isPrimary && (
          <span className="flex-1 text-xs text-yellow-300 font-medium truncate">Main image</span>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Delete this image? This cannot be undone.")) return
            startTransition(async () => { await deleteProductImage(image.id, productId) })
          }}
          aria-label="Delete image"
          className="shrink-0 rounded p-0.5 text-white/70 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <svg className="h-5 w-5 animate-spin text-[var(--color-brand-600)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  )
}

/** A single in-progress upload tile showing preview + progress bar. */
function UploadTile({ item }: { item: UploadingFile }) {
  return (
    <div className="relative rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
      <div className="relative aspect-square">
        <Image
          src={item.previewUrl}
          alt={item.file.name}
          fill
          className="object-cover opacity-70"
          sizes="160px"
          unoptimized // local object URL — skip next/image optimisation
        />
      </div>

      {/* Status overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-2">
        {item.status === "uploading" && (
          <>
            <svg className="h-5 w-5 animate-spin text-white mb-1.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="w-full bg-white/30 rounded-full h-1.5">
              <div
                className="bg-white rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </>
        )}
        {item.status === "done" && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {item.status === "error" && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </div>

      {/* Error tooltip */}
      {item.status === "error" && item.error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-600 px-2 py-1">
          <p className="text-xs text-white leading-tight truncate" title={item.error}>{item.error}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImageManager({ productId, images: initialImages }: ImageManagerProps) {
  const [images, setImages] = useState<ProductImage[]>(initialImages)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [altText, setAltText] = useState("")
  const [makePrimary, setMakePrimary] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Drag-to-reorder state
  const [reorderPending, startReorderTransition] = useTransition()
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Sync images when Server Component re-renders (revalidatePath triggers)
  // We re-initialise from prop only when the server sends new data
  const prevInitialRef = useRef(initialImages)
  if (initialImages !== prevInitialRef.current) {
    prevInitialRef.current = initialImages
    setImages(initialImages)
    setUploading([]) // clear finished uploads on refresh
  }

  // ── File selection & validation ────────────────────────────────────────

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setGlobalError(null)
      const fileArray = Array.from(files)

      // Validate each file up-front
      const validationErrors: string[] = []
      const validFiles: File[] = []
      for (const f of fileArray) {
        const err = validateFile(f)
        if (err) validationErrors.push(err)
        else validFiles.push(f)
      }
      if (validationErrors.length > 0) {
        setGlobalError(validationErrors.join("\n"))
      }
      if (validFiles.length === 0) return

      // Build upload queue entries with instant previews
      const newEntries: UploadingFile[] = validFiles.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: "pending",
        progress: 0,
      }))

      setUploading((prev) => [...prev, ...newEntries])

      // Determine if this batch should produce a primary image
      const currentImageCount = images.length
      const currentUploadCount = uploading.filter(
        (u) => u.status === "uploading" || u.status === "done"
      ).length

      // Upload sequentially to avoid overwhelming the server
      for (let i = 0; i < newEntries.length; i++) {
        const entry = newEntries[i]
        const isFirst = currentImageCount === 0 && currentUploadCount === 0 && i === 0
        const shouldBePrimary = makePrimary && i === 0 ? true : isFirst

        setUploading((prev) =>
          prev.map((u) =>
            u.id === entry.id ? { ...u, status: "uploading", progress: 10 } : u
          )
        )

        try {
          const form = new FormData()
          form.append("file", entry.file)

          // Simulated progress steps (XHR would give real progress;
          // fetch doesn't expose upload progress natively)
          const progressTimer = setInterval(() => {
            setUploading((prev) =>
              prev.map((u) =>
                u.id === entry.id && u.progress < 80
                  ? { ...u, progress: u.progress + 15 }
                  : u
              )
            )
          }, 300)

          const res = await fetch("/api/upload/product-image", {
            method: "POST",
            body: form,
          })

          clearInterval(progressTimer)

          if (!res.ok) {
            const { error } = (await res.json()) as { error: string }
            throw new Error(error ?? `Upload failed (HTTP ${res.status})`)
          }

          const { url } = (await res.json()) as { url: string }

          setUploading((prev) =>
            prev.map((u) =>
              u.id === entry.id ? { ...u, status: "uploading", progress: 90 } : u
            )
          )

          // Persist to DB via Server Action
          const result = await saveProductImage(
            productId,
            url,
            altText.trim() || null,
            shouldBePrimary
          )

          if (!result.success) throw new Error(result.error ?? "Failed to save image.")

          setUploading((prev) =>
            prev.map((u) =>
              u.id === entry.id ? { ...u, status: "done", progress: 100 } : u
            )
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed."
          setUploading((prev) =>
            prev.map((u) =>
              u.id === entry.id ? { ...u, status: "error", error: message, progress: 0 } : u
            )
          )
        }
      }
    },
    [productId, altText, makePrimary, images.length, uploading]
  )

  // ── File input handler ─────────────────────────────────────────────────

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files)
      e.target.value = "" // reset so same file can be re-selected
    }
  }

  // ── Drop zone handlers ─────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(true)
  }
  const handleDragLeave = () => setIsDragActive(false)
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  // ── Reorder handlers ───────────────────────────────────────────────────

  const handleReorderDragStart = (index: number) => {
    dragIndexRef.current = index
  }
  const handleReorderDragEnter = (index: number) => {
    setDragOverIndex(index)
  }
  const handleReorderDragEnd = () => {
    const from = dragIndexRef.current
    const to = dragOverIndex
    dragIndexRef.current = null
    setDragOverIndex(null)

    if (from === null || to === null || from === to) return

    const reordered = [...images]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setImages(reordered)

    startReorderTransition(async () => {
      await reorderImages(productId, reordered.map((img) => img.id))
    })
  }

  // ── Derived state ──────────────────────────────────────────────────────

  const hasActiveUploads = uploading.some((u) => u.status === "uploading")
  const activeUploads = uploading.filter((u) => u.status !== "done")
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Product Images</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {images.length === 0
              ? "No images yet. Upload the first image below."
              : `${images.length} image${images.length === 1 ? "" : "s"} — drag to reorder.`}
          </p>
        </div>
        {reorderPending && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving order…
          </span>
        )}
      </div>

      {/* Global validation errors */}
      {globalError && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
          {globalError.split("\n").map((line, i) => (
            <p key={i} className="text-xs text-red-700">{line}</p>
          ))}
        </div>
      )}

      {/* Existing images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <ImageCard
              key={img.id}
              image={img}
              productId={productId}
              isDragging={dragIndexRef.current === index}
              isDragOver={dragOverIndex === index}
              onDragStart={() => handleReorderDragStart(index)}
              onDragEnter={() => handleReorderDragEnter(index)}
              onDragEnd={handleReorderDragEnd}
            />
          ))}
          {/* In-progress upload tiles */}
          {activeUploads.map((item) => (
            <UploadTile key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
        className={[
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
          isDragActive
            ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]"
            : "border-slate-300 bg-slate-50 hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-50)]",
          hasActiveUploads ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={handleFileInput}
          aria-hidden="true"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-10 w-10 transition-colors ${isDragActive ? "text-[var(--color-brand-500)]" : "text-slate-300"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? "Drop to upload" : "Click to upload or drag & drop"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP · max 8 MB per file · multiple files supported</p>
        </div>
      </div>

      {/* Optional upload options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-1">
        <div className="flex-1">
          <label htmlFor="img-alt-text" className="text-xs font-medium text-slate-600 block mb-1">
            Alt text for next upload(s)
          </label>
          <input
            id="img-alt-text"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="e.g. Banarasi silk saree — red, front view"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-5 sm:mt-0 shrink-0">
          <input
            type="checkbox"
            checked={makePrimary}
            onChange={(e) => setMakePrimary(e.target.checked)}
            className="accent-[var(--color-brand-600)]"
          />
          <span className="text-sm text-slate-700">Set first upload as Main</span>
        </label>
      </div>

      {/* Architecture note for developers */}
      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        Images are uploaded to Vercel Blob storage. Only the URL is stored in the database.
        Requires <code className="font-mono">BLOB_READ_WRITE_TOKEN</code> in your environment.
      </p>
    </div>
  )
}
