# IAP Architectural Review: Retry-with-syncIOS vs. ASC Configuration

**Date:** May 4, 2026
**Reviewer:** Kit (Hermes subagent)
**App:** True Joy Birthing v1.0.14 (build 124)
**Rejection:** Apple Review, iPad Air (5th gen), iPadOS 26.4.2 — "subscriptions were unavailable"

---

## Executive Summary

**The proposed retry-with-syncIOS fix is addressing the wrong problem.**

Apple's rejection language is explicit: "Review the product configurations, complete any missing information, and test them in the sandbox." Combined with "products do not need prior approval to function in review," Apple is telling us the products are not discoverable in the review environment because of an App Store Connect configuration issue, not a code defect.

Adding syncIOS() and retry loops in the code is **a band-aid on a broken leg**. If ASC doesn't serve the products to Apple's review sandbox, no amount of retries will conjure them into existence.

---

## 1. What happened in each build

| Build | Code State | What Apple Saw | Outcome |
|-------|-----------|----------------|---------|
| 118 | `purchaseSubscription` was shadowed by a property named `purchaseSubscription` | "Object is not a function" crash | Rejected |
| 122 | fetchProducts returned empty → code fell back to mock prices → requestPurchase threw "SKU not found" | Crash on tapping Start Free Trial | Rejected |
| 123 | Duplicate `/api` prefix in hook-layer validation caused 404 after successful purchase | "Failed to validate purchase" error after purchase | Rejected |
| 124 | fetchProducts empty → returns `{source: 'empty'}` → paywall shows "temporarily unavailable" + Try Again | "Subscriptions were unavailable" — poor UX | Rejected |

Build 124 fixed the crash but exposed the underlying problem: **the products simply aren't loading from StoreKit in Apple's review environment.**

---

## 2. Is retry-with-syncIOS the right fix?

**No.** Here's why:

### What syncIOS() actually does
- syncIOS() syncs pending/unfinished transactions with the user's Apple ID.
- It does **NOT** populate the product catalog or make missing products appear.
- It is useful for: restoring purchases, resolving stuck transactions, detecting cross-device purchases.
- It is **irrelevant** for: products returning empty from `fetchProducts`.

### What retry loops actually do
- `fetchProducts` queries the App Store for product metadata by SKU.
- If ASC doesn't serve those SKUs to the reviewer's device, retrying doesn't help.
- 3 retries × 3s delays = 9 seconds of waiting for the same empty result.
- Apple reviewers will not wait 9 seconds; they'll see the unavailable state immediately.

### Apple's own words tell us the fix is ASC-side
> "Review the product configurations, complete any missing information, and test them in the sandbox."

Apple is not asking us to retry harder in code. They are asking us to verify the product metadata in App Store Connect and test in their sandbox environment.

---

## 3. Why fetchProducts returns empty (StoreKit behavior)

`fetchProducts` returns an empty array when **one or more of the following ASC conditions are not met:**

1. **Products not attached to the specific build version** (most common)
   - Even if products exist in the Subscriptions section, they must be added to the version page under "In-App Purchases and Subscriptions."
   - Uploading a new build can sometimes detach previously attached products.

2. **Missing Review Information**
   - Each product needs a Review Screenshot (1024×1024+, PNG/JPEG).
   - Each product needs Review Notes explaining how to reach the paywall.

3. **Subscription Group Localization incomplete**
   - The Subscription Group itself needs at least one localization with Display Name and Description.

4. **Paid Apps Agreement not fully active**
   - "Active" status requires banking, tax, and contact information to all be green.
   - Must be signed by the Account Holder (not just an admin).

5. **Bundle ID mismatch**
   - `com.truejoybirthing.app` in `app.json` must exactly match the App ID in the Apple Developer Portal and ASC.

6. **Product ID mismatch**
   - `truejoy.pro.monthly` and `truejoy.pro.annual` must match exactly (case-sensitive) in ASC.

7. **Sandbox propagation delay**
   - Products created or modified in ASC can take 15–60 minutes to propagate to sandbox.
   - Apple's review sandbox is separate from your TestFlight sandbox.

