import type { NextConfig } from "next";

// Backend origin used by the same-origin proxy below. Server-side only.
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Proxy backend API calls through this origin so the httpOnly auth cookie is first-party.
  // Next.js route handlers under src/app/api (e.g. /api/map/*) still take precedence.
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/api/auth/:path*` },
      { source: "/api/trip/:path*", destination: `${BACKEND_URL}/api/trip/:path*` },
      { source: "/api/user/:path*", destination: `${BACKEND_URL}/api/user/:path*` },
    ];
  },
};

export default nextConfig;
