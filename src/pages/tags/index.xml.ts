import type { APIRoute } from 'astro';
import { allPosts } from '../../lib/posts';
import { feedResponse } from '../../lib/feed';
export const GET: APIRoute = async ({ site }) => feedResponse('Tags on MDS', '/tags/', await allPosts(), site);
