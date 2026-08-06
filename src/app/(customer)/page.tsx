import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Home",
  description: siteConfig.description,
}

// ─── Static feature cards ────────────────────────────────────────────────────
const features = [
  {
    icon: "🏪",
    title: "Multiple Branches",
    description:
      "Find the branch nearest to you. Each location carries our full range with real-time stock visibility.",
  },
  {
    icon: "📦",
    title: "Reserve & Pick Up",
    description:
      "Browse online, reserve your items, and collect at the branch at your convenience. No shipping wait.",
  },
  {
    icon: "🔁",
    title: "Cross-Branch Stock",
    description:
      "If your local branch is out of stock, we locate the item at a nearby branch so you never miss out.",
  },
  {
    icon: "🧵",
    title: "Premium Textiles",
    description:
      "Curated fabrics and garments — cotton, silk, linen, blends. One centralised catalogue, every branch.",
  },
]

// ─── Static category teasers ─────────────────────────────────────────────────
const categories = [
  { name: "Sarees", slug: "sarees", color: "bg-rose-50 text-rose-700" },
  { name: "Dress Materials", slug: "dress-materials", color: "bg-purple-50 text-purple-700" },
  { name: "Fabrics by the Metre", slug: "fabrics", color: "bg-amber-50 text-amber-700" },
  { name: "Dupattas & Stoles", slug: "dupattas", color: "bg-teal-50 text-teal-700" },
  { name: "Kurta Sets", slug: "kurta-sets", color: "bg-sky-50 text-sky-700" },
  { name: "Kids Wear", slug: "kids-wear", color: "bg-green-50 text-green-700" },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Brand-coloured hero always has explicit bg so it's unaffected by OS theme */}
      <section
        className="relative bg-[var(--color-brand-700)] text-white overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="text-[var(--color-brand-100)] text-sm font-medium uppercase tracking-widest mb-4">
              {siteConfig.tagline}
            </p>
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6"
            >
              Beautiful Fabrics,
              <br />
              <span className="text-[var(--color-brand-100)]">
                Nearest Branch.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-10 max-w-xl">
              {siteConfig.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold px-6 py-3 text-base transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--color-brand-50)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)] focus-visible:outline-[var(--color-brand-500)]"
              >
                Shop Now
              </Link>
              <Link
                href="/branches"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-medium px-6 py-3 text-base transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border border-white/40 text-white hover:bg-white/10 hover:border-white/60"
              >
                Find a Branch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Grid ─────────────────────────────────────────────────── */}
      {/* bg-white is explicit — prevents dark body bleeding through this section */}
      <section
        className="bg-white"
        aria-labelledby="categories-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2
            id="categories-heading"
            className="text-2xl font-bold text-gray-900 mb-8"
          >
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className={[
                  "group flex flex-col items-center justify-center rounded-xl p-5 text-center",
                  "transition-all duration-200 hover:scale-105 hover:shadow-md",
                  cat.color,
                ].join(" ")}
              >
                <span className="text-3xl mb-2" aria-hidden="true">
                  🧶
                </span>
                <span className="text-sm font-semibold leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      {/* bg-gray-50 is explicit light grey — readable in all OS themes */}
      <section
        className="bg-gray-50"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2
              id="features-heading"
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
            >
              Why {siteConfig.name}?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A unified experience across every branch — one catalogue, live
              stock, and zero guesswork.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <span className="text-4xl" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      {/* bg-white is explicit — ensures light background in dark OS mode */}
      <section
        className="bg-white"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12"
          >
            How It Works
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Select Your Branch",
                body: "Allow location access or type your city to find the nearest branch automatically.",
              },
              {
                step: "02",
                title: "Browse & Reserve",
                body: "Pick from our full catalogue. Live stock for your branch is shown on every product.",
              },
              {
                step: "03",
                title: "Collect In-Store",
                body: "Get notified when your order is ready. Walk in, collect, done.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="flex flex-col items-center text-center"
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-xl font-bold mb-4"
                  aria-hidden="true"
                >
                  {item.step}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      {/* Brand-coloured CTA — always has explicit bg, always readable */}
      <section className="bg-[var(--color-brand-700)] text-white py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to explore our collection?
          </h2>
          <p className="text-white/70 mb-8">
            Thousands of fabric options across all our branches. Start browsing
            today.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold px-6 py-3 text-base transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--color-brand-50)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)]"
          >
            Browse Products
          </Link>
        </div>
      </section>
    </>
  )
}
