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

### December 2025 - iOS Build Fix (postinstall approach)
**Issue**: iOS build failing with `Unable to find a specification for RCT-Folly depended upon by RNIap`

**Root Cause**: `react-native-iap@12.16.4` has a podspec that depends on `RCT-Folly`, but in React Native 0.81+, `RCT-Folly` has been absorbed into prebuilt React Native dependencies and no longer exists as a standalone CocoaPod.

**Fix Applied (NEW - npm postinstall approach)**:
1. Created `/app/frontend/scripts/patch-iap.js` - a Node.js script that patches the RNIap.podspec
2. Added `"postinstall": "node ./scripts/patch-iap.js"` to package.json scripts
3. This runs AFTER `npm/yarn install` but BEFORE `expo prebuild` and `pod install`
4. The script removes the `RCT-Folly` dependency line from the podspec

**Why this approach works**:
- EAS Build lifecycle: `npm install` → `postinstall runs` → `expo prebuild` → `pod install`
- The postinstall script patches node_modules immediately after install, before pod install runs
- This is cleaner than config plugins which run during prebuild (after node_modules is already installed)

**Cleanup**:
- Removed `withIAPPodfilePatch.js` plugin (no longer needed)
- Simplified `withIAPPatch.js` to only handle Android patching
- iOS patching is now handled entirely by the postinstall script

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
    ├── package.json           # Has postinstall script for iOS patching
    ├── app.json               # Expo config with plugins
    ├── metro.config.js        # unstable_enablePackageExports: false
    ├── yarn.lock              # Single lock file
    ├── scripts/
    │   └── patch-iap.js       # iOS: patches RNIap.podspec (removes RCT-Folly dep)
    └── plugins/
        ├── withIAPPatch.js         # Android: patches currentActivity
        └── withIAPStoreVariant.js  # IAP store variant config
```

## How iOS Podspec Patching Works (postinstall approach)
1. EAS runs `npm install` or `yarn install`
2. The `postinstall` script in package.json is triggered
3. `scripts/patch-iap.js` runs and patches `node_modules/react-native-iap/RNIap.podspec`
4. The `RCT-Folly` dependency line is commented out
5. EAS continues with `expo prebuild`
6. EAS runs `pod install` - which now succeeds because the problematic dependency is removed

## Credentials
- Demo Account: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`

## Next Steps
1. Trigger new iOS deployment
2. Verify EAS build passes the "Install pods" phase
3. If successful, test IAP functionality with sandbox accounts
