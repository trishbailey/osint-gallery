#!/usr/bin/env python3
"""Each world-map basin shape and basin name opens that basin's map."""
import functools
import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
URL_PATH = "/water-security/"

POINT = r"""
(sel) => {
  const nodes = [...document.querySelectorAll(sel)];
  const cols = 18, rows = 14;
  const hit = (el, x, y) => {
    const top = document.elementFromPoint(x, y);
    return !!(top && (top === el || el.contains(top)));
  };
  const candidates = [];
  for (const el of nodes) {
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    for (let i = 0; i < cols * rows; i++) {
      const x = b.x + ((i % cols) + 0.5) * b.width / cols;
      const y = b.y + (Math.floor(i / cols) + 0.5) * b.height / rows;
      if (x < 1 || y < 1 || x >= innerWidth - 1 || y >= innerHeight - 1) continue;
      if (!hit(el, x, y)) continue;
      const rx = Math.round(x), ry = Math.round(y);
      const stable = [[x, y], [rx, ry], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].every(([px, py]) => hit(el, px, py));
      if (stable) return {x: rx, y: ry};
      candidates.push({x: rx, y: ry});
    }
  }
  return candidates[0] || null;
}
"""

STATE = r"""
() => {
  const sec = document.getElementById('s-panel');
  const svg = sec && sec.querySelector('svg.chart');
  const r = svg ? svg.getBoundingClientRect() : null;
  const secR = sec ? sec.getBoundingClientRect() : null;
  return {
    h3: sec && sec.querySelector('h3') ? sec.querySelector('h3').textContent.trim() : '',
    sheet: !!(sec && sec.classList.contains('sheet')),
    shown: !!(sec && getComputedStyle(sec).display !== 'none' && secR && secR.height > 40 && secR.top < window.innerHeight && secR.bottom > 0),
    svg: r ? {w: r.width, h: r.height, paths: svg.querySelectorAll('path').length} : null
  };
}
"""


def fail(msg):
    raise SystemExit(msg)


def main():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    srv.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}{URL_PATH}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            for width, height, tap in ((1280, 900, False), (390, 844, True)):
                page = browser.new_page(viewport={"width": width, "height": height}, has_touch=True)
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.goto(url, wait_until="domcontentloaded", timeout=90000)
                page.wait_for_selector("#map-world path.basin-hit", timeout=30000)
                ids = page.evaluate(
                    "() => [...new Set([...document.querySelectorAll('#map-world path.basin-hit')].map(p => p.getAttribute('data-bid')))]"
                )
                if len(ids) < 15:
                    fail(f"{width}: expected the world map basins, found {len(ids)}")
                labels = page.evaluate(
                    """() => [...document.querySelectorAll('#map-world g.lab-flow[data-bid]')].map(g => ({
                      id: g.getAttribute('data-bid'),
                      n: (g.textContent || '').replace(/\\s+/g, ' ').trim()
                    }))"""
                )
                if len(labels) < 6:
                    fail(f"{width}: expected basin name labels, found {len(labels)}")

                def reveal(sel, what):
                    page.evaluate(
                        """(sel) => {
                          if (window.closeSheet) closeSheet();
                          document.documentElement.style.scrollBehavior = 'auto';
                          const el = document.querySelector(sel);
                          if (!el) return;
                          try { el.scrollIntoView({block:'center', inline:'center', behavior:'instant'}); }
                          catch (e) { el.scrollIntoView({block:'center', inline:'center'}); }
                        }""",
                        sel,
                    )
                    page.wait_for_function(
                        """(sel) => {
                          const el = document.querySelector(sel);
                          if (!el) return false;
                          const b = el.getBoundingClientRect();
                          return b.width > 2 && b.height > 2 && b.bottom > 8 && b.top < innerHeight - 8 && b.right > 0 && b.left < innerWidth;
                        }""",
                        arg=sel,
                        timeout=5000,
                    )
                    pt = page.evaluate(POINT, sel)
                    if not pt:
                        fail(f"{width}: no clickable point on {what}")
                    if tap:
                        page.touchscreen.tap(pt["x"], pt["y"])
                    else:
                        page.mouse.click(pt["x"], pt["y"])
                    page.wait_for_timeout(400)
                    state = page.evaluate(STATE)
                    if errors:
                        fail(f"{width}: JS error after {what}: {errors[0]}")
                    if not state["shown"]:
                        fail(f"{width}: {what} did not reveal the basin section {state}")
                    if tap and not state["sheet"]:
                        fail(f"{width}: {what} did not open the basin sheet")
                    svg = state["svg"] or {}
                    if svg.get("w", 0) < 80 or svg.get("h", 0) < 80 or svg.get("paths", 0) < 8:
                        fail(f"{width}: {what} basin map is empty {state}")
                    if not state["h3"]:
                        fail(f"{width}: {what} basin map has no title")

                for bid in ids:
                    reveal(f'#map-world path.basin-hit[data-bid="{bid}"]', f"basin shape {bid}")
                for lab in labels:
                    reveal(
                        f'#map-world g.lab-flow[data-bid="{lab["id"]}"]',
                        f"basin label {lab['n']}",
                    )
                page.close()
            browser.close()
    finally:
        srv.shutdown()
    print("basin clicks ok")


if __name__ == "__main__":
    main()
