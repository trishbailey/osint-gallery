#!/usr/bin/env python3
"""Beacon Tools CI check (runs on every PR and push to main).

Static checks (all pages):
  1. No page carries the retired GA tag; every dashboard page carries G-Z61EKRP8QV.
  2. No page links to github.io or to an old standalone dashboard site
     (the oldUrl hosts in dashboards.json, or any *.onrender.com host that is
     not beacon-tools or a tool listed in tools.json).
Browser checks (each dashboard page, desktop 1440px and phone 390px):
  3. Phone width: no horizontal overflow at 390px, no JS errors.
  4. Label size: every visible SVG text label renders at >= 13px.
  5. Colour: no grey data fills (low-saturation SVG shapes) and no near-identical
     fill pairs (CIEDE2000 delta E < 20) among the distinct data colours of each SVG.
Change checks (--changed-from BASE):
  6. Shared files (scripts/, .github/, render.yaml, README.md, root index.html/app.js/
     styles.css/tools.json, brand/, icons/) or more than one dashboard folder changed in
     one PR fail unless the PR carries the 'trish-approved' label (SHARED_OK=1).
     Browser checks then run only on the dashboards whose folders changed.
Shapes inside an element marked data-ci-ignore (or flags/logos/icons) are skipped.
Usage: python scripts/ci_check.py [--static-only] [--port 8765]
"""
import json, os, re, sys, glob, math, argparse, subprocess, threading, http.server, functools

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA_MAIN = "G-Z61EKRP8QV"
GA_RETIRED = "G-" + "FE6CZGWX0J"  # split so this file never contains the retired tag literally
SKIP_DIRS = {".git", "node_modules", "_src", "scripts", ".github"}
PAGE_EXT = (".html", ".htm", ".js", ".css", ".json", ".svg")

def load_json(p):
    with open(os.path.join(ROOT, p)) as f:
        return json.load(f)

def page_files():
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(PAGE_EXT):
                yield os.path.join(d, fn)

def host(u):
    m = re.match(r"https?://([^/:\"'\s]+)", u)
    return m.group(1).lower() if m else ""

def static_checks():
    errs = []
    dash = load_json("dashboards.json")
    old_hosts = {host(x.get("oldUrl", "")) for x in dash["dashboards"] if x.get("oldUrl")}
    tool_hosts = set()
    try:
        tools = load_json("tools.json")
        for m in re.findall(r"https?://[^\"'\s]+", json.dumps(tools)):
            tool_hosts.add(host(m))
    except Exception:
        pass
    allowed_render = ({"beacon-tools.onrender.com"} | tool_hosts) - old_hosts
    url_re = re.compile(r"https?://[A-Za-z0-9.-]+\.(?:github\.io|onrender\.com)[^\s\"'<>)]*")
    for p in page_files():
        rel = os.path.relpath(p, ROOT)
        if rel == "dashboards.json":
            continue  # registry legitimately records oldUrl
        try:
            s = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        if GA_RETIRED in s:
            errs.append(f"{rel}: contains the retired GA tag (only {GA_MAIN} is allowed)")
        for u in set(url_re.findall(s)):
            h = host(u)
            if h.endswith("github.io"):
                errs.append(f"{rel}: links to GitHub Pages ({h}); use https://beacon-tools.onrender.com/<slug>/")
            elif h not in allowed_render:
                errs.append(f"{rel}: links to an old standalone site ({h}); use https://beacon-tools.onrender.com/<slug>/")
    for idx in ["index.html"] + sorted(glob.glob(os.path.join(ROOT, "*", "index.html"))):
        p = idx if os.path.isabs(idx) else os.path.join(ROOT, idx)
        s = open(p, encoding="utf-8", errors="ignore").read()
        if GA_MAIN not in s:
            errs.append(f"{os.path.relpath(p, ROOT)}: missing GA tag {GA_MAIN}")
    # source generators must not write the retired tag either
    for p in glob.glob(os.path.join(ROOT, "**", "_src", "**", "*"), recursive=True):
        if os.path.isfile(p) and GA_RETIRED in open(p, encoding="utf-8", errors="ignore").read():
            errs.append(f"{os.path.relpath(p, ROOT)}: generator contains the retired GA tag")
    return errs

