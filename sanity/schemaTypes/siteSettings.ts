import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Site title', type: 'string', initialValue: 'SEEN IN KOREA' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', initialValue: "What’s trending. What people actually buy. What life in Korea is really like." }),
    defineField({
      name: 'footerCopy',
      title: 'Footer text',
      type: 'text',
      rows: 3,
      description: 'Text shown at the very bottom of every public page. Leave it blank to hide the sentence.',
      initialValue: 'K-culture, real-life Korea and product discovery — built as a media → data → commerce → export system.'
    }),
    defineField({ name: 'contactEmail', title: 'Contact email', type: 'string' }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
    defineField({ name: 'tiktok', title: 'TikTok URL', type: 'url' }),
    defineField({ name: 'x', title: 'X URL', type: 'url' })
  ]
});
