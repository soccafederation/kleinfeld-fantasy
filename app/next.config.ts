import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamisch-by-default: Fantasy-Daten ändern sich pro Nutzer und nach jedem Engine-Lauf.
  // Cache Components würden Suspense-Grenzen um jeden Datenzugriff erzwingen – für den
  // Launch-Stand bewusst aus, Caching passiert gezielt über unstable_cache/Tags.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // Spielerfotos und Wappen der Icon League (Contentful)
      { protocol: "https", hostname: "images.ctfassets.net" },
    ],
  },
};

export default nextConfig;
