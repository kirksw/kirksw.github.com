import type { APIRoute } from 'astro';
import { allPosts, terms } from '../../../lib/posts';
import { feedResponse } from '../../../lib/feed';
export async function getStaticPaths() {
  const posts = await allPosts();
  return terms(posts, 'tags').map((tag) => ({ params: { tag }, props: { tag, posts: posts.filter((post) => post.data.tags.includes(tag)) } }));
}
export const GET: APIRoute = async ({ site, props }) => feedResponse(`${props.tag} on MDS`, `/tags/${props.tag}/`, props.posts, site);
