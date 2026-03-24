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
- **IAP**: react-native-iap 12.16.4

## What's Been Implemented

### December 2025 - iOS Build Fix (Podfile pre_install hook approach)
**Issue**: iOS build failing with `Unable to find a specification for RCT-Folly depended upon by RNIap`

**Root Cause**: `react-native-iap@12.16.4` has a podspec that depends on `RCT-Folly`, but in React Native 0.81+, `RCT-Folly` has been absorbed into prebuilt React Native dependencies and no longer exists as a standalone CocoaPod.

**Why previous approaches failed**:
1. `postinstall` script: Runs after npm install locally, but EAS skips prebuild when `ios/` directory exists, so the patched node_modules aren't used
2. `eas-build-post-install`: According to official Expo docs, this runs AFTER pod install on iOS, not before

**Fix Applied (Podfile pre_install hook)**:
1. Created `/app/frontend/plugins/withIAPPodfilePatch.js` - a config plugin that injects a `pre_install` Ruby hook into the Podfile
2. The hook runs DURING `pod install` on the EAS server, BEFORE CocoaPods resolves dependencies
3. It patches `node_modules/react-native-iap/RNIap.podspec` to remove the `RCT-Folly` dependency
4. Also kept postinstall and eas-build-post-install scripts as fallbacks

**How the fix works on EAS**:
1. Emergent deployment runs `expo prebuild` → creates `ios/` directory with patched Podfile
2. Project uploaded to EAS (including the patched Podfile)
3. EAS runs `yarn install` (fresh node_modules with unpatched RNIap.podspec)
4. EAS runs `pod install` → **pre_install hook patches RNIap.podspec** before dependency resolution
5. CocoaPods resolves dependencies without the missing `RCT-Folly`
6. Build succeeds!

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
