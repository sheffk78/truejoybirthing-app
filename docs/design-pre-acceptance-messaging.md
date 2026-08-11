# Pre-Acceptance Messaging Flow Design — True Joy Birthing Mobile App

## Status: Design Document — Ready for Implementation Review

---

## 1. Problem Statement

**Current behavior:** A Mom finds a provider in the marketplace, taps "Message," and the backend blocks the message with a `403` unless there is already an accepted `share_request` or a linked `clients` record. The Mom must first share her birth plan / request connection, the provider must accept, and ONLY THEN does messaging unlock.

**Desired behavior:** Mom and provider can message back and forth BEFORE the provider formally accepts the Mom as a client. This "pre-acceptance chat" allows both parties to ensure a good connection, discuss services, and ask questions. The provider can then choose to "Accept as Client" from within the chat, which transitions the thread into a full client relationship.

---

## 2. Design Principles

1. **No gate on first message.** Any Mom can message any marketplace provider without prior acceptance.
2. **Provider controls acceptance.** The provider decides when (or whether) to formally accept the Mom as a client.
3. **Clear visual distinction.** Both sides can instantly tell whether a conversation thread is "pre-acceptance" (exploratory) or "accepted client" (active care relationship).
4. **Preserve existing data model.** The `share_requests` and `clients` collections remain the source of truth for formal relationships. A new lightweight entity tracks pre-acceptance conversation state.
5. **Provider-side leads integration.** Pre-acceptance messaging feeds naturally into the existing `leads` flow (consultation requested → scheduled → completed → converted).

---

## 3. Data Model Changes

### 3.1 New Collection: `conversation_threads`

This collection tracks the state of a conversation between a Mom and a provider, independently of whether they have a formal client relationship.

```
conversation_threads
├── thread_id          : "thread_<uuid>"
├── mom_user_id        : string  (the Mom)
├── provider_id        : string  (the provider)
├── status             : enum    ["pre_acceptance", "accepted", "declined", "terminated"]
├── source             : enum    ["marketplace_message", "team_share", "lead_conversion"]
│                          // how the thread originated
├── accepted_at        : datetime | null
├── accepted_by        : string (provider user_id) | null
├── declined_at        : datetime | null
├── decline_reason     : string | null   (optional, provider-facing only)
├── created_at         : datetime
├── updated_at         : datetime
├── metadata
│   ├── mom_first_message    : string  (the initial outreach message)
│   ├── provider_first_reply : string | null
│   └── lead_id              : string | null  (links to leads collection if applicable)
```

**Indexes needed:**
- `{ mom_user_id: 1, provider_id: 1 }` — unique compound index to prevent duplicate threads
- `{ provider_id: 1, status: 1 }` — provider inbox filtering
- `{ mom_user_id: 1, status: 1 }` — mom inbox filtering
- `{ updated_at: -1 }` — conversation list sorting

### 3.2 Modified Collection: `messages`

Add one field to the existing message document:

```
messages
├── ...existing fields...
├── thread_id        : string | null   // NEW: links message to its conversation_thread
```

**Rationale:** This allows the backend to query all messages for a thread efficiently and supports future features like thread-specific archival or deletion.

**Migration:** Backfill `thread_id` for existing messages by looking up `conversation_threads` by `(sender_id, receiver_id)` or create legacy threads with `status="accepted"` and `source="team_share"`.

### 3.3 Unchanged Collections (still used for formal acceptance)

| Collection | Role in new flow |
|---|---|
| `share_requests` | Still created when Mom "shares birth plan" or when provider accepts from chat. `status="accepted"` + `relationship_status="active"` remains the formal acceptance signal. |
| `clients` | Still created on acceptance. Provider’s client list still pulls from here. |
| `leads` | Still tracks the consultation funnel. A pre-acceptance thread may optionally link to a lead record via `conversation_threads.metadata.lead_id`. |
| `users` | No changes. |
| `notifications` | No schema changes; new notification types added (see §7). |

---

## 4. Backend API Changes

### 4.1 `POST /messages` — Send Message (modified)

**Current behavior:** Blocks Mom→Provider and Provider→Mom with `403` unless `check_provider_can_message()` returns true.

**New behavior:**

