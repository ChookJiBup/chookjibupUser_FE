import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${backendOrigin}/api/auth/:path*` },
      { source: "/api/festivals/:path*", destination: `${backendOrigin}/api/festivals/:path*` },
      { source: "/api/wishlists/:path*", destination: `${backendOrigin}/api/wishlists/:path*` },
    ];
  },
};

export default nextConfig;
