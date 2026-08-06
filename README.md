# NIYARO

A production-oriented, multi-branch textile e-commerce platform. Customers browse a centralised product catalogue, check branch-specific stock, and reserve items for in-store pickup.

> **Brand note:** "NIYARO" is the current working/development brand name. All branding is centralised in `src/config/site.ts` — update the `name`, `tagline`, `description`, and `domain` fields there to rename the project without touching any other file.

---

## Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Framework   | Next.js 16 (App Router)       |
| Language    | TypeScript 5                  |
| Styling     | Tailwind CSS v4               |
| Database    | PostgreSQL                    |
| ORM         | Prisma 7                      |
| Runtime     | Node.js 20+                   |

---

## Architecture

### Application Structure

The app is a **monolithic Next.js application** with role-based route groups. All three interfaces (customer, staff, admin) live in the same deployment — easy to start, and splittable into separate apps later if needed.

```
src/app/
  (customer)/         ← Public storefront  → URL: /
    layout.tsx        ← Header + Footer wrapper
    page.tsx          ← Homepage
    products/         → /products
    branches/         → /branches
  staff/              ← Branch staff panel → URL: /staff
    layout.tsx
    page.tsx          ← Staff dashboard
    orders/           → /staff/orders
    inventory/        → /staff/inventory
  admin/              ← Super admin panel  → URL: /admin
    layout.tsx
    page.tsx          ← Admin dashboard
    branches/         → /admin/branches
    products/         → /admin/products
    inventory/        → /admin/inventory
    orders/           → /admin/orders
    settings/         → /admin/settings
  layout.tsx          ← Root layout (html, body)
  not-found.tsx
```

### Supporting Modules

```
src/
  config/
    site.ts           ← Centralised brand/domain config (single source of truth)
  components/
    branch/           ← Branch-selection UI components
    layout/           ← Header, Footer
    ui/               ← Shared, reusable UI primitives (Button, Badge, …)
  lib/
    prisma.ts         ← Prisma client singleton (safe for hot-reload)
    branch-cookie.ts  ← Cookie read/write for selected branch
    image.ts          ← Image URL helper (swap for Cloudinary/S3 later)
    utils.ts          ← formatPrice, slugify, generateOrderNumber, …
  types/
    branch.ts         ← SelectedBranch, SELECTED_BRANCH_COOKIE
    order.ts          ← OrderStatusValue, ORDER_STATUS_META
    inventory.ts      ← BranchStock, VariantAvailability
  generated/
    prisma/           ← Auto-generated Prisma client (gitignored, run generate)
```

---

## Branding & Configuration

All brand-level values live in one file:

```ts
// src/config/site.ts
export const siteConfig = {
  name: "NIYARO",
  tagline: "Quality Textiles & Fabrics",
  description: "...",
  domain: "niyaro.com",
  url: "https://niyaro.com",
  logoIcon: "🪡",
  staffPanelLabel: "Staff Panel",
  adminPanelLabel: "Admin Panel",
}
```

To rename the brand, update `siteConfig.name` (and related fields) only. No other source file contains the brand name as a literal string.

---

## Database Design

### Core Principles

1. **Centralised catalogue, branch-specific stock.** One `Product` and `ProductVariant` record per item. Stock tracked in `Inventory` per `(variantId, branchId)` pair.

2. **Three-field inventory model** (prevents overselling):
   - `physicalStock` — units physically in the branch
   - `reservedStock` — units held for pending/confirmed orders
   - `availableStock` — `physicalStock - reservedStock` (maintained in app logic)

3. **Price hierarchy** (lowest to highest priority):
   - `Product.basePrice` → global default
   - `ProductVariant.priceOverride` → variant-level override
   - `Inventory.branchPrice` → branch-specific override (future)

4. **Order lifecycle** (full audit trail via `OrderStatusHistory`):
   ```
   PENDING → CONFIRMED → PACKING → READY_FOR_PICKUP → COLLECTED
                                                     ↘ CANCELLED
   ```

