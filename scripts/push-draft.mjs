import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/push-draft.mjs examples/ai-draft.json');
  process.exit(1);
}

const endpoint = process.env.SEEN_IN_KOREA_DRAFT_ENDPOINT;
const secret = process.env.DRAFT_INGEST_SECRET;
if (!endpoint || !secret) {
  console.error('Set SEEN_IN_KOREA_DRAFT_ENDPOINT and DRAFT_INGEST_SECRET first.');
  process.exit(1);
}

const payload = JSON.parse(await fs.readFile(file, 'utf8'));
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-draft-secret': secret },
  body: JSON.stringify(payload)
});
const text = await response.text();
console.log(text);
if (!response.ok) process.exit(1);
