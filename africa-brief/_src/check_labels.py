"""Label check: every visible SVG label >=13px on screen and WCAG AA (4.5:1) against the dark map background.
Usage: python check_labels.py [port]  (serve the osint-gallery root first)"""
from playwright.sync_api import sync_playwright
import sys
port=sys.argv[1] if len(sys.argv)>1 else "8950"
JS="""()=>{const L=c=>{const v=c.match(/\\d+(\\.\\d+)?/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 const bg=[L('rgb(11,21,38)'),L('rgb(15,27,49)'),L('rgb(28,44,75)')];const out=[];
 document.querySelectorAll('svg text').forEach(t=>{const b=t.getBoundingClientRect();if(!b.width||getComputedStyle(t).display==='none')return;
  const px=parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a;const f=L(getComputedStyle(t).fill);
  const cr=Math.min(...bg.map(g=>(Math.max(f,g)+.05)/(Math.min(f,g)+.05)));out.push({t:t.textContent,px,cr});});
 return {n:out.length,minPx:Math.min(...out.map(o=>o.px)),minContrast:Math.min(...out.map(o=>o.cr)),bad:out.filter(o=>o.px<12.95||o.cr<4.5).slice(0,15)};}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]);pg=b.new_page(viewport={"width":1440,"height":1000})
    errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(f"http://127.0.0.1:{port}/africa-brief/");pg.wait_for_function("window._check",timeout=20000)
    pg.evaluate("document.querySelectorAll('details.region').forEach(d=>d.open=true)");pg.check("#L-ru");pg.check("#L-all");pg.wait_for_timeout(800)
    r=pg.evaluate(JS);print("errors",errs);print(r)
    ok=not errs and r["minPx"]>=12.95 and r["minContrast"]>=4.5
    print("PASS" if ok else "FAIL");b.close();sys.exit(0 if ok else 1)
