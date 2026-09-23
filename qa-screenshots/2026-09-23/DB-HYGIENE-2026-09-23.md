# TJB Production DB Hygiene Pass — 2026-09-23 (Kit)

DB: MongoDB Atlas (truejoybirthing) — app on Railway, DB on Atlas (Jeff-confirmed topology; unrelated to Finding #3).

## What was wrong (found by cross-collection orphan sweep)
- 3 stale `consultation_requested` leads from real moms to **"Sarah Mitchell" (demo_doula_b3a8af74)** — a demo provider account DELETED in June. Moms were hanging 60-90 days.
- Carlicia Feaster also has a **real, 68-day-old unanswered consult request to Shelbi Kohler** (live provider). LEFT OPEN — needs Jeff/Shelbi decision.
- Grayson Lofties had a pending request to Shelbi while ALREADY an Active client of hers (duplicate) → marked converted_to_client with note.
- 5 ghost "client" rows (Emma Johnson variants) pointing at deleted demo/test provider accounts.
- 8 stale visits, 2 ghost-mom messages, 4 terminal share_requests, 6 ghost notifications.
- 1 Active client row (Shelbi's) pointed at a deleted ghost mom (no appts/visits attached) → removed.

## Actions (all single-field status changes or row deletions of rows belonging to deleted/ghost accounts)
1. 2 Sarah Mitchell stale leads → declined (admin_note added).
2. 1 Grayson→Shelbi duplicate lead → converted_to_client (note added).
3. Deleted 8 orphan client rows + 8 orphan/stale visits + 2 ghost messages + 2 terminal share_requests + 6 ghost notifications + 1 ghost-mom Active client row.
4. Declined 2 stale pending share_requests aimed at removed providers.

## Final state (verified)
- ZERO orphans across 12 cross-collection checks (leads/appointments/visits/messages/share_requests/clients/notifications → users/clients).
- Live surfaces re-smoked: mom login+leads+convs 200; doula leads [1 scheduled]; midwife clients 1 Active + 2 visits; Shelbi admin queue shows only real pending (Carlicia).
- Counts: leads 12, clients 9, visits 2, share_requests 10, notifications 56.

## OPEN ITEM for Jeff/Shelbi
- Carlicia Feaster → Shelbi Kohler, requested 2026-07-16 (68 days), still `consultation_requested`. Real person. Needs a human response (convert or decline) — I did not touch it.
