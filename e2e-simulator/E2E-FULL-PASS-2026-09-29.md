# TJB Mobile — Full Contract-Flow E2E: PASS (2026-09-29)

**Verdict:** `run_e2e.sh full` exits 0. Stamp: `e2e-simulator/results/` now written per run with contract id + signer.
**Verified by:** live run + backend readback (`status=Signed`, `client_signature.signer_name` recorded) + screenshot reading of the fixed sign screen.

## What the suite now proves (one Maestro flow, ~2.5 min)

1. Midwife: login → Midwife Dashboard → create contract → confirm OK → send to mom
2. App-state resolver pulls the new contract's `contract_id` **and `signing_token`** from the backend (fail-fast if none/ambiguous)
3. Mom: login → Save-Password sheet dismissed → pending contract card visible
4. Deep link (with token) → Midwifery Services Agreement screen → scroll to signer name → erase prefill → type name → dismiss keyboard → check agreement box → tap Sign Agreement
5. `POST /api/midwife-contracts/{id}/sign` → 200 → "Contract Signed!" alert → OK
6. Phase 4: backend verifies a Signed contract with a client signature on record

## The three stacked root causes (why runs 20–26 failed)

| # | Cause | Fix |
|---|---|---|
| 1 | `frontend/.env` pinned a dead backend port (`:8899`) — Expo inlines dotenv over shell env, logins silently hit nothing | Rewrote `.env`/`.env.e2e` to `:8011`; runner now fail-fasts on unreachable backend and greps the served bundle for the stale URL |
| 2 | iOS 26 strong-password autofill ate the typed password into the field's autofill buffer | `textContentType: 'none'` for inputs when `EXPO_PUBLIC_E2E=1`; login flow uses ids + dismisses the "Save Password?" sheet (`Not Now`) before asserting |
| 3 | Mom-side card tap never fired — card renders below the fold (a11y bounds y ≈ 892 vs 874 viewport); iOS 26 Maestro swipes don't scroll that ScreenView and composite a11y labels (`…, ›`) break text matching | Navigate via the app's public deep link `truejoybirthing://sign-midwife-contract?contractId=…&signingToken=…` after asserting the card exists; sign-screen controls reached with `scrollUntilVisible` by id |

Two follow-on bugs the flow then exposed, both fixed:
- Sign POST 403: deep link must carry `signing_token` (resolver now captures it).
- Keyboard stayed up after name entry → checkbox/Sign taps hit the keyboard. `hideKeyboard` inserted; `eraseText: 50` clears the prefilled name.

## App-code changes (all small, non-behavioral for users)

- `sign-midwife-contract.tsx`: `agreement-checkbox` and `download-pdf-btn` get real `testID`s (were `data-testid`, invisible to iOS a11y); financial display falls back to `retainer_amount` (deposit showed **NaN**) and `remaining_balance_due_description` (balance-due showed bare "weeks"). Verified on screen: Deposit $1,500.00, "Balance Due By: 36 weeks gestation".
- kept the two `[E2E]`-gated console.logs in login/auth store — E2E-only, proved useful, no prod exposure.

## Harness changes

- `run_e2e.sh`: `SCRIPT_DIR` pinned via `BASH_SOURCE` (Phase-4 verify path and results dir broke when the script cd'd to `frontend/ios`); each full run now writes `results/<stamp>.md` with contract id + signer via `write_stamp.py` (previously it only *claimed* a result file existed).
- `verify_backend.py`: `--submission-id` now optional; without it, Phase 4 verifies the native midwife-contract path (Signed + signature) instead of DocuSeal.

## Known minor gaps (not blocking, for the backlog)

- "On-Call Period: - weeks" and empty "Birth Location" on the sign screen — the midwife create-contract form doesn't collect/require them yet. Display fine, data empty.
- Suite covers the midwife→mom happy path; duplicate-contract guard and PDF download leg are separate steps in the flow file already.

Run log: `/tmp/tjb-e2e-full27.log` · Maestro artifacts: `~/.maestro/tests/2026-09-29_142612/`