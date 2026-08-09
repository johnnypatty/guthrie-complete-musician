import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.css', '.csv', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.webmanifest', '.yml', '.yaml'
]);

const MARKERS = [
  {
    name: 'seller-identity',
    pattern: /\b(?:marketplace|classifieds?)\s+seller\s*:\s*[^\n,;]+/i
  },
  {
    name: 'transaction-date',
    pattern: /\b(?:pickup|collection|travel|return|meeting)\s+date\s*:\s*\d{4}-\d{2}-\d{2}\b/i
  },
  {
    name: 'transaction-price',
    pattern: /\bpickup\s+price\s*(?:is|:|\()?\s*(?:€|\$|£)\s?\d[\d.,]*\)?/i
  },
  {
    name: 'email-address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  },
  {
    name: 'phone-number',
    pattern: /(?:^|\s)(?:\+?\d[\s().-]*){9,}(?:\s|$)/m
  },
  {
    name: 'payment-detail',
    pattern: /\b(?:send|pay|payment)\b[^\n]{0,32}\b(?:paypal|bank transfer|iban)\b/i
  },
  {
    name: 'marketplace-message',
    pattern: /\b(?:automatic message|active since|secure payment|message from seller)\b/i
  }
];

export function scanPrivateText(text, _path = '') {
  const source = String(text);
  return MARKERS.filter(({ pattern }) => pattern.test(source)).map(({ name }) => name);
}

async function listTextFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listTextFiles(root, absolute));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

export async function scanTree(root) {
  const files = (await listTextFiles(root)).sort((a, b) => a.localeCompare(b, 'en'));
  const findings = [];
  for (const file of files) {
    const matches = scanPrivateText(await readFile(file, 'utf8'), file);
    if (matches.length) {
      findings.push({
        path: relative(root, file).split(sep).join('/'),
        matches
      });
    }
  }
  return findings;
}
