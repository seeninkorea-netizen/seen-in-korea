# Architecture

```text
YOU / EDITOR
    │
    ▼
seeninkorea.com/admin
Sanity Studio
    │  publish article / product / approved interview story
    ▼
Sanity Content Lake
    │
    │ live API read (no article-triggered rebuild)
    ▼
Astro SSR on Cloudflare Workers
    │
    ├─ Home
    ├─ Article pages
    ├─ Category pages
    ├─ Real Korea
    ├─ Shop Korea
    └─ Korea Help
```

## Why this v1

- Publishing content does not require uploading a ZIP.
- Publishing content does not require a frontend rebuild.
- The frontend remains fully custom and owned by Won Global.
- Sanity is replaceable later because content is accessed through an API layer (`src/lib/content.ts`).
- Raw/private interview research is deliberately kept out of the public media CMS.


## AI Draft Inbox (v1.4)

External research/drafting automation may submit article drafts through the authenticated `/api/drafts/article` endpoint. These are stored as Sanity `drafts.*` documents and appear in `/admin` under **AI Draft Inbox**. The intake endpoint cannot publish and forces homepage placement to `none`. Human review remains the publication gate.
