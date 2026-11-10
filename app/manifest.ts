import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DocSecure – Family Document Vault",
    short_name: "DocSecure",
    description: "Scan, read and safely organise your family's documents – medical, passport, ID and more.",
    start_url: "/vault",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#0b1020",
    theme_color: "#4f46e5",
    categories: ["productivity", "utilities", "medical"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Scan document", url: "/scan", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My people", url: "/vault", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