# ---- colour maths ----
def srgb_to_lab(rgb):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(lin, rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = (0.2126 * r + 0.7152 * g + 0.0722 * b)
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))

def ciede2000(l1, l2):
    L1, a1, b1 = l1; L2, a2, b2 = l2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    if C1p * C2p == 0: dh = 0
    elif dh > 180: dh -= 360
    elif dh < -180: dh += 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    if C1p * C2p == 0: hbp = hs
    elif abs(h1p - h2p) <= 180: hbp = hs / 2
    else: hbp = (hs + 360) / 2 if hs < 360 else (hs - 360) / 2
    T = 1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp)) \
        + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63))
    dth = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))

# Collect data-mark colours: filled rect/circle/path inside SVG, excluding background-like
# dark fills (basemap/panels), white/near-white text-like fills and tiny shapes.
COLLECT_JS = r"""() => {
 const out = {labels: [], svgs: [], overflow: 0};
 out.overflow = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth;
 const svgs = [...document.querySelectorAll('svg')].filter(s => {const b = s.getBoundingClientRect(); return b.width > 120 && b.height > 80;});
 svgs.forEach((s, i) => {
   const cols = {};
   s.querySelectorAll('rect,circle,path,polygon,ellipse').forEach(e => {
     const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
     if (e.closest('defs,clipPath,mask,pattern')) return;
     if (e.closest('[data-ci-ignore]')) return;
     if (e.closest('[class*=flag],[id*=flag],[class*=logo],[class*=emblem],[class*=icon],image,foreignObject')) return;
     const b = e.getBoundingClientRect(); if (b.width * b.height < 400) return;
     const f = cs.fill; const m = f && f.match(/rgba?\(([^)]+)\)/); if (!m) return;
     const v = m[1].split(',').map(Number); const a = (v.length > 3 ? v[3] : 1) * parseFloat(cs.fillOpacity || 1) * parseFloat(cs.opacity || 1);
     if (a < 0.05) return;
     const k = v.slice(0, 3).join(','); cols[k] = (cols[k] || 0) + 1;
   });
   out.svgs.push({i, id: s.id || s.getAttribute('class') || ('svg' + i), cols});
 });
 document.querySelectorAll('svg text').forEach(t => {
   const b = t.getBoundingClientRect(); const cs = getComputedStyle(t);
   if (!b.width || cs.display === 'none' || cs.visibility === 'hidden' || !t.textContent.trim()) return;
   if (t.closest('[data-ci-ignore]')) return;
   const ctm = t.getScreenCTM(); if (!ctm) return;
   const px = parseFloat(cs.fontSize) * Math.hypot(ctm.a, ctm.b);
   out.labels.push({t: t.textContent.trim().slice(0, 40), px});
 });
 return out;
}"""

def is_background(rgb):
    # dark theme panels/basemap (L < 22) and near-white/neutral-light text pills are not data colours
    L, a, b = srgb_to_lab(rgb)
    return L < 22 or L > 92

def is_grey(rgb):
    L, a, b = srgb_to_lab(rgb)
    return math.hypot(a, b) < 6 and 22 <= L <= 92

