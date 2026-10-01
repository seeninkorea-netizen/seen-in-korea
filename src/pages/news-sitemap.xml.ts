import type { APIRoute } from 'astro';
import { getArticles } from '../lib/content';

const escapeXml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const base = site || new URL('https://seeninkorea.com');
  const articles = await getArticles(500);

  const now = Date.now();
  const twoDaysAgo = now - 48 * 60 * 60 * 1000;

  const recentArticles = articles.filter((article) => {
    if (!article.publishedAt) return false;

    const published = new Date(article.publishedAt).getTime();

    return published >= twoDaysAgo && published <= now;
  });

  const urls = recentArticles
    .map((article) => {
      const loc = new URL(`/articles/${article.slug}`, base).toString();

      return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>SEEN IN KOREA</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(article.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
