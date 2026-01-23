import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  experimental: {
    proxyClientMaxBodySize: "2gb",
  },
};

export default nextConfig;
