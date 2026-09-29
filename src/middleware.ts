import { defineMiddleware } from 'astro:middleware';

const LEGACY_HOST = 'seen-in-korea.seeninkorea.workers.dev';
const CANONICAL_ORIGIN = 'https://seeninkorea.com';
const LEGACY_VERIFICATION_PATH = '/googlea7844e9f5226b382.html';

export const onRequest = defineMiddleware((context, next) => {
  const { url } = context;

  const keepOnLegacyHost =
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/drafts') ||
    url.pathname === LEGACY_VERIFICATION_PATH;

  if (url.hostname === LEGACY_HOST && !keepOnLegacyHost) {
    const target = new URL(url.pathname + url.search, CANONICAL_ORIGIN);
    return context.redirect(target.toString(), 301);
  }

  return next();
});
