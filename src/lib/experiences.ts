
import { env } from 'cloudflare:workers';

// D1, no cloudflare-specific compile-time type required.
export type Database = {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all<T = any>(): Promise<{ results: T[] }>;
      first<T = any>(): Promise<T | null>;
      run(): Promise<{ meta: { changes?: number } }>;
    };
    all<T = any>(): Promise<{ results: T[] }>;
    first<T = any>(): Promise<T | null>;
    run(): Promise<{ meta: { changes?: number } }>;
  };
};

export function database(): Database | null {
  try {
    return (
      (env as unknown as { SIK_DB?: Database }).SIK_DB || null
    );
  } catch {
    return null;
  }
}

export function currentAdminSecret(): string {
  try {
    return String(
      (env as unknown as { SIK_ADMIN_SECRET?: string })
        .SIK_ADMIN_SECRET || ''
    );
  } catch {
    return '';
  }
}

export const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-content-type-options': 'nosniff'
    }
  });

export function errorMessage(error: unknown): string {
  const e = String(
    error instanceof Error ? error.message : error
  );

  if (/unique constraint/i.test(e)) {
    return 'An application with this email already exists for this campaign.';
  }

  return 'The request could not be processed. Please try again later.';
}

export const field = (
  o: Record<string, unknown>,
  name: string,
  max = 200
) => {
  const v = o[name];

  return typeof v === 'string'
    ? v.trim().slice(0, max)
    : '';
};

export const validEmail = (s: string) =>
  s.length <= 180 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function validSocialUrl(s: string) {
  try {
    const u = new URL(s);

    return (
      u.protocol === 'https:' &&
      /(^|\.)(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)$/
        .test(u.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export async function jsonInput(
  request: Request
): Promise<Record<string, unknown> | null> {
  if (
    !request.headers.get('content-type')
      ?.toLowerCase()
      .includes('application/json')
  ) {
    return null;
  }

  const size = request.headers.get('content-length');

  if (size && Number(size) > 16000) return null;

  const body = await request.text();

  if (body.length > 16000) return null;

  try {
    const value = JSON.parse(body);

    return value &&
      typeof value === 'object' &&
      !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');

  return (
    !!origin &&
    origin === new URL(request.url).origin
  );
}

export const id = () => crypto.randomUUID();

export async function adminAllowed(
  request: Request
): Promise<boolean> {
  const secret = currentAdminSecret();

  if (secret.length < 32) return false;

  const token =
    request.headers.get('authorization')
      ?.replace(/^Bearer\s+/i, '') || '';

  if (!token || token.length > 512) return false;

  const encode = new TextEncoder();

  const [a, b] = await Promise.all([
    crypto.subtle.digest(
      'SHA-256',
      encode.encode(token)
    ),
    crypto.subtle.digest(
      'SHA-256',
      encode.encode(secret)
    )
  ]);

  const x = new Uint8Array(a);
  const y = new Uint8Array(b);

  let mismatches = 0;

  for (let i = 0; i < x.length; i++) {
    mismatches |= x[i] ^ y[i];
  }

  return mismatches === 0;
}

// Public campaign data, including its representative image.
export type PublicCampaign = {
  id: string;
  business_name: string;
  category: string;
  slots: number;
  title_en: string;
  description_en: string;
  location_en: string;
  offer_en: string;
  deliverables_en: string;
  published_at: string;
  image_url: string;
  selected_count: number;
};

// Only published campaigns can appear on public pages.
const publicSelect = `
  SELECT
    c.id,
    c.business_name,
    c.category,
    c.slots,
    c.title_en,
    c.description_en,
    c.location_en,
    c.offer_en,
    c.deliverables_en,
    c.published_at,
    COALESCE(c.image_url, '') AS image_url,
    (
      SELECT COUNT(*)
      FROM sik_campaign_applications a
      WHERE a.campaign_id = c.id
        AND a.status = 'selected'
    ) AS selected_count
  FROM sik_campaigns c
  WHERE c.status = 'published'
`;

export async function publicCampaigns(
  db: Database
): Promise<PublicCampaign[]> {
  const q = await db.prepare(
    publicSelect +
    ' ORDER BY c.published_at DESC LIMIT 100'
  ).all<PublicCampaign>();

  return q.results || [];
}

export async function publicCampaign(
  db: Database,
  campaignId: string
): Promise<PublicCampaign | null> {
  return db.prepare(
    publicSelect + ' AND c.id=? LIMIT 1'
  )
    .bind(campaignId)
    .first<PublicCampaign>();
}
