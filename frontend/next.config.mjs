/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/faces/:path*',
        destination: 'http://127.0.0.1:8000/faces/:path*',
      },
      {
        source: '/attendance_snaps/:path*',
        destination: 'http://127.0.0.1:8000/attendance_snaps/:path*',
      },
    ];
  },
};

export default nextConfig;
