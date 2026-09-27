# Deployment checklist — do this once

## Sanity
- [ ] Create project
- [ ] Create `production` dataset
- [ ] Copy project ID into Cloudflare build/runtime environment variables
- [ ] Add CORS origins with credentials
- [ ] Deploy/update schema if needed
- [ ] Confirm `/admin` login works

## Cloudflare
- [ ] Create or connect GitHub repository
- [ ] Deploy Worker
- [ ] Add `PUBLIC_SANITY_PROJECT_ID`
- [ ] Add `PUBLIC_SANITY_DATASET=production`
- [ ] Add `SANITY_STUDIO_PROJECT_ID`
- [ ] Add `SANITY_STUDIO_DATASET=production`
- [ ] Add `PUBLIC_SITE_URL`
- [ ] Connect custom domain after first successful deploy

## Editorial QA before launch
- [ ] Publish 3 initial stories
- [ ] Test source links
- [ ] Test affiliate disclosure rendering
- [ ] Test mobile homepage
- [ ] Test `/admin`
- [ ] Test article slug and sitemap
- [ ] Confirm robots blocks `/admin`


## AI draft intake

- [ ] Create a Sanity write token with the minimum available write access.
- [ ] `npx wrangler secret put SANITY_API_WRITE_TOKEN`
- [ ] Create a long random intake secret.
- [ ] `npx wrangler secret put DRAFT_INGEST_SECRET`
- [ ] Confirm `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` exist in the deployed Worker environment.
- [ ] Open `/api/drafts/article` and verify configured values show `true`.
- [ ] POST `examples/ai-draft.json`.
- [ ] Confirm it appears in `/admin` → **AI Draft Inbox** and does **not** appear on the public site.
- [ ] Review and manually Publish one test story.
