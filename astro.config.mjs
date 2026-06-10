import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const trimTrailingSlash = (value) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
};

const siteUrl = trimTrailingSlash(process.env.PUBLIC_SITE_URL) ?? "https://kingdomsx.com";
const assetsPrefix = trimTrailingSlash(process.env.PUBLIC_ASSETS_BASE);

export default defineConfig({
  site: siteUrl,
  output: "static",
  build: {
    format: "file",
    assets: "build",
    assetsPrefix
  },
  integrations: [
    sitemap({
      filter: (page) => !["/403.html", "/404.html"].some((path) => new URL(page).pathname === path)
    })
  ]
});
