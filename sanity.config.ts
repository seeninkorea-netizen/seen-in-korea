import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';

export default defineConfig({
  name: 'seen-in-korea',
  title: 'Seen in Korea — Editorial Studio',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) => S.list()
        .title('Seen in Korea')
        .items([
          S.listItem()
            .title('AI Draft Inbox')
            .child(
              S.documentList()
                .title('AI Draft Inbox')
                .schemaType('article')
                .filter('_type == "article" && _id in path("drafts.**") && draftOrigin == "ai"')
                .defaultOrdering([{ field: 'draftGeneratedAt', direction: 'desc' }])
            ),
          S.divider(),
          ...S.documentTypeListItems()
        ])
    })
  ],
  schema: { types: schemaTypes }
});
