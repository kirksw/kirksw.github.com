import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import postImages from './src/plugins/post-images.mjs';

export default defineConfig({
  site: 'https://kirksw.github.io',
  outDir: './docs',
  build: { format: 'directory' },
  markdown: { processor: unified({ remarkPlugins: [postImages] }) },
});
