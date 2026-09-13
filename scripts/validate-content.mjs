import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';

const outputDir = process.argv[2] ?? process.env.BUILD_DIR;
if (!outputDir) throw new Error('Usage: node scripts/validate-content.mjs <production-build-directory>');

async function filesUnder(directory) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else result.push(path);
    }
  }
  await visit(directory);
  return result;
}

const hugoDir = 'hugo/content/posts';
const astroDir = 'src/content/posts';
const slugs = (await readdir(hugoDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
for (const slug of slugs) {
  const hugo = await readFile(join(hugoDir, slug, 'index.md'), 'utf8');
  const astro = await readFile(join(astroDir, slug, 'index.md'), 'utf8');
  assert.equal(astro, hugo, `Astro Markdown differs from Hugo source: ${slug}`);
}

const expectedRoutes = [
  'index.html', '404.html', 'posts/index.html', 'posts/index.xml',
  'tags/index.html', 'tags/index.xml', 'categories/index.html', 'categories/index.xml',
  'archives/index.html', 'search/index.html', 'index.xml', 'index.json', 'sitemap.xml',
  ...slugs.filter((slug) => slug !== 'mill-jvm-builds').map((slug) => `posts/${slug}/index.html`),
  'tags/agents/index.xml', 'tags/ai/index.xml', 'tags/kubernetes/index.xml', 'tags/nix/index.xml',
  'tags/poetry/index.xml', 'tags/python/index.xml', 'tags/sdlc/index.xml',
  'tags/software-development/index.xml', 'tags/terraform/index.xml',
];
for (const route of expectedRoutes) {
  await stat(join(outputDir, route));
}

const builtFiles = await filesUnder(outputDir);
const builtText = (await Promise.all(builtFiles.filter((file) => /\.(html|xml|json|js)$/.test(file)).map((file) => readFile(file, 'utf8')))).join('\n');
assert.ok(!builtText.includes('sbt 2 Is Here. Why Consider Mill?'), 'draft title leaked into production output');
assert.ok(!builtText.includes('mill-jvm-builds'), 'draft route or link leaked into production output');
await stat(join(outputDir, 'posts/agentic-sdlc/images/agentic-sdlc-infographic.webp'));
await stat(join(outputDir, 'posts/python-packaging-part1/images/dairy_processing_package.png'));
const imagePairs = [
  ['public/posts/agentic-sdlc/images/agentic-sdlc-infographic.webp', 'src/content/posts/agentic-sdlc/images/agentic-sdlc-infographic.webp'],
  ['public/posts/python-packaging-part1/images/dairy_processing_package.png', 'src/content/posts/python-packaging-part1/images/dairy_processing_package.png'],
];
for (const [publicPath, sourcePath] of imagePairs) assert.deepEqual(await readFile(publicPath), await readFile(sourcePath), `Image copy differs: ${sourcePath}`);

const postPages = builtFiles.filter((file) => file.includes(`${join('posts')}${'/'}`) && file.endsWith('index.html'));
for (const page of postPages) {
  const html = await readFile(page, 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\/posts\/[^"#?]+\.(?:png|jpe?g|webp|gif))"/g)) {
    await stat(join(outputDir, match[1].slice(1)));
  }
}

console.log(`Validated ${slugs.length} source-parity posts and ${expectedRoutes.length} production routes in ${outputDir}.`);
