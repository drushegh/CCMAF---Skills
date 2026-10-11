// Shared helpers for generate-catalog.mjs and validate-skills.mjs.
// Zero dependencies: Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLUGINS_DIR = path.join(ROOT, 'plugins');
export const CATALOG_PATH = path.join(ROOT, 'scripts', 'catalog-data.json');

export function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

export function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

export function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

// Pack directories on disk: plugins/<id>/ that contain a skills/ directory.
export function diskPacks() {
  if (!isDir(PLUGINS_DIR)) return [];
  return fs.readdirSync(PLUGINS_DIR)
    .filter((d) => isDir(path.join(PLUGINS_DIR, d, 'skills')))
    .sort();
}

// Skill directories on disk for one pack.
export function diskSkills(packId) {
  const dir = path.join(PLUGINS_DIR, packId, 'skills');
  if (!isDir(dir)) return [];
  return fs.readdirSync(dir).filter((d) => isDir(path.join(dir, d))).sort();
}

export function skillDir(packId, skill) {
  return path.join(PLUGINS_DIR, packId, 'skills', skill);
}

// Count Markdown files under a skill's references/ directory (recursive).
export function countReferenceDocs(packId, skill) {
  const walk = (d) => {
    if (!isDir(d)) return 0;
    let n = 0;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) n += walk(path.join(d, e.name));
      else if (e.name.endsWith('.md')) n += 1;
    }
    return n;
  };
  return walk(path.join(skillDir(packId, skill), 'references'));
}

// Minimal YAML frontmatter reader for the scalar keys skills use (name,
// description). Handles plain, single/double-quoted, and block scalars
// (> >- >+ | |- |+). Returns null when there is no frontmatter block.
export function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const km = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!km) continue;
    const key = km[1];
    let val = km[2].trim();
    const block = /^([>|])([+-]?)$/.exec(val);
    if (block) {
      const body = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].trim() === '')) {
        body.push(lines[++i]);
      }
      const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      const stripped = body.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));
      if (block[1] === '|') {
        val = stripped.join('\n');
      } else {
        // Folded: single newlines become spaces, blank lines become newlines.
        val = stripped.join('\n').replace(/([^\n])\n(?!\n)/g, '$1 ');
      }
      val = block[2] === '+' ? val : val.replace(/\s+$/, '');
    } else if (/^".*"$/.test(val)) {
      val = JSON.parse(val);
    } else if (/^'.*'$/.test(val)) {
      val = val.slice(1, -1).replace(/''/g, "'");
    }
    out[key] = val;
  }
  return out;
}

// Character length in code points (not UTF-16 units, not bytes).
export function charLen(s) {
  return [...s].length;
}

export function orderedPacks(catalog) {
  return [...catalog.packs].sort((a, b) => a.order - b.order);
}
