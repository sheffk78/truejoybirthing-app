# Appointments Screen â Mom-Side Completeness Audit

**Date:** 2026-09-17
**Auditor:** Hermes Agent
**Scope:** Mom-side appointment management in the TJB mobile app (`frontend/app/(mom)/appointments.tsx`, related backend routes, approved mockup `s7-appointments.png` and `s7s8s9-app-mom-core.html`)
**Design law reference:** Cream #FAF8F5 canvas, surface #FDFCFA cards with #EBE7E1 borders, lavender #8E8CB5 / dark #6E6C99, rose #B87AA0 / dark #9A5E84, sage #A8B5A0 / light #E8EDE5; Cormorant Garamond headings, Source Sans 3 body; calm/minimal, line icons only, no emoji, rounded cards.

---

## 1. What the Current Screen Supports

Based on the real code in `frontend/app/(mom)/appointments.tsx` (925 lines) and the backend routes in `backend/routes/appointments.py`:

### Appointment Listing & Statuses
- Four sections: **Needs Your Response** (provider-created pending), **Your Requests** (mom-created pending), **Upcoming** (accepted/scheduled/confirmed), **Past** (declined/cancelled/completed).
- Cards show: provider avatar (role-colored initials), provider name, provider role, status badge, date, time, appointment type, location/virtual indicator.
- Status badges use color coding: pending (warm yellow), accepted/scheduled/confirmed (sage green), declined (red), cancelled/completed (gray).

### Actions Available to the Mom
- **Accept / Decline** â for provider-created pending appointments (calls `PUT /appointments/{id}/respond`).
- **Cancel Appointment** â via a close-circle icon on cards (calls `DELETE /appointments/{id}`).
- **Request an Appointment** â CTA banner and "Schedule a Visit" flow opens a modal with: provider picker, date/time pickers, appointment type selector (prenatal, birth planning, postpartum, consultation, home visit), virtual toggle, notes field.
- **Pull-to-refresh** and **empty states** with marketplace link.

### Backend Capabilities (not all surfaced in UI)
- `PUT /appointments/{id}` â update appointment (date, time, location, is_virtual, description, title, type). Mom can update her own fields.
- `PUT /appointments/{id}/respond` â accept/decline/confirm.
- `DELETE /appointments/{id}` â cancel (soft mark as cancelled).
- `POST /appointments` â create (mom or provider).
- Provider can create appointments visible to the mom; mom receives a notification.

### What the Approved Mockup (S7) Shows
- The S7 mockup adds: **inline Accept/Decline buttons** directly in the card for pending appointments (not just a status badge), a dashed-border "Respond" card row, and the "Schedule a Visit" CTA button at the bottom. The mockup also uses the approved status chip vocabulary: **CONFIRMED** (sage), **RESPOND** (rose), **PENDING** (lavender), **VISITED** (sage for past).

### Design Language Alignment
- The current code uses the theme tokens (`COLORS`, `FONTS`, `SIZES` from `theme.ts`/`themeTokens.ts`) â Cormorant Garamond headings, Source Sans 3 body, cream/surface/lavender/rose/sage palette.
- The current status badges do **not** use the approved chip vocabulary (CONFIRMED/RESPOND/PENDING) with the specific sage/rose/lavender color mapping. They use a generic success/warning/error palette instead.

---

## 2. What's Missing â The Full Communication Loop

A pregnant mom managing appointments with her care team (midwife, doula, lactation consultant) needs to handle the entire lifecycle. Here is what the current UI does **not** support:

### A. Rescheduling (Either Side)
- **Mom-initiated reschedule:** No "Reschedule" action on upcoming/confirmed cards. The backend supports date/time updates, but the UI doesn't expose this.
- **Provider-initiated reschedule proposal:** No mechanism for a provider to propose a new time and for the mom to accept/decline the proposal. The backend has no "reschedule proposal" status or endpoint.
- **What a mom needs:** When a provider suggests a new time, the mom should see a card with "Reschedule Proposed" status and Accept/Decline buttons â mirroring the existing Accept/Decline pattern for pending appointments.

### B. Appointment Details & Prep
- **No detail expansion:** Tapping a card does nothing (no navigation to a detail view). The card shows only date, time, type, and location â no prep instructions, what-to-expect, or arrival info.
- **No directions:** For in-person visits (home visits, clinic), no map/directions link.
- **No telehealth join:** Virtual meetings show "Virtual Meeting" text but no join link or video-call button.
- **No prep instructions field:** The backend `appointment_type` and `description` fields exist but are not surfaced as prep instructions in the UI.

