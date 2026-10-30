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
        lf=sorted(set(pg.eval_on_selector_all("#map .land, #map .site, #map .bb circle","e=>e.map(x=>getComputedStyle(x).fill)")))
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
    srcopen=pg.evaluate("()=>{const a=[...document.querySelectorAll('#pbody .srcl a')];return a.length>0&&!document.querySelector('#pbody sup,#pbody details.srcs')&&a.every((x,i)=>x.textContent==='['+(i+1)+']'&&/^https?:/.test(x.href)&&x.target==='_blank'&&getComputedStyle(x).borderRadius==='0px')}")
    if pre: pg.screenshot(path=f"{pre}-panel.png")
    pl=pg.eval_on_selector_all("#pbody a.place","e=>e.length");pg.click("#pbody a.place");pg.wait_for_timeout(300);plh=pg.eval_on_selector_all("#map .land.hl","e=>e.length")
    print("panel place links",pl,"click highlights",plh)
    if not pl or not plh: bad=1
    pg.keyboard.press("Escape");pg.wait_for_timeout(400);cl=not pg.evaluate("()=>document.getElementById('panel').classList.contains('open')")
    gt=pg.evaluate("()=>[...document.scripts].map(s=>s.src||s.textContent).join(' ').match(/G-[A-Z0-9]+/g)")
    print("panel open",op,t,"| numbered source links",srcopen,"| esc closes",cl,"| GA",sorted(set(gt)),"| errors",errs)
    if not(op and srcopen and cl) or errs: bad=1
    # v1.3 Data Sources: one collapsed dropdown at the very bottom, per-project numbered lists, credits
    ds=pg.evaluate("()=>{const d=document.getElementById('datasrc');const all=document.querySelectorAll('details#datasrc').length;const c=!d.open;const last=document.querySelector('main').lastElementChild===d;d.open=true;return new Promise(r=>setTimeout(()=>r({all,c,last,links:document.querySelectorAll('#dslist a.sn').length,items:document.querySelectorAll('#dslist li').length,txt:d.innerText}),300))}")
    print("data sources: count",ds["all"],"collapsed",ds["c"],"last in main",ds["last"],"links",ds["links"],"items",ds["items"])
    if ds["all"]!=1 or not ds["c"] or not ds["last"] or ds["links"]<136 or ds["items"]<130 or "Natural Earth" not in ds["txt"] or "flag-icons" not in ds["txt"]: bad=1
    pg.evaluate("document.getElementById('datasrc').open=false")
    # v1.2 phone layout (390px): clustering, collapsed groups, filter bottom sheet, full-screen details, deep links
    m=b.new_page(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True);m.on("pageerror",lambda e:errs.append("mobile: "+str(e)))
    m.goto(base+"#region=all");m.wait_for_function("window._ready");m.wait_for_timeout(1200)
    nb=m.eval_on_selector_all("#map .bb","e=>e.length");nm=m.eval_on_selector_all("#map .mk","e=>e.length");labs=m.eval_on_selector_all("#map .clab","e=>e.length")
    ng=m.eval_on_selector_all("details.grp","e=>e.length");no=m.eval_on_selector_all("details.grp[open]","e=>e.length");side=m.is_visible("#side");wno=m.evaluate("()=>document.getElementById('whatsnew').open")
    r=m.evaluate(JS);small=m.evaluate("()=>[...document.querySelectorAll('button,summary,.rbar,.tchip')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<44).map(b=>b.textContent.slice(0,30))")
    bt=m.evaluate("()=>{const t=document.querySelector('#map .bb .bn');return t?t.getBoundingClientRect().height:0}")
    print("mobile world: bubbles",nb,"markers",nm,"labels",labs,"| groups",ng,"open",no,"| sidebar visible",side,"| what's new open",wno,"| labels",r,"| <44px",small,"| bubble text px",round(bt,1))
    if nb<5 or nm or labs or not ng or no or side or wno or r["bad"] or small or (r["n"] and r["minPx"]<12.95): bad=1
    m.locator("#map .bb").first.tap();m.wait_for_timeout(1400);nm2=m.eval_on_selector_all("#map .mk","e=>e.length");nb2=m.eval_on_selector_all("#map .bb","e=>e.length");rt=m.inner_text("#title")
    print("bubble tap -> markers",nm2,"bubbles",nb2,"|",rt)
    if not nm2 or nb2: bad=1
    m.click("details.grp summary");m.wait_for_timeout(200);op1=m.eval_on_selector_all("details.grp[open]","e=>e.length")
    c0=m.eval_on_selector_all("#pcards .pcard","e=>e.length");m.click("#fbtn");m.wait_for_timeout(400)
    so=m.evaluate("()=>document.getElementById('fsheet').classList.contains('open')");inside=m.evaluate("()=>['q','legend','conf'].every(i=>document.getElementById(i).closest('#fsheet'))")
    m.fill("#q","port");m.wait_for_timeout(300);c1=m.eval_on_selector_all("#pcards .pcard","e=>e.length");m.fill("#q","");m.click("#fdone");m.wait_for_timeout(400);sc=not m.evaluate("()=>document.getElementById('fsheet').classList.contains('open')")
    m.click(".tchip[data-t=port]");m.wait_for_timeout(300);c2=m.eval_on_selector_all("#pcards .pcard","e=>e.length");m.click(".tchip[data-t=port]");m.wait_for_timeout(300)
    print("group tap opens",op1,"| sheet opens",so,"filters inside",inside,"| search cards",c0,"->",c1,"| sheet closes",sc,"| type chip cards",c2)
    if op1!=1 or not so or not inside or not (0<c1<c0) or not sc or not (0<c2<c0): bad=1
    if not m.eval_on_selector_all("details.grp[open]","e=>e.length"): m.click("details.grp summary");m.wait_for_timeout(200)
    m.click("details.grp[open] .pcard");m.wait_for_timeout(800);pw=m.evaluate("()=>{const p=document.getElementById('panel');return p.classList.contains('open')?p.getBoundingClientRect().width:0}")
    hasq=m.evaluate("()=>/What China gets/i.test(document.getElementById('pbody').innerText)&&/Host country/i.test(document.getElementById('pbody').innerText)&&document.querySelectorAll('#pbody .srcl a.sn').length>0")
    if pre: m.screenshot(path=f"{pre}-m-details.png")
    msl=m.evaluate("()=>({o:document.documentElement.scrollWidth>document.documentElement.clientWidth,n:document.querySelectorAll('#pbody .srcl a').length,w:Math.max(...[...document.querySelectorAll('#pbody .srcl a')].map(a=>a.getBoundingClientRect().right))})")
    print("mobile details source links",msl)
    if msl["o"] or not msl["n"] or msl["w"]>390: bad=1
    m.click("#showmap");m.wait_for_timeout(1500);ln=m.eval_on_selector_all("#map .lines path","e=>e.length");pc=not m.evaluate("()=>document.getElementById('panel').classList.contains('open')")
    print("details width",pw,"sections",hasq,"| show on map closes",pc,"line drawn",ln)
    if pw<385 or not hasq or not pc or not ln: bad=1
    m.goto(base+"#p=bri-panama-ports");m.wait_for_timeout(1500);dp=m.evaluate("()=>document.getElementById('panel').classList.contains('open')")
    m.goto(base+"#region=pacific");m.wait_for_timeout(1200);dr=m.inner_text("#title")
    print("mobile deep links: #p= opens",dp,"| #region=",dr,"| errors",errs)
    if not dp or "Pacific" not in dr or errs: bad=1
    if pre:
        m.goto(base+"#region=all");m.wait_for_timeout(1200);m.evaluate("window.scrollTo(0,0)");m.screenshot(path=f"{pre}-m-landing.png")
        m.evaluate("document.querySelector('.mapbox').scrollIntoView()");m.wait_for_timeout(300);m.screenshot(path=f"{pre}-m-map.png")
        m.goto(base+"#region=central-america-caribbean");m.wait_for_timeout(1300);m.evaluate("()=>{const d=document.querySelector('details.grp');d.open=true;d.scrollIntoView()}");m.wait_for_timeout(300);m.screenshot(path=f"{pre}-m-group.png")
        d=b.new_page(viewport={"width":1280,"height":800});d.goto(base+"#region=all");d.wait_for_function("window._ready");d.wait_for_timeout(1500);d.screenshot(path=f"{pre}-desktop-1280.png");d.screenshot(path=f"{pre}-desktop-1280-full.png",full_page=True)
    if pre:
        m=b.new_page(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True);m.goto(base+"#region=central-america-caribbean");m.wait_for_function("window._ready");m.wait_for_timeout(1500);m.screenshot(path=f"{pre}-mobile.png",full_page=True)
        pg.goto(base+"#region=central-america-caribbean");pg.wait_for_function("window._ready");pg.wait_for_timeout(1500);pg.screenshot(path=f"{pre}-desktop.png",full_page=True)
    b.close()
print("FAIL" if bad else "PASS");sys.exit(bad)
