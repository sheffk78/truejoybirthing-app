# Onboarding Flow Audit — button/target verification (2026-09-16)

Every onPress traced to its navigation target; every target checked against the file tree.
Method: regex over router.push/replace across `frontend/app/`, target file existence checks,
backend endpoint reads (`routes/auth.py`, `services/email_service.py`).

## Verified flow (mom) — FINAL per Jeff 2026-09-16 msg 1549918375239622757
signup (role chip MOM) → register() → onboarding-intro → notification-permission →
mom-onboarding (due date, birth setting, zip) → tutorial → (mom)/home. ✅ NO email-verify
step anywhere in mom onboarding (taken out entirely). Unverified moms: subtle profile-page
banner only, enforced before transactional actions if ever needed.

## Verified flow (pro: doula/midwife/lactation) — FINAL per Jeff 2026-09-16
signup (pro chip) → onboarding-intro → notification-permission → pro-onboarding (practice,
zip, years; midwife + credential — NO mom questions) → plans-pricing → tutorial → dashboard,
THEN **verify-email as the LAST step**: skippable with warning "Skip for now — you won't
appear in the marketplace until you verify." Pro-only (moms never see it — their warning
copy wouldn't apply and it adds friction with zero mom value). Pros who skip: profile banner
+ marketplace listing blocked until verified (the enforcement Jeff defined 09-16).

## Navigation audit results (all 12 screens)
| screen | buttons | target | status |
|---|---|---|---|
| welcome | Get Started / Log In | signup / login | ✅ |
| login | Log In / forgot / signup / "See how it works" | guard(onboarding/dashboard) / forgot-password / signup / tutorial-preview | ✅ (updated 09-16: no verify-email hop) |
| signup | back / register / login link | welcome(back) / onboarding-intro / login | ✅ (updated 09-16: straight into onboarding) |
| verify-email | back / verify / resend / skip | role-dashboard in lastStep mode; login(back) otherwise / authStore.verifyEmail / resend-verification / skip → role dashboard | ✅ (updated 09-16: skip shipped) |
| onboarding-intro | swipe done | notification-permission?role=X (replace) | ✅ |
| notification-permission | Enable / Skip | getNextRoute(role) → role-onboarding | ✅ |
| mom-onboarding | complete | /tutorial?role=MOM | ✅ |
| doula/midwife/lactation-onboarding | complete | /plans-pricing?onboarding=true&role=X | ✅ |
| plans-pricing | subscribe/skip | tutorial (role steps) | ✅ (per earlier council review) |
| tutorial | finish | config.homeRoute per role | ✅ ((mom)/home, (doula)/dashboard exist) |
| tutorial-preview | done/skip | (auth)/login (replace) | ✅ read-only, fixed dead-end |

## Backend verification facts (email soft-verify support)
- /auth/register: creates user email_verified=False, generates secure code, sends via Postmark
  (POSTMARK_API_KEY env, sender no-reply@contact.truejoybirthing.com), does NOT return a session —
  registration is incomplete until verify.
- /auth/verify-email: checks code (unused+expiry), sets email_verified.
- /auth/resend-verification: exists, rate-limited 3/h, enumeration-safe.
- ⚠️ THE GAP: register returning no session + frontend hard-routes to verify-email = the wall
  Jeff approved removing. Design says "skip for now", but backend has no session-before-verify
  path and frontend verify-email.tsx has no skip button wired to bypass. Implementation of the
  approved design REQUIRES: register → immediate session (email_verified=false), skip button →
  onboarding, verify later at transactional moments (pro contact/booking, pro marketplace badge).

## Pro-verification plan (Jeff 2026-09-16 decision, not yet implemented)
Unverified pros CAN onboard + use the app; they do NOT appear in marketplace search until they
complete the pro verification bundle (email verify + credentials upload + admin review → badge).
Unverified pros visible in-app with "Complete verification" nudge.

## Design rules
See DESIGN-RULES.md in this folder (approved construction, verification workflow, role split).

## ✅ IMPLEMENTATION SHIPPED (2026-09-16, post-audit)

Backend (`backend/routes/auth.py`):
- `/auth/register`: grants IMMEDIATE session (email_verified=false) — the wall from §Backend Gap is gone. Code + Postmark email still sent.
- `/auth/login`: 403 EMAIL_NOT_VERIFIED removed — unverified users log in; returns real email_verified value.
Response fields on both: onboarding_completed, tutorial_completed, email_verified.

Marketplace gate (`backend/routes/marketplace.py`): doula/midwife/lactation search loops and `/provider/{user_id}` skip/404 unverified pros — invisible until verified.

Frontend:
- `authStore.register`: saves session_token + full user state (same shape as login).
- `signup.tsx`: register → `/(auth)/onboarding-intro` (no verify-email hop, moms AND pros).
- `tutorial.tsx`: pros (DOULA/MIDWIFE/LACTATION) unverified → verify-email LAST step with `lastStep: '1'`; verified pros + all moms → homeRoute.
- `verify-email.tsx`: `lastStep` mode — title "One Last Step", marketplace-warning subtitle, "Skip for now — you won't appear in the marketplace until you verify" (sage soft-note); Skip/Back/success → role dashboard. Non-lastStep mode unchanged (login-fallback context).
- `_layout.tsx`: email_verified bounce removed — unverified users onboard normally.
- `login.tsx`: verify-email fallback removed.
- Unverified banners (sage soft-note per DESIGN-RULES.md): `ProviderProfile.tsx` (covers doula/midwife/lactation thin wrappers) + `(mom)/profile.tsx`, tap → verify-email. Pro copy = marketplace-framed; mom copy = account-recovery framed.

Verified: tsc clean on all touched files (3 pre-existing errors elsewhere: contraction-timer ×2, websocket ×1); 11/11 grep flow-checks PASS; both backend files compile.

Still open (deliberate): pro verification BUNDLE (credentials upload + admin review → badge) per §Pro-verification; no deploy performed in this pass.
