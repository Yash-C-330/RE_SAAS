import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.clerk.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
};

export default nextConfig;

