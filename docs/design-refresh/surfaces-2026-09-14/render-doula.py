import asyncio
from playwright.async_api import async_playwright
import json, os, sys

base_dir = sys.argv[1] if len(sys.argv) > 1 else "."
renders_dir = os.path.join(base_dir, "renders-doula")
os.makedirs(renders_dir, exist_ok=True)

html_files = sorted([f for f in os.listdir(base_dir) if f.startswith('doula-') and f.endswith('.html')])
print(f"Found {len(html_files)} HTML files to render: {html_files}")

results = []

async def render_file(html_file):
    html_path = os.path.join(base_dir, html_file)
    base_name = html_file.replace('.html', '')
    print(f"\nRendering {html_file}...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
        )
        page = await context.new_page()
        
        file_url = "file://" + html_path
        await page.goto(file_url, wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Check for overflow on phone frames
        overflow_info = await page.evaluate("""() => {
            const phones = document.querySelectorAll('.phone, .screen');
            const results = [];
            phones.forEach((phone, i) => {
                const scrollWidth = phone.scrollWidth;
                const clientWidth = phone.clientWidth;
                const overflow = scrollWidth > clientWidth;
                results.push({
                    phone_index: i,
                    scrollWidth: scrollWidth,
                    clientWidth: clientWidth,
                    overflow: overflow,
                    overflow_px: scrollWidth - clientWidth,
                });
            });
            return results;
        }""")
        
        print(f"Overflow check for {base_name}:", json.dumps(overflow_info, indent=2))
        
        # Take full page screenshot
        screenshot_path = os.path.join(renders_dir, f"{base_name}.png")
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Full page screenshot saved to {screenshot_path}")
        
        # Also take per-phone screenshots
        phone_elements = await page.query_selector_all('.phone')
        for idx, phone in enumerate(phone_elements):
            phone_screenshot = os.path.join(renders_dir, f"{base_name}-phone{idx+1}.png")
            await phone.screenshot(path=phone_screenshot)
            print(f"Phone {idx+1} screenshot saved to {phone_screenshot}")
        
        await browser.close()
        
        has_overflow = any(r['overflow'] for r in overflow_info)
        status = "OVERFLOW VIOLATION" if has_overflow else "CLEAN"
        print(f"OVERFLOW SUMMARY for {base_name}: {status}")
        return {"file": html_file, "status": "ok" if not has_overflow else "overflow", "overflow": overflow_info}

async def main():
    for html_file in html_files:
        result = await render_file(html_file)
        results.append(result)
    
    print(f"\n=== RENDERING SUMMARY ===")
    for r in results:
        print(f"  {r['file']}: {r['status']}")
    
    with open(os.path.join(renders_dir, "render-results.json"), "w") as f:
        json.dump(results, f, indent=2)

asyncio.run(main())
