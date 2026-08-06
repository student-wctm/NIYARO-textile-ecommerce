import Link from "next/link"
import { siteConfig } from "@/config/site"

export function CustomerFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <p className="text-white font-bold text-lg mb-2">
              {siteConfig.logoIcon} {siteConfig.name}
            </p>
            <p className="text-sm leading-relaxed max-w-xs">
              {siteConfig.tagline} across multiple branches. Reserve online and
              pick up from the store nearest to you.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Shop
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="hover:text-white transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/branches"
                  className="hover:text-white transition-colors"
                >
                  Our Branches
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
              Help
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/orders"
                  className="hover:text-white transition-colors"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
