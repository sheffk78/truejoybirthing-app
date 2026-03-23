# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a comprehensive birthing support application for expecting mothers, doulas, and midwives. The app allows moms to create birth plans, connect with care providers, and track their pregnancy journey. Providers can manage clients, send contracts/invoices, and provide ongoing support.

## Core Requirements
- Multi-role authentication (Mom, Doula, Midwife, Admin)
- Birth plan creation and sharing
- Provider marketplace and discovery
- Client management for providers
- Contract and invoice management
- Real-time messaging
- Contraction timer with pattern analysis
- Video content/education delivery

## User Personas
1. **Expecting Mom**: Creates birth plan, finds providers, tracks pregnancy
2. **Doula**: Manages clients, sends contracts, provides labor support
3. **Midwife**: Clinical care tracking, prenatal visits, birth records
4. **Admin**: Content management, user oversight

## Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: Custom theming with dynamic light/dark mode support

---

## What's Been Implemented

### Theme System (Completed - March 2025)
- [x] Theme Provider with React Context API
- [x] Zustand store with AsyncStorage persistence
- [x] Light and dark color palettes
- [x] `createThemedStyles` utility for StyleSheet migration
- [x] Settings UI for theme selection (Light/Dark/System)
- [x] Full migration of all components and screens to dynamic theming
- [x] Resolved all build errors from batch migration

### Contraction Timer Improvements (Completed & Verified - March 2025)
- [x] Changed tab bar icon from `timer-outline` to `stopwatch-outline`
- [x] Added icon mappings: `stopwatch-outline`, `flag-outline`, `water`, `stop-circle`, `radio-button-off`, `checkbox`, `square-outline`, `archive-outline`, `stats-chart-outline`
- [x] Fixed rest timer to properly count up after stopping contraction
- [x] Moved pattern status badge below action buttons (less intrusive)
- [x] Delayed "Early Labor" message until 3+ contractions recorded
- [x] Changed End button icon to `flag-outline`
- [x] Changed Water Broke icon to filled `water`
- [x] Fixed timer label text: "Contraction..." / "Surging..." / "Wave..." (was misspelled as "Contractioning", "Surgeing", "Waveing")
- [x] Fixed dark-mode placeholder text on all TextInputs (Water Breaking, Manual Entry, Session Notes)
- [x] Reduced spacing on stats strip, bottom actions, secondary actions, pattern status for less squished layout

### Provider Navigation Improvements (Completed & Verified - March 2025)
- [x] Notes page breadcrumb now navigates to client detail (not router.back())
- [x] Clients list "Birth Plan" button now goes directly to birth plan view
- [x] Clients list "Message" button now navigates with `clientUserId` (linked_mom_id) for auto-opening conversation

### Bug Fixes (Completed - March 2025)
- [x] Fixed Mom's "Schedule" screen showing no providers - Updated `/api/mom/team-providers` endpoint to include providers from clients collection and converted leads (not just share_requests)
- [x] Added profile pictures to messaging interface - Both Mom messages and Provider messages now display user profile pictures when available

### Authentication & Onboarding
- [x] Email/password login and registration
- [x] Google OAuth integration (Emergent-managed)
- [x] Role-based onboarding flows
- [x] JWT token management

### Mom Features
- [x] Birth plan creation with multiple sections
- [x] Provider discovery marketplace
- [x] Team management
- [x] Contraction timer with charts
- [x] Weekly pregnancy content
- [x] Messaging with providers

### Provider Features (Doula & Midwife)
- [x] Client management dashboard
- [x] Contract creation and sending
- [x] Invoice management
- [x] Lead tracking
- [x] Birth plan viewing
- [x] Messaging with clients

### Midwife-Specific Features
- [x] Prenatal visit tracking
- [x] Labor records
- [x] Birth records
- [x] Newborn exams

### Admin Features
- [x] Content management
- [x] User management

---

## Prioritized Backlog

### P0 (Critical)
- [x] Full regression testing of all changes (Completed March 2025)
- [x] Fixed production deployment blockers (December 2025):
  - Added missing `react-native-nitro-modules` peer dependency for `react-native-iap`
  - Added `resend` package to backend requirements.txt
  - Fixed `.gitignore` blocking `.env` files during deployment
- [x] Fixed Android app crash on launch (March 2026):
  - Fixed ThemeProvider context error - LoadingScreen was rendering before ThemeProvider
  - Downgraded react-native-iap from v14.7.12 to v12.16.4 (removes Nitro dependency)
  - Removed react-native-iap plugin from app.json
  - Regenerated fresh yarn.lock
- [x] Fixed app icon dimensions for Expo build validation (March 2026):
  - Resized adaptive-icon.png from 512x513 to 512x512
  - Resized icon.png from 512x513 to 512x512  
  - Resized favicon.png from 512x513 to 512x512
- [x] Fixed react-native-iap Gradle variant ambiguity (March 2026):
  - Created `plugins/withIAPStoreVariant.js` Expo config plugin
  - Plugin adds `missingDimensionStrategy 'store', 'play'` to Android build.gradle
  - Resolves Gradle error: "Cannot choose between amazonReleaseRuntimeElements and playReleaseRuntimeElements"
