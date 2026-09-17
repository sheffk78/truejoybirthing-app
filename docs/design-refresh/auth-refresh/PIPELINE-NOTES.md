# TJB Mockup Render & Verification Pipeline (verified 2026-09-16)

The working pipeline for design-refresh packets. Use exactly this; do not rediscover.

## Render (agent Chrome CDP — the only reliable path)
1. `browser_exec` session `tjb-render`, `goto_url(file://<abs path to html>)`, `wait_for_load()`.
2. `cdp('Emulation.setDeviceMetricsOverride', width=446, height=900, deviceScaleFactor=1, mobile=False)` then
   `cdp('Page.captureScreenshot', format='png', captureBeyondViewport=True)` → base64 → write PNG.
   - dsf=2 times out (>5s IPC limit). Render at dsf=1 (390px phones are crisp enough for review).
   - The override must be re-applied after every navigation (doesn't survive goto).
   - Screens >760px content: use class `phone tall` (966px) — c4 mom-form and c5 plans precedent.
3. Layout law (approved c3/c4 construction, DESIGN-RULES §1): **flow layout** —
   photo div (230px) → fade div absolutely covering ONLY the photo (3-stop gradient, 100% cream
   at photo's bottom edge) → content BELOW the photo in document flow (`.sheet` position:relative).
   NEVER absolutely-position content inside a taller photo band — dark photos still carry
   texture under the fade tail (measured: margin std 13.7 vs approved 2.1).
4. ONLY status bar + back chip on photos. Step chips ("SETUP · 2 OF 2") go in-flow at sheet top.

## Verification (windows matter as much as metrics)
Run per screen (crop via DOM `getBoundingClientRect` offsets — never pixel-scan for phone
boundaries; dark photos break gap-detection):
- **Seam:** max adjacent-row jump in rows 120–230 (photo fade zone only). PASS < 60.
  Wider windows catch serif headline boundaries (dark caps row → blank row = jump ~46, false alarm).
- **Photo detail:** raw pixel std of photo zone (rows 20–230). PASS > 25. (xvar metrics are
  scale-dependent and unreliable; std is not.)
- **Cream-clean:** text-free margin strips (x 2–16) at y 250–300 and 420–480, max channel
  deviation from #FAF8F5. PASS < 6. (Full-row means include text and sage footers — expected fails.)
- **First text row:** content x-zone (40–350, excludes bezel corners) first dark row ≥ 246.
- **Bottom fit:** last content dark row < frame height − 14 (same x-zone; bezel corners at
  x<20 produce false CLIPPED).
Reference numbers from approved packets: margin std behind text ≈ 2.05–2.08.

## Vision review rules (from DESIGN-RULES §4)
Neutral, descriptive questions only. Vision has confirmed broken constructions under leading
questions twice and mis-claims text-on-photo when it's below the fade (it reads the fade tail
as "the photo"). Pixels + DOM win disputes.

## Files
- Packets: `auth-screens-N.html` + `auth-screens-N-full.png` + `pN-<screen>.png` crops
- Logs: `VERIFY-chunkN.log` (append-only, one block per run with what changed)
- Status: `chunkN-STATUS.json`