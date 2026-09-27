import { defineArrayMember, defineField, defineType } from 'sanity';

export const article = defineType({
  name: 'article',
  title: 'Articles',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Headline', type: 'string', validation: r => r.required().max(120) }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: r => r.required() }),
    defineField({ name: 'dek', title: 'Summary / deck', type: 'text', rows: 3, validation: r => r.required().max(300) }),
    defineField({ name: 'category', title: 'Category', type: 'string', options: { list: [
      'Trending', 'Seen On', 'Real Korea', 'Shop Korea', 'Living', 'Korea Help'
    ]}, validation: r => r.required() }),
    defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string', description: 'Example: K-BEAUTY · U.S. MARKET' }),
    defineField({ name: 'publishedAt', title: 'Publish date', type: 'datetime', validation: r => r.required() }),
    defineField({ name: 'author', title: 'Author / desk', type: 'string', initialValue: 'Seen in Korea Desk' }),
    defineField({
      name: 'draftOrigin',
      title: 'Draft origin',
      type: 'string',
      options: { list: [
        { title: 'AI intake', value: 'ai' },
        { title: 'Manual', value: 'manual' }
      ]},
      readOnly: true,
      hidden: ({document}) => !document?.draftOrigin
    }),
    defineField({
      name: 'draftGeneratedAt',
      title: 'AI draft generated at',
      type: 'datetime',
      readOnly: true,
      hidden: ({document}) => document?.draftOrigin !== 'ai'
    }),
    defineField({
      name: 'draftKey',
      title: 'Automation draft key',
      type: 'string',
      readOnly: true,
      hidden: ({document}) => document?.draftOrigin !== 'ai'
    }),
    defineField({
      name: 'verificationSuggestion',
      title: 'AI verification suggestion',
      type: 'string',
      description: 'Advisory only. An editor must set the actual Verification status below.',
      readOnly: true,
      hidden: ({document}) => document?.draftOrigin !== 'ai'
    }),
    defineField({
      name: 'editorialNotes',
      title: 'Editorial / fact-check notes',
      type: 'text',
      rows: 4,
      description: 'Internal notes. Check sources, wording, image rights and commerce disclosures before publishing.'
    }),
    defineField({
      name: 'homepagePlacement',
      title: 'Homepage placement',
      type: 'string',
      description: 'Choose where this story should appear on the homepage. The site handles the layout automatically.',
      options: { list: [
        { title: "Today’s Cover", value: 'cover' },
        { title: 'Live Desk', value: 'liveDesk' },
        { title: 'From Our Desk', value: 'standard' },
        { title: 'Do not feature on homepage', value: 'none' }
      ], layout: 'radio' },
      initialValue: 'standard',
      validation: r => r.required()
    }),
    defineField({
      name: 'homePriority',
      title: 'Homepage priority',
      type: 'number',
      description: 'Lower numbers appear first. Use 10, 20, 30... so stories can be inserted later.',
      initialValue: 50,
      validation: r => r.integer().min(1).max(999)
    }),
    defineField({
      name: 'homepageUntil',
      title: 'Homepage expiry',
      type: 'datetime',
      description: 'Optional. After this time the story remains published but drops out of homepage feature slots.'
    }),
    defineField({
      name: 'deskLabel',
      title: 'Live Desk label',
      type: 'string',
      description: 'Short desk label such as K-POP, K-DRAMA, K-BEAUTY, K-COMMERCE. Used only for Live Desk.'
    }),
    defineField({
      name: 'deskTimeLabel',
      title: 'Live Desk time label',
      type: 'string',
      description: 'Optional short label such as NOW, 09:20, SEP 27.'
    }),
    defineField({
      name: 'deskNote',
      title: 'Why it matters',
      type: 'text',
      rows: 2,
      description: 'One concise sentence shown below the Live Desk headline.'
    }),
    defineField({ name: 'verification', title: 'Verification status', type: 'string', options: { list: [
      'Verified', 'Likely', 'Unconfirmed', 'Not applicable'
    ]}, initialValue: 'Not applicable' }),
    defineField({ name: 'heroImage', title: 'Hero image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'heroAlt', title: 'Hero image alt text', type: 'string' }),
    defineField({
      name: 'body', title: 'Article body', type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', options: { hotspot: true }, fields: [
          defineField({ name: 'alt', type: 'string', title: 'Alt text' })
        ]})
      ]
    }),
    defineField({
      name: 'sources', title: 'Sources', type: 'array', of: [defineArrayMember({
        type: 'object', fields: [
          defineField({ name: 'label', title: 'Source label', type: 'string', validation: r => r.required() }),
          defineField({ name: 'url', title: 'URL', type: 'url', validation: r => r.required() })
        ]
      })]
    }),
    defineField({
      name: 'commerceLinks', title: 'Commerce / retailer links', type: 'array', of: [defineArrayMember({
        type: 'object', fields: [
          defineField({ name: 'retailer', title: 'Retailer', type: 'string', validation: r => r.required() }),
          defineField({ name: 'market', title: 'Market', type: 'string', description: 'KR / US / SG / Global etc.' }),
          defineField({ name: 'price', title: 'Displayed price', type: 'string' }),
          defineField({ name: 'url', title: 'URL', type: 'url', validation: r => r.required() }),
          defineField({ name: 'affiliate', title: 'Affiliate link', type: 'boolean', initialValue: false })
        ]
      })]
    }),
    defineField({
      name: 'relatedProducts', title: 'Related products', type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'product' }] })]
    })
  ],
  preview: {
    select: { title: 'title', category: 'category', placement: 'homepagePlacement', media: 'heroImage' },
    prepare({ title, category, placement, media }) {
      const placementLabel = placement === 'cover' ? "Today’s Cover" : placement === 'liveDesk' ? 'Live Desk' : placement === 'standard' ? 'From Our Desk' : 'Article';
      return { title, subtitle: `${placementLabel} · ${category || ''}`, media };
    }
  }
});