- [x] Fixed react-native-reanimated 4.x compatibility (March 2026):
  - Enabled New Architecture (`newArchEnabled: true` in app.json) - Required for Reanimated 4.x
  - Added `react-native-worklets@~0.7.0` dependency - Required by Reanimated 4.x
  - Fixes compilation error: "cannot find symbol TRACE_TAG_REACT_JAVA_BRIDGE"
- [x] Fixed react-native-iap Kotlin compilation error (December 2025):
  - React Native 0.81 removed `currentActivity` API, breaking react-native-iap@12.16.4
  - Created patch using `patch-package` to replace `currentActivity` with `reactApplicationContext.currentActivity`
  - Patch file: `patches/react-native-iap+12.16.4.patch`
  - Added `postinstall` script to package.json for auto-applying patch
- [x] Fixed EAS Update Metro bundling error - CRITICAL FIX (December 2025):
  - Error: "Cannot find module 'react-native-worklets/plugin'" during EAS OTA update
  - ROOT CAUSE: Expo SDK 54 enables `unstable_enablePackageExports` by default in Metro
  - This ESM package exports resolution breaks Babel's require() for react-native-worklets/plugin
  - SOLUTION: Added `config.resolver.unstable_enablePackageExports = false` to metro.config.js
  - Also pinned react-native-worklets@0.7.4 exactly and added resolutions field
- [x] Fixed Emergent deployment "patch-package not found" error (December 2025):
  - Error: `/bin/sh: 1: patch-package: not found` during `yarn install` postinstall script
  - ROOT CAUSE: `patch-package` and `postinstall-postinstall` were in `devDependencies`
  - During production builds, devDependencies are not installed, so `patch-package` command unavailable
  - SOLUTION: Moved `patch-package` and `postinstall-postinstall` from `devDependencies` to `dependencies`
- [x] Fixed react-native-iap patch not applied during EAS build (March 2026):
  - Error: `Unresolved reference 'currentActivity'` at RNIapModule.kt lines 464 and 540
  - ROOT CAUSE: Emergent deployment system overwrites `postinstall` script with its own `apply-expo-patch.js`
  - This prevents `patch-package` from running and applying the react-native-iap fix
  - SOLUTION: Created Expo config plugin `plugins/withIAPPatch.js` that applies the fix during prebuild
  - Plugin patches both occurrences of deprecated `currentActivity` API in RNIapModule.kt
  - Updated `patches/react-native-iap+12.16.4.patch` to cover both line 464 and line 540
  - Added `./plugins/withIAPPatch` to app.json plugins array

### P1 (High Priority)
- [ ] Apple IAP integration testing with sandbox accounts (post-deployment)
- [ ] Google Play IAP integration testing
- [ ] Stripe integration for web subscriptions

### P2 (Medium Priority)
- [ ] Admin panel enhancements
- [ ] Cross-platform alert utility abstraction
- [ ] Performance optimizations

### P3 (Nice to Have)
- [ ] Push notifications
- [ ] Offline support
- [ ] Analytics dashboard

---

## Key Technical Patterns

### Theme System
```typescript
// Use the createThemedStyles utility for StyleSheet objects
const getStyles = createThemedStyles((colors) => ({
  container: { backgroundColor: colors.background },
}));

// In component:
const colors = useColors();
const styles = getStyles(colors);

// For module-level constants that need colors, convert to functions:
const getStatusColors = (colors: ThemeColors) => ({
  active: colors.success,
  pending: colors.warning,
});
```

### Icon Mappings
Added the following to `src/components/Icon.tsx`:
```typescript
// Timer/Stopwatch
'timer': 'Timer',
'timer-outline': 'Timer',
'stopwatch': 'Timer',
'stopwatch-outline': 'Timer',

// Flag
'flag': 'Flag',
'flag-outline': 'Flag',

// Water/Droplet
'water': 'Droplet',
'water-outline': 'Droplet',

// Checkbox/Square
'checkbox': 'CheckSquare',
'square-outline': 'Square',

// Radio buttons
'radio-button-on': 'CircleDot',
'radio-button-off': 'Circle',

// Archive
'archive-outline': 'Archive',

// Stats/Chart
'stats-chart-outline': 'BarChart2',
```

### File Structure
```
/app/frontend
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens
│   ├── (mom)/             # Mom screens
│   ├── (doula)/           # Doula screens
│   ├── (midwife)/         # Midwife screens
│   └── (admin)/           # Admin screens
├── src/
│   ├── components/        # Shared components
│   ├── contexts/          # React contexts (ThemeContext)
│   ├── hooks/             # Custom hooks (useThemedStyles)
│   ├── store/             # Zustand stores
│   └── theme/             # Theme definitions
```

---

## Test Credentials
- **Mom**: demo.mom@truejoybirthing.com / DemoScreenshot2024!
- **Doula**: demo.doula@truejoybirthing.com / DemoScreenshot2024!
- **Midwife**: demo.midwife@truejoybirthing.com / DemoScreenshot2024!

---

## Known Issues
- Birth Plan percentage starts at 11% by design (not a bug - sections have minimum weights)

## Third-Party Integrations
- Bunny.net: Video streaming
- Resend: Transactional emails
- Emergent-managed Google Auth

---

*Last Updated: March 2026*
