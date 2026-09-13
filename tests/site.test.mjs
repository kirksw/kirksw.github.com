import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';

const buildDir = process.env.BUILD_DIR;
assert.ok(buildDir, 'BUILD_DIR must point to a temporary Astro build');
test('production output contains every legacy feed route', async () => {
  const routes = [
    'index.xml', 'posts/index.xml', 'tags/index.xml', 'categories/index.xml',
    'tags/agents/index.xml', 'tags/ai/index.xml', 'tags/kubernetes/index.xml',
    'tags/nix/index.xml', 'tags/poetry/index.xml', 'tags/python/index.xml',
    'tags/sdlc/index.xml', 'tags/software-development/index.xml', 'tags/terraform/index.xml',
  ];
  for (const route of routes) await stat(`${buildDir}/${route}`);
});

test('production output excludes the draft from every generated surface', async () => {
  const files = ['index.html', 'index.xml', 'index.json', 'posts/index.xml', 'tags/index.xml', 'sitemap.xml'];
  const content = (await Promise.all(files.map((file) => readFile(`${buildDir}/${file}`, 'utf8')))).join('\\n');
  assert.doesNotMatch(content, /mill-jvm-builds|sbt 2 Is Here/);
  await assert.rejects(stat(`${buildDir}/posts/mill-jvm-builds/index.html`));
});

test('production output retains post image links and copied assets', async () => {
  const page = await readFile(`${buildDir}/posts/agentic-sdlc/index.html`, 'utf8');
  assert.match(page, /src="\/_astro\/agentic-sdlc-infographic\.[^"]+"/);
  assert.match(page, /srcset="[^"]+"/);
  await stat(`${buildDir}/posts/agentic-sdlc/images/agentic-sdlc-infographic.webp`);
  await stat(`${buildDir}/posts/python-packaging-part1/images/dairy_processing_package.png`);
});


test('search indexes full post content with same-origin links', async () => {
  const entries = JSON.parse(await readFile(`${buildDir}/index.json`, 'utf8'));
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.match(entry.permalink, /^\/posts\/[^/]+\/$/);
    assert.ok(entry.content.length > 0);
  }
});

test('route contract includes new pages, compatibility routes, and MDX output', async () => {
  for (const route of ['about/index.html', 'projects/index.html', 'posts/python/index.html', 'posts/python-packaging-2022/index.html', 'posts/page/1/index.html', 'tags/python/page/1/index.html', 'posts/__test-mdx-fixture/index.html']) await stat(`${buildDir}/${route}`);
  const sitemap = await readFile(`${buildDir}/sitemap.xml`, 'utf8');
  assert.match(sitemap, /\/about\//);
  assert.match(sitemap, /\/projects\//);
  const mdx = await readFile(`${buildDir}/posts/__test-mdx-fixture/index.html`, 'utf8');
  assert.match(mdx, /MDX fixture/);
  assert.match(mdx, /Fixture heading/);
  assert.match(mdx, /Rendered MDX expression/);
});

test('comments preserve URL-based legacy thread lookup and load on demand', async () => {
  const page = await readFile(`${buildDir}/posts/python-packaging-part1/index.html`, 'utf8');
  assert.doesNotMatch(page, /this\.page\.identifier/);
  assert.match(page, /Load Disqus comments/);
  assert.match(page, /details\.dataset\.loaded/);
});


test('articles render reading time, anchored contents and semantic navigation', async () => {
  const page = await readFile(`${buildDir}/posts/scala-3-flink/index.html`, 'utf8');
  assert.match(page, /\d+ min read/);
  assert.match(page, /On this page/);
  assert.match(page, /Skip to content/);
  const anchors = [...page.matchAll(/href="#([^" ]+)"/g)].map((match) => match[1]);
  for (const anchor of anchors) assert.ok(page.includes(`id="${anchor}"`), `Missing anchor ${anchor}`);
});


test('all deployed tag pagination aliases remain reachable', async () => {
  for (const tag of await readdir('docs/tags')) {
    try { await stat(`docs/tags/${tag}/page/1/index.html`); } catch { continue; }
    const html = await readFile(`${buildDir}/tags/${tag}/page/1/index.html`, 'utf8');
    assert.ok(html.includes(`/tags/${tag}/`));
  }
});

test('navigation exposes current location and avoids overlay controls', async () => {
  const article = await readFile(`${buildDir}/posts/scala-3-flink/index.html`, 'utf8');
  const writing = await readFile(`${buildDir}/posts/index.html`, 'utf8');
  assert.match(article, /aria-current="location"/);
  assert.match(writing, /aria-current="page"/);
  assert.doesNotMatch(article, /accesskey=|class="top-link"/);
  assert.match(article, /Back to top/);
});