1. Allow message if ANY of the following is true:
   a. There is an active `share_request` (existing logic) → full client messaging.
   b. There is an active `clients` record (existing logic) → full client messaging.
   c. There is a `conversation_thread` with `status="pre_acceptance"` or `"accepted"`.
   d. The sender is a Mom and the receiver is a marketplace provider → **auto-create a pre-acceptance thread** and allow the message.

2. If a new thread is auto-created (case 1d), the backend:
   - Inserts a `conversation_thread` document with `status="pre_acceptance"`, `source="marketplace_message"`, `mom_first_message` set to the message content.
   - Optionally creates a `leads` document with `status="consultation_requested"` if one does not already exist for this `(mom, provider)` pair.

3. The message document now includes `thread_id`.

**Provider → Mom in pre-acceptance thread:**
- Always allowed if the thread exists and status is `"pre_acceptance"` or `"accepted"`.
- Blocked if status is `"declined"` or `"terminated"`.

**Pseudo-code for permission check:**

```python
async def can_send_message(sender, receiver):
    # Case 1: existing formal relationship (unchanged)
    if await has_active_relationship(sender, receiver):
        return True, "accepted"

    # Case 2: existing conversation thread
    thread = await get_thread_between(sender.user_id, receiver.user_id)
    if thread:
        if thread["status"] in ("pre_acceptance", "accepted"):
            return True, thread["status"]
        return False, thread["status"]  # declined or terminated

    # Case 3: Mom initiating first contact with a provider
    if sender.role == "MOM" and receiver.role in ("DOULA", "MIDWIFE", "LACTATION"):
        return True, "create_pre_acceptance"

    # Case 4: Provider initiating to a Mom who has NOT messaged them first
    if sender.role in ("DOULA", "MIDWIFE", "LACTATION") and receiver.role == "MOM":
        # Provider cannot cold-message a Mom. Mom must initiate.
        return False, "no_thread"

    # Case 5: Provider ↔ Provider (unchanged)
    ...
```

### 4.2 `GET /messages/conversations` — List Conversations (modified)

**Current behavior:** Returns all conversations where user is sender or receiver, aggregated from `messages` collection. Each conversation shows: name, role, last message, unread count.

**New behavior:** Return conversations from TWO sources, merged and deduplicated:

1. **Legacy accepted conversations** from `messages` collection (for backward compatibility with existing threads that lack a `thread_id`).
2. **Thread-based conversations** from `conversation_threads` joined with latest message.

**Response shape (new fields added):**

```json
{
  "conversations": [
    {
      "other_user_id": "user_abc",
      "other_user_name": "Anna Smith",
      "other_user_role": "DOULA",
      "other_user_picture": "...",
      "last_message_content": "Hi, I'd love to learn more about...",
      "last_message_time": "2026-08-10T14:32:00Z",
      "unread_count": 2,
      "thread_status": "pre_acceptance",   // NEW: "pre_acceptance" | "accepted" | "declined"
      "source": "marketplace_message",      // NEW
      "can_accept": false,                  // NEW: true only for provider in pre_acceptance thread
      "can_decline": false                  // NEW: true only for provider in pre_acceptance thread
    }
  ]
}
```

**Sorting:** Sort by `updated_at` of the thread (or last message time), newest first.

**Unread count logic:** Count messages in this thread where `receiver_id == current_user` and `read == false`.

### 4.3 `GET /messages/{other_user_id}` — Get Thread Messages (modified)

**Current behavior:** Returns all messages between current user and `other_user_id`.

**New behavior:** Same, but also returns the thread metadata:

```json
{
  "messages": [...],
  "other_user": { ... },
  "thread": {
    "thread_id": "thread_xyz",
    "status": "pre_acceptance",
    "created_at": "...",
    "accepted_at": null,
    "can_accept": true,      // provider only, when status == pre_acceptance
    "can_decline": true,     // provider only, when status == pre_acceptance
    "decline_reason": null
  }
}
```

### 4.4 NEW: `POST /messages/threads/{thread_id}/accept` — Provider Accepts Mom as Client

**Who can call:** Provider only.
**When:** Only when `thread.status == "pre_acceptance"`.

**Actions performed atomically:**
1. Update `conversation_thread.status = "accepted"`, set `accepted_at`, `accepted_by`.
2. Create a `share_request` record (or update existing pending one) with `status="accepted"`, `relationship_status="active"`.
3. Create a `clients` record (or update existing) with `status="Active"`, linking `provider_id` + `linked_mom_id`.
4. If a `leads` record exists for this `(mom, provider)`, update it to `status="converted_to_client"`.
5. Send notification to Mom: `"You are now a client of {provider_name}!"`
6. Return the updated thread + newly created client_id.

