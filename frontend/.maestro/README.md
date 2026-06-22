# Maestro E2E Testing & Screenshot Capture

[Maestro](https://maestro.mobile.dev) is a mobile UI testing framework that works with existing APK/IPA builds — no code changes needed.

## Prerequisites

1. **Maestro CLI installed:**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
   Verify: `maestro --version`

2. **Android emulator running** (or physical device connected via ADB):
   ```bash
   # List devices
   adb devices
   
   # Start emulator (if using Android Studio)
   emulator -avd Pixel_6_API_34
   ```

3. **App installed on device:**
   ```bash
   # Install from APK
   adb install -r app-release.apk
   
   # Or build and install via Expo
   cd frontend && npx expo run:android
   ```

## Running Screenshot Flows

### Mom screenshots (for Play Store listing):
```bash
maestro test .maestro/flows/mom-screenshots.yml
```
Screenshots saved to `.maestro/screenshots/`:
- `mom-home.png`
- `mom-birth-plan.png`
- `mom-marketplace.png`
- `mom-messages.png`
- `mom-profile.png`
- `mom-weekly-tips.png`

### Doula screenshots:
```bash
maestro test .maestro/flows/doula-screenshots.yml
```

### Midwife screenshots:
```bash
maestro test .maestro/flows/midwife-screenshots.yml
```

## Running Smoke Tests

```bash
maestro test .maestro/flows/smoke-test.yml
```

The smoke test verifies:
- App launches without crash
- Login screen renders
- Invalid credentials show error
- Valid demo credentials log in successfully
- All tabs navigate without crash
- Logout works

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Mom | `demo.mom@truejoybirthing.com` | `DemoMom2024!` |
| Doula | `demo.doula@truejoybirthing.com` | `DemoDoula2024!` |
| Midwife | `demo.midwife@truejoybirthing.com` | `DemoMidwife2024!` |

These accounts are recreated on every server startup by `ensure_demo_accounts.py`.

## Uploading Screenshots to Play Store

1. Run the mom screenshot flow
2. Navigate to `.maestro/screenshots/`
3. Upload the screenshots to Google Play Console → Store presence → Store listing → Screenshots
4. Select Android phone screenshots (not tablet)
5. Upload at least 8 screenshots as required by Google Play

## Troubleshooting

- **Flow fails on element not found:** The app may use different text on different screens. Run `maestro studio` to inspect the app's UI tree.
- **Screenshots look wrong:** Adjust `waitFor` times if screenshots are taken before screens finish loading.
- **Login fails:** Verify the backend is running and demo accounts are seeded.
