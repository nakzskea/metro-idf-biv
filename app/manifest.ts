import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prochains passages",
    short_name: "Passages",
    start_url: "/",
    display: "standalone",
    background_color: "#d9dde2",
    theme_color: "#d9dde2",
  };
}