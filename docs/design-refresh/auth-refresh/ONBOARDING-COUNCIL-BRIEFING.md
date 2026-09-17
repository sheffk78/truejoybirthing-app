#!/usr/bin/env python3
"""Council briefing: TJB onboarding evaluation (council running in background).
Compiles the verified flow facts each member was given + Kit's own read.

## Verified flow (from code, 2026-09-16)

MOM: welcome → signup (role + name/email/password) → verify-email (required)
  → 3-slide walkthrough → notification-permission (Maybe Later available)
  → single form: due date + birth setting + zip (progress bar 34/33/33)
  → success overlay → 6-slide tutorial → (mom)/home

PROS (doula/midwife/lactation): same front door → role-specific 3-slide walkthrough
  → form: practice name (+credentials for midwife, +services for doula) + zip + years
  → /plans-pricing?onboarding=true (paywall, skip/later available) → pro dashboard

## Kit's own read (to be reconciled with the 3 council verdicts)
- The split EXISTS and is real: mom = personal journey setup; pros = practice profile.
  That's the right skeleton. Two issues stand out:
  1. Pro paths are near-clones of each other (doula/lactation identical fields) —
     differentiation is one services multi-select. Midwife gets credentials. Fine for
     v1, thin for "dialed down" per-audience.
  2. Mom time-to-value is long: 8 screens before the birth-plan aha. The tutorial
     AFTER onboarding teaches what the walkthrough already promised — candidates to
     merge or cut to 2-3 slides.
- FOMO today is weak-to-organic: "Your journey to {dueDate} starts here" (good,
  personal), pro paywall w/ skip (fair). No manufactured urgency — on-brand, but
  also no pull to finish (no streaks/countdown/care-team tease).
- Known landmines: mandatory verify-email (necessary evil, resend exists),
  single-screen mom form (no endowed progress start), notification screen sits
  BEFORE value (standard, Maybe Later present).

## Council verdicts (3 independent perspectives, 2026-09-16)

| Question | Experience (mom lens) | Growth (metrics lens) | Design (brand lens) | Consensus |
|---|---|---|---|---|
| Q1 Mom vs pro dialed separately | 8/10 | 7/10 | 7/10 | **7-8/10 — split is real and right; execution uneven** (doula/lactation near-clones, LACTATION reads "Welcome, Doula!", paywall copy omits lactation) |
| Q2 Gets a person started | 6/10 | 4/10 | 6/10 | **4-6/10 — weakest axis.** ~15 screens to aha; birth plan promised 3× never touched; tutorial-after-form is inverted; email verify = #1 leak |
| Q3 Fun for the emotional context | 7/10 | 6/10 | 6/10 | **6-7/10 — soothing, not joyful.** Delight is passive (photos/copy) and concentrated in 3 screens; tutorial is the flattest screen and it's the mom capstone |
| Q4 FOMO / urgency | 4/10 | 3/10 | 8/10 | **Effectiveness 3-4/10, ethics 8/10.** No dark patterns (good) but also no pull. The due date — the strongest natural urgency lever in the category — is captured at step 1 and never used pre-home |

## Council-ranked improvements (cross-referenced)

1. **Cut the 6-slide tutorial → interactive first win (M).** Experience + Growth both flag the inverted tutorial. Best version: one seeded question in-flow ("How do you feel about pain medication? No wrong answer") → she lands home with her birth plan "In progress" (endowed progress). Alternative: straight to home with Start-Your-Birth-Plan as hero.
2. **Rebuild verify-email (S in-lane) / defer the gate (M, needs Jeff).** OTP boxes w/ auto-advance + auto-submit + resend cooldown + "wrong email? change it." Full soft-gate (proceed unverified w/ nudge) is the single biggest activation lever per Growth but changes the backend session contract — Jeff's call.
3. **Use the real due-date clock (L-M).** Countdown framing carried INTO onboarding ("Only N weeks to go — let's build your plan"), care-team tease after zip ("3 doulas near {zip} ready to support you"), "most moms finish by week 34" on home. Organic urgency, on-brand, zero dark patterns.
4. **Close the visual cliff (M — already planned as chunk 3).** signup → verify-email → notification-permission are the pre-refresh flat design: the emotional cold shower happens at peak intent. Chunk 3 aligns exactly.
5. **Flip the pro paywall (L-M, needs Jeff — monetization placement).** form → tutorial → dashboard → contextual "Activate Pro" (first client/first contract), instead of paywall before value.

## Consensus quick-fix list (S, clear bugs — in-lane)
- LACTATION tutorial reuses DOULA steps → "Welcome, Doula!" copy bug (tutorial.tsx:47-51)
- Doula progress bar hardcoded 100% (fake endowment, doula-onboarding.tsx:171)
- Mom zip lookup fails silently (console.log only; pros get an error message)
- "5.0 · 2 ratings" App Store badge — thin social proof, soften or drop
- design_guidelines.md says Playfair+Quicksand; code ships Cormorant+SourceSans3 — fix doc
- 1.5s success-overlay setTimeout never cleared on unmount (chunk-1 audit also caught this)
- Due-date picker min=today — postpartum/already-born moms can't enter reality; add "not pregnant yet/unsure" path

## Jeff decisions requested
1. Tutorial: cut to first-win interactive (rec) / keep-but-redesign to photo language?
2. Email verification: keep hard gate + humane OTP (rec, in-lane) vs soft-gate deferral (bigger lift, backend change)
3. Pro paywall: move after dashboard/value (rec) vs keep as-is

Full council transcripts: ~/.hermes/cache/delegation/live/deleg_1ccc1563/task-{0,1,2}.log