export function readableDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

export const categorySlugMap: Record<string, string> = {
  'Trending': 'trending',
  'Seen On': 'seen-on',
  'Real Korea': 'real-korea',
  'Shop Korea': 'shop-korea',
  'Living': 'living',
  'Korea Help': 'korea-help'
};

export const slugCategoryMap = Object.fromEntries(Object.entries(categorySlugMap).map(([k,v]) => [v,k]));
