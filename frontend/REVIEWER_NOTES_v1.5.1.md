# App Store Review Notes — True Joy Birthing v1.5.1 (build TBD-by-EAS)

> Drafted 2026-10-15 for the next Apple submission. Paste into the version page
> "App Review Information" notes. Live-test every credential the SAME DAY as
> submission (2026-09-04 Play rejection lesson). Build number is assigned by
> EAS autoIncrement at build time — fill it in before submitting.

## What changed since 1.0.13/1.0.14 (reviewed pipeline)

- All IAP compliance work from 1.0.13 carries forward: paywall Privacy Policy +
  Terms of Use links, Guideline 3.1.2 full disclosure (price, frequency, trial,
  auto-renew), localized store pricing with configured-price fallback, and
  server-side StoreKit 2 JWS receipt validation against Apple Root CA - G3
  (`/api/subscription/validate-receipt`).
- Age rating already reflects **Messaging and Chat = Yes** (fixed in the
  1.0.14 cycle).
- Design system fully refreshed (typography/spacings/colors per approved
  design law); no functional changes to the IAP or messaging surfaces.
- Mom experience is free; Pro subscription applies to Doulas and Midwives only.

## Demo Accounts (live-verified 2026-10-15, HTTP 200 on prod)

- Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
- Doula: demo.doula@truejoybirthing.com / DemoDoula2024!
- Mom (free — no subscription): demo.mom@truejoybirthing.com / DemoMom2024!

## Subscription Architecture (unchanged, for reviewer context)

- Moms: completely free — no paywall is shown to them.
- Doulas & Midwives: Pro subscription — $29.99/month or $274.99/year, each
  with a 14-day free trial for new subscribers.
- Products: `truejoy.pro.monthly`, `truejoy.pro.annual` (confirm both are
  attached to this version with App Review screenshots; confirm Paid Apps
  Agreement is Active before submitting).
- All digital content purchases go through Apple In-App Purchase (StoreKit 2
  via expo-iap 3.x). No external payment links for digital content.
- "Manage Subscription" deep-links to iOS Settings → Subscriptions.
- In-app account deletion is available on both the provider profile screen
  and the mom profile screen.

## Reviewer Steps to Reach the Paywall

1. Launch the app and log in as the Midwife (or Doula).
2. Tap the Profile tab (bottom right).
3. Tap "Manage Subscription".
4. Tap a plan card (Monthly or Annual).
5. Tap "Start 14-Day Free Trial" — the native Apple purchase sheet appears.
   Complete the sandbox purchase; a "Purchase Complete" confirmation appears.
6. Restore check: quit and relaunch, open the Subscription screen, tap
   "Restore Previous Purchase".

## External Links

The app opens these public web pages only:
- https://truejoybirthing.com/privacy-policy/
- https://truejoybirthing.com/terms-of-service/
- https://truejoybirthing.com/contact/
- https://truejoybirthing.com/
- YouTube links for free educational birth-plan content

No external link initiates or accepts payment for digital content.

## Build Information

- Version: 1.5.1 (app.json)
- iOS buildNumber: assigned by EAS autoIncrement (source was 156)
- Bundle identifier: com.truejoybirthing.app
- Team: A3DU82XQTJ · ascAppId 6760793180 · Apple ID: jeff@socialize.video
- Primary SDK: Expo SDK 54 with expo-iap 3.4.x
- ITSAppUsesNonExemptEncryption: false