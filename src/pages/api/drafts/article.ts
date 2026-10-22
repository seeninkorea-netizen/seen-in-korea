
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { env } from 'cloudflare:workers';

const runtimeEnv = env as unknown as Record<string, string | undefined>;
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

const allowedCategories = new Set([
  'Trending', 'Seen On', 'Real Korea',
  'Shop Korea', 'Living', 'Korea Help'
]);

const allowedRights = new Set([
  'owned', 'licensed', 'press-permitted', 'ai-generated'
]);

const supportedImageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
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
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);

  return value || `story-${Date.now()}`;
}

function key() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function textBlock(
  text: string,
  style = 'normal',
  listItem?: 'bullet' | 'number'
) {
  return {
    _type: 'block',
    _key: key(),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: key(),
        text,
        marks: []
      }
    ]
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

    if (!line) {
      flush();
      continue;
    }

    if (line.startsWith('### ')) {
      flush();
      out.push(textBlock(line.slice(4), 'h3'));
      continue;
    }

    if (line.startsWith('## ')) {
      flush();
      out.push(textBlock(line.slice(3), 'h2'));
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flush();
      out.push(
        textBlock(
          line.replace(/^[-*]\s+/, ''),
          'normal',
          'bullet'
        )
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flush();
      out.push(
        textBlock(
          line.replace(/^\d+[.)]\s+/, ''),
          'normal',
          'number'
        )
      );
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return out;
}

function arrayObjects(
  items: unknown,
  mapper: (item: any) => Record<string, unknown>
) {
  if (!Array.isArray(items)) return [];

  return items
    .filter(Boolean)
    .map((item) => ({
      _key: key(),
      ...mapper(item)
    }));
}

type PreparedImage = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  rights: string;
};

function prepareImage(input: any): PreparedImage | null {
  if (
    input.heroImageBase64 === undefined ||
    input.heroImageBase64 === null ||
    input.heroImageBase64 === ''
  ) {
    return null;
  }

  if (typeof input.heroImageBase64 !== 'string') {
    throw new Error('heroImageBase64 must be a string.');
  }

  const dataUri =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(
      input.heroImageBase64
    );

  const contentType = (
    dataUri?.[1] ||
    input.heroImageMimeType ||
    ''
  ).toLowerCase();

  const encoded = dataUri
    ? dataUri[2]
    : input.heroImageBase64;

  if (!supportedImageTypes[contentType]) {
    throw new Error(
      'Provide heroImageMimeType: image/jpeg, image/png, or image/webp.'
    );
  }

  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      encoded
    )
  ) {
    throw new Error('Invalid standard Base64 image data.');
  }

  if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4) {
    throw new Error('Hero image exceeds 8 MB.');
  }

  const rights = String(input.heroImageRights || '')
    .trim()
    .toLowerCase();

  if (!allowedRights.has(rights)) {
    throw new Error(
      'heroImageRights must be owned, licensed, press-permitted, or ai-generated.'
    );
  }

  if (
    rights === 'press-permitted' &&
    !input.heroImageSourceUrl
  ) {
    throw new Error(
      'heroImageSourceUrl is required for press-permitted images.'
    );
  }

  if (
    typeof input.heroAlt !== 'string' ||
    !input.heroAlt.trim()
  ) {
    throw new Error(
      'heroAlt is required when uploading an image.'
    );
  }

  const binary = atob(encoded);

  if (binary.length > MAX_IMAGE_BYTES) {
    throw new Error('Hero image exceeds 8 MB.');
  }

  const bytes = Uint8Array.from(
    binary,
    (char) => char.charCodeAt(0)
  );

  const jpeg =
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  const webp =
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

  if (
    !(
      (contentType === 'image/jpeg' && jpeg) ||
      (contentType === 'image/png' && png) ||
      (contentType === 'image/webp' && webp)
    )
  ) {
    throw new Error(
      'Image signature does not match MIME type.'
    );
  }

  const baseName =
    String(input.heroImageFilename || 'editorial-hero')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 80) || 'editorial-hero';

  return {
    bytes,
    filename: `${baseName}.${supportedImageTypes[contentType]}`,
    contentType,
    rights
  };
}

export const GET: APIRoute = async () => {
  return json({
    ok: true,
    service: 'seen-in-korea-draft-intake',
    configured: {
      sanityProject: Boolean(projectId),
      writeToken: Boolean(runtimeEnv.SANITY_API_TOKEN),
      intakeSecret: Boolean(runtimeEnv.AI_DRAFT_SECRET)
    },
    behavior:
      'Creates Sanity drafts only. It never publishes.'
  });
};

