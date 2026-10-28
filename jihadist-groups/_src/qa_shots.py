#!/usr/bin/env python3
"""QA screenshots at desktop (1440px) and phone (390px). Run from the repo root:
python3 jihadist-groups/_src/qa_shots.py [out_dir] [port]"""
import sys, os, threading, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "ci-screens", "jihadist-groups")
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8777
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
http.server.ThreadingHTTPServer.allow_reuse_address = True
srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
os.makedirs(out, exist_ok=True)
URL = f"http://127.0.0.1:{port}/jihadist-groups/"
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in (("desktop", 1440, 900), ("phone", 390, 844)):
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2 if name == "phone" else 1)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"{out}/{name}-01-top.png")
        pg.screenshot(path=f"{out}/{name}-full.png", full_page=True)
        print(name, "scrollWidth", pg.evaluate("document.documentElement.scrollWidth"), "js errors", errs)
        for sec in ("map", "links", "leaders", "incidents", "momentum", "take"):
            pg.locator("#" + sec).screenshot(path=f"{out}/{name}-{sec}.png")
        # incident layer + zoom to Africa
        pg.click("#incBtn"); pg.click("[data-region='Africa']"); pg.wait_for_timeout(900)
        pg.locator("#map").screenshot(path=f"{out}/{name}-map-africa-incidents.png")
        # panel from a hash
        pg.goto(URL + "#p=jnim"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"{out}/{name}-panel-jnim.png")
        pg.goto(URL + "#i=i7"); pg.wait_for_timeout(2200)
        pg.screenshot(path=f"{out}/{name}-incident-i7.png")
        pg.close()
    b.close()
