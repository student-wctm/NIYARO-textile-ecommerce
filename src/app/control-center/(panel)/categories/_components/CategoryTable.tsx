"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import { toggleCategoryStatus } from "@/app/control-center/(panel)/categories/actions"
import type { Category } from "@/lib/products"

export function CategoryTable({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">🗂️</p>
        <p className="text-slate-700 font-medium mb-1">No categories yet</p>
        <p className="text-sm text-slate-400">Click "Add Category" to create your first category.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Category", "Slug", "Sort", "Status", "Actions"].map(h => (
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map(cat => <CategoryRow key={cat.id} category={cat} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CategoryRow({ category }: { category: Category }) {
  const [isPending, startTransition] = useTransition()

  return (
    <tr className={`transition-opacity ${isPending ? "opacity-50" : "hover:bg-slate-50"}`}>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{category.name}</p>
        {category.description && (
          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{category.description}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-slate-400 font-mono">{category.slug}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-600">{category.sortOrder}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={category.isActive ? "success" : "default"}>
          {category.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Link href={`/control-center/categories/${category.id}/edit`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit
          </Link>
          <button type="button" disabled={isPending}
            onClick={() => startTransition(async () => { await toggleCategoryStatus(category.id, category.isActive) })}
            aria-label={category.isActive ? `Deactivate ${category.name}` : `Activate ${category.name}`}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              category.isActive
                ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
            }`}>
            {category.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  )
}
