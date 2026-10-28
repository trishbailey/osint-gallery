#!/usr/bin/env python3
"""Browser check: no callout or label may sit on a route / trajectory line, on land, or on another label.
Runs in CI via scripts/ci_check.py (cwd = repo root) or by hand: python ghost-fleet/_src/test_label_overlap.py
Checks, at desktop widths and at 390px phone width:
  1. Pacific shuttle map: each HTML callout box vs the route path (sampled), every leader line other than its own,
     the port dots, the land polygons (isPointInFill) and the other callouts. On phones the callouts stack under the map, so they must be outside the map.
  2. Story chapter 1 (red sea lanes): the count labels and the note box vs every drawn route line, and the labels off land.
  3. Explore view: the permanent port pills vs every drawn flow line.
Exit code 1 and a list of problems when anything overlaps."""
import os, sys, http.server, threading, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAD = 3  # px of clear space required around a label

SHUTTLE_JS = """(pad)=>{
 const svg=document.querySelector('#shmap svg'),box=document.getElementById('shmap'),out=[];
 const cos=[...box.querySelectorAll('.callout')];
 const sb=svg.getBoundingClientRect();
 if(!cos.length)return['no callouts found'];
 const cr=cos.map(c=>c.getBoundingClientRect());
 const inter=(a,b,p)=>a.left<b.right+p&&a.right>b.left-p&&a.top<b.bottom+p&&a.bottom>b.top-p;
 if(getComputedStyle(cos[0]).position!=='absolute'){ // stacked under the map on phones
  cr.forEach((r,i)=>{if(inter(r,sb,0))out.push('callout '+i+' overlaps the map')});
  return out}
 const m=svg.getScreenCTM(),pt=(x,y)=>{const p=new DOMPoint(x,y).matrixTransform(m);return[p.x,p.y]};
 const inRect=(p,r,pd)=>p[0]>r.left-pd&&p[0]<r.right+pd&&p[1]>r.top-pd&&p[1]<r.bottom+pd;
 const route=document.getElementById('shroute'),L=route.getTotalLength(),rp=[];
 for(let d=0;d<=L;d+=2){const q=route.getPointAtLength(d);rp.push(pt(q.x,q.y))}
 const leads=[...svg.querySelectorAll('line.lead')].map(l=>({a:pt(+l.getAttribute('x1'),+l.getAttribute('y1')),b:pt(+l.getAttribute('x2'),+l.getAttribute('y2'))}));
 const land=[...svg.querySelectorAll('g[data-ci-ignore] path')],inv=m.inverse();
 const ports=[...svg.querySelectorAll('.sport')].map(c=>c.getBoundingClientRect());
 const segHit=(a,b,r,pd)=>{for(let t=0;t<=1;t+=.02){if(inRect([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],r,pd))return true}return false};
 cr.forEach((r,i)=>{
  const n='callout '+i+' ("'+cos[i].textContent.slice(0,22)+'")';
  if(r.left<sb.left||r.right>sb.right||r.top<sb.top||r.bottom>sb.bottom)out.push(n+' leaves the map');
  if(rp.some(p=>inRect(p,r,pad)))out.push(n+' covers the route line');
  leads.forEach((l,j)=>{if(j!==i&&segHit(l.a,l.b,r,pad))out.push(n+' covers the leader line of callout '+j)});
  ports.forEach((q,j)=>{if(inter(r,q,pad))out.push(n+' covers a port dot')});
  let onLand=false;for(let x=r.left;x<=r.right&&!onLand;x+=6)for(let y=r.top;y<=r.bottom;y+=6){const p=new DOMPoint(x,y).matrixTransform(inv);if(land.some(e=>e.isPointInFill(p))){onLand=true;break}}
  if(onLand)out.push(n+' covers land');
  cr.forEach((r2,j)=>{if(j>i&&inter(r,r2,pad))out.push(n+' overlaps callout '+j)});
 });
 // the leader lines must not cross the route either
 leads.forEach((l,j)=>{for(let k=0;k<rp.length-1;k++){const a=l.a,b=l.b,c=rp[k],d=rp[k+1];
   const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
   if(o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0){out.push('leader line '+j+' crosses the route line');break}}});
 return out}"""

