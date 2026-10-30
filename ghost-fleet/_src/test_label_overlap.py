#!/usr/bin/env python3
"""Browser check: no callout or label may sit on a route / trajectory line, on land, or on another label.
Runs in CI via scripts/ci_check.py (cwd = repo root) or by hand: python ghost-fleet/_src/test_label_overlap.py
Checks, at desktop widths and at 390px phone width:
  1. Pacific shuttle map: each HTML callout box vs the route path (sampled), every leader line other than its own,
     the port dots, the land polygons (isPointInFill) and the other callouts. On phones the callouts stack under the map, so they must be outside the map.
  2. Story chapter 1 (red sea lanes): the count labels and the note box vs every drawn route line, and the labels off land.
  3. Explore view: the permanent port pills vs every drawn flow line.
  4. Place-name labels (.plc, nations and major port cities) on EVERY map: Pacific shuttle map, all six story chapters (the hub-and-spoke
     chapter has no map, so its ship names are checked instead), the explore view and the raw-events view. Each label must be at least 13px,
     have no background box and be light text at 50-70% opacity, and must not touch a route / trajectory line, a data dot, a callout or
     count box, a map control or another label. A nation name must sit fully inside its own country; a port name must be at sea
     (or on its own country's land only as a fallback), never on a foreign country.
  5. Going dark chapter: the red gap dots must blink fully off and on on a 2 s cycle (about 1.2 s on, 0.8 s off) with a reduced-motion fallback.
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

PLC_MAP_JS = """(pad)=>{
 const {map}=GF,out=[],cont=map.getContainer(),cb=cont.getBoundingClientRect();
 const labs=[...cont.querySelectorAll('.plc')].filter(e=>e.getBoundingClientRect().width>0);
 const lines=[],dots=[],polys=[];
 map.eachLayer(l=>{
  if(l instanceof L.Polygon){if(l.feature&&l.feature.properties&&l.feature.geometry){const g=l.feature.geometry;polys.push({n:l.feature.properties.n,b:l.getBounds(),p:g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]})}return}
  if(l.options&&l.options.opacity===0)return;
  if(l instanceof L.Polyline){const ll=l.getLatLngs();const f=a=>a.flatMap?a.flatMap(x=>Array.isArray(x)?f(x):[x]):a;const q=f(ll).filter(x=>x&&x.lat!==undefined).map(x=>map.latLngToContainerPoint(x));if(q.length>1)lines.push({q,w:(l.options.weight||2)/2})}
  else if(l instanceof L.CircleMarker){const o=l.options;if(o.stroke===false&&(o.fillOpacity||0)<.05)return;const c=map.latLngToContainerPoint(l.getLatLng());dots.push({c,r:(l._radius||o.radius||4)+(o.weight||0)/2})}});
 const boxes=[...cont.querySelectorAll('.b3l,.arwnote,.leaflet-control,.leaflet-tooltip.pill')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e).display!=='none'}).map(e=>{const r=e.getBoundingClientRect();return{left:r.left-cb.left,right:r.right-cb.left,top:r.top-cb.top,bottom:r.bottom-cb.top}});
 const pip=(x,y,ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){if((ring[i][1]>y)!==(ring[j][1]>y)&&x<(ring[j][0]-ring[i][0])*(y-ring[i][1])/(ring[j][1]-ring[i][1])+ring[i][0])c=!c}return c};
 const landAt=ll=>{const r=new Set();polys.forEach(f=>{if(!f.b.contains(ll))return;if(f.p.some(p=>pip(ll.lng,ll.lat,p[0])&&!p.slice(1).some(h=>pip(ll.lng,ll.lat,h))))r.add(f.n)});return r};
 const rects=labs.map(e=>{const r=e.getBoundingClientRect();return{e,r:{left:r.left-cb.left,right:r.right-cb.left,top:r.top-cb.top,bottom:r.bottom-cb.top}}});
 const near=(p,r,d)=>p.x>r.left-d&&p.x<r.right+d&&p.y>r.top-d&&p.y<r.bottom+d;
 const dRect=(c,r)=>Math.hypot(Math.max(r.left-c.x,0,c.x-r.right),Math.max(r.top-c.y,0,c.y-r.bottom));
 rects.forEach(({e,r},i)=>{
  const cs=getComputedStyle(e),n=e.dataset.kind+' "'+e.textContent+'"',col=cs.color.match(/[\\d.]+/g).map(Number);
  if(parseFloat(cs.fontSize)<13)out.push(n+' is under 13px');
  if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.backgroundImage!=='none'||parseFloat(cs.borderTopWidth)>0)out.push(n+' has a background box or border');
  const a=col.length>3?col[3]:1;if(a<.5||a>.7||col[0]<240)out.push(n+' is not plain white at 50-70% opacity');
  if(r.left<0||r.top<0||r.right>cb.width||r.bottom>cb.height)out.push(n+' leaves the map');
  for(const L2 of lines){let hit=false;for(let k=0;k<L2.q.length-1&&!hit;k++){const A=L2.q[k],B=L2.q[k+1],len=Math.hypot(B.x-A.x,B.y-A.y),st=Math.max(1,Math.ceil(len/3));
    for(let t=0;t<=st;t++){if(near({x:A.x+(B.x-A.x)*t/st,y:A.y+(B.y-A.y)*t/st},r,pad+L2.w)){hit=true;break}}}
   if(hit){out.push(n+' sits on a route line');break}}
  if(dots.some(d=>dRect(d.c,r)<d.r+pad-1&&!(d.r>40)))out.push(n+' covers a data dot');
  dots.filter(d=>d.r>40).forEach(d=>{const ds=[[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].map(q=>Math.hypot(q[0]-d.c.x,q[1]-d.c.y));if(Math.min(...ds)<d.r+pad&&Math.max(...ds)>d.r-pad)out.push(n+' sits on a ring')});
  if(boxes.some(b=>r.left<b.right+pad&&r.right>b.left-pad&&r.top<b.bottom+pad&&r.bottom>b.top-pad))out.push(n+' covers a count box, note or control');
  rects.forEach((o,j)=>{if(j>i&&r.left<o.r.right+pad&&r.right>o.r.left-pad&&r.top<o.r.bottom+pad&&r.bottom>o.r.top-pad)out.push(n+' overlaps label "'+o.e.textContent+'"')});
  const key=e.dataset.cn;let foreign=false,outside=false;
  for(let x=r.left+1;x<=r.right-1&&!(foreign&&outside);x+=3)for(let y=r.top+1;y<=r.bottom-1;y+=3){const s=landAt(map.containerPointToLatLng([x,y]));
   if(e.dataset.kind==='nation'){if(!s.has(key))outside=true}else if(s.size&&!s.has(key))foreign=true}
  if(foreign)out.push(n+' covers a foreign country');
  if(e.dataset.kind==='nation'&&outside){ // out at sea is fine only with a leader line to its country; the label must then touch no land at all
   let any=false;for(let x=r.left+1;x<=r.right-1&&!any;x+=3)for(let y=r.top+1;y<=r.bottom-1;y+=3){if(landAt(map.containerPointToLatLng([x,y])).size){any=true;break}}
   if(any)out.push(n+' straddles its country border (covers the country edge)')}
 });
 return {n:labs.length,out,names:labs.map(e=>e.textContent)}}"""

PLC_SH_JS = """(pad)=>{
 const svg=document.querySelector('#shmap svg'),box=document.getElementById('shmap'),out=[];
 const labs=[...box.querySelectorAll('.plc')],m=svg.getScreenCTM(),inv=m.inverse(),sb=svg.getBoundingClientRect();
 if(!labs.length)return{n:0,out:['no place labels found on the shuttle map'],names:[]};
 const cos=[...box.querySelectorAll('.callout')],stacked=cos.length&&getComputedStyle(cos[0]).position!=='absolute';
 const pt=(x,y)=>{const p=new DOMPoint(x,y).matrixTransform(m);return{x:p.x,y:p.y}};
 const route=document.getElementById('shroute'),Lr=route.getTotalLength(),rp=[];
 for(let d=0;d<=Lr;d+=2){const q=route.getPointAtLength(d);rp.push(pt(q.x,q.y))}
 const leads=[...svg.querySelectorAll('line.lead')].filter(l=>getComputedStyle(l).display!=='none').map(l=>[pt(+l.getAttribute('x1'),+l.getAttribute('y1')),pt(+l.getAttribute('x2'),+l.getAttribute('y2'))]);
 const ports=[...svg.querySelectorAll('.sport')].map(c=>c.getBoundingClientRect());
 const land=[...svg.querySelectorAll('g[data-ci-ignore] path')].map(p=>({n:(p.querySelector('title')||{}).textContent,p}));
 const cr=stacked?[]:cos.map(c=>c.getBoundingClientRect());
 const inter=(a,b,p)=>a.left<b.right+p&&a.right>b.left-p&&a.top<b.bottom+p&&a.bottom>b.top-p;
 const rs=labs.map(e=>e.getBoundingClientRect());
 labs.forEach((e,i)=>{const r=rs[i],cs=getComputedStyle(e),n=e.dataset.kind+' "'+e.textContent+'"',col=cs.color.match(/[\\d.]+/g).map(Number);
  if(parseFloat(cs.fontSize)<13)out.push(n+' is under 13px');
  if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.backgroundImage!=='none'||parseFloat(cs.borderTopWidth)>0)out.push(n+' has a background box or border');
  const a=col.length>3?col[3]:1;if(a<.5||a>.7||col[0]<240)out.push(n+' is not plain white at 50-70% opacity');
  if(r.left<sb.left||r.right>sb.right||r.top<sb.top||r.bottom>sb.bottom)out.push(n+' leaves the map');
  const inR=(p,d)=>p.x>r.left-d&&p.x<r.right+d&&p.y>r.top-d&&p.y<r.bottom+d;
  if(rp.some(p=>inR(p,pad+1)))out.push(n+' sits on the route line');
  leads.forEach(l=>{for(let t=0;t<=1;t+=.02)if(inR({x:l[0].x+(l[1].x-l[0].x)*t,y:l[0].y+(l[1].y-l[0].y)*t},pad)){out.push(n+' sits on a callout leader line');break}});
  if(ports.some(q=>inter(r,q,pad-1)))out.push(n+' covers a port dot');
  if(cr.some(q=>inter(r,q,pad)))out.push(n+' touches a callout');
  rs.forEach((o,j)=>{if(j>i&&inter(r,o,pad))out.push(n+' overlaps label "'+labs[j].textContent+'"')});
  const key=e.dataset.cn;let foreign=false,outside=false,any=false;
  for(let x=r.left+1;x<=r.right-1;x+=3)for(let y=r.top+1;y<=r.bottom-1;y+=3){const p=new DOMPoint(x,y).matrixTransform(inv),h=land.filter(f=>f.p.isPointInFill(p));
   if(h.length)any=true;if(h.length&&!h.some(f=>f.n===key))foreign=true;if(!h.some(f=>f.n===key))outside=true}
  if(foreign)out.push(n+' covers a foreign country');
  if(e.dataset.kind==='nation'&&outside&&any)out.push(n+' straddles the edge of its country');
 });
 return{n:labs.length,out,names:labs.map(e=>e.textContent)}}"""

HUB_JS = """()=>{const h=document.getElementById('hub'),out=[];if(!h||!h.querySelector('svg'))return['hub graphic not drawn'];
 const hb=h.getBoundingClientRect(),ts=[...h.querySelectorAll('svg text')];
 if(ts.length<9)out.push('hub shows '+ts.length+' text items, expected the centre plus 8 ships');
 ts.forEach(t=>{const r=t.getBoundingClientRect(),n='hub text "'+t.textContent.slice(0,18)+'"',fs=parseFloat(getComputedStyle(t).fontSize),sc=h.querySelector('svg').getScreenCTM().a;
  if(fs*sc<13)out.push(n+' is under 13px');
  if(r.left<hb.left||r.right>hb.right||r.top<hb.top||r.bottom>hb.bottom)out.push(n+' is cut off by the graphic edge')});
 const ns=[...h.querySelectorAll('.hn')];if(ns.length!==8)out.push('hub has '+ns.length+' ship nodes, expected 8');
 ns.forEach(g=>{const c=g.querySelector('.hd').getBoundingClientRect();ts.forEach(t=>{if(g.contains(t))return;const r=t.getBoundingClientRect();if(c.left<r.right&&c.right>r.left&&c.top<r.bottom&&c.bottom>r.top)out.push('ship node overlaps text "'+t.textContent.slice(0,18)+'"')})});
 const note=h.querySelector('.hubnote');if(note){const nr=note.getBoundingClientRect();ts.forEach(t=>{const r=t.getBoundingClientRect();if(r.left<nr.right&&r.right>nr.left&&r.top<nr.bottom&&r.bottom>nr.top)out.push('hub note overlaps "'+t.textContent.slice(0,18)+'"')})}
 const all=ts.map(t=>t.getBoundingClientRect());all.forEach((a,i)=>all.forEach((b,j)=>{if(j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)out.push('hub texts overlap: "'+ts[i].textContent.slice(0,12)+'" / "'+ts[j].textContent.slice(0,12)+'"')}));
 if(!/Citrine/.test(h.textContent)||!/34 trips/.test(h.textContent))out.push('hub centre should read Citrine Marine, 34 trips');
 return out}"""

BLINK_JS = """()=>{const out=[],css=[...document.styleSheets].flatMap(s=>{try{return[...s.cssRules]}catch(e){return[]}});
 const kf=css.find(r=>r.type===CSSRule.KEYFRAMES_RULE&&/blink|gap/i.test(r.name));if(!kf)return['no gap blink keyframes found'];
 const t=[...kf.cssRules].map(r=>({k:r.keyText,o:r.style.opacity}));
 const on=t.filter(x=>x.o==='1'||x.o==='').map(x=>x.k),offs=t.filter(x=>x.o==='0').map(x=>x.k);
 if(!offs.length)out.push('blink keyframes never reach opacity 0 (must be fully off): '+JSON.stringify(t));
 if(t.some(x=>x.o!==''&&x.o!=='0'&&x.o!=='1'))out.push('blink keyframes use a partial opacity (must be on/off only): '+JSON.stringify(t));
 return out}"""

def blink_runtime(pg):
    """Sample the first red gap dot's real opacity for ~2.4 s: it must be fully on for ~60% and fully off for ~40% of a 2 s cycle,
    and stand still (opacity 1, no animation) when the user prefers reduced motion."""
    out = []
    sel = "#map path.gapdot"
    if not pg.evaluate(f"document.querySelectorAll('{sel}').length"): return ["no red gap dots on the map"]
    cs = pg.evaluate(f"(()=>{{const c=getComputedStyle(document.querySelector('{sel}'));return [c.animationDuration,c.animationTimingFunction,c.animationIterationCount]}})()")
    if cs[0] != "2s" or "steps" not in cs[1] or cs[2] != "infinite": out.append(f"gap dots animate {cs}, expected a 2s step-end loop")
    v = pg.evaluate(f"""new Promise(res=>{{const e=document.querySelector('{sel}'),a=[];const t=setInterval(()=>{{a.push(+getComputedStyle(e).opacity)}},50);setTimeout(()=>{{clearInterval(t);res(a)}},2400)}})""")
    off = sum(1 for x in v if x == 0) / len(v); on = sum(1 for x in v if x == 1) / len(v)
    if not .3 <= off <= .5: out.append(f"gap dots are fully off {off:.0%} of the time, expected about 40% (0.8 s of 2 s)")
    if on < .5: out.append(f"gap dots are fully on only {on:.0%} of the time, expected about 60%")
    if any(0 < x < 1 for x in v): out.append("gap dots show a partial opacity: it must be a clean on/off")
    pg.emulate_media(reduced_motion="reduce"); pg.wait_for_timeout(300)
    rm = pg.evaluate(f"(()=>{{const c=getComputedStyle(document.querySelector('{sel}'));return [c.animationName,c.opacity]}})()")
    if rm != ["none", "1"]: out.append(f"with reduced motion the gap dots should be static and visible, got {rm}")
    pg.emulate_media(reduced_motion="no-preference"); pg.wait_for_timeout(200)
    return out

def settle(pg):
    # wait until the map has stopped moving: a slow runner would otherwise be measured mid-pan
    prev = None
    for _ in range(40):
        cur = pg.evaluate("JSON.stringify([...document.querySelectorAll('#map .leaflet-map-pane,#map .leaflet-marker-icon,#map .leaflet-tooltip')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)]}))")
        if cur == prev: break
        prev = cur; pg.wait_for_timeout(500)
    pg.wait_for_timeout(800)

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
        # run with the local font and with a wider fallback font: the CI runner has different system fonts
        sizes = [(1440, 900), (1280, 900), (1024, 800), (800, 800), (720, 800), (390, 844)]
        for (w, h), font in [(sz, f) for sz in sizes for f in (None, "DejaVu Sans", "Liberation Sans")]:
            pg = br.new_page(viewport={"width": w, "height": h})
            if font:
                pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='body,button,input,select{font-family:\"%s\",sans-serif!important}';document.head.appendChild(s)})" % font)
            tag = f"{w}px" + (f" {font}" if font else "")
            pg.goto(url, wait_until="load", timeout=60000)
            pg.wait_for_selector("#shmap svg", timeout=30000)
            pg.wait_for_selector(".chap", timeout=30000)
            pg.wait_for_timeout(2500)
            r = pg.evaluate(SHUTTLE_JS, PAD); checked += 3
            probs += [f"[{tag}] shuttle map: {x}" for x in r]
            m = pg.evaluate(PLC_SH_JS, PAD); checked += m["n"]
            probs += [f"[{tag}] shuttle map place names: {x}" for x in m["out"]]
            if w in (1280, 390) and not {"Russia", "China"} <= set(m["names"]): probs.append(f"[{tag}] shuttle map: expected Russia and China labelled, got {m['names']}")
            if pg.evaluate("document.documentElement.scrollWidth") > w + 2:
                probs.append(f"[{tag}] page is wider than the screen")
            if w in (1280, 390) and "--quick" not in sys.argv:
                pg.evaluate("document.querySelectorAll('.chap')[0].click()"); pg.wait_for_timeout(3500); settle(pg)
                m = pg.evaluate(MAP_JS, PAD); checked += m["n"]
                probs += [f"[{tag}] chapter 1 map: {x}" for x in m["out"]]
                if m["n"] < 3: probs.append(f"[{tag}] chapter 1: expected the three count labels, found {m['n']}")
                pg.evaluate("document.querySelectorAll('#modes button')[1].click()"); pg.wait_for_timeout(3500); settle(pg)
                m = pg.evaluate(MAP_JS, PAD); checked += m["n"]
                probs += [f"[{tag}] explore map: {x}" for x in m["out"]]
                pg.evaluate("document.querySelectorAll('#modes button')[0].click()"); pg.wait_for_timeout(1500)
                # place names on every map: chapter 1 (already on screen), explore, raw, then chapters 2-6 (swap, hub, dark, classes)
                def plc(label, js=PLC_MAP_JS):
                    nonlocal checked
                    m = pg.evaluate(js, PAD); checked += m["n"]
                    probs.extend(f"[{tag}] {label} place names: {x}" for x in m["out"])
                    return m
                pg.evaluate("document.querySelectorAll('.chap')[0].click()"); pg.wait_for_timeout(3500); settle(pg); pg.wait_for_timeout(500)
                m = plc("chapter 1")
                if m["n"] < 2 or "Russia" not in m["names"] or (w > 700 and "China" not in m["names"]): probs.append(f"[{tag}] chapter 1: expected Russia, China and ports labelled, got {m['names']}")
                pg.evaluate("document.querySelectorAll('#modes button')[1].click()"); pg.wait_for_timeout(3500); settle(pg); pg.wait_for_timeout(500)
                plc("explore")
                pg.evaluate("document.getElementById('rawt').click()"); pg.wait_for_timeout(3000); settle(pg); pg.wait_for_timeout(500)
                plc("raw-events")
                pg.evaluate("document.getElementById('rawt').click()"); pg.wait_for_timeout(1500)
                pg.evaluate("document.querySelectorAll('#modes button')[0].click()"); pg.wait_for_timeout(1500)
                for i, k, need in [(1, "swap", ["Malaysia", "Singapore"]), (2, "identity", ["Russia"]), (3, "network", None), (4, "dark", ["Russia"]), (5, "classes", ["Russia", "China"])]:
                    pg.evaluate(f"document.querySelectorAll('.chap')[{i}].click()"); pg.wait_for_timeout(3500); settle(pg); pg.wait_for_timeout(500); checked += 1
                    cur = pg.evaluate("document.querySelector('.chap.on').dataset.ch")
                    if cur != k: probs.append(f"[{tag}] clicked chapter {i + 1} but '{cur}' is showing"); continue
                    if k == "network":
                        r = pg.evaluate(HUB_JS); checked += 10
                        probs += [f"[{tag}] chapter 4 hub: {x}" for x in r]
                        if pg.evaluate("getComputedStyle(document.getElementById('map')).display") != "none": probs.append(f"[{tag}] chapter 4 still shows the old map")
                        continue
                    m = plc(f"chapter {i + 1} ({k})")
                    for nme in need:
                        if nme not in m["names"] and not (nme == "Russia" and w == 390 and k == "swap"): probs.append(f"[{tag}] chapter {i + 1} ({k}): '{nme}' label missing, got {m['names']}")
                    if k == "swap" and not any("oiter" in x for x in m["names"]): probs.append(f"[{tag}] chapter 2: loiter-spot label missing")
                    if k == "dark":
                        pg.evaluate("document.getElementById('map').scrollIntoView()"); pg.wait_for_timeout(800)
                        probs += [f"[{tag}] going dark: {x}" for x in pg.evaluate(BLINK_JS)]
                        probs += [f"[{tag}] going dark: {x}" for x in blink_runtime(pg)]
                        if not pg.evaluate("document.getElementById('map').classList.contains('gapblink')"): probs.append(f"[{tag}] going dark: gapblink class is not set while the chapter shows")
            pg.close()
        br.close()
    srv.shutdown()
    for x in probs: print("OVERLAP:", x)
    print(f"{checked} labels checked; {len(probs)} problem(s).")
    sys.exit(1 if probs else 0)

if __name__ == "__main__":
    main()
