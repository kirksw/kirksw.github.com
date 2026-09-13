import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://kirksw.github.io',
  outDir: './docs',
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
