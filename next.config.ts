import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.1.26:3000", "192.168.1.26", "localhost:3000"],
};

export default nextConfig;
