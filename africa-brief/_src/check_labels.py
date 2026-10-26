from playwright.sync_api import sync_playwright
import sys
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]);pg=b.new_page(viewport={"width":1400,"height":1000})
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://127.0.0.1:8931/?v=%s"%sys.argv[1]);pg.wait_for_function("window._check")
    print("errors",errs);print(pg.evaluate("_check()"),"resource markers",pg.evaluate("_resCount()"),"BRI",pg.evaluate("document.querySelectorAll('g.bri').length"))
    pg.screenshot(path="/workspace/africa-brief-prototype.png",full_page=True)
    pg.check("#L-all");pg.wait_for_timeout(300);print("showall",pg.evaluate("_check()"))
    pg.screenshot(path="/workspace/africa-brief-showall.png",full_page=True);b.close()
