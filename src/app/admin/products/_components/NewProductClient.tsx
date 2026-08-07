"use client"

// NewProductClient — two-step inline flow for creating a product with images.
//
// Step 1 (productId === null):
//   Show the ProductForm. On submit, createProductAndReturn() is called.
//   This creates the DB record and returns the new productId without redirecting.
//
// Step 2 (productId is set):
//   The product was created. Show:
//     - A success banner with a link to the edit page
//     - ImageManager (fully functional — uploads to Vercel Blob, saves to DB)
//     - VariantManager (add variants immediately)
//     - A "Go to Edit Page" link
//
// This design ensures:
//   - Images can always be uploaded immediately, even on the New Product page
//   - ImageManager receives a real productId (required for Prisma saves)
//   - No URL navigation required — the user stays on /admin/products/new
//   - The edit page remains unchanged and continues to work normally

import { useActionState } from "react"
import Link from "next/link"
import type { CategoryOption, ProductVariant, ProductImage } from "@/lib/products"
import type { ActionResult } from "@/app/admin/products/actions"
import { createProductAndReturn } from "@/app/admin/products/actions"
import { ProductForm } from "@/app/admin/products/_components/ProductForm"
import { ImageManager } from "@/app/admin/products/_components/ImageManager"
import { VariantManager } from "@/app/admin/products/_components/VariantManager"

interface NewProductClientProps {
  categories: CategoryOption[]
}

type CreateState = ActionResult & { productId?: string }
const initialState: CreateState = { success: false }

export function NewProductClient({ categories }: NewProductClientProps) {
  const [state, , ] = useActionState<CreateState, FormData>(
    createProductAndReturn,
    initialState
  )

  // ── Step 2: product was created ───────────────────────────────────────
  if (state.success && state.productId) {
    const productId = state.productId

    return (
      <div className="space-y-8">
        {/* Success banner */}
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600 shrink-0 mt-0.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Product created successfully
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Add images and variants below. You can also edit all product
                details from the edit page at any time.
              </p>
            </div>
          </div>
          <Link
            href={`/admin/products/${productId}/edit`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 transition-colors"
          >
            Edit page →
          </Link>
        </div>

        {/* Image upload — works immediately because productId exists */}
        <ImageManager
          productId={productId}
          images={[] as ProductImage[]}
        />

        {/* Variant manager */}
        <VariantManager
          productId={productId}
          variants={[] as ProductVariant[]}
          basePrice={0}
        />

        {/* Bottom navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Link
            href="/admin/products"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to Products
          </Link>
          <Link
            href={`/admin/products/${productId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
          >
            Open Full Edit Page →
          </Link>
        </div>
      </div>
    )
  }

  // ── Step 1: show product creation form ────────────────────────────────
  return (
    <ProductForm
      categories={categories}
      action={createProductAndReturn as (
        prev: ActionResult,
        data: FormData
      ) => Promise<ActionResult>}
    />
  )
}
