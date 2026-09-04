from playwright.sync_api import sync_playwright
import sys

url = "http://localhost:8765/nexus-ui/harness.html"
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 420, "height": 900})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(300)

    # empty-state components should render
    empty_state_count = page.locator(".nx-empty-state").count()
    print("empty-state rendered:", empty_state_count)

    # trigger unlock toast
    page.locator("button:has-text('解锁成就')").click()
    page.wait_for_timeout(600)
    card = page.locator(".nux-unlock-card").count()
    print("unlock card visible:", card)
    if card:
        label = page.locator(".nux-unlock-label").inner_text()
        title = page.locator(".nux-unlock-title").inner_text()
        print("unlock label:", repr(label), "| title:", repr(title))
    page.screenshot(path="/tmp/nux_unlock.png", full_page=False)

    # wait for auto-dismiss
    page.wait_for_timeout(4200)
    after = page.locator(".nux-unlock-card").count()
    print("after auto-dismiss:", after)

    # mobile 320px check
    page.set_viewport_size({"width": 320, "height": 800})
    page.wait_for_timeout(300)
    overflowing = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
    print("horizontal overflow at 320px:", overflowing)

    browser.close()

if errors:
    print("CONSOLE ERRORS:")
    for e in errors[:20]:
        print(" -", e)
else:
    print("no console errors")

sys.exit(0 if (empty_state_count == 3 and card == 1 and after == 0 and not errors) else 1)