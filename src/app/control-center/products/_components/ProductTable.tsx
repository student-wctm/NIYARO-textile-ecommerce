"use client"

import { useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/Badge"
import { toggleProductStatus } from "@/app/control-center/products/actions"
import { getProductImageUrl } from "@/lib/image"
import { formatPrice } from "@/lib/utils"
import type { ProductSummary } from "@/lib/products"

export function ProductTable({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">🧵</p>
        <p className="text-slate-700 font-medium mb-1">No products yet</p>
        <p className="text-sm text-slate-400">
          Click "Add Product" to create your first product.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Product", "Category", "Price", "Variants", "Status", "Actions"].map(h => (
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => <ProductRow key={p.id} product={p} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductRow({ product }: { product: ProductSummary }) {
  const [isPending, startTransition] = useTransition()
  const primaryImage = product.images[0]
  const imageUrl = getProductImageUrl(primaryImage?.imageUrl)

  return (
    <tr className={`transition-opacity ${isPending ? "opacity-50" : "hover:bg-slate-50"}`}>
      {/* Product name + image */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
            <Image
              src={imageUrl}
              alt={primaryImage?.altText ?? product.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
              {product.name}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
              {product.slug}
            </p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm text-slate-600">{product.category.name}</p>
      </td>

      {/* Price */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-medium text-slate-900">{formatPrice(product.basePrice)}</p>
        {product.comparePrice && (
          <p className="text-xs text-slate-400 line-through">{formatPrice(product.comparePrice)}</p>
        )}
      </td>

      {/* Variant count */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium w-7 h-7">
          {product._count.variants}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <Badge variant={product.isActive ? "success" : "default"}>
            {product.isActive ? "Active" : "Inactive"}
          </Badge>
          {product.isFeatured && (
            <Badge variant="info">Featured</Badge>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Link href={`/control-center/products/${product.id}/edit`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit
          </Link>
          <button type="button" disabled={isPending}
            onClick={() => startTransition(async () => { await toggleProductStatus(product.id, product.isActive) })}
            aria-label={product.isActive ? `Deactivate ${product.name}` : `Activate ${product.name}`}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              product.isActive
                ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
            }`}>
            {product.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  )
}


