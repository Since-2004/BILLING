/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'pg', '@prisma/adapter-pg', '@prisma/adapter-better-sqlite3']
  }
};

module.exports = nextConfig;
