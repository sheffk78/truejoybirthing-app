# Screenshot Capture Guide for True Joy Birthing

This document provides comprehensive instructions for capturing high-quality screenshots for:
- Apple App Store listing
- Google Play Store listing  
- Onboarding screens
- Marketing materials

## Demo Account Credentials

| Role | Email | Password |
|------|-------|----------|
| **Demo Doula** | demo.doula@truejoybirthing.com | DemoScreenshot2024! |
| **Demo Midwife** | demo.midwife@truejoybirthing.com | DemoScreenshot2024! |
| **Demo Mom** | demo.mom@truejoybirthing.com | DemoScreenshot2024! |

## Demo Data Overview

The seed script creates the following realistic data:

### Providers (4 Doulas, 3 Midwives)
- **Sarah Mitchell** (Primary Demo Doula) - 8 years experience, Austin TX
- **Emily Thompson** (Primary Demo Midwife) - 15 years experience, CNM, IBCLC
- Plus 5 additional providers with varied specialties and locations

### Clients (8 Moms linked to providers)
- **Emma Johnson** (Primary Demo Mom) - Birth Center, Due in ~10 weeks
- Plus 7 additional moms with varied due dates and birth settings

### Content
- Realistic message conversations between providers and clients
- Paid, sent, and draft invoices
- Signed service agreement/contract
- Complete birth plan (Emma Johnson)
- Prenatal visit notes

---

## Screenshot Specifications

### Apple App Store Requirements

| Device | Required Size | Aspect Ratio |
|--------|--------------|--------------|
| iPhone 6.9" (14 Pro Max) | 1320 × 2868 | 9:19.5 |
| iPhone 6.7" (14 Plus) | 1290 × 2796 | 9:19.5 |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 | 9:19.5 |
| iPhone 5.5" (8 Plus) | 1242 × 2208 | 9:16 |
| iPad Pro 12.9" | 2048 × 2732 | 3:4 |

