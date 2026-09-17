import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compression is handled by the reverse proxy (Caddy `encode zstd gzip`).
  // Letting Next ALSO gzip caused a double-handling bug where the proxy served
  // a decompressed body while keeping `Content-Encoding: gzip`, which browsers
  // reject (net::ERR_FAILED → unstyled page). Serve plain; the proxy compresses.
  compress: false,
  // Allow the app to be reached through a Cloudflare quick tunnel in dev
  // (used for sharing a mobile test link). Harmless in production.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Tree-shake lucide/recharts so the webpack/turbopack graph stays smaller.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  // All imagery is self-hosted under /public — no remote image hosts needed.

  // Proxy the cloud API same-origin so a single tunnel serves the whole app:
  // the browser calls /v1/* on the web origin and Next forwards it to the API,
  // avoiding a second tunnel and any cross-origin (CORS) setup. Set
  // NEXT_PUBLIC_API_URL="" so the client uses these relative paths.
  async rewrites() {
    const api = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3001";
    return [
      { source: "/v1/:path*", destination: `${api}/v1/:path*` },
      { source: "/health", destination: `${api}/health` },
      { source: "/health/:path*", destination: `${api}/health/:path*` },
    ];
  },
};

export default nextConfig;
