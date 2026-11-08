import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudinaryLoader.ts",
  },
};

export default nextConfig;