
import React, { useCallback, useEffect, useState } from 'react';
import { useClient } from 'sanity';

type DraftItem = {
  _id: string;
  _type: string;
  title?: string;
  category?: string;
  draftKey?: string;
  draftGeneratedAt?: string;
};

export default function AiDraftBulkManager() {
  const client = useClient({
    apiVersion: '2026-09-01'
  }).withConfig({
    perspective: 'raw',
    useCdn: false
  });

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [protectedIds, setProtectedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [message, setMessage] = useState('');

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setSelected([]);
    setBackedUp(false);

    try {
      const rows = await client.fetch<DraftItem[]>(`
        *[
          _type == "article" &&
          draftOrigin == "ai" &&
          _id in path("drafts.**")
        ] | order(draftGeneratedAt desc) {
          _id,
          _type,
          title,
          category,
          draftKey,
          draftGeneratedAt
        }
      `);

      const publishedIds = rows.map(row =>
        row._id.replace(/^drafts\./, '')
      );

      const existingPublished = publishedIds.length
        ? await client.fetch<string[]>(
            `*[_id in $ids]._id`,
            { ids: publishedIds }
          )
        : [];

      const protectedSet = new Set(existingPublished);

      setDrafts(rows);
      setProtectedIds(
        rows
          .filter(row =>
            protectedSet.has(row._id.replace(/^drafts\./, ''))
          )
          .map(row => row._id)
      );
    } catch (error) {
      console.error(error);
      setMessage('Failed to load AI drafts. Check permissions.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const protectedSet = new Set(protectedIds);

  const selectable = drafts.filter(
    row => !protectedSet.has(row._id)
  );

  const selectedSet = new Set(selected);

  const allSelected =
    selectable.length > 0 &&
    selectable.every(row => selectedSet.has(row._id));

  function toggleOne(id: string) {
    setBackedUp(false);
    setSelected(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    setBackedUp(false);
    setSelected(
      allSelected ? [] : selectable.map(row => row._id)
    );
  }

  async function backup() {
    if (!selected.length || working) return;

    setWorking(true);
    setMessage('');

    try {
      const documents = await client.fetch<any[]>(
        `*[_id in $ids]`,
        { ids: selected }
      );

      if (documents.length !== selected.length) {
        throw new Error(
          'Document count changed. Refresh before backing up.'
        );
      }

      const data = {
        source: 'Seen in Korea AI Draft Inbox',
        exportedAt: new Date().toISOString(),
        count: documents.length,
        documents
      };

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json;charset=utf-8' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        'SIK_AI_Drafts_Backup_' +
        new Date().toISOString().slice(0, 10) +
        '.json';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackedUp(true);
      setMessage(
        'Backup download requested. Confirm it is saved before deleting.'
      );
    } catch (error) {
      console.error(error);
      setBackedUp(false);
      setMessage('Backup failed. Nothing was deleted.');
    } finally {
      setWorking(false);
    }
  }

  async function removeSelected() {
    if (!selected.length || !backedUp || working) return;

    const count = selected.length;

    const answer = window.prompt(
      `Permanently delete ${count} selected AI drafts?\n` +
      'Confirm your backup file is saved.\n' +
      `Type DELETE ${count} to confirm.`
    );

    if (answer !== `DELETE ${count}`) {
      setMessage('Deletion cancelled.');
      return;
    }

    setWorking(true);
    setMessage('');

    let deleted = 0;

    try {
      // Check again immediately before deletion.
      const latest = await client.fetch<any[]>(
        `*[_id in $ids]{
          _id,
          _type,
          draftOrigin
        }`,
        { ids: selected }
      );

      if (
        latest.length !== count ||
        latest.some(
          row =>
            row._type !== 'article' ||
            row.draftOrigin !== 'ai' ||
            !row._id.startsWith('drafts.')
        )
      ) {
        throw new Error(
          'Drafts changed. Refresh and review the selection.'
        );
      }

      const counterparts = selected.map(id =>
        id.replace(/^drafts\./, '')
      );

      const published = await client.fetch<string[]>(
        `*[_id in $ids]._id`,
        { ids: counterparts }
      );

      if (published.length > 0) {
        throw new Error(
          'Some drafts now have published counterparts. Deletion stopped.'
        );
      }

      for (const id of selected) {
        await client.delete(id);
        deleted++;
      }

      setMessage(
        `${deleted} AI drafts deleted. Published articles were not deleted.`
      );
    } catch (error) {
      console.error(error);
      setMessage(
        `Deleted ${deleted} of ${count}. ` +
        'Operation stopped. Check the list before retrying.'
      );
    } finally {
      setWorking(false);

      // Reload without a page refresh.
      await loadDrafts();
    }
  }

  const buttonStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #bbb',
    cursor: 'pointer',
    marginRight: 8,
    marginBottom: 8
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 1100,
      margin: '0 auto',
      color: 'inherit'
    }}>
      <h1>AI Draft Bulk Manager</h1>

      <p>
        Manage unpublished AI article drafts.
        Published documents and drafts with published
        counterparts are protected.
      </p>

      <div style={{ margin: '20px 0' }}>
        <strong>Total AI drafts: {drafts.length}</strong>
        {' | '}
        Selectable: {selectable.length}
        {' | '}
        Protected: {protectedIds.length}
        {' | '}
        Selected: {selected.length}
      </div>

      <div>
        <button
          style={buttonStyle}
          disabled={working || loading}
          onClick={() => void loadDrafts()}
        >
          Refresh
        </button>

        <button
          style={buttonStyle}
          disabled={
            working || loading || selectable.length === 0
          }
          onClick={toggleAll}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        <button
          style={buttonStyle}
          disabled={working || selected.length === 0}
          onClick={() => void backup()}
        >
          Download Selected Backup (JSON)
        </button>

        <button
          style={{
            ...buttonStyle,
            background: '#a32626',
            color: '#fff',
            borderColor: '#a32626'
          }}
          disabled={
            working ||
            selected.length === 0 ||
            !backedUp
          }
          onClick={() => void removeSelected()}
        >
          Delete Selected ({selected.length})
        </button>
      </div>

      {message && (
        <p role="status" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}

      {working && <p>Processing...</p>}
      {loading && <p>Loading drafts...</p>}

      {!loading && drafts.length === 0 && (
        <p>No AI drafts found.</p>
      )}

      {!loading && drafts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {drafts.map(row => {
            const isProtected =
              protectedSet.has(row._id);

            return (
              <label
                key={row._id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 14,
                  borderBottom: '1px solid #aaa5',
                  opacity: isProtected ? 0.6 : 1
                }}
              >
                <input
                  type="checkbox"
                  disabled={working || isProtected}
                  checked={selectedSet.has(row._id)}
                  onChange={() => toggleOne(row._id)}
                />

                <span>
                  <strong>
                    {row.title || 'Untitled article'}
                  </strong>

                  <div style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 5
                  }}>
                    {row.category || 'Uncategorized'}
                    {' · '}
                    {row.draftGeneratedAt || 'No date'}
                    {isProtected &&
                      ' · Protected: published counterpart exists'}
                  </div>

                  <div style={{
                    fontSize: 11,
                    opacity: 0.55,
                    overflowWrap: 'anywhere',
                    marginTop: 4
                  }}>
                    {row._id}
                  </div>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <p style={{
        marginTop: 28,
        fontSize: 12,
        opacity: 0.7
      }}>
        Safety: only AI-origin article drafts can be deleted.
        A JSON backup is required before deletion.
        This action does not publish or delete live articles.
      </p>
    </div>
  );
}
