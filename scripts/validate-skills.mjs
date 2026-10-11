#!/usr/bin/env node
// Validate the skills catalogue: frontmatter, manifests vs disk, catalogue
// coverage, cross-references, line endings, and a listing-budget report.
//
// Usage: node scripts/validate-skills.mjs [--strict]
//   --strict  pending packs/skills (on disk but not yet in catalog-data.json)
//             are errors instead of warnings. CI runs with --strict.
// Exit code 1 if any ERROR; warnings alone exit 0.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, PLUGINS_DIR, loadCatalog, diskPacks, diskSkills, skillDir, isDir, isFile,
  readFrontmatter, charLen, orderedPacks,
} from './lib.mjs';

const STRICT = process.argv.includes('--strict');
const DESC_WARN = 1024;
const DESC_ERROR = 1536;
const SUMMARY_MAX = 140;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const pending = (m) => (STRICT ? err(m) : warn(m));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err(`${rel(p)}: unreadable JSON (${e.message})`); return null; }
};

const catalog = loadCatalog();
const catalogPacks = new Map(catalog.packs.map((p) => [p.id, p]));
const packsOnDisk = diskPacks();

// ---------- catalogue integrity ----------
for (const p of catalog.packs) {
  for (const k of ['id', 'title', 'audience', 'description', 'order']) {
    if (p[k] === undefined || p[k] === '') err(`catalog-data.json: pack ${p.id ?? '?'} missing "${k}"`);
  }
  if (!packsOnDisk.includes(p.id)) err(`catalog-data.json: pack ${p.id} has no plugins/${p.id}/skills/ directory`);
}
const orders = catalog.packs.map((p) => p.order);
if (new Set(orders).size !== orders.length) err('catalog-data.json: duplicate pack "order" values');
for (const r of catalog.roles || []) {
  for (const id of r.packs) if (!catalogPacks.has(id)) err(`catalog-data.json: role "${r.role}" names unknown pack ${id}`);
}

// skill -> pack, from disk; pending = on disk but uncatalogued.
const skillPack = new Map();
const pendingPacks = new Set();
const pendingSkills = new Set();
for (const pk of packsOnDisk) {
  if (!catalogPacks.has(pk)) {
    pendingPacks.add(pk);
    pending(`pending pack plugins/${pk}/ is not in catalog-data.json (${diskSkills(pk).length} skill dir(s))`);
  }
  for (const s of diskSkills(pk)) {
    if (skillPack.has(s)) err(`skill ${s} exists in two packs: ${skillPack.get(s)} and ${pk}`);
    skillPack.set(s, pk);
    if (pendingPacks.has(pk)) { pendingSkills.add(s); continue; }
    const entry = catalog.skills[s];
    if (!entry) {
      pendingSkills.add(s);
      pending(`pending skill plugins/${pk}/skills/${s} is not in catalog-data.json`);
    } else if (entry.pack !== pk) {
      err(`catalog-data.json: ${s} catalogued under ${entry.pack} but lives in plugins/${pk}/skills/`);
    }
  }
}
for (const [s, entry] of Object.entries(catalog.skills)) {
  if (!skillPack.has(s)) err(`catalog-data.json: skill ${s} has no directory on disk`);
  if (!catalogPacks.has(entry.pack)) err(`catalog-data.json: skill ${s} names unknown pack ${entry.pack}`);
  if (!entry.summary) err(`catalog-data.json: skill ${s} has no summary`);
  else if (charLen(entry.summary) > SUMMARY_MAX) err(`catalog-data.json: ${s} summary is ${charLen(entry.summary)} chars (max ${SUMMARY_MAX})`);
}

