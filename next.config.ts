import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.1.26:3000", "192.168.1.26", "localhost:3000"],
};

export default nextConfig;
