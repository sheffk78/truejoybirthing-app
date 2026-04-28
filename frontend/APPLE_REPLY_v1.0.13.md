# Reply to Apple App Review — v1.0.13 (build 119)

> Post this reply in App Store Connect → Resolution Center under Submission ID d1e3b388-77c5-4cb4-b884-b05dfd87b293, after you have (a) attached both IAPs to the 1.0.13 version, (b) updated Age Rating, (c) uploaded build 119, and (d) verified a sandbox purchase completes without error on an iPad.

---

Hello App Review,

Thank you for the detailed feedback on build 118. We have addressed all three items and uploaded a new binary (build 119). Here is the per-issue response:

**Guideline 2.1(b) — In-App Purchase products not submitted for review**

Both subscription products (`truejoy.pro.monthly` and `truejoy.pro.annual`) are now attached to this version (1.0.13) in the In-App Purchases section of the version page, in addition to being configured in the "True Joy Pro" subscription group. App Review screenshots and Review Notes have been uploaded for each product. The Paid Apps Agreement is Active under the Account Holder.

**Guideline 2.1(b) — Error on Start Free Trial**

The error you encountered on the iPad Air 11" (M3) was caused by the In-App Purchase products not being attached to this version, so StoreKit could not resolve the product IDs at runtime. With the products now attached and the Paid Apps Agreement confirmed active, we have verified the full purchase flow end-to-end in sandbox on a physical iPad running iPadOS 26.4.1:

1. Log in with the Midwife demo account (below).
2. Open Profile → Subscription (or tap any Pro upsell).
3. Select a plan → tap **Start 14-Day Free Trial**.
4. The native Apple purchase sheet presents with the 14-day free trial clearly indicated, and the sandbox transaction completes, followed by our in-app "Purchase Complete" confirmation.

**Guideline 2.3.6 — Age Rating: Messaging and Chat**

We have updated the Age Rating on the App Information page and set **Messaging and Chat** to **Yes**. The app includes in-app messaging between Moms and their connected care providers (Doulas and Midwives), so this now accurately reflects the app's functionality.

**Demo accounts (for reviewer convenience)**

- Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
- Doula: demo.doula@truejoybirthing.com / DemoDoula2024!
- Mom (free, no subscription): demo.mom@truejoybirthing.com / DemoMom2024!

Full reviewer steps remain in the App Review Information notes on this submission.

Thank you for your patience. Please let us know if you run into any further issues.

Best regards,
The True Joy Birthing Team