8. **Reviewer account/environment**
   - Apple's reviewers use special sandbox Apple IDs.
   - If the products weren't properly associated with the App ID when the reviewer tested, they won't see them.

**None of these are fixable with code retries.**

---

## 4. Could this be anything OTHER than ASC configuration?

### Unfinished transactions causing fetchProducts to return empty?
**No.** In StoreKit (both 1 and 2), `fetchProducts` queries the App Store for product metadata. It does not depend on the local transaction queue. Unfinished transactions can break the purchase flow but they do not affect product listing.

### Could the code be passing wrong SKUs?
**Unlikely, but verify:**
```typescript
const PRODUCT_SKUS = Platform.select({
  ios: [
    SUBSCRIPTION_PRODUCTS.APPLE.PRO_MONTHLY, // 'truejoy.pro.monthly'
    SUBSCRIPTION_PRODUCTS.APPLE.PRO_ANNUAL,  // 'truejoy.pro.annual'
  ],
  ...
});
```
These IDs must exactly match ASC. The code does appear correct, but ASC should be triple-checked.

### Could this be an iPad-specific issue?
**No.** There is no iPad-specific StoreKit behavior that would cause products to return empty. The reviewer might have had family sharing restrictions, but ASC configuration is the far more likely culprit.

---

## 5. UX Analysis: Is the "temporarily unavailable" message causing the rejection?

**Yes, partially.**

Apple's exact wording: "The In-App Purchase products in the app exhibited one or more bugs which create a poor user experience. Specifically, the subscriptions were unavailable."

The paywall in build 124 shows:
> "Subscriptions are temporarily unavailable. Please try again."

To Apple Review, this IS the bug. They don't distinguish between "code is broken" and "ASC is broken" — they see a dead-end screen where a purchase flow should be.

### The deeper problem
The UX should ideally never need to show this state in production. If ASC is correctly configured, StoreKit should serve products to reviewers almost 100% of the time. The fact that the app needs this fallback is a signal that the ASC setup is incomplete.

