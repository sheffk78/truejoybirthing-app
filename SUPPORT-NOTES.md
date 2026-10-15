# TJB Mobile — RN-Web & Web-Shell Gotchas

## RN-web Image resizeMode bug (2026-09-18)
`<Image resizeMode="cover" />` on web: RN-web renders a background-image layer at the
source's INTRINSIC size (e.g. 1536×1024px) inside the bounds — you see only the
top-left slice (looked like a "zoomed hair close-up"), regardless of the JSX prop
or `{ resizeMode: 'cover' }` style key. Neither maps to `background-size: cover`.
**Fix:** for web, bypass Image with direct CSS background styles on a View:
`backgroundImage: url(uri), backgroundSize: 'cover', backgroundPosition: '50% 18%'`.
Native keeps `<Image resizeMode="cover">`. Implemented in `src/components/mom/HBand.tsx`
(the only band component — used by home + weekly-tips headers).

## react-native-svg intrinsic-size bug on web (2026-09-18)
`<Svg style={absoluteFill}>` on web renders at the SVG default 300×150 CSS px —
`absoluteFill` insets do NOT stretch it. The HBand veil therefore appeared as a
misplaced white patch over the photo. **Fix:** web branch uses a plain CSS
`linear-gradient` View (identical stops); native branch keeps the SVG (sizes fine
on native) with explicit `width="100%" height="100%"`.
**Lesson:** Jeff flagged it twice; my first "fix" only changed the photo layer and
the vision-model screenshot check rationalized the patch as intentional design.
Geometry bugs must be verified by DOM measurement (getBoundingClientRect on every
band child), not by asking a vision model "is there a stray rectangle".

## expo-secure-store throws on web (2026-09-18)
`SecureStore.setItemAsync` etc. are not functions on web — login crashed post-auth
and the guard bounced users to /welcome. Fix: `src/utils/tokenStorage.ts`
(localStorage on web, SecureStore on native), wired into authStore, utils/api.ts,
subscriptionStore. Symptom to remember: RN-web dialog "setValueWithKeyAsync is not
a function" right after tapping Sign In.

## Static export + proxy notes
- `npx expo export --platform web` emits flat HTML files: `(auth)/login.html` — but
  Expo Router wants extensionless URLs; the local proxy rewrites `/(auth)/login` →
  that file (`/tmp/tjb-web-proxy.py`, API proxy → :8002).
- Asset URLs inside the bundle are root-absolute (`/assets/...`), so the proxy must
  serve dist at `/` and map `/assets/...` accordingly (it does: dist/assets/assets/images/...).
- Page.enable is REQUIRED on any CDP ws session before evals; un-enabled sessions
  wedge after the first SPA navigation (evals never ack, 0% CPU, looks hung).
- Capture driver: /tmp/tjb-capture3.py (login via UI, click nav labels, screenshot).
  Login persists via localStorage — re-running lands directly on /home (that is
  success, not failure).
## Duplicate checkout gotcha (hit 2026-10-14)
- TWO working trees of this repo exist: live checkout
  `~/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile`
  (this one — Metro :8081 serves from here, runs at origin/main) and a STALE
  `~/Projects/TrueJoyBirthing-Mobile` (behind main, not served by anything).
  Before editing app code, confirm which tree Metro runs from:
  `ps aux | grep "expo start"` — match the path. Editing the stale tree
  silently doesn't change what the sim/app shows.

## EAS / build ops (verified 10/15)
- EAS "remote" version source governs BOTH build numbers: ios.buildNumber/appVersion come from EAS server counters (local Info.plist is just the prebuild snapshot). 1.5.1 shipped = build 160 (last shipped 1.0.13/159; EAS assigned 160).
- .easignore REPLACES .gitignore for the EAS tarball. When it exists, re-exclude node_modules/.expo/.metro-cache/Pods AND big root dirs (backend/, docs/…) or you ship an 883MB tarball that 400s at metadata upload ("Failed to upload metadata… 400"). Fixed 10/15: 358MB.
- eas build output must redirect to a FILE (`> f 2>&1`), never pipe to tail/tee — EPIPE kills the upload mid-tar.
- eas-cli must stay current: `npm i -g eas-cli@latest` (20.x on 10/15 was 4 majors stale).
- Simulator store-capture recipe (proven 10/15): iPhone 17 Pro Max sim (1320x2868 exact 6.9" spec) + `simctl status_bar override --time 9:41 --batteryLevel 100`; companion MUST be spawned from terminal shell for that sim UDID (script: /tmp/tjb-companion-setup-pm.sh pattern); keychain SURVIVES `simctl uninstall` (token restore → use `simctl keychain <udid> reset` for true wipe, 10/14 lesson extended); deep links (`simctl openurl`) hit an iOS confirm dialog that HID taps CANNOT dismiss (AX sees it, input dead) — navigate with tab-taps + header-label asserts instead (walk stage in /tmp/tjb-capture.py pattern); SecureTextField AX = bullet glyphs one-per-char (verify len, not equality).
- Android Play submit needs google-service-account.json (absent 10/15; key = 'TJB Admin' in 1P OpenClaw vault is Play LOGIN, not the JSON). Manual .aab upload per tjb-app-store-submit skill pitfall #4.
