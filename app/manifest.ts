import type { MetadataRoute } from "next";

// Lets people install LaptopCore like an app (Add to Home Screen / Install).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LaptopCore",
    short_name: "LaptopCore",
    description: "Track Canadian laptop prices and find your next deal.",
    start_url: "/tracker",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    icons: [{ src: "/icon.png", sizes: "500x500", type: "image/png", purpose: "any" }],
  };
}
