"use client"

// NewProductClient — two-step inline flow for creating a product with images.
//
// How it works:
//   Step 1: Renders ProductForm with createProductAndReturn as the action.
//           ProductForm owns useActionState internally. When the action
//           resolves successfully it calls onSuccess(state) which sets
//           productId here in NewProductClient.
//
//   Step 2: productId is now set. Renders ImageManager + VariantManager
//           inline — both receive a real productId and work immediately.
//           No redirect. No page navigation.

import { useState } from "react"
import Link from "next/link"
import type { CategoryOption, ProductVariant, ProductImage } from "@/lib/products"
import type { ActionResult } from "@/app/control-center/products/actions"
import { createProductAndReturn } from "@/app/control-center/products/actions"
import { ProductForm } from "@/app/control-center/products/_components/ProductForm"
import { ImageManager } from "@/app/control-center/products/_components/ImageManager"
import { VariantManager } from "@/app/control-center/products/_components/VariantManager"

interface NewProductClientProps {
  categories: CategoryOption[]
}

// createProductAndReturn returns ActionResult & { productId?: string }.
// Cast it to the signature ProductForm expects (ActionResult in, ActionResult out)
// — the extra productId field is passed through onSuccess.
const createAction = createProductAndReturn as (
  prev: ActionResult,
  data: FormData
) => Promise<ActionResult>

export function NewProductClient({ categories }: NewProductClientProps) {
  const [productId, setProductId] = useState<string | null>(null)

  function handleSuccess(state: ActionResult) {
    const id = (state as ActionResult & { productId?: string }).productId
    if (id) setProductId(id)
  }

  // ── Step 2: product created — show ImageManager + VariantManager ──────
  if (productId) {
    return (
      <div className="space-y-8">
        {/* Success banner */}
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Product created successfully
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Add images and variants below. All changes save immediately.
              </p>
            </div>
          </div>
          <Link
            href={`/control-center/products/${productId}/edit`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50 transition-colors"
          >
            Edit page →
          </Link>
        </div>

        {/* Image upload — productId is real, images persist to DB immediately */}
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

        {/* Bottom nav */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Link
            href="/control-center/products"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to Products
          </Link>
          <Link
            href={`/control-center/products/${productId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
          >
            Open Full Edit Page →
          </Link>
        </div>
      </div>
    )
  }

  // ── Step 1: product details form ──────────────────────────────────────
  return (
    <ProductForm
      categories={categories}
      action={createAction}
      onSuccess={handleSuccess}
    />
  )
}


