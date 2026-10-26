"""Belt and Road QA: labels >=13px and >=4.5:1 contrast (method from africa-brief/_src/check_labels.py),
CIEDE2000 >=20 for every pair of marker fills read from the rendered SVG, 44px buttons, panel, no errors.
Usage: python3 check_page.py <base_url> [screenshot_prefix]"""
import sys,itertools
from playwright.sync_api import sync_playwright
sys.path.insert(0,__file__.rsplit('/',1)[0]);from palette_check import de  # noqa
base=sys.argv[1];pre=sys.argv[2] if len(sys.argv)>2 else None
JS=open(__file__.rsplit('/',1)[0]+'/labels.js').read()
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]);pg=b.new_page(viewport={"width":1440,"height":1000})
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    for hsh in ["#region=africa","#region=pacific","#region=europe","#region=central-america-caribbean","#region=all"]:
        pg.goto(base+hsh);pg.wait_for_function("window._ready");pg.wait_for_timeout(1200)
        pg.evaluate("()=>document.querySelectorAll('#legend button[aria-pressed=false]').forEach(b=>b.click())");pg.wait_for_timeout(300)
        r=pg.evaluate(JS);fills=sorted(set(pg.eval_on_selector_all("#map .mk","e=>e.map(x=>getComputedStyle(x).fill)")))
        lf=sorted(set(pg.eval_on_selector_all("#map .land, #map .site","e=>e.map(x=>getComputedStyle(x).fill)")))
        hx=['#%02x%02x%02x'%tuple(int(c) for c in f[4:-1].split(',')) for f in fills]
        lh=['#%02x%02x%02x'%tuple(int(c) for c in f[4:-1].split(',')) for f in lf];ld=min(de(a,c) for a,c in itertools.combinations(lh,2)) if len(lh)>1 else 99
        hx=hx+lh
        md=min((de(a,c),a,c) for a,c in itertools.combinations(hx,2)) if len(hx)>1 else None
        small=pg.evaluate("()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.slice(0,30))")
        title=pg.inner_text("#title");agg=pg.evaluate("()=>[...document.querySelectorAll('#map .mk')].some(m=>m.__data__.id.startsWith('bri-loans'))")
        print(hsh,"|",title,"| labels",r,"| marker fills",len(hx),"min dE",md,"| <44px",small,"| agg on map",agg,"| area fills",lh)
        if r["bad"] or (md and md[0]<20) or small or agg or (r["n"] and r["minPx"]<12.95): bad=1
        if pre: pg.screenshot(path=f"{pre}-{hsh.split('=')[1]}.png")
    pg.goto(base+"#region=central-america-caribbean");pg.wait_for_function("window._ready");pg.wait_for_timeout(1200)
    n0=pg.eval_on_selector_all("#map .lines path","e=>e.length");bb=pg.locator("#map .mk").last.bounding_box();pg.mouse.move(bb["x"]+bb["width"]/2,bb["y"]+bb["height"]/2);pg.wait_for_timeout(200);n1=pg.eval_on_selector_all("#map .lines path","e=>e.length");tipv=pg.is_visible(".tip")
    print("lines before hover",n0,"after",n1,"tooltip",tipv)
    if n0 or not n1 or not tipv: bad=1
    # v1.1: locator inset, place highlight from a card, what's new, no bare acronym left in the build
    lb=pg.evaluate("()=>{const r=document.querySelector('#loc .lbox');return r?+r.getAttribute('width'):0}")
    pg.hover("#pcards .pcard");pg.wait_for_timeout(200);hl=pg.eval_on_selector_all("#map .land.hl","e=>e.length")
    hlf=pg.evaluate("()=>{const x=document.querySelector('#map .land.hl');return x?getComputedStyle(x).fill:''}")
    wn=pg.eval_on_selector_all("#wnlist li","e=>e.length");sites=pg.eval_on_selector_all("#map .site","e=>e.length")
    print("locator box width",lb,"| card hover highlights",hl,hlf,"| what's new items",wn,"| site areas",sites)
    if not lb or hl<1 or wn<3 or not sites: bad=1
    import subprocess
    if subprocess.run([sys.executable,__file__.rsplit('/',1)[0]+'/build.py','--check'],capture_output=True).returncode: print("bare acronym gate FAILED");bad=1
    pg.goto(base+"#p=bri-luganville-wharf");pg.wait_for_function("window._ready");pg.wait_for_timeout(1200)
    op=pg.evaluate("()=>document.getElementById('panel').classList.contains('open')");t=pg.inner_text("#ptitle")
    pg.click("#pbody sup a");pg.wait_for_timeout(300);srcopen=pg.evaluate("()=>document.getElementById('srcs').open")
    if pre: pg.screenshot(path=f"{pre}-panel.png")
    pl=pg.eval_on_selector_all("#pbody a.place","e=>e.length");pg.click("#pbody a.place");pg.wait_for_timeout(300);plh=pg.eval_on_selector_all("#map .land.hl","e=>e.length")
    print("panel place links",pl,"click highlights",plh)
    if not pl or not plh: bad=1
    pg.keyboard.press("Escape");pg.wait_for_timeout(400);cl=not pg.evaluate("()=>document.getElementById('panel').classList.contains('open')")
    gt=pg.evaluate("()=>[...document.scripts].map(s=>s.src||s.textContent).join(' ').match(/G-[A-Z0-9]+/g)")
    print("panel open",op,t,"| sources expand",srcopen,"| esc closes",cl,"| GA",sorted(set(gt)),"| errors",errs)
    if not(op and srcopen and cl) or errs: bad=1
    if pre:
        m=b.new_page(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True);m.goto(base+"#region=central-america-caribbean");m.wait_for_function("window._ready");m.wait_for_timeout(1500);m.screenshot(path=f"{pre}-mobile.png",full_page=True)
        pg.goto(base+"#region=central-america-caribbean");pg.wait_for_function("window._ready");pg.wait_for_timeout(1500);pg.screenshot(path=f"{pre}-desktop.png",full_page=True)
    b.close()
print("FAIL" if bad else "PASS");sys.exit(bad)
