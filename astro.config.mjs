// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { SITE_URL } from './src/config/site';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()]
});