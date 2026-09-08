# Google Play Console Submission — Pitfalls & Runbook Notes

*Learned 2026-09-04 during TJB v1.5.0 (versionCode 152) production submission. App ID: 4972601950486224295, developer account 7073800881508405551 (sheffkventures@gmail.com).*

# TJB Mobile release gate (built 2026-09-08, commits 968f0da3 + 7178421c, rebased onto 88b69463)
- `scripts/release-gate.py` runs BEFORE any store submission: version-sync (app.json vs release args), git-clean, store-listing (length limits + banned/overclaim phrases), reviewer-creds (POSTs every declared credential to prod /api/auth/login — dead account = hard block), failure-replay (10-case library, all-caught gate). Fail-closed exit 1. Self-test mode proves every detector fires offline.
- Artifacts it requires: `store/play-listing.txt` (staged listing copy) + `scripts/release-creds.json` (working demo set).
- Both 2026 rejection classes are now gate checks — neither can silently recur.

## Pitfalls (both cost real time — don't repeat)

1. **macOS TCC blocks headless Chrome from reading `~/Desktop`.** AAB/screenshot/listing files staged on the Desktop are invisible to the agent Chrome (headless CDP profile runs under a different TCC grant). **Always stage upload artifacts in `/tmp/`** (e.g. `/tmp/tjb-play-upload/`).

2. **Invisible onboarding coach-mark pane intercepts clicks on Publishing overview.** A floating "help" coach-mark (off-screen or transparent) swallows synthetic CDP clicks until dismissed. Symptom: the final **"Submit N changes for review"** button returns zero DOM response — no dialog, no network call — from CDP mouse events, pointer sequences, keyboard activation, and `element.click()`. Fix: find and dismiss the coach-mark first; if the button still won't fire from synthetic activation, have Kenneth click it in his own Chrome (30-second action, same account).

3. **Dart-based console quirk:** most Play Console buttons accept synthetic activation, but the Publish-overview submit button did not. Don't burn an iteration budget retrying synthetic click variants more than ~3 ways before falling back to Kenneth.

4. **Submission activity table renders in a lazy-loaded/shadow container** — `document.body.innerText` may show the header + "1 - 10" pagination but empty rows for ~30s+. The authoritative confirmation is the Publishing overview banner: **"Your changes are now in review."** Don't keep polling the table; trust the banner.

## Verified submission record (2026-09-04)

- AAB: tjb-1.5.0-152.aab (versionCode 152, 70.9MB), signing cert SHA1 `69:B0:1A:BC:...` matches Google-accepted key.
- Jul 1 rejection root cause: short description claimed "hospital advocacy scripts" (feature doesn't exist). Fixed with verified staged copy.
- 9 changes submitted as one batch (listing fix + 8 prior) → review takes ~3–7 business days for first production approval.
- Android developer verification (Sep 30 deadline): already cleared — "All of your apps have been successfully registered."

## Monitoring (set up 2026-09-04)

- **Watchdog cron** `85be86dac67c` "TJB Play Review Status Watchdog" — script-only (`no_agent=True`), **3x/day (09:00/13:00/18:00 MDT)**, runs `~/.hermes/scripts/play-review-watchdog.py` (source of truth: `SYSTEM/scripts/play-review-watchdog.py`). Reads the Publishing overview banner via the logged-in agent Chrome (CDP 9222). **Silent unless status changes**; on change pings `#truejoybirthing-main` + writes `reports/play-review-status-*.md`. State: `state/play-review-state.json`. Originally created at 30m (48/day); rescheduled to 3x/day on 2026-09-04 when Kenneth flagged the >3x/day hard rule.
- **Classifier gotchas:** match ONLY visible banner lines starting "Your changes" via `body.innerText` — `textContent` surfaces hidden DOM ("Changes ready to publish" template section, "Teacher Approved" badge) and false-positives. CDP websockets need `suppress_origin=True` (403 otherwise). Statuses: IN_REVIEW / READY_TO_SEND / READY_TO_PUBLISH / LIVE / REJECTED.
- **Managed publishing is ON:** approval does NOT auto-publish. Go-live = Publishing overview → Publish changes (Kit can click it).
- **Checkpoints:** Day 3 = `c41545cb55ab` (Sep 7 07:49 MDT), Day 7 = `7929e1b06384` (Sep 11 07:49 MDT), both LLM jobs pinned to ollama-local/atlas via prompt directive, delivered to #truejoybirthing-main.
- Watchdog added to CRON-ALTERNATIVE-FRAMEWORK.md approved high-frequency table (Kenneth approved 2026-09-04).

## Login/session facts

- Google session for sheffkventures@gmail.com lives in the agent headless Chrome once logged in (2FA lands on Kenneth's phone).
- Kenneth's personal Chrome is off-limits per Browser Permission Rule (computer-use-lock plugin) — ask in Discord first, `chrome-permission.sh grant` after.

## Credentials rejection (2026-09-06 — HARD LESSON)

- **Sep 4 submission was REJECTED because the Sign in details declaration contained dead accounts** (`reviewer.doula/midwife@truejoybirthing.com`, `reviewer.tjb@gmail.com`, all 401 in prod). Fixed Sep 6 → resubmitted with the working `demo.*` set. Full report: `reports/play-review-rejection-credentials-2026-09-06.md`.
- **Rule: live-test EVERY credential via `POST /api/auth/login` before submitting any Play/App Store declaration.** Never assume stored credentials work.
- **Canonical working set:** demo.midwife@truejoybirthing.com/DemoMidwife2024!, demo.doula@truejoybirthing.com/DemoDoula2024!, demo.mom@truejoybirthing.com/DemoMom2024! (mom = free, no paywall). `reviewer.*` accounts are LEGACY/DEAD — never submit them.
- `demo.lactation@truejoybirthing.com` currently 401 — do not submit until fixed (check ENABLE_DEMO_ACCOUNTS in Railway).
- Watchdog blind spot fixed same day (verified 7/7 behavioral cases + live run): rejection shows in a card AND a 'can now be sent for review' banner — check the rejection card FIRST, then banners; canon() must test reject/ready-to-send before generic "in review". Both fixes in `play-review-watchdog.py` (source of truth: SYSTEM/scripts/, synced to ~/.hermes/scripts/).
## Session addendum (2026-09-08, Kit) — stale-worktree incident + review lessons
- Aug 14 divergent draft of the loading-screen redesign sat uncommitted in the workspace for 3+ weeks while the finished version shipped upstream Sep 3 (88b69463). Detected only because a push failed. Lesson: long-lived dirty trees on shared repos cause silent divergence — when a push/rebase surfaces upstream drift, compare file mtimes against the incoming commit BEFORE stash/rebase, and archive the stale draft (archived at /Volumes/RENDER DISK/archive/2026-09-08-tjb-mobile-stale-worktree/ with README).
- Reviewer delegation failed at the finish line twice on provider 502s (not the work — the API). Recovery pattern: the full live transcript (delegation/live/<id>/task-0.log) preserves everything verified mid-run; re-dispatch only the unverified remainder with prior findings cited as given.
