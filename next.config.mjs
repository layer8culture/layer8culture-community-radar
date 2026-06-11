/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // playwright-core ships its own browser-launcher and dynamically loads
  // chromium-bidi at runtime. Keep it out of the webpack bundle so Next
  // doesn't try to resolve those at build time. It's loaded at runtime by
  // src/lib/ingestTikTok.ts only when TIKTOK_SCRAPER_ENABLED is set.
  experimental: {
    serverComponentsExternalPackages: ["playwright-core"],
  },
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
      "./prisma/**/*",
    ],
  },
};
export default nextConfig;
