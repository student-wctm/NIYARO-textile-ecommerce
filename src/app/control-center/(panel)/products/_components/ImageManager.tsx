"use client"

// =============================================================================
// ImageManager — Admin product image management
//
// Features:
//   - Up to 20 images per product
//   - Multi-file select + drag-and-drop upload zone
//   - Client-side compression via Canvas API before upload (no library needed)
//   - Per-file upload progress bars, parallel uploads
//   - Drag-to-reorder with visual ghost placeholder
//   - Set any image as primary (Main)
//   - Delete with confirmation
//   - sortOrder saved to DB on drop
//
// Storage: Vercel Blob via /api/upload/product-image Route Handler
// DB:      ProductImage table via Server Actions (no binary in Postgres)
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
} from "@/app/control-center/(panel)/products/actions"
import { getProductImageUrl } from "@/lib/image"
import type { ProductImage } from "@/lib/products"

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const MAX_FILE_BYTES  = 20 * 1024 * 1024  // 20 MB raw — will be compressed
const MAX_IMAGES      = 20
const COMPRESS_MAX_PX = 1600              // longest edge after compression
const COMPRESS_QUALITY = 0.82            // JPEG quality (0–1)
const ACCEPT = ".jpg,.jpeg,.png,.webp"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: "queued" | "compressing" | "uploading" | "done" | "error"
  progress: number    // 0–100
  error?: string
}

interface ImageManagerProps {
  productId: string
  images: ProductImage[]
}

// ─── Compression ──────────────────────────────────────────────────────────────

/**
 * Compresses an image using the Canvas API.
 * Resizes to max COMPRESS_MAX_PX on the longest edge, encodes as JPEG.
 * Returns a new File object with the same name.
 */
async function compressImage(file: File): Promise<File> {
  // Skip SVG or tiny files
  if (file.type === "image/svg+xml" || file.size < 50 * 1024) return file

  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width > COMPRESS_MAX_PX || height > COMPRESS_MAX_PX) {
        const ratio = Math.min(COMPRESS_MAX_PX / width, COMPRESS_MAX_PX / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          }))
        },
        "image/jpeg",
        COMPRESS_QUALITY
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ─── ImageCard ────────────────────────────────────────────────────────────────

function ImageCard({
  image,
  index,
  total,
  productId,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  image: ProductImage
  index: number
  total: number
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
        "relative group rounded-xl border-2 overflow-hidden bg-slate-100",
        "cursor-grab active:cursor-grabbing select-none transition-all duration-150",
        isDragOver ? "border-[var(--color-brand-500)] scale-105 shadow-xl ring-2 ring-[var(--color-brand-300)]" : "border-transparent",
        isDragging ? "opacity-30 scale-95" : "",
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
          sizes="160px"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/placeholders/product.svg"
          }}
        />
      </div>

      {/* Position badge */}
      <div className="absolute top-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-xs font-mono text-white">
        {index + 1}/{total}
      </div>

      {/* Primary badge */}
      {image.isPrimary && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <span className="rounded-full bg-[var(--color-brand-600)] px-2 py-0.5 text-xs font-semibold text-white shadow">
            MAIN
          </span>
        </div>
      )}

      {/* Drag handle */}
      <div
        className="absolute top-1.5 right-1.5 bg-black/50 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5h16.5M3.75 12h16.5M3.75 19h16.5" />
        </svg>
      </div>

      {/* Action bar on hover */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
        {!image.isPrimary ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => { await setPrimaryImage(image.id, productId) })}
            title="Set as main image"
            className="flex-1 rounded text-xs text-white hover:text-yellow-300 transition-colors text-left truncate disabled:opacity-50"
          >
            Set Main
          </button>
        ) : (
          <span className="flex-1 text-xs text-yellow-300 font-medium truncate">Main</span>
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
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pending overlay */}
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

// ─── UploadTile ───────────────────────────────────────────────────────────────

