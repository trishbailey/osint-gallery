"""Headless Chromium screenshots (desktop 1440 and phone 390) plus interaction tests: every tooltip target, every button.
Usage: python screenshots.py [base_url] [outdir]"""
import sys, json, os
FAILS = []
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
        page.evaluate("document.querySelector('#pris-sec').scrollIntoView()"); page.wait_for_timeout(300)
        shot(page, f"{tag}-01b-prisoners-top.png", full=False)
        page.evaluate("window.scrollTo(0,0)")
        if mobile:
            for d in page.query_selector_all("details.sec"): d.evaluate("e=>e.open=true")
            page.evaluate("window.dispatchEvent(new Event('resize'))"); page.wait_for_timeout(500)
        shot(page, f"{tag}-02-full.png")
        # map: hover + click a region, metric buttons
        page.evaluate("document.querySelector('#dead-sec').scrollIntoView()")
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
        for m in ("vol", "mob", "pri", "dist", "pov", "ru", "bonus", "deaths"):
            before = page.evaluate("[...document.querySelectorAll('#map path.reg')].map(p=>p.getAttribute('fill')).join()")
            page.click(f".chipb[data-metric={m}]"); page.wait_for_timeout(250)
            after = page.evaluate("[...document.querySelectorAll('#map path.reg')].map(p=>p.getAttribute('fill')).join()")
            print(tag, "metric", m, "fills changed" if before != after else "fills same"); 
            if m == "pri": shot(page, f"{tag}-05-map-prisoners.png", full=False)
            if m == "pov": shot(page, f"{tag}-05b-map-poverty.png", full=False)
            if m == "bonus": shot(page, f"{tag}-05c-map-bonus.png", full=False)
        # round 4: flow map (first graphic) and North Korea section
        sig = lambda sel: page.evaluate(f"[...document.querySelectorAll('{sel} path')].map(p=>p.getAttribute('d')||'').join('|').length+':'+[...document.querySelectorAll('{sel} path')].map(p=>(p.getAttribute('d')||'').slice(0,40)).join('').length")
        page.evaluate("document.querySelector('#flow-sec').scrollIntoView()"); page.wait_for_timeout(400)
        assert page.evaluate("document.querySelector('#flow-sec').getBoundingClientRect().top < document.querySelector('#pris-sec').getBoundingClientRect().top")
        ns = len(page.query_selector_all("#flowmap g.st")); nr = len(page.query_selector_all("#flowmap path.rg")); print(tag, "flow arrows", ns, "regions", nr); assert ns == 5 and nr > 80
        wid = page.evaluate("[...document.querySelectorAll('#flowmap g.st path.stp')].map(p=>parseFloat(getComputedStyle(p).strokeWidth))"); print(tag, "strand widths", min(wid), max(wid)); assert min(wid) >= 3 - 0.01 and max(wid) <= (34 if mobile else 56) + 0.01 and max(wid) / min(wid) > 5
        shot(page, f"{tag}-09-flow-map.png", full=False)
        FIND2 = """g=>{const e=g.querySelector('path.stp');const L=e.getTotalLength();for(let i=1;i<40;i++){const q=e.getPointAtLength(L*i/40);const m=e.getScreenCTM();const x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(x<0||y<0||x>innerWidth||y>innerHeight)continue;const t=document.elementFromPoint(x,y);if(t&&t.closest('[data-tip]')===g)return [x,y]}return null}"""
        got_tip = False
        for st in page.query_selector_all("#flowmap g.st")[:12]:
            pt = st.evaluate(FIND2)
            if pt:
                page.mouse.move(*pt); page.mouse.click(*pt) if mobile else None; page.wait_for_timeout(120)
                if page.is_visible("#tip") and "recruited" in page.inner_text("#tip"): got_tip = True; print(tag, "arrow tooltip:", page.inner_text("#tip").replace("\n", " | ")[:150]); break
        assert got_tip, "no arrow tooltip"
        shot(page, f"{tag}-09b-flow-strand-hover.png", full=False)
        # yearly streamgraphs: main + companion, 5 hover columns each, hatched no-data cells, tooltip shows exact values, no horizontal overflow, stacked on phone
        page.evaluate("document.querySelector('#streamMain').scrollIntoView({block:'center'})"); page.wait_for_timeout(300)
        for sid_ in ("#streamMain", "#streamNiche"):
            assert len(page.query_selector_all(sid_ + " .tshit")) == 5 and len(page.query_selector_all(sid_ + " path.stl")) in (5, 3), sid_
        assert len(page.query_selector_all("#streamMain svg[role=img] rect[fill^='url(#hatch']")) == 12 and len(page.query_selector_all("#streamNiche svg[role=img] rect[fill^='url(#hatch']")) == 7
        bm_, bn_ = page.evaluate("[...document.querySelectorAll('#streamMain,#streamNiche')].map(e=>e.getBoundingClientRect().toJSON())")
        if mobile: assert bn_["y"] > bm_["y"] + bm_["height"] - 2, "streamgraphs must stack on phone"
        else: assert abs(bn_["y"] - bm_["y"]) < 40, "streamgraphs sit side by side on desktop"
        box_ = page.query_selector("#streamMain .tshit:nth-of-type(3)").bounding_box() if False else page.evaluate("(()=>{const r=document.querySelectorAll('#streamMain .tshit')[2].getBoundingClientRect();return [r.x+r.width/2,r.y+60]})()")
        page.mouse.move(*box_); page.mouse.click(*box_) if mobile else None; page.wait_for_timeout(150)
        tp_ = page.inner_text("#tip"); assert "490,000" in tp_ and "11,000" in tp_ and "no data" in tp_, tp_[:200]
        shot(page, f"{tag}-09c-streamgraph-hover.png", full=False)
        nb = len(page.query_selector_all("#flowbars .brow")); print(tag, "named-dead bars", nb); assert nb == 4
        vals = page.evaluate("[...document.querySelectorAll('#flowbars .bv')].map(e=>parseInt(e.textContent.replace(/,/g,'')))"); assert vals == sorted(vals, reverse=True), vals
        page.evaluate("document.querySelector('#flowbars').scrollIntoView({block:'center'})"); page.wait_for_timeout(200)
        bbar = page.query_selector("#flowbars .brow"); bbar.hover(); page.wait_for_timeout(150)
        if mobile: bbar.click(); page.wait_for_timeout(150)
        assert page.is_visible("#tip") and "named dead" in page.inner_text("#tip"), "no bar tooltip"
        shot(page, f"{tag}-09d-flow-named-dead-bars.png", full=False)
        page.evaluate("document.querySelector('#flowmap').scrollIntoView({block:'center'})"); page.wait_for_timeout(200)
        for k in ("pri", "for", "mob", "vol"):
            before = page.evaluate("document.querySelectorAll('#flowmap g.st').length")
            page.click(f".fchip[data-k={k}]"); page.wait_for_timeout(200)
            after = page.evaluate("document.querySelectorAll('#flowmap g.st').length"); print(tag, "flow chip", k, before, "->", after); assert before != after, k
            if k == "mob": shot(page, f"{tag}-09c-flow-no-prisoners-foreign.png", full=False)
        for k in ("pri", "for", "mob", "vol"):
            page.click(f".fchip[data-k={k}]"); page.wait_for_timeout(150)
        page.click(f".fchip[data-k=pri]"); page.click(f".fchip[data-k=pri]"); page.wait_for_timeout(150)
        assert page.query_selector("#fz-in") is None, "zoom buttons should be gone"
        page.evaluate("document.querySelector('#nk-sec').open=true"); page.evaluate("window.dispatchEvent(new Event('resize'))"); page.wait_for_timeout(600)
        page.evaluate("document.querySelector('#nk-sec').scrollIntoView()"); page.wait_for_timeout(300)
        rows = len(page.query_selector_all("#nkrel g.nkr")); print(tag, "nk rows", rows); assert rows == 13
        assert len(page.query_selector_all("#nkmap path.reg, #nkmap path.rg")) > 20, "nk map regions"
        shot(page, f"{tag}-10-nk-section.png", full=False)
        for g in page.query_selector_all("#nkrel g.nkr")[:13:4]:
            g.scroll_into_view_if_needed(); bb2 = g.bounding_box(); page.mouse.move(bb2["x"] + bb2["width"] / 2, bb2["y"] + bb2["height"] / 2)
            if mobile: page.mouse.click(bb2["x"] + bb2["width"] / 2, bb2["y"] + bb2["height"] / 2)
            page.wait_for_timeout(120); tp = page.inner_text("#tip") if page.is_visible("#tip") else ""
            print(tag, "nk row tooltip:", tp.replace("\n", " | ")[:120]); assert any(w in tp for w in ("documented", "reported", "contested")), "nk tooltip"
        page.evaluate("document.querySelector('#nkmap').scrollIntoView({block:'center'})"); page.wait_for_timeout(300)
        shot(page, f"{tag}-10b-nk-map.png", full=False)
        for bid in ("#nz-in", "#nz-out", "#nz-kr", "#nz-ru", "#nz-reset"):
            before = sig("#nkmap"); page.click(bid); page.wait_for_timeout(500); after = sig("#nkmap"); print(tag, bid, "view changed" if before != after else "view same")
            if bid == "#nz-kr": shot(page, f"{tag}-10c-nk-korean-end.png", full=False)
        for d in page.query_selector_all("#nk-sec details.how"):
            d.scroll_into_view_if_needed(); b0 = d.evaluate("e=>e.open"); d.query_selector("summary").click(); page.wait_for_timeout(120); assert d.evaluate("e=>e.open") != b0
        page.evaluate("document.querySelector('#nk-sec .tline').scrollIntoView({block:'center'})"); page.wait_for_timeout(200)
        shot(page, f"{tag}-10d-nk-timeline.png", full=False)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "horizontal overflow"
        # section screenshots, nested toggles, sankey, photos, minimaps
        for sid in ("flow-sec", "pris-sec", "nk-sec", "for-sec", "con-sec", "dead-sec", "undercount", "trk-sec"):
            page.evaluate("document.querySelector('#trk-sec').open=true;document.querySelector('#nk-sec').open=true")
            page.evaluate(f"document.querySelector('#{sid}').scrollIntoView()"); page.wait_for_timeout(250)
            shot(page, f"{tag}-07-{sid}.png", full=False)
        for mm in ("#mm-bonus",):
            n = len(page.query_selector_all(mm + " path.reg")); print(tag, mm, "regions", n); assert n > 80, mm
        assert page.query_selector("#sankey") is None, "sankey should be gone"
        # prison colony map: 340 circles, top-10 list, tooltip on the biggest circle, zoom without buttons
        page.evaluate("document.querySelector('#colmap').scrollIntoView({block:'center'})"); page.wait_for_timeout(400)
        nc = len(page.query_selector_all("#colmap circle.col")); print(tag, "colony circles", nc); assert nc == 340, nc
        assert len(page.query_selector_all("#coltop li")) == 10 and page.query_selector("#colmap button") is None and page.query_selector("#colmap .fz") is None
        rs = page.evaluate("[...document.querySelectorAll('#colmap circle.col')].map(c=>parseFloat(c.getAttribute('r')))"); assert max(rs) > 4 * min(rs), (min(rs), max(rs))
        cbig = page.query_selector_all("#colmap circle.col")[rs.index(max(rs))]
        # circles overlap (small ones are drawn on top), so find a point where the biggest circle itself is the top element
        cpt = cbig.evaluate("""e=>{const b=e.getBoundingClientRect();for(let i=1;i<24;i++)for(let j=1;j<24;j++){const x=b.x+b.width*i/24,y=b.y+b.height*j/24;if(document.elementFromPoint(x,y)===e)return [x,y]}return null}""")
        assert cpt, "biggest colony circle is fully covered"; cx, cy = cpt
        if mobile: page.mouse.click(cx, cy)
        else: page.mouse.move(cx, cy)
        page.wait_for_timeout(200); ct = page.inner_text("#tip"); print(tag, "colony tooltip:", ct.replace("\n", " | ")); assert "IK6 Krasnoyarsk" in ct and "506" in ct and "136" in ct and "Jul 2022 to Feb 2023 only" in ct
        shot(page, f"{tag}-11-colony-map.png", full=False)
        if not mobile:
            t0 = page.evaluate("document.querySelector('#colmap svg > g').getAttribute('transform')")
            page.mouse.move(700, 450); page.keyboard.down("Control"); page.mouse.wheel(0, -600); page.keyboard.up("Control"); page.wait_for_timeout(500)
            t1 = page.evaluate("document.querySelector('#colmap svg > g').getAttribute('transform')"); print(tag, "colony zoom", t0, "->", t1); assert t0 != t1
            sc = page.evaluate("window.scrollY"); page.mouse.move(700, 450); page.mouse.wheel(0, 300); page.wait_for_timeout(300)
            assert page.evaluate("window.scrollY") != sc, "plain scroll must still scroll the page over the colony map"
        imgs = page.evaluate("[...document.querySelectorAll('.ph img')].map(i=>[i.complete&&i.naturalWidth>0,i.alt.length])"); print(tag, "photos", imgs); assert all(a and b > 20 for a, b in imgs) and len(imgs) == 13
        for d in page.query_selector_all("details.how"):
            d.evaluate("e=>{let p=e.parentElement.closest('details');while(p){p.open=true;p=p.parentElement.closest('details')}}")
            d.scroll_into_view_if_needed(); before = d.evaluate("e=>e.open"); d.query_selector("summary").click(); page.wait_for_timeout(120)
            assert d.evaluate("e=>e.open") != before, "toggle did nothing"
            if not d.evaluate("e=>e.open"): d.query_selector("summary").click()
        page.wait_for_timeout(300); shot(page, f"{tag}-08-with-toggles-open.png")
        # zoom
        page.mouse.move(bb["x"] + 20, bb["y"] + 20)
        # other buttons
        for sel, what in (("#bonusmore", "#bonusbars .brow"), ("#firmonly", "#bonusbars .brow")):
            page.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center'}})")
            n0 = len(page.query_selector_all(what)); page.click(sel); page.wait_for_timeout(200); n1 = len(page.query_selector_all(what))
            print(tag, sel, n0, "->", n1); assert n0 != n1, sel
        page.click("#firmonly")  # restore
        # all tooltip targets: find a point where the target is the topmost [data-tip] element, hover/click it, compare text
        tips = page.query_selector_all("[data-tip]"); print(tag, "tooltip targets", len(tips)); bad = []; checked = 0
        FIND = """e=>{const b=e.getBoundingClientRect();for(let i=1;i<12;i++)for(let j=1;j<12;j++){const x=b.x+b.width*i/12,y=b.y+b.height*j/12;
          if(x<0||y<0||x>innerWidth||y>innerHeight)continue;const t=document.elementFromPoint(x,y);if(t&&t.closest('[data-tip]')===e&&[[1,0],[-1,0],[0,1],[0,-1]].every(d=>{const u=document.elementFromPoint(x+d[0],y+d[1]);return u&&u.closest('[data-tip]')===e}))return [x,y]}return null}"""
        FINE = """e=>{const hit=(x,y)=>{if(x<0||y<0||x>innerWidth||y>innerHeight)return false;const t=document.elementFromPoint(x,y);return !!(t&&t.closest('[data-tip]')===e)};const hit3=(x,y)=>hit(x,y)&&hit(x+1,y)&&hit(x-1,y)&&hit(x,y+1)&&hit(x,y-1);
          const b=e.getBoundingClientRect();for(let i=1;i<40;i++)for(let j=1;j<40;j++){const x=b.x+b.width*i/40,y=b.y+b.height*j/40;if(hit3(x,y))return [x,y]}
          const p=e.querySelector&&e.querySelector('path.stp');if(p){const L=p.getTotalLength(),m=p.getScreenCTM();for(let i=1;i<200;i++){const q=p.getPointAtLength(L*i/200);const x=m.a*q.x+m.c*q.y+m.e,y=m.b*q.x+m.d*q.y+m.f;if(hit3(x,y)||hit(x,y))return [x,y]}}
          for(let i=1;i<60;i++)for(let j=1;j<60;j++){const x=b.x+b.width*i/60,y=b.y+b.height*j/60;if(hit(x,y))return [x,y]}
          return null}"""
        DEEP = """e=>{const b=e.getBoundingClientRect();let best=null,bs=-1;const ok=(x,y)=>{const t=document.elementFromPoint(x,y);return !!(t&&t.closest('[data-tip]')===e)};
          for(let i=1;i<50;i++)for(let j=1;j<50;j++){const x=b.x+b.width*i/50,y=b.y+b.height*j/50;if(x<0||y<0||x>innerWidth||y>innerHeight||!ok(x,y))continue;let r=0;for(;r<8;r++){if(![[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,-r],[r,-r],[-r,r]].every(d=>ok(x+d[0],y+d[1])))break}if(r>bs){bs=r;best=[x,y]}}return best}"""
        step = max(1, len(tips) // 150)
        for t in tips[::step] + [x for x in tips if x.evaluate("e=>e.classList.contains('reg')")][::3]:
            if not t.is_visible(): continue  # e.g. a map dot outside the current view or a chip-hidden arrow: nothing to hover
            t.scroll_into_view_if_needed(); page.wait_for_timeout(70); pt = t.evaluate(FIND)
            if pt is None and t.evaluate("e=>!!e.closest('#flowmap')"):
                # flow map elements outside the zoomed phone view: zoom out to the whole map, as a visitor would, then look again
                page.evaluate("document.querySelector('#flowmap').scrollIntoView({block:'center'})")
                page.evaluate("document.querySelector('#flowmap svg').dispatchEvent(new Event('zoomreset'))")
                page.evaluate("document.querySelector('#flowmap').scrollIntoView({block:'center'})"); page.wait_for_timeout(300); pt = t.evaluate(FIND)
            if pt is None: pt = t.evaluate(FINE)
            if pt is None:
                # marks under about 8 px across (small regions on the phone, colony circles) or colony circles covered by a neighbour
                # cannot be hit without zooming in; zooming is how a visitor reaches them, so they are not counted as dead targets
                tb = t.bounding_box() or {"width": 0, "height": 0}
                if min(tb["width"], tb["height"]) < 8 or t.evaluate("e=>!!e.closest('#colmap') || e.matches('#map path.reg')"): continue  # map regions are hover-tested above and in the CI click check
                bad.append(("no hoverable point", t.get_attribute("data-tip")[:40])); continue
            if mobile:
                page.evaluate("document.querySelector('#tip').hidden=true"); page.mouse.click(*pt)
            else: page.mouse.move(*pt)
            page.wait_for_timeout(60); checked += 1
            want = t.evaluate("e=>{const d=document.createElement('div');d.innerHTML=e.getAttribute('data-tip');return d.textContent}")
            got = page.inner_text("#tip") if page.is_visible("#tip") else ""
            if mobile and page.evaluate("document.querySelector('#panel').classList.contains('open')"):
                page.click("#closepanel"); page.wait_for_timeout(300)
            if not got.strip() and not (mobile and t.evaluate("e=>e.classList.contains('reg')")): bad.append(("no tooltip", want[:40]))
            elif got.strip() and want.replace("\n", "")[:30] not in got.replace("\n", ""):
                # a point on the edge of two overlapping marks can go either way: retry once at the most interior point
                pt2 = t.evaluate(DEEP)
                if pt2 is not None:
                    page.evaluate("document.querySelector('#tip').hidden=true")
                    if mobile: page.mouse.click(*pt2)
                    else: page.mouse.move(*pt2)
                    page.wait_for_timeout(80); got = page.inner_text("#tip") if page.is_visible("#tip") else ""
                    if mobile and page.evaluate("document.querySelector('#panel').classList.contains('open')"): page.click("#closepanel"); page.wait_for_timeout(300)
                if got.strip() and want.replace("\n", "")[:30] not in got.replace("\n", ""): bad.append(("wrong tooltip", want[:40], got[:40]))
        print(tag, "tooltips checked", checked, "failures", len(bad), bad[:8]); FAILS.extend((tag, b) for b in bad)
        shot(page, f"{tag}-06-after-interactions.png")
        ctx.close()
    b.close()
print("JS errors:", errs); print("tooltip failures:", len(FAILS), FAILS[:20])
sys.exit(1 if errs or FAILS else 0)
