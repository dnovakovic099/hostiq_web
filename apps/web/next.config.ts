import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hostiq/shared", "@hostiq/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
