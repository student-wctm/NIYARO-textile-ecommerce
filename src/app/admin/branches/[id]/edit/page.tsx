// =============================================================================
// Admin — Edit Branch
//
// SECURITY TODO: No authentication yet. Protect before production.
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getBranchById } from "@/lib/branches"
import { updateBranch } from "@/app/admin/branches/actions"
import { BranchForm } from "@/app/admin/branches/_components/BranchForm"

// params is a Promise in Next.js 16 — must be awaited
type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const branch = await getBranchById(id)
  return { title: branch ? `Edit — ${branch.name}` : "Branch Not Found" }
}

export default async function EditBranchPage({ params }: PageProps) {
  const { id } = await params
  const branch = await getBranchById(id)

  if (!branch) notFound()

  // Bind the branch id into updateBranch so BranchForm receives a
  // (prevState, formData) => Promise<ActionResult> signature
  const boundUpdate = updateBranch.bind(null, id)

  return (
    <div className="max-w-2xl">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/admin/branches" className="hover:text-slate-600 transition-colors">
              Branches
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium truncate max-w-xs">{branch.name}</li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Edit</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Branch</h1>

      <BranchForm branch={branch} action={boundUpdate} />
    </div>
  )
}