**Response:**
```json
{
  "message": "Client accepted",
  "thread_id": "thread_xyz",
  "client_id": "client_abc",
  "share_request_id": "share_def"
}
```

### 4.5 NEW: `POST /messages/threads/{thread_id}/decline` — Provider Declines

**Who can call:** Provider only.
**When:** Only when `thread.status == "pre_acceptance"`.

**Actions:**
1. Update `conversation_thread.status = "declined"`, set `declined_at`, optional `decline_reason`.
2. Update existing `leads` record to `status="declined"` (if any).
3. Send notification to Mom: `"{provider_name} is unable to take on new clients at this time."`
4. Prevent further messaging in this thread (return `403` for new messages).

**Response:**
```json
{
  "message": "Conversation declined",
  "thread_id": "thread_xyz"
}
```

### 4.6 NEW: `GET /provider/pre-acceptance-threads` — Provider Inbox Filter

Returns all `conversation_threads` where `provider_id == current_user` and `status == "pre_acceptance"`, enriched with Mom profile info (EDD, picture, birth plan completion %).

This powers a dedicated "New Inquiries" or "Consultation Requests" view on the provider side.

**Response:**
```json
{
  "threads": [
    {
      "thread_id": "...",
      "mom_user_id": "...",
      "mom_name": "Jane Doe",
      "mom_picture": "...",
      "edd": "2026-12-15",
      "birth_plan_completion": 75,
      "last_message_preview": "Hi, I'm looking for a doula...",
      "unread_count": 1,
      "created_at": "..."
    }
  ]
}
```

### 4.7 `GET /provider/clients` — Provider Client List (unchanged behavior)

Still returns `clients` collection records. Pre-acceptance threads do NOT appear here. Only after acceptance does the Mom show up as a client. This preserves the semantic boundary: "clients" are formal care relationships; "threads" are conversational relationships.

---

## 5. Complete User Journeys

### 5.1 Mom Journey: First Contact → Pre-Acceptance Chat → Accepted Client

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Marketplace | Mom browses providers, taps "Contact" on a provider card. | — |
| 2 | Marketplace | Modal appears with pre-filled message: `"Hi {name}, I found you on True Joy Birthing and would love to learn more about working together."` Mom can edit and tap "Send Message." | Backend receives `POST /messages` with `receiver_id=provider_id`. Since no formal relationship exists, a `conversation_thread` is auto-created with `status="pre_acceptance"`, `source="marketplace_message"`. A `leads` record is also created with `status="consultation_requested"`. Message is stored with `thread_id`. |
| 3 | Messages (Mom) | Mom is navigated to Messages screen. The conversation appears at the top with a **yellow dot badge** labeled "Getting to know each other." | `GET /messages/conversations` returns thread with `thread_status="pre_acceptance"`. |
| 4 | Messages (Mom) | Mom sees the chat UI. Input field is active. She can send more messages. | Each message is stored with `thread_id`. No `403`. |
| 5 | Provider Inbox | Provider receives a push notification: `"New message from {mom_name}"`. Taps it. | Notification type: `pre_acceptance_message`. |
| 6 | Provider Messages | Provider sees the conversation in their inbox with a **blue "New Inquiry" badge**. Unread count shown. | `GET /messages/conversations` returns thread with `thread_status="pre_acceptance"`, `can_accept=true`, `can_decline=true`. |
| 7 | Provider Chat | Provider opens the chat. Messages are visible. Below the header, a **persistent banner** reads: `"Getting to know each other. Accept or decline when ready."` Two buttons: **"Accept as Client"** and **"Decline"**. | `GET /messages/{mom_id}` returns messages + thread metadata with `can_accept=true`. |
| 8 | Provider Chat | Provider replies to Mom’s questions. | Messages flow normally. Thread stays `pre_acceptance`. |
| 9 | Provider Chat | Provider taps **"Accept as Client"**. A confirmation modal asks: `"Accept {mom_name} as a client? This will give her full access to scheduling, contracts, and shared birth plan features."` | `POST /messages/threads/{thread_id}/accept` runs atomically: thread→`accepted`, share_request→`accepted`, client record created, lead→`converted_to_client`. |
| 10 | Messages (Mom) | Mom receives push: `"Anna Smith has accepted you as a client! 🎉"`. The conversation badge changes from yellow "Getting to know" to green "Active Client." | Thread status now `"accepted"`. |
| 11 | Messages (Both) | Both parties continue chatting. The thread is now indistinguishable from any other accepted-client thread. Birth plan sharing, contracts, appointments all unlock via existing share_request/client machinery. | Existing features work as before. |

