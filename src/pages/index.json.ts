import type { APIRoute } from 'astro';
import { allPosts, postUrl, searchableText } from '../lib/posts';
export const GET: APIRoute = async () => {
  const posts = await allPosts();
  return new Response(JSON.stringify(posts.map((post) => ({ title: post.data.title, permalink: postUrl(post), date: post.data.date.toISOString().slice(0, 10), tags: post.data.tags, content: searchableText(post) }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
