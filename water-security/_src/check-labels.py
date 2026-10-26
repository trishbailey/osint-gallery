#!/usr/bin/env python3
"""Check water-security map labels and save screenshots.

Fails if any country, river, dam, or hover/tap label overlaps a river line,
river-corridor glow, arrow, or dam marker at 390, 1024, 1280, or 1440.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/water-security/"
OUT = Path("/opt/cursor/artifacts/screenshots")
WIDTHS = [(390, 844), (1024, 800), (1280, 900), (1440, 900)]

AUDIT = r"""
() => {
  function distPointSeg(px,py,x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1, l2=dx*dx+dy*dy;
    let t=l2?((px-x1)*dx+(py-y1)*dy)/l2:0;
    t=Math.max(0,Math.min(1,t));
    return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
  }
  function distPointRect(px,py,bx){
    const dx=px<bx.x?bx.x-px:px>bx.x+bx.w?px-(bx.x+bx.w):0;
    const dy=py<bx.y?bx.y-py:py>bx.y+bx.h?py-(bx.y+bx.h):0;
    return Math.hypot(dx,dy);
  }
  function distSegRect(x1,y1,x2,y2,bx){
    const minx=bx.x, miny=bx.y, maxx=bx.x+bx.w, maxy=bx.y+bx.h;
    let t0=0,t1=1,dx=x2-x1,dy=y2-y1,hit=true;
    const p=[-dx,dx,-dy,dy], q=[x1-minx,maxx-x1,y1-miny,maxy-y1];
    for(let i=0;i<4 && hit;i++){
      if(Math.abs(p[i])<1e-9){ if(q[i]<0) hit=false; }
      else { const tt=q[i]/p[i]; if(p[i]<0){ if(tt>t1) hit=false; else if(tt>t0) t0=tt; } else { if(tt<t0) hit=false; else if(tt<t1) t1=tt; } }
    }
    if(hit && t0<=t1) return 0;
    return Math.min(distPointRect(x1,y1,bx), distPointRect(x2,y2,bx),
      distPointSeg(minx,miny,x1,y1,x2,y2), distPointSeg(maxx,miny,x1,y1,x2,y2),
      distPointSeg(minx,maxy,x1,y1,x2,y2), distPointSeg(maxx,maxy,x1,y1,x2,y2));
  }
  function segsOf(el){
    const tf=el.getAttribute('transform')||'';
    const m=/translate\(\s*([-0-9.eE+]+)[ ,]\s*([-0-9.eE+]+)\s*\)/.exec(tf);
    const tx=m?+m[1]:0, ty=m?+m[2]:0;
    const d=el.getAttribute('d')||'';
    const nums=d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[];
    const pts=[];
    for(let i=0;i+1<nums.length;i+=2){
      const x=+nums[i]+tx, y=+nums[i+1]+ty;
      if(isFinite(x)&&isFinite(y)) pts.push([x,y]);
    }
    const segs=[];
    for(let i=1;i<pts.length;i++) segs.push([pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]]);
    if(/[zZ]/.test(d) && pts.length>2) segs.push([pts[pts.length-1][0],pts[pts.length-1][1],pts[0][0],pts[0][1]]);
    return {pts, segs};
  }
  function polyHas(pts,x,y){
    let c=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i][0], yi=pts[i][1], xj=pts[j][0], yj=pts[j][1];
      if(((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi)) c=!c;
    }
    return c;
  }
  const cache=new Map();
  function obstacles(svg){
    if(cache.has(svg)) return cache.get(svg);
    const items=[];
    svg.querySelectorAll('path.core, path.glow').forEach(el=>{
      const g=segsOf(el);
      items.push({kind:el.classList.contains('glow')?'glow':'river', sw:(+el.getAttribute('stroke-width')||0)/2, segs:g.segs, pts:null});
    });
    svg.querySelectorAll('g.lay-cut path, g.lay-threat path, g.lay-neither path').forEach(el=>{
      const g=segsOf(el);
      items.push({kind:'arrow', sw:(+el.getAttribute('stroke-width')||0)/2, segs:g.segs, pts:g.pts});
    });
    svg.querySelectorAll('path[data-ink="dam"]').forEach(el=>{
      const g=segsOf(el);
      items.push({kind:'dam', sw:(+el.getAttribute('stroke-width')||0)/2, segs:g.segs, pts:g.pts});
    });
    svg.querySelectorAll('circle[data-ink="arrow"]').forEach(el=>{
      items.push({kind:'arrow-dot', circle:[+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('r')||0]});
    });
    cache.set(svg, items);
    return items;
  }
  function boxHits(svg, bx){
    if(!(bx.w>0.5 && bx.h>0.5)) return null;
    for(const it of obstacles(svg)){
      if(it.circle){
        const [cx,cy,r]=it.circle;
        if(distPointRect(cx,cy,bx) <= r+0.05) return it.kind;
      } else {
        for(const s of it.segs) if(distSegRect(s[0],s[1],s[2],s[3],bx) <= it.sw+0.05) return it.kind;
        if(it.pts && it.pts.length>=3){
          const x=bx.x+bx.w/2, y=bx.y+bx.h/2;
          if(polyHas(it.pts,x,y)) return it.kind;
          for(const [px,py] of [[bx.x,bx.y],[bx.x+bx.w,bx.y],[bx.x,bx.y+bx.h],[bx.x+bx.w,bx.y+bx.h]])
            if(polyHas(it.pts,px,py)) return it.kind;
        }
      }
    }
    return null;
  }
  function mapName(svg){
    const reg=svg.closest('.region');
    const h=reg && reg.querySelector('h3');
    if(h) return h.textContent.trim().slice(0,40);
    return svg.closest('#panel') ? 'panel' : 'map';
  }
  function visibleMaps(){
    return [...document.querySelectorAll('#regions svg.chart, #panel svg.chart')].filter(svg=>{
      const r=svg.getBoundingClientRect();
      return r.width>20 && r.height>20 && svg.querySelector('path.core, path.glow, path[data-ink="dam"], g.lay-cut, g.lay-threat, g.lay-neither');
    });
  }
  const labelHits=[];
  const styleBad=[];
  let nLabels=0;
  for(const svg of visibleMaps()){
    const region=mapName(svg);
    for(const t of svg.querySelectorAll('text')){
      const text=t.textContent.replace(/\s+/g,' ').trim();
      if(!text) continue;
      nLabels++;
      const b=t.getBBox();
      const bx={x:b.x,y:b.y,w:b.width,h:b.height};
      const cs=getComputedStyle(t);
      const fs=parseFloat(cs.fontSize);
      const stroke=t.getAttribute('stroke');
      if(!(fs>=12.5) || (stroke && stroke!=='none'))
        styleBad.push({region, text:text.slice(0,60), fs, stroke, fill:cs.fill});
      const kind=boxHits(svg, bx);
      if(kind) labelHits.push({region, text:text.slice(0,70), kind, fs, fill:cs.fill, stroke});
    }
  }
  function tipBox(svg){
    const tt=document.getElementById('tt');
    if(!tt || getComputedStyle(tt).display==='none') return null;
    const rect=tt.getBoundingClientRect();
    const sr=svg.getBoundingClientRect();
    if(rect.right<sr.left || rect.left>sr.right || rect.bottom<sr.top || rect.top>sr.bottom) return null;
    const ctm=svg.getScreenCTM();
    if(!ctm) return null;
    const inv=ctm.inverse(), pt=svg.createSVGPoint();
    const to=(px,py)=>{pt.x=px;pt.y=py; return pt.matrixTransform(inv);};
    const a=to(Math.max(rect.left,sr.left), Math.max(rect.top,sr.top));
    const b=to(Math.min(rect.right,sr.right), Math.min(rect.bottom,sr.bottom));
    return {x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), w:Math.abs(b.x-a.x), h:Math.abs(b.y-a.y), text:(tt.innerText||'').replace(/\s+/g,' ').trim().slice(0,80)};
  }
  const tipHits=[];
  let nTips=0, nHidden=0;
  const phone=matchMedia('(max-width:900px)').matches;
  function fire(el,x,y,what,click){
    const ev=click?'click':'mousemove';
    el.dispatchEvent(new MouseEvent(ev,{bubbles:true,clientX:x,clientY:y,view:window}));
    const tt=document.getElementById('tt');
    const shown=tt && getComputedStyle(tt).display!=='none';
    if(!shown){ nHidden++; return; }
    nTips++;
    const text=(tt.innerText||'').replace(/\s+/g,' ').trim().slice(0,80);
    for(const svg of visibleMaps()){
      const bx=tipBox(svg);
      if(!bx) continue;
      const kind=boxHits(svg, bx);
      if(kind) tipHits.push({region:mapName(svg), what, text, kind, at:[Math.round(x),Math.round(y)]});
    }
    if(click){
      const back=document.getElementById('sheet-back');
      if(back) back.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    } else {
      el.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true,clientX:x,clientY:y,view:window}));
    }
  }
  for(const svg of visibleMaps()){
    svg.querySelectorAll('g.cue').forEach(g=>{
      const r=g.getBoundingClientRect();
      if(r.width<2||r.height<2) return;
      const x=Math.min(innerWidth-2, Math.max(2, r.left+Math.min(r.width/2, 18)));
      const y=Math.min(innerHeight-2, Math.max(2, r.top+Math.min(r.height/2, 18)));
      if(r.bottom<0 || r.top>innerHeight || r.right<0 || r.left>innerWidth) return;
      fire(g,x,y,'hover',false);
      if(phone && g.classList.contains('lay-dam')) fire(g,x,y,'tap',true);
    });
    svg.querySelectorAll('g.lay-cut, g.lay-threat, g.lay-neither').forEach(g=>{
      const path=g.querySelector('path[data-ink="arrow"]')||g.querySelector('path');
      if(!path) return;
      let len=0; try{ len=path.getTotalLength(); }catch(e){ len=0; }
      const n=len>8?4:2;
      for(let i=0;i<n;i++){
        let x,y;
        if(len>8){
          const p=path.getPointAtLength(len*(i+0.5)/n);
          const ctm=path.getScreenCTM(); if(!ctm) continue;
          const pt=svg.createSVGPoint(); pt.x=p.x; pt.y=p.y;
          const s=pt.matrixTransform(ctm); x=s.x; y=s.y;
        } else {
          const r=g.getBoundingClientRect();
          x=r.left+r.width*(i+1)/(n+1); y=r.top+r.height/2;
        }
        if(x<0||y<0||x>innerWidth||y>innerHeight) continue;
        fire(g,x,y,'arrow',false);
      }
    });
    svg.querySelectorAll('path.basin').forEach(path=>{
      const r=path.getBoundingClientRect();
      if(r.width<8 || r.bottom<0 || r.top>innerHeight) return;
      const pts=[[r.left+r.width/2, r.top+r.height/2]];
      for(const [x,y] of pts){
        if(x>0&&y>0&&x<innerWidth&&y<innerHeight) fire(path,x,y,'basin',false);
      }
    });
  }
  return {
    labelHits, tipHits, styleBad, nLabels, nTips, nHidden,
    scroll:[document.documentElement.scrollWidth, document.documentElement.clientWidth],
    errs: window.__errs||[]
  };
}
"""


def audit(page):
    return page.evaluate(AUDIT)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    shots = []
    failures = []
    summary = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        for width, height in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.add_init_script(
                "window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));"
            )
            page.goto(URL, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_selector("#regions svg.chart text", timeout=60000)
            names = page.evaluate(
                "()=>[...document.querySelectorAll('#side-regions button')].map(b=>b.textContent)"
            )
            width_hits = []
            for i, name in enumerate(names):
                page.evaluate(
                    "(i)=>document.querySelectorAll('#side-regions button')[i].click()", i
                )
                page.wait_for_timeout(180)
                page.evaluate(
                    """()=>{const svg=[...document.querySelectorAll('#regions svg.chart')].find(s=>s.getBoundingClientRect().width>20); if(svg) svg.scrollIntoView({block:'center'});}"""
                )
                page.wait_for_timeout(80)
                data = audit(page)
                for hit in data["labelHits"] + data["tipHits"] + data["styleBad"]:
                    hit = dict(hit)
                    hit["width"] = width
                    hit["tab"] = name
                    width_hits.append(hit)
                if data["errs"]:
                    width_hits.append({"width": width, "tab": name, "js": data["errs"][:3]})
                if width == 390 and data["scroll"][0] - data["scroll"][1] > 4:
                    width_hits.append({"width": 390, "tab": name, "overflow": data["scroll"]})
            summary.append(
                f"{width}: labels+tips checked, overlaps={sum(1 for h in width_hits if h.get('kind'))}, other={len(width_hits)}"
            )
            failures.extend(width_hits)

            def shot(region_index, filename):
                page.evaluate(
                    "(i)=>document.querySelectorAll('#side-regions button')[i].click()",
                    region_index,
                )
                page.wait_for_timeout(200)
                page.evaluate(
                    "()=>{const b=document.getElementById('sheet-back'); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true}));}"
                )
                loc = page.locator("#regions .region").nth(region_index).locator("svg.chart").first
                loc.scroll_into_view_if_needed()
                path = OUT / filename
                loc.screenshot(path=str(path))
                shots.append(str(path))

            if width in (390, 1024, 1280, 1440):
                shot(0, f"labels-{width}-nile.png")
            if width == 1280:
                shot(1, "labels-1280-middle-east.png")
                page.evaluate("(i)=>document.querySelectorAll('#side-regions button')[i].click()", 0)
                page.wait_for_timeout(200)
                tip = page.evaluate(
                    """()=>{
                      const svg=[...document.querySelectorAll('#regions svg.chart')].find(s=>s.getBoundingClientRect().width>20);
                      let g=null;
                      for (const el of svg.querySelectorAll('g.lay-dam')) {
                        const r=el.getBoundingClientRect();
                        el.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+14,clientY:r.top+14,view:window}));
                        const tt=document.getElementById('tt');
                        if(tt && /Renaissance/.test(tt.innerText||'')) { g=el; break; }
                      }
                      if(!g) return {shown:false};
                      g.scrollIntoView({block:'center'});
                      const r=g.getBoundingClientRect();
                      g.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+14,clientY:r.top+14,view:window}));
                      const tt=document.getElementById('tt');
                      const b=tt.getBoundingClientRect();
                      return {shown:getComputedStyle(tt).display!=='none', text:(tt.innerText||'').slice(0,60), top:b.top, left:b.left};
                    }"""
                )
                if not tip.get("shown"):
                    failures.append({"width": 1280, "tab": "Nile & North Africa", "tip": "GERD hover did not show"})
                path = OUT / "labels-1280-nile-tip.png"
                page.screenshot(path=str(path), full_page=False)
                shots.append(str(path))
            page.close()
        browser.close()
    print("LABEL CHECK")
    for line in summary:
        print(" ", line)
    if failures:
        print(f"FAIL {len(failures)}")
        for hit in failures[:40]:
            print(" ", hit)
        return 1
    print("PASS no label overlaps a river, glow, arrow, or dam")
    for s in shots:
        print(" screenshot", s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
