/**
 * design-drift-gate.test.js — jest wiring for the TJB design-law drift gate (P0).
 *
 * Runs `scripts/design-drift-check.js` as a subprocess on every jest invocation
 * (same cadence as `npm test` / `npm run test:tsc`). The script itself is
 * fail-closed: without a committed baseline it never passes. Exit 42 = new
 * design drift. Keep this test boring — the gate logic lives in the script and
 * is exercised there; this file only proves the two are wired together.
 */
process.env.FORCE_COLOR = '0';

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'design-drift-check.js');

describe('design-law drift gate (P0)', () => {
  test(
    'frontend source honors the design-law baseline (runs scripts/design-drift-check.js)',
    () => {
      let out = '';
      try {
        out = execFileSync('node', [SCRIPT], {
          cwd: path.join(__dirname, '..', '..'),
          encoding: 'utf8',
          timeout: 60000,
        });
      } catch (err) {
        // exit 42 (new drift) lands here — surface the gate's own diagnostics
        const detail = (err.stdout || '') + (err.stderr || '');
        throw new Error(
          'DESIGN DRIFT GATE FAILED — new violations vs baseline:\n' +
            detail.slice(-3000)
        );
      }
      expect(out).toContain('PASS: no new design drift.');
    },
    90000
  );
});