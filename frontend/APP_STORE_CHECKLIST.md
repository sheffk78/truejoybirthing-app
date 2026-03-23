# True Joy Birthing - App Store Submission Checklist

## Overview
This document outlines all steps needed to submit True Joy Birthing to the Apple App Store and Google Play Store.

---

## 1. PRE-SUBMISSION REQUIREMENTS

### 1.1 App Configuration (app.json) ✅ DONE
- [x] App name: "True Joy Birthing"
- [x] Bundle ID (iOS): `com.truejoybirthing.app`
- [x] Package name (Android): `com.truejoybirthing.app`
- [x] Version: 1.0.0
- [x] Orientation: Portrait
- [x] IAP plugin configured
- [x] Billing permission for Android

### 1.2 EAS Build Configuration ✅ DONE
- [x] eas.json created with development, preview, and production profiles
- [ ] **ACTION REQUIRED**: Update eas.json with your Apple Team ID and App Store Connect App ID
- [ ] **ACTION REQUIRED**: Add Google Play service account JSON file

### 1.3 App Icons & Splash Screen ✅ DONE
- [x] icon.png (1024x1024) - App Store icon
- [x] adaptive-icon.png - Android adaptive icon
- [x] favicon.png - Web favicon
- [x] splash-image.png - Splash screen

**Recommendation**: Verify icons match your brand guidelines and look good at all sizes.

---

## 2. IN-APP PURCHASES SETUP

### 2.1 Apple App Store Connect
| Product ID | Type | Price | Status |
|------------|------|-------|--------|
| `truejoy.pro.monthly` | Auto-Renewable Subscription | $29.00/month | [ ] Create in ASC |
| `truejoy.pro.annual` | Auto-Renewable Subscription | $276.00/year | [ ] Create in ASC |

**Steps:**
1. Go to App Store Connect → Your App → Subscriptions
2. Create a subscription group called "True Joy Pro"
3. Add both products with matching Product IDs
4. Set up pricing and availability
5. Add localized descriptions and promotional text

### 2.2 Google Play Console
| Product ID | Base Plan | Price | Status |
|------------|-----------|-------|--------|
| `truejoy_pro` | `monthly` | $29.00/month | [ ] Create in GPC |
| `truejoy_pro` | `annual` | $276.00/year | [ ] Create in GPC |

**Steps:**
1. Go to Google Play Console → Monetize → Subscriptions
2. Create subscription product with ID `truejoy_pro`
3. Add base plans: "monthly" and "annual"
4. Set pricing for each base plan
5. Activate the subscription

---

## 3. REQUIRED LEGAL DOCUMENTS

### 3.1 Privacy Policy ⚠️ REQUIRED
- [ ] Privacy Policy URL (required for both stores)
- Must include: data collection, usage, sharing, retention
- Recommended: Host at `https://truejoybirthing.com/privacy-policy`

### 3.2 Terms of Service ⚠️ REQUIRED
- [ ] Terms of Service URL
- Must include: subscription terms, auto-renewal disclosure
- Recommended: Host at `https://truejoybirthing.com/terms`

### 3.3 EULA (End User License Agreement)
- [ ] Optional but recommended for subscriptions
- Apple provides a standard EULA if you don't have one

---

## 4. APP STORE METADATA