def browser_checks(port, slugs):
    from playwright.sync_api import sync_playwright
    errs, warns = [], []
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--no-sandbox"])
        for slug in slugs:
            for w, h, name in [(1440, 1000, "desktop"), (390, 844, "phone")]:
                pg = br.new_page(viewport={"width": w, "height": h})
                jserr = []
                pg.on("pageerror", lambda e: jserr.append(str(e)[:160]))
                try:
                    pg.goto(f"http://127.0.0.1:{port}/{slug}/", wait_until="load", timeout=45000)
                    pg.wait_for_timeout(3500)
                    r = pg.evaluate(COLLECT_JS)
                except Exception as e:
                    errs.append(f"{slug} [{name}]: page failed to load ({str(e)[:120]})")
                    pg.close(); continue
                os.makedirs(os.path.join(ROOT, "ci-screens"), exist_ok=True)
                try:
                    pg.screenshot(path=os.path.join(ROOT, "ci-screens", f"{slug}-{name}.png"), full_page=False)
                except Exception:
                    pass
                pg.close()
                for e in jserr:
                    errs.append(f"{slug} [{name}]: JS error: {e}")
                if name == "phone" and r["overflow"] > 4:
                    errs.append(f"{slug} [phone 390px]: page is {r['overflow']}px wider than the screen (horizontal scroll)")
                small = [l for l in r["labels"] if l["px"] < 12.5]
                if small:
                    ex = ", ".join(f"'{l['t']}' {l['px']:.1f}px" for l in small[:5])
                    errs.append(f"{slug} [{name}]: {len(small)} SVG labels under 13px (12.5px rounding allowance), e.g. {ex}")
                if name != "desktop":
                    continue
                for s in r["svgs"]:
                    cols = [tuple(map(int, k.split(","))) for k in s["cols"]]
                    data = [c for c in cols if not is_background(c)]
                    greys = [c for c in data if is_grey(c)]
                    if greys:
                        errs.append(f"{slug} svg '{s['id'][:30]}': grey data fill(s) {['#%02x%02x%02x' % g for g in greys[:4]]}")
                    chrom = [c for c in data if not is_grey(c)]
                    if len(chrom) > 14:
                        continue  # continuous ramp/choropleth: pairwise check not meaningful
                    labs = {c: srgb_to_lab(c) for c in chrom}
                    close = []
                    for i in range(len(chrom)):
                        for j in range(i + 1, len(chrom)):
                            d = ciede2000(labs[chrom[i]], labs[chrom[j]])
                            if d < 20:
                                close.append(('#%02x%02x%02x' % chrom[i], '#%02x%02x%02x' % chrom[j], round(d, 1)))
                    if close:
                        errs.append(f"{slug} svg '{s['id'][:30]}': look-alike colours (delta E < 20): {close[:3]}")
        br.close()
    return errs

SHARED_TOP = {"scripts", ".github", "brand", "icons"}
SHARED_ROOT_FILES = {"render.yaml", "README.md", "index.html", "app.js", "styles.css", "tools.json", "favicon.svg"}

def changed_files(base):
    try:
        out = subprocess.check_output(["git", "diff", "--name-only", f"{base}...HEAD"], cwd=ROOT, text=True)
        return [x for x in out.splitlines() if x]
    except Exception:
        return []

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--static-only", action="store_true")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--slugs", default="", help="comma list; default = every */index.html")
    ap.add_argument("--changed-from", default="", help="git base ref; check only changed dashboards")
    a = ap.parse_args()
    errs = static_checks()
    all_slugs = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, "*", "index.html")))
    slugs = [s for s in a.slugs.split(",") if s] or all_slugs
    if a.changed_from:
        files = changed_files(a.changed_from)
        print("Changed files:", len(files))
        shared = [f for f in files if f.split("/")[0] in SHARED_TOP or f in SHARED_ROOT_FILES]
        touched = sorted({f.split("/")[0] for f in files if "/" in f and f.split("/")[0] in all_slugs})
        ok = os.environ.get("SHARED_OK") == "1"
        if shared:
            msg = f"shared files changed: {shared[:8]}"
            (print("NOTE (trish-approved):", msg) if ok else errs.append(msg + " - needs Trish's OK (add the 'trish-approved' label)"))
        if len(touched) > 1:
            msg = f"more than one dashboard folder changed: {touched}"
            (print("NOTE (trish-approved):", msg) if ok else errs.append(msg + " - touch only your own folder, or get Trish's OK"))
        slugs = touched
        print("Dashboards to browser-check:", slugs or "none")
    if not a.static_only and slugs:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
        http.server.ThreadingHTTPServer.allow_reuse_address = True
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), handler)
        handler.log_message = lambda *x: None
        http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        errs += browser_checks(a.port, slugs)
        srv.shutdown()
    for e in errs:
        print("FAIL:", e)
    print(f"\n{len(errs)} problem(s)." if errs else "All checks passed.")
    sys.exit(1 if errs else 0)

if __name__ == "__main__":
    main()
