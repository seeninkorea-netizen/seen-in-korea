# SEEN IN KOREA — Homepage Editorial Workflow

The homepage is now controlled from each Article document in Sanity Studio. No code edits are needed for daily publishing.

## Homepage placement

### Today’s Cover
Use for the single strongest story of the moment. If more than one article is marked as Cover, the article with the lowest **Homepage priority** wins; ties are broken by newest publish date.

### Live Desk
Use for fast-moving stories worth watching now. Up to six are displayed. Fill in:
- Live Desk label: e.g. K-POP / K-DRAMA / K-BEAUTY / K-COMMERCE
- Live Desk time label: e.g. NOW / 09:20 / SEP 27
- Why it matters: one sentence, not a second headline

### From Our Desk
Use for normal homepage feature stories that should appear below Live Desk.

### Do not feature on homepage
The article stays published and indexable but does not occupy a homepage editorial slot.

## Priority convention
Use 10, 20, 30, 40... Lower numbers appear first. Leave gaps so a new story can be inserted later without renumbering everything.

## Homepage expiry
Use this for time-sensitive Live Desk or Cover stories. After the expiry time the article remains live at its URL but automatically drops out of homepage feature slots.

Recommended defaults:
- Breaking/trend story: 24–72 hours
- Product campaign/news: 3–7 days
- Original interview/data feature: no expiry or 7–14 days

## Daily operating rule
1. Create article in Sanity Studio.
2. Add sources and verification status.
3. Choose Homepage placement.
4. Set priority and optional expiry.
5. For Live Desk, add desk label/time/note.
6. Publish.
7. Homepage updates from CMS data automatically; no manual HTML edit is required.

## Editorial discipline
- Keep only one intentional Cover whenever possible.
- Keep Live Desk to 3–6 items.
- Do not use Live Desk for evergreen explainers.
- Celebrity/product claims must retain their evidence and verification label regardless of homepage position.


## AI Draft Inbox (v1.4)

External research/drafting automation may submit article drafts through the authenticated `/api/drafts/article` endpoint. These are stored as Sanity `drafts.*` documents and appear in `/admin` under **AI Draft Inbox**. The intake endpoint cannot publish and forces homepage placement to `none`. Human review remains the publication gate.
