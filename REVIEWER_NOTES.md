# App Store Review Notes — True Joy Birthing v1.0.13 (build 118)

## Submission 1.0.13 summary (in response to rejection d1e3b388)

This build addresses every issue Apple flagged in the v1.0.12 review on iPad
Air 11" (M3), iPadOS 26.4.1, plus additional subscription-compliance
improvements. Please see the per-issue response below.

### 1. "Object is not a function" error on Start Free Trial — FIXED
The Subscription screen crashed because the native IAP service was calling
`expo-iap` v2 methods (`getSubscriptions`, `requestSubscription`) that were
removed in v3. We have migrated to the v3 API (`fetchProducts`,
`requestPurchase`) in `frontend/src/services/billing/iapService.native.ts`.
The Apple purchase sheet now presents as expected.

### 2. IAP products not attached to the submission — ADDRESSED IN APP STORE CONNECT
Both products have been submitted for review with this build:
  - `truejoy.pro.monthly` — True Joy Pro Monthly ($29.99/month, 14-day free trial)
  - `truejoy.pro.annual` — True Joy Pro Annual ($274.99/year, 14-day free trial)
App Review screenshots have been uploaded for each product.
The Paid Apps Agreement is active on the developer account.

### 3. Additional paywall compliance improvements
 - Privacy Policy and Terms of Use are now linked directly on both paywalls
   (provider Subscription screen and `/plans-pricing`) in addition to the
   welcome screen.
 - The subscription disclosure near the Start Free Trial button now lists
   exact price, billing frequency, trial length, included content, and the
   standard auto-renew language required by Apple Guideline 3.1.2.
 - Localized store pricing is displayed whenever `expo-iap` returns it, and
   falls back to the configured price only if the store lookup fails.
 - Fixed a display bug where the monthly card previously showed `/yr`.
 - Server-side Apple receipt validation now fully verifies the StoreKit 2
   JWS signature against Apple Root CA - G3, confirms the bundle identifier
   (`com.truejoybirthing.app`), and confirms the product identifier matches
   before granting subscription access.

## Demo Accounts

**Midwife Account:**
- Email: demo.midwife@truejoybirthing.com
- Password: DemoMidwife2024!

**Doula Account:**
- Email: demo.doula@truejoybirthing.com
- Password: DemoDoula2024!

**Mom Account (free — no subscription required):**
- Email: demo.mom@truejoybirthing.com
- Password: DemoMom2024!

## Reviewer Testing Steps

1. Open the app and tap "Log In".
2. Sign in with the Midwife or Doula demo account above.
3. Tap the **Profile** tab, then **Subscription** (or tap any "Subscribe" call
   to action elsewhere in the app).
4. The **Choose Your Plan** section will show:
   - True Joy Pro — Monthly: $29.99 per month
   - True Joy Pro — Annual: $274.99 per year (Save $84.89 per year)
   - 14-day free trial included on both plans
5. Select a plan, then tap **Start Free Trial**.
6. The native Apple purchase sheet should appear. Complete the sandbox
   purchase. A "Purchase Complete" confirmation alert will appear.
7. To test restore: fully quit and relaunch the app, open the Subscription
   screen, and tap **Restore Previous Purchase**.
8. Privacy Policy and Terms of Use links below the purchase button open in
   the system browser.

## Subscription Architecture

- **Moms** have completely free access — no subscription required, no paywall
  is shown to them.
- **Doulas & Midwives** require a Pro subscription ($29.99/month or
  $274.99/year, with a 14-day free trial for new subscribers).
- All digital content purchases go through **Apple In-App Purchase**
  (StoreKit 2 via expo-iap 3.x).
- The app does **not** link to, redirect to, or reference any external
  payment mechanisms for digital content.
- Subscription management deep-links to iOS Settings → Subscriptions via the
  "Manage Subscription" action.
- Server-side receipt validation at `/api/subscription/validate-receipt`
  fully verifies the StoreKit 2 JWS signature chain against Apple Root CA -
  G3 before granting access.
- In-app account deletion is available on both the provider profile screen
  and the mom profile screen.

## External Links

The app opens these public web pages only:
- https://truejoybirthing.com/privacy-policy/ — Privacy Policy
- https://truejoybirthing.com/terms-of-service/ — Terms of Use
- https://truejoybirthing.com/contact/ — Contact / Support
- https://truejoybirthing.com/ (disclaimers, informational pages)
- YouTube links for free educational birth-plan content

No external link initiates or accepts payment for digital content.

## Build Information

- Version: **1.0.13**
- iOS buildNumber: **118**
- Bundle identifier: `com.truejoybirthing.app`
- Primary SDK: Expo SDK with `expo-iap` v3.4.x
- Review device tested: iPad Air 11" (M3), iPadOS 26.4.1 (matches reviewer's device)
