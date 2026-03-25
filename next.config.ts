import type { NextConfig } from "next";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const localTailwindCssEntry = path.join(
  projectRoot,
  "node_modules",
  "tailwindcss",
  "index.css",
);

const isProd = process.env.NODE_ENV === "production";
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
const connectSrc = isProd
  ? "connect-src 'self' https:"
  : "connect-src 'self' https: http: ws: wss:";
const upgradeInsecureRequests = isProd ? "; upgrade-insecure-requests" : "";

const r2PublicHostname = (() => {
  try {
    return process.env.R2_PUBLIC_URL
      ? new URL(process.env.R2_PUBLIC_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; frame-src 'none'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; manifest-src 'self'; worker-src 'self' blob:; ${scriptSrc}; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; ${connectSrc}; form-action 'self'${upgradeInsecureRequests}`,
  },
];

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "*",
  },
  {
    protocol: "https",
    hostname: "*.r2.dev",
  },
];

if (r2PublicHostname && !remotePatterns.some((pattern) => pattern.hostname === r2PublicHostname)) {
  remotePatterns.push({
    protocol: "https",
    hostname: r2PublicHostname,
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: localTailwindCssEntry,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      tailwindcss: localTailwindCssEntry,
    };
    return config;
  },
};

export default nextConfig;
