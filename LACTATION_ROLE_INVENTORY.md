# LACTATION Role Addition — Complete Codebase Inventory

**App:** True Joy Birthing Mobile (`/Users/socializerender/Projects/TrueJoyBirthing-Mobile`)
**Current provider roles:** `DOULA`, `MIDWIFE` — **Adding:** `LACTATION`

This document lists every file, pattern, and conditional that references roles and would need modification to support a third provider role (`LACTATION`). Files are grouped by category. Test files are listed separately at the end (they mirror production patterns).

---

## 1. Backend Role Enums & Constants

| File | Lines | What needs changing |
|---|---|---|
| `backend/models/unified.py` | 13–15 | `class ProviderRole(str, Enum): DOULA = "DOULA"; MIDWIFE = "MIDWIFE"` — add `LACTATION = "LACTATION"` |
| `backend/server.py` | 122 | `ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]` — add `"LACTATION"` |
| `backend/server.py` | 124–125 | `CLIENT_STATUS_DOULA` / `CLIENT_STATUS_MIDWIFE` — decide if LACTATION needs its own status list (likely doula-like) |
| `backend/server.py` | 133 | `MIDWIFE_CREDENTIALS = ["CPM", "LM", "CNM"]` — may need `LACTATION_CREDENTIALS` (e.g. IBCLC, CLC) |
| `backend/server.py` | 1548–1549 | `def is_pro_role(role): return role in ["DOULA", "MIDWIFE"]` — add `"LACTATION"` |
| `backend/routes/auth.py` | 29 | `ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]` — add `"LACTATION"` |
| `backend/routes/auth.py` | 168 | `ALLOWED_SELF_REGISTER_ROLES = {"MOM", "DOULA", "MIDWIFE"}` — add `"LACTATION"` |
| `backend/routes/admin.py` | 17 | `ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]` — add `"LACTATION"` |
| `backend/routes/admin_dashboard.py` | 23 | `ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]` — add `"LACTATION"` |
| `backend/routes/admin_dashboard.py` | 209, 227–228 | Signup trend hardcoded `{"MOM": 0, "DOULA": 0, "MIDWIFE": 0, "ADMIN": 0}` — add `"LACTATION": 0` |
| `backend/routes/admin_ambassador.py` | 22, 31 | `VALID_ROLES = ["DOULA", "MIDWIFE"]` and `role: str # "DOULA" or "MIDWIFE"` — add `"LACTATION"` |

---

## 2. Backend Role-Based Profile Fetching (MongoDB Collections)

The app uses **separate MongoDB collections per provider type**: `doula_profiles`, `midwife_profiles`, `mom_profiles`. A new `lactation_profiles` collection would follow the same pattern.

| File | Lines | What needs changing |
|---|---|---|
| `backend/routes/auth.py` | 268–279 | `get_me()` — `if user.role == "DOULA": db.doula_profiles… elif user.role == "MIDWIFE": db.midwife_profiles…` — add `elif user.role == "LACTATION": db.lactation_profiles…` |
| `backend/routes/auth.py` | 363–365 | `delete_account()` — `await db.doula_profiles.delete_many(...)` / `await db.midwife_profiles.delete_many(...)` — add `await db.lactation_profiles.delete_many(...)` |
| `backend/routes/marketplace.py` | 54–94 | Marketplace search: `if provider_type == "DOULA": db.doula_profiles.find(...)` then `provider_type = "DOULA"` — add `if provider_type == "LACTATION": db.lactation_profiles.find(...)` block, tag results with `"provider_type": "LACTATION"` |
| `backend/routes/marketplace.py` | 145–149 | `get_provider_marketplace_profile()` — `if user["role"] == "DOULA": db.doula_profiles… elif user["role"] == "MIDWIFE": db.midwife_profiles…` — add `elif user["role"] == "LACTATION": db.lactation_profiles…` |
| `backend/routes/admin_dashboard.py` | 357–365 | `get_user_detail()` — `elif role == "DOULA": db.doula_profiles… elif role == "MIDWIFE": db.midwife_profiles…` — add `elif role == "LACTATION": db.lactation_profiles…` |
| `backend/routes/care_plans.py` | 532–566 | `search_providers()` — queries `doula_profiles` and `midwife_profiles` separately for location matches, then `if provider["role"] == "DOULA": … elif "MIDWIFE": …` — add `lactation_profiles` query and `elif "LACTATION": …` branch |
| `backend/routes/care_plans.py` | 673–679 | `get_my_share_requests()` — `if provider_role == "DOULA": db.doula_profiles… elif "MIDWIFE": db.midwife_profiles…` — add `elif "LACTATION": …` |
| `backend/routes/care_plans.py` | 720–725 | `revoke_share()` — same pattern: `if provider_role == "DOULA": … elif "MIDWIFE": …` — add LACTATION branch |
| `backend/routes/mom.py` | 228–244 | `get_mom_team()` — `doula_ids = [... if role == "DOULA"]`, `midwife_ids = [... if role == "MIDWIFE"]`, batch fetches `doula_profiles` and `midwife_profiles` — add `lactation_ids` and `db.lactation_profiles` fetch |
| `backend/routes/mom.py` | 307–313 | `_get_provider_profile(role)` — `if role == "DOULA": db.doula_profiles… elif "MIDWIFE": db.midwife_profiles…` — add `elif "LACTATION": …` |
| `backend/ensure_demo_accounts.py` | 35–58 | Demo account definitions: `{"role": "MIDWIFE", "profile_collection": "midwife_profiles"}` and `{"role": "DOULA", "profile_collection": "doula_profiles"}` — add LACTATION demo account |
| `backend/seed_demo_data.py` | 517–518, 542, 560, 598, 616 | Deletes/creates `doula_profiles` and `midwife_profiles` — add `lactation_profiles` handling |

