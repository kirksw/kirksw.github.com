import type { APIRoute } from 'astro';
import { feedResponse } from '../../lib/feed';
export const GET: APIRoute = async ({ site }) => feedResponse('Categories on MDS', '/categories/', [], site);
