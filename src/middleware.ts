import { defineMiddleware } from 'astro:middleware';

const LEGACY_HOST = 'seen-in-korea.seeninkorea.workers.dev';
const CANONICAL_ORIGIN = 'https://seeninkorea.com';
const LEGACY_VERIFICATION_PATH = '/googlea7844e9f5226b382.html';

const OLD_JAPAN_ARTICLE =
  '/articles/apanese-tourists-are-taking-bullet-trips-to-seoul-3-5-day-stays-71-2-revisit-rate';

const NEW_JAPAN_ARTICLE =
  '/articles/japanese-tourists-are-taking-bullet-trips-to-seoul-3-5-day-stays-71-2-revisit-rate';

export const onRequest = defineMiddleware((context, next) => {
  const { url } = context;

  if (url.pathname === OLD_JAPAN_ARTICLE) {
    const target = new URL(
      NEW_JAPAN_ARTICLE + url.search,
      CANONICAL_ORIGIN
    );

    return context.redirect(target.toString(), 301);
  }

  const keepOnLegacyHost =
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/drafts') ||
    url.pathname === LEGACY_VERIFICATION_PATH;

  if (url.hostname === LEGACY_HOST && !keepOnLegacyHost) {
    const target = new URL(
      url.pathname + url.search,
      CANONICAL_ORIGIN
    );

    return context.redirect(target.toString(), 301);
  }

  return next();
});