---

## 3. Backend `check_role` Calls (API Authorization)

Every `check_role(["DOULA", "MIDWIFE"])` call needs `"LACTATION"` added to the list. Single-role checks (`["DOULA"]` or `["MIDWIFE"]`) need a decision: does LACTATION share that endpoint, or need its own?

### 3a. Shared provider endpoints — add `"LACTATION"` to the allowed list

| File | Lines (check_role calls) |
|---|---|
| `backend/routes/provider_unified.py` | 33, 77, 133, 158, 318, 376, 448, 473, 490, 516, 552, 575, 589, 606, 658 |
| `backend/routes/appointments.py` | 421, 446 (check_role); also lines 94, 329, 374 use `user.role in ["DOULA", "MIDWIFE"]` |
| `backend/routes/messages.py` | 285 (check_role); also lines 190–219 use `sender_role in ["DOULA", "MIDWIFE"]` and `receiver_role in ["DOULA", "MIDWIFE"]` for relationship validation |
| `backend/routes/leads.py` | 138, 193, 230, 281, 329, 525, 559 (all `check_role(["DOULA", "MIDWIFE"])`); also line 57 `{"role": {"$in": ["DOULA", "MIDWIFE"]}}`, line 382 `"provider_type": user.role`, line 494 `if user.role in ["DOULA", "MIDWIFE"]` |
| `backend/routes/care_plans.py` | 749, 787, 882, 1191, 1241, 1281, 1304, 1338, 1365, 1385 (all `check_role(["DOULA", "MIDWIFE"])`); also lines 520, 596 use `{"role": {"$in": ["DOULA", "MIDWIFE"]}}`, lines 823–863 branch on `user.role == "DOULA"` / `"MIDWIFE"` for share request enrichment |
| `backend/routes/subscription.py` | 237, 317, 387, 447, 655 (all `check_role(["DOULA", "MIDWIFE"])`) |
| `backend/routes/invoices.py` | 68, 78, 104, 131 (shared `check_role(["DOULA", "MIDWIFE"])`) |
| `backend/routes/contracts.py` | 1299, 1312, 1360, 1374, 1424, 1437 (shared template endpoints `check_role(["DOULA", "MIDWIFE"])`); also lines 1301, 1315, 1377, 1440 use `template_type = "doula" if user.role == "DOULA" else "midwife"` — needs LACTATION branch |
| `backend/routes/feedback.py` | 143, 251 (`check_role(["DOULA", "MIDWIFE"])`); also line 162 `role_label = "Doula" if user.role == "DOULA" else "Midwife"` — add LACTATION label |
| `backend/routes/contractions.py` | 1253, 1303, 1373 (`if user.role not in ["DOULA", "MIDWIFE"]`); also lines 309, 317, 347, 355, 387, 395 branch on `provider_role == "DOULA"` / `"MIDWIFE"` for session sharing flags |
| `backend/routes/trial_emails.py` | 105, 316 (`{"role": {"$in": ["DOULA", "MIDWIFE"]}}` — query for pro users) |
| `backend/routes/shelbi_leads.py` | 302, 314 (`{"role": {"$in": ["DOULA", "MIDWIFE"]}}`; `if user.get("role") in ["DOULA", "MIDWIFE"]`); also line 316 `provider_type = "doula" if user["role"] == "DOULA" else "midwife"` — add LACTATION |
| `backend/routes/invites.py` | 34 | `INVITEE_ROLES = ["DOULA", "MIDWIFE"]` — add `"LACTATION"`; line 45 default `invitee_role: "DOULA"` |

