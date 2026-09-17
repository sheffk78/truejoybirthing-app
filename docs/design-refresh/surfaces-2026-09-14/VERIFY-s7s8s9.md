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