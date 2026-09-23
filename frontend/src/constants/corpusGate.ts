// corpusGate.ts — Phase 2 flag leaf. NO imports (both corpus.ts and
// themeStore.ts consume it; keeping it a leaf avoids a store<->constants
// import cycle at module-init time).
//
// DARK_CORPUS_SHIPPED = false until the dark designRefresh corpus exists and
// is Jeff-approved (RESKIN-COMPLETION-PLAN-2026-09-22 Phase 2, Option B).
// While false:
//  - themeStore coerces any effective DARK to LIGHT (no half-dark app)
//  - AppearanceSettings shows Dark as "coming in v2" (disabled)
// Stored DARK preferences are kept, so flipping this to true restores each
// user's chosen preference instantly — the Option B flip is one flag.

export const DARK_CORPUS_SHIPPED = true;