### Should the UX be improved anyway?
Yes, but as a defensive measure, not as the primary fix. Better approaches:
- Add a link to Settings → App Store account (so users can verify they're signed in)
- Show a more specific message: "Unable to connect to the App Store. Please ensure you're signed into your Apple ID."
- Hide the entire paywall and show "Contact Support" instead of a non-functional "Try Again" button

But improving this UX won't pass App Review. The only thing that passes review is **products actually loading**.

---

## 6. Should the code change at all?

### What code changes are worth making (defensive, not primary fixes):

1. **Add syncIOS() after initConnection** (low value, harmless)
   - Won't fix empty products, but is a best-practice initialization step.
   - Call it after `initConnection()` and before `fetchProducts`.
   - Check if `this.ExpoIap.syncIOS` exists before calling (defensive).

2. **Add ONE retry for fetchProducts** (marginal value)
   - A single retry with a 1–2s delay is defensible for transient network hiccups.
   - More than one retry is pointless for ASC-side failures.
   - Log each attempt clearly for crash/console diagnostics.

3. **Improve the empty-state UX** (worthwhile)
   - When `source === 'empty'`, show something more helpful than "temporarily unavailable."
   - Include a Settings link. Consider logging the exact SKU list that failed.

4. **Verify initConnection succeeds before fetchProducts** (already done, good)
   - The current code already does this.

### What code changes are NOT worth making:

- **3 retries × 3s delays** — wastes reviewer/user time, masks the real problem.
- **Calling syncIOS() in a loop** — syncIOS is idempotent but pointless in a loop.
- **Changing the SKU list** — the SKUs are correct; the problem is ASC serving them.

---

## 7. Recommended Action Plan

### Priority 1: ASC Audit (Do this NOW, before any code changes)

1. Open App Store Connect → True Joy Birthing → **Subscriptions**
   - [ ] Both products (`truejoy.pro.monthly`, `truejoy.pro.annual`) exist in the "True Joy Pro" group
   - [ ] Both show status **"Ready to Submit"** (blue dot)
   - [ ] Neither shows "Missing Metadata" (yellow) or "Developer Action Needed" (red)

2. For EACH product, click into it:
   - [ ] **Reference Name** is filled
   - [ ] **Subscription Duration** is set (1 Month / 1 Year)
   - [ ] **Price** is set in at least the Base Region
   - [ ] **Localization** — English (U.S.):
     - [ ] Display Name set
     - [ ] Description set
   - [ ] **Introductory Offer / Free Trial** created: 14-day free trial
   - [ ] **Review Information**:
     - [ ] **Screenshot uploaded** (must be actual paywall screenshot, 1024×1024+, PNG/JPEG)
     - [ ] **Review Notes** filled in (pasted from `APP_REVIEW_NOTES_v1.0.14.md`)

3. Subscription Group:
   - [ ] At least one localization with Display Name + Description
   - [ ] Subscription Group status is "Ready to Submit"

4. App Store tab → Version 1.0.14:
   - [ ] Scroll to **"In-App Purchases and Subscriptions"**
   - [ ] **BOTH products are attached** to this version
   - [ ] Save the version page

5. Agreements:
   - [ ] https://appstoreconnect.apple.com/business/agreements → **Paid Apps** shows **Active**
   - [ ] Banking, Tax, and Contact info are all green
   - [ ] Signed by Account Holder

6. App Information:
   - [ ] Age Rating → **Messaging and Chat** = **Yes** (already fixed per prior rejection)

### Priority 2: Test in Sandbox BEFORE submitting

- [ ] Create a NEW sandbox tester in ASC (brand-new Apple ID, never used for purchases)
- [ ] On a physical iOS device (not simulator), sign out of regular Apple ID in Settings → App Store
- [ ] Install the current build from TestFlight
- [ ] Log in as `demo.midwife@truejoybirthing.com`
- [ ] Go to Profile → Manage Subscription
- [ ] Verify products load and prices appear
- [ ] Tap Start 14-Day Free Trial → confirm native Apple purchase sheet renders
- [ ] If products are empty here → ASC is still misconfigured. Do NOT submit.

### Priority 3: Code changes (AFTER ASC is verified)

Only make these if ASC audit is clean AND sandbox testing shows products loading:

- Add `syncIOS()` after `initConnection()` as a best-practice hygiene step.
- Add ONE retry for `fetchProducts` with a 1–2s delay, with clear logging.
- Improve empty-state copy to reference Apple ID sign-in status.
- Bump build number and resubmit.

---

## 8. Direct Answer to the Core Questions

**Q1: Is retry-with-syncIOS actually the right fix, or is Apple telling us to check our ASC configuration?**
> Apple is explicitly telling us to check ASC configuration. The code fix is secondary at best, a distraction at worst.

**Q2: What if fetchProducts returns non-empty but products aren't "active"?**
> If StoreKit returns products, they ARE active from StoreKit's perspective. StoreKit silently omits misconfigured products. A non-empty result is effectively a clean bill of health. There's no additional code-level validation needed.

**Q3: Is the "temporarily unavailable" UX causing the "poor user experience" rejection?**
> Yes. Apple Review sees a dead-end screen where a purchase flow should be. The copy matters less than the fact that products won't load.

**Q4: Could pending/unfinished transactions cause fetchProducts to return empty?**
> No. fetchProducts queries product metadata from the App Store, independent of the local transaction queue. Clearing transactions is neither possible (you can only finish them) nor advisable.

**Q5: What does Apple's note about "products do not need prior approval" tell us?**
> Apple is clarifying that unapproved IAPs are testable in review. Combined with "test them in the sandbox," this is a strong signal that the products are not discoverable in their review environment due to missing metadata, missing attachment to the version, or a sandbox account issue.

**Q6: If the issue is ASC-side, should the code change at all?**
> The primary fix is ASC. Minor code changes (syncIOS, one retry, better empty-state UX) are defensible as belt-and-suspenders but will not resolve the rejection on their own.

---

## 9. Bottom Line

**Stop fixing the code and fix the App Store Connect configuration.**

Build 124 already handles empty products gracefully. The fact that Apple is still rejecting means the graceful handling IS the problem — they want products to load, not to be handled gracefully when they don't.

Run the ASC audit checklist above. If anything is yellow, red, or missing, fix it. Test in a fresh sandbox. Only after products load in sandbox should you consider any additional code changes.
