#!/usr/bin/env python3
"""Capture implemented screens + mockups side-by-side (Phase 1 batch 1)."""
import asyncio, os, sys, json
from playwright.async_api import async_playwright

BASE = "/Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile"
SURF = f"{BASE}/docs/design-refresh/surfaces-2026-09-14"
OUT = f"{SURF}/renders-phase1"
os.makedirs(OUT, exist_ok=True)

APP = "http://localhost:8082"

MOCK_USER = {"user_id": "u1", "email": "sarah@example.com", "full_name": "Sarah Evans",
             "role": "MOM", "picture": None, "onboarding_completed": True, "email_verified": True}

TIMELINE = {
    "due_date": "March 14, 2027", "current_week": 24, "current_day": 3,
    "custom_events": [
        {"event_id": "e1", "title": "Anatomy Ultrasound", "description": "Dr. Reyes — Brookside Women's Center",
         "event_date": "2026-10-02", "event_type": "appointment"},
        {"event_id": "e2", "title": "Breastfeeding Basics", "description": "Community class with Maya",
         "event_date": "2026-10-16", "event_type": "class"},
    ],
    "milestones": [
        {"week": 22, "title": "Baby hears your voice", "date": "2026-09-08", "is_past": True, "is_current": False},
        {"week": 24, "title": "Lungs form branches", "date": "2026-09-22", "is_past": False, "is_current": True},
        {"week": 26, "title": "Eyes open and blink", "date": "2026-10-06", "is_past": False, "is_current": False},
        {"week": 28, "title": "Third trimester begins", "date": "2026-10-20", "is_past": False, "is_current": False},
        {"week": 32, "title": "Rapid brain growth", "date": "2026-11-17", "is_past": False, "is_current": False},
        {"week": 36, "title": "Full term approaches", "date": "2026-12-15", "is_past": False, "is_current": False},
    ],
}

SECTIONS = [
    {"section_id": "about_me", "title": "About Me", "status": "Complete",
     "data": {"name": "Sarah Evans", "support_partner": "James Evans",
              "birth_location": "Brookside Women's Center",
              "preferences": "Skin-to-skin immediately after birth, dim lights, quiet voices",
              "notes_to_provider": "Thank you for caring for us — James will speak up for me if I can't."}},
    {"section_id": "labor_delivery", "title": "Labor & Delivery", "status": "Complete",
     "data": {"pain_management": "Unmedicated with IV access", "movement": "Freedom to walk and change positions",
              "environment": "Soft lighting, my own music"}},
    {"section_id": "pain_management", "title": "Pain Management", "status": "In Progress",
     "data": {"music": "Yes"}},
    {"section_id": "monitoring_iv", "title": "Monitoring", "status": "Complete",
     "data": {"intermittent_monitoring": "Yes"}},
    {"section_id": "induction_interventions", "title": "Induction", "status": "In Progress", "data": {}},
    {"section_id": "cesarean_preferences", "title": "Cesarean", "status": "Complete",
     "data": {"partner_present": "Yes"}},
    {"section_id": "newborn_care", "title": "Newborn Care", "status": "Complete",
     "data": {"delayed_bathing": "Yes", "vitamin_k": "Yes"}},
    {"section_id": "feeding_preferences", "title": "Feeding", "status": "Complete",
     "data": {"breastfeeding": "Yes"}},
]

SHARE_REQUESTS = {"requests": [
    {"request_id": "r1", "provider_id": "p1", "provider_name": "Maya Delgado", "provider_role": "DOULA",
     "status": "accepted", "created_at": "2026-09-10", "picture": None},
    {"request_id": "r2", "provider_id": "p2", "provider_name": "Dr. Elena Reyes", "provider_role": "MIDWIFE",
     "status": "pending", "created_at": "2026-09-19", "picture": None},
]}

PROVIDERS = {"providers": [
    {"user_id": "p9", "full_name": "Maya Delgado", "email": "maya@delgadodoula.com",
     "role": "DOULA", "already_shared": True, "share_status": "accepted", "picture": None},
    {"user_id": "p8", "full_name": "Priya Natarajan", "email": "priya@nightdoulas.com",
     "role": "DOULA", "already_shared": False, "picture": None},
]}

USER_JS = json.dumps(MOCK_USER)
TIMELINE_JS = json.dumps(TIMELINE)
SHARE_REQ_JS = json.dumps(SHARE_REQUESTS)
PROVIDERS_JS = json.dumps(PROVIDERS)
SECTIONS_JS = json.dumps(SECTIONS)

INIT = f"""
(() => {{
  localStorage.setItem('session_token', 'dev-preview-token');
  const realFetch = window.fetch.bind(window);
  const j = (obj) => new Response(JSON.stringify(obj), {{ status: 200, headers: {{ 'Content-Type': 'application/json' }} }});
  window.fetch = (input, init) => {{
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const path = url.replace(/^https?:\\/\\/[^/]+/, '').split('?')[0];
    if (path.endsWith('/auth/me')) return Promise.resolve(j({USER_JS}));
    if (path.endsWith('/timeline')) return Promise.resolve(j({TIMELINE_JS}));
    if (path.endsWith('/birth-plan/share-requests')) return Promise.resolve(j({SHARE_REQ_JS}));
    if (path.endsWith('/providers/search')) return Promise.resolve(j({PROVIDERS_JS}));
    if (path.endsWith('/birth-plan/export')) {{
      return Promise.resolve(new Response('%PDF-1.4 fake', {{ status: 200, headers: {{ 'Content-Type': 'application/pdf' }} }}));
    }}
    if (path.includes('/birth-plan')) return Promise.resolve(j({{ sections: {SECTIONS_JS} }}));
    if (path.includes('/api/')) return Promise.resolve(j({{}}));
    return realFetch(input, init);
  }};
}})()
"""

SCREENS = [
    ("/timeline", "timeline", "s6-app-timeline.html"),
    ("/share-birth-plan", "share-birth-plan", "s5-app-birth-plan.html"),
    ("/birth-plan-preview", "birth-plan-preview", "s5-app-birth-plan.html"),
]

async def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        await ctx.add_init_script(INIT)
        page = await ctx.new_page()

        for route, name, mock in SCREENS:
            if only and name != only:
                continue
            # implemented screen
            await page.goto(APP + route, wait_until="networkidle", timeout=90000)
            await page.evaluate("document.fonts.ready")
            await page.wait_for_timeout(2600)
            txt = (await page.inner_text("body"))[:160].replace("\n", " ")
            await page.screenshot(path=f"{OUT}/{name}-impl.png")
            await page.screenshot(path=f"{OUT}/{name}-impl-full.png", full_page=True)
            print(f"IMPL {name}: {txt[:120]}")

            # mockup side
            mctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            mpage = await mctx.new_page()
            await mpage.goto(f"file://{SURF}/{mock}", wait_until="networkidle", timeout=60000)
            await mpage.evaluate("document.fonts.ready")
            await mpage.wait_for_timeout(1400)
            phone = mpage.locator(".phone").first
            await phone.scroll_into_view_if_needed()
            await mpage.wait_for_timeout(400)
            await phone.screenshot(path=f"{OUT}/{name}-mockup.png")
            await mpage.screenshot(path=f"{OUT}/{name}-mockup-full.png", full_page=True)
            await mctx.close()
            print(f"MOCK {name} done")

        await browser.close()

asyncio.run(main())