import type { APIRoute } from 'astro';
import { allPosts } from '../../lib/posts';
import { feedResponse } from '../../lib/feed';
export const GET: APIRoute = async ({ site }) => feedResponse('Posts on MDS', '/posts/', await allPosts(), site);
