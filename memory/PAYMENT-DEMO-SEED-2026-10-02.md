# TJB 10/02 — Payment demo seed & full-flow verification (demo mom)

Commit: `55faf2fb85699ebc6ff82cc84a4e74ff57229873` (main, pushed)

## What was seeded (backend/ensure_demo_accounts.py)

`_seed_payment_plan_invoice()`, called from
`_seed_demo_data()` after the doula invoice block. Idempotent upserts, same
style as the rest of the file:

1. **Invoice** `demo_inv_plan_01` (unified `invoices` collection — this is what
   GET /mom/invoices reads):
   - MIDWIFE provider = `demo_midwife_b0d0c0c4` (Emily Thompson), client "Emma Johnson"
   - amount 4500.00, status "Sent", paid_at null
   - `payment_plan` subdoc key-for-key matches `build_payment_plan()` output
     (routes/invoices.py:114-123 / 168-178): installment_count,
     amount_per_installment, plan_description, due_frequency, first_due_date,
     installments[{installment_no, amount, due_date, status}], total_amount, status
   - 3×1500; it1 PAID (due 22d ago), it2 due 8d, it3 due 38d; rollup `partial`
2. **Client row** `demo_client_mw_plan01` (unified `clients` collection):
   linked_mom_id = demo_mom_9a4f919b, provider_id = demo midwife, MIDWIFE, Active.
3. **share_request** `share_demo_mw_plan01` (or reuses/activates an existing
   mom↔midwife row): status accepted, relationship_status active.

## How GET /mom/invoices selects rows (the linking answer)

`backend/routes/mom.py get_mom_invoices()`: invoices are selected **NOT by
client_email** but by:

1. `db.clients.find({"linked_mom_id": user.user_id})` → client_ids
2. Intersected with `get_active_provider_ids_for_mom()` — accepted
   `share_requests` rows with relationship_status active
3. `db.invoices.find({"client_id": {"$in": client_ids}})`, sorted created_at desc

So linking field = `clients.linked_mom_id` (cross-checked against active
share_requests). Seeded invoice sets `provider_id` = midwife user_id,
`provider_type` MIDWIFE, `client_id` = the new client row.

## How the mom "makes a payment" (finding)

No mom-side payment API exists by design (App Store rule: app never processes
payments). Direct-to-provider model:

- Mom: Invoices screen → invoice → payment instructions / copy handles (Venmo,
  Cash App, PayPal, Zelle from `provider_payment_methods`) → pays outside the
  app → "I've Paid — Notify My Provider" button =
  `POST /mom/invoices/{id}/acknowledge-payment` → status "Payment Claimed",
  never "Paid"; provider notified (routes/mom.py:552-617).
- Provider confirms real money arrived:
  `POST /midwife/invoices/{id}/payment-plan/installment/{n}/mark-paid`
  (routes/invoices.py:1186). Installs flip only unpaid matching installments;
  rollup recomputed via `_rollup_status`; on all-paid flips invoice to "Paid"
  + paid_at. Doula twin exists. Mom's list/detail views re-render "2/3 paid"
  etc. from `invoice.payment_plan` (invoices.tsx planChip + Payment Schedule
  modal; detail modal falls back to GET /mom/invoices/{id}/payment-plan).

## Jeff tap path (dev, from sign-in)

1. App home → **Action Required → "Invoice — $4500"** card (or Messages →
   Pending Invoices) → opens **Invoices** screen.
2. Card "Comprehensive Midwifery Care — Payment Plan (3 installments)"
   shows chip **"1/3 paid"** + status "Sent". Tap **View Details**.
3. Modal: Amount Due $4,500 · plan badge "Partially Paid" (lavender) ·
   Payment Schedule rows: Installment 1 Paid (+8d future: Installment 2 ·
   $1,500 · Due <+8d>, Installment 3 · $1,500 · Due <+38d>).
4. Pay outside app: Zelle `billing@hillcountrymidwifery.com` or Venmo
   `@hillcountry-midwifery` (seeded payment_instructions_text).
5. Tap **"I've Paid — Notify My Provider"** → invoice flips to "Marked as
   Paid" pending badge; provider gets notified.
6. Dev-only plan advance (what the demo contract flow uses; verified below):
   as Emily Thompson midwife, POST mark-paid installment 2 → mom's invoice
   card chip shows **"2/3 paid"**; still "Sent" until all 3 → "Paid in Full".

## Live verification (backend on :8011, harness env, DB truejoybirthing_test)

Started via e2e-simulator/serve-backend.sh (GW_E2E=1 etc.). Login as demo mom
works (`DemoMom2024!`).

**BEFORE (GET /api/mom/invoices) — the seeded invoice:**

