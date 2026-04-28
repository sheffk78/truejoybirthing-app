# App Store Connect Fix Checklist — TJB v1.0.13 (build 118)

**Rejection Submission ID:** d1e3b388-77c5-4cb4-b884-b05dfd87b293
**Reviewed:** April 24, 2026 on iPad Air 11" (M3), iPadOS 26.4.1
**Goal:** Address all three rejection issues in App Store Connect, rebuild, resubmit.

> You told Apple in v1.0.13 that the IAPs were attached and reviewer screenshots were uploaded, but they still got "IAPs not submitted" + "error on Start Free Trial." That almost always means the IAPs exist in ASC but were **not attached to this specific build submission** (or the reviewer screenshot is missing on at least one product). Work through every box below — don't skip any, even if you think it's already done.

---

## 1. Paid Apps Agreement — MUST be active

Open: https://appstoreconnect.apple.com/business/agreements

- [ ] Confirm **Paid Apps** (aka "Paid Applications Agreement") shows status **Active** (not "Pending", not "Expired").
- [ ] If status is not Active, click through and sign. Confirm banking, tax, and contact information are all green.
- [ ] Confirm the signer is the **Account Holder** (not a delegated admin) — Apple specifically calls this out.

> If this isn't active, every IAP will fail in sandbox with exactly the kind of "error when we tapped on start free trial" Apple described.

---

## 2. Subscription products — configuration

Open: https://appstoreconnect.apple.com → My Apps → True Joy Birthing → **Subscriptions** (left sidebar, under "Monetization")

### Subscription group

- [ ] There is a subscription group named something like **"True Joy Pro"**.

### For EACH of the two products (`truejoy.pro.monthly` and `truejoy.pro.annual`):

- [ ] Product ID matches exactly: `truejoy.pro.monthly` or `truejoy.pro.annual` (case-sensitive).
- [ ] **Reference Name** is set.
- [ ] **Subscription Duration** set (1 Month / 1 Year).
- [ ] **Price** set in Base Region (at least one territory priced).
- [ ] **Localization** — at least English (U.S.):
  - [ ] Display Name set
  - [ ] Description set
- [ ] **Introductory Offer / Free Trial** created: 14-day free trial for new subscribers (must match what the UI says: "Start 14-Day Free Trial").
- [ ] **Review Information**:
  - [ ] **Screenshot** uploaded (must be actual screen from the app showing the paywall / Pro feature — **1024×1024 recommended or larger, PNG/JPEG**). ⚠️ This is the most commonly missed item and is one of the exact reasons cited in the rejection.
  - [ ] **Review Notes** filled in (explain how to reach the paywall — you already have good text in `REVIEWER_NOTES.md` you can paste).
- [ ] Status shows **"Ready to Submit"** (blue dot) — NOT "Missing Metadata" (yellow) or "Developer Action Needed" (red).

---

## 3. Attach IAPs to THIS build — the critical step that was missed last time

Open: App Store Connect → My Apps → True Joy Birthing → **App Store** tab → Version **1.0.13** (the pending iOS version).

- [ ] Scroll down to the **In-App Purchases and Subscriptions** section on the version page.
- [ ] Click **+** (or "Select"/"Edit") and add BOTH products:
  - [ ] `truejoy.pro.monthly`
  - [ ] `truejoy.pro.annual`
- [ ] Confirm both now appear in the list on the version page. **This is what "submit the IAP for review" actually means** — the products must be visually attached to this specific version.
- [ ] Save.

> If the products are only attached to the subscription group and not to the version, Apple treats them as "not submitted" — exactly what they said.

---

## 4. Age Rating — "Yes" to Messaging and Chat

Open: App Store Connect → My Apps → True Joy Birthing → **App Information** (under General, not a version).

- [ ] Find **Age Rating** row → click **Edit**.
- [ ] Find the question **"Unrestricted Web Access, Gambling and Contests, Messaging and Chat, User Generated Content..."** section (the App Store Connect wording as of 2025–2026 groups these; the specific item is "Messaging and Chat" or "Messaging, Chat, and Forums").
- [ ] Set **Messaging and Chat** to **Yes** (the app has in-app messaging in `(mom)/messages.tsx`, `(doula)/messages.tsx`, `(midwife)/messages.tsx` — Apple will verify).
- [ ] Review the resulting rating (probably still 4+ or 9+; messaging alone doesn't usually raise it much for this app) and confirm.
- [ ] Save.

> Age Rating changes propagate to the version automatically.

---

## 5. Binary — rebuild and re-upload

Even if you only changed ASC metadata, Apple's "Next Steps" says to "upload a new binary." Safer to rev the build number and upload.

- [ ] Bump `app.json` → `ios.buildNumber` from `118` → `119` (keep version `1.0.13`).
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios --latest` (or Transporter).
- [ ] Wait for processing (usually 15–45 min).
- [ ] On the version 1.0.13 page, select the new build (119).
- [ ] Re-verify both IAPs are still attached to the version (section 3 above).

---

## 6. Final pre-submit checklist (on version 1.0.13 page)

- [ ] Build (119) selected.
- [ ] Both IAPs attached and each shows status "Ready to Submit".
- [ ] Paid Apps Agreement: Active.
- [ ] Age Rating: Messaging and Chat = Yes.
- [ ] What's New in This Version: filled in (can reuse prior text).
- [ ] Screenshots for iPad 12.9" or 13" present (required since app supports tablet).
- [ ] Privacy Policy URL and Support URL filled in.
- [ ] No lingering warning banners on the version page.

---

## 7. Submit

- [ ] Click **Add for Review** → **Submit for Review**.
- [ ] Reply in App Store Connect's Resolution Center using the reply text in `APPLE_REPLY_v1.0.13.md`.

---

## 8. Sandbox verify BEFORE submitting (strongly recommended)

To avoid a fourth rejection, verify the purchase flow yourself in sandbox:

- [ ] In App Store Connect → Users and Access → **Sandbox Testers** → create a test account (must be a brand-new Apple ID that has never purchased anything).
- [ ] On a real iOS device (not simulator), sign out of your regular Apple ID under Settings → App Store.
- [ ] Install the 1.0.13 build from TestFlight.
- [ ] Open the app → log in as `demo.midwife@truejoybirthing.com` → go to Subscription → tap **Start 14-Day Free Trial**.
- [ ] When prompted for Apple ID, sign in with the **sandbox tester** account.
- [ ] Confirm the native Apple purchase sheet appears (with "FREE TRIAL" clearly indicated) and a sandbox purchase completes without error.
- [ ] If you see "Cannot connect to iTunes Store" or "The operation couldn't be completed" → IAPs are still not attached or Paid Apps Agreement not active. Stop and fix before resubmitting.
