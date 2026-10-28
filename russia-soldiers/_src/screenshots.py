"""Headless Chromium screenshots (desktop 1440 and phone 390) plus interaction tests: every tooltip target, every button.
Usage: python screenshots.py [base_url] [outdir]"""
import sys, json, os
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:47213/index.html"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/workspace/rs-shots"
os.makedirs(OUT, exist_ok=True)
errs = []
def shot(page, name, full=True):
    p = os.path.join(OUT, name); page.screenshot(path=p, full_page=full); print("saved", p)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for tag, vp, mobile in (("desktop-1440", {"width": 1440, "height": 900}, False), ("phone-390", {"width": 390, "height": 844}, True)):
        ctx = b.new_context(viewport=vp, device_scale_factor=1 if not mobile else 2, has_touch=mobile, is_mobile=mobile)
        page = ctx.new_page()
        page.on("pageerror", lambda e, t=tag: errs.append((t, str(e))))
        page.on("console", lambda m, t=tag: errs.append((t, m.text)) if m.type == "error" else None)
        page.goto(BASE); page.wait_for_selector("html[data-ready]", state="attached", timeout=15000); page.wait_for_timeout(600)
        shot(page, f"{tag}-01-top.png", full=False)
        page.evaluate("document.querySelector('#remote-sec').scrollIntoView()"); page.wait_for_timeout(300)
        shot(page, f"{tag}-01b-remote-evidence.png", full=False)
        page.evaluate("window.scrollTo(0,0)")
        if mobile:
            for d in page.query_selector_all("details.sec"): d.evaluate("e=>e.open=true")
            page.evaluate("window.dispatchEvent(new Event('resize'))"); page.wait_for_timeout(500)
        shot(page, f"{tag}-02-full.png")
        # map: hover + click a region, metric buttons
        page.evaluate("document.querySelector('#map-sec').scrollIntoView()")
        box = page.eval_on_selector("#map path.reg:nth-child(10)", "e=>{const b=e.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]}")
        paths = page.query_selector_all("#map path.reg"); print(tag, "map regions", len(paths))
        # tooltip on a big region
        big = max(paths, key=lambda p: p.bounding_box()["width"] * p.bounding_box()["height"])
        bb = big.bounding_box()
        if not mobile:
            page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); page.wait_for_timeout(200)
            tip = page.inner_text("#tip"); print(tag, "map tooltip:", tip.replace("\n", " | ")); assert page.is_visible("#tip") and "per 100,000" in tip
            shot(page, f"{tag}-03-map-hover.png", full=False)
        big.click(position={"x": bb["width"] / 2, "y": bb["height"] / 2}); page.wait_for_timeout(500)
        assert page.evaluate("document.querySelector('#panel').classList.contains('open')"), "panel did not open"
        print(tag, "panel:", page.inner_text("#panelbody")[:160].replace("\n", " | "))
        shot(page, f"{tag}-04-map-panel.png", full=False)
        page.click("#closepanel"); page.wait_for_timeout(400); assert not page.evaluate("document.querySelector('#panel').classList.contains('open')")
        if mobile and page.evaluate("!document.querySelector('#mapside').open"):
            page.click("#mapside > summary"); page.wait_for_timeout(200)
        for m in ("vol", "mob", "pri", "pov", "ru", "bonus", "deaths"):
            before = page.evaluate("[...document.querySelectorAll('#map path.reg')].map(p=>p.getAttribute('fill')).join()")
            page.click(f".chipb[data-metric={m}]"); page.wait_for_timeout(250)
            after = page.evaluate("[...document.querySelectorAll('#map path.reg')].map(p=>p.getAttribute('fill')).join()")
            print(tag, "metric", m, "fills changed" if before != after else "fills same"); 
            if m == "pri": shot(page, f"{tag}-05-map-prisoners.png", full=False)
            if m == "pov": shot(page, f"{tag}-05b-map-poverty.png", full=False)
            if m == "bonus": shot(page, f"{tag}-05c-map-bonus.png", full=False)
        # section screenshots, nested toggles, sankey, photos, minimaps
        for sid in ("undercount", "pov-sec", "eth-sec", "bonus-sec", "pools-sec", "trk-sec"):
            page.evaluate("document.querySelector('#trk-sec').open=true")
            page.evaluate(f"document.querySelector('#{sid}').scrollIntoView()"); page.wait_for_timeout(250)
            shot(page, f"{tag}-07-{sid}.png", full=False)
        for mm in ("#mm-pov", "#mm-ru", "#mm-bonus"):
            n = len(page.query_selector_all(mm + " path.reg")); print(tag, mm, "regions", n); assert n > 80, mm
        nl = len(page.query_selector_all("#sankey path")); nr = len(page.query_selector_all("#sankey rect")); print(tag, "sankey links", nl, "nodes", nr); assert nl >= 25 and nr == 12
        imgs = page.evaluate("[...document.querySelectorAll('.ph img')].map(i=>[i.complete&&i.naturalWidth>0,i.alt.length])"); print(tag, "photos", imgs); assert all(a and b > 20 for a, b in imgs) and len(imgs) == 2
        for d in page.query_selector_all("details.how"):
            d.evaluate("e=>{let p=e.parentElement.closest('details');while(p){p.open=true;p=p.parentElement.closest('details')}}")
            d.scroll_into_view_if_needed(); before = d.evaluate("e=>e.open"); d.query_selector("summary").click(); page.wait_for_timeout(120)
            assert d.evaluate("e=>e.open") != before, "toggle did nothing"
            if not d.evaluate("e=>e.open"): d.query_selector("summary").click()
        page.wait_for_timeout(300); shot(page, f"{tag}-08-with-toggles-open.png")
        # zoom
        page.mouse.move(bb["x"] + 20, bb["y"] + 20)
        # other buttons
        for sel, what in (("#rankmore", "#rankbars .brow"), ("#bonusmore", "#bonusbars .brow"), ("#firmonly", "#bonusbars .brow")):
            page.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center'}})")
            n0 = len(page.query_selector_all(what)); page.click(sel); page.wait_for_timeout(200); n1 = len(page.query_selector_all(what))
            print(tag, sel, n0, "->", n1); assert n0 != n1, sel
        page.click("#firmonly")  # restore
        # all tooltip targets: find a point where the target is the topmost [data-tip] element, hover/click it, compare text
        tips = page.query_selector_all("[data-tip]"); print(tag, "tooltip targets", len(tips)); bad = []; checked = 0
        FIND = """e=>{const b=e.getBoundingClientRect();for(let i=1;i<12;i++)for(let j=1;j<12;j++){const x=b.x+b.width*i/12,y=b.y+b.height*j/12;
          if(x<0||y<0||x>innerWidth||y>innerHeight)continue;const t=document.elementFromPoint(x,y);if(t&&t.closest('[data-tip]')===e)return [x,y]}return null}"""
        step = max(1, len(tips) // 150)
        for t in tips[::step] + [x for x in tips if x.evaluate("e=>e.classList.contains('reg')")][::3]:
            t.scroll_into_view_if_needed(); page.wait_for_timeout(70); pt = t.evaluate(FIND)
            if pt is None:
                bad.append(("no hoverable point", t.get_attribute("data-tip")[:40])); continue
            if mobile: page.mouse.click(*pt)
            else: page.mouse.move(*pt)
            page.wait_for_timeout(30); checked += 1
            want = t.evaluate("e=>{const d=document.createElement('div');d.innerHTML=e.getAttribute('data-tip');return d.textContent}")
            got = page.inner_text("#tip") if page.is_visible("#tip") else ""
            if mobile and page.evaluate("document.querySelector('#panel').classList.contains('open')"):
                page.click("#closepanel"); page.wait_for_timeout(300)
            if not got.strip() and not (mobile and t.evaluate("e=>e.classList.contains('reg')")): bad.append(("no tooltip", want[:40]))
            elif got.strip() and want.replace("\n", "")[:30] not in got.replace("\n", ""): bad.append(("wrong tooltip", want[:40], got[:40]))
        print(tag, "tooltips checked", checked, "failures", len(bad), bad[:8])
        shot(page, f"{tag}-06-after-interactions.png")
        ctx.close()
    b.close()
print("JS errors:", errs)
sys.exit(1 if errs else 0)
