"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Category } from "@/lib/products"
import type { ActionResult } from "@/app/control-center/(panel)/categories/actions"

interface CategoryFormProps {
  category?: Category
  action: (prev: ActionResult, data: FormData) => Promise<ActionResult>
}

const initialState: ActionResult = { success: false }

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] " +
  "focus:border-transparent disabled:opacity-50"

const errorInputCls =
  "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 " +
  "focus:border-transparent"

function Field({
  label, name, children, error, required = false, hint,
}: {
  label: string; name: string; children: React.ReactNode
  error?: string; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Image upload widget ──────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const MAX_BYTES = 8 * 1024 * 1024  // 8 MB

interface ImageUploadProps {
  initialUrl: string | null | undefined
  error?: string
  /** Called when a new URL has been uploaded or cleared */
  onChange: (url: string | null) => void
}

function CategoryImageUpload({ initialUrl, error, onChange }: ImageUploadProps) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [uploading, startUpload] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | null | undefined) {
    if (!file) return
    setUploadError(null)

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Only JPG, PNG, or WebP images are allowed.")
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 8 MB.`)
      return
    }

    startUpload(async () => {
      const fd = new FormData()
      fd.append("file", file)
      try {
        const res = await fetch("/api/upload/category-image", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok || !json.url) {
          setUploadError(json.error ?? "Upload failed. Please try again.")
          return
        }
        setUrl(json.url)
        onChange(json.url)
      } catch {
        setUploadError("Upload failed. Please try again.")
      }
    })
  }

  function handleRemove() {
    setUrl(null)
    onChange(null)
    setUploadError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const displayError = uploadError ?? error

  return (
    <div className="flex flex-col gap-2">
      {url ? (
        /* ── Preview ── */
        <div className="relative w-full max-w-xs">
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <Image
              src={url}
              alt="Category image preview"
              fill
              className="object-cover"
              sizes="320px"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Replace
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* ── Upload zone ── */
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 w-full max-w-xs aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-50)] transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Upload category image"
        >
          {uploading ? (
            <>
              <svg className="h-6 w-6 animate-spin text-[var(--color-brand-500)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-slate-500">Uploading…</span>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-xs text-slate-500 text-center px-2">
                Click to upload<br />
                <span className="text-slate-400">JPG, PNG, WebP · max 8 MB</span>
              </span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {displayError && (
        <p role="alert" className="text-xs text-red-600">{displayError}</p>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CategoryForm({ category, action }: CategoryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  // imageUrl is managed locally so we can show a live preview before submit
  const [imageUrl, setImageUrl] = useState<string | null>(category?.imageUrl ?? null)
  const fe = state.fieldErrors ?? {}
  const isEdit = !!category

  useEffect(() => {
    if (state.fieldErrors || state.error) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} noValidate
      className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold text-slate-500 uppercase tracking-wide pb-2 border-b border-slate-100 w-full">
          Category Details
        </legend>

        <Field label="Category Name" name="name" required error={fe.name}>
          <input id="name" name="name" type="text"
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Sarees"
            required maxLength={80}
            className={fe.name ? errorInputCls : inputCls} />
        </Field>

        <Field label="Description" name="description" hint="Optional — shown on the category page.">
          <textarea id="description" name="description" rows={3}
            defaultValue={category?.description ?? ""}
            placeholder="Brief description of this category…"
            className={`${inputCls} resize-none`} />
        </Field>

        {/* Category Image */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Category Image
            <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
          </span>
          <p className="text-xs text-slate-400 mb-1">
            Displayed on the home page &ldquo;Shop by Category&rdquo; section.
          </p>
          {/* Hidden input carries the committed URL into FormData */}
          <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
          <CategoryImageUpload
            initialUrl={category?.imageUrl}
            error={fe.imageUrl}
            onChange={setImageUrl}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Sort Order" name="sortOrder" error={fe.sortOrder}
            hint="Lower number = appears first. Default 0.">
            <input id="sortOrder" name="sortOrder" type="number" min={0}
              defaultValue={category?.sortOrder ?? 0}
              className={fe.sortOrder ? errorInputCls : inputCls} />
          </Field>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <div className="flex gap-4 mt-1">
              {[{ val: "true", label: "Active" }, { val: "false", label: "Inactive" }].map(opt => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isActive" value={opt.val}
                    defaultChecked={category ? String(category.isActive) === opt.val : opt.val === "true"}
                    className="accent-[var(--color-brand-600)]" />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href="/control-center/categories"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
        <button type="submit" disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Category"}
        </button>
      </div>
    </form>
  )
}
