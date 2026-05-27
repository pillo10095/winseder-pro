/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@wisender/shared"],
  outputFileTracing: true
};

export default nextConfig;
