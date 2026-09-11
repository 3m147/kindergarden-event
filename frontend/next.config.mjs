const configuredBackendUrl = process.env.API_BASE;
const defaultBackendUrl = process.env.VERCEL === "1"
  ? "https://kindergarden-backend-726974445152.asia-northeast3.run.app"
  : "http://localhost:8080";
const backendUrl = (configuredBackendUrl || defaultBackendUrl).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
