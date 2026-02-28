import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LocalRoots",
    short_name: "LocalRoots",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#2f6b4f",
  };
}
