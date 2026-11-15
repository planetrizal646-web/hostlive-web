import os from "node:os";
import type { NextConfig } from "next";

// Akses dev server dari HP/LAN: Next memblokir origin selain localhost,
// dan wildcard tidak bisa dipakai untuk alamat IP. Ambil IPv4 lokal mesin ini.
const lanOrigins = Object.values(os.networkInterfaces())
  .flatMap((infos) => infos ?? [])
  .filter((i) => i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  // Termasuk quick tunnel Cloudflare (nama subdomain acak).
  allowedDevOrigins: [...lanOrigins, "*.trycloudflare.com"],
};

export default nextConfig;
