# Reply to Apple App Review — v1.0.14 (build 122)

> Post in App Store Connect → Resolution Center under Submission ID
> d1e3b388-77c5-4cb4-b884-b05dfd87b293, OR (if submitting fresh) skip
> Resolution Center and submit version 1.0.14 with the App Review
> Information notes pasted into the version page.

---

Hello App Review,

Thank you for the detailed feedback on build 118. We have addressed all three items and uploaded a new version (1.0.14, build 122). Per-issue response below.

**Guideline 2.1(b) — In-App Purchase products not submitted for review**

Both subscription products (`truejoy.pro.monthly` $29.99/month and `truejoy.pro.annual` $274.99/year, each with a 14-day free trial) are now attached to version 1.0.14 in the In-App Purchases and Subscriptions section of the version page, in addition to the "True Joy Pro" subscription group. Each product has its App Review Screenshot uploaded and Review Notes filled in. The Subscription Group has its required Localization configured. The Paid Apps Agreement is Active under the Account Holder.

**Guideline 2.1(b) — Error on Start Free Trial**

The "Object is not a function" error you encountered was caused by a name collision inside our IAP service class: a private property used to track the StoreKit purchase listener was named the same as the public method that starts a purchase. After the listener registered, the property shadowed the method on the instance, so calling the public method threw "Object is not a function." We have:

1. Renamed the private listener property so it no longer shadows the method.
2. Verified the full purchase flow end-to-end in Xcode's StoreKit Test environment: the native Apple purchase sheet renders correctly with the 14-day free trial clearly indicated, the user can subscribe, and the app receives "Purchase Complete."
3. Hardened our hook layer with defensive resolution of the IAP service singleton in case any future Metro/Hermes ESM-to-CJS interop change re-introduces a similar issue.

**Guideline 2.3.6 — Age Rating: Messaging and Chat**

We have updated the Age Rating on the App Information page and set **Messaging and Chat** to **Yes**. The app includes in-app messaging between Moms and their connected care providers (Doulas and Midwives), and the rating now accurately reflects this.

**Role clarification (please use the Midwife or Doula demo account, not Mom)**

In True Joy Birthing, the Mom role is free and never subscribes. Pro subscriptions are for care providers (Doulas and Midwives) only. Please use the Midwife or Doula demo account below to test the subscription flow.

**Demo accounts**

- Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
- Doula:   demo.doula@truejoybirthing.com   / DemoDoula2024!
- Mom (free, no subscription): demo.mom@truejoybirthing.com / DemoMom2024!

**Reviewer steps to reach the paywall**

1. Launch the app and log in as the Midwife (or Doula).
2. Tap the Profile tab (bottom right).
3. Tap "Manage Subscription".
4. Tap a plan card (Monthly or Annual).
5. Tap "Start 14-Day Free Trial" — the native Apple purchase sheet appears.

Thank you for your patience. Please let us know if you run into any further issues.

Best regards,
The True Joy Birthing Team
