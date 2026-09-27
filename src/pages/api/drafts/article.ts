import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { env } from 'cloudflare:workers';

const runtimeEnv = env as unknown as Record<string, string | undefined>;
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

const allowedCategories = new Set(['Trending', 'Seen On', 'Real Korea', 'Shop Korea', 'Living', 'Korea Help']);

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function safeKey(input: string) {
  const cleaned = input.toLowerCase().trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 82);
  return cleaned || crypto.randomUUID();
}

function slugify(input: string) {
  const value = input.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90);
  return value || `story-${Date.now()}`;
}

function key() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function textBlock(text: string, style = 'normal', listItem?: 'bullet' | 'number') {
  return {
    _type: 'block', _key: key(), style,
    ...(listItem ? { listItem, level: 1 } : {}),
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }]
  };
}

function bodyToPortableText(body: unknown) {
  if (Array.isArray(body)) return body;
  if (typeof body !== 'string' || !body.trim()) return [];

  const out: any[] = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];

  const flush = () => {
    const text = paragraph.join(' ').trim();
    if (text) out.push(textBlock(text));
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('### ')) { flush(); out.push(textBlock(line.slice(4), 'h3')); continue; }
    if (line.startsWith('## ')) { flush(); out.push(textBlock(line.slice(3), 'h2')); continue; }
    if (/^[-*]\s+/.test(line)) { flush(); out.push(textBlock(line.replace(/^[-*]\s+/, ''), 'normal', 'bullet')); continue; }
    if (/^\d+[.)]\s+/.test(line)) { flush(); out.push(textBlock(line.replace(/^\d+[.)]\s+/, ''), 'normal', 'number')); continue; }
    paragraph.push(line);
  }
  flush();
  return out;
}

function arrayObjects(items: unknown, mapper: (item: any) => Record<string, unknown>) {
  if (!Array.isArray(items)) return [];
  return items.filter(Boolean).map((item) => ({ _key: key(), ...mapper(item) }));
}

export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service: 'seen-in-korea-draft-intake',
    configured: {
      sanityProject: Boolean(projectId),
      writeToken: Boolean(runtimeEnv.SANITY_API_WRITE_TOKEN),
      intakeSecret: Boolean(runtimeEnv.DRAFT_INGEST_SECRET)
    },
    behavior: 'Creates Sanity drafts only. It never publishes.'
  });
};

export const POST: APIRoute = async ({ request }) => {
  const suppliedSecret = request.headers.get('x-draft-secret');
  if (!runtimeEnv.DRAFT_INGEST_SECRET || suppliedSecret !== runtimeEnv.DRAFT_INGEST_SECRET) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (!projectId || !runtimeEnv.SANITY_API_WRITE_TOKEN) {
    return json({ ok: false, error: 'Draft intake is not configured on the server.' }, 503);
  }

  let input: any;
  try { input = await request.json(); }
  catch { return json({ ok: false, error: 'Request body must be valid JSON.' }, 400); }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const dek = typeof input.dek === 'string' ? input.dek.trim() : '';
  const category = allowedCategories.has(input.category) ? input.category : 'Trending';
  if (!title || !dek) return json({ ok: false, error: 'title and dek are required.' }, 400);

  const draftKey = safeKey(String(input.draftKey || `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`));
  const publishedId = `article-${draftKey}`.slice(0, 119);
  const draftId = `drafts.${publishedId}`;
  const now = new Date().toISOString();

  const sources = arrayObjects(input.sources, (item) => ({
    _type: 'object',
    label: String(item.label || item.url || 'Source').slice(0, 160),
    url: String(item.url || '')
  })).filter((item: any) => item.url);

  const commerceLinks = arrayObjects(input.commerceLinks, (item) => ({
    _type: 'object',
    retailer: String(item.retailer || 'Retailer').slice(0, 100),
    market: item.market ? String(item.market).slice(0, 40) : undefined,
    price: item.price ? String(item.price).slice(0, 60) : undefined,
    url: String(item.url || ''),
    affiliate: Boolean(item.affiliate)
  })).filter((item: any) => item.url);

  const verificationSuggestion = typeof input.verificationSuggestion === 'string'
    ? input.verificationSuggestion.slice(0, 240) : '';

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-07-01',
    useCdn: false,
    token: runtimeEnv.SANITY_API_WRITE_TOKEN
  });

  const document = {
    _id: draftId,
    _type: 'article',
    title,
    slug: { _type: 'slug', current: slugify(input.slug || title) },
    dek,
    category,
    eyebrow: typeof input.eyebrow === 'string' ? input.eyebrow.slice(0, 120) : undefined,
    publishedAt: typeof input.suggestedPublishAt === 'string' ? input.suggestedPublishAt : now,
    author: typeof input.author === 'string' ? input.author.slice(0, 100) : 'Seen in Korea Desk',
    draftOrigin: 'ai',
    draftGeneratedAt: now,
    draftKey,
    verificationSuggestion,
    editorialNotes: [
      'AI draft — human review required before publishing.',
      input.editorialNotes ? String(input.editorialNotes) : '',
      input.heroImageSuggestion ? `Suggested image/source: ${String(input.heroImageSuggestion)}` : ''
    ].filter(Boolean).join('\n\n'),
    homepagePlacement: 'none',
    homePriority: 50,
    deskLabel: typeof input.deskLabel === 'string' ? input.deskLabel.slice(0, 40) : undefined,
    deskTimeLabel: typeof input.deskTimeLabel === 'string' ? input.deskTimeLabel.slice(0, 30) : undefined,
    deskNote: typeof input.deskNote === 'string' ? input.deskNote.slice(0, 300) : undefined,
    verification: category === 'Seen On' ? 'Unconfirmed' : 'Not applicable',
    heroAlt: typeof input.heroAlt === 'string' ? input.heroAlt.slice(0, 240) : undefined,
    body: bodyToPortableText(input.body),
    sources,
    commerceLinks
  };

  try {
    const result = await client.createOrReplace(document);
    return json({
      ok: true,
      draftId: result._id,
      draftKey,
      title,
      admin: '/admin → AI Draft Inbox',
      published: false,
      note: 'Homepage placement is forced to Do not feature. An editor must review and publish manually.'
    }, 201);
  } catch (error: any) {
    return json({ ok: false, error: error?.message || 'Sanity mutation failed.' }, 500);
  }
};
