import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';

const REQUIRED_FIELDS = ['title', 'category', 'phase', 'difficulty', 'tags', 'summary'];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function parseValue(value, path, key) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[\[{"]/.test(trimmed) || /^(?:true|false|null|-?\d)/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`${path}: invalid front matter value for ${key}: ${error.message}`);
    }
  }
  return trimmed;
}

export function parseFrontMatter(source, path = '<lesson>') {
  const normalized = String(source).replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) {
    throw new Error(`${path}: front matter must begin with ---`);
  }
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${path}: front matter closing --- is missing`);

  const attributes = {};
  const header = normalized.slice(4, end);
  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-z][a-z0-9-]*):\s*(.*)$/i);
    if (!match) throw new Error(`${path}: invalid front matter line: ${line}`);
    attributes[match[1]] = parseValue(match[2], path, match[1]);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in attributes)) throw new Error(`${path}: missing required front matter field ${field}`);
  }
  for (const field of REQUIRED_FIELDS.filter((field) => field !== 'tags')) {
    if (typeof attributes[field] !== 'string' || !attributes[field].trim()) {
      throw new Error(`${path}: ${field} must be a non-empty string`);
    }
  }
  if (!Array.isArray(attributes.tags) || attributes.tags.length === 0 || attributes.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    throw new Error(`${path}: tags must be a non-empty string array`);
  }

  return {
    attributes,
    body: normalized.slice(end + 5).trim()
  };
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeHref(rawHref) {
  const href = rawHref.trim();
  if (/^(?:javascript|data|vbscript):/i.test(href)) return '#invalid-link';
  return escapeHtml(href);
}

function renderInline(value) {
  const codeTokens = [];
  const linkTokens = [];
  let text = String(value).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `\u0000CODE${codeTokens.length}\u0000`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label, href) => {
    const token = `\u0000LINK${linkTokens.length}\u0000`;
    const external = /^https?:\/\//i.test(href);
    linkTokens.push(`<a href="${safeHref(href)}"${external ? ' target="_blank" rel="noreferrer noopener"' : ''}>${escapeHtml(label)}</a>`);
    return token;
  });
  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  linkTokens.forEach((html, index) => {
    text = text.replace(`\u0000LINK${index}\u0000`, html);
  });
  codeTokens.forEach((html, index) => {
    text = text.replace(`\u0000CODE${index}\u0000`, html);
  });
  return text;
}

function splitTableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderList(lines, startIndex) {
  const ordered = /^\s*\d+\.\s+/.test(lines[startIndex]);
  const pattern = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-+*]\s+(.*)$/;
  const tag = ordered ? 'ol' : 'ul';
  const items = [];
  let index = startIndex;
  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) break;
    const task = match[1].match(/^\[([ xX])\]\s+(.*)$/);
    if (task) {
      const checked = task[1].toLowerCase() === 'x';
      items.push(`<li class="task-item"><input type="checkbox"${checked ? ' checked' : ''} disabled> <span>${renderInline(task[2])}</span></li>`);
    } else {
      items.push(`<li>${renderInline(match[1])}</li>`);
    }
    index += 1;
  }
  return { html: `<${tag}>${items.join('')}</${tag}>`, next: index };
}

export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  const headingCounts = new Map();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([a-z0-9_-]*)\s*$/i);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      html.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const base = slugify(heading[2]) || 'section';
      const count = (headingCounts.get(base) || 0) + 1;
      headingCounts.set(base, count);
      const id = count === 1 ? base : `${base}-${count}`;
      html.push(`<h${level} id="${id}">${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_header, cellIndex) => `<td>${renderInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    if (/^\s*(?:[-+*]\s+|\d+\.\s+)/.test(line)) {
      const list = renderList(lines, index);
      html.push(list.html);
      index = list.next;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      if (/^(?:#{1,6}\s+|```|>\s?|\s*(?:[-+*]\s+|\d+\.\s+))/.test(next)) break;
      if (next.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) break;
      paragraph.push(next.trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}

async function listMarkdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'templates') continue;
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(root, absolute));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') files.push(absolute);
  }
  return files;
}

export async function loadLessons(contentRoot) {
  const files = (await listMarkdownFiles(contentRoot)).sort((a, b) => a.localeCompare(b, 'en'));
  const lessons = [];
  const slugs = new Map();

  for (const file of files) {
    const sourcePath = relative(contentRoot, file).split(sep).join('/');
    const { attributes, body } = parseFrontMatter(await readFile(file, 'utf8'), sourcePath);
    const slug = slugify(basename(file, extname(file)));
    if (!slug) throw new Error(`${sourcePath}: filename cannot produce a slug`);
    if (slugs.has(slug)) throw new Error(`duplicate slug ${slug}: ${slugs.get(slug)} and ${sourcePath}`);
    slugs.set(slug, sourcePath);
    lessons.push({
      ...attributes,
      slug,
      sourcePath,
      html: renderMarkdown(body)
    });
  }

  return lessons;
}
