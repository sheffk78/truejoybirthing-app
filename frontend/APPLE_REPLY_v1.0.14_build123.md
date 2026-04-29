# Reply to Apple App Review — v1.0.14 (build 123)

> Resolution Center reply for Submission ID c0bd1a3a-8f08-46b4-9f20-592f00a08c6d
> (rejected build 122, iPad Air 11-inch, iPadOS 26.4.1).

---

Hello App Review,

Thank you for the additional feedback. We've addressed both issues in build 123 (still version 1.0.14).

**Guideline 2.3.2 — Price reference in promoted In-App Purchase metadata (True Joy Pro — Annual)**

We've updated the Promoted In-App Purchase metadata for True Joy Pro — Annual to remove all references to price and explicit savings amounts. The display name and description now describe only the value of the subscription, not its cost.

**Guideline 2.1(b) — Error message when tapping to purchase**

We identified the cause of the error your reviewer saw on iPad. There were two parallel receipt-validation calls firing after a successful StoreKit purchase: one from our purchase-listener service (which posted to the correct URL and successfully recorded the subscription on the server) and one from the UI hook layer that posted to a URL with a duplicated `/api` prefix and therefore returned a 404. The 404 surfaced as "Failed to validate purchase. Please contact support." even though the underlying purchase had been validated.

In build 123 we:

1. Removed the duplicate `/api` prefix in the hook-layer validation request.
2. Consolidated all receipt validation into the single purchase listener so there is exactly one validation request per purchase.
3. Hardened the listener to call `finishTransaction` only after the server confirms the receipt, and to surface a clear, user-facing error if validation ever fails (instead of a generic message).
4. Verified the full purchase flow against an iPad Air 11-inch in Apple Sandbox using the Midwife and Doula demo accounts: tap Subscribe → native Apple purchase sheet renders with the 14-day free trial → "You're all set" → "Purchase Complete. Thank you for subscribing to True Joy Pro!"

**Reminder on roles**

In True Joy Birthing, the **Mom role is free and never subscribes**. Only Doulas and Midwives can subscribe to Pro. Please use the **Midwife** or **Doula** demo account below to test the subscription flow.

**Demo accounts**

- Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
- Doula:   demo.doula@truejoybirthing.com   / DemoDoula2024!
- Mom (free, no subscription): demo.mom@truejoybirthing.com / DemoMom2024!

**Reviewer steps to reach the paywall**

1. Launch the app and log in as the Midwife (or Doula).
2. Tap the **Profile** tab (bottom right).
3. Tap **Manage Subscription**.
4. Tap a plan card (Monthly or Annual).
5. Tap **Start 14-Day Free Trial** — the native Apple purchase sheet appears.

Thank you again for your patience and the careful review.

Best regards,
The True Joy Birthing Team