### 3b. Role-specific (single-role) endpoints — decision needed

These are **MIDWIFE-only** clinical endpoints. LACTATION likely does **not** need visits/birth summaries/newborn exams/labor tracking. But if LACTATION needs its own visit-type, new routes would be created.

| File | Lines | Endpoint type |
|---|---|---|
| `backend/routes/visits.py` | 149, 160, 186, 206, 220, 272, 284, 315, 330, 340, 374, 398, 439, 531, 564 | All `check_role(["MIDWIFE"])` — visits, prenatal visits, birth summaries |
| `backend/routes/birth_summary.py` | 455, 530 | `check_role(["MIDWIFE"])` — birth summary PDF generation |
| `backend/routes/newborn_exam.py` | 199, 217, 230, 355, 381, 394 | All `check_role(["MIDWIFE"])` — newborn exam CRUD |
| `backend/routes/labor.py` | 101, 129, 214, 239, 313, 334 | All `check_role(["MIDWIFE"])` — labor tracking |
| `backend/routes/midwife.py` | 87, 141, 150, 181, 286, 307, 347, 381, 400, 411, 440, 457 | All `check_role(["MIDWIFE"])` — midwife onboarding, profile, dashboard, clients, notes |
| `backend/routes/contracts.py` | 1269, 1279 | `check_role(["MIDWIFE"])` — midwife contract defaults |

These are **DOULA-only** endpoints:

| File | Lines | Endpoint type |
|---|---|---|
| `backend/routes/doula.py` | 83, 132, 141, 163, 241, 264, 282, 303, 340, 374, 393, 404, 433, 450 | All `check_role(["DOULA"])` — doula onboarding, profile, dashboard, contract defaults, clients, notes |
| `backend/routes/contracts.py` | 361, 371, 377, 520, 559, 732, 750 | All `check_role(["DOULA"])` — doula contracts CRUD |
| `backend/routes/contracts.py` | 813, 823, 829, 919, 983, 1016, 1034, 1095 | All `check_role(["MIDWIFE"])` — midwife contracts CRUD |
| `backend/routes/invoices.py` | 146, 157, 202, 214, 233, 251, 311, 358, 374 | All `check_role(["DOULA"])` — doula invoices |
| `backend/routes/invoices.py` | 453, 464, 512, 524, 543, 561, 621, 637, 653 | All `check_role(["MIDWIFE"])` — midwife invoices |

**Key architectural decision:** The codebase has **parallel route files** (`doula.py` / `midwife.py`) with identical structure, plus a **unified** `provider_unified.py`. The cleanest path for LACTATION is to create `lactation.py` (mirroring `doula.py` since lactation consultants are non-clinical like doulas), OR generalize the unified routes to handle all three.

---

## 4. Backend Role-Specific Conditional Logic

