import os from "os";
import type { NextConfig } from "next";

// Collect all local IPv4 addresses on this machine so LAN devices can access Next.js dev resources.
const localIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface): iface is os.NetworkInterfaceInfo => Boolean(iface && iface.family === "IPv4"))
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...localIps,
    "127.0.0.1",
    "0.0.0.0",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
  ],
  experimental: {
    reactDebugChannel: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
