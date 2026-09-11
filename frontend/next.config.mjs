const configuredBackendUrl = process.env.API_BASE;

if (process.env.VERCEL === "1" && !configuredBackendUrl) {
  throw new Error("Set API_BASE to the Spring Boot backend URL before deploying to Vercel.");
}

const backendUrl = (configuredBackendUrl || "http://localhost:8080").replace(/\/$/, "");

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
