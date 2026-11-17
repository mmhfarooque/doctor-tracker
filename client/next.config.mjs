const isDev = process.env.NODE_ENV !== 'production';

// Only the configured API origin may be contacted (instead of any https: host)
let apiOrigin = 'http://localhost:5000';
try {
  apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').origin;
} catch {
  // keep the localhost default
}

const csp = [
  "default-src 'self'",
  // Next.js needs inline bootstrap scripts; 'unsafe-eval' is only required by the dev server (Fast Refresh)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: http://127.0.0.1:5000' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Disables 'X-Powered-By: Next.js' header for fingerprint obfuscation
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
