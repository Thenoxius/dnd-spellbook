import type { NextConfig } from "next";

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so
// the build needs to know that prefix. The workflow sets it; locally it stays
// empty and `next dev` keeps serving from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // No server, no API routes, no server-side data: everything the app knows
  // lives in the visitor's own IndexedDB. A static export is all it needs, and
  // it is what lets GitHub Pages host it.
  output: "export",

  // Emit `character/index.html` rather than `character.html`, so Pages resolves
  // /character/ without a redirect it cannot perform.
  trailingSlash: true,

  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