### C. Messaging Tied to a Specific Appointment
- The messages screen (`messages.tsx`) exists and supports conversations, but there is **no link between an appointment and a message thread**. A mom cannot ask a question about a specific appointment from within the appointment card.
- The backend `messages.py` uses `thread_id` and `source` fields (e.g., `source: "marketplace_message"`) but has no `appointment_id` field on messages or threads.

### D. Post-Visit Follow-Up
- **No post-visit notes:** Completed appointments show as "Past" with a "Visited" chip, but no provider notes, next steps, or follow-up instructions are surfaced.
- **No "Book Next Visit" CTA:** There is no quick action to schedule a follow-up from a completed appointment.
- **No after-visit summary:** The backend supports `notes` on appointments (provider-private), but these are never shown to the mom.

### E. Reminders & Calendar
- **No add-to-calendar:** No option to add an appointment to the device calendar.
- **No reminder settings:** No ability to set push/notification reminders for upcoming appointments.
- The notification-permission screen mentions "Appointment reminders and updates" as a feature, but no implementation exists in the appointments screen.

### F. Cancelation Policy & Edge Cases
- **No cancelation policy displayed:** The sign-contract screen shows a `cancellation_policy` field, but it is never surfaced in the appointment flow.
- **No late-running notification:** No UI pattern for "your provider is running late" or "appointment delayed."
- **No no-show policy:** No communication about what happens if a mom doesn't show up.

### G. Provider-Initiated Updates
- **No "provider sent an update" state:** If a provider changes the time, location, or adds instructions after the appointment is confirmed, the mom has no way to see this update. The `updated_at` field exists but is not surfaced.

### H. Status Design Language
- The current status badges use a generic color palette (yellow/green/red/gray) instead of the approved status chip system:
  - **CONFIRMED** â sage #A8B5A0 / light #E8EDE5
  - **RESPOND** â rose #B87AA0 / dark #9A5E84
  - **PENDING** â lavender #8E8CB5 / dark #6E6C99
- The mockup S7 uses these chips with specific icons (checkmark for CONFIRMED, clock for RESPOND, hourglass for PENDING).

---

## 3. Ranked Gap List (Top 5) with UI Treatments

### Gap 1: Rescheduling â Mom-Initiated & Provider-Proposed
**Severity:** Critical â rescheduling is the #1 friction point in appointment management for pregnant moms whose schedules shift frequently.

