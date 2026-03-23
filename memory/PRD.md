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

### December 23, 2025 - Deployment Fix
**Root Cause Identified**: `patch-package` is fundamentally incompatible with EAS cloud builds because:
1. EAS builds don't persist node_modules from postinstall scripts
2. The build environment PATH doesn't include node_modules/.bin
3. Dual patching approach (patch-package + config plugin) caused conflicts

**Fix Applied**:
1. ✅ Removed `patch-package` and `postinstall-postinstall` from dependencies
2. ✅ Removed `postinstall` script from package.json
3. ✅ Deleted `/app/frontend/patches/` directory
4. ✅ Removed `react-native-worklets` from dependencies (kept in resolutions for version control)
5. ✅ Verified `withIAPPatch.js` Expo config plugin handles IAP patching during prebuild

**How IAP Patching Now Works**:
- The `withIAPPatch.js` config plugin (in `/app/frontend/plugins/`) patches the `currentActivity` compilation error during Expo's prebuild phase
- This is the correct approach for EAS builds as it runs before native compilation
- The plugin is registered in `app.json` under plugins array

## Architecture

```
/app
├── backend/
│   └── server.py              # FastAPI backend
└── frontend/
    ├── package.json           # No postinstall script
    ├── app.json               # Expo config with plugins
    ├── metro.config.js        # unstable_enablePackageExports: false
    └── plugins/
        ├── withIAPPatch.js    # Patches react-native-iap for RN 0.81+
        └── withIAPStoreVariant.js
```

## Credentials
- Demo Account: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!`

## Next Steps
1. Trigger new deployment
2. Verify EAS build passes eas-update and native compilation steps
3. Test IAP functionality with sandbox accounts post-deployment
