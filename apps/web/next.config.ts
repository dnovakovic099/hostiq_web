import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hostiq/shared", "@hostiq/db"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
