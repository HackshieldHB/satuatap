import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the app to be reached through a Cloudflare quick tunnel in dev
  // (used for sharing a mobile test link). Harmless in production.
  allowedDevOrigins: ["*.trycloudflare.com"],
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
