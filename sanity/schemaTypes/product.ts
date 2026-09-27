import { defineArrayMember, defineField, defineType } from 'sanity';

export const product = defineType({
  name: 'product',
  title: 'Products',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Product name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'brand', title: 'Brand', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: doc => `${doc.brand || ''}-${doc.name || ''}` }, validation: r => r.required() }),
    defineField({ name: 'category', title: 'Category', type: 'string', options: { list: ['Beauty', 'Fashion', 'Food', 'Wellness', 'Lifestyle'] } }),
    defineField({ name: 'summary', title: 'Editorial summary', type: 'text', rows: 4 }),
    defineField({ name: 'image', title: 'Product image', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'verification', title: 'Celebrity relationship', type: 'string', options: { list: ['Verified', 'Likely', 'Unconfirmed', 'None'] }, initialValue: 'None' }),
    defineField({ name: 'celebrity', title: 'Related celebrity', type: 'string' }),
    defineField({ name: 'evidence', title: 'Verification evidence', type: 'text', rows: 3 }),
    defineField({ name: 'koreaPrice', title: 'Korea price', type: 'string' }),
    defineField({ name: 'globalPrice', title: 'Reference global price', type: 'string' }),
    defineField({ name: 'exportCandidate', title: 'Won Global export candidate', type: 'boolean', initialValue: false }),
    defineField({
      name: 'retailers', title: 'Retailers', type: 'array', of: [defineArrayMember({
        type: 'object', fields: [
          defineField({ name: 'retailer', type: 'string', validation: r => r.required() }),
          defineField({ name: 'market', type: 'string' }),
          defineField({ name: 'price', type: 'string' }),
          defineField({ name: 'url', type: 'url', validation: r => r.required() }),
          defineField({ name: 'affiliate', type: 'boolean', initialValue: false })
        ]
      })]
    })
  ],
  preview: { select: { title: 'name', subtitle: 'brand', media: 'image' } }
});
