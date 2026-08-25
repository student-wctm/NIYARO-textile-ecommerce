// =============================================================================
// POST /api/upload/category-image
//
// Accepts a multipart/form-data request containing a single image file,
// validates it server-side, uploads it to Vercel Blob, and returns the
// resulting public URL.
//
// This route is called from the CategoryForm in the admin Control Center.
// The admin layout guards all /control-center/* routes with a full DB session
// check, so only authenticated admins can reach the form that calls this API.
//
// The BLOB_READ_WRITE_TOKEN is accessed server-side only — never exposed to
// the browser.
//
// Storage: Vercel Blob (same infrastructure as product images).
//   Pathname format: categories/<timestamp>-<random>.<ext>
// =============================================================================

import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024  // 8 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Environment check ────────────────────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 503 }
    )
  }

  // ── 2. Parse multipart form data ────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Expected multipart/form-data." },
      { status: 400 }
    )
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "file" field in form data.' },
      { status: 400 }
    )
  }

  // ── 3. Validate MIME type ───────────────────────────────────────────────
  const mimeType = file.type.toLowerCase()
  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `File type "${file.type}" is not allowed. Upload JPG, PNG, or WebP images only.` },
      { status: 422 }
    )
  }

  // ── 4. Validate file size ───────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return NextResponse.json(
      { error: `File is ${mb} MB. Maximum allowed size is 8 MB.` },
      { status: 422 }
    )
  }

  // ── 5. Build a safe, unique blob pathname ───────────────────────────────
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/png": "png", "image/webp": "webp",
  }
  const ext = extMap[mimeType] ?? "jpg"
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  const pathname = `categories/${Date.now()}-${randomSuffix}.${ext}`

  // ── 6. Upload to Vercel Blob ────────────────────────────────────────────
  let blobUrl: string
  try {
    const result = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    blobUrl = result.url
  } catch (err) {
    console.error("[upload/category-image] Vercel Blob error:", err)
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 502 }
    )
  }

  // ── 7. Return the public URL ────────────────────────────────────────────
  return NextResponse.json({ url: blobUrl })
}
