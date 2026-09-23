import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 990, "height": 980}, device_scale_factor=2)
        page = await ctx.new_page()
        await page.goto("file:///Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14/marketplace-m16-mockup.html", wait_until="networkidle")
        await page.evaluate("""async () => {
            await Promise.all([
                document.fonts.load("700 30px 'Cormorant Garamond'"),
                document.fonts.load("600 14px 'Quicksand'")
            ]);
            await document.fonts.ready;
        }""")
        await page.wait_for_timeout(800)
        fonts = await page.evaluate("""() => ({
            cormorant: document.fonts.check("700 30px 'Cormorant Garamond'"),
            quicksand: document.fonts.check("600 14px 'Quicksand'")
        })""")
        overflow = await page.evaluate("""() => {
            const res = [];
            document.querySelectorAll('.phone').forEach((ph, i) => {
                res.push({phone: i, sw: ph.scrollWidth, cw: ph.clientWidth});
            });
            return res;
        }""")
        imgs = await page.evaluate("""() => {
            const out = [];
            document.querySelectorAll('img').forEach(i => out.push(i.naturalWidth > 0));
            const bg = getComputedStyle(document.querySelector('.hband')).backgroundImage.includes('doula-circle');
            return {imgs_ok: out, band_css: bg};
        }""")
        await page.screenshot(path="/Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14/renders-marketplace/m16-marketplace-both-variants.png", full_page=True)
        # separate per-phone captures
        phones = await page.query_selector_all(".phone")
        for i, ph in enumerate(phones):
            await ph.screenshot(path=f"/Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14/renders-marketplace/m16-variant-{'ab'[i]}.png")
        print(json.dumps({"fonts": fonts, "overflow": overflow, "imgs": imgs}))
        await browser.close()

asyncio.run(main())
