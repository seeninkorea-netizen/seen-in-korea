
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';
import AiDraftBulkManager from './sanity/components/AiDraftBulkManager';

export default defineConfig({
  name: 'seen-in-korea',
  title: 'Seen in Korea — Editorial Studio',

  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Seen in Korea')
          .items([
            S.listItem()
              .title('AI Draft Inbox')
              .child(
                S.documentList()
                  .title('AI Draft Inbox')
                  .schemaType('article')
                  .apiVersion('2026-09-01')
                  .filter(
                    '_type == "article" && draftOrigin == "ai" && _originalId match "drafts.*"'
                  )
                  .defaultOrdering([
                    {
                      field: 'draftGeneratedAt',
                      direction: 'desc'
                    }
                  ])
              ),

            S.listItem()
              .title('AI Draft Bulk Manager')
              .child(
                S.component(AiDraftBulkManager)
                  .id('ai-draft-bulk-manager')
                  .title('AI Draft Bulk Manager')
              ),

            S.divider(),

            ...S.documentTypeListItems()
          ])
    })
  ],

  schema: {
    types: schemaTypes
  }
});
