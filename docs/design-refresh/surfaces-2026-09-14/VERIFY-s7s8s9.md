# VERIFICATION — S7/S8/S9 (mom core) — 2026-09-17

Packet: surfaces-2026-09-14/s7s8s9-app-mom-core.html
Construction source: approved s5-app-birth-plan.html + s6-app-timeline.html (chrome, cards, tabbar) + common.css + TYPE-SYSTEM.md + VISUAL-TOKENS.md. Function inventory: frontend/app/(mom)/appointments.tsx, my-team.tsx, messages.tsx — every real element represented, none dropped.

## Static checks
- Hex audit: 0 unapproved colors (vs approved corpus: s5, s6, common.css, type-system.css, auth-screens-1). Send-icon stroke uses approved #fff notation.
- Audience-copy law: zero pregnancy-status assumptions; all copy is role-relationship ("your team", "this chapter"). PASS.
- Fonts loaded in render: Cormorant 600/700, Quicksand 400/500/600/700. PASS.

## Render checks (Playwright headless Chromium, dsf=2, per-phone DOM-rect crops)
| screen | tabbar border | tab icons px | active-tab tint centroid | verdict |
|---|---|---|---|---|
| s7-appointments | y=1518 | 4392 | x≈97 → tab 1 Home | PASS |
| s8-my-team | y=1521 | 4405 | x≈508 → tab 4 My Team | PASS |
| s9-messages | y=1531 | 4349 | x≈663 → tab 5 Messages | PASS |

Active-tab tint (#6E6C99) pixel centroids match markup `.tb.on` positions on all three phones (markup + pixels independent, agree). Vision review flagged S8 highlight as Home — disproven by pixel centroid; recorded as reviewer error.

## Layout fixes applied during verification
1. `.phone` height:auto → fixed 844px flex column (tab bar was flowing below crop).
2. Tab bar pinned via flex column; S7 sheet given 18px breathing room above tab bar.
3. S8 "Find Providers" CTA bottom-anchored (margin-top:auto — approved auth-footer pattern).
4. S9 composer (field + send, #8E8CB5) bottom-anchored above tab bar, matching real messages UX.

## Vision review (neutral prompt) results
- S7: full structure confirmed, no empty/cramped/cut-off areas.
- S8: full structure confirmed; minor two-line wrap in birth-plan card meta (accepted); dead space above CTA now absorbed by bottom-anchor.
- S9: full structure confirmed incl. composer; no issues.

## Status
- [checkpointing → waiting] Mockups complete + verified; NOT implemented, NOT approved — awaiting Jeff review.

---

# CONSISTENCY DOUBLE-CHECK — mom section sweep — 2026-09-19

Post-S10/S11/S12 sweep across all redesigned mom surfaces (home, timer, weekly-tips, birth-plan, appointments, my-team, messages, _layout tab bar) against CONSISTENCY-SPEC v1 + TYPE-SYSTEM.md + locked canon. Findings + fixes:

1. **Chevron law violation (home):** S10 lock set the home "All Tools" arrow at 20px; four other home chevrons sat at 17px while every other redesigned screen used the 16px law value. Fixed all four 17px → 16px (rose rows keep C.rose, gray rows keep C.chev). The 20px S10 arrow stays as locked.
2. **Birth-plan chevron:** single 22px hardcoded `#9C9DA0` chevron → 16px `C.chev` (law value + token, kills the last raw hex on that surface). Added the missing `C` import from designRefresh.
3. **Weekly-tips current-chip band mismatch:** `weekButtonCurrent` border was `C.roseSoft` but the approved S12 mockup (.wk.cur) sets border #B085A5 = `C.roseBorder` with bg #FBF5F9 (= `C.gbandMid`, already tokenized in the prior commit). Border synced to `C.roseBorder` per mockup.
4. **Dead import:** `Icon` imported in `(mom)/_layout.tsx` with zero usages → removed.
5. **icons.mjs doc drift:** reference icon inventory was missing 9 utility glyphs that TIcon.tsx ships (ta_history, ta_add, ta_share, gear, k_timeline, bell, ar_contract, ar_invoice, ar_invoice_paid). Synced verbatim from source — TIcon ↔ icons.mjs now 31/31 (parity, mjs-only=∅, TIcon-only='name' type decl).
6. **TS typing fix in the redesign patch set:** my-team `translate: [{y:-0.5}]` (invalid RN style key from the optical-alignment pass) → `translateY: -0.5`.
7. **Pre-existing drift fixed en passant:** websocket.ts pingInterval typed as `number` vs `NodeJS.Timeout` → `ReturnType<typeof setInterval>`. tsc --noEmit now exits 0 on the whole frontend.

## Scope note — remaining `<Icon>` usage (NOT a violation)
messages.tsx still imports the legacy `Icon` component in 13 places — all in sub-flows with **no approved mockups yet**: inline chat view, new-message modal, ErrorBoundary fallback, invoice banners. Design law (mockup-first) forbids freestyle redesign, so these stay as-is and are logged as pending-mockup scope. S9 list surface itself is fully tokenized.

## Final audits
- Hex: 0 unapproved colors across 7 mom screens + designRefresh.ts (corpus = CONSISTENCY-SPEC palette).
- Lucide: 0 legacy icon imports on the 7 redesigned surfaces.
- tsc --noEmit: exit 0.
