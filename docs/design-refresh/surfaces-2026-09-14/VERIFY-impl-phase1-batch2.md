# Phase 1 Batch 2 — Implementation Verify (2026-09-22)

## Scope
Reskin of the three remaining mom screens per RESKIN-COMPLETION-PLAN-2026-09-22 items 1.4-1.6:
- getting-started.tsx -> s7s8s9 core vocabulary (overline+serif head, srow cards, schips, outline pills) + approved HBand photo veil hero
- postpartum.tsx -> s13/s14 journal pattern (fieldbox cards with icon chips, pillchip states, rose reserved for warning signs)
- invite-provider.tsx -> m16/m17 family (avatar initials circle, role chips lavender/sage, ghost-outline secondary, lavender primary)

## Verification performed
1. tsc --noEmit clean (0 errors) after each write.
2. Behavior parity vs HEAD: same state names/fields, same routes (quick-start 3 routes, back-to-home), same API bodies
   (PUT postpartum/plan full field set; POST invites with invitee_name/email/role/personal_message), all testIDs preserved
   (back-btn, quick-start-*, plan-edit, save-plan, invite-name/email/role/send, contact-support-btn etc).
3. Real renders via expo dev server (8082) + headless Chromium at 390x844@2x with stubbed API fixtures:
   - getting-started.png: hero veil + back, START HERE / Getting Started serif accent, greeting 'Hi, Maya', 3 step srows with STEP chips + outline pills, Pro Tips
   - postpartum.png / -bottom.png: all 9 sections verified incl. Warning Signs chips, Emergency Contacts, Additional Notes (fixture data)
   - postpartum-edit.png: edit mode -> inputs for contacts/notes, 'Save Postpartum Plan' primary
   - invite-provider.png: full form w/ Doula(selected)/Midwife role chips, lavender Send Invite
   - invite-success.png: POST returns -> initials circle 'JS', 'Invite Sent to Jane Smith', Send Another / Back to My Team
4. No layout breaks, no overlaps in any captured state.

## Out of scope (unchanged by design)
- Native PDF download flow (birth-plan-preview) — untouched per directive.
- TestFlight/app-store builds: separate gate (not part of this code commit).

## Commits
- Screens: see git log (batch-2 screens commit)
- Plan tracker: items 1.4-1.6 marked [x]

## Ad-hoc verification harness (2026-09-22, post-packet)
Script: /var/folders/c3/.../T/hermes-verify-tjb-p1b2.sh (temp, cleaned up after run).
This is AD-HOC verification (scripted checks + live renders), not a test suite green — TJB mobile has no canonical test suite.

| Check | Result |
|---|---|
| tsc --noEmit | PASS (0 errors) |
| Interactive-control parity vs HEAD (testIDs + router actions + mailto) | PASS — no losses on any screen; 2 ids ADDED on getting-started (contact-support-btn, watch-tour-btn) for testability on controls that already existed in HEAD |
| API surface (endpoints + verbs) | PASS (postpartum, invite-provider, getting-started routes) |
| PUT /postpartum/plan body keys vs HEAD | PASS (11 keys, exact match) |
| POST /invites body keys | PASS (invitee_name/email/role + personal_message) |
| Token law (no raw hex) | PASS (only the approved hero veil rgba) |
| 16px inset law (page-level scrollContent) | PASS — all 3 screens: 20px |

Flag-resolution notes (initial run had 4 flags; all resolved):
1. testID 'diffs' were grep artifacts (template-literal ids) -> normalized; true parity confirmed.
2. 'missing body keys' were wrong field names in the checker (self_care_items vs actual self_care_activities etc.) -> HEAD/NOW identical.
3. inset 'violations' were chip/card-interior paddings (8-14px), which batch-1 committed screens also use (timeline eventRowCard=14, etypeChip=8); page-level = 20px on all three.
4. getting-started +2 ids are additions on pre-existing controls (Contact Support mailto, Watch App Tour), not behavior changes.


## Revision 2 (2026-09-22, after Jeff style review)
Jeff: v1 didn't follow the committed batch-1 style. Audit confirmed anatomy drift (tokens were on-spec):
- getting-started: text-over-photo hero -> header on cream + hero photo in rounded hairline card (batch-1 anchorCard anatomy); back = m17 ghost chevron chip
- postpartum: header block + lavender Edit pill left-aligned below (was pill squeezed right); unselected chips C.track -> C.cardBg
- invite-provider: m17 ghost chevron back chip; success card scaled to m17 proportions; removed dead Keyboard/TouchableWithoutFeedback imports
- testIDs normalized to RN testID prop (raw data-testid attr silently dropped by RN-web)
- Re-rendered live (metro 8082) + vision-verified vs batch-1 checklist; style-parity proof composite saved (Timeline ref + GS + PP)
- tsc --noEmit: 0 errors; raw hex: none
- Packet v2 (5 pages) approved by Jeff 2026-09-23; v1 packet archived to /Volumes/RENDER DISK/archive/2026-09-22-tjb-p1b2-packet-v1/
