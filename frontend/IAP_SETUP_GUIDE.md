# In-App Purchase Setup Guide for True Joy Birthing

This document provides step-by-step instructions for setting up in-app purchases on Apple App Store and Google Play Store.

## Product Configuration

### Product IDs

| Platform | Product ID | Type | Price | Billing Period |
|----------|------------|------|-------|----------------|
| **Apple iOS** | `truejoy.pro.monthly` | Auto-renewable Subscription | $29.00 | Monthly |
| **Apple iOS** | `truejoy.pro.annual` | Auto-renewable Subscription | $276.00 | Annual |
| **Google Android** | `truejoy_pro_monthly` | Subscription | $29.00 | Monthly |
| **Google Android** | `truejoy_pro_annual` | Subscription | $276.00 | Annual |

### Subscription Features (True Joy Pro)
- Client management and history
- Digital contracts with e-signatures
- Professional invoicing system
- Detailed client notes and history
- Visit tracking and summaries
- Marketplace profile visibility
- Priority support

### Free Trial
- **Duration**: 30 days
- **Available on**: Both monthly and annual plans
- **Auto-renewal**: Yes, after trial ends

---

## Apple App Store Connect Setup

### Step 1: Create App ID
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles → Identifiers
3. Create or verify the App ID: `com.truejoybirthing.app`
4. Enable the "In-App Purchase" capability

### Step 2: Create Subscription Group
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → Subscriptions
3. Create a new Subscription Group: "True Joy Pro"

### Step 3: Create Products
1. In the "True Joy Pro" subscription group, add:

**Monthly Subscription**
- Reference Name: True Joy Pro Monthly
- Product ID: `truejoy.pro.monthly`
- Price: $29.00 USD
- Duration: 1 Month
- Free Trial: 30 Days
- Localization:
  - Display Name: True Joy Pro
  - Description: Monthly access to all professional doula and midwife tools

**Annual Subscription**
- Reference Name: True Joy Pro Annual
- Product ID: `truejoy.pro.annual`
- Price: $276.00 USD
- Duration: 1 Year
- Free Trial: 30 Days
- Localization:
  - Display Name: True Joy Pro (Annual)
  - Description: Annual access to all professional tools - Save $72!

### Step 4: Review Information
1. Add a screenshot of your subscription UI
2. Fill in the review notes explaining the subscription
3. Complete the App Store License Agreement if not done

### Step 5: Enable Sandbox Testing
1. Go to Users and Access → Sandbox → Testers
2. Create sandbox test accounts for testing purchases
3. Use these accounts on a real device (not simulator) to test

---

## Google Play Console Setup

### Step 1: Set Up Google Play Billing
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app → Monetization Setup
3. Complete the merchant account setup if not done
4. Accept the Google Play Billing Agreement

### Step 2: Create Subscription Products
1. Go to Monetization → Subscriptions
2. Create two subscriptions:

**Monthly Subscription**
- Product ID: `truejoy_pro_monthly`
- Name: True Joy Pro Monthly
- Default price: $29.00 USD
- Billing period: Monthly
- Free trial: 30 days
- Description: Monthly access to all professional doula and midwife tools

**Annual Subscription**
- Product ID: `truejoy_pro_annual`
- Name: True Joy Pro Annual
- Default price: $276.00 USD
- Billing period: Yearly
- Free trial: 30 days
- Description: Annual access to all professional tools - Save $72!

### Step 3: Configure Base Plans & Offers
1. For each subscription, add a base plan with the pricing
2. Optionally add promotional offers

### Step 4: Internal Testing
1. Go to Testing → Internal testing
2. Create a new internal testing track
3. Add tester email addresses
4. Build and upload an APK/AAB
5. Testers can install via the internal testing opt-in link

### Step 5: License Testing
1. Go to Settings → License testing
2. Add tester email addresses
3. These accounts can make test purchases without being charged

---

## Backend Server-Side Receipt Validation

For production, you should validate receipts server-side:

### Apple Server-Side Validation
```python
# Endpoint: POST /api/subscription/validate-receipt
# 
# Apple provides two endpoints:
# - Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
# - Production: https://buy.itunes.apple.com/verifyReceipt
#
# Request body:
# {
#   "receipt-data": "<base64_encoded_receipt>",
#   "password": "<your_shared_secret>",
#   "exclude-old-transactions": true
# }
```

### Google Play Developer API
```python
# Use the Google Play Developer API to verify purchases:
# 
# Endpoint: GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
#
# Requires OAuth2 authentication with a service account
```

---

## Code Architecture

### Files
- `/app/frontend/app/services/billing.ts` - Main billing service with IAP functions
- `/app/frontend/app/hooks/useIAPSubscription.ts` - React hook for IAP
- `/app/frontend/app/config/subscriptionConfig.ts` - Product IDs and configuration
- `/app/frontend/src/store/subscriptionStore.ts` - Zustand store for subscription state
- `/app/frontend/app/plans-pricing.tsx` - Subscription UI screen

### Flow
1. App initializes → `initializeBilling()` connects to store
2. User views plans → `fetchProducts()` gets product info from store
3. User taps "Subscribe" → `purchaseProduct()` initiates store purchase flow
4. Store processes payment → `purchaseUpdatedListener` receives result
5. On success → `validateReceipt()` sends receipt to backend
6. Backend validates → Updates user subscription status in database
7. Frontend refreshes → User gains Pro access

---

## Testing Checklist

### Sandbox/Test Mode
- [ ] Create sandbox test accounts (Apple) / license testers (Google)
- [ ] Test purchasing monthly subscription
- [ ] Test purchasing annual subscription
- [ ] Test 30-day free trial activation
- [ ] Test restore purchases
- [ ] Test subscription expiration handling
- [ ] Test subscription renewal
- [ ] Test subscription cancellation
- [ ] Verify receipt validation with backend

### Production Readiness
- [ ] All product IDs match store configuration
- [ ] Correct pricing in all regions
- [ ] Subscription descriptions are accurate
- [ ] Free trial terms are clearly displayed
- [ ] Cancel anytime messaging is visible
- [ ] Privacy policy link is accessible
- [ ] Terms of service link is accessible
- [ ] Restore purchases button is functional
- [ ] Error handling for failed purchases
- [ ] Backend receipt validation is production-ready

---

## Common Issues & Solutions

### "Product not found" / E_ITEM_UNAVAILABLE
- Ensure product IDs exactly match store configuration
- Wait 30-60 minutes after creating products
- Check that the app bundle ID matches

### "User cancelled" / E_USER_CANCELLED
- This is normal when user backs out of purchase flow
- Don't show error alert for this case

### "Already owned" / E_ALREADY_OWNED
- User already has an active subscription
- Prompt to restore purchases instead

### Receipt validation fails
- Check shared secret (Apple) is correct
- Verify service account credentials (Google)
- Use sandbox endpoint for test purchases

---

## Support

For issues with the IAP implementation, check:
1. [react-native-iap GitHub](https://github.com/hyochan/react-native-iap)
2. [Apple In-App Purchase Documentation](https://developer.apple.com/in-app-purchase/)
3. [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
