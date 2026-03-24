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

### March 24, 2025 - iOS Build Fix (RCT-Folly)
**Issue**: iOS build failing with `Unable to find a specification for RCT-Folly depended upon by RNIap`

**Root Cause**: `react-native-iap@12.16.4` has a podspec that depends on `RCT-Folly`, but in React Native 0.81+, `RCT-Folly` has been absorbed into prebuilt React Native dependencies and no longer exists as a standalone CocoaPod.

**Fix Applied**:
1. Created new Expo config plugin `/app/frontend/plugins/withIAPPodfilePatch.js`
2. This plugin adds a `pre_install` hook to the Podfile that patches `RNIap.podspec` at pod install time
3. The patch removes the `RCT-Folly` dependency line from the podspec
4. Registered the plugin in `app.json`
5. Removed `package-lock.json` to fix the "multiple lock files" warning

### March 23, 2025 - Previous Fixes
- Removed `patch-package` approach (incompatible with EAS)
- Created `withIAPPatch.js` to fix Android `currentActivity` compilation error
- Updated version to 1.0.5, versionCode/buildNumber to 108

## Architecture

```
/app
├── backend/
│   └── server.py              # FastAPI backend
└── frontend/
    ├── package.json           # No postinstall script
    ├── app.json               # Expo config with plugins
    ├── metro.config.js        # unstable_enablePackageExports: false
    ├── yarn.lock              # Single lock file (removed package-lock.json)
    └── plugins/
        ├── withIAPPatch.js         # Android: patches currentActivity
        ├── withIAPPodfilePatch.js  # iOS: adds pre_install hook to remove RCT-Folly dep
        └── withIAPStoreVariant.js  # IAP store variant config
```

## How iOS Podspec Patching Works
1. During `expo prebuild`, `withIAPPodfilePatch.js` runs
2. It modifies the generated `ios/Podfile` to add a `pre_install` hook
3. When EAS runs `pod install`, the pre_install hook executes FIRST
4. The hook patches `node_modules/react-native-iap/RNIap.podspec` to remove the `RCT-Folly` dependency
5. CocoaPods then resolves dependencies without the missing `RCT-Folly`

## Credentials
- Demo Account: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`

## Next Steps
1. Trigger new iOS deployment
2. Verify EAS build passes the "Install pods" phase
3. If successful, test IAP functionality with sandbox accounts
