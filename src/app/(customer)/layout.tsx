// Customer storefront layout.
// Wraps all public-facing routes with the CustomerHeader and CustomerFooter.
// This layout sits inside the root layout (src/app/layout.tsx) which provides
// the <html> and <body> tags.

import { CustomerHeader } from "@/components/layout/CustomerHeader"
import { CustomerFooter } from "@/components/layout/CustomerFooter"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CustomerHeader />
      <main className="flex-1">{children}</main>
      <CustomerFooter />
    </>
  )
}
