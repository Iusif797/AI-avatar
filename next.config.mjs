/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@heygen/liveavatar-web-sdk", "livekit-client"],
  experimental: {
    instrumentationHook: true
  }
};

export default nextConfig;
