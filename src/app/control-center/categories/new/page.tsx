import type { Metadata } from "next"
import Link from "next/link"
import { createCategory } from "@/app/control-center/categories/actions"
import { CategoryForm } from "@/app/control-center/categories/_components/CategoryForm"

export const metadata: Metadata = { title: "Add Category" }

export default function NewCategoryPage() {
  return (
    <div className="max-w-xl">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li><Link href="/control-center/categories" className="hover:text-slate-600 transition-colors">Categories</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Add Category</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Category</h1>
      <CategoryForm action={createCategory} />
    </div>
  )
}
