import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bevel/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
