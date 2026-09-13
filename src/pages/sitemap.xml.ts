import type { APIRoute } from 'astro';
import { allPosts, postUrl, terms } from '../lib/posts';
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const GET: APIRoute = async ({ site }) => {
  const posts = await allPosts();
  const paths = ['/', '/about/', '/projects/', '/posts/', '/tags/', '/archives/', '/search/', '/categories/', '/agentic-sdlc/', ...posts.map(postUrl), ...terms(posts, 'tags').map((tag) => `/tags/${tag}/`)].map((path) => `<url><loc>${escape(new URL(path, site).href)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
