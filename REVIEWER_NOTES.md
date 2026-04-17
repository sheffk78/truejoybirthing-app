# App Store Review Notes — True Joy Birthing v1.0.12

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

## In-App Purchase Testing Instructions

1. Log in with the **Midwife** or **Doula** demo account above.
2. You will see populated demo data (clients, contracts, invoices) but certain actions (accepting clients, creating invoices) require an active subscription.
3. Navigate to **Profile → Subscription** or tap any "Subscribe" prompt.
4. The **"Choose Your Plan"** section displays Monthly ($29.99/mo) and Annual ($274.99/yr) options.
5. Tap **"Start Free Trial"** — this triggers the native StoreKit purchase sheet via In-App Purchase.
6. Complete the sandbox purchase to unlock all Pro features.
7. You can also tap **"Restore Previous Purchase"** to restore sandbox subscriptions.

## Subscription Architecture

- **Moms** have completely free access — no subscription required, no paywall shown.
- **Doulas & Midwives** require a Pro subscription ($29.99/month or $274.99/year with 14-day free trial).
- All digital content purchases go through **Apple In-App Purchase** (StoreKit 2 via expo-iap).
- The app does **not** link to or reference any external payment mechanisms for digital content.
- Subscription management directs users to iOS Settings → Subscriptions.
- Receipt validation is handled server-side at `/api/subscription/validate-receipt`.

## What Changed in This Build

- Demo accounts no longer bypass the IAP paywall — reviewers will see the full subscription flow.
- In-App Purchase is triggered directly from all subscription screens (no redirects).
- Trial period standardised to 14 days across all screens and backend.
- Receipt validation improved with JWS payload decoding for StoreKit 2 transactions.

## Additional Notes

- The app contains no external payment links for digital content.
- External links are limited to: Privacy Policy, Terms of Service, Disclaimer, and Contact/Support pages on truejoybirthing.com.
- YouTube video links open educational birth plan guidance content (not paid content).
- The "Manage Subscription" button opens the iOS Settings subscription management page.
