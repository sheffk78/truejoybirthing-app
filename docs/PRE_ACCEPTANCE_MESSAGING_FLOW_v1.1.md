# Pre-Acceptance Messaging Flow Design — TJB Mobile App
## Version 1.1 — Validated against codebase | 2026-08-10

---

## 1. Problem Statement

**Current behavior:** A Mom finds a provider in the marketplace, taps "Message," and the backend blocks the message with `403` unless there is already an accepted `share_request` (`status="accepted"`, `relationship_status="active"`) or a linked `clients` record. The Mom must first share her birth plan / request connection, the provider must accept, and ONLY THEN does messaging unlock.

**Desired behavior:** Mom and provider can message back and forth BEFORE the provider formally accepts the Mom as a client. This "pre-acceptance chat" allows both parties to ensure a good connection. The provider can then "Accept as Client" from within the chat, which transitions the thread into a full client relationship.

---

## 2. Design Principles

1. **No gate on first message.** Any Mom can message any marketplace provider without prior acceptance.
2. **Provider controls acceptance.** The provider decides when (or whether) to formally accept the Mom as a client.
3. **Clear visual distinction.** Both sides can instantly tell whether a conversation thread is "pre-acceptance" (exploratory) or "accepted client" (active care relationship).
4. **Preserve existing data model.** The `share_requests` and `clients` collections remain the source of truth for formal relationships. A new lightweight entity tracks pre-acceptance conversation state.
5. **Provider-side leads integration.** Pre-acceptance messaging feeds naturally into the existing `leads` flow.

---

## 3. Data Model

### 3.1 New Collection: `conversation_threads`

Tracks the conversational relationship between a Mom and a provider, independently of formal client status.

| Field | Type | Description |
|---|---|---|
| `thread_id` | string | `thread_<uuid>` |
| `mom_user_id` | string | FK to users |
| `provider_id` | string | FK to users |
| `status` | enum | `pre_acceptance` \| `accepted` \| `declined` \| `terminated` |
| `source` | enum | `marketplace_message` \| `team_share` \| `lead_conversion` |
| `accepted_at` | datetime | null until provider accepts |
| `accepted_by` | string | provider user_id |
| `declined_at` | datetime | null until declined |
| `decline_reason` | string | optional, provider-facing only |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `metadata` | object | `{ mom_first_message, provider_first_reply, lead_id }` |

**Indexes:**
- `{ mom_user_id: 1, provider_id: 1 }` — unique compound index
- `{ provider_id: 1, status: 1 }`
- `{ mom_user_id: 1, status: 1 }`
- `{ updated_at: -1 }`

### 3.2 Modified Collection: `messages`

Add `thread_id: string | null` to every message document. Backfill for existing messages by looking up `conversation_threads` or creating legacy threads with `status="accepted"`, `source="team_share"`.

### 3.3 Unchanged Collections (still used for formal acceptance)

| Collection | Role in new flow |
|---|---|
| `share_requests` | Still created when provider accepts from chat. `status="accepted"` + `relationship_status="active"` remains the formal acceptance signal. |
| `clients` | Still created on acceptance. Provider’s client list still pulls from here. |
| `leads` | Still tracks the consultation funnel. A pre-acceptance thread may optionally link to a lead record via `metadata.lead_id`. |
| `notifications` | No schema changes; new notification types added (see §7). |

---

## 4. Backend API Changes

### 4.1 `POST /messages` — Send Message (permission check rewrite)

**Current:** `check_provider_can_message()` returns true only if active `share_request` OR linked `client` exists. Otherwise 403.

**New permission logic:**

```
Allow message if ANY of:
  a) Active share_request exists (existing logic) → thread_status = accepted
  b) Active clients record exists (existing logic) → thread_status = accepted
  c) conversation_thread exists with status = pre_acceptance OR accepted
  d) Sender is MOM, receiver is DOULA/MIDWIFE/LACTATION → AUTO-CREATE pre_acceptance thread
```

**Auto-create on first Mom→Provider message:**
- Insert `conversation_thread` with `status="pre_acceptance"`, `source="marketplace_message"`, `mom_first_message` set to content.
- Optionally create `leads` record with `status="consultation_requested"` if none exists for this pair.
- Store message with `thread_id`.

**Provider→Mom restrictions:**
- Allowed if thread exists and status is `pre_acceptance` or `accepted`.
- Blocked (403) if status is `declined` or `terminated`.
- Provider CANNOT cold-message a Mom who has not messaged them first.

### 4.2 `GET /messages/conversations` — List Conversations (enhanced)

**New response shape:**

