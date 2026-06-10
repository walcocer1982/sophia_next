import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto para que Turbopack resuelva node_modules
  // desde sophia_next/ y no desde la carpeta padre (evita el error
  // "Can't resolve 'tailwindcss'" en dev).
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
