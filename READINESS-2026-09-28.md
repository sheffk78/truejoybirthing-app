# TJB Mobile — Test & Deployment Readiness (2026-09-28)

Jeff's question: "Have we done everything we can to test and get the code ready and deployed?"

## Short answer
Testing: yes for backend + harnesses. Deployment: NO — prod runs 9/26 rollback code, and the payment-plan work is uncommitted. Two blockers + one decision.

## What's verified today
- Full backend suite: 1,170 passed / 255 failed / 40 errors (residual = test-data gaps, not API bugs)
- Duplicate-contract regression: 13/13
- DocuSeal render: values painted on contract PDF, decoded from real file
- Payment-plan harness: 8/8 PASS, idempotent (rerun proves it) — scripts/verify_payment_plans.py
- Prod backend probe: live + healthy, duplicate endpoints present (401 = auth-gated)

## Deployment posture (real state, verified)
- Prod: truejoybirthing-app SUCCESS 9/26 (rollback dep) — payment-plan endpoints 404 in prod
- Uncommitted: 10 real files (auth.py rate-limit bypass, invoices/mom payment-plan, ProviderInvoices, api.ts) + 5 test scripts + e2e-simulator/
- origin/main = 2a242436 (9/25) — committed work IS pushed

## To close the gap (in order)
1. Run full suite once more green-enough → commit the 10 files → push (Kit)
2. Railway deploy via deploy-preflight gate (Kit, gated)
3. Probe prod: payment-plan route 200, duplicate 401
4. App build → e2e-simulator run (blocked on build)

## Decision needed from Jeff
- Deploy payment-plan now (behind flag) or hold until mobile UI ships it?
- Remaining ~295 suite failures: triage-and-fix before deploy, or defer (they're data-gaps)?

## Harness fixes this session (root-caused, not patched around)
1. Client create ignores client_id → read returned id
2. Invoice create ≠ plan attach (two steps by design) → harness does both
3. Mom scoping needs active share_request → seeded idempotently
4. register() collided main/orphan mom on one email → name-slugged emails
5. t8 expectation 403→404: API info-hides (no existence leak) — correct behavior, test updated