```json
{
  "conversations": [
    {
      "other_user_id": "...",
      "other_user_name": "...",
      "other_user_role": "...",
      "other_user_picture": "...",
      "last_message_content": "...",
      "last_message_time": "...",
      "unread_count": 2,
      "thread_status": "pre_acceptance",
      "source": "marketplace_message",
      "can_accept": false,
      "can_decline": false
    }
  ]
}
```

- `can_accept` / `can_decline` are `true` ONLY when the current user is the provider AND `thread_status == "pre_acceptance"`.
- Sort by `updated_at` (thread) or last message time, newest first.
- Merge legacy accepted conversations (from `messages` aggregation) with thread-based conversations.

### 4.3 `GET /messages/{other_user_id}` — Get Thread Messages (enhanced)

Returns messages + thread metadata:

```json
{
  "messages": [...],
  "other_user": { ... },
  "thread": {
    "thread_id": "thread_xyz",
    "status": "pre_acceptance",
    "created_at": "...",
    "accepted_at": null,
    "can_accept": true,
    "can_decline": true,
    "decline_reason": null
  }
}
```

### 4.4 NEW: `POST /messages/threads/{thread_id}/accept`

**Who:** Provider only. **When:** `thread.status == "pre_acceptance"`.

**Atomic actions:**
1. Update `conversation_thread` → `status="accepted"`, set `accepted_at`, `accepted_by`.
2. Create/update `share_request` → `status="accepted"`, `relationship_status="active"`.
3. Create/update `clients` record → `status="Active"`, linking `provider_id` + `linked_mom_id`.
4. Update `leads` → `status="converted_to_client"` (if exists).
5. Send notification to Mom: `"Welcome! {provider_name} has accepted you as a client."`
6. Return `{ thread_id, client_id, share_request_id }`.

### 4.5 NEW: `POST /messages/threads/{thread_id}/decline`

**Who:** Provider only. **When:** `thread.status == "pre_acceptance"`.

**Actions:**
1. Update `conversation_thread` → `status="declined"`, set `declined_at`, optional `decline_reason`.
2. Update `leads` → `status="declined"` (if exists).
3. Send notification to Mom: `"{provider_name} is unable to take on new clients at this time."`
4. Block further messaging in this thread.

### 4.6 NEW: `GET /provider/pre-acceptance-threads`

Returns all `conversation_threads` where `provider_id == current_user` and `status == "pre_acceptance"`, enriched with Mom profile info (EDD, picture, birth plan completion %). Powers a dedicated "New Inquiries" view on the provider side.

---

## 5. Complete User Journeys

### 5.1 Mom Journey: First Contact → Pre-Acceptance Chat → Accepted Client

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Marketplace | Mom browses providers, taps **"Contact"** on a provider card. | — |
| 2 | Marketplace | Modal appears with pre-filled message. Mom edits, taps **"Send Message."** | `POST /messages` → no formal relationship exists → **auto-creates** `conversation_thread` (`status=pre_acceptance`, `source=marketplace_message`). Optionally creates `leads` record (`status=consultation_requested`). Message stored with `thread_id`. |
| 3 | Messages (Mom) | Mom is navigated to Messages screen. Conversation appears at top with **yellow badge** "Getting to know each other." | `GET /messages/conversations` returns thread with `thread_status="pre_acceptance"`. |
| 4 | Messages (Mom) | Mom sees chat UI. Input field is active. She sends more messages. | Each message stored with `thread_id`. No 403. |
| 5 | Provider Inbox | Provider receives push notification: **"New message from {mom_name}"**. | Notification type: `pre_acceptance_message`. |
| 6 | Provider Messages | Provider sees conversation in inbox with **blue "New Inquiry" badge**. Unread count shown. | `GET /messages/conversations` returns thread with `can_accept=true`, `can_decline=true`. |
| 7 | Provider Chat | Provider opens chat. **Persistent banner** reads: "Getting to know each other. Accept or decline when ready." Two buttons: **"Accept as Client"** and **"Decline"**. | `GET /messages/{mom_id}` returns messages + thread metadata. |
| 8 | Provider Chat | Provider replies to Mom’s questions. | Messages flow normally. Thread stays `pre_acceptance`. |
| 9 | Provider Chat | Provider taps **"Accept as Client"** → confirmation modal: "Accept {mom_name} as a client? This unlocks scheduling, contracts, and birth plan sharing." | `POST /messages/threads/{thread_id}/accept` atomically: thread→`accepted`, share_request→`accepted`, client record created, lead→`converted_to_client`. |
| 10 | Messages (Mom) | Mom receives push: **"{provider_name} has accepted you as a client! 🎉"**. Badge changes from yellow to green **"Active Client"**. | Thread status now `"accepted"`. |
| 11 | Messages (Both) | Both continue chatting. Birth plan sharing, contracts, appointments all unlock via existing `share_request`/`clients` machinery. | Existing features work as before. |

### 5.2 Mom Journey: Provider Declines