MAP_JS = """(pad)=>{
 const {map,LAND}=GF,out=[],cont=map.getContainer(),cb=cont.getBoundingClientRect();
 const lines=[];
 map.eachLayer(l=>{if(l instanceof L.Polyline&&!(l instanceof L.Polygon)&&l.options.opacity!==0){
   const ll=l.getLatLngs();const segs=Array.isArray(ll[0])&&ll[0].length&&Array.isArray(ll[0][0])?ll:[ll];
   segs.forEach(s=>{const p=s.flat?s.flat():s;const q=p.filter(x=>x&&x.lat!==undefined).map(x=>map.latLngToContainerPoint(x));if(q.length>1)lines.push(q)})}});
 const boxes=[...cont.querySelectorAll('.b3l,.arwnote,.leaflet-tooltip.pill')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e).display!=='none'});
 const inRect=(p,r,pd)=>p.x>r.left-pd&&p.x<r.right+pd&&p.y>r.top-pd&&p.y<r.bottom+pd;
 const feats=LAND.features.map(f=>{const g=f.geometry;return g?(g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]):[]});
 const pip=(x,y,ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){if((ring[i][1]>y)!==(ring[j][1]>y)&&x<(ring[j][0]-ring[i][0])*(y-ring[i][1])/(ring[j][1]-ring[i][1])+ring[i][0])c=!c}return c};
 const onLand=(x,y)=>feats.some(polys=>polys.some(p=>pip(x,y,p[0])&&!p.slice(1).some(h=>pip(x,y,h))));
 const rects=boxes.map(e=>{const r=e.getBoundingClientRect();return{e,r:{left:r.left-cb.left,right:r.right-cb.left,top:r.top-cb.top,bottom:r.bottom-cb.top}}});
 rects.forEach(({e,r},i)=>{
  const n=(e.className.baseVal||e.className).split(' ')[0]+' "'+e.textContent.slice(0,24)+'"';
  for(const q of lines){if(q.length===2&&(inRect(q[0],r,0)||inRect(q[1],r,0)))continue; // the label's own leader line ends under it
   let hit=false;for(let k=0;k<q.length-1&&!hit;k++){const a=q[k],b=q[k+1],len=Math.hypot(b.x-a.x,b.y-a.y),st=Math.max(1,Math.ceil(len/3));
    for(let t=0;t<=st;t++){const p={x:a.x+(b.x-a.x)*t/st,y:a.y+(b.y-a.y)*t/st};if(inRect(p,r,pad)){hit=true;break}}}
   if(hit){out.push(n+' sits on a route line');break}}
  if(!e.matches('.arwnote')){let land=false;for(let x=r.left;x<=r.right&&!land;x+=6)for(let y=r.top;y<=r.bottom;y+=6){const ll=map.containerPointToLatLng([x,y]);if(onLand(ll.lng,ll.lat)){land=true;break}}
   if(land)out.push(n+' covers land')}
  rects.forEach((o,j)=>{if(j>i&&r.left<o.r.right+pad&&r.right>o.r.left-pad&&r.top<o.r.bottom+pad&&r.bottom>o.r.top-pad)out.push(n+' overlaps '+(o.e.className.baseVal||o.e.className).split(' ')[0])});
 });
 return {n:boxes.length,out}}"""

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    h.log_message = lambda *a: None
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

def main():
    srv = serve(); url = f"http://127.0.0.1:{srv.server_address[1]}/ghost-fleet/"
    probs = []; checked = 0
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--no-sandbox"])
        for w, h in [(1440, 900), (1280, 900), (1024, 800), (800, 800), (720, 800), (390, 844)]:
            pg = br.new_page(viewport={"width": w, "height": h})
            pg.goto(url, wait_until="load", timeout=60000)
            pg.wait_for_selector("#shmap svg", timeout=30000)
            pg.wait_for_selector(".chap", timeout=30000)
            pg.wait_for_timeout(2500)
            r = pg.evaluate(SHUTTLE_JS, PAD); checked += 3
            probs += [f"[{w}px] shuttle map: {x}" for x in r]
            if pg.evaluate("document.documentElement.scrollWidth") > w + 2:
                probs.append(f"[{w}px] page is wider than the screen")
            if w in (1280, 390) and "--quick" not in sys.argv:
                pg.evaluate("document.querySelectorAll('.chap')[0].click()"); pg.wait_for_timeout(3500)
                m = pg.evaluate(MAP_JS, PAD); checked += m["n"]
                probs += [f"[{w}px] chapter 1 map: {x}" for x in m["out"]]
                if m["n"] < 3: probs.append(f"[{w}px] chapter 1: expected the three count labels, found {m['n']}")
                pg.evaluate("document.querySelectorAll('#modes button')[1].click()"); pg.wait_for_timeout(3500)
                m = pg.evaluate(MAP_JS, PAD); checked += m["n"]
                probs += [f"[{w}px] explore map: {x}" for x in m["out"]]
            pg.close()
        br.close()
    srv.shutdown()
    for x in probs: print("OVERLAP:", x)
    print(f"{checked} labels checked; {len(probs)} problem(s).")
    sys.exit(1 if probs else 0)

if __name__ == "__main__":
    main()