// ---------- frontmatter ----------
const descLen = new Map();
for (const [s, pk] of skillPack) {
  if (pendingSkills.has(s)) continue;
  const file = path.join(skillDir(pk, s), 'SKILL.md');
  if (!isFile(file)) { err(`${rel(file)}: missing`); continue; }
  const fm = readFrontmatter(file);
  if (!fm) { err(`${rel(file)}: no YAML frontmatter`); continue; }
  if (fm.name !== s) err(`${rel(file)}: frontmatter name "${fm.name}" != directory "${s}"`);
  if (!fm.description) { err(`${rel(file)}: frontmatter has no description`); continue; }
  const n = charLen(fm.description);
  descLen.set(s, n);
  if (n > DESC_ERROR) err(`${rel(file)}: description is ${n} chars (> ${DESC_ERROR})`);
  else if (n > DESC_WARN) warn(`${rel(file)}: description is ${n} chars (> ${DESC_WARN})`);
}

// ---------- pack manifests vs disk ----------
const liveSkills = (pk) => diskSkills(pk).filter((s) => !pendingSkills.has(s));
for (const pk of packsOnDisk) {
  if (pendingPacks.has(pk)) continue;
  const mf = path.join(PLUGINS_DIR, pk, '.claude-plugin', 'plugin.json');
  if (!isFile(mf)) { err(`${rel(mf)}: missing — run node scripts/generate-catalog.mjs`); continue; }
  const j = readJson(mf);
  if (!j) continue;
  if (j.name !== pk) err(`${rel(mf)}: name "${j.name}" != pack directory "${pk}"`);
  const want = liveSkills(pk).map((s) => `./skills/${s}`);
  const have = [...(j.skills || [])].sort();
  if (!sameList(want, have)) err(`${rel(mf)}: skills[] does not match skill dirs on disk (want ${want.length}, have ${have.length})`);
  for (const sp of j.skills || []) {
    if (!isFile(path.join(PLUGINS_DIR, pk, sp, 'SKILL.md'))) err(`${rel(mf)}: ${sp} has no SKILL.md`);
  }
}

// ---------- marketplace + all-in-one ----------
const mpPath = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const mpJson = readJson(mpPath);
if (mpJson) {
  if (mpJson.name !== catalog.marketplace.name) err(`${rel(mpPath)}: name "${mpJson.name}" != "${catalog.marketplace.name}"`);
  const [first, ...rest] = mpJson.plugins || [];
  if (!first || first.name !== catalog.allInOne.name || first.source !== './') {
    err(`${rel(mpPath)}: first entry must be the all-in-one "${catalog.allInOne.name}" with source "./"`);
  }
  const names = rest.map((e) => e.name).sort();
  const want = packsOnDisk.filter((pk) => !pendingPacks.has(pk));
  if (!sameList(names, want)) err(`${rel(mpPath)}: pack entries [${names.join(', ')}] != pack dirs [${want.join(', ')}]`);
  for (const e of rest) {
    if (e.source !== `./plugins/${e.name}`) err(`${rel(mpPath)}: ${e.name} source "${e.source}" should be "./plugins/${e.name}"`);
    if (!isFile(path.join(ROOT, e.source, '.claude-plugin', 'plugin.json'))) err(`${rel(mpPath)}: ${e.name} source has no .claude-plugin/plugin.json`);
  }
}
const rootPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
const rootJson = readJson(rootPath);
if (rootJson) {
  const want = [...skillPack].filter(([s]) => !pendingSkills.has(s)).map(([s, pk]) => `./plugins/${pk}/skills/${s}`).sort();
  const have = [...(rootJson.skills || [])].sort();
  if (!sameList(want, have)) err(`${rel(rootPath)}: skills[] does not match every catalogued skill dir (want ${want.length}, have ${have.length})`);
  for (const sp of have) if (!isFile(path.join(ROOT, sp, 'SKILL.md'))) err(`${rel(rootPath)}: ${sp} has no SKILL.md`);
}

// ---------- files to scan ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const allFiles = walk(ROOT);
const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

