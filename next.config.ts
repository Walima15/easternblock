import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer and some local tools open the dev server as 127.0.0.1.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
