# Actionable Items in TJB Mobile Messages — Audit & Lifecycle Recommendation

*Date: 2026-09-17 · Scope: mom-side actionable items (invoices, contracts) · Analysis only, no code changes*
*Mockup reference: `surfaces-2026-09-14/s9-messages.png` ("Doula Renée — INVOICE — Awaiting payment · $450")*

---

## 1. Current implementation — what exists today

### Where actionable items surface (mom side)

| Surface | What shows | Source |
|---|---|---|
| **Home** (`frontend/app/(mom)/home.tsx` L348–412) | "Action Required" section: `Contract to Sign` cards (routes to `/sign-contract` or `/sign-midwife-contract` by role) + `Invoice - $X` cards (routes to `/(mom)/invoices`) | Fetches `/mom/contracts` (client-side filter: status `Sent`) and `/mom/invoices` (filter: `Sent`/`pending`) |
| **Messages** (`frontend/app/(mom)/messages.tsx` L634–693) | "Pending Invoices" section above the conversation list: amount, description, "From", status badge ("Awaiting Payment" / "Pending"), due date, payment instructions inline, disclaimer, count badge | Fetches `MOM_INVOICES`, client-side filter: `pending`/`sent` only. **No contracts in messages at all.** |
| **Invoices tab** (`frontend/app/(mom)/invoices.tsx`) | Full invoice list incl. `Paid`/`Cancelled` with status badges, detail modal with payment instructions | **Hidden from tab bar** (`_layout.tsx` L139: `href: null — "invoices accessed via messages"`) but still routable — home's invoice card routes here |

The tab bar badge on Messages (`_layout.tsx` L147) reflects **unread chat messages only**. `badgeStore` defines `contractsToSign` but it is hard-set to `0` (L153–156: "fetched per-screen") — no persistent badge tracks pending actionable items.

### Mockup vs. implementation gap (s9-messages.png)

