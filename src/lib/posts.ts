import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  const visible = import.meta.env.DEV ? posts : posts.filter(({ data }) => !data.draft);
  return visible.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function postSlug(post: Post) { return post.id.replace(/\/index\.md$/, '').replace(/\.md$/, ''); }
export function postUrl(post: Post) { return `/posts/${postSlug(post)}/`; }
export function excerpt(post: Post) { return post.data.summary ?? post.body.split(/\n\s*\n/)[0].replace(/^#+\s+/, '').slice(0, 180); }
export function terms(posts: Post[], key: 'tags') { return [...new Set(posts.flatMap((post) => post.data[key]))].sort((a, b) => a.localeCompare(b)); }
