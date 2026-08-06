// SECURITY TODO: No authentication yet. Protect before production.
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getCategoryById } from "@/lib/products"
import { updateCategory } from "@/app/admin/categories/actions"
import { CategoryForm } from "@/app/admin/categories/_components/CategoryForm"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const cat = await getCategoryById(id)
  return { title: cat ? `Edit — ${cat.name}` : "Not Found" }
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params
  const category = await getCategoryById(id)
  if (!category) notFound()

  const boundUpdate = updateCategory.bind(null, id)

  return (
    <div className="max-w-xl">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li><Link href="/admin/categories" className="hover:text-slate-600 transition-colors">Categories</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium truncate max-w-xs">{category.name}</li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Edit</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Category</h1>
      <CategoryForm category={category} action={boundUpdate} />
    </div>
  )
}
