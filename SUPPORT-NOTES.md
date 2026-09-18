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