| File | Lines | Pattern |
|---|---|---|
| `backend/routes/provider_unified.py` | 115 | `if user.role == "MIDWIFE": visits_count = …` — LACTATION likely doesn't need visits |
| `backend/routes/provider_unified.py` | 191 | `if user.role == "MIDWIFE": visits = …` (timeline) |
| `backend/routes/provider_unified.py` | 710 | `if user.role == "MIDWIFE": visits_this_month / births_this_month / prenatal_visits` — dashboard stats |
| `backend/routes/contracts.py` | 380, 832 | `provider_type: "DOULA"` / `provider_type: "MIDWIFE"` hardcoded in client lookup queries |
| `backend/routes/contracts.py` | 476, 939 | `db.doula_profiles.find_one(...)` / `db.midwife_profiles.find_one(...)` for contract PDF rendering |
| `backend/routes/contracts.py` | 626, 1162 | `"provider_role": "DOULA"` / `"provider_role": "MIDWIFE"` set in notification when sending contract |
| `backend/routes/contracts.py` | 1301, 1315, 1377, 1440 | `template_type = "doula" if user.role == "DOULA" else "midwife"` — binary ternary, needs LACTATION branch |
| `backend/routes/invoices.py` | 148, 179, 455, 467, 489, 578 | `provider_type: "DOULA"` / `"MIDWIFE"` in invoice queries and creation |
| `backend/routes/appointments.py` | 94, 329, 374 | `user.role in ["DOULA", "MIDWIFE"]` — appointment access checks |
| `backend/routes/messages.py` | 190–219 | Message relationship validation: `sender_role in ["DOULA", "MIDWIFE"]`, `receiver_role in ["DOULA", "MIDWIFE"]` — add LACTATION to all lists |
| `backend/routes/feedback.py` | 162 | `role_label = "Doula" if user.role == "DOULA" else "Midwife"` — add LACTATION |
| `backend/services/email_service.py` | 350 | `role_display = "Doula" if provider_role == "DOULA" else "Midwife"` — add LACTATION |
| `backend/routes/shelbi_leads.py` | 45, 147, 316 | `provider_type` validation against `VALID_PROVIDER_TYPES` (defined elsewhere, likely `["doula", "midwife"]`) and `provider_type = "doula" if … else "midwife"` |
| `backend/routes/contractions.py` | 309–395 | `if provider_role == "DOULA" and session.get("is_shared_with_doula")` / `elif provider_role == "MIDWIFE" and session.get("is_shared_with_midwife")` — LACTATION may need its own share flag |
| `backend/routes/care_plans.py` | 823–863 | `if user.role == "DOULA": … provider_type: "DOULA"` / `elif user.role == "MIDWIFE": … provider_type: "MIDWIFE"` — share request enrichment |
| `backend/routes/leads.py` | 382 | `"provider_type": user.role` — automatically uses role string, no change needed if LACTATION is a valid role |
| `backend/server.py` | 617, 920, 1103, 1138 | Pydantic model comments: `provider_type: str # DOULA or MIDWIFE` — update comments; the field itself is a string so it'll accept "LACTATION" at runtime |

---

## 5. Backend Contract Templates

| File | What needs changing |
|---|---|
| `backend/doula_contract_template.py` | Doula-specific contract text template. If LACTATION needs its own contract, create `lactation_contract_template.py`. |
| `backend/midwife_contract_template.py` | Midwife-specific contract text template. |
| `backend/server.py` | 39 — imports `DEFAULT_MIDWIFE_CONTRACT_FIELDS` — may need `DEFAULT_LACTATION_CONTRACT_FIELDS` |

---

## 6. Frontend Role Type Definitions

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/store/authStore.ts` | 12 | `role: 'MOM' \| 'DOULA' \| 'MIDWIFE' \| 'ADMIN'` — add `\| 'LACTATION'` |
| `frontend/src/components/provider/types/provider.ts` | 3 | `export type ProviderRole = 'DOULA' \| 'MIDWIFE'` — add `\| 'LACTATION'` |
| `frontend/src/services/billing/subscriptionConfig.ts` | 73 | `export type UserRole = 'MOM' \| 'DOULA' \| 'MIDWIFE'` — add `\| 'LACTATION'` |
| `frontend/src/services/billing/subscriptionConfig.ts` | 76 | `PRO_REQUIRED_ROLES: UserRole[] = ['DOULA', 'MIDWIFE']` — add `'LACTATION'` |
| `frontend/app/config/subscriptionConfig.ts` | (mirror) | Duplicates subscription config — check and update if it has its own role list |

---

## 7. Frontend Provider Configuration (providerConfig.ts)

**This is the central role-configuration hub for the frontend.** A new `LACTATION_CONFIG` block must be created.

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/components/provider/config/providerConfig.ts` | 95–183 | `DOULA_CONFIG` — model for LACTATION_CONFIG (features: no visits/clinical/birth summaries, like doula) |
| `frontend/src/components/provider/config/providerConfig.ts` | 185–268 | `MIDWIFE_CONFIG` — reference for clinical features |
| `frontend/src/components/provider/config/providerConfig.ts` | 271–275 | `getProviderConfig()` — `if normalizedRole === 'MIDWIFE' return MIDWIFE_CONFIG; return DOULA_CONFIG` — add `if normalizedRole === 'LACTATION' return LACTATION_CONFIG` |
| `frontend/src/components/provider/config/providerConfig.ts` | 99, 189 | `primaryColor: COLORS.roleDoula` / `COLORS.roleMidwife` — need `COLORS.roleLactation` |

