# Payment-Plan Review — independent-model findings, verified against live code/API (Kit, 9/28)

Source: delegated reviewer (different model, read-only). I then verified every finding
myself — 2 confirmed by live probes, 1 disproven, 2 confirmed by code reading. Fixes below
are scoped to `invoices.py` only; mom.py finding was a false positive.

## Verified findings (probed against running backend)

1. **[CONFIRMED — money-data corruption] Concurrent mark-paid loses updates.**
   `invoices.py:1087-1180` (both doula + midwife routes). Read-modify-write of the whole
   `payment_plan` doc. Live probe: mark #1 + #2 concurrently → installments `['paid','due','due']`,
   installment 2's payment silently wiped.
   **Fix:** atomic conditional update per installment:
   `update_one({'invoice_id': id, 'payment_plan.installments.installment_no': n, 'payment_plan.installments.status': {'$ne': 'paid'}}, {'$set': {'payment_plan.installments.$.status': 'paid', 'updated_at': now}})`; if matched_count==0 → re-read and return already-paid/404. Then recompute roll-up from a fresh read, not the pre-write snapshot.

2. **[CONFIRMED] Second POST /payment-plan silently overwrites existing plan — even with
   payments already made.** `invoices.py:1034-1085`. Probe: 3×200 plan, mark #1 paid,
   POST 2×300 plan → 200, history wiped. Also allows attaching a plan to a fully Paid invoice.
   **Fix:** 409 if `payment_plan` already exists unless explicit `?replace=true`; reject
   plan creation when invoice.status == 'Paid' or any installment is paid.

3. **[CONFIRMED — rounding] Installment math ignores the invoice total.**
   `invoices.py:146-150`. `build_payment_plan(plan_data.dict())` — payload has no `amount`
   key → `invoice_amount=None` → rounding block never fires. Live probe: $1000 invoice,
   3×333.33 → plan total 999.99. Mom would pay $0.01 less than invoiced; totals desync.
   **Fix:** pass invoice amount into build_payment_plan (create-plan routes already have the
   invoice doc); compute in cents; last installment = total − sum(others); validate sum ==
   invoice amount or 422.

4. **[DISPROVEN] "Crafted payload can inject payment_plan at invoice creation."** Probe:
   POST /midwife/invoices with smuggled `payment_plan` → field ignored (Pydantic strict
   fields + whitelisted dict construction at lines 742-760). No fix needed.

5. **[FALSE POSITIVE] mom.py scoping "fetch-then-check".** Actual code: single `find_one`
   with `invoice_id` AND `client_id ∈ scoped clients` in ONE query. Ownership is inside the
   query; cross-tenant read impossible. No fix needed.

## Minor (accepted, low priority)
- 409-vs-replace UX for plan overwrite (covered by fix 2)
- extract shared `compute_plan_status` (roll-up helper + mark-paid duplicated logic)
- midwife invoice update/delete should filter `provider_id` too (defense-in-depth)
- overdue badge hex → theme token in ProviderInvoices.tsx
- mark-paid response should project plan only, not whole invoice

## Fixes applied (all verified live against the running backend, 9/28)

**FIX 1 — concurrent mark-paid (verified: race 2+3 → both paid; re-mark → 'already paid';
bogus installment → 404; bad token → 401).**
Both mark-paid routes now use an atomic Mongo `arrayFilters` guarded flip
(`$[elem]` where elem.installment_no matches AND elem.status != paid), then recompute the
roll-up from a fresh read. Two subtle Mongo gotchas found and handled while testing:
- `$ne` at doc level on an array path means "no element is paid" — it wrongly matched
  nothing once any installment was paid → arrayFilters per-element instead.
- `updated_at` inside the guarded `$set` made `modified_count==1` on every call (top-level
  field changed), which silently broke already-paid/bogus-number detection → bumped
  `updated_at` only after a real flip.

**FIX 2 — plan overwrite guard (verified: dup POST → 409; `?replace=true` → 200;
replace after a payment → 409; new plan on fully-paid invoice → 409).**
Both create-plan routes now 409 unless explicit `?replace=true`, and refuse to replace a
plan that already has a paid installment or sits on a Paid invoice.

**FIX 3 — installments must sum to the invoice total (verified: 3×333.33 on $1000 →
[333.33, 333.33, 333.34]; 3×400 on $1000 → last auto-corrected to 200; both sum exactly
1000.00).**
`build_payment_plan` now receives the invoice amount from the create-plan routes and
corrects the last installment to absorb rounding; rejects (422) if still off. The invoice
total is the source of truth — mom can never be charged more/less than invoiced.

**Disproven (no fix needed):** injected `payment_plan` at invoice creation (Pydantic strict
fields ignore extra keys — probed, absent); mom.py cross-tenant read (ownership filter is
inside the single Mongo query).

## Verdict
FIX_FIRST → all three majors fixed and proven by live probes + the 8-step regression
harness (8/8 PASS post-fix). Remaining minor items are polish, not blockers. Feature is
sound to deploy behind a flag.