**UI Treatment:**
Add a "Reschedule" option to the overflow menu (three-dot icon) on each upcoming/confirmed appointment card. When tapped, present a bottom sheet with: (1) a list of available time slots for the same provider, pulled from a new `GET /appointments/provider/{id}/availability` endpoint; (2) a "Propose New Time" option that lets the mom pick a date/time and sends a reschedule request to the provider (new backend endpoint `POST /appointments/{id}/reschedule-proposal`). If the provider proposes a reschedule, the mom sees a card in "Needs Your Response" with the proposed new time and Accept/Decline buttons â using the existing pattern. The card uses the **RESPOND** chip (rose #B87AA0) with a clock icon.

### Gap 2: Appointment Detail View with Prep Instructions & Directions
**Severity:** Critical â a mom needs to know where to go, what to bring, and what to expect before a visit, especially for home visits and first-time prenatal appointments.

**UI Treatment:**
Tapping an appointment card navigates to a detail screen (S7-expanded). The detail screen uses the approved card construction: cream canvas, surface #FDFCFA card with #EBE7E1 border, rounded corners. Sections: (1) Provider info (avatar, name, role, connection status) at the top; (2) Appointment details (date, time, type, location/virtual) in a stacked row layout with line icons; (3) **Prep Instructions** card â a new surface with a light sage #E8EDE5 background, showing a checklist of prep items (e.g., "Bring insurance card," "Arrive 15 min early," "Empty bladder for ultrasound") â sourced from a `prep_instructions` field on the appointment object; (4) **Directions** card â for in-person visits, a row with a location icon and "Get Directions" button that opens the native maps app with the provider's address; (5) **Telehealth Join** button â for virtual meetings, a prominent rose #B87AA0 button "Join Virtual Visit" that opens the telehealth link. A "Message about this appointment" row links to the tied conversation thread.

### Gap 3: Messaging Tied to a Specific Appointment
**Severity:** High â pregnant moms have questions between visits and need a direct line tied to the specific appointment context.

**UI Treatment:**
On the appointment detail screen, add a "Conversation" section at the bottom showing the latest message thread related to this appointment (if any), with a "Message your [provider role]" button. The button uses the approved rose #B87AA0 chip style with a chat bubble line icon. When tapped, it navigates to the Messages screen pre-filtered to the appointment's thread (new `source=appointment` and `appointment_id` fields on the message thread model). If no thread exists, tapping creates one with the provider and pre-populates the header with the appointment type and date. This mirrors the S9 Messages screen construction but with appointment context.

### Gap 4: Post-Visit Follow-Up & Next-Visit Booking
**Severity:** High â the transition from one visit to the next is where continuity of care breaks down. A mom needs to know what happened and what comes next.

**UI Treatment:**
On the **Past** section, completed appointments get a new expandable card. When expanded, it shows: (1) **Visit Notes** â provider notes surfaced to the mom (new `mom_visible_notes` field on the appointment model); (2) **Next Steps** â a bullet list of aftercare instructions (e.g., "Rest for 48 hours," "Follow up on lab results"); (3) **Book Your Next Visit** CTA â a sage #A8B5A0 outlined button with a calendar icon that opens the create-appointment modal pre-filled with the same provider and "Postpartum Visit" or "Follow-up" type. The "Book Your Next Visit" button uses the approved CTA treatment: solid lavender #8E8CB5 button with white text, rounded full, matching the "Schedule a Visit" pattern on the main screen.

### Gap 5: Approved Status Chip System & Add-to-Calendar
**Severity:** Medium â the status chips are a design-law requirement and calendar integration is a basic expectation for any scheduling UI.

**UI Treatment:**
Replace the current generic status badges with the approved chip system across all appointment cards: **CONFIRMED** (sage #E8EDE5 bg, #5F7154 text, checkmark icon), **RESPOND** (rose #EFE0EB bg, #A25C86 text, clock icon), **PENDING** (lavender #F1F1FB bg, #6E6C99 text, hourglass icon), **VISITED** (sage, same as CONFIRMED). Add an "Add to Calendar" row on the appointment detail screen and a small calendar icon on each upcoming card row. Tapping "Add to Calendar" uses the native `expo-calendar` API to create an event with the appointment details (provider, type, location, virtual link). This fits the calm/minimal design law â line icon only, no emoji, rounded card surface.

---

## 4. What Should NOT Be Added (Avoid Clutter)

The following features are tempting but would violate the calm/minimal design law or add noise to the mom's primary task flow:

1. **Provider rating/review system** â Not relevant to the appointment management task. Belongs in a separate "My Team" or provider profile screen, not the appointments list.
2. **In-app video call UI** â Telehealth should open the existing video platform (Zoom, Doxy.me, etc.) via deep link or URL. Building an in-app video player adds complexity and breaks the calm/minimal aesthetic.
3. **Social sharing of appointments** â No need to share appointments to social or other apps. Adds clutter to the card action menu.
4. **Recurring appointment templates** â "Book monthly prenatal visits" is a provider-side workflow, not a mom-side need on this screen. The mom just needs to book the next one.
5. **Push notification management settings** â Belongs in app settings, not on the appointments screen. The notification-permission screen already handles this.
6. **Invoice/payment UI** â Invoicing is a provider-side concern. The S9 Messages screen already shows an "Invoice" chip for pending payments; the mom should handle that in Messages, not in Appointments.
7. **Calendar view / week/month grid** â The current list-based layout fits the design law's calm, minimal approach. A calendar grid would add visual complexity without proportional benefit for the mom's use case (she has few appointments, not a dense schedule).
8. **AI-powered scheduling suggestions** â Over-engineering for the current scope. The "Schedule a Visit" CTA and provider availability picker are sufficient.

---

## 5. Summary of Findings

| Area | Current State | Gap Level |
|---|---|---|
| Appointment listing & sections | Fully implemented (4 sections) | None |
| Accept/Decline for pending | Fully implemented | None |
| Cancel appointment | Fully implemented | None |
| Create appointment (modal) | Fully implemented | None |
| Status chip design language | Not aligned (generic badges vs. approved chips) | Medium |
| Rescheduling (mom-initiated) | Not implemented | Critical |
| Rescheduling (provider-proposed) | Not implemented | Critical |
| Appointment detail view | Not implemented (cards are not tappable) | Critical |
| Prep instructions | Not implemented | High |
| Directions for in-person visits | Not implemented | High |
| Telehealth join link | Not implemented | High |
| Appointment-tied messaging | Not implemented | High |
| Post-visit notes & next steps | Not implemented | High |
| "Book Next Visit" CTA | Not implemented | High |
| Add to calendar / reminders | Not implemented | Medium |
| Cancelation policy display | Not implemented | Medium |
| Late-running / no-show comms | Not implemented | Low |
| Provider-initiated updates | Not implemented | Medium |

---

*Report generated from code analysis of `frontend/app/(mom)/appointments.tsx`, `backend/routes/appointments.py`, `backend/routes/messages.py`, `frontend/app/(mom)/messages.tsx`, `frontend/src/constants/theme.ts`, `frontend/src/constants/themeTokens.ts`, and the approved mockup files `s7-appointments.png` and `s7s8s9-app-mom-core.html`.*