### LACTATION_CONFIG specifics to define:
- **routes**: `/(lactation)/dashboard`, `/(lactation)/clients`, `/(lactation)/profile`, etc.
- **endpoints**: `/lactation/onboarding`, `/lactation/profile`, `/lactation/dashboard`, `/lactation/clients`, `/lactation/contracts`, `/lactation/invoices`, `/lactation/notes`
- **features**: `showVisits: false`, `showClinicalData: false`, `showBirthSummaries: false` (same as doula)
- **profileFields**: specialty options for lactation (e.g., IBCLC, CLC, breastfeeding support, pumping support)
- **clientStatuses**: likely same as doula `['Active', 'Prenatal', 'Contract Sent', 'Contract Signed', 'Postpartum', 'Completed']`

---

## 8. Frontend Contracts Configuration (contractsConfig.ts)

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/components/provider/config/contractsConfig.ts` | 22 | `role: 'DOULA' \| 'MIDWIFE'` in `ContractsConfig` interface — add `\| 'LACTATION'` |
| `frontend/src/components/provider/config/contractsConfig.ts` | 130–151 | `DOULA_CONTRACTS_CONFIG` — model for `LACTATION_CONTRACTS_CONFIG` with lactation-specific sections/defaults/endpoints |
| `frontend/src/components/provider/config/contractsConfig.ts` | 244–265 | `MIDWIFE_CONTRACTS_CONFIG` — reference |
| `frontend/src/components/provider/config/contractsConfig.ts` | 268–270 | `getContractsConfig(role)` — `role === 'DOULA' ? DOULA_CONTRACTS_CONFIG : MIDWIFE_CONTRACTS_CONFIG` — add LACTATION branch |

---

## 9. Frontend API Endpoints (api.ts)

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/constants/api.ts` | 81–88 | Doula endpoints block — add `LACTATION_ONBOARDING`, `LACTATION_PROFILE`, `LACTATION_DASHBOARD`, `LACTATION_CLIENTS`, `LACTATION_CONTRACTS`, `LACTATION_INVOICES`, `LACTATION_NOTES` |
| `frontend/src/constants/api.ts` | 90–99 | Midwife endpoints block — reference for structure |

---

