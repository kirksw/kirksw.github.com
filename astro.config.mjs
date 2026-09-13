import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://cntd.io',
  outDir: './dist',
  build: { format: 'directory' },
  integrations: [mdx()],
  image: { layout: 'constrained', responsiveStyles: true },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
    },
  },
});
