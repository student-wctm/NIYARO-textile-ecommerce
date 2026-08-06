// Types relating to Branch selection and persistence.
// The SelectedBranch type is a lightweight projection used in cookies and UI —
// it does not carry full DB row data to keep cookie size small.

export interface SelectedBranch {
  id: string
  name: string
  slug: string
  city: string
}

// Cookie name constant — single source of truth used by both
// the cookie utility and any Server Components that read it.
export const SELECTED_BRANCH_COOKIE = "txl_selected_branch"
