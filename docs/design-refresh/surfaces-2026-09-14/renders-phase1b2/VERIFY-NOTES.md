# Phase 1 Batch 2 — Revision 2 (2026-09-22)

Jeff feedback: v1 packet didn't match the committed batch-1 style. Audit found structural
divergences (tokens were correct; anatomy was not). Fixes applied:

- getting-started: photo-overlay hero → header on cream + hero in rounded hairline card
  (batch-1 anchorCard anatomy); back affordance = ghost chevron chip (m17)
- postpartum: header split (pill squeezed right) → text block + lavender Edit pill below,
  left-aligned; unselected chips C.track → C.cardBg
- invite-provider: back pill → m17 ghost chevron; success card scaled to m17 proportions;
  dead Keyboard/TouchableWithoutFeedback imports removed

All three re-rendered live (metro 8082) and vision-verified against the batch-1 checklist.
tsc clean, raw-hex none, testIDs normalized to RN testID prop (data-testid was silently
dropped by RN-web). Superseded v1 packet archived to
/Volumes/RENDER DISK/archive/2026-09-22-tjb-p1b2-packet-v1/
