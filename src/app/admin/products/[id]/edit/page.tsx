// =============================================================================
// Admin — Edit Product
// SECURITY TODO: No authentication yet. Protect before production.
// =============================================================================
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProductById, getActiveCategoryOptions } from "@/lib/products"
import { updateProduct } from "@/app/admin/products/actions"
import { ProductForm } from "@/app/admin/products/_components/ProductForm"
import { VariantManager } from "@/app/admin/products/_components/VariantManager"
import { ImageManager } from "@/app/admin/products/_components/ImageManager"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)
  return { title: product ? `Edit — ${product.name}` : "Not Found" }
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params

  const [product, categories] = await Promise.all([
    getProductById(id),
    getActiveCategoryOptions(),
  ])

  if (!product) notFound()

  const boundUpdate = updateProduct.bind(null, id)

  return (
    <div className="max-w-2xl space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li><Link href="/admin/products" className="hover:text-slate-600 transition-colors">Products</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium truncate max-w-xs">{product.name}</li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Edit</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Edit Product</h1>
        <p className="text-xs text-slate-400 font-mono">{product.slug}</p>
      </div>

      {/* ── Product core fields ── */}
      <ProductForm
        product={product}
        categories={categories}
        action={boundUpdate}
        showSuccessBanner
      />

      {/* ── Variants ── */}
      <VariantManager
        productId={product.id}
        variants={product.variants}
        basePrice={product.basePrice}
      />

      {/* ── Images ── */}
      <ImageManager
        productId={product.id}
        images={product.images}
      />
    </div>
  )
}
