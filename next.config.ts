import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site so it can be hosted on GitHub Pages.
  output: "export",
  // GitHub Pages serves project sites from /<repo-name>; set by the deploy
  // workflow (empty for local dev).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // /board -> /board/index.html, which static hosts serve natively.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
