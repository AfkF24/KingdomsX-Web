import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://kingdomsx.com",
  output: "static",
  build: {
    format: "file"
  },
  integrations: [
    sitemap({
      filter: (page) => !["/403.html", "/404.html"].some((path) => new URL(page).pathname === path)
    })
  ]
});