## 10. Frontend Theme / Role Colors

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/constants/theme.ts` | 48–49 | `roleDoula: '#8E8CB5'`, `roleMidwife: '#A8B5A0'` — add `roleLactation: '#<color>'` |
| `frontend/src/constants/themeTokens.ts` | 60–63 (light), 209–213 (dark) | `role: { mom, doula, midwife, admin }` — add `lactation` to both light and dark themes |
| `frontend/src/contexts/ThemeContext.tsx` | (interface) | If role colors are mapped through a theme context, add `lactation` / `roleLactation` / `lactationPrimary` |

---

## 11. Frontend Routing & Role-Based Redirects

| File | Lines | What needs changing |
|---|---|---|
| `frontend/app/_layout.tsx` | 100 | `['mom-onboarding', 'doula-onboarding', 'midwife-onboarding'].includes(currentScreen)` — add `'lactation-onboarding'` |
| `frontend/app/_layout.tsx` | 111–119 | `if user.role === 'MOM' → /(mom)/home; elif 'DOULA' → /(doula)/dashboard; elif 'MIDWIFE' → /(midwife)/dashboard; elif 'ADMIN'` — add `elif 'LACTATION' → /(lactation)/dashboard` |
| `frontend/app/_layout.tsx` | 122–137 | `roleGroups = ['(mom)', '(doula)', '(midwife)', '(admin)']` and role mismatch redirect — add `'(lactation)'` and LACTATION redirect |
| `frontend/app/index.tsx` | 29–33 | `user.role === 'MOM' ? … : 'DOULA' ? … : 'MIDWIFE' ? … : 'ADMIN' ? …` — add `'LACTATION'` ternary branch |
| `frontend/app/(doula)/_layout.tsx` | 71 | `if (!user \|\| user.role !== 'DOULA')` — create `frontend/app/(lactation)/_layout.tsx` with `user.role !== 'LACTATION'` guard |
| `frontend/app/(midwife)/_layout.tsx` | 71 | `if (!user \|\| user.role !== 'MIDWIFE')` — reference for creating `(lactation)/_layout.tsx` |
| `frontend/app/(auth)/notification-permission.tsx` | 41–44 | `switch(userRole): case 'DOULA' → doula-onboarding; case 'MIDWIFE' → midwife-onboarding` — add `case 'LACTATION' → /(auth)/lactation-onboarding` |
| `frontend/app/plans-pricing.tsx` | 235 | `onboardingRole === 'MIDWIFE' ? '/(auth)/midwife-onboarding' : '/(auth)/doula-onboarding'` — add LACTATION branch |
| `frontend/app/tutorial.tsx` | 31–43 | `switch(role): case 'DOULA' → homeRoute: /(doula)/dashboard; case 'MIDWIFE' → /(midwife)/dashboard` — add `case 'LACTATION'` |
| `frontend/src/hooks/usePushNotifications.ts` | 292–293 | `switch(userRole): case 'DOULA' → '(doula)'; case 'MIDWIFE' → '(midwife)'` — add `case 'LACTATION' → '(lactation)'` |

**New route group needed:** `frontend/app/(lactation)/` with screens: `dashboard.tsx`, `clients.tsx`, `client-detail.tsx`, `profile.tsx`, `contracts.tsx`, `invoices.tsx`, `notes.tsx`, `messages.tsx`, `appointments.tsx`, `leads.tsx`, `subscription.tsx`, `client-birth-plans.tsx` — these can be thin wrappers using the shared provider components with `LACTATION_CONFIG`.

---

## 12. Frontend Onboarding Flow

| File | Lines | What needs changing |
|---|---|---|
| `frontend/app/(auth)/signup.tsx` | 22 | `type RoleOption = 'MOM' \| 'DOULA' \| 'MIDWIFE'` — add `\| 'LACTATION'` |
| `frontend/app/(auth)/signup.tsx` | 34–62 | `getRoleOptions()` array — add LACTATION card: `{ value: 'LACTATION', label: "I'm a Lactation Consultant", subtitle: '…', icon: '…', color: colors.roleLactation, pricing: 'Pro Features' }` |
| `frontend/src/components/OnboardingWalkthrough.tsx` | 30 | `role: 'MOM' \| 'DOULA' \| 'MIDWIFE'` — add `\| 'LACTATION'` |
| `frontend/src/components/OnboardingWalkthrough.tsx` | 70–122 | `STEPS_BY_ROLE` — add `LACTATION: [...]` array with 3 onboarding slides |
| `frontend/app/(auth)/onboarding-intro.tsx` | 26 | `role={user?.role as 'MOM' \| 'DOULA' \| 'MIDWIFE' \|\| 'MOM'}` — add `\| 'LACTATION'` |

**New file needed:** `frontend/app/(auth)/lactation-onboarding.tsx` — profile setup form for lactation consultants (credentials like IBCLC/CLC, services offered, bio, zip code). Model after `doula-onboarding.tsx`.

---

## 13. Frontend Provider Components (Role-Specific Branching)

| File | Lines | What needs changing |
|---|---|---|
| `frontend/src/components/provider/ProviderProfile.tsx` | 101–102 | `const isMidwife = config.role === 'MIDWIFE'` — LACTATION needs its own field set (credentials, services); may need `isLactation` or generalize |
| `frontend/src/components/provider/ProviderClientDetail.tsx` | 26, 70 | Imports `LaborSection, BirthRecordSection, PrenatalVisitSection, NewbornExamSection` from `../midwife`; `const isMidwife = config.role === 'MIDWIFE'` — LACTATION won't show these (like doula) |
| `frontend/src/components/provider/ProviderClients.tsx` | 98, 102, 214, 418, 430 | `const isMidwife = config.role === 'MIDWIFE'`; `subscriptionRoute = isMidwife ? '/(midwife)/subscription' : '/(doula)/subscription'`; `baseRoute = isMidwife ? '/(midwife)' : '/(doula)'` — needs LACTATION branch or generalize to use `config.routes` |
| `frontend/src/components/provider/ProviderLeads.tsx` | 95–96, 100, 293 | `config.role === 'MIDWIFE' ? '/(midwife)/…' : '/(doula)/…'`; `initial_status: config.role === 'DOULA' ? 'Active' : 'Prenatal'` — needs LACTATION branch |
| `frontend/src/components/provider/ProviderNotes.tsx` | 195 | `config.role === 'MIDWIFE' ? '/(midwife)' : '/(doula)'` — use `config.routes` instead, or add LACTATION |
| `frontend/src/components/provider/ProviderMessages.tsx` | 251 | `role === 'MIDWIFE' ? colors.roleMidwife : colors.roleDoula` — add LACTATION color |
| `frontend/src/components/provider/SubscriptionPage.tsx` | 31 | `role: 'MIDWIFE' \| 'DOULA'` — add `\| 'LACTATION'` |

---

## 14. Frontend Mom-Side Components (Display Provider Roles)

| File | Lines | What needs changing |
|---|---|---|
| `frontend/app/(mom)/marketplace.tsx` | 28 | `PROVIDER_TYPES = ['All', 'DOULA', 'MIDWIFE']` — add `'LACTATION'` |
| `frontend/app/(mom)/marketplace.tsx` | 387, 391 | `getRoleColor / getRoleIcon`: `role === 'DOULA' ? … : …` — add LACTATION |
| `frontend/app/(mom)/marketplace.tsx` | 450 | Filter chip text: `type === 'DOULA' ? 'Doulas' : 'Midwives'` — add LACTATION label |
| `frontend/app/(mom)/marketplace.tsx` | 517, 522, 527 | `provider.role === 'DOULA' && services_offered…` / `provider.role === 'MIDWIFE' && credentials…` — add LACTATION display |
| `frontend/app/(mom)/my-team.tsx` | 114, 250, 254 | `role === 'DOULA' ? 'people' : 'medkit'`; `member.provider_role === 'DOULA' ? colors.primary : colors.success` — add LACTATION |
| `frontend/app/(mom)/my-team.tsx` | 212, 417 | Copy: "Know a doula or midwife…" / "Find and connect with a doula or midwife…" — add "or lactation consultant" |
| `frontend/app/(mom)/share-birth-plan.tsx` | 27, 183, 211, 266, 309, 341 | `role: 'DOULA' \| 'MIDWIFE'`; icon `role === 'DOULA' ? 'people' : 'medkit'`; copy "doula or midwife" — add LACTATION |
| `frontend/app/(mom)/messages.tsx` | 160–177, 404, 670, 733, 753 | Legacy format parsing: `if data.doula → role: 'DOULA'`, `if data.midwife → role: 'MIDWIFE'`; `role === 'DOULA' ? colors.roleDoula : role === 'MIDWIFE' ? colors.roleMidwife`; icon mapping — add LACTATION |
| `frontend/app/(mom)/appointments.tsx` | 302–303, 424, 435, 557–558 | `provider_role === 'DOULA' ? colors.roleDoula : colors.roleMidwife`; icon `=== 'DOULA' ? 'heart' : 'medical'`; copy "doula or midwife" — add LACTATION |
| `frontend/app/(mom)/provider-detail.tsx` | 89, 93 | `role === 'DOULA' ? colors.roleDoula : colors.roleMidwife`; `role === 'DOULA' ? 'heart' : 'medkit'` — add LACTATION |
| `frontend/app/(mom)/invoices.tsx` | 68–71 | `getProviderTypeLabel`: `if type === 'DOULA' return 'Doula'; if 'MIDWIFE' return 'Midwife'` — add `if 'LACTATION' return 'Lactation Consultant'` |
| `frontend/app/(admin)/users.tsx` | 22–23, 72, 128 | Role color map: `'DOULA': colors.roleDoula, 'MIDWIFE': colors.roleMidwife`; filter list `['MOM', 'DOULA', 'MIDWIFE', 'ADMIN']` — add `'LACTATION'` to both |
| `frontend/src/store/badgeStore.ts` | 53 | `const isProvider = user.role === 'DOULA' \|\| user.role === 'MIDWIFE'` — add `\|\| user.role === 'LACTATION'` |

---

## 15. Frontend Doula-Onboarding Reference (for new lactation-onboarding.tsx)

| File | What to replicate |
|---|---|
| `frontend/app/(auth)/doula-onboarding.tsx` | Full onboarding form: name, zip, bio, services offered (multi-select), accepting clients toggle, marketplace toggle. Submits to `DOULA_ONBOARDING` endpoint, then navigates to `/plans-pricing?onboarding=true&role=DOULA`. The lactation version would submit to `LACTATION_ONBOARDING` and navigate with `role=LACTATION`. |

---

## 16. Backend Route Registration (server.py)

| File | Lines | What needs changing |
|---|---|---|
| `backend/server.py` | ~1462–1510 | Router imports: `from routes import doula as doula_routes`, `from routes import midwife as midwife_routes` — add `from routes import lactation as lactation_routes` (if creating a new route file) |
| `backend/server.py` | ~1510–1530 | `api_router.include_router(doula_routes.router)`, `api_router.include_router(midwife_routes.router)` — add `api_router.include_router(lactation_routes.router)` |

---

## 17. Test Files (Mirror Production Patterns)

All test files contain `DOULA`/`MIDWIFE` role assertions and fixtures. They will need LACTATION test coverage but existing tests won't break unless role lists are hardcoded. Key test files with role-specific logic:

- `backend/tests/test_doula_api.py` (15 DOULA refs)
- `backend/tests/test_doula_midwife_routes_phase7.py` (7+7)
- `backend/tests/test_collaboration_permissions.py` (9+4)
- `backend/tests/test_subscription_feature.py` (8+6)
- `backend/tests/test_subscription_readiness.py` (9+7)
- `backend/tests/test_provider_unified_phase13.py` (10+8)
- `backend/tests/test_messaging_contracts.py` (16)
- `backend/tests/test_new_features_iteration8.py` (6+6)
- `backend/tests/test_backend_refactoring_phase2.py` (7+5)
- `backend/tests/test_mom_section_fixes.py` (7+5)
- `backend/tests/test_share_birth_plan.py` (7+1)
- `backend/tests/test_9_fixes.py` (8)
- `backend/tests/test_new_features_v2.py` (1+5)
- (plus ~30 more test files with 1–4 role references each)

---

## Summary of New Files to Create

| File | Purpose |
|---|---|
| `backend/routes/lactation.py` | Lactation provider routes (onboarding, profile, dashboard, clients, notes) — mirror `doula.py` |
| `backend/lactation_contract_template.py` | Lactation service agreement template (if role-specific contracts needed) |
| `frontend/app/(auth)/lactation-onboarding.tsx` | Lactation consultant onboarding form — mirror `doula-onboarding.tsx` |
| `frontend/app/(lactation)/_layout.tsx` | Tab layout with role guard `user.role !== 'LACTATION'` |
| `frontend/app/(lactation)/dashboard.tsx` | Dashboard screen (uses `ProviderDashboard` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/clients.tsx` | Clients screen (uses `ProviderClients` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/client-detail.tsx` | Client detail (uses `ProviderClientDetail` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/profile.tsx` | Profile (uses `ProviderProfile` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/contracts.tsx` | Contracts (uses `ProviderContracts` with `LACTATION_CONTRACTS_CONFIG`) |
| `frontend/app/(lactation)/invoices.tsx` | Invoices (uses `ProviderInvoices` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/notes.tsx` | Notes (uses `ProviderNotes` with `LACTATION_CONFIG`) |
| `frontend/app/(lactation)/messages.tsx` | Messages |
| `frontend/app/(lactation)/appointments.tsx` | Appointments |
| `frontend/app/(lactation)/leads.tsx` | Leads |
| `frontend/app/(lactation)/subscription.tsx` | Subscription page |

## Key Architectural Patterns

1. **Role enum**: `ProviderRole(str, Enum)` in `backend/models/unified.py` — single source of truth for backend
2. **Role strings**: `ROLES` list duplicated in `server.py`, `auth.py`, `admin.py`, `admin_dashboard.py` — should be consolidated
3. **Profile collections**: Separate MongoDB collections per role (`doula_profiles`, `midwife_profiles`) — `lactation_profiles` follows pattern
4. **Provider config**: `providerConfig.ts` is the frontend's central config hub — `LACTATION_CONFIG` mirrors `DOULA_CONFIG`
5. **Binary role checks**: Many ternaries default to doula (`role === 'MIDWIFE' ? … : …`) — all need explicit LACTATION branches
6. **Route groups**: Expo Router uses `(doula)`, `(midwife)` groups — need `(lactation)` group with `_layout.tsx` guard
7. **`provider_type` field**: Stored on `clients`, `contracts`, `invoices`, `appointments` documents — LACTATION providers will store `"LACTATION"`
8. **`is_pro_role`**: LACTATION must be added to the pro subscription gating in both backend (`server.py:1548`) and frontend (`subscriptionConfig.ts:76`)