// ---------- CRLF ----------
for (const f of allFiles) {
  const buf = fs.readFileSync(f);
  if (isBinary(buf)) continue;
  if (buf.includes(13)) err(`${rel(f)}: contains CR (CRLF line endings) — LF only`);
}

// ---------- cross-references ----------
// 1. Relative Markdown links (outside fenced code) must resolve.
// 2. Backticked `<name>-development` tokens — the stack-skill naming
//    convention — must name a real skill dir, unless listed in
//    catalog-data.json "externalSkills" (skills from other publishers).
// 3. Backticked kebab names directly called a skill ("`x` skill", "skill `x`")
//    that resolve nowhere are warnings (they may be planned or external).
const known = new Set(skillPack.keys());
const external = new Set(catalog.externalSkills || []);
const inPending = (f) => [...pendingSkills].some((s) => rel(f).startsWith(`plugins/${skillPack.get(s)}/skills/${s}/`));
const mdFiles = allFiles.filter((f) => f.endsWith('.md') && (rel(f).startsWith('plugins/') || !rel(f).includes('/')) && (STRICT || !inPending(f)));
for (const f of mdFiles) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let fence = false;
  lines.forEach((line, i) => {
    const where = `${rel(f)}:${i + 1}`;
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; }
    if (!fence) {
      // Links inside inline code spans are syntax examples, not links.
      for (const m of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const target = m[1];
        if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
        const clean = decodeURIComponent(target.split('#')[0]);
        if (clean && !fs.existsSync(path.resolve(path.dirname(f), clean))) err(`${where}: broken relative link ${target}`);
      }
    }
    for (const m of line.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*-development)`/g)) {
      if (!known.has(m[1]) && !external.has(m[1])) err(`${where}: references skill \`${m[1]}\`, which does not exist`);
    }
    for (const m of line.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`\s+skill\b|\bskill\s+`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)) {
      const name = m[1] || m[2];
      if (!known.has(name) && !external.has(name) && !name.endsWith('-development')) warn(`${where}: names a skill \`${name}\` that is not in this catalogue`);
    }
  });
}

// ---------- listing-budget report ----------
const packTotal = (pk) => liveSkills(pk).reduce((n, s) => n + (descLen.get(s) || 0), 0);
const live = orderedPacks(catalog).filter((p) => packsOnDisk.includes(p.id));
const lines = [];
lines.push('Listing budget — total frontmatter description chars (what Claude Code lists every session):');
for (const p of live) lines.push(`  ${p.id.padEnd(26)} ${String(liveSkills(p.id).length).padStart(3)} skills  ${String(packTotal(p.id)).padStart(6)} chars`);
const base = ['ccmaf-skills-core', 'ccmaf-skills-engineering'].filter((id) => packsOnDisk.includes(id));
const baseTotal = base.reduce((n, id) => n + packTotal(id), 0);
const baseCount = base.reduce((n, id) => n + liveSkills(id).length, 0);
lines.push(`  core + engineering         ${String(baseCount).padStart(3)} skills  ${String(baseTotal).padStart(6)} chars`);
for (const p of live) {
  if (base.includes(p.id)) continue;
  const n = baseCount + liveSkills(p.id).length;
  lines.push(`  core + engineering + ${p.id.replace(/^ccmaf-skills-/, '').padEnd(10)} ${String(n).padStart(3)} skills  ${String(baseTotal + packTotal(p.id)).padStart(6)} chars`);
}
const all = [...descLen.values()].reduce((a, b) => a + b, 0);
lines.push(`  all-in-one                 ${String(descLen.size).padStart(3)} skills  ${String(all).padStart(6)} chars`);

// ---------- report ----------
console.log(lines.join('\n'));
console.log('');
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\nvalidate-skills: ${skillPack.size - pendingSkills.size} skills checked, ${pendingSkills.size} pending, ${errors.length} error(s), ${warnings.length} warning(s)${STRICT ? ' [strict]' : ''}.`);
process.exit(errors.length ? 1 : 0);