### 4.1 App Store Connect (iOS)
| Field | Max Length | Status |
|-------|------------|--------|
| App Name | 30 chars | [ ] |
| Subtitle | 30 chars | [ ] |
| Description | 4000 chars | [ ] |
| Keywords | 100 chars | [ ] |
| Support URL | - | [ ] |
| Marketing URL | - | [ ] |
| Screenshots (6.7" - iPhone 15 Pro Max) | 5-10 | [ ] |
| Screenshots (6.5" - iPhone 11 Pro Max) | 5-10 | [ ] |
| Screenshots (5.5" - iPhone 8 Plus) | 5-10 | [ ] |
| iPad Screenshots (if supporting) | 5-10 | [ ] |

**Screenshot Dimensions:**
- iPhone 6.7": 1290 x 2796 pixels
- iPhone 6.5": 1284 x 2778 pixels  
- iPhone 5.5": 1242 x 2208 pixels
- iPad 12.9": 2048 x 2732 pixels

### 4.2 Google Play Console (Android)
| Field | Max Length | Status |
|-------|------------|--------|
| App Name | 30 chars | [ ] |
| Short Description | 80 chars | [ ] |
| Full Description | 4000 chars | [ ] |
| Feature Graphic | 1024 x 500 | [ ] |
| Screenshots (Phone) | 2-8 | [ ] |
| Screenshots (Tablet - optional) | 2-8 | [ ] |

---

## 5. BUILD & SUBMISSION STEPS

### 5.1 Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 5.2 Configure EAS Project
```bash
cd /app/frontend
eas init
```
This will link to your Expo account and create the project.

### 5.3 Build for iOS
```bash
# Development build (for testing)
eas build --platform ios --profile development

# Production build (for App Store)
eas build --platform ios --profile production
```

### 5.4 Build for Android
```bash
# Preview APK (for internal testing)
eas build --platform android --profile preview

# Production AAB (for Google Play)
eas build --platform android --profile production
```

### 5.5 Submit to Stores
```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Google Play
eas submit --platform android --latest
```

---

## 6. TESTING CHECKLIST

### 6.1 Functional Testing
- [ ] User registration flow
- [ ] User login flow
- [ ] Password reset
- [ ] Mom features (birth plan, timeline, team)
- [ ] Doula features (clients, leads, messages)
- [ ] Midwife features (prenatal visits, labor log, newborn exam)
- [ ] Subscription flow (trial start)
- [ ] Subscription upgrade (trial → paid)
- [ ] Subscription upgrade (monthly → annual)
- [ ] Dark mode throughout app
- [ ] Push notifications (if implemented)

### 6.2 IAP Testing
**iOS (Sandbox):**
- [ ] Create sandbox tester in App Store Connect
- [ ] Test subscription purchase
- [ ] Test subscription restoration
- [ ] Test subscription cancellation

**Android (License Testing):**
- [ ] Add license testers in Google Play Console
- [ ] Test subscription purchase
- [ ] Test subscription restoration
- [ ] Test subscription cancellation

### 6.3 Edge Cases
- [ ] Offline behavior
- [ ] Network timeout handling
- [ ] Invalid input handling
- [ ] Deep link handling (if applicable)

---

## 7. COMMON REJECTION REASONS & FIXES

### Apple App Store
| Reason | Prevention |
|--------|------------|
| Guideline 3.1.1 - IAP | Ensure all digital content uses IAP, not external payments |
| Guideline 2.1 - Crashes | Test thoroughly on real devices |
| Guideline 4.2 - Minimum Functionality | Ensure app provides substantial value |
| Guideline 5.1.1 - Privacy | Include privacy policy, request only needed permissions |
| Metadata Issues | Accurate screenshots, no placeholder text |

### Google Play
| Reason | Prevention |
|--------|------------|
| Payment Policy | Use Google Play Billing for subscriptions |
| Deceptive Behavior | Clear subscription terms, no hidden charges |
| User Data Policy | Clear privacy policy, secure data handling |
| Impersonation | Don't use misleading app names or icons |

---

## 8. POST-SUBMISSION

### 8.1 App Review Timeline
- **Apple**: 24-48 hours (can be longer for first submission)
- **Google**: 3-7 days (can be faster for updates)

### 8.2 If Rejected
1. Read rejection reason carefully
2. Address specific issues mentioned
3. Reply to reviewer with changes made
4. Resubmit for review

### 8.3 After Approval
- [ ] Verify app appears in stores
- [ ] Test download and installation
- [ ] Test IAP with real purchases
- [ ] Monitor crash reports and reviews
- [ ] Plan regular updates

---

## 9. PRODUCTION ENVIRONMENT

### 9.1 Backend URL
Current preview URL: `https://bundle-resolve.preview.emergentagent.com`

**For production, you'll need:**
- [ ] Production backend hosted (AWS, Google Cloud, etc.)
- [ ] SSL certificate
- [ ] Update `EXPO_PUBLIC_BACKEND_URL` for production builds

### 9.2 Environment Variables
Create a `.env.production` file or use EAS secrets:
```bash
eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value "https://api.truejoybirthing.com"
```

---

## 10. QUICK REFERENCE

### Product IDs (must match exactly)
```
iOS Monthly: truejoy.pro.monthly
iOS Annual: truejoy.pro.annual
Android: truejoy_pro (with base plans: monthly, annual)
```

### Bundle/Package IDs
```
iOS: com.truejoybirthing.app
Android: com.truejoybirthing.app
```

### Key URLs Needed
- Privacy Policy: https://truejoybirthing.com/privacy-policy
- Terms of Service: https://truejoybirthing.com/terms
- Support: https://truejoybirthing.com/contact

---

*Last Updated: March 2025*
