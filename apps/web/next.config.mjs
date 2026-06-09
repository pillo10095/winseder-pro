/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@wisender/shared"],
  outputFileTracing: true,
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