5. **Inter-branch fulfilment** is modelled from day one:
   - `Order.fulfilmentBranchId` — branch supplying the stock
   - `Order.transferCharge` — configured in `BranchTransferCharge` table
   - Charges are admin-configurable, never hard-coded

6. **Branch selection persistence**:
   - Guests → `txl_selected_branch` cookie (30 days)
   - Authenticated customers → cookie synced to `Customer.selectedBranchId` on login

### Entity Map

```
Branch ──┬── Inventory ──── ProductVariant ──── Product ──── Category
         │                                          │
         └── Order ──── OrderItem                  └── ProductImage
                  └── OrderStatusHistory
BranchTransferCharge (source Branch → target Branch)
Customer ──── Order
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (local or remote)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
# Copy the template
copy .env.example .env.local
```

Edit `.env.local` and set your `DATABASE_URL`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/niyaro_dev?schema=public"
```

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Push the schema to the database

For initial development (no migration history needed yet):

```bash
npx prisma db push
```

When you're ready for proper migration history:

```bash
npx prisma migrate dev --name init
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| URL            | Interface           |
|----------------|---------------------|
| `/`            | Customer storefront |
| `/staff`       | Branch staff panel  |
| `/admin`       | Super admin panel   |

---

## Development Roadmap

This is the foundation. Business features are deliberately not implemented yet.

### Phase 1 — Authentication & Branch Selection
- [ ] Customer auth (email/password, then OAuth)
- [ ] Staff auth with branch assignment
- [ ] Admin auth with role check
- [ ] Branch selector modal with city search
- [ ] Sync branch preference to Customer record on login

### Phase 2 — Product Catalogue
- [ ] Category and product listing pages
- [ ] Product detail page with variant selector
- [ ] Branch-specific stock indicator on product pages
- [ ] Product search

### Phase 3 — Inventory & Stock Safety
- [ ] Inventory management in staff panel
- [ ] Atomic stock reservation (prevent overselling with DB transactions)
- [ ] Low-stock alerts
- [ ] Cross-branch availability lookup

### Phase 4 — Orders
- [ ] Reserve/checkout flow
- [ ] Order confirmation page and email
- [ ] Staff order management (status transitions)
- [ ] Customer order history and tracking page
- [ ] Push/email notification when order is READY_FOR_PICKUP

### Phase 5 — Admin Panel
- [ ] Branch management CRUD
- [ ] Product and variant management with image upload
- [ ] Cross-branch inventory overview
- [ ] BranchTransferCharge configuration
- [ ] System settings (default charges, thresholds)

### Phase 6 — Cross-Branch Fulfilment
- [ ] Detect out-of-stock at selected branch
- [ ] Show nearby branches with available stock
- [ ] Customer selects alternate branch or requests transfer
- [ ] Apply configured transfer charge to order total

### Future
- [ ] Cloudinary / S3 image storage
- [ ] Maps integration for branch finder
- [ ] SMS / WhatsApp notifications
- [ ] Progressive Web App (PWA) for mobile

---

## Key Conventions

- **Brand name** — never hard-code. Always import from `@/config/site` → `siteConfig.name`.
- **Server Components by default.** Only add `"use client"` when the component needs interactivity, browser APIs, or React state.
- **Cookie reads** — use `await cookies()` from `next/headers` (async in Next.js 16+).
- **Dynamic route params** — always `await params` before accessing fields (Promise in Next.js 16+).
- **Mutations** — use Server Actions (`"use server"` files). Never call Prisma from Client Components.
- **Image paths** — always go through `src/lib/image.ts` helpers, not raw string paths.
- **Pricing** — always call `formatPrice()` from `src/lib/utils.ts`. Never format currency inline.
- **Branch cookie name** — always import `SELECTED_BRANCH_COOKIE` from `src/types/branch.ts`.
