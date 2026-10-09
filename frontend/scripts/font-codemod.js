#!/usr/bin/env node
/**
 * font-codemod.js — P2 font-size law codemod (JOB-2026-10-09i).
 *
 * Snaps raw off-ladder fontSize values in app/src source to the lawful
 * mapping (council-reviewed). Modes:
 *   node font-codemod.js report --wave 1   # print proposed changes, no writes
 *   node font-codemod.js apply  --wave 1   # write changes (git restores if needed)
 *
 * Safety rails:
 *  - Only raw numeric literals inside style objects (fontSize: N); token refs
 *    (SIZES.fontXs, TYPO.*) are untouched by design.
 *  - Exclusion patterns for WebView/HTML strings (style strings with CSS
 *    syntax like "border: 2px solid") — codemod must not corrupt markup.
 *  - Glyph skip: instances whose nearby context marks them as standalone
 *    glyphs ('×', '›', emoji) are listed in the report; apply skips them
 *    unless --include-glyphs.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FE = path.resolve(__dirname, '..');

// Council-reviewed mapping (size -> size | 'KEEP' to document an exemption)
const MAPPING = JSON.parse(fs.readFileSync(path.join(__dirname, 'font-mapping.json'), 'utf8'));

const WAVES = {
  1: ['app/(mom)/'],
  2: ['app/(provider)/', 'app/(lactation)/', 'app/(midwife)/', 'app/(admin)/', 'src/components/provider/'],
  3: ['app/(auth)/', 'app/_layout.tsx', 'src/'], // minus wave-2 src paths (checked below)
};

// Glyph/emoji detection: line context contains one of these markers
const GLYPH_RE = /[×✕›‹⌄⌃•–—]|fontWeight:\s*'300'/;
// WebView/HTML-string exclusions: CSS-in-string patterns must not be touched.
// Block-aware: web-style blocks lay props out one-per-line, so a per-line test
// is blind (missed appointments.tsx L627 pre-fix) — test ±6 lines of context.
const WEB_MARKER_RE = /border:\s*[`"']?\s*\d+px|<div|<span|className=|e\.target\.|dangerouslySetInnerHTML|outline:\s*['"]none['"]|cursor:\s*['"]pointer['"]|font-size/i;

const FS_RE = /fontSize\s*:\s*(\d+(?:\.\d+)?)(?![\w.])/g;

function listWaveFiles(wave) {
  const prefixes = WAVES[wave];
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith('.d.ts') && !/\.test\.[tj]sx?$/.test(e.name)) out.push(p);
    }
  };
  for (const pre of prefixes) {
    const abs = path.join(FE, pre);
    if (fs.existsSync(abs)) {
      if (abs.endsWith('.tsx') || abs.endsWith('.ts')) out.push(abs);
      else walk(abs);
    }
  }
  // wave 3 must exclude wave-1/2 files
  if (wave === 3) {
    const w12 = [...WAVES[1], ...WAVES[2]];
    return out.filter((f) => !w12.some((w) => f.startsWith(path.join(FE, w))));
  }
  return out;
}

function processFile(file, wave, apply, includeGlyphs) {
  const rel = path.relative(FE, file);
  let src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const changes = [];
  let touched = false;

  for (let li = 0; li < lines.length; li++) {
    const block = lines.slice(Math.max(0, li - 6), li + 7).join('\n');
    if (WEB_MARKER_RE.test(block)) continue; // WebView/HTML block guard
    const line = lines[li];
    const matches = [];
    let m;
    FS_RE.lastIndex = 0;
    while ((m = FS_RE.exec(line))) matches.push(m);
    if (!matches.length) continue;
    // apply in REVERSE column order so earlier splice points stay valid
    for (const mm of [...matches].reverse()) {
      const val = parseFloat(mm[1]);
      const target = MAPPING[String(val)];
      if (target === undefined || target === 'KEEP' || target === val) continue;
      const isGlyph = GLYPH_RE.test(line);
      const startCol = mm.index;
      changes.push({ line: li + 1, from: val, to: target, glyph: isGlyph, col: startCol, rel });
      if (!isGlyph || includeGlyphs) {
        lines[li] = line.slice(0, startCol) + `fontSize: ${target}` + line.slice(startCol + mm[0].length);
        touched = true;
      }
    }
  }

  if (touched && apply) fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return changes;
}

function main() {
  const mode = process.argv[2];
  const waveFlag = process.argv.indexOf('--wave');
  const wave = waveFlag > -1 ? parseInt(process.argv[waveFlag + 1], 10) : null;
  const includeGlyphs = process.argv.includes('--include-glyphs');

  if (!['report', 'apply'].includes(mode) || !wave || !WAVES[wave]) {
    console.error('usage: node font-codemod.js report|apply --wave 1|2|3 [--include-glyphs]');
    process.exit(1);
  }
  const apply = mode === 'apply';
  const files = listWaveFiles(wave);
  const all = [];
  let applied = 0, skippedGlyphs = 0;
  for (const f of files) {
    const ch = processFile(f, wave, apply, includeGlyphs);
    if (ch.length) {
      all.push(...ch);
      if (apply) applied++;
    }
  }
  const glyphLines = all.filter((c) => c.glyph);
  const real = all.filter((c) => !c.glyph);
  console.log(`wave ${wave} — ${mode}${includeGlyphs ? ' (+glyphs)' : ''}: ${files.length} files scanned`);
  console.log(`changes: ${all.length} (glyph-suspect ${glyphLines.length} ${apply && !includeGlyphs ? '(SKIPPED)' : '(included)'}, non-glyph ${real.length})`);
  for (const c of all) {
    console.log(`  L${c.line}${c.glyph ? ' [GLYPH?]' : ''} ${c.from} -> ${c.to}  ${c.rel}`);
  }
  if (apply) console.log(`applied to ${applied} files`);
  const unlawfulLeft = all.filter((c) => c.to !== 'KEEP' && !isLawfulTarget(c.to));
  if (unlawfulLeft.length) {
    console.error(`\nSCRIPT BUG: ${unlawfulLeft.length} mappings produce off-law targets`);
    process.exit(42);
  }
}

function isLawfulTarget(t) {
  const lawful = JSON.parse(fs.readFileSync(path.join(__dirname, 'lawful-font-sizes.json'), 'utf8'));
  return lawful.includes(t);
}

main();