**Recommendation**: Capture at iPhone 14 Pro Max (6.9") as your base, which covers most requirements.

### Google Play Store Requirements

| Type | Required Size |
|------|--------------|
| Phone | 1080 × 1920 minimum (16:9) or 1080 × 2340 (9:19.5) |
| Tablet 7" | 1200 × 1920 |
| Tablet 10" | 1920 × 1200 |

**Recommendation**: Use 1290 × 2796 for phones (same as iOS 6.7").

---

## Screenshots Checklist (12 Essential Screens)

### For Mom Users (demo.mom@truejoybirthing.com)

| # | Screen | What to Show | Notes |
|---|--------|--------------|-------|
| 1 | **Welcome/Onboarding** | App intro with value props | Before login |
| 2 | **Mom Dashboard** | Pregnancy timeline, tips, connections | Shows weekly tip, care team |
| 3 | **Birth Plan - Overview** | All sections at various completion | Shows progress |
| 4 | **Birth Plan - Section** | Filled-out section example | Labor preferences or newborn care |
| 5 | **Messages** | Conversation with provider | Shows warm, supportive exchange |
| 6 | **Marketplace** | Provider listings | Shows doula and midwife profiles |

### For Provider Users (demo.doula@truejoybirthing.com or demo.midwife@truejoybirthing.com)

| # | Screen | What to Show | Notes |
|---|--------|--------------|-------|
| 7 | **Provider Dashboard** | Metrics, quick actions, upcoming | Shows active clients, invoices |
| 8 | **Clients List** | Multiple clients with status | Shows EDD, birth settings |
| 9 | **Client Detail** | Notes, appointments, connection | Full client profile |
| 10 | **Messages** | Conversation thread | Professional, warm exchange |
| 11 | **Invoices** | List with paid/sent/draft | Shows financial management |
| 12 | **Profile** | Complete provider profile | Photo, bio, specialties, services |

---

## Step-by-Step Capture Process

### Option A: Using iOS Simulator (Recommended for iOS Screenshots)

1. **Setup**
   ```bash
   # Install Xcode from Mac App Store
   # Open Simulator from Xcode > Open Developer Tool > Simulator
   
   # Create a device for iPhone 14 Pro Max
   xcrun simctl create "Screenshot Device" "iPhone 14 Pro Max"
   
   # Boot the simulator
   xcrun simctl boot "Screenshot Device"
   ```

2. **Run the App**
   ```bash
   cd /app/frontend
   npx expo run:ios --device "Screenshot Device"
   ```

3. **Capture Screenshots**
   - In Simulator: `Cmd + S` to save screenshot
   - Or: `xcrun simctl io booted screenshot ~/Desktop/screenshot.png`

### Option B: Using Android Emulator (For Google Play Screenshots)

1. **Setup**
   ```bash
   # Install Android Studio
   # Create AVD: Pixel 7 Pro with API 34
   
   # Start emulator
   emulator -avd Pixel_7_Pro_API_34
   ```

2. **Run the App**
   ```bash
   cd /app/frontend
   npx expo run:android
   ```

3. **Capture Screenshots**
   - In Emulator: Click camera icon in toolbar
   - Or: `adb exec-out screencap -p > ~/Desktop/screenshot.png`

### Option C: Using Physical Devices (Highest Quality)

**iPhone:**
1. Connect device via USB
2. `npx expo run:ios --device`
3. Press `Power + Volume Up` simultaneously
4. Screenshots saved to Photos app
5. AirDrop to Mac or export via Image Capture

**Android:**
1. Enable Developer Mode & USB Debugging
2. `npx expo run:android`
3. Press `Power + Volume Down` simultaneously
4. Use Android File Transfer to export

---

## Screenshot Navigation Flow

### Mom Experience Flow

1. **Login** → demo.mom@truejoybirthing.com / DemoScreenshot2024!
2. **Dashboard** → First screen after login
3. **Birth Plan** → Tap "Birth Plan" card or tab
4. **Birth Plan Section** → Tap any completed section
5. **Messages** → Tap "Messages" in bottom nav
6. **Marketplace** → Tap "Find Providers" or marketplace icon

### Provider Experience Flow (Doula)

1. **Login** → demo.doula@truejoybirthing.com / DemoScreenshot2024!
2. **Dashboard** → First screen after login
3. **Clients** → Tap "Clients" in bottom nav
4. **Client Detail** → Tap "Emma Johnson" in clients list
5. **Messages** → Tap "Messages" in bottom nav → Select conversation
6. **Invoices** → Tap "Invoices" in bottom nav
7. **Profile** → Tap "Profile" in bottom nav

---

## Asset Organization

```
/screenshots/
├── ios/
│   ├── 01-welcome.png
│   ├── 02-mom-dashboard.png
│   ├── 03-birth-plan-overview.png
│   ├── 04-birth-plan-section.png
│   ├── 05-mom-messages.png
│   ├── 06-marketplace.png
│   ├── 07-pro-dashboard.png
│   ├── 08-clients-list.png
│   ├── 09-client-detail.png
│   ├── 10-pro-messages.png
│   ├── 11-invoices.png
│   └── 12-profile.png
├── android/
│   └── (same structure)
├── marketing/
│   └── (web-optimized versions)
└── README.md
```

---

## Pre-Capture Checklist

Before capturing screenshots:

- [ ] Demo data is seeded (`python seed_demo_data.py --reset`)
- [ ] Device/simulator is at correct resolution
- [ ] Status bar shows full signal, WiFi, 100% battery (use Simulator settings)
- [ ] Time is set to a clean time like 9:41 AM (Apple standard)
- [ ] No debug banners or dev mode indicators
- [ ] Dark mode is OFF (unless capturing both)
- [ ] Notifications are cleared
- [ ] App is freshly logged in (session is active)

---

## Re-Capturing Screenshots (Future Updates)

When the app is updated:

1. **Reset Demo Data**
   ```bash
   cd /app/backend
   source .env
   python seed_demo_data.py --reset
   ```

2. **Verify Demo Accounts Work**
   - Login as demo.doula@truejoybirthing.com
   - Check that clients, messages, invoices are populated

3. **Follow the Navigation Flow Above**
   - Capture each screen in order
   - Use consistent naming convention

4. **Export and Organize**
   - Save to `/screenshots/` directory
   - Update any marketing materials

---

## Profile Images & Legal Compliance

### Avatar System
Demo profiles use **DiceBear Avatars** (https://dicebear.com):
- Generated procedurally from seed strings (names)
- **CC0 License** - free for commercial use
- No real human faces - compliant with store guidelines
- Stored as URLs, not local files

### Compliance Notes
- All screenshots show **real app UI** (not mockups)
- Screenshots **accurately represent** current app version
- No real user data - all demo/fictional
- Profile images are synthetic/illustrated avatars
- No copyrighted or trademarked content

---

## Troubleshooting

### Demo login fails
```bash
# Reseed the demo data
cd /app/backend && source .env && python seed_demo_data.py --reset
```

### Screenshots show empty data
- Verify you're logged into the correct demo account
- Check that the seed script completed without errors
- Refresh the app/screen

### Simulator/Emulator issues
- Reset the device: `xcrun simctl erase all` (iOS) or AVD Manager > Wipe Data (Android)
- Rebuild the app: `npx expo run:ios --device` or `npx expo run:android`

---

## Quick Reference Commands

```bash
# Seed demo data
cd /app/backend && source .env && python seed_demo_data.py --reset

# Clear demo data only
cd /app/backend && source .env && python seed_demo_data.py --clear

# Run on iOS simulator
cd /app/frontend && npx expo run:ios

# Run on Android emulator
cd /app/frontend && npx expo run:android

# Take iOS simulator screenshot
xcrun simctl io booted screenshot screenshot.png

# Take Android emulator screenshot
adb exec-out screencap -p > screenshot.png
```

---

## Contact

For questions about the screenshot process or demo data, refer to:
- `/backend/seed_demo_data.py` - Demo data definitions
- `/memory/PRD.md` - Product requirements
- `/frontend/IAP_SETUP_GUIDE.md` - In-app purchase setup
