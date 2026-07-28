// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://achis.blog',
  adapter: vercel(),
  integrations: [mdx(), icon()],
});