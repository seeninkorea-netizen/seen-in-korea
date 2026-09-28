import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const integrations = [react()];

// The public site works in demo mode without Sanity env vars.
// Once projectId is configured, /admin becomes an embedded Sanity Studio.
if (projectId && projectId !== 'replace_me') {
  integrations.unshift(
    sanity({
      projectId,
      dataset,
      apiVersion: '2026-03-01',
      useCdn: false,
      studioBasePath: '/admin',
      studioRouterHistory: 'hash'
    })
  );
}

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations,
  site: process.env.PUBLIC_SITE_URL || 'https://seen-in-korea.seeninkorea.workers.dev'
});