### 5.2 Mom Journey: Message from Provider Detail Screen

| Step | Screen | Action |
|---|---|---|
| 1 | Provider Detail | Mom taps "Message" button. |
| 2 | Provider Detail | Same as marketplace: pre-filled message modal, Mom edits, taps Send. |
| 3 | — | Same backend flow as §5.1 step 2. Thread created, message stored. |
| 4 | Messages | Mom lands in Messages with the thread open. |

### 5.3 Provider Journey: Receiving a Pre-Acceptance Inquiry

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Dashboard | Provider sees a new notification: `"New consultation request from {mom_name}"`. | Notification created on thread creation. |
| 2 | Dashboard | Provider taps notification or goes to Messages tab. | — |
| 3 | Provider Messages | Inbox shows two sections (visually): **"New Inquiries"** (pre-acceptance threads) and **"My Clients"** (accepted threads). The new thread appears under "New Inquiries" with Mom’s EDD, profile picture, and last message preview. | `GET /messages/conversations` groups by `thread_status`. Pre-acceptance threads shown first with visual prominence. |
| 4 | Provider Chat | Provider opens thread. Sees full message history. Banner at top explains this is a prospective client. Two CTAs: **"Accept as Client"** and **"Decline"**. | Thread metadata returned. |
| 5a | Accept Path | Provider taps "Accept as Client" → confirmation → accepted. Mom is notified. Thread moves to "My Clients" section. | See §5.1 step 9. |
| 5b | Decline Path | Provider taps "Decline" → optional reason → thread status becomes `"declined"`. Mom is notified. Thread disappears from active inbox (moves to an "Archived" or "Declined" filter). | `POST /messages/threads/{thread_id}/decline`. Mom can no longer message. |

### 5.4 Mom Journey: Provider Declines

| Step | Screen | Action |
|---|---|---|
| 1 | Messages | Mom receives push: `"Anna Smith is unable to take on new clients at this time."` |
| 2 | Messages | The conversation is grayed out with a "Declined" badge. Input field is disabled with placeholder text: `"This provider is unable to work together at this time."` |
| 3 | Messages | Mom can archive/hide the thread or return to marketplace to find another provider. |

### 5.5 Provider Journey: Converting from Existing Lead

| Step | Screen | Action | Backend Effect |
|---|---|---|---|
| 1 | Leads | Provider receives a consultation request via the existing `/leads/request-consultation` flow. Lead status is `"consultation_requested"`. | `leads` document created with `status="consultation_requested"`. |
| 2 | Leads | Provider reviews lead, sees Mom’s birth plan summary. | Existing lead detail endpoint. |
| 3 | Leads | Provider taps "Message" from lead detail. This creates/opens a `conversation_thread` with `source="lead_conversion"`, linked to the lead via `metadata.lead_id`. | Backend: `POST /messages` with lead context → thread created if not exists, `metadata.lead_id` set. |
| 4 | Chat | Conversation proceeds in pre-acceptance mode. Provider and Mom chat. | Same pre-acceptance flow. |
| 5 | Chat | After consultation, provider taps "Accept as Client" from chat. | Thread→`accepted`. Lead→`converted_to_client`. Share_request→`accepted`. Client record created. |
| 6 | — | Alternatively, provider can update lead status from the Leads screen ("consultation_scheduled", "consultation_completed", etc.) and then convert. | Existing lead status endpoints still work. |

---

## 6. Frontend Changes

### 6.1 Mom Screens

#### `marketplace.tsx`
- **"Contact" button** on provider cards: keep current behavior (open modal with pre-filled message). The `handleContactProvider` function no longer needs to check `teamStatus` before sending. Remove the `403` error handling that prompts "Add to Team First."
- Remove the fallback logic that tries to add to team on connection error.
- The modal should say: `"Send a message to {provider_name} to learn more about working together."` (instead of implying they need to be on a team).

