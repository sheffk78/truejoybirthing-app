# In-App Purchase (IAP) Setup Guide

## Overview
True Joy Birthing uses Apple App Store and Google Play Store subscriptions for provider accounts (Doulas & Midwives).

## Subscription Products

| Plan | Price | Period | Apple Product ID | Google Product ID |
|------|-------|--------|------------------|-------------------|
| Pro Monthly | $29 | Monthly | `truejoy.pro.monthly` | `truejoy_pro` (base plan: `monthly`) |
| Pro Annual | $276 | Annual | `truejoy.pro.annual` | `truejoy_pro` (base plan: `annual`) |

**Annual savings**: $72/year (21% discount)

---

## Apple App Store Connect Setup

### 1. Create Products in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: My Apps → True Joy Birthing → Subscriptions
3. Create a Subscription Group named "True Joy Pro"
4. Add two subscriptions:

**Pro Monthly ($29/month)**
- Reference Name: `True Joy Pro Monthly`
- Product ID: `truejoy.pro.monthly`
- Subscription Duration: 1 Month
- Price: $29.00 USD (Tier 28)
- Subscription Group: True Joy Pro

**Pro Annual ($276/year)**
- Reference Name: `True Joy Pro Annual`  
- Product ID: `truejoy.pro.annual`
- Subscription Duration: 1 Year
- Price: $276.00 USD (Tier 69)
- Subscription Group: True Joy Pro
- Promotional Text: "Save $72 per year!"

### 2. Configure Sandbox Testing

1. Go to: Users and Access → Sandbox → Testers
2. Create sandbox test accounts for testing purchases
3. Use these accounts on real iOS devices (not simulators)

### 3. Server-to-Server Notifications (Recommended)

1. In App Store Connect, go to: App Information → App Store Server Notifications
2. Set Production URL: `https://your-backend.com/api/subscription/apple-webhook`
3. Set Sandbox URL: `https://your-backend.com/api/subscription/apple-webhook`

---

## Google Play Console Setup

### 1. Create Products in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: Your App → Monetize → Subscriptions
3. Create a subscription:

**True Joy Pro**
- Product ID: `truejoy_pro`
- Create two Base Plans:
  - `monthly`: $29.00/month, billing period 1 month
  - `annual`: $276.00/year, billing period 1 year

### 2. Configure Testing

1. Go to: Setup → License testing
2. Add test email accounts
3. These accounts can make purchases without being charged

### 3. Real-time Developer Notifications (RTDN)

1. Go to: Monetization setup → Real-time developer notifications
2. Set Topic name to your Pub/Sub topic
3. Configure backend to receive notifications

---

## Testing Checklist

### iOS Testing
- [ ] Sandbox account created in App Store Connect
- [ ] Products appear in app when fetched
- [ ] Monthly purchase flow completes
- [ ] Annual purchase flow completes  
- [ ] Receipt validation works with backend
- [ ] Restore purchases works
- [ ] Subscription status correctly reflects in app

### Android Testing
- [ ] License tester account configured
- [ ] Products appear in app when fetched
- [ ] Monthly purchase flow completes
- [ ] Annual purchase flow completes
- [ ] Purchase token validation works with backend
- [ ] Restore purchases works
- [ ] Subscription status correctly reflects in app

---

## Code Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/services/billing/subscriptionConfig.ts` | Product IDs and pricing config |
| `frontend/src/services/billing/iapService.ts` | Core IAP service for Apple/Google |
| `frontend/src/services/billing/useIAP.ts` | React hook for IAP integration |
| `frontend/src/components/provider/SubscriptionPage.tsx` | Purchase UI |
| `backend/routes/subscription.py` | Receipt validation & subscription management |

---

## Important Notes

1. **Sandbox vs Production**: iOS sandbox uses `sandbox.itunes.apple.com` for receipt validation. The backend auto-detects based on receipt data.

2. **Price Changes**: If you change prices in App Store Connect or Play Console, update `subscriptionConfig.ts` accordingly.

3. **Grace Periods**: Both stores support billing grace periods. Handle `billing_retry` status appropriately.

4. **Introductory Offers**: Can be configured in App Store Connect for free trials or discounted first periods.

5. **Subscription Groups**: iOS allows only one active subscription per group. This prevents users from having both monthly and annual simultaneously.

---

## Troubleshooting

### "Product not found" error
- Verify Product IDs match exactly (case-sensitive)
- Ensure products are in "Ready to Submit" or "Approved" status
- Wait 24-48 hours after creating products for propagation

### "Purchase failed" on sandbox
- Clear sandbox account's purchase history in Settings
- Use a fresh sandbox account
- Ensure app is signed with correct provisioning profile

### Receipt validation fails
- Check server endpoints are accessible
- Verify shared secret for Apple (in App Store Connect)
- Check Pub/Sub credentials for Google

---

## Support

For IAP-related issues, contact:
- Apple: Developer Support in App Store Connect
- Google: Play Console Help Center
- App Support: support@truejoybirthing.com
