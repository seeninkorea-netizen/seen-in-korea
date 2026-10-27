
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { useClient } from 'sanity';

type DraftItem = {
  _id: string;
  _type: string;
  title?: string;
  category?: string;
  draftKey?: string;
  draftGeneratedAt?: string;
};

const API_VERSION = '2026-09-01';

const DRAFT_QUERY = `
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
`;

const buttonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 6,
  border: '1px solid #bbb',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  marginRight: 8,
  marginBottom: 8
};

export default function AiDraftBulkManager() {
  // Use the Studio client without recreating a configured
  // client on every React render.
  const client = useClient({
    apiVersion: API_VERSION
  });

  const clientRef = useRef(client);
  clientRef.current = client;

  const loadingRef = useRef(false);
  const operationRef = useRef(false);

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [protectedIds, setProtectedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadDrafts = useCallback(async () => {
    // Prevent overlapping fetch requests.
    if (loadingRef.current || operationRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setErrorMessage('');
    setMessage('');

    try {
      const activeClient = clientRef.current;

      const rows = await activeClient.fetch<DraftItem[]>(
        DRAFT_QUERY,
        {},
        { perspective: 'raw' }
      );

      const publishedIds = rows.map(row =>
        row._id.replace(/^drafts\./, '')
      );

      const existingPublished = publishedIds.length
        ? await activeClient.fetch<string[]>(
            `*[_id in $ids]._id`,
            { ids: publishedIds },
            { perspective: 'raw' }
          )
        : [];

      const publishedSet = new Set(existingPublished);

      const protectedDraftIds = rows
        .filter(row =>
          publishedSet.has(
            row._id.replace(/^drafts\./, '')
          )
        )
        .map(row => row._id);

      setDrafts(rows);
      setProtectedIds(protectedDraftIds);

      // Reset selection whenever the list is refreshed.
      setSelected([]);
      setBackedUp(false);

      setMessage(
        `Loaded ${rows.length} AI drafts successfully.`
      );
    } catch (error) {
      console.error('AI Draft load error:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load AI drafts.'
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Exactly one initial load per component mount.
  // No dependency on a recreated Sanity client.
  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const protectedSet = new Set(protectedIds);
  const selectedSet = new Set(selected);

  const selectable = drafts.filter(
    row => !protectedSet.has(row._id)
  );

  const allSelected =
    selectable.length > 0 &&
    selectable.every(row => selectedSet.has(row._id));

  function toggleOne(id: string) {
    if (working || loading || protectedSet.has(id)) {
      return;
    }

    setBackedUp(false);

    setSelected(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    if (working || loading) return;

    setBackedUp(false);

    setSelected(
      allSelected
        ? []
        : selectable.map(row => row._id)
    );
  }

  async function backup() {
    if (
      selected.length === 0 ||
      working ||
      loading ||
      operationRef.current
    ) {
      return;
    }

    operationRef.current = true;
    setWorking(true);
    setBackedUp(false);
    setErrorMessage('');
    setMessage('');

    try {
      const documents = await clientRef.current.fetch<any[]>(
        `*[_id in $ids]`,
        { ids: selected },
        { perspective: 'raw' }
      );

      if (documents.length !== selected.length) {
        throw new Error(
          'Document count changed. Refresh the list.'
        );
      }

      if (
        documents.some(doc =>
          doc._type !== 'article' ||
          doc.draftOrigin !== 'ai' ||
          !doc._id.startsWith('drafts.')
        )
      ) {
        throw new Error(
          'Invalid document in backup selection.'
        );
      }

      const data = {
        source: 'Seen in Korea AI Draft Inbox',
        exportedAt: new Date().toISOString(),
        count: documents.length,
        documentIds: selected,
        documents
      };

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {
          type: 'application/json;charset=utf-8'
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        'SIK_AI_Drafts_Backup_' +
        new Date().toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19) +
        '.json';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setBackedUp(true);

      setMessage(
        `Backup download requested for ${documents.length} drafts. ` +
        'Verify the downloaded JSON file before deleting.'
      );
    } catch (error) {
      console.error('Backup error:', error);

      setBackedUp(false);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Backup failed.'
      );
    } finally {
      operationRef.current = false;
      setWorking(false);
    }
  }

  async function removeSelected() {
    if (
      selected.length === 0 ||
      !backedUp ||
      working ||
      loading ||
      operationRef.current
    ) {
      return;
    }

    const idsToDelete = [...selected];
    const count = idsToDelete.length;

    const confirmation = window.prompt(
      `Permanently delete ${count} AI drafts?\n\n` +
      'Make sure your JSON backup is saved.\n' +
      'This action cannot be undone from this screen.\n\n' +
      `Type DELETE ${count} to confirm.`
    );

    if (confirmation !== `DELETE ${count}`) {
      setMessage('Deletion cancelled.');
      return;
    }

    operationRef.current = true;
    setWorking(true);
    setErrorMessage('');
    setMessage('');

    let deleted = 0;

    try {
      const activeClient = clientRef.current;

      // Revalidate the selected documents.
      const latest = await activeClient.fetch<any[]>(
        `*[_id in $ids] {
          _id,
          _type,
          draftOrigin
        }`,
        { ids: idsToDelete },
        { perspective: 'raw' }
      );

      if (latest.length !== count) {
        throw new Error(
          'Document count changed. Deletion stopped.'
        );
      }

      const invalid = latest.some(row =>
        row._type !== 'article' ||
        row.draftOrigin !== 'ai' ||
        !row._id.startsWith('drafts.')
      );

      if (invalid) {
        throw new Error(
          'Selection contains a non-AI document.'
        );
      }

      const counterpartIds = idsToDelete.map(
        id => id.replace(/^drafts\./, '')
      );

      // Never delete drafts attached to published articles.
      const published = await activeClient.fetch<string[]>(
        `*[_id in $ids]._id`,
        { ids: counterpartIds },
        { perspective: 'raw' }
      );

      if (published.length > 0) {
        throw new Error(
          'Published counterparts detected. ' +
          'Deletion stopped to protect live articles.'
        );
      }

      for (const id of idsToDelete) {
        await activeClient.delete(id);
        deleted++;
      }

      setMessage(
        `${deleted} AI drafts deleted successfully.`
      );

      setSelected([]);
      setBackedUp(false);

      // Refresh only after the delete operation completes.
      operationRef.current = false;
      await loadDrafts();
    } catch (error) {
      console.error('Delete error:', error);

      setErrorMessage(
        `Deleted ${deleted} of ${count}. ` +
        (
          error instanceof Error
            ? error.message
            : 'Deletion stopped.'
        )
      );

      setBackedUp(false);
    } finally {
      operationRef.current = false;
      setWorking(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: '0 auto',
        color: 'inherit'
      }}
    >
      <h1>AI Draft Bulk Manager</h1>

      <p>
        Select, back up and delete unpublished
        AI-generated article drafts.
        Published articles are protected.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          margin: '20px 0',
          fontSize: 14
        }}
      >
        <strong>Total AI drafts: {drafts.length}</strong>

        <span>Selectable: {selectable.length}</span>

        <span>Protected: {protectedIds.length}</span>

        <strong>Selected: {selected.length}</strong>
      </div>

      <div style={{ marginBottom: 14 }}>
        <button
          style={buttonStyle}
          disabled={loading || working}
          onClick={() => void loadDrafts()}
        >
          Refresh
        </button>

        <button
          style={buttonStyle}
          disabled={
            loading ||
            working ||
            selectable.length === 0
          }
          onClick={toggleAll}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        <button
          style={buttonStyle}
          disabled={
            loading ||
            working ||
            selected.length === 0
          }
          onClick={() => void backup()}
        >
          Download Selected Backup (JSON)
        </button>

        <button
          style={{
            ...buttonStyle,
            background: '#a32626',
            borderColor: '#a32626',
            color: '#fff'
          }}
          disabled={
            loading ||
            working ||
            selected.length === 0 ||
            !backedUp
          }
          onClick={() => void removeSelected()}
        >
          Delete Selected ({selected.length})
        </button>
      </div>

      {loading && (
        <p>Loading AI drafts...</p>
      )}

      {working && (
        <p>Processing. Do not close this page.</p>
      )}

      {message && (
        <p
          role="status"
          style={{
            padding: 10,
            borderLeft: '3px solid #27865d'
          }}
        >
          {message}
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          style={{
            padding: 10,
            borderLeft: '3px solid #dc2626',
            color: '#dc2626'
          }}
        >
          {errorMessage}
        </p>
      )}

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
                  opacity: isProtected ? 0.55 : 1
                }}
              >
                <input
                  type="checkbox"
                  disabled={
                    working ||
                    loading ||
                    isProtected
                  }
                  checked={selectedSet.has(row._id)}
                  onChange={() => toggleOne(row._id)}
                />

                <span>
                  <strong>
                    {row.title || 'Untitled article'}
                  </strong>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 5
                    }}
                  >
                    {row.category || 'Uncategorized'}

                    {' · '}

                    {row.draftGeneratedAt || 'No date'}

                    {isProtected &&
                      ' · Protected: published counterpart'}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.55,
                      overflowWrap: 'anywhere',
                      marginTop: 4
                    }}
                  >
                    {row._id}
                  </div>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <p
        style={{
          marginTop: 28,
          fontSize: 12,
          opacity: 0.7
        }}
      >
        Only unpublished AI article drafts can be deleted.
        Download and verify a JSON backup before deletion.
        Live articles are not deleted or published here.
      </p>
    </div>
  );
}
