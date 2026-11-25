import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@marketplace/ui", "@marketplace/types", "@marketplace/validation", "@marketplace/domain"],
  serverExternalPackages: ["pg", "nodemailer"],
  poweredByHeader: false,
};

export default nextConfig;