```
{
 "invoice_id": "demo_inv_plan_01",
 "invoice_number": "INV-PLAN-001",
 "provider_name": "Emily Thompson", "provider_role": "MIDWIFE",
 "amount": 4500.0,
 "status": "Sent", "paid_at": null,
 "payment_plan": {
   "installment_count": 3,
   "amount_per_installment": 1500.0,
   "plan_description": "3 monthly installments of $1,500",
   "due_frequency": "monthly",
   "first_due_date": "2026-09-10",
   "installments": [
     {"installment_no": 1, "amount": 1500.0, "due_date": "2026-09-10", "status": "paid"},
     {"installment_no": 2, "amount": 1500.0, "due_date": "2026-10-10", "status": "due"},
     {"installment_no": 3, "amount": 1500.0, "due_date": "2026-11-09", "status": "due"}
   ],
   "total_amount": 4500.0,
   "status": "partial"
 }
}
```

(Plus the pre-existing doula invoice demo_inv_b30cdfe7, $1800, status "Paid",
untouched — the history item mom still sees.)

**Dev payment (what the flow's mark-paid step runs):**

```
POST /api/midwife/invoices/demo_inv_plan_01/payment-plan/installment/2/mark-paid
→ 200 {"message": "Installment 2 marked paid",
       "payment_plan": {... status: ..., installment 2 → "paid"}}
```

**AFTER (GET /api/mom/invoices):** same invoice, installment 2 `"status":
"paid"`; rollup still "partial" (1 remaining due) — i.e. plan advanced
**1/3 → 2/3 paid** exactly as the UI chip renders; mom's Payment Schedule row
for installment 2 flips to "Paid".

## Ad-hoc verification (hermes-verify-payment-seed, 8/8 PASS)

Temp script `hermes-verify-payment-seed-*.py` (under /private/var/folders/.../T,
deleted after run) executed with repo .venv python against the live :8011
backend and dev DB — ad-hoc verification, not a suite run:

1. server-health — GET :8011/docs 200 (script auto-restarts the backend if down)
2. helper-payment_plan_subdoc — key set exact vs build_payment_plan; offsets
   −22/+8/+38 days; rollup due|partial|paid per paid_nos
3. helper-mark_plan_installments_paid — partial → paid (full doc: status
   Paid + paid_at) → due transitions
4. seed-rows-and-linking — invoice demo_inv_plan_01 in db.invoices
   (provider=MIDWIFE demo_midwife_b0d0c0c4, client demo_client_mw_plan01,
   amount 4500, Sent/paid_at None, exactly [1] paid); client row has
   linked_mom_id=demo_mom_9a4f919b + Active; share_request accepted/active
5. reseed-idempotency — second ensure_demo_accounts run: no duplicate rows,
   paid set preserved
6. api-mom-sees-plan-1of3 — login demo mom → GET /api/mom/invoices 200 →
   owed=4500.0, paid_so_far=1500.0, next_due=2026-10-10, provider_name
   Emily Thompson, statuses [paid, due, due]
7. api-mark-paid-advances-2of3 — midwife login → POST installment/2/mark-paid
   200 → mom GET again shows [paid, paid, due] (2 of 3, rollup partial)
8. baseline restored — arrayFilters update flips installment 2 back to due →
   mom GET shows [paid, due, due]; final DB state verified
   (1 row each in invoices/clients/share_requests; paid doula invoice
   demo_inv_b30cdfe7 untouched with paid_at 2026-08-27)

## Notes / caveats

- Mom role has NO "make a payment" endpoint by design (direct-to-provider,
  App Store compliance) — the demo money flow is mom acknowledges + provider
  mark-paid. This is correct per routes and per 9/11 council Q3 decision.
- Seeded installments use relative dates at seed time (now −22 / +8 / +38
  days), so each startup re-seed keeps the "2 due in 8 days" spacing Jeff
  asked for. Idempotency: on reseed the invoice row is replaced with the
  canonical shape but already-paid installments (marked by the provider via
  mark-paid) are re-applied and preserved — the plan never rolls back.
- Demo midwife payment_instructions_text is fake-looking (hillcountry...) —
  fine for demo, never touches real money.
- Dev harness fee hooks were NOT needed here; the seeded invoice already
  carries payment_plan, so existing /mom/invoices consumers (home
  Action Required, Messages Pending Invoices, Invoices screen) render it
  without changes.
- verify_payment_plans.py 11/11 harness was the reference for plan shape and
  the midwife mark-paid flow; its own fixtures (pp_ emails, distinct
  invoice_ids) are untouched by this seed.

## Files changed

- backend/ensure_demo_accounts.py: new `_seed_payment_plan_invoice()` +
  `_payment_plan_subdoc()` + `_mark_plan_installments_paid()` helpers,
  called from `_seed_demo_data()`. Note: this commit also carries the
  10/01 profile-picture additions that were already unstaged in the same
  file when this task started (+231/−9 total; the pure payment-plan
  additions start at the "Unpaid payment-plan invoice" block).
- Untracked: memory/PAYMENT-DEMO-SEED-2026-10-02.md (this file).