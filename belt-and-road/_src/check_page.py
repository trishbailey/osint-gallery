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
    for hsh in ["#region=africa","#region=pacific","#region=europe","#region=all"]:
        pg.goto(base+hsh);pg.wait_for_function("window._ready");pg.wait_for_timeout(1200)
        r=pg.evaluate(JS);fills=sorted(set(pg.eval_on_selector_all("#map .mk","e=>e.map(x=>getComputedStyle(x).fill)")))
        hx=['#%02x%02x%02x'%tuple(int(c) for c in f[4:-1].split(',')) for f in fills]
        md=min((de(a,c),a,c) for a,c in itertools.combinations(hx,2)) if len(hx)>1 else None
        small=pg.evaluate("()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.slice(0,30))")
        title=pg.inner_text("#title");agg=pg.evaluate("()=>[...document.querySelectorAll('#map .mk')].some(m=>m.__data__.id.startsWith('bri-loans'))")
        print(hsh,"|",title,"| labels",r,"| marker fills",len(hx),"min dE",md,"| <44px",small,"| agg on map",agg)
        if r["bad"] or (md and md[0]<20) or small or agg or (r["n"] and r["minPx"]<12.95): bad=1
        if pre: pg.screenshot(path=f"{pre}-{hsh.split('=')[1]}.png")
    pg.goto(base+"#p=bri-luganville-wharf");pg.wait_for_function("window._ready");pg.wait_for_timeout(1200)
    op=pg.evaluate("()=>document.getElementById('panel').classList.contains('open')");t=pg.inner_text("#ptitle")
    pg.click("#pbody sup a");pg.wait_for_timeout(300);srcopen=pg.evaluate("()=>document.getElementById('srcs').open")
    if pre: pg.screenshot(path=f"{pre}-panel.png")
    pg.keyboard.press("Escape");pg.wait_for_timeout(400);cl=not pg.evaluate("()=>document.getElementById('panel').classList.contains('open')")
    gt=pg.evaluate("()=>[...document.scripts].map(s=>s.src||s.textContent).join(' ').match(/G-[A-Z0-9]+/g)")
    print("panel open",op,t,"| sources expand",srcopen,"| esc closes",cl,"| GA",sorted(set(gt)),"| errors",errs)
    if not(op and srcopen and cl) or errs: bad=1
    b.close()
print("FAIL" if bad else "PASS");sys.exit(bad)