The approved mockup shows the invoice **integrated into the conversation row itself** ("Doula Renée" avatar + rose `INVOICE` pill badge + "Awaiting payment · $450" + timestamp), i.e. the invoice is a peer of chat threads. The implementation instead renders a **separate "Pending Invoices" section block** with warning-yellow styling, detached from the conversation list. Also: mockup badge is rose (#B87AA0 family); current badge uses `colors.warning`.

### Invoice states (backend/routes/invoices.py)

- Lifecycle: `Draft → Sent → Paid | Cancelled`. Reminders (`/send-reminder`) allowed only while `Sent`; set `last_reminder_sent`.
- **Doula `mark-paid` (L310–354): resolves correctly** — marks mom's `invoice_received`/`invoice_reminder` notifications `read + resolved + resolved_at`, and inserts an `invoice_paid` "Payment Received" notification to mom.
- **Midwife `mark-paid` (L620–633): does NOT resolve mom notifications** and does not send the "Payment Received" notification — parity bug with the doula flow.
- Mom's invoice endpoints (`backend/routes/mom.py` L437–465) return **all** invoices from active relationships; every screen re-filters client-side. No server-side "pending" query.

### Contract states (backend/routes/contracts.py)

- Lifecycle: `Draft → Sent` (provider signature applied on send) `→ Signed` (client signs via token-validated endpoint) → client record set to `Contract Signed`; provider gets `contract_signed` notification.
- **The mom gets no in-app notification when a contract is sent** (only an email with signing link), and there is no `contract_signed` notification back to the mom.
- Mom's `/mom/contracts` (mom.py L403–434) returns **all statuses unfiltered**; home filters client-side to `Sent`. Once signed, the card disappears from home on next fetch — silent removal, no confirmation shown to mom anywhere (sign screens show a "Contract Signed" success state, but nothing surfaces afterward).

### Display correctness verdict

- **Invoice card in messages is read-only** — it is a `Card`, not tappable; no navigation to detail, no deep link to the hidden invoices tab. The mockup implies the row is interactive. Payment instructions are shown inline (good), but "Paid" state has **no surface in messages** — the card just vanishes on refetch, and the hidden invoices tab is the only place a receipt-like status exists.
- **Contract-to-sign exists ONLY on home**, despite being the archetype of an actionable message. Mom discovery depends on opening Home.
- Both surfaces duplicate the fetch+filter logic independently; they can disagree after a refresh until both re-fetch.

---

## 2. Recommended lifecycle for actionable message cards

### Recommended state machine

```
                    ┌──────────────┐
   provider sends → │ AWAITING     │ ── mom acts ──→ ACTED (brief confirm) → RESOLVED
                    │ ACTION       │                    │
                    └──────────────┘                    ▼
                          │ stale >14d          resolved row in History
                          ▼                     (collapsible "History" section)
                    softened card (no red/badge escalation,
                    "Details in Invoices" affordance) → auto-archive at 30d
```

**States (4):**
1. **Awaiting action** — full card with pill badge (mockup style), CTA chevron, tappable to the action surface.
2. **Acted / pending confirmation** — for invoices (payment happens off-platform): tapping "I've paid" (or paying via instructions) should mark the card "Payment processing — your provider will confirm" instead of waiting for the provider's manual mark-paid. For contracts, this state is instantaneous (signature = done).
3. **Resolved** — card collapses to a one-line receipt/confirmation row: "Invoice #TJ-2026-004 · $450 · Paid Sep 17 ✓" (sage, no warning color), or "Contract with Renée · Signed Sep 17". Auto-collapses after the mom sees it.
4. **Archived/History** — resolved rows age into a collapsed "History" section at the bottom of messages; never deleted.

### Auto-resolve triggers

| Event | Backend trigger (exists today?) | Card behavior |
|---|---|---|
| Invoice paid | Provider `mark-paid` (doula yes; **midwife missing** — fix parity) | Card collapses to receipt line; `invoice_paid` notification already exists for doula flow — reuse it as the collapse trigger |
| Invoice cancelled/refunded | `cancel` exists; **no refund state** | Card disappears from pending; receipt line shows "Cancelled — contact {provider}" |
| Contract signed | `sign` endpoint sets `Signed` (exists) | Card disappears from awaiting; moves to **Documents** (contracts are documents, not chat history) + one-line "Signed ✓" row in History |
| Invoice aging | **None today** — pending cards persist forever | See aging below |

### Aging behavior (anti-lingering rules)

- **Day 0–7:** full emphasis (badge, rose/warning accent, tappable).
- **Day 8–14:** soften — keep in list but drop to neutral styling (no urgent color), subtitle "Due Sep 24 · details in Invoices". No badge escalation; calm brand law over alarm.
- **Day 15+:** move out of the primary pending section into a collapsed "Older items" row at the bottom of messages ("2 older invoices — view"). One tap reveals them.
- **Day 30+:** auto-archive to History only; never pinned on home.
- **Reminders:** the provider-side `send-reminder` is manual today and unlimited — add a **cooldown (max 1 reminder / 7 days per invoice)**, and never more than 2 reminders per invoice before it stops nudging (reminder-fatigue cap). In-app reminders should reuse the existing notification pipeline, and resolved invoices must immediately suppress queued reminders (doula flow already resolves `invoice_reminder` notifications on mark-paid; keep that).

### Where should they surface — ONE recommendation

**Recommendation: single source of truth in Messages (per the approved mockup), with a lightweight Home digest that is a *count*, not a duplicate list.**

Reasoning:
1. **The mockup (s9-messages.png) is approved and puts the invoice in the message list** — as a conversation-peer row. Duplicating full invoice cards in two places (current home + messages) guarantees drift (already true: different filters, different styles) and double notification surface.
2. **Actionable items are conversational in nature here** — "Renée sent you an invoice" is a message-shaped event; the reply surface ("questions about this invoice?") is the chat thread. Money + questions belong together.
3. **Home's job is orientation, not task tracking** — Jeff originally expected invoices on home; the compromise that respects both: home shows one quiet line "1 invoice awaiting payment · 1 contract to sign →" that deep-links into messages (or the invoices tab), and disappears entirely when count = 0. No separate home card per item.
4. **Resolve-once semantics:** the backend already ties resolution to notifications (`mark-paid` resolves them). Making the messages list the canonical card surface means resolution, receipt lines, and history all live in one data flow instead of two independently-polled screens.

**Contract-to-review specifically:** contracts should surface as an actionable message row in messages ("Doula Renée — CONTRACT — Awaiting your signature") *and* remain reachable from a Documents area after signing (contracts are records, not chat). Today they only appear on home — move the pending view into messages, and route the post-signature record to a documents list (currently signed contracts are only retrievable via email PDF).

---

## 3. Contract-to-review treatment (repo has full doula + midwife contract flows)

- Flows exist end-to-end: creation → provider e-sign on send → email with tokenized signing URL (`/contract/{id}`) → client signs (`sign-contract.tsx` / `sign-midwife-contract.tsx`) → `Signed` status + countersign notification to provider + signed-PDF email to both parties.
- Gaps to close under the recommended lifecycle:
  1. **No mom-side notification on send** — mom learns of a contract only via email or by happening to open Home. Add a `contract_sent` actionable message row at send time.
  2. **No "Signed ✓" confirmation to mom** in-app (the sign screen shows success once, then the card silently vanishes from home on next fetch). Add the resolved receipt row per §2.
  3. **No document home for signed contracts** — signed PDFs exist only in email. Recommend a lightweight Documents surface (or a "History" section in messages) listing signed contracts + paid invoices as records.
  4. `/mom/contracts` returns all statuses and every screen re-filters — add server-side status filtering (`?status=Sent`) so pending-state logic lives in one place and can't drift between screens.

## 4. Edge cases

- **Disputed invoice:** no dispute state exists. Recommended: mom-side "Question about this invoice?" action that opens the chat with that provider (message-shaped resolution path fits the mockup) and marks the card "Under discussion" (lavender, not warning) so the provider can see it's contested before marking paid. Provider keeps sole authority to mark paid/cancelled — TJB does not process payments (existing disclaimer is correct and must stay).
- **Refund:** no refund state in the invoice model. Add a `Refunded` status so a previously-Paid receipt line can update to "Refunded Sep 20" rather than silently staying "Paid". Never delete invoice records (audit trail; deletion is already Draft-only in the API — keep that).
- **Reminder fatigue:** provider-side reminders are manual and unlimited today. Cap at 2 reminders per invoice with a 7-day cooldown (store `last_reminder_sent` — field already exists); after the cap the card softens to the neutral "details in Invoices" state rather than escalating. Never re-nudge a resolved invoice (doula mark-paid already resolves reminder notifications; extend to midwife).
- **Multiple providers / multiple invoices:** the pending section should group by provider (mockup shows per-provider rows); never show more than ~3 pending cards before an overflow line ("+2 more invoices").
- **Stale relationship:** mom endpoints already filter to active provider relationships — keep this so cards from ended relationships disappear rather than linger (this is the one lingering-case the backend already handles well).

---

## Bottom line

Actionable cards are *displayed* reasonably (clear badges, amounts, instructions, disclaimers) but *lifecycle* is incomplete: midwife paid-invoices never resolve mom's notifications, the messages invoice card is inert (untappable), contracts never surface in messages at all, resolved items vanish silently with no receipt line, and pending items have no aging behavior so unresolved cards persist indefinitely. Single source of truth in messages (per approved mockup) + count-only home digest + the 4-state lifecycle above fixes all of it without new surfaces.