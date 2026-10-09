#!/usr/bin/env node
/**
 * spacing-codemod.js — P3 spacing law codemod (JOB-2026-10-09i, phase P3).
 *
 * Snaps raw off-grid padding/margin values to the 4pt-grid chords
 * (ties-UP: never shrinks a touch target; 3→4, 5→6, 7→8, 9→10, 11→12,
 * 13→14, 15→16, 26→28, 30→32, 60→64). Modes:
 *   node spacing-codemod.js report --wave 0
 *   node spacing-codemod.js apply  --wave 0
 *
 * Rails (mirrors font-codemod): token refs untouched, DOM-input web style
 * blocks exempt (block guard ±6 lines), no value-based shielding.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FE = path.resolve(__dirname, '..');
const MAPPING = JSON.parse(fs.readFileSync(path.join(__dirname, 'spacing-mapping.json'), 'utf8'));

const WAVES = {
  0: [ // canary — same 8 simmable files as the P2 font canary
    'app/(mom)/contraction-timer.tsx',
    'app/(mom)/kick-counter.tsx',
    'app/(mom)/home.tsx',
    'app/(mom)/share-birth-plan.tsx',
    'app/(mom)/invite-provider.tsx',
    'app/(mom)/my-team.tsx',
    'app/(mom)/timeline.tsx',
    'app/(auth)/login.tsx',
  ],
  1: ['app/(mom)/', 'app/plans-pricing.tsx', 'app/pro-feedback.tsx', 'app/(auth)/'],
  2: ['app/(provider)/', 'app/(lactation)/', 'app/(midwife)/', 'app/(admin)/', 'app/marketplace.tsx', 'src/'],
};

const SP_RE = /\b(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?\s*:\s*(\d+(?:\.\d+)?)(?![\w.])/g;
// DOM-input web style blocks: never touched (same guard as the gate R2 layer)
const WEB_MARKER_RE = /border:\s*[`"']?\s*\d+px|<div|<span|className=|e\.target\.|dangerouslySetInnerHTML|outline:\s*['"]none['"]|cursor:\s*['"]pointer['"]|font-size/i;

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
  const earlier = [];
  for (const w of Object.keys(WAVES).map(Number).sort((a, b) => a - b)) {
    if (w < wave) earlier.push(...WAVES[w]);
  }
  if (earlier.length) return out.filter((f) => !earlier.some((w) => f.startsWith(path.join(FE, w))));
  return out;
}

function processFile(file, apply) {
  const rel = path.relative(FE, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const changes = [];
  let touched = false;

  for (let li = 0; li < lines.length; li++) {
    const block = lines.slice(Math.max(0, li - 6), li + 7).join('\n');
    if (WEB_MARKER_RE.test(block)) continue; // DOM-input block guard
    let line = lines[li];
    // rescan the line after each splice — multi-match lines (e.g.
    // paddingVertical: 13 + paddingBottom: 15 on one line) must ALL update
    for (;;) {
      const matches = [...line.matchAll(SP_RE)];
      let applied = false;
      for (const mm of [...matches].reverse()) {
        const val = parseFloat(mm[3]);
        const target = MAPPING[String(val)];
        if (target === undefined || target === 'KEEP' || target === val) continue;
        const prop = mm[1] + (mm[2] || '');
        line = line.slice(0, mm.index) + `${prop}: ${target}` + line.slice(mm.index + mm[0].length);
        changes.push({ line: li + 1, prop, from: val, to: target, rel });
        applied = true;
        break; // columns shifted — rescan from scratch
      }
      if (!applied) break;
    }
    if (line !== lines[li]) {
      lines[li] = line;
      touched = true;
    }
  }

  if (touched && apply) fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return changes;
}

function main() {
  const mode = process.argv[2];
  const waveFlag = process.argv.indexOf('--wave');
  const wave = waveFlag > -1 ? parseInt(process.argv[waveFlag + 1], 10) : null;
  if (!['report', 'apply'].includes(mode) || wave === null || !WAVES[wave]) {
    console.error('usage: node spacing-codemod.js report|apply --wave 0|1|2');
    process.exit(1);
  }
  const apply = mode === 'apply';
  const files = listWaveFiles(wave);
  const all = [];
  let applied = 0;
  for (const f of files) {
    const ch = processFile(f, apply);
    if (ch.length) {
      all.push(...ch);
      if (apply) applied++;
    }
  }
  console.log(`wave ${wave} — ${mode}: ${files.length} files scanned`);
  console.log(`changes: ${all.length}`);
  for (const c of all) console.log(`  L${c.line} ${c.prop} ${c.from} -> ${c.to}  ${c.rel}`);
  if (apply) console.log(`applied to ${applied} files`);
  const LAWFUL = new Set([0,2,4,6,8,10,12,14,16,18,20,24,28,32,36,40,44,48,52,56,64,72,80,96,100,120,140]);
  const bad = all.filter((c) => !LAWFUL.has(c.to));
  if (bad.length) {
    console.error(`\nSCRIPT BUG: ${bad.length} mappings produce off-grid targets`);
    process.exit(42);
  }
}

main();