| Step | Screen | Action |
|---|---|---|
| 1 | Messages | Mom receives push: **"{provider_name} is unable to take on new clients at this time."** |
| 2 | Messages | Conversation is **grayed out** with "Declined" badge. Input field disabled with placeholder: "This provider is unable to work together at this time." |
| 3 | Messages | Mom can archive/hide the thread or return to marketplace to find another provider. |

### 5.3 Provider Journey: Receiving a Pre-Acceptance Inquiry

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Dashboard | Provider sees notification: **"New consultation request from {mom_name}"**. | Notification created on thread creation. |
| 2 | Provider Messages | Inbox shows **two sections**:<br>1. **"New Inquiries"** (pre_acceptance threads) — accent background, includes EDD, profile picture, last message preview.<br>2. **"My Clients"** (accepted threads) — normal appearance. | `GET /messages/conversations` groups by `thread_status`. |
| 3 | Provider Chat | Provider opens thread. Sees full history. Banner with **"Accept as Client"** and **"Decline"** CTAs. | Thread metadata returned with `can_accept=true`. |
| 4a | Accept Path | Provider accepts → Mom notified → thread moves to **"My Clients"** section. | See §5.1 step 9. |
| 4b | Decline Path | Provider declines → optional reason → thread disappears from active inbox. | `POST .../decline`. Mom can no longer message. |

### 5.4 Provider Journey: Converting from Existing Lead

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Leads | Provider receives consultation request via existing `/leads/request-consultation`. Lead status = `consultation_requested`. | `leads` document created. |
| 2 | Leads | Provider reviews lead, sees Mom’s birth plan summary. | Existing lead detail endpoint. |
| 3 | Leads | Provider taps **"Message"** from lead detail. Creates/opens `conversation_thread` with `source="lead_conversion"`, linked to lead via `metadata.lead_id`. | `POST /messages` with lead context → thread created if not exists. |
| 4 | Chat | Conversation proceeds in pre-acceptance mode. | Same pre-acceptance flow. |
| 5 | Chat | Provider taps **"Accept as Client"** from chat. | Thread→`accepted`. Lead→`converted_to_client`. Share_request→`accepted`. Client record created. |

---

## 6. Where the "Accept as Client" Action Lives

| Location | Role | When Visible |
|---|---|---|
| **Provider Chat Header Banner** | Primary CTA | Always visible when `thread_status == "pre_acceptance"` and current user is the provider. |
| **Provider Messages Inbox** | Contextual action | Each pre-acceptance thread card in "New Inquiries" section may show an **"Accept"** quick-action button alongside the thread preview. |
| **Lead Detail Screen** | Alternative entry | Provider can also convert a lead to client from the existing Leads screen (current behavior preserved). |

**The canonical location is inside the chat.** The provider reviews the conversation history, asks questions, and then makes the accept/decline decision without leaving the chat context.

---

## 7. How Pre-Acceptance vs Accepted Threads Are Distinguished

### In Conversation Lists (both Mom and Provider)

| Attribute | Pre-Acceptance | Accepted |
|---|---|---|
| **Badge / Label** | "Getting to know each other" (yellow) | "Active Client" (green) |
| **Section** | Mom: mixed list with badge.<br>Provider: **"New Inquiries"** section at top. | Mom: mixed list with badge.<br>Provider: **"My Clients"** section below. |
| **Unread styling** | Bold + accent dot | Standard unread dot |
| **Action buttons** | Provider sees Accept/Decline CTAs | No action buttons (normal chat) |

### In Chat Detail View

| Attribute | Pre-Acceptance | Accepted |
|---|---|---|
| **Header banner** | Yellow banner with relationship status + Accept/Decline buttons | No banner |
| **Input field** | Enabled (both sides can message) | Enabled |
| **Input field (declined)** | Disabled with explanatory text | N/A |
| **Provider header extras** | Shows Mom’s EDD, birth plan completion %, children count | Shows normal client info |

### Data-level distinction

- `conversation_threads.status` field is the single source of truth: `"pre_acceptance"` vs `"accepted"`.
- The `share_requests` and `clients` collections are NOT queried for UI distinction; they are the formal acceptance mechanism triggered by the accept action.

---

## 8. Notification Handling

| Event | Recipient | Type | Title | Message | Deep Link |
|---|---|---|---|---|---|
| Mom sends first message | Provider | `pre_acceptance_message` | New message from {mom_name} | {preview} | `/messages?threadId={thread_id}` |
| Provider replies | Mom | `message` | {provider_name} | {preview} | `/messages?threadId={thread_id}` |
| Provider accepts | Mom | `client_accepted` | You're a client! 🎉 | {provider_name} has accepted you as a client. | `/messages?threadId={thread_id}` |
| Provider declines | Mom | `client_declined` | Update from {provider_name} | Unable to take on new clients at this time. | `/messages?threadId={thread_id}` |
| Relationship terminated | Mom | `relationship_terminated` | Relationship Ended | {provider_name} has ended your client relationship. | `/messages` |

