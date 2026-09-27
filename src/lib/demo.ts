import type { Article, Interview, Product } from './types';

const blocks = (paragraphs: string[]) => paragraphs.map((text, i) => ({
  _key: `demo-${i}`,
  _type: 'block',
  style: i === 0 ? 'normal' : 'normal',
  markDefs: [],
  children: [{ _key: `span-${i}`, _type: 'span', marks: [], text }]
}));

export const demoArticles: Article[] = [
  {
    _id: 'demo-olive-young',
    title: 'Olive Young Is Now in 500+ Sephora Stores',
    slug: 'olive-young-sephora',
    dek: 'K-beauty’s U.S. expansion is moving from online discovery to mainstream physical retail. The useful question is which Korean products are actually worth buying, and at what price.',
    category: 'Shop Korea', eyebrow: 'K-BEAUTY · U.S. MARKET', publishedAt: '2026-09-26T10:00:00+09:00', author: 'Seen in Korea Desk', homepagePlacement: 'cover', homePriority: 10, verification: 'Verified',
    heroImageUrl: 'https://www.ciee.org/sites/default/files/styles/686w/public/blog/2023-11/IMG_4909.jpg?itok=xUcvhOBj', heroAlt: 'K-beauty products on retail shelves',
    body: blocks([
      'On August 20, Sephora began selling an Olive Young-curated K-beauty assortment in more than 500 U.S. stores and on Sephora.com.',
      'Seen in Korea will track the same products across Korea and overseas retailers, compare price and pack size, and separate retailer promotion from actual consumer demand.'
    ]),
    sources: [{ label: 'Sephora Newsroom — Olive Young-curated K-beauty launch', url: 'https://newsroom.sephora.com/sephora-introduces-olive-young-curated-k-beauty-to-u-s-consumers-beginning-august-20/' }]
  },
  {
    _id: 'demo-exports', title: 'K-Beauty Exports Hit $7B in Six Months', slug: 'kbeauty-exports-2026',
    dek: 'The growth story is real—but the country mix matters. The U.S. is now Korea’s biggest cosmetics export market.', category: 'Trending', eyebrow: 'DATA · K-BEAUTY', publishedAt: '2026-09-26T09:00:00+09:00', author: 'Seen in Korea Data Desk', homepagePlacement: 'liveDesk', homePriority: 10, deskLabel: 'K-BEAUTY', deskTimeLabel: 'NOW', deskNote: 'Export growth is a useful demand signal, but product-level conversion still needs to be tested.', verification: 'Verified',
    heroImageUrl: 'https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg?auto=compress&dpr=1&h=750&w=1260', heroAlt: 'Skincare bottles',
    body: blocks(['South Korea exported about $7.0 billion in cosmetics during the first half of 2026, according to the Ministry of Food and Drug Safety.', 'For Won Global, export growth is not a reason to stock random products. It is a reason to test demand with content and affiliate clicks before inventory.']),
    sources: [{ label: 'Korea Ministry of Food and Drug Safety — H1 2026 export statistics', url: 'https://mfds.go.kr/brd/m_1256/view.do?seq=59' }]
  },
  {
    _id: 'demo-voices', title: 'We’re Asking 100 Foreigners What Korea Is Really Like', slug: '100-voices-korea',
    dek: 'Not what a guidebook says. We want to document what people actually struggle with, buy, love and wish were easier.', category: 'Real Korea', eyebrow: 'REAL KOREA · ORIGINAL RESEARCH', publishedAt: '2026-09-26T08:00:00+09:00', author: '100 Voices: Korea', homepagePlacement: 'standard', homePriority: 20, verification: 'Not applicable',
    heroImageUrl: 'https://images.unsplash.com/photo-1773304189332-805b1f4eaf41?auto=format&fit=crop&fm=jpg&q=70&w=1600', heroAlt: 'A busy Seoul street at night',
    body: blocks(['Seen in Korea is starting with a simple target: 100 responses from foreigners who live in Korea, followed by selected interviews.', 'The dataset will be reported as an opt-in media research project, not as a representative probability sample of every foreign resident in Korea.'])
  }
];

export const demoProducts: Product[] = [
  { _id: 'p1', name: 'JuicePop Box Lip Tint', brand: 'LANEIGE × KATSEYE', slug: 'laneige-katseye-juicepop', category: 'Beauty', summary: 'Official 2026 global campaign. We label this as an official campaign—not proof of private everyday use.', verification: 'Verified campaign', globalPrice: '$23', celebrity: 'KATSEYE', evidence: 'Official LANEIGE campaign', imageUrl: 'https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg?auto=compress&dpr=1&h=750&w=1260', exportCandidate: false },
  { _id: 'p2', name: 'PDRN Collagen Glow Facial Serum Spray', brand: 'ANUA × Kendall Jenner', slug: 'anua-kendall-pdrn-spray', category: 'Beauty', summary: 'Official global ambassador campaign centered on this product. The commercial relationship is explicit.', verification: 'Verified campaign', globalPrice: '$29', celebrity: 'Kendall Jenner', evidence: 'Official ANUA campaign', imageUrl: 'https://www.ciee.org/sites/default/files/styles/686w/public/blog/2023-11/IMG_4909.jpg?itok=xUcvhOBj', exportCandidate: true },
  { _id: 'p3', name: 'Foreigners’ Repeat Buys', brand: '100 Voices', slug: 'foreigners-repeat-buys', category: 'Lifestyle', summary: 'Products that repeatedly appear in interviews become affiliate-test candidates first.', imageUrl: 'https://images.unsplash.com/photo-1773304189332-805b1f4eaf41?auto=format&fit=crop&fm=jpg&q=70&w=1600', exportCandidate: true }
];

export const demoInterviews: Interview[] = [
  { _id: 'i1', displayName: '100 Voices', country: 'Multiple', headline: 'What is still unnecessarily difficult in Korea?', slug: 'what-is-hard-in-korea', quote: 'What is still unnecessarily difficult in Korea?', biggestProblem: 'Korea-life friction' },
  { _id: 'i2', displayName: '100 Voices', country: 'Multiple', headline: 'What Korean product do you buy again and again?', slug: 'repeat-buy-korean-products', quote: 'What Korean product do you buy again and again?', favoriteProduct: 'Research in progress' },
  { _id: 'i3', displayName: '100 Voices', country: 'Multiple', headline: 'What do you wish you could buy easily back home?', slug: 'products-to-take-home', quote: 'What do you wish you could buy easily back home?' }
];
