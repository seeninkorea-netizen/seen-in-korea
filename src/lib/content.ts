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
  _id, title, "slug": slug.current, dek, category, eyebrow, publishedAt, author,
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
