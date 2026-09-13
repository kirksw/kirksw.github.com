import type { Post } from './posts';
import { excerpt, postUrl } from './posts';

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function feedResponse(title: string, path: string, posts: Post[], site: URL | undefined) {
  const base = site ?? new URL('https://kirksw.github.io/');
  const link = new URL(path, base).toString();
  const items = posts.map((post) => {
    const url = new URL(postUrl(post), base).toString();
    return `<item><title>${escapeXml(post.data.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${post.data.date.toUTCString()}</pubDate><description>${escapeXml(excerpt(post))}</description></item>`;
  }).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(title)}</title><link>${link}</link><description>Reference articles around data engineering/software</description>${items}</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
