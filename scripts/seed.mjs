import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || projectId === 'replace_me' || !token) {
  console.error('Set PUBLIC_SANITY_PROJECT_ID (or SANITY_STUDIO_PROJECT_ID) and SANITY_API_WRITE_TOKEN first.');
  process.exit(1);
}
const client = createClient({ projectId, dataset, token, apiVersion: '2026-03-01', useCdn: false });
const block = (text, key) => ({ _type: 'block', _key: key, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }] });
const docs = [
  {
    _id: 'article-olive-young-sephora', _type: 'article', title: 'Olive Young Is Now in 500+ Sephora Stores', slug: { _type: 'slug', current: 'olive-young-sephora' },
    dek: 'K-beauty’s U.S. expansion is moving from online discovery to mainstream physical retail. The useful question is which Korean products are actually worth buying, and at what price.', category: 'Shop Korea', eyebrow: 'K-BEAUTY · U.S. MARKET', publishedAt: '2026-09-26T10:00:00+09:00', author: 'Seen in Korea Desk', featured: true, verification: 'Verified',
    body: [block('On August 20, Sephora began selling an Olive Young-curated K-beauty assortment in more than 500 U.S. stores and on Sephora.com.', 'b1'), block('Seen in Korea will track the same products across Korea and overseas retailers, compare price and pack size, and separate retailer promotion from actual consumer demand.', 'b2')],
    sources: [{ _key: 's1', _type: 'object', label: 'Sephora Newsroom — Olive Young-curated K-beauty launch', url: 'https://newsroom.sephora.com/sephora-introduces-olive-young-curated-k-beauty-to-u-s-consumers-beginning-august-20/' }]
  },
  {
    _id: 'article-kbeauty-exports', _type: 'article', title: 'K-Beauty Exports Hit $7B in Six Months', slug: { _type: 'slug', current: 'kbeauty-exports-2026' },
    dek: 'The growth story is real—but the country mix matters. The U.S. is now Korea’s biggest cosmetics export market.', category: 'Trending', eyebrow: 'DATA · K-BEAUTY', publishedAt: '2026-09-26T09:00:00+09:00', author: 'Seen in Korea Data Desk', featured: false, verification: 'Verified',
    body: [block('South Korea exported about $7.0 billion in cosmetics during the first half of 2026, according to the Ministry of Food and Drug Safety.', 'b3')],
    sources: [{ _key: 's2', _type: 'object', label: 'Korea Ministry of Food and Drug Safety — H1 2026 export statistics', url: 'https://mfds.go.kr/brd/m_1256/view.do?seq=59' }]
  },
  {
    _id: 'article-100-voices', _type: 'article', title: 'We’re Asking 100 Foreigners What Korea Is Really Like', slug: { _type: 'slug', current: '100-voices-korea' },
    dek: 'Not what a guidebook says. We want to document what people actually struggle with, buy, love and wish were easier.', category: 'Real Korea', eyebrow: 'REAL KOREA · ORIGINAL RESEARCH', publishedAt: '2026-09-26T08:00:00+09:00', author: '100 Voices: Korea', featured: false, verification: 'Not applicable',
    body: [block('Seen in Korea is starting with a simple target: 100 responses from foreigners who live in Korea, followed by selected interviews.', 'b4'), block('This is an opt-in media research project, not a probability sample of every foreign resident in Korea.', 'b5')]
  }
];
for (const doc of docs) await client.createOrReplace(doc);
console.log(`Seeded ${docs.length} documents.`);