function UploadTile({ item }: { item: UploadItem }) {
  const label =
    item.status === "compressing" ? "Compressing…" :
    item.status === "uploading"   ? `${item.progress}%` :
    item.status === "done"        ? "Done" :
    item.status === "error"       ? "Error" : "Queued"

  return (
    <div className="relative rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
      <div className="relative aspect-square">
        <Image
          src={item.previewUrl}
          alt={item.file.name}
          fill
          className="object-cover opacity-60"
          sizes="160px"
          unoptimized
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-2 gap-2">
        {(item.status === "compressing" || item.status === "uploading" || item.status === "queued") && (
          <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {item.status === "done" && (
          <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {item.status === "error" && (
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}

        {/* Progress bar */}
        {item.status === "uploading" && (
          <div className="w-full bg-white/30 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}

        <span className="text-xs font-medium text-white">{label}</span>
      </div>

      {item.status === "error" && item.error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-2 py-1">
          <p className="text-xs text-white truncate" title={item.error}>{item.error}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImageManager({ productId, images: initialImages }: ImageManagerProps) {
  const [images, setImages] = useState<ProductImage[]>(initialImages)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [altText, setAltText] = useState("")
  const [globalErrors, setGlobalErrors] = useState<string[]>([])

  const [reorderPending, startReorderTransition] = useTransition()
  const dragFromRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync images from server re-renders
  const prevRef = useRef(initialImages)
  if (initialImages !== prevRef.current) {
    prevRef.current = initialImages
    setImages(initialImages)
    setUploads((prev) => prev.filter((u) => u.status !== "done"))
  }

  const remainingSlots = MAX_IMAGES - images.length

  // ── Process selected files ─────────────────────────────────────────────

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setGlobalErrors([])
    const all = Array.from(files)
    const errors: string[] = []
    const valid: File[] = []

    // Slots check
    const activeUploads = uploads.filter(
      (u) => u.status === "queued" || u.status === "compressing" || u.status === "uploading"
    ).length
    const slots = MAX_IMAGES - images.length - activeUploads

    if (slots <= 0) {
      setGlobalErrors([`Maximum ${MAX_IMAGES} images allowed. Remove some images first.`])
      return
    }

    for (const f of all.slice(0, slots)) {
      if (!ALLOWED_TYPES.includes(f.type.toLowerCase())) {
        errors.push(`"${f.name}" — unsupported type. Use JPG, PNG, or WebP.`)
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        errors.push(`"${f.name}" — file too large (max 20 MB).`)
        continue
      }
      valid.push(f)
    }

    if (all.length > slots) {
      errors.push(`Only ${slots} slot${slots === 1 ? "" : "s"} remaining. ${all.length - slots} file${all.length - slots === 1 ? "" : "s"} skipped.`)
    }
    if (errors.length) setGlobalErrors(errors)
    if (!valid.length) return

    // Create entries with object URL previews
    const entries: UploadItem[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "queued",
      progress: 0,
    }))

    setUploads((prev) => [...prev, ...entries])

    // Upload each in parallel
    await Promise.all(entries.map(async (entry, i) => {
      const isFirstEver = images.length === 0 && uploads.length === 0 && i === 0

      const updateEntry = (patch: Partial<UploadItem>) =>
        setUploads((prev) => prev.map((u) => u.id === entry.id ? { ...u, ...patch } : u))

      try {
        // Compress
        updateEntry({ status: "compressing", progress: 5 })
        const compressed = await compressImage(entry.file)

        // Upload
        updateEntry({ status: "uploading", progress: 15 })

        const progressInterval = setInterval(() => {
          updateEntry({
            progress: Math.min(80, (prev => {
              // Can't read current progress in closure, use functional update
              return 0 // replaced below
            })(0)),
          })
          setUploads((prev) => prev.map((u) =>
            u.id === entry.id && u.progress < 80
              ? { ...u, progress: u.progress + 12 }
              : u
          ))
        }, 400)

        const form = new FormData()
        form.append("file", compressed)

        const res = await fetch("/api/upload/product-image", {
          method: "POST",
          body: form,
        })

        clearInterval(progressInterval)

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`)
        }

        const { url } = await res.json() as { url: string }
        updateEntry({ status: "uploading", progress: 90 })

        const result = await saveProductImage(
          productId,
          url,
          altText.trim() || null,
          isFirstEver
        )

        if (!result.success) throw new Error(result.error ?? "Failed to save.")

        updateEntry({ status: "done", progress: 100 })
      } catch (err) {
        updateEntry({
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : "Upload failed.",
        })
      }
    }))
  }, [productId, altText, images.length, uploads])

  // ── Drop zone ──────────────────────────────────────────────────────────

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragActive(true) }
  const onDragLeave = () => setIsDragActive(false)
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  // ── Reorder ────────────────────────────────────────────────────────────

  const onReorderDragStart = (i: number) => { dragFromRef.current = i }
  const onReorderDragEnter = (i: number) => { setDragOverIndex(i) }
  const onReorderDragEnd   = () => {
    const from = dragFromRef.current
    const to   = dragOverIndex
    dragFromRef.current = null
    setDragOverIndex(null)
    if (from === null || to === null || from === to) return

    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setImages(next)
    startReorderTransition(async () => {
      await reorderImages(productId, next.map((img) => img.id))
    })
  }

  const activeUploads = uploads.filter((u) => u.status !== "done")
  const hasActive     = uploads.some((u) => u.status === "uploading" || u.status === "compressing")
  const atLimit       = images.length >= MAX_IMAGES

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Product Images</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {images.length === 0
              ? "No images. Upload up to 20."
              : `${images.length} / ${MAX_IMAGES} images — drag cards to reorder.`}
          </p>
        </div>
        {reorderPending && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving order…
          </span>
        )}
      </div>

      {/* Errors */}
      {globalErrors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
          {globalErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-700">{e}</p>
          ))}
        </div>
      )}

      {/* Image grid */}
      {(images.length > 0 || activeUploads.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <ImageCard
              key={img.id}
              image={img}
              index={index}
              total={images.length}
              productId={productId}
              isDragging={dragFromRef.current === index}
              isDragOver={dragOverIndex === index}
              onDragStart={() => onReorderDragStart(index)}
              onDragEnter={() => onReorderDragEnter(index)}
              onDragEnd={onReorderDragEnd}
            />
          ))}
          {activeUploads.map((item) => <UploadTile key={item.id} item={item} />)}
        </div>
      )}

      {/* Upload zone */}
      {!atLimit && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !hasActive && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={`Upload product images (${remainingSlots} slots remaining)`}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
          className={[
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
            isDragActive
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] scale-[1.01]"
              : "border-slate-300 bg-slate-50 hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-50)]",
            hasActive ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files?.length) { processFiles(e.target.files); e.target.value = "" }
            }}
            aria-hidden="true"
          />
          <svg
            className={`h-9 w-9 transition-colors ${isDragActive ? "text-[var(--color-brand-500)]" : "text-slate-300"}`}
            fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? "Drop to upload" : "Click or drag & drop images"}
          </p>
          <p className="text-xs text-slate-400">
            JPG · PNG · WebP · up to 20 MB each · images auto-compressed · {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} left
          </p>
        </div>
      )}

      {atLimit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          Maximum {MAX_IMAGES} images reached. Delete an image to upload more.
        </div>
      )}

      {/* Alt text option */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-1">
        <div className="flex-1">
          <label htmlFor="img-alt" className="text-xs font-medium text-slate-600 block mb-1">
            Alt text for next upload(s)
          </label>
          <input
            id="img-alt"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="e.g. Banarasi silk saree — red, front view"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        Uploaded to Vercel Blob. Only the URL is stored in the database.
        Images are auto-compressed to max 1600px before upload.
      </p>
    </div>
  )
}

