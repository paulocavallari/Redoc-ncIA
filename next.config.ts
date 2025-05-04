
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       { // Add configuration for imgur.com
         protocol: 'https',
         hostname: 'i.imgur.com',
         port: '',
         pathname: '/**',
       },
    ],
  },
};

export default nextConfig;

