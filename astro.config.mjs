import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://kingdomsx.com",
  output: "static",
  integrations: [sitemap()]
});
