// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config/site';

import mdx from '@astrojs/mdx';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.includes('/404') })]
});