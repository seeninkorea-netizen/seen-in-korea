import { createClient } from '@sanity/client';
import { demoArticles, demoInterviews, demoProducts } from './demo';
import type { Article, Interview, Product } from './types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
const enabled = Boolean(projectId && projectId !== 'replace_me');

const client = enabled ? createClient({
  projectId,
  dataset,
  apiVersion: '2026-03-01',
  useCdn: false,
  perspective: 'published'
}) : null;

const articleProjection = `{
    _id,
  title,
  "slug": slug.current,
  dek,
  category,
  eyebrow,
  publishedAt,
  "updatedAt": _updatedAt,
  author,
  homepagePlacement, homePriority, homepageUntil, deskLabel, deskTimeLabel, deskNote,
  verification, "heroImageUrl": heroImage.asset->url, heroAlt, body,
  sources[]{label,url},
  commerceLinks[]{retailer,market,price,url,affiliate}
}`;

export async function getArticles(limit = 20): Promise<Article[]> {
  if (!client) return demoArticles.slice(0, limit);
  return client.fetch(`*[_type == "article" && defined(slug.current)] | order(publishedAt desc)[0...$limit] ${articleProjection}`, { limit });
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!client) return demoArticles.find(a => a.slug === slug) || null;
  return client.fetch(`*[_type == "article" && slug.current == $slug][0] ${articleProjection}`, { slug });
}

export async function getArticlesByCategory(category: string): Promise<Article[]> {
  if (!client) return demoArticles.filter(a => a.category === category);
  return client.fetch(`*[_type == "article" && category == $category && defined(slug.current)] | order(publishedAt desc) ${articleProjection}`, { category });
}

function articleText(article: Article) {
  return [
    article.title,
    article.dek,
    article.category,
    article.eyebrow,
    article.deskLabel,
    article.deskNote
  ].filter(Boolean).join(' ').toLowerCase();
}

export async function getArticlesBySection(section: string): Promise<Article[]> {
  const articles = await getArticles(250);

  if (section === 'trending') {
    return articles.filter(a => a.category === 'Trending');
  }

  if (section === 'seen-on') {
    return articles.filter(a => a.category === 'Seen On' || articleText(a).includes('seen on'));
  }

  if (section === 'real-korea') {
    return articles.filter(a => a.category === 'Real Korea' || a.category === 'Living');
  }

  if (section === 'shop-korea') {
    return articles.filter(a =>
      a.category === 'Shop Korea' ||
      a.category === 'Seen On' ||
      articleText(a).includes('seen on')
    );
  }

  return [];
}

const deskMatchers: Record<string, (article: Article) => boolean> = {
  'seoul': (a) => {
    const text = articleText(a);
    return text.includes('seoul') || text.includes('hongdae') || text.includes('myeongdong');
  },
  'culture': (a) => {
    const text = articleText(a);
    return text.includes('culture') || text.includes('k-culture');
  },
  'beauty': (a) => {
    const text = articleText(a);
    return text.includes('beauty') || text.includes('k-beauty') || text.includes('skincare') || text.includes('cosmetic');
  },
  'entertainment': (a) => {
    const text = articleText(a);
    return text.includes('k-pop') || text.includes('k-drama') || text.includes('concert') || text.includes('streaming') || text.includes('entertainment');
  },
  'real-korea': (a) => a.category === 'Real Korea' || a.category === 'Living',
  'products': (a) => a.category === 'Shop Korea' || a.category === 'Seen On' || articleText(a).includes('seen on') || Boolean(a.commerceLinks?.length),
  'practical-help': (a) => a.category === 'Korea Help' || articleText(a).includes('practical help')
};

export async function getArticlesByDesk(desk: string): Promise<Article[]> {
  const articles = await getArticles(250);
  const matcher = deskMatchers[desk];
  return matcher ? articles.filter(matcher) : [];
}

export async function getProducts(limit = 12): Promise<Product[]> {
  if (!client) return demoProducts.slice(0, limit);
  return client.fetch(`*[_type == "product" && defined(slug.current)] | order(_updatedAt desc)[0...$limit]{
    _id,name,brand,"slug":slug.current,category,summary,"imageUrl":image.asset->url,verification,celebrity,evidence,koreaPrice,globalPrice,exportCandidate,
    retailers[]{retailer,market,price,url,affiliate}
  }`, { limit });
}

export async function getInterviews(limit = 12): Promise<Interview[]> {
  if (!client) return demoInterviews.slice(0, limit);
  return client.fetch(`*[_type == "interview" && quoteConsent == true && defined(slug.current)] | order(publishedAt desc)[0...$limit]{
    _id,displayName,country,yearsInKorea,headline,"slug":slug.current,summary,quote,biggestProblem,favoriteProduct,favoriteCelebrity,"photoUrl":photo.asset->url,publishedAt
  }`, { limit });
}

export const sanityEnabled = enabled;
