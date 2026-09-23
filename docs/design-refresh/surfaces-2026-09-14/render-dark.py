#!/usr/bin/env python3
"""render-dark.py — screenshot every approved mockup (light) and its dark
variant at 390x844 @2x, per-phone + full page, with the Phase 1 overflow
check. Writes renders-dark/<base>-<tag>.png + render-dark-manifest.json.
"""
import asyncio, json, os
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "renders-dark")
os.makedirs(OUT, exist_ok=True)

made = json.load(open(os.path.join(BASE, "dark-variant-files.json")))
PAIRS = [(d, d.replace("-dark.html", ".html")) for d in made]

async def render_page(html_path, tag, base_name):
    res = {"per_phone": [], "full": None, "overflow": []}
    browser = await PW.chromium.launch()
    ctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page = await ctx.new_page()
    await page.goto("file://" + html_path, wait_until="networkidle")
    await page.wait_for_timeout(1200)
    ov = await page.evaluate("""() => {
        const phones = document.querySelectorAll('.phone, .screen');
        return [...phones].map((ph,i) => ({i, sw: ph.scrollWidth, cw: ph.clientWidth, of: ph.scrollWidth > ph.clientWidth + 1}));
    }""")
    res["overflow"] = [o for o in ov if o["of"]]
    full = os.path.join(OUT, f"{base_name}-{tag}.png")
    await page.screenshot(path=full, full_page=True)
    res["full"] = full
    phones = await page.query_selector_all(".phone")
    for idx, ph in enumerate(phones):
        fp = os.path.join(OUT, f"{base_name}-phone{idx+1}-{tag}.png")
        await ph.screenshot(path=fp)
        res["per_phone"].append(fp)
    await browser.close()
    return res

async def main():
    global PW
    manifest = {}
    async with async_playwright() as pw:
        PW = pw
        for dark_f, light_f in PAIRS:
            base = dark_f.replace("-dark.html", "")
            print(f"--- {base}")
            try:
                manifest[base] = {
                    "light": await render_page(os.path.join(BASE, light_f), "light", base),
                    "dark": await render_page(os.path.join(BASE, dark_f), "dark", base),
                }
                l, d = manifest[base]["light"], manifest[base]["dark"]
                print(f"    light: {len(l['per_phone'])} phones, dark: {len(d['per_phone'])} phones, "
                      f"overflow L/D: {len(l['overflow'])}/{len(d['overflow'])}")
            except Exception as e:
                print(f"ERROR {base}: {type(e).__name__}: {e}")
                manifest[base] = {"error": f"{type(e).__name__}: {e}"}
    with open(os.path.join(OUT, "render-dark-manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    ok = sum(1 for v in manifest.values() if "error" not in v)
    print(f"DONE: {ok}/{len(PAIRS)} pairs rendered")

if __name__ == "__main__":
    asyncio.run(main())