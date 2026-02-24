import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    // Provide a dummy URL during Vercel's build phase so Prisma's
    // static analysis doesn't crash when prerendering pages
    DATABASE_URL: process.env.DATABASE_URL || "file:./dummy.db",
  },
};

export default nextConfig;