**Push payload:** Must include `thread_id`, `other_user_id`, `thread_status` so the app routes to the correct chat state.

---

## 9. Thread Status Lifecycle

```
Mom messages provider (first time)
         │
         ▼
  ┌──────────────────┐
  │  PRE_ACCEPTANCE  │ ◄─────────────────────────────┐
  │  (chat unlocked) │                               │
  └────────┬─────────┘                               │
           │                                          │
     ┌─────┴─────┐                                    │
     │           │                                    │
     ▼           ▼                                    │
 Provider    Provider                                   │
 ACCEPTS     DECLINES                                   │
     │           │                                      │
     ▼           ▼                                      │
  ┌──────┐   ┌────────┐                               │
  │ACCEPTED│   │DECLINED│                               │
  │(full   │   │(locked)│                               │
  │ client │   └────────┘                               │
  │ access)│                                            │
  └───┬────┘                                            │
      │                                                 │
      ▼                                                 │
  Provider or Mom                                       │
  TERMINATES                                            │
      │                                                 │
      ▼                                                 │
  ┌───────────┐                                         │
  │TERMINATED │ ──────── NOT reversible ────────────────┘
  │ (locked)  │
  └───────────┘

NOTE: After decline/termination, a NEW thread can be created
if Mom messages again. The old thread remains in its terminal
state for audit/history.
```

---

## 10. Data-Model Implications Summary

| Collection | Change | Impact |
|---|---|---|
| `conversation_threads` | **NEW** | Lightweight, purpose-built for thread state. Does NOT replace `share_requests` or `clients`. |
| `messages` | Add `thread_id` | Allows thread-scoped queries. Backfill migration needed. |
| `share_requests` | **No schema change** | Still the formal acceptance signal. Created on provider "Accept" action. |
| `clients` | **No schema change** | Still created on acceptance. Pre-acceptance threads do NOT create client records. |
| `leads` | **No schema change** | Optional linkage via `conversation_threads.metadata.lead_id`. |
| `notifications` | **No schema change** | New notification types: `pre_acceptance_message`, `client_accepted`, `client_declined`. |

### Key semantic boundaries preserved:
- **"Clients"** = formal care relationships with full feature access (birth plans, contracts, appointments, invoices).
- **"Conversation threads"** = conversational relationships. Pre-acceptance threads grant messaging-only access.
- **"Leads"** = the consultation funnel. A thread may link to a lead but is independent of it.

---

## 11. Frontend Files to Update (Implementation Tracking)

| File | Change |
|---|---|
| `backend/routes/messages.py` | Rewrite permission check, add `thread_id` to messages, add `/threads/{id}/accept` and `/threads/{id}/decline` endpoints. |
| `backend/routes/relationship_utils.py` | Add `get_thread_between()` helper. |
| `frontend/app/(mom)/messages.tsx` | Add thread status badges, pre-acceptance UI banner, remove team-gate from new-message modal. |
| `frontend/app/(mom)/marketplace.tsx` | Remove 403 fallback / "Add to Team First" logic. Update contact flow to expect success. |
| `frontend/app/(mom)/provider-detail.tsx` | Remove team-gate from Message button. Disable Schedule with tooltip until accepted. |
| `frontend/src/components/provider/ProviderMessages.tsx` | Add Accept/Decline CTAs in chat header, two-section inbox ("New Inquiries" / "My Clients"), remove client-only restriction on new messages. |
| `frontend/app/(doula\|midwife\|lactation)/leads.tsx` | Add "Message" button to lead detail that opens pre-acceptance chat. |
| Migration script | Create `conversation_threads` collection, backfill `thread_id` on existing messages. |

---

## 12. Open Decisions

1. **Thread expiry:** Should pre-acceptance threads auto-archive after 30 days of inactivity? *Recommendation: Yes, add `expires_at` field. Re-messaging creates a new thread.*
2. **Re-accept after decline:** Can a provider re-accept a declined thread? *Recommendation: No. Declined is terminal. Mom must initiate a new thread.*
3. **Birth plan visibility in pre-acceptance:** Should provider see Mom’s birth plan completion % before accepting? *Recommendation: Yes, show completion % and top-level preferences (already in lead detail). Full details remain locked until acceptance.*
4. **Rate limiting:** Limit how many providers a Mom can message simultaneously? *Recommendation: Not in v1. Monitor for abuse.*

---

*Document validated against current codebase (messages.py, relationship_utils.py, marketplace.py, mom.py, provider_unified.py, leads.py, and all frontend message screens).*
