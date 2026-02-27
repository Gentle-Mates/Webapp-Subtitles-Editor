import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    experimental: {
        proxyClientMaxBodySize: '10gb'
    }
};

export default nextConfig;
