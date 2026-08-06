import Link from "next/link"

export default function NotFound() {
  return (
    // bg-white is explicit so this page is readable regardless of OS dark mode
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-7xl font-bold text-[var(--color-brand-600)] mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]"
      >
        Back to Home
      </Link>
    </div>
  )
}