#### `provider-detail.tsx`
- **"Message" button**: Same as marketplace. Remove the `providerId`/`providerName` param-based navigation that tries to route through team-check logic. Just open a compose modal directly.
- **"Schedule" button**: Keep disabled or show a tooltip `"You'll be able to schedule once {provider_name} accepts you as a client."` Scheduling remains locked until acceptance.

#### `messages.tsx` (Mom)
- **Conversation list:** Add visual badges per thread:
  - `"Getting to know each other"` (yellow) for `pre_acceptance`
  - `"Active Client"` (green) for `accepted`
- **Chat header:** When in a `pre_acceptance` thread, show a subtle banner: `"{provider_name} hasn't accepted you as a client yet. You can still chat to get to know each other!"`
- **Chat input:** Always enabled for `pre_acceptance` and `accepted`. Disabled with explanatory text for `declined`.
- **New message modal:** Remove dependency on `teamMembers`. The Mom can now message ANY provider, not just team members. The "+" button should open a provider search/selector instead of the team list.

### 6.2 Provider Screens

#### `ProviderMessages.tsx` (shared Doula/Midwife/Lactation component)
- **Conversation list:** Group into two sections:
  1. **"New Inquiries"** (`thread_status == "pre_acceptance"`) — shown at top with accent color background, includes EDD and birth plan completion %.
  2. **"My Clients"** (`thread_status == "accepted"`) — normal client conversations.
- **Chat header (pre-acceptance):** Show Mom’s profile summary (EDD, due date, children). Banner with two buttons: **"Accept as Client"** and **"Decline"**.
- **Chat input:** Enabled for `pre_acceptance` and `accepted`. Disabled for `declined`.
- **Accept flow:** Tapping "Accept as Client" shows confirmation modal. On confirm, call `POST /messages/threads/{thread_id}/accept`. On success, thread instantly re-renders with `accepted` status. The conversation moves to "My Clients" section.
- **Decline flow:** Tapping "Decline" shows optional reason input. On confirm, call decline endpoint. Thread disappears from active inbox.

#### `leads.tsx` (Provider)
- **Lead detail:** Add a prominent **"Message"** button that opens the pre-acceptance chat for this lead. This creates the thread with `source="lead_conversion"`.
- **Lead list:** Show a small message icon if a thread already exists for this lead.

---

## 7. Notification Handling

| Event | Recipient | Notification Type | Title | Message | Deep Link |
|---|---|---|---|---|---|
| Mom sends first message | Provider | `pre_acceptance_message` | New message from {mom_name} | {message_preview} | `/messages?threadId={thread_id}` |
| Provider replies in pre-acceptance | Mom | `message` | {provider_name} | {message_preview} | `/messages?threadId={thread_id}` |
| Provider accepts | Mom | `client_accepted` | You're a client! 🎉 | {provider_name} has accepted you as a client. | `/messages?threadId={thread_id}` |
| Provider declines | Mom | `client_declined` | Update from {provider_name} | Unable to take on new clients at this time. | `/messages?threadId={thread_id}` |
| Provider terminates accepted relationship | Mom | `relationship_terminated` | Relationship Ended | {provider_name} has ended your client relationship. | `/messages` |

**Push notification payload:** Include `thread_id`, `other_user_id`, and `thread_status` so the app can route to the correct chat state.

---

## 8. Thread Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THREAD STATUS FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Mom messages provider (first time)                                │
│              │                                                        │
│              ▼                                                        │
│   ┌──────────────────┐                                              │
│   │  PRE_ACCEPTANCE  │ ◄─────────────────────────────┐               │
│   │  (chat unlocked) │                               │               │
│   └────────┬─────────┘                               │               │
│            │                                          │               │
│      ┌─────┴─────┐                                   │               │
│      │           │                                   │               │
│      ▼           ▼                                   │               │
│  Provider    Provider                                  │               │
│  ACCEPTS     DECLINES                                  │               │
│      │           │                                     │               │
│      ▼           ▼                                     │               │
│   ┌──────┐   ┌────────┐                                │               │
│   │ACCEPTED│   │DECLINED│                                │               │
│   │(full   │   │(locked)│                                │               │
│   │ client │   └────────┘                                │               │
│   │ access)│                                            │               │
│   └───┬────┘                                            │               │
│       │                                                 │               │
│       ▼                                                 │               │
│   Provider or Mom                                       │               │
│   TERMINATES                                            │               │
│       │                                                 │               │
│       ▼                                                 │               │
│   ┌───────────┐                                         │               │
│   │TERMINATED │ ──────── NOT reversible ────────────────┘               │
│   │ (locked)  │                                                       │
│   └───────────┘                                                       │
│                                                                       │
│   NOTE: A new thread can be created after decline/termination         │
│   if the Mom messages again, but this is a NEW thread.              │
│   The old thread remains in its terminal state for history.          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Model Implications Summary

