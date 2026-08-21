import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the app to be reached through a Cloudflare quick tunnel in dev
  // (used for sharing a mobile test link). Harmless in production.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // All imagery is self-hosted under /public — no remote image hosts needed.
};

export default nextConfig;
