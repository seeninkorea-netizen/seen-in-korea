import type { APIRoute } from 'astro';
import { getArticles } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const base = site || new URL('https://seeninkorea.com');
  const articles = await getArticles(500);
  const staticPaths = ['/', '/real-korea', '/shop-korea', '/korea-help', '/about', '/category/trending', '/category/seen-on'];
  const urls = [...staticPaths.map(path => new URL(path, base).toString()), ...articles.map(a => new URL(`/articles/${a.slug}`, base).toString())];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
