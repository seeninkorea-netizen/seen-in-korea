import { defineField, defineType } from 'sanity';

export const interview = defineType({
  name: 'interview',
  title: 'Published Interview Stories',
  type: 'document',
  description: 'Store only material that the participant has agreed may be published. Keep raw/private interview data outside the public content dataset.',
  fields: [
    defineField({ name: 'displayName', title: 'Display name', type: 'string', description: 'Use first name, pseudonym or Anonymous.' }),
    defineField({ name: 'country', title: 'Country', type: 'string' }),
    defineField({ name: 'yearsInKorea', title: 'Years in Korea', type: 'number' }),
    defineField({ name: 'headline', title: 'Story headline', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'headline' }, validation: r => r.required() }),
    defineField({ name: 'summary', title: 'Summary', type: 'text', rows: 3 }),
    defineField({ name: 'quote', title: 'Pull quote', type: 'text', rows: 4 }),
    defineField({ name: 'biggestProblem', title: 'Biggest Korea-life friction', type: 'string' }),
    defineField({ name: 'favoriteProduct', title: 'Favorite Korean product', type: 'string' }),
    defineField({ name: 'favoriteCelebrity', title: 'Favorite Korean celebrity', type: 'string' }),
    defineField({ name: 'photo', title: 'Approved photo', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'publishedAt', title: 'Publish date', type: 'datetime' }),
    defineField({ name: 'quoteConsent', title: 'Quote publication consent confirmed', type: 'boolean', initialValue: false, validation: r => r.required().custom(v => v ? true : 'Confirm quote consent before publishing.') }),
    defineField({ name: 'photoConsent', title: 'Photo publication consent confirmed', type: 'boolean', initialValue: false })
  ]
});
