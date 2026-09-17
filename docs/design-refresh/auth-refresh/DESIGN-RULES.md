# TJB Onboarding Design Rules (approved by Jeff 2026-09-16, msg 1549917295038562376)

The law for all auth + onboarding screens. Every new screen follows this exactly.
Source of truth: `auth-screens-1.html` (welcome/login, approved) + `auth-screens-3.html` (chunk 3, approved).

## 1. Photo → page transition (the rule Jeff enforced twice)

- ONE construction, everywhere: photo band at top + a **3-stop fade gradient** overlaying it:
  `linear-gradient(180deg, rgba(142,140,181,.15) 0%, rgba(250,248,245,0) 55%, #FAF8F5 100%)`
- Photo is **fully dissolved** to cream by the fade's bottom edge. Content starts only where the
  photo is 100% gone. No exceptions.
- **NEVER stack a solid card on top of a fade** — the card edge reads as a hard line and the fade
  tail reads as a "glow" (Jeff rejection, 2026-09-16: "hard line + glow effect"). This exact
  mistake was made twice: rev1 (text on photo) and rev2 (hard-edged cream card). Do not make it a third time.
- **NEVER put body text, inputs, buttons, OTP cells, or progress bars directly on a photo.**
  Only status bar + back chip live on photos. (Jeff rejection of packet v1.)

## 2. Verification rule (Jeff decision refined 2026-09-16 msg 1549918375239622757)

- Email verification is **never a gate** and is **out of the mom onboarding entirely**.
- **MOM flow:** signup → straight into onboarding. NO verify screen at all. Unverified moms
  get a subtle profile-page banner only ("Verify your email" — settings/profile, dismissible).
- **PRO flow:** verify-email is the **LAST step of pro onboarding**, after tutorial:
  6-cell OTP, auto-advance, resend cooldown, "Change it" link, sage skip note
  **"Skip for now — you won't appear in the marketplace until you verify."**
- Root-layout `email_verified` gate must NOT bounce unverified users to verify-email. Unverified
  users go through onboarding normally.
- Enforcement is marketplace-side, not onboarding-side: unverified pros complete everything,
  use the app, but do NOT list in the marketplace (Jeff's original 09-15 decision) until they
  verify — the last-step screen or the profile banner is where they do it.
- Moms who later become transactional (contact/booking) may hit a verify prompt at that moment.

## 3. Role split rule (verified in code 2026-09-16, Jeff-checked)

- Fork at signup role chips. Questions are role-scoped:
  - MOM: due date, birth setting (home/hospital/center/not sure), zip. Never practice name/years.
  - DOULA/MIDWIFE/LACTATION: practice name, zip, years (midwife also credential type). Never due date.
- Pros only see the paywall (plans-pricing); MOM routes to tutorial/home free forever.
- Pro marketplace listing = future verified-badge feature (email + credentials + admin review);
  unverified pros stay out of search, visible in-app with "Complete verification" nudge.

## 4. Verification workflow (before ANY design post)

0. **Icon law (Jeff 2026-09-16, msg 1549955108568305735):** NO generic AI/library icons — no emoji,
   no map-pins, no geometric Feather-style shapes. The only icon vocabulary is the approved
   organic C-curve line style from auth-screens-1/3 (soft hand-drawn strokes 1.7–2.0, sage #7C8F6F /
   rose #B87AA0 / gray #A8A9AC, occasional tiny rose dot accent). At 20px, prefer the *object's*
   silhouette (bassinet not dome-bell) — verify small icons with a 2–3x zoom crop before posting.
   Audience copy is never narrowed: "doulas, midwives, and other birthing professionals" —
   never "doulas and midwives" alone.
1. Render → crop each screen at correct frame offsets (verify frame boundaries by dark-gap scan,
   not assumed heights — crops were mis-offset once).
2. Objective seam check: max adjacent-row color jump in the transition zone. Hard edge > ~60,
   smooth fade < 30. Do not rely on leading questions to vision ("is the edge gone?") — vision
   confirmed a broken construction twice under leading prompts. Ask neutral, descriptive questions.
3. Asset refs must all exist on disk (missing file = flat color band).
4. Post the actual image to Discord with every design step — never describe only (Jeff rule).
5. Evidence → `VERIFY-chunk3.log` in this folder.

## 5. Approved-state discipline (added 2026-09-17 after overnight drift)

What Jeff saw overnight 09-16→09-17: an off-script re-derivation of already-approved screens
(plans paywall restyled, then a revert to the pre-approval version) got posted as "fresh shots".
None of it was a real repo change — it was re-designing from memory instead of from the approved
sources. Rules that now apply to every session:

- **Implemented-and-approved screens are LOCKED.** The approved implementation state is git
  `main` (330b41bb → 7895d9bd → 41972862 → 91bf8a3a, clean tree). Never re-style, "improve",
  or re-interpret an approved screen; never revert an approved change without Jeff explicitly
  naming the screen and the change.
- **Mockups extend approved sources only.** Every new screen derives its construction from
  auth-screens-1/3/4/5.html + DESIGN-RULES — never from memory or a stale note. If a summary
  contradicts DESIGN-RULES, DESIGN-RULES wins.
- **"Show me what you implemented" = screenshot the locked repo state**, verbatim — no
  rebuilds, no fresh takes, no new design decisions inside a screenshot pass.
- **Drift response protocol:** stop → diff the current state against the approved baseline →
  restore exactly → show the restored state → say nothing new was designed.