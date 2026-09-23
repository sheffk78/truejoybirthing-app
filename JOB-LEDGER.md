
## 2026-09-23 — Birth-plan printable PDF SHIPPED to production (Jeff-approved design)
- Commits: 6ffddf0a (generator + adapter + prod-shape fix), 3a82b20b (schema asset — was untracked, prod rendered raw keys), eb802f76 (native share-sheet download in preview screen)
- Railway: TrueJoyBirthing/truejoybirthing-app deploys 67ac4404 + 8a1878d2 both SUCCESS (auto-deploy on push)
- Live-verified: POST login (test mom) → GET /api/birth-plan/export/pdf → 200, human labels, checkbox rows, printer-safe (top strip pure white, light lavender wash)
- Generator: backend/routes/pdf_branding.py — schema-driven labels/options from backend/assets/birth_plan_form_schema.json (MUST be committed — generator degrades gracefully to raw keys without it)
- Design law: all-sans (Quicksand/SourceSans), no illustrations, full-width light-lavender wash bands w/ dark text, hairline top rule + letterspaced brand line, cover meta pulls from actual answers

