import type { Metadata } from "next"
import Link from "next/link"
import { createBranch } from "@/app/control-center/branches/actions"
import { BranchForm } from "@/app/control-center/branches/_components/BranchForm"

export const metadata: Metadata = { title: "Add Branch" }

export default function NewBranchPage() {
  return (
    <div className="max-w-2xl">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/control-center/branches" className="hover:text-slate-600 transition-colors">
              Branches
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-700 font-medium">Add Branch</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Branch</h1>

      <BranchForm action={createBranch} />
    </div>
  )
}
