import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // ── Local development ─────────────────────────────────────────────────
    // Images served from /public are relative paths.
    localPatterns: [
      {
        pathname: "/images/**",
        search: "",
      },
    ],

    // ── Remote image sources ──────────────────────────────────────────────
    remotePatterns: [
      // Vercel Blob — primary storage for uploaded product images.
      // All uploads via /api/upload/product-image land here.
      // Requires BLOB_READ_WRITE_TOKEN in environment variables.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },

      // Future: Cloudinary (uncomment when configured)
      // {
      //   protocol: "https",
      //   hostname: "res.cloudinary.com",
      //   pathname: "/<your-cloud-name>/image/upload/**",
      // },

      // Future: AWS S3 (uncomment when configured)
      // {
      //   protocol: "https",
      //   hostname: "<your-bucket>.s3.<region>.amazonaws.com",
      //   pathname: "/**",
      // },
    ],
  },
}

export default nextConfig
