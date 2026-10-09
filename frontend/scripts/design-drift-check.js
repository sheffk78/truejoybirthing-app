#!/usr/bin/env node
/**
 * design-drift-check.js — TJB mobile design-law drift gate (P0, JOB-2026-10-09f).
 *
 * Law sources (do not edit values here by hand — edit the corpus, then re-baseline):
 *   src/constants/designRefresh.ts       light palette (22 corpus hexes) + F fonts
 *   src/constants/designRefreshDark.ts   dark reversal corpus + lavenderText split
 *   src/constants/theme.ts               legacy alias file — frozen (P1 collapses it)
 *   src/constants/themeTokens.ts         semantic LIGHT/DARK map — frozen (P1 folds it)
 *
 * Rules:
 *   R1 OFF-LAW HEX      raw hex literals outside the token-definition files
 *   R2 OFF-LADDER SIZE  raw fontSize not on the ratified law ladder (mom + doula tiers)
 *   R3 ODD SPACING      raw padding/margin not on the 4pt/law chord set
 *   R4 ICON FREEZE      no file outside the baseline set may import Lucide (Icon.tsx)
 *   R5 PILL FREEZE      borderRadius 999/9999 outside Button.tsx — file set frozen
 *   R6 TOKEN FREEZE     theme.ts/themeTokens.ts may not GAIN new off-law hexes
 *
 * Baseline semantics: every rule compares (file, value) pairs against
 * scripts/design-drift-baseline.json. Any pair NOT in the baseline = NEW DRIFT
 * -> exit 42 (fails jest / pre-commit / e2e). Baseline remainder is WARN-only.
 * Lower the baseline (node design-drift-check.js --update-baseline) only when a
 * remediation phase verifiably reduces it — the ratchet.
 *
 * Exit codes: 0 = green (new-drift count 0) · 42 = new drift · 1 = internal error
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FE = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'design-drift-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

// ---- Lawful sets (derived from the ratified corpus documents) ----
// Type law r4 (council 2026-10-09) — mom ladder 10/10.5/11/13.5/17/21/26
// + display 34/52/74 + doula tier r3 (11.5/14/15/22) + 15.5 CTA band (now
// weekly-tips.tsx:527 — welcome has none). RATIFIED r4, bounded: 9.5 = chips
// /stat-labels/micro-foots (mockup .schip/.doula-chip, .stat .l); 12.5 = m-sub
// band: header subs/secondary meta/secondary button labels (.m-sub s7 L28,
// common.css L51-52, 68 mockup rule blocks); 16.5 = Cormorant italic quotes
// /.tipcard p.q s10:93; 19 = Cormorant serif stat numerals in tool/stat strips
// (kick:66, s3 .medrow .n, s4 .ccard .cn); 20 = avatar monograms ONLY (s13
// avatar law .avatar 20 rose r3#9) — never a mom section step; 23 = kick-counter
// padClock only (kick v2 .pad .clock ls 1).
const LAWFUL_FONT_SIZES = new Set([
  9.5, 10, 10.5, 11, 11.5, 12.5, 13.5, 14, 15, 15.5, 16.5, 17, 19, 20, 21, 22,
  23, 26, 34, 52, 74,
]);
// Spacing chords: 4pt grid + ratified half-steps (srowBase 12/14, micro 2/6/10)
// + approved one-offs present in lock-in documents (28 kicker chord, 100/120/140
// modal clearance, 80/52/45 mockup chords). Baseline carries the odd remainder.
const LAWFUL_SPACING = new Set([
  0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56,
  64, 72, 80, 96, 100, 120, 140,
]);
// Token-definition files: raw hexes are their job. Everything else may not.
const TOKEN_DEF_FILES = new Set([
  'src/constants/corpus.ts',
  'src/constants/tokens.ts',
  'src/constants/designRefresh.ts',
  'src/constants/designRefreshDark.ts',
  'src/constants/theme.ts',
  'src/constants/themeTokens.ts',
  'src/constants/corpusGate.ts',
]);
// Pill-variant law files may use radius 999 (Button + ghost-pill row builders).
const PILL_LAW_FILES = new Set([
  'src/components/Button.tsx',
  'src/constants/designRefresh.ts',
  'src/constants/designRefreshDark.ts',
]);
// Files whose imports are exempt from the Lucide ban (Icon.tsx itself defines it).
const LUCIDE_DEF_FILES = new Set(['src/components/Icon.tsx']);

// ---- Scanner ----
const IGNORE_DIRS = new Set([
  'node_modules', '.metro-cache', '.expo', 'ios', 'android', 'web-build',
  '.maestro', 'maestro', '__tests__', 'qa-screenshots', 'assets',
]);

function listSourceFiles() {
  const out = [];
  // Recursed roots: app/ + src/. Plus root-level .ts/.tsx files ( configs are
  // .js and excluded; found the hard way — a root-level probe bypassed R1-R3).
  for (const entry of fs.readdirSync(FE, { withFileTypes: true })) {
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !/\.test\.[tj]sx?$/.test(entry.name)) {
      out.push(path.join(FE, entry.name));
    }
  }
  // Recursed roots: app/ + src/ — ALWAYS anchored to FE, never process.cwd
  // (jest runs this from repo root; a cwd-relative walk scanned the wrong
  // tree and made R1-R3 blind — found 2026-10-09). Plus root-level .ts/.tsx.
  const roots = ['app', 'src'];
  for (const root of roots) {
    const absRoot = path.join(FE, root);
    if (!fs.existsSync(absRoot)) continue;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
          continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
        if (entry.name.endsWith('.d.ts') || /\.test\.[tj]sx?$/.test(entry.name)) continue;
        out.push(path.join(dir, entry.name));
      }
    };
    walk(absRoot);
  }
  return out;
}

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const FONT_RE = /fontSize\s*:\s*(\d+(?:\.\d+)?)/g;
const SPACING_RE = /\b(?:padding|margin)(?:Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?\s*:\s*(\d+(?:\.\d+)?)(?![\w.])/g;
const LUCIDE_RE = /from\s+['"][^'"]*components\/Icon['"]/;
const PILL_RE = /borderRadius\s*:\s*(?:9999|999)(?![\d.])/g;
// rgba() literals are tracked at WARN level only (veils/overlays law uses them).
const RGBA_RE = /rgba\(/g;

function rel(file) {
  return path.relative(FE, file).split(path.sep).join('/');
}

function scan() {
  const violations = { R1: {}, R2: {}, R3: {}, R4: {}, R5: {}, R6: {} };
  const warn = { rgba: {} };
  let files = 0;
  for (const file of listSourceFiles()) {
    files += 1;
    const r = rel(file);
    const src = fs.readFileSync(file, 'utf8');
    const isTokenDef = TOKEN_DEF_FILES.has(r);

    // R1 raw hex outside token-def files
    if (!isTokenDef) {
      const hexes = new Set();
      for (const m of src.matchAll(HEX_RE)) hexes.add(m[0].toUpperCase());
      if (hexes.size) violations.R1[r] = [...hexes].sort();
    }

    // R2 off-ladder fontSize (everywhere, incl. token files)
    const sizes = new Set();
    for (const m of src.matchAll(FONT_RE)) {
      const v = parseFloat(m[1]);
      if (!LAWFUL_FONT_SIZES.has(v)) sizes.add(String(v));
    }
    if (sizes.size) violations.R2[r] = [...sizes].sort();

    // R3 odd spacing
    const spac = new Set();
    for (const m of src.matchAll(SPACING_RE)) {
      const v = parseFloat(m[1]);
      if (!LAWFUL_SPACING.has(v)) spac.add(String(v));
    }
    if (spac.size) violations.R3[r] = [...spac].sort();

    // R4 Lucide import freeze (file-set rule, applied below against baseline)
    if (!LUCIDE_DEF_FILES.has(r) && LUCIDE_RE.test(src)) violations.R4[r] = ['import'];

    // R5 pill radius outside Button
    if (!PILL_LAW_FILES.has(r)) {
      const n = [...src.matchAll(PILL_RE)].length;
      if (n > 0) violations.R5[r] = [String(n)];
    }

    // rgba warn tracking
    const rgbaCount = [...src.matchAll(RGBA_RE)].length;
    if (rgbaCount > 0) warn.rgba[r] = [String(rgbaCount)];
  }

  // R6: token files must not gain NEW off-law hexes vs their committed contents.
  // (Baseline R1 already excludes token-def files; R6 diffs a dedicated snapshot.)
  const drLight = fs.readFileSync(path.join(FE, 'src/constants/designRefresh.ts'), 'utf8');
  const lawful = new Set();
  for (const m of drLight.matchAll(/'(#(?:[0-9a-fA-F]{6}))'/g)) lawful.add(m[1].toUpperCase());
  const drDark = fs.readFileSync(path.join(FE, 'src/constants/designRefreshDark.ts'), 'utf8');
  for (const m of drDark.matchAll(/'(#(?:[0-9a-fA-F]{6}))'/g)) lawful.add(m[1].toUpperCase());
  for (const tf of ['src/constants/theme.ts', 'src/constants/themeTokens.ts', 'src/constants/tokens.ts']) {
    const src = fs.readFileSync(path.join(FE, tf), 'utf8');
    const hexes = new Set();
    for (const m of src.matchAll(/'(#(?:[0-9a-fA-F]{6}))'/g)) {
      const h = m[1].toUpperCase();
      if (!lawful.has(h)) hexes.add(h);
    }
    if (hexes.size) violations.R6[tf] = [...hexes].sort();
  }

  return { files, violations, warn };
}

function normalizePairs(violations) {
  // {rule: {file: [vals]}} -> {rule: {"file::VALUE": 1}} for set-diff simplicity
  const out = {};
  for (const [rule, files] of Object.entries(violations)) {
    out[rule] = {};
    for (const [file, vals] of Object.entries(files)) {
      for (const v of vals) out[rule][`${file}::${v}`] = 1;
    }
  }
  return out;
}

function diffNew(current, baseline) {
  const news = [];
  for (const [rule, pairs] of Object.entries(current)) {
    const base = (baseline && baseline.violations && baseline.violations[rule]) || {};
    for (const pair of Object.keys(pairs)) {
      if (!(pair in base)) news.push(`${rule} ${pair}`);
    }
  }
  return news;
}

function countPairs(violations) {
  let n = 0;
  for (const files of Object.values(violations)) {
    for (const vals of Object.values(files)) n += vals.length;
  }
  return n;
}

function main() {
  const { files, violations, warn } = scan();
  let baseline = null;
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    if (!UPDATE) {
      console.error('FAIL-CLOSED: no baseline at scripts/design-drift-baseline.json — run `node scripts/design-drift-check.js --update-baseline` once (audited), then commit it.');
      process.exit(1);
    }
  }

  const current = normalizePairs(violations);
  if (UPDATE) {
    let commit = '(unknown)';
    try {
      commit = require('child_process').execSync('git rev-parse --short HEAD', { cwd: FE, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
    const snap = { generated: new Date().toISOString().slice(0, 10), commit, files, violations: current };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(snap, null, 1) + '\n');
    console.log(`BASELINE UPDATED: ${countPairs(violations)} pairs across ${files} files @ ${commit} -> ${path.relative(FE, BASELINE_PATH)}`);
    process.exit(0);
  }

  const news = diffNew(current, baseline);
  const baseCount = baseline && baseline.violations
    ? Object.values(baseline.violations).reduce((a, m) => a + Object.keys(m).length, 0)
    : 0;
  const curCount = countPairs(violations);

  console.log('=== TJB design drift gate ===');
  console.log(`scanned ${files} source files (law: corpus.ts / designRefresh{,Dark}.ts)`);
  console.log(`new drift vs baseline: ${news.length} · baseline remainder: ${baseCount} · current total: ${curCount}`);
  if (news.length) {
    console.log('\n-- NEW DRIFT (fails the gate) --');
    for (const n of news) console.log('  ' + n);
  }
  console.log(`\nrgba() literals (WARN only): ${Object.keys(warn.rgba).length} files`);
  if (news.length) {
    console.log(`\nFAIL: ${news.length} new drift markers. Fix the screen (use corpus tokens / law sizes), or, if a phase legitimately lowers scope, re-baseline with --update-baseline and record why in JOB-LEDGER.`);
    process.exit(42);
  }
  console.log('\nPASS: no new design drift.');
  process.exit(0);
}

function flatPairs(violationsByRule) {
  const out = {};
  for (const [rule, files] of Object.entries(violationsByRule)) {
    out[rule] = {};
    for (const [file, vals] of Object.entries(files)) {
      for (const v of vals) out[rule][`${file}::${v}`] = 1;
    }
  }
  return out;
}

main();