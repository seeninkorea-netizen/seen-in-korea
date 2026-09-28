export type Source = { label: string; url: string };
export type CommerceLink = { retailer: string; market?: string; price?: string; url: string; affiliate?: boolean };

export type Article = {
  _id: string;
  title: string;
  slug: string;
  dek: string;
  category: string;
  eyebrow?: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  homepagePlacement?: 'cover' | 'liveDesk' | 'standard' | 'none';
  homePriority?: number;
  homepageUntil?: string;
  deskLabel?: string;
  deskTimeLabel?: string;
  deskNote?: string;
  verification?: string;
  heroImageUrl?: string;
  heroAlt?: string;
  body?: any[];
  sources?: Source[];
  commerceLinks?: CommerceLink[];
};

export type Product = {
  _id: string;
  name: string;
  brand: string;
  slug: string;
  category?: string;
  summary?: string;
  imageUrl?: string;
  verification?: string;
  celebrity?: string;
  evidence?: string;
  koreaPrice?: string;
  globalPrice?: string;
  exportCandidate?: boolean;
  retailers?: CommerceLink[];
};

export type Interview = {
  _id: string;
  displayName?: string;
  country?: string;
  yearsInKorea?: number;
  headline: string;
  slug: string;
  summary?: string;
  quote?: string;
  biggestProblem?: string;
  favoriteProduct?: string;
  favoriteCelebrity?: string;
  photoUrl?: string;
  publishedAt?: string;
};
