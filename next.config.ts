import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // PDF uploads go through a Server Action.
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        // The chat UI is designed to be iframed into any customer website.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