export const POST: APIRoute = async ({ request }) => {
  const suppliedSecret =
    request.headers.get('x-draft-secret');

  if (
    !runtimeEnv.AI_DRAFT_SECRET ||
    suppliedSecret !== runtimeEnv.AI_DRAFT_SECRET
  ) {
    return json({
      ok: false,
      error: 'Unauthorized'
    }, 401);
  }

  if (!projectId || !runtimeEnv.SANITY_API_TOKEN) {
    return json({
      ok: false,
      error: 'Draft intake is not configured on the server.'
    }, 503);
  }

  let input: any;

  try {
    input = await request.json();
  } catch {
    return json({
      ok: false,
      error: 'Request body must be valid JSON.'
    }, 400);
  }

  const title =
    typeof input.title === 'string'
      ? input.title.trim()
      : '';

  const dek =
    typeof input.dek === 'string'
      ? input.dek.trim()
      : '';

  const category = allowedCategories.has(input.category)
    ? input.category
    : 'Trending';

  if (!title || !dek) {
    return json({
      ok: false,
      error: 'title and dek are required.'
    }, 400);
  }

  const draftKey = safeKey(
    String(
      input.draftKey ||
      `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`
    )
  );

  const publishedId = `article-${draftKey}`.slice(0, 119);
  const draftId = `drafts.${publishedId}`;
  const now = new Date().toISOString();

  const sources = arrayObjects(
    input.sources,
    (item) => ({
      _type: 'object',
      label: String(
        item.label || item.url || 'Source'
      ).slice(0, 160),
      url: String(item.url || '')
    })
  ).filter((item: any) => item.url);

  const commerceLinks = arrayObjects(
    input.commerceLinks,
    (item) => ({
      _type: 'object',
      retailer: String(
        item.retailer || 'Retailer'
      ).slice(0, 100),
      market: item.market
        ? String(item.market).slice(0, 40)
        : undefined,
      price: item.price
        ? String(item.price).slice(0, 60)
        : undefined,
      url: String(item.url || ''),
      affiliate: Boolean(item.affiliate)
    })
  ).filter((item: any) => item.url);

  const verificationSuggestion =
    typeof input.verificationSuggestion === 'string'
      ? input.verificationSuggestion.slice(0, 240)
      : '';

  let preparedImage: PreparedImage | null;

  try {
    preparedImage = prepareImage(input);

    if (!preparedImage && input.heroImageUrl) {
      return json({
        ok: false,
        error:
          'heroImageUrl is disabled for security. Provide a rights-cleared image using heroImageBase64.'
      }, 400);
    }
  } catch (error: any) {
    return json({
      ok: false,
      error: error?.message || 'Invalid image input.'
    }, 400);
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-07-01',
    useCdn: false,
    token: runtimeEnv.SANITY_API_TOKEN
  });

  try {
    // Preserve the existing image on stable-key draft updates.
    const previous = await client.getDocument(draftId);

    let heroImage = previous?.heroImage;
    let heroImageUploaded = false;

    if (preparedImage) {
      const blob = new Blob(
        [new Uint8Array(preparedImage.bytes)],
        { type: preparedImage.contentType }
      );

      const asset = await client.assets.upload(
        'image',
        blob,
        {
          filename: preparedImage.filename,
          contentType: preparedImage.contentType
        }
      );

      const width =
        asset.metadata?.dimensions?.width || 0;

      const height =
        asset.metadata?.dimensions?.height || 0;

      if (width < 1200 || !height) {
        return json({
          ok: false,
          error:
            'Hero image must be at least 1200px wide; draft not changed.'
        }, 400);
      }

      heroImage = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id
        }
      };

      heroImageUploaded = true;
    }

    const imageNotes = preparedImage
      ? [
          `Image rights (submitter declaration; not independently verified): ${preparedImage.rights}`,
          input.heroImageCredit
            ? `Image credit: ${String(input.heroImageCredit).slice(0, 240)}`
            : '',
          input.heroImageSourceUrl
            ? `Image source: ${String(input.heroImageSourceUrl).slice(0, 500)}`
            : '',
          'Editor must verify that the image license allows this publication.'
        ].filter(Boolean)
      : [];

    const document = {
      _id: draftId,
      _type: 'article',
      title,
      slug: {
        _type: 'slug',
        current: slugify(input.slug || title)
      },
      dek,
      category,
      eyebrow:
        typeof input.eyebrow === 'string'
          ? input.eyebrow.slice(0, 120)
          : undefined,
      publishedAt:
        typeof input.suggestedPublishAt === 'string'
          ? input.suggestedPublishAt
          : now,
      author:
        typeof input.author === 'string'
          ? input.author.slice(0, 100)
          : 'Seen in Korea Desk',
      draftOrigin: 'ai',
      draftGeneratedAt: now,
      draftKey,
      verificationSuggestion,
      editorialNotes: [
        'AI draft — human review required before publishing.',
        input.editorialNotes
          ? String(input.editorialNotes)
          : '',
        input.heroImageSuggestion
          ? `Suggested image/source: ${String(input.heroImageSuggestion)}`
          : '',
        ...imageNotes
      ].filter(Boolean).join('\n\n'),
      homepagePlacement: 'none',
      homePriority: 50,
      deskLabel:
        typeof input.deskLabel === 'string'
          ? input.deskLabel.slice(0, 40)
          : undefined,
      deskTimeLabel:
        typeof input.deskTimeLabel === 'string'
          ? input.deskTimeLabel.slice(0, 30)
          : undefined,
      deskNote:
        typeof input.deskNote === 'string'
          ? input.deskNote.slice(0, 300)
          : undefined,
      verification:
        category === 'Seen On'
          ? 'Unconfirmed'
          : 'Not applicable',
      heroImage,
      heroAlt:
        typeof input.heroAlt === 'string'
          ? input.heroAlt.slice(0, 240)
          : previous?.heroAlt,
      body: bodyToPortableText(input.body),
      sources,
      commerceLinks
    };

    const result = await client.createOrReplace(document);

    return json({
      ok: true,
      draftId: result._id,
      draftKey,
      title,
      heroImageAttached: Boolean(heroImage),
      heroImageUploaded,
      admin: '/admin → AI Draft Inbox',
      published: false,
      note:
        'Homepage placement is forced to Do not feature. An editor must review and publish manually.'
    }, 201);

  } catch (error: any) {
    return json({
      ok: false,
      error:
        error?.message ||
        'Sanity asset upload or mutation failed.'
    }, 500);
  }
};
