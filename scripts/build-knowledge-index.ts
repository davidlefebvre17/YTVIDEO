/**
 * Build packages/ai/src/knowledge/chunks/index.json from the .md chunks.
 *
 * Each chunk has YAML frontmatter (id, title, symbols, themes, conditions,
 * priority, related_chunks). This script parses that, counts words in the
 * body, and assembles index.json which is consumed by the matcher/ranker.
 *
 * Run: npx tsx scripts/build-knowledge-index.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const CHUNKS_DIR = path.resolve(process.cwd(), 'packages', 'ai', 'src', 'knowledge', 'chunks');
const INDEX_PATH = path.join(CHUNKS_DIR, 'index.json');

interface ChunkMeta {
  id: string;
  title: string;
  source?: string;
  symbols?: string[];
  themes?: string[];
  conditions?: {
    flags?: string[];
    actors?: string[];
    regimes?: string[];
    vix_above?: number | null;
    any_symbol_move?: boolean;
    seasonality_months?: number[];
  };
  always_if_symbol?: boolean;
  always_if_theme?: boolean;
  priority?: string;
  related_chunks?: string[];
  wordCount?: number;
  file?: string;
}

/** Naïve YAML frontmatter parser (handles the subset used in the chunks). */
function parseFrontmatter(raw: string): { meta: any; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const yaml = m[1];
  const body = m[2];
  return { meta: parseYaml(yaml), body };
}

function parseYaml(yaml: string): any {
  const root: any = {};
  // Stack: each frame is { container, indent } where container is the dict
  // that receives keys at this indent level. Root has indent -1.
  const stack: Array<{ container: any; indent: number }> = [{ container: root, indent: -1 }];
  // Track the most-recently-opened key that is still empty — list items
  // (`- foo`) belong to it.
  let pending: { parent: any; key: string; indent: number } | null = null;
  const lines = yaml.split('\n');

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.search(/\S/);
    const line = rawLine.slice(indent);

    // Pop stack frames whose indent is >= current indent (they're done)
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const current = stack[stack.length - 1].container;

    // List item under a pending empty key
    if (line.startsWith('- ')) {
      if (pending && indent > pending.indent) {
        const v = parseScalar(line.slice(2));
        if (!Array.isArray(pending.parent[pending.key])) pending.parent[pending.key] = [];
        (pending.parent[pending.key] as any[]).push(v);
      }
      continue;
    }

    const km = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!km) continue;
    const key = km[1];
    const rest = km[2];

    if (rest === '') {
      // Empty value → nested container OR nested list. We don't know yet,
      // so create an object placeholder; if list items follow, they'll
      // overwrite it via pending.
      const newObj: any = {};
      current[key] = newObj;
      // Push a new frame so subsequent more-indented `key: val` lines land
      // inside newObj.
      stack.push({ container: newObj, indent });
      pending = { parent: current, key, indent };
    } else if (rest.startsWith('[')) {
      current[key] = parseInlineList(rest);
      pending = null;
    } else {
      current[key] = parseScalar(rest);
      pending = null;
    }
  }
  return root;
}

function parseScalar(s: string): any {
  s = s.trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseInlineList(s: string): any[] {
  const inner = s.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  const items = splitTopLevel(inner, ',');
  return items.map((x) => parseScalar(x.trim()));
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function countWords(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

function main() {
  const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.md')).sort();
  const chunks: ChunkMeta[] = [];
  const themesSet = new Set<string>();
  const flagsSet = new Set<string>();
  const actorsSet = new Set<string>();
  const regimesSet = new Set<string>();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CHUNKS_DIR, file), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.id) {
      console.warn(`  Skipping ${file}: no id in frontmatter`);
      continue;
    }
    const chunk: ChunkMeta = {
      id: meta.id,
      title: meta.title ?? '',
      source: meta.source,
      symbols: meta.symbols ?? [],
      themes: meta.themes ?? [],
      conditions: {
        flags: meta.conditions?.flags ?? [],
        actors: meta.conditions?.actors ?? [],
        regimes: meta.conditions?.regimes ?? [],
        vix_above: meta.conditions?.vix_above ?? null,
        any_symbol_move: meta.conditions?.any_symbol_move ?? false,
        seasonality_months: meta.conditions?.seasonality_months ?? [],
      },
      always_if_symbol: meta.always_if_symbol ?? false,
      always_if_theme: meta.always_if_theme ?? false,
      priority: meta.priority ?? 'medium',
      related_chunks: meta.related_chunks ?? [],
      wordCount: countWords(body),
      file,
    };
    chunks.push(chunk);
    chunk.themes?.forEach((t) => themesSet.add(t));
    chunk.conditions?.flags?.forEach((f) => flagsSet.add(f));
    chunk.conditions?.actors?.forEach((a) => actorsSet.add(a));
    chunk.conditions?.regimes?.forEach((r) => regimesSet.add(r));
  }

  const today = new Date().toISOString().slice(0, 10);
  const index = {
    generatedAt: today,
    totalChunks: chunks.length,
    taxonomy: {
      themes: [...themesSet].sort(),
      flags: [...flagsSet].sort(),
      actors: [...actorsSet].sort(),
      regimes: [...regimesSet].sort(),
    },
    chunks,
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`✓ Built ${INDEX_PATH}`);
  console.log(`  ${chunks.length} chunks, ${themesSet.size} themes, ${actorsSet.size} actors`);
}

main();
