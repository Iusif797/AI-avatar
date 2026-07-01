/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@heygen/liveavatar-web-sdk", "livekit-client"]
};

export default nextConfig;
