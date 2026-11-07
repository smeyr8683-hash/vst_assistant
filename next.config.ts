import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FB_APP_ID: process.env.NEXT_PUBLIC_FB_APP_ID || process.env.FB_APP_ID || "3601005156741406",
    NEXT_PUBLIC_FB_CONFIG_ID: process.env.NEXT_PUBLIC_FB_CONFIG_ID || "1095689973246592",
    FB_APP_SECRET: process.env.FB_APP_SECRET || "a09a694512f9dcd03dd170c3ec75dc61",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3443",
    NEXT_PUBLIC_ENABLE_AUTO_SCANNER: process.env.NEXT_PUBLIC_ENABLE_AUTO_SCANNER || "true",
    NEXT_PUBLIC_BOT_AUTOMATION_ENABLED: process.env.NEXT_PUBLIC_BOT_AUTOMATION_ENABLED || "true",
  },
};

export default nextConfig;