| Collection | Change | Impact |
|---|---|---|
| `conversation_threads` | **New** | Lightweight, purpose-built for thread state. Does not replace `share_requests` or `clients`. |
| `messages` | Add `thread_id` | Allows thread-scoped queries. Backfill migration needed for existing messages. |
| `share_requests` | **No schema change** | Still the formal acceptance signal. Created on provider "Accept" action. |
| `clients` | **No schema change** | Still created on acceptance. Pre-acceptance threads do NOT create client records. |
| `leads` | **No schema change** | Optional linkage via `conversation_threads.metadata.lead_id`. |
| `notifications` | **No schema change** | New notification types: `pre_acceptance_message`, `client_accepted`, `client_declined`. |

---

## 10. Migration Plan (for existing data)

1. **Create `conversation_threads` collection** with compound index on `(mom_user_id, provider_id)`.
2. **Backfill existing messages:** For every unique `(sender_id, receiver_id)` pair in `messages` where there is an accepted `share_request` or `clients` record:
   - Create a `conversation_thread` with `status="accepted"`, `source="team_share"`, `accepted_at` set to the share_request’s `responded_at`.
   - Update all messages in that conversation to include `thread_id`.
3. **Update API endpoints:** Deploy the modified `POST /messages`, `GET /messages/conversations`, `GET /messages/{id}` endpoints.
4. **Deploy new endpoints:** `/messages/threads/{id}/accept`, `/messages/threads/{id}/decline`, `/provider/pre-acceptance-threads`.
5. **Update frontend:** Deploy Mom and Provider message screen changes.
6. **Monitor:** Watch for duplicate thread creation (the unique index prevents this).

---

## 11. Open Questions / Decisions to Make

1. **Should pre-acceptance threads expire?** (e.g., auto-archive after 30 days of no activity?) — *Recommendation: Yes, add an `expires_at` field. If Mom messages an expired thread, create a new one.*
2. **Can a provider re-accept a declined thread?** — *Recommendation: No. Declined is terminal. Mom must initiate a new thread.*
3. **Birth plan visibility in pre-acceptance:** Should the provider see Mom’s birth plan completion % or summary before accepting? — *Recommendation: Yes, show completion % and top-level preferences (already available in lead detail). Full birth plan details remain locked until acceptance (existing behavior preserved).*
4. **Rate limiting:** Should Moms be limited in how many providers they can message simultaneously? — *Recommendation: Not in v1. Monitor for abuse.*

---

## 12. Files Touched (for implementation tracking)

| File | Change Type |
|---|---|
| `backend/routes/messages.py` | Modify permission check, add thread_id, new endpoints |
| `backend/routes/relationship_utils.py` | Add `get_thread_between()` helper |
| `backend/routes/notifications.py` | Add new notification types (no schema change) |
| `backend/models/unified.py` | Document `conversation_threads` schema |
| `frontend/app/(mom)/messages.tsx` | Add thread status badges, pre-acceptance UI |
| `frontend/app/(mom)/marketplace.tsx` | Remove team-gate logic, update contact flow |
| `frontend/app/(mom)/provider-detail.tsx` | Remove team-gate from Message button |
| `frontend/src/components/provider/ProviderMessages.tsx` | Add Accept/Decline CTAs, two-section inbox |
| `frontend/app/(doula\|midwife\|lactation)/leads.tsx` | Add "Message" button to lead detail |
| `frontend/app/(doula\|midwife\|lactation)/messages.tsx` | (if separate from ProviderMessages) same changes |
| Migration script | Create `conversation_threads`, backfill `thread_id` |

---

*Document version: 1.0*
*Author: Hermes Agent (Flow Design)*
*Date: 2026-08-10*
