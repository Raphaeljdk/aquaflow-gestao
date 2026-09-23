import type { NextConfig } from "next";

// NextAuth treats an empty NEXTAUTH_URL as a URL and crashes prerendering.
if (!process.env.NEXTAUTH_URL?.trim()) {
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else {
    delete process.env.NEXTAUTH_URL;
  }
}
if (!process.env.NEXTAUTH_URL_INTERNAL?.trim()) {
  delete process.env.NEXTAUTH_URL_INTERNAL;
}

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: { cpus: 2 },
};
export default config;
