import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nivaasa — Community, in one place",
    short_name: "Nivaasa",
    description: "The open-source operating system for gated communities.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#3155d8",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
