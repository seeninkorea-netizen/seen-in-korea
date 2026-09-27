# AI Draft Intake Pipeline

## Purpose

This pipeline lets an external research/drafting workflow place an article into **Sanity as a draft only**. It never publishes the article and it never pins it to the homepage.

Flow:

`Research/AI → POST /api/drafts/article → Sanity drafts.* → /admin AI Draft Inbox → human review → Publish`

## Safety rules built into the endpoint

- Requires `x-draft-secret`.
- Uses a server-side Sanity write token only.
- Creates/replaces **drafts.*** documents only.
- Forces `homepagePlacement = none`.
- A `Seen On` draft enters with `verification = Unconfirmed` even if AI suggests otherwise.
- AI's verification opinion is stored separately as `verificationSuggestion`.
- The public site uses the published Sanity perspective, so draft content never appears publicly.

## Cloudflare setup

Set the two server secrets after deploying the Worker:

```bash
npx wrangler secret put SANITY_API_WRITE_TOKEN
npx wrangler secret put DRAFT_INGEST_SECRET
```

`SANITY_API_WRITE_TOKEN` should be a Sanity token with the minimum write access that your project supports. Do not expose it to the browser or put it in Git.

Set these normal non-secret variables in the build environment (`.env.local` locally, and your deployment build environment):

```text
PUBLIC_SANITY_PROJECT_ID=your_project_id
PUBLIC_SANITY_DATASET=production
```

## Test the endpoint

Health check:

```bash
curl https://YOUR_DOMAIN/api/drafts/article
```

It returns booleans indicating whether the write token and intake secret are configured, without exposing either secret.

Create a draft:

```bash
curl -X POST https://YOUR_DOMAIN/api/drafts/article \
  -H 'content-type: application/json' \
  -H 'x-draft-secret: YOUR_PRIVATE_INGEST_SECRET' \
  --data @examples/ai-draft.json
```

Or locally:

```bash
export SEEN_IN_KOREA_DRAFT_ENDPOINT='https://YOUR_DOMAIN/api/drafts/article'
export DRAFT_INGEST_SECRET='YOUR_PRIVATE_INGEST_SECRET'
npm run draft:push -- examples/ai-draft.json
```

## Draft JSON fields

Required:
- `title`
- `dek`

Useful:
- `draftKey`: stable automation key; re-sending the same key updates that draft instead of creating duplicates.
- `category`: Trending, Seen On, Real Korea, Shop Korea, Living, Korea Help.
- `eyebrow`
- `body`: plain text / lightweight Markdown, or a Portable Text array.
- `sources[]`: `{label,url}`
- `commerceLinks[]`: `{retailer,market,price,url,affiliate}`
- `verificationSuggestion`
- `editorialNotes`
- `heroImageSuggestion`: stored as an internal note; image rights still need human review.
- `deskLabel`, `deskTimeLabel`, `deskNote`

## Human review checklist

Before Publish:

1. Open every source and confirm dates, names, numbers and quotations.
2. For celebrity-product content, distinguish campaign/ambassador status from actual personal use.
3. Change `Verification status` only after checking evidence.
4. Upload a licensed/authorized hero image and add alt text.
5. Check affiliate/sponsored disclosures.
6. Choose homepage placement only after the story is ready.
7. Publish manually.

## What this does not do

- It does not scrape the web by itself.
- It does not automatically publish.
- It does not automatically license images.
- It does not create private interview research records.
