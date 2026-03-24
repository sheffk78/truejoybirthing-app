# TrueJoy Birthing App - Product Requirements Document

## Original Problem Statement
Production deployment (Expo/EAS) is failing. The application is suffering from dependency and build configuration conflicts (React Native 0.81, Reanimated v4, IAP, Metro bundler) during the EAS deployment phase.

## Product Requirements

### P0 - Critical
- **Finalize production build** so the app can be deployed to Google Play and Apple App Store

### P1 - High Priority
- Complete Apple/Google IAP Integration testing post-launch

### P2 - Medium Priority
- Stripe Integration for web-based subscriptions
- Admin Panel for user and application management

### P3 - Future
- Enhance UI with responsive breakpoints for tablet/iPad experience

## Tech Stack
- **Frontend**: React Native (Expo SDK 54, RN 0.81.5)
- **Backend**: FastAPI + MongoDB
- **IAP**: expo-iap 3.4.11 (MIGRATED from react-native-iap 12.16.4)

## What's Been Implemented

### December 2025 - MAJOR FIX: Migrated from react-native-iap to expo-iap
**Issue**: iOS build failing with `Unable to find a specification for RCT-Folly depended upon by RNIap` after 5+ failed attempts with various patching approaches.

**Root Cause**: `react-native-iap@12.16.4` has a podspec that depends on `RCT-Folly`, but in React Native 0.81+, `RCT-Folly` has been absorbed into prebuilt React Native dependencies. All patching approaches failed due to EAS build lifecycle.

**SOLUTION: Migrate to expo-iap**
- `expo-iap` is an Expo Module specifically designed for Expo SDK 54 and newer
- Maintained by the same author (hyochan) as react-native-iap
- No RCT-Folly dependency issues - uses modern Expo module architecture
- Version 3.4.11 released March 24, 2026 (same day!)

**Changes Made:**
1. Removed `react-native-iap@12.16.4`
2. Installed `expo-iap@3.4.11`
3. Updated `/app/frontend/src/services/billing/iapService.native.ts` to use expo-iap API
4. Removed all custom IAP plugins (`withIAPPatch.js`, `withIAPPodfilePatch.js`, `withIAPStoreVariant.js`)
5. Removed postinstall patch scripts
6. Added `expo-iap` to app.json plugins

### Why previous patching approaches failed:
1. **postinstall script**: Emergent deployment replaces it with their own `apply-expo-patch.js`
2. **eas-build-post-install**: For iOS, this runs AFTER `pod install` (too late!)
3. **Podfile pre_install hook**: Ruby hook wasn't executing properly on EAS
4. **Config plugins**: Run during prebuild but EAS skips prebuild when `ios/` dir exists

### March 23, 2025 - Previous Fixes (now obsolete)
- Removed `patch-package` approach (incompatible with EAS)
- Updated version to 1.0.5, versionCode/buildNumber to 108

## Architecture

```
/app
├── backend/
│   └── server.py              # FastAPI backend
└── frontend/
    ├── package.json           # Uses expo-iap, no custom postinstall
    ├── app.json               # expo-iap plugin registered
    ├── metro.config.js        # unstable_enablePackageExports: false
    ├── yarn.lock
    ├── scripts/
    │   └── reset-project.js   # Only standard Expo script
    └── src/services/billing/
        └── iapService.native.ts  # Updated to use expo-iap
```

## expo-iap vs react-native-iap
| Feature | expo-iap | react-native-iap |
|---------|----------|------------------|
| Architecture | Expo Module | Nitro Modules |
| Expo SDK 54 | Full support | Requires patches |
| RN 0.81 | Native support | RCT-Folly issues |
| API | Similar | Similar |
| Maintained by | hyochan | hyochan |

## Credentials
- Demo Account: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`

## Next Steps
1. Trigger new iOS deployment via Emergent
2. Verify EAS build passes (no more RCT-Folly error!)
3. If successful, test IAP functionality with sandbox accounts

### Previous Fixes
- Removed `patch-package` approach (incompatible with EAS)
- Created `withIAPPatch.js` to fix Android `currentActivity` compilation error
- Updated version to 1.0.5, versionCode/buildNumber to 108

## Architecture

```
/app
├── backend/
│   └── server.py              # FastAPI backend
└── frontend/
    ├── package.json           # Has postinstall + EAS hooks as fallbacks
    ├── app.json               # Expo config with plugins
    ├── metro.config.js        # unstable_enablePackageExports: false
    ├── yarn.lock              # Single lock file
    ├── scripts/
    │   └── patch-iap.js       # Node.js patch script (fallback)
    └── plugins/
        ├── withIAPPatch.js         # Android: patches currentActivity
        ├── withIAPPodfilePatch.js  # iOS: injects pre_install hook to patch RNIap
        └── withIAPStoreVariant.js  # IAP store variant config
```

## Credentials
- Demo Account: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`

## Next Steps
1. Trigger new iOS deployment via Emergent
2. Verify EAS build passes the "Install pods" phase
3. If successful, test IAP functionality with sandbox accounts
