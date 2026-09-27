# SEEN IN KOREA — Platform v1.4

A self-owned media frontend with a real editorial CMS.

## Architecture

- **Astro SSR** — public website
- **Cloudflare Workers** — runtime/hosting
- **Sanity Studio** — `/admin` editorial CMS
- **Sanity Content Lake** — articles, publishable interview stories, products
- **No rebuild is required when an article is published.** The public site fetches published Sanity content on request.

This is intentionally different from the old Netlify/Decap setup, where publishing a post triggered a site rebuild.

## What the admin can manage

### Articles
Headline, summary, category, date, author, feature flag, verification status, hero image, body, sources, retailer/affiliate links and related products.

### Products
Brand, category, pricing, celebrity/product verification, retailers and Won Global export-candidate status.

### Published interviews
Only content approved for publication. **Do not put raw/private interview notes or unapproved personal data into a public Sanity dataset.**

## 1. Run immediately in demo mode

The project includes fallback demo content, so the public site can render before Sanity is connected.

```bash
npm install
npm run dev
```

## 2. Create Sanity

Create a Sanity project and a `production` dataset, then copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill:

```env
PUBLIC_SANITY_PROJECT_ID=YOUR_PROJECT_ID
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://seeninkorea.com
SANITY_STUDIO_PROJECT_ID=YOUR_PROJECT_ID
SANITY_STUDIO_DATASET=production
```

The `SANITY_STUDIO_*` variables are intentionally public Studio configuration values, not secrets.

## 3. Configure CORS

In Sanity project settings → API → CORS origins, add:

- `http://localhost:4321` with credentials
- your deployed `workers.dev` URL with credentials
- `https://seeninkorea.com` with credentials when the domain is connected

Then `/admin` becomes the embedded Sanity Studio.

## 4. Seed the initial three stories (optional)

Create a Sanity Editor write token. Put it only in your local environment as:

```env
SANITY_API_WRITE_TOKEN=...
```

Then:

```bash
npm run seed
```

Delete/unset the token afterward. Never put it in GitHub or a public frontend variable.

## 5. Deploy to Cloudflare Workers

Cloudflare currently recommends Workers as the primary platform for new applications. This project is SSR so content can change in Sanity without a frontend rebuild.

```bash
npm run deploy
```

Wrangler deploys the Astro Worker and static assets. Connect the custom domain in Cloudflare after the first deployment.

## Publishing workflow

1. Open `/admin`.
2. Create article.
3. Complete Sources and Verification when relevant.
4. Publish.
5. Public site reads the published content directly from Sanity.
6. No manual ZIP upload and no article-triggered Cloudflare rebuild.

## Editorial rule

- AI can research, draft and format.
- A person decides what is published.
- Celebrity-product claims require evidence labels.
- Sponsored/affiliate links are disclosed and use `sponsored nofollow` in article commerce blocks.

## Phase 2 — not built yet

Do not add these until traffic/purchase signals exist:

- memberships/comments
- complex payment flows
- automatic news publishing
- private interview research database (use a private service such as Supabase only when needed)
- live price crawling
- direct Shopee inventory sync

## v1.1 visual update
- Homepage is now image-forward instead of mostly typographic.
- `Seen On` uses editorial commerce cards: evidence label → relationship → product → price → product check.
- Demo uses free stock/retail photography only. Do not publish celebrity portraits commercially unless the image is licensed or provided by an authorized press/brand source.


## v1.3 homepage editorial controls
Articles now include CMS fields for **Today’s Cover**, **Live Desk**, **From Our Desk**, homepage priority, expiry, and Live Desk metadata. The homepage reads those fields at request time, so daily editorial placement does not require code changes or redeployment. See `EDITORIAL_WORKFLOW.md`.


## v1.4 — AI Draft Inbox

An authenticated server endpoint can now place externally generated article drafts into Sanity without publishing them. Open `/admin` → **AI Draft Inbox** to review them. The endpoint forces draft-only status, does not feature stories on the homepage, and keeps AI verification suggestions separate from the editor-controlled verification field. See `AI_DRAFT_PIPELINE.md`.
