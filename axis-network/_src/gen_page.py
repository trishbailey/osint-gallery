import os
"""Builds axis-network/index.html from ../data.json (run build_data.py first). Static, $0, one GA tag."""
import json, os, html
H=os.path.dirname(os.path.abspath(__file__)); D=json.load(open(os.path.join(H,'..','data.json')))
G={'houthi':['Houthis (Ansar Allah)','#b24762'],'irgc':['IRGC and Iranian state','#6e9a52'],'hezbollah':['Hezbollah','#c9a75a'],
   'hamas':['Hamas and allied media','#3f9c96'],'iraqi':['Iraqi militias','#4379a8'],'aligned':['Pro-Axis news outlets','#8e65b8'],'pij':['Palestinian Islamic Jihad (PIJ)','#b36a34']}
TC=['#b24762','#3f9c96','#c9a75a','#b36a34','#4379a8']
f=lambda n:f'{n:,}'
from datetime import date
def rng(s,days=7):
    from datetime import timedelta
    y,m,d=map(int,s.split('-'));b=date(y,m,d);a=b-timedelta(days=days-1)
    if a.year!=b.year: return f"{a:%b %-d, %Y}–{b:%b %-d, %Y}"
    if a.month!=b.month: return f"{a:%b %-d}–{b:%b %-d}, {b.year}"
    return f"{a:%b %-d}–{b.day}, {b.year}"
def nice(s): y,m,d=map(int,s.split('-')); return date(y,m,d).strftime('%b %-d, %Y')
c=D['collection']; x30=D['xcopies30']; ao=D['allorigin30']; tot=D['allcopies30']; o=D['origin30']; w=D['week']; p=D['pay']; th=D['themes']
hpct=round(100*ao['houthi']/tot); topx=max(o,key=o.get); hx=round(100*o['houthi']/x30); tx=round(100*o[topx]/x30)
armed=max((g for g in o if g!='aligned'),key=o.get)
wchg=round(100*(w['xcopies']-w['prev_weekly'])/w['prev_weekly']); hw=w['origin'].get('houthi',0); hpw=w['prev_origin'].get('houthi',0)
hwchg=round(100*(hw-hpw)/hpw) if hpw else 0
sg=lambda n:('+' if n>=0 else '')+str(n)
def fn(n): return f'<sup><a href="#src" class="fn" onclick="openSrc()">{n}</a></sup>'
def nw(word,*ns): return f'<span class="nw">{word}{"".join(fn(n) for n in ns)}</span>'
# caption sentences (all numbers from data.json)
cap1=(f'Houthi channels start {hpct}% of all copied messages ({f(ao["houthi"])} of {f(tot)}), mostly passed between their own channels. '
      f'Across groups, {"pro-Axis news outlets (mainly Al Mayadeen)" if topx=="aligned" else G[topx][0]} are the biggest source ({tx}% of {f(x30)} cross-group copies), '
      f'and Houthis lead among the armed groups ({hx}%), feeding the IRGC, Hezbollah and the Iraqi militias {nw("most",1)}.')
cap2=(f'{p["channels"]} channels posted {p["selectors"]} payment methods. None is shared between two groups, but {p["shared"]} are reposted by 2 to {p["max_channels"]} channels of the same {nw("group",2)}.')
TOP={g:th['cats'][max(range(5),key=lambda i:v[i])] for g,v in th['by_group'].items()}
cap3=(f'Each group keeps its own focus: Houthis on the {TOP["houthi"]} ({th["by_group"]["houthi"][0]:.0f}%), Hamas on Palestine ({th["by_group"]["hamas"][1]:.0f}%) and the IRGC on the Iran–Israel–US standoff ({th["by_group"]["irgc"][2]:.0f}%{nw(")",3)}.')
cap3=cap3.replace('%<span class="nw">)','%)<span class="nw">').replace(f'{nw(")",3)}',f'){fn(3)}') 
gl=lambda g:G[g][0]
chips=[(f'{f(w["xcopies"])}','cross-group copies in the last 7 days',f'{sg(wchg)}% vs the weekly average of the 3 weeks before'),
 (f'{f(hw)}','of them started on Houthi channels',f'{sg(hwchg)}% vs the earlier weekly average'),
 (f'{f(w["top_pairs"][0][2])}',f'{gl(w["top_pairs"][0][0])} → {gl(w["top_pairs"][0][1])}','the busiest route this week')]
SRC=[f'Cross-group copies: identical message text (60+ characters after cleaning) posted by channels of two different groups, first post = origin. {f(c["posts"])} public Telegram posts from {c["channels"]} channels, {nice(c["start"])} to {nice(c["end"])}; main window {nice(D["window_start"])} to {nice(D["data_through"])}. Biggest cross-group source channels: '+', '.join(f'@{h} ({f(n)})' for h,_,n in D['topsrc30'])+'.',
 f'Payment methods (bank cards, bank accounts, donation phone numbers, named campaigns and crypto wallets) found in posts from {p["first"]} to {p["last"]}. Only {p["in_window"]} of {p["edges"]} postings fall inside the 30-day window, so this chart uses the whole payment collection.',
 f'Themes: {f(th["coded"])} Telegram posts sorted into topics by AI using a written codebook; a second independent check agreed 85.5% of the time. Five topics shown (Iran–Israel–US standoff includes Israeli strikes outside Palestine; home and world news includes domestic politics and security).',
 'Channel group labels follow the channels’ own branding and published reporting. Sadaa al-Masirah (@sadaa_almasirah) is the largest single Houthi source.']
GA='''<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z61EKRP8QV"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Z61EKRP8QV');</script>'''
CSS='''
:root{--bg:#0b1526;--panel:#12203a;--panel2:#0f1b31;--line:#24365a;--text:#e6e9ef;--muted:#9aa6b8;--gold:#c8a24a;--red:#c0504d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:22px 18px 40px}a{color:var(--gold)}
h1{font-size:30px;margin:0 0 6px}h2{font-size:21px;margin:0 0 4px}.intro{font-size:16.5px;margin:0 0 6px;max-width:820px}.thru{font-size:14px;color:var(--gold);font-weight:600}
.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.st{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--gold);border-radius:10px;padding:10px 14px}.st b{display:block;font-size:26px;line-height:1.15}.st span{font-size:14px;color:var(--muted)}
section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:14px 0}
.cap{font-size:15px;margin:10px 0 0}.prompt{font-size:14px;color:var(--muted);margin:0 0 8px}
.row{display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:start}.leg{display:flex;flex-direction:column;gap:6px;font-size:14px}.leg span{display:flex;align-items:center;gap:7px}.leg i{width:13px;height:13px;border-radius:3px;flex:none}
.sbar{display:flex;height:34px;border-radius:6px;overflow:hidden;margin:4px 0 12px}.sbar i{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:14px;color:#0b1526;cursor:pointer;min-width:2px}
.lbl{font-size:14px;margin:4px 0 2px;font-weight:600}
.btn{min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font-size:15px;cursor:pointer}.btn[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}
.tb{display:grid;grid-template-columns:200px 1fr;gap:10px;align-items:center;margin:7px 0}.tb .gn{font-size:14px;font-weight:600;display:flex;gap:7px;align-items:center}.tb .gn i{width:12px;height:12px;border-radius:50%;flex:none}
.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.chip{background:var(--panel2);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:10px 12px}.chip b{font-size:24px;display:block}.chip span{font-size:14px;display:block}.chip em{font-style:normal;font-size:14px;color:var(--gold)}
details{background:var(--panel);border:1px solid var(--line);border-radius:12px;margin:14px 0}summary{cursor:pointer;padding:14px 18px;font-weight:700;font-size:17px;min-height:44px}details .in{padding:0 18px 14px;font-size:15px}
#src ol{font-size:13px;color:var(--muted);padding-left:20px}#src li{margin:4px 0}.nw{white-space:nowrap}sup a{text-decoration:none;font-size:12px;padding:0 1px}
#tip{position:fixed;display:none;background:var(--panel2);border:1px solid var(--gold);border-radius:8px;padding:8px 11px;font-size:14px;z-index:20;max-width:270px;pointer-events:none}
#sheet{visibility:hidden;position:fixed;left:0;right:0;bottom:0;background:var(--panel2);border-top:2px solid var(--gold);border-radius:14px 14px 0 0;padding:14px 18px 22px;font-size:15px;z-index:30;transform:translateY(110%);transition:transform .2s}#sheet.on{transform:none;visibility:visible}#sheet button{float:right}
svg text{font-family:inherit}
#pdd{background:var(--panel2);margin:12px 0 0}.pf{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 8px}.pf label{display:flex;flex-direction:column;font-size:13px;gap:3px}.pf .ps{flex:1;min-width:180px}
.pf select,.pf input{min-height:44px;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font:inherit;font-size:15px;width:100%}
.pr{border:1px solid var(--line);border-radius:8px;margin:6px 0;background:var(--panel)}.pr summary{font-size:14.5px;font-weight:400;padding:10px 12px;display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere;word-break:break-all;font-size:14.5px}.pr .pt{font-size:13px;color:var(--gold)}.pr .pm{font-size:13px;text-align:right}.pr .pb{padding:0 12px 10px;font-size:14px}.pr .pb a{overflow-wrap:anywhere}.pr ul{margin:4px 0;padding-left:18px}
.lgb{display:flex;align-items:center;gap:7px;background:none;border:1px solid transparent;border-radius:8px;color:var(--text);font:inherit;font-size:14px;padding:6px 8px;min-height:36px;cursor:pointer;text-align:left}.lgb i{width:13px;height:13px;border-radius:3px;flex:none}.lgb[aria-pressed=true]{border-color:var(--gold)}.lgb:focus-visible,.node:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.node{cursor:pointer}#fsel{background:var(--panel2);border:1px solid var(--gold);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14.5px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}#fsel[hidden]{display:none}#fsel .btn{flex:none}
@media(max-width:700px){main{padding:14px 12px 30px}h1{font-size:24px}.intro{font-size:15.5px}.strip{gap:6px}.st{padding:8px}.st b{font-size:19px}.st span{font-size:13px}
 section{padding:12px}.row{grid-template-columns:1fr;gap:8px}.leg{flex-direction:row;flex-wrap:wrap;gap:6px 12px;font-size:13px}.tb{grid-template-columns:1fr;gap:2px;margin:8px 0}
 .chips{grid-template-columns:1fr;gap:6px}.chip{display:grid;grid-template-columns:auto 1fr;gap:0 10px;align-items:center}.chip b{grid-row:span 2;font-size:21px}.cap{font-size:14.5px}}
'''
def sbar(parts,total,cls=''):  # parts: [(label,value,color,tip)]
    return '<div class="sbar">'+''.join(f'<i style="flex:{v};background:{col}" tabindex="0" data-tip="{html.escape(tip)}">{round(100*v/total) if 100*v/total>=9 else ""}{"%" if 100*v/total>=9 else ""}</i>' for l,v,col,tip in parts if v)+'</div>'
order=sorted(G,key=lambda g:-ao.get(g,0))
s1bar=sbar([(gl(g),ao[g],G[g][1],f'<b>{gl(g)}</b><br>start {f(ao[g])} copied messages ({100*ao[g]/tot:.1f}%)') for g in order if ao[g]],tot)
leg1=''.join(f'<button type="button" class="lgb" data-g="{g}" aria-pressed="false"><i style="background:{G[g][1]}"></i>{gl(g)}</button>' for g in ['houthi','hamas','iraqi','aligned','hezbollah','irgc','pij'])
# payments: stacked bars per type (shared vs single)
pb=''
mx=max(t[1] for t in p['by_type'])
for t,n,sh in p['by_type']:
    pb+=f'<div class="tb"><div class="gn">{t}</div><div style="display:flex;align-items:center;gap:8px"><div class="sbar" style="margin:0;height:28px;width:{100*n/mx:.1f}%">'+(f'<i style="flex:{sh};background:#c9a75a" tabindex="0" data-tip="<b>{t}</b><br>{sh} of {n} posted by 2 or more channels"></i>' if sh else '')+(f'<i style="flex:{n-sh};background:#3f9c96" tabindex="0" data-tip="<b>{t}</b><br>{n-sh} of {n} posted by one channel only"></i>' if n-sh else '')+f'</div><b style="font-size:15px">{n}</b></div></div>'
leg2='<span><i style="background:#c9a75a"></i>Posted by 2+ channels</span><span><i style="background:#3f9c96"></i>One channel only</span>'
pg=', '.join(f'{gl(g)} {n}' for g,n in p['by_group'].items())
# themes
tb=''
for g in ['houthi','irgc','hezbollah','hamas','iraqi','aligned','pij']:
    v=th['by_group'][g]; tb+=f'<div class="tb"><div class="gn"><i style="background:{G[g][1]}"></i>{gl(g)}</div>'+sbar([(th['cats'][i],v[i],TC[i],f'<b>{gl(g)}</b><br>{th["cats"][i]}: {v[i]:.0f}% of posts') for i in range(5)],sum(v))+'</div>'
tb=tb.replace('margin:4px 0 12px','')
leg3=''.join(f'<span><i style="background:{TC[i]}"></i>{l}</span>' for i,l in enumerate(th['cats']))
chiph=''.join(f'<div class="chip"><b>{a}</b><span>{b}</span><em>{e}</em></div>' for a,b,e in chips)
infra=f'{D["infra"]["sites"]} websites promoted by the channels were mapped to their servers. Only one link crosses groups: almoqawma.com, posted by both Hamas and Hezbollah channels, shared server addresses with the IRGC-linked pgsa.ir. Everything else stays inside one group.'
DATA=json.dumps(dict(MAP=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'basemap.json'))),BG=D['by_group'],PL=D['paylist'],G={k:v for k,v in G.items()},f30=D['flow30'],f7=D['flow7']),ensure_ascii=False)
JS='''
const D=__D__,TIP=document.getElementById('tip'),SH=document.getElementById('sheet');
const ph=()=>innerWidth<700;
function show(el,ev){const h=el.dataset.tip;if(!h)return;if(ph()){SH.querySelector('div').innerHTML=h;SH.classList.add('on');TIP.style.display='none';return}
 TIP.innerHTML=h;TIP.style.display='block';const r=el.getBoundingClientRect();let x=(ev&&ev.clientX||r.left)+14;if(x+TIP.offsetWidth>innerWidth-8)x=innerWidth-TIP.offsetWidth-8;TIP.style.left=x+'px';TIP.style.top=Math.max(8,r.top-TIP.offsetHeight-8)+'px'}
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(t&&!ph())show(t,e);else TIP.style.display='none'});
document.addEventListener('click',e=>{const t=e.target.closest('[data-tip]');if(t)show(t,e)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const t=e.target.closest('[data-tip]');if(t)show(t)}if(e.key==='Escape')SH.classList.remove('on')});
SH.querySelector('button').onclick=()=>SH.classList.remove('on');
function openSrc(){document.getElementById('more').open=true}
const NS='http://www.w3.org/2000/svg';
function el(n,a,p){const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e}
let mode='f30';
function flow(){const box=document.getElementById('flow');box.innerHTML='';const W=box.clientWidth,P=D[mode].filter(r=>r[2]>=10);
 const L=ph()?118:250,R=ph()?118:250,gap=10,nw=12,tot=P.reduce((a,r)=>a+r[2],0);
 const so={},ta={};P.forEach(r=>{so[r[0]]=(so[r[0]]||0)+r[2];ta[r[1]]=(ta[r[1]]||0)+r[2]});
 const sk=Object.keys(so).sort((a,b)=>so[b]-so[a]),tk=Object.keys(ta).sort((a,b)=>ta[b]-ta[a]);
 const Hh=ph()?520:540,k=(Hh-gap*Math.max(sk.length,tk.length))/tot;
 const svg=el('svg',{width:W,height:Hh+(ph()?70:40)+14,role:'img','aria-label':'Flow of copied messages from the group that posted first (left) to the group that copied (right)'},box);
 const x0=L,x1=W-R,df=el('defs',{},svg);
 const mk=el('marker',{id:'fa',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'},df);el('path',{d:'M0,0L10,5L0,10Z',fill:'#c8a24a'},mk);
 el('text',{x:x0+nw,y:18,fill:'#e6e9ef','font-size':ph()?13:15,'font-weight':700,'text-anchor':'end'},svg).textContent='Posted first';
 el('text',{x:x1-nw,y:18,fill:'#e6e9ef','font-size':ph()?13:15,'font-weight':700},svg).textContent='Copied by';
 el('line',{x1:x0+nw+8,y1:13,x2:x1-nw-8,y2:13,stroke:'#c8a24a','stroke-width':2,'marker-end':'url(#fa)'},svg);
 if(!ph()){const mt=el('text',{x:(x0+x1)/2,y:30,fill:'#c8a24a','font-size':13,'text-anchor':'middle'},svg);mt.textContent='messages flow left to right'}
 const ys={},yt={};let y=44;sk.forEach(g=>{ys[g]=y;y+=so[g]*k+gap});y=44;tk.forEach(g=>{yt[g]=y;y+=ta[g]*k+gap});
 const os={...ys},ot={...yt},lg=el('g',{},svg);
 Object.keys(D.G).forEach(g=>{const lgd=el('linearGradient',{id:'fg_'+g,gradientUnits:'userSpaceOnUse',x1:x0,x2:x1,y1:0,y2:0},df);el('stop',{offset:0,'stop-color':D.G[g][1],'stop-opacity':.75},lgd);el('stop',{offset:1,'stop-color':D.G[g][1],'stop-opacity':.28},lgd)});
 P.forEach(r=>{const h=r[2]*k,a=os[r[0]],b=ot[r[1]];os[r[0]]+=h;ot[r[1]]+=h;const m=(x0+x1)/2;
  const pth=el('path',{d:`M${x0+nw},${a}C${m},${a} ${m},${b} ${x1-nw},${b}L${x1-nw},${b+h}C${m},${b+h} ${m},${a+h} ${x0+nw},${a+h}Z`,fill:`url(#fg_${r[0]})`,'fill-opacity':1,stroke:D.G[r[0]][1],'stroke-opacity':.55,'stroke-width':.5,tabindex:0},lg);
  pth.dataset.tip=`<b style="color:${D.G[r[0]][1]}">${D.G[r[0]][0]}</b> → <b style="color:${D.G[r[1]][1]}">${D.G[r[1]][0]}</b><br>${r[2].toLocaleString()} messages copied`;
  pth.dataset.s=r[0];pth.dataset.t=r[1];pth.addEventListener('mouseenter',()=>{lg.querySelectorAll('path').forEach(q=>q.setAttribute('fill-opacity',q===pth?1:.15))});pth.addEventListener('mouseleave',applySel)});
 const short=g=>ph()?{houthi:'Houthis',irgc:'IRGC / Iran',hezbollah:'Hezbollah',hamas:'Hamas',iraqi:'Iraqi militias',aligned:'Pro-Axis media',pij:'PIJ'}[g]:D.G[g][0];
 const last={};const lab=(g,x,y0,h,v,anchor,tx)=>{const ng=el('g',{class:'node',tabindex:0,role:'button','data-g':g,'aria-label':`Show only ${D.G[g][0]} flows`},svg);ng.addEventListener('click',()=>toggleSel(g));ng.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleSel(g)}});
   el('rect',{x:anchor==='end'?0:x,y:y0-4,width:anchor==='end'?x+nw:W-x,height:Math.max(36,h+8),fill:'#0b1526','fill-opacity':0},ng);el('rect',{x,y:y0,width:nw,height:Math.max(2,h),fill:D.G[g][1]},ng);
   let ly=y0+h/2+(ph()?-2:5);const mg=ph()?32:19;if(last[anchor]!=null&&ly<last[anchor]+mg)ly=last[anchor]+mg;last[anchor]=ly;const t=el('text',{x:tx,y:ly,fill:'#e6e9ef','font-size':ph()?13:14.5,'text-anchor':anchor},ng);t.textContent=short(g)+' ';const s=ph()?el('tspan',{'font-weight':700,fill:D.G[g][1],x:tx,dy:15},t):el('tspan',{'font-weight':700,fill:D.G[g][1]},t);s.textContent=v.toLocaleString()};
 sk.forEach(g=>lab(g,x0,ys[g],so[g]*k,so[g],'end',x0-6));tk.forEach(g=>lab(g,x1-nw,yt[g],ta[g]*k,ta[g],'start',x1+6));
 document.getElementById('ftitle').textContent=mode==='f30'?'last 30 days':'last 7 days';FP=P;applySel()}
let SEL=null,FP=[];
function toggleSel(g){SEL=SEL===g?null:g;applySel()}
function applySel(){const s=SEL,fb=document.getElementById('flow');
 fb.querySelectorAll('path[data-s]').forEach(q=>q.setAttribute('fill-opacity',!s||q.dataset.s===s||q.dataset.t===s?1:.1));
 fb.querySelectorAll('.node').forEach(n=>{n.setAttribute('aria-pressed',n.dataset.g===s);n.style.opacity=!s||n.dataset.g===s||FP.some(r=>(r[0]===s&&r[1]===n.dataset.g)||(r[1]===s&&r[0]===n.dataset.g))?1:.3});
 document.querySelectorAll('.leg [data-g]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.g===s));
 const ro=document.getElementById('fsel');
 if(!s){ro.hidden=true}else{const nm=g=>`<b style="color:${D.G[g][1]}">${D.G[g][0]}</b>`,out=FP.filter(r=>r[0]===s),inn=FP.filter(r=>r[1]===s),sum=a=>a.reduce((x,r)=>x+r[2],0);
  ro.hidden=false;ro.querySelector('div').innerHTML=`${nm(s)}, ${mode==='f30'?'last 30 days':'last 7 days'}<br>`+
  `Posted first, copied by others: <b>${sum(out).toLocaleString()}</b>${out.length?' → '+out.map(r=>`${nm(r[1])} ${r[2].toLocaleString()}`).join(', '):''}<br>`+
  `Copied from others: <b>${sum(inn).toLocaleString()}</b>${inn.length?' ← '+inn.map(r=>`${nm(r[0])} ${r[2].toLocaleString()}`).join(', '):''}`}
 const nt=document.getElementById('net');
 nt.querySelectorAll('path[data-s]').forEach(q=>q.setAttribute('stroke-opacity',!s||q.dataset.s===s||q.dataset.t===s?(s?.85:.42):.06));
 nt.querySelectorAll('circle[data-g]').forEach(c=>c.setAttribute('fill-opacity',!s||c.dataset.g===s||FP.concat(D.f30).some(r=>r[2]>=10&&((r[0]===s&&r[1]===c.dataset.g)||(r[1]===s&&r[0]===c.dataset.g)))?1:.3))}
document.addEventListener('click',e=>{const b=e.target.closest('.leg [data-g]');if(b)toggleSel(b.dataset.g);if(e.target.closest('#fall')){SEL=null;applySel()}});
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{mode=b.dataset.w;document.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b));flow()});

function netmap(){const box=document.getElementById('net');box.innerHTML='';const MP=D.MAP,cw=box.clientWidth,P=ph();
 const vx=P?240:0,vw=P?760:MP.W,vy=P?20:0,vh=P?640:MP.H,u=vw/cw,fs=n=>n*u;
 const pj=(lo,la)=>[MP.W/2+(lo-MP.lonc)*MP.K*MP.S,MP.H-(la-MP.lat0)*MP.S];
 const LOC={irgc:[51.39,35.69,'Tehran'],hezbollah:[35.5,33.89,'Beirut'],iraqi:[44.36,33.31,'Baghdad'],houthi:[44.2,15.35,'Sanaa'],hamas:[33.6,30.6,'Gaza'],pij:[34.3,28.2,'Gaza'],aligned:[P?38.5:27.5,P?24.5:25.5,'pan-regional']};
 const svg=el('svg',{viewBox:`${vx} ${vy} ${vw} ${vh}`,width:'100%',style:'display:block;border-radius:10px;background:#0d1a2e',role:'img','aria-label':'Map of copied messages between groups, last 30 days'},box);
 MP.paths.forEach(d=>el('path',{d,fill:'#16284a',stroke:'#2c4370','stroke-width':.8*u/1.3},svg));
 const pos={};for(const g in LOC)pos[g]=pj(LOC[g][0],LOC[g][1]);
 const E=D.f30.filter(r=>r[2]>=10),mx=Math.max(...E.map(r=>r[2])),eg=el('g',{},svg),dg=el('g',{},svg),parts=[];
 const ctl=(a,b)=>{const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1];return[m[0]-dy*.18,m[1]+dx*.18]};
 const bz=(a,c,b,t)=>[(1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1]];
 E.forEach(([a,b,n])=>{const p0=pos[a],p2=pos[b],p1=ctl(p0,p2);const w=(1.5+11*Math.sqrt(n/mx))*Math.min(u,1.6);
  const pt=el('path',{d:`M${p0} Q${p1} ${p2}`,fill:'none',stroke:D.G[a][1],'stroke-width':w,'stroke-opacity':.42,'stroke-linecap':'round',tabindex:0},eg);
  pt.dataset.s=a;pt.dataset.t=b;pt.dataset.tip=`<b style="color:${D.G[a][1]}">${D.G[a][0]}</b> → <b style="color:${D.G[b][1]}">${D.G[b][0]}</b><br>${n.toLocaleString()} messages copied (30 days)`;
  pt.addEventListener('mouseenter',()=>eg.querySelectorAll('path').forEach(q=>q.setAttribute('stroke-opacity',q===pt?.9:.12)));
  pt.addEventListener('mouseleave',applySel);
  const k=Math.max(1,Math.round(1+6*Math.sqrt(n/mx)));for(let j=0;j<k;j++)parts.push({c:el('circle',{r:2.6*Math.min(u,1.6),fill:'#e6e9ef','fill-opacity':.85},dg),p0,p1,p2,ph:j/k,sp:.05+.08*Math.sqrt(n/mx)})});
 const off={hamas:[-1,0],pij:[-1,0],hezbollah:[0,-1]};
 for(const g in LOC){const[x,y]=pos[g],r=fs(P?11:15),bg=D.BG[g]||{ch:0,posts:0};
  const c=el('circle',{cx:x,cy:y,r,fill:D.G[g][1],stroke:'#0b1526','stroke-width':fs(2.5),tabindex:0},svg);
  c.dataset.g=g;c.addEventListener('click',()=>toggleSel(g));c.dataset.tip=`<b style="color:${D.G[g][1]}">${D.G[g][0]}</b><br>${bg.ch} channels · ${bg.posts.toLocaleString()} posts · base: ${LOC[g][2]}`;
  const o=off[g]||[0,1],tx=o[0]?x-r-fs(6):x,ty=o[1]<0?y-r-fs(8):o[1]>0?y+r+fs(16):y+fs(5);
  const t=el('text',{x:tx,y:ty,'text-anchor':o[0]?'end':'middle','font-size':fs(P?13:14.5),'font-weight':700,fill:'#e6e9ef',stroke:'#0b1526','stroke-width':fs(3),'paint-order':'stroke'},svg);
  t.textContent=P?{houthi:'Houthis',irgc:'IRGC / Iran',hezbollah:'Hezbollah',hamas:'Hamas',iraqi:'Iraqi militias',aligned:'Pro-Axis media',pij:'PIJ'}[g]:D.G[g][0];
  if(!P){const t2=el('tspan',{x:tx,dy:fs(16),'font-size':fs(13),'font-weight':400,fill:'#b8c0cc'},t);t2.textContent=`${bg.ch} channels · ${LOC[g][2]}`}}
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){parts.forEach(p=>{const[x,y]=bz(p.p0,p.p1,p.p2,p.ph);p.c.setAttribute('cx',x);p.c.setAttribute('cy',y)});return}
 const t0=performance.now(),id=++netmap.id;(function tick(now){if(id!==netmap.id)return;const T=(now-t0)/1000;parts.forEach(p=>{const[x,y]=bz(p.p0,p.p1,p.p2,(T*p.sp+p.ph)%1);p.c.setAttribute('cx',x);p.c.setAttribute('cy',y)});requestAnimationFrame(tick)})(t0)}
const PG=document.getElementById('pg'),PT=document.getElementById('pt'),PQ=document.getElementById('pq');
[...new Set(D.PL.map(x=>x.g))].forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=D.G[g][0];PG.appendChild(o)});
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function plist(){const q=PQ.value.trim().toLowerCase(),R=D.PL.filter(x=>(!PG.value||x.g===PG.value)&&(!PT.value||x.k===PT.value)&&(!q||(x.v+' '+x.ch.map(c=>c[0]).join(' ')).toLowerCase().includes(q)));
 document.getElementById('pn').textContent=`${R.length} of ${D.PL.length} shown. Tap a row for channels, dates and source posts.`;
 document.getElementById('plist').innerHTML=R.map(x=>`<details class="pr"><summary><span class="mono" dir="auto">${esc(x.v)}</span><span class="pm">${x.ch.length} channel${x.ch.length>1?'s':''}</span><span class="pt">${esc(x.t)} · <span style="color:${D.G[x.g][1]}">${esc(D.G[x.g][0])}</span></span><span class="pm">${x.m} posts</span></summary><div class="pb">First seen ${x.f} · last seen ${x.l}<ul>${x.ch.map(c=>`<li>${esc(c[0])}: ${c[1]} post${c[1]>1?'s':''}. ${c[2].map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener nofollow">post ${i+1}</a>`).join(' · ')}</li>`).join('')}</ul></div></details>`).join('')}
[PG,PT].forEach(e=>e.onchange=plist);PQ.oninput=plist;plist();
netmap.id=0;netmap();addEventListener('resize',()=>{netmap();applySel()});
flow();let rw=innerWidth;addEventListener('resize',()=>{if(innerWidth!==rw){rw=innerWidth;flow()}});
'''.replace('__D__',DATA)
page=f'''<!doctype html><html lang="en"><head>{GA}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Axis Channel Network</title><meta name="description" content="How Iran-aligned Telegram channels share messages and raise money."><link rel="icon" href="../favicon.svg"><style>{CSS}</style></head><body><main>
<h1>Axis Channel Network</h1>
<p class="intro">This page tracks {c["channels"]} public Telegram channels run by or aligned with Iran’s “Axis of Resistance”: the Houthis, the IRGC and Iranian state media, Hezbollah, Hamas, Palestinian Islamic Jihad and Iraqi militias. It shows where their messages start and how they spread, how they ask for money, and what each group talks about. Tap or hover any bar for details; sources are in the More section.</p>
<div class="thru">Data through {nice(D["data_through"])} (latest collected post) · main window: {rng(D["data_through"],30)}</div>
<div class="strip"><div class="st"><b>{c["channels"]}</b><span>channels</span></div><div class="st"><b>{f(c["posts"])}</b><span>posts collected</span></div><div class="st"><b>{f(x30)}</b><span>messages copied across groups</span></div></div>
<section id="map"><h2>Which groups pass messages to which</h2><p class="prompt">Each circle is a group at its home base; lines show messages first posted by one group and later copied by another (last 30 days). Thicker lines mean more messages; moving dots show direction.</p>
<div id="net"></div><p class="cap">Line colour = the group that posted first. Hover or tap a line or circle for numbers. Pro-Axis news outlets have no single base and are placed on their own. Flows under 10 messages are left out.</p></section>
<section id="spread"><h2>Where messages start and how they spread</h2><p class="prompt">Who posts first when the same message appears in several channels (last 30 days)</p>
<div class="row"><div class="leg">{leg1}</div><div>{s1bar}<div class="lbl">Copied across groups, <span id="ftitle">last 30 days</span>: posted first (left) → copied by (right)</div>
<div style="display:flex;gap:8px;margin:6px 0"><button class="btn" data-w="f30" aria-pressed="true">30 days</button><button class="btn" data-w="f7" aria-pressed="false">7 days</button></div></div></div>
<p class="prompt" style="color:var(--text);font-size:14.5px">Each band is messages one group posted first (left) and another group later copied (right), flowing left to right. Click or tap a group, here or in the list, to show only its flows.</p>
<div id="fsel" hidden aria-live="polite"><div></div><button class="btn" id="fall" type="button">Show all</button></div>
<div id="flow" style="width:100%;margin-top:6px"></div>
<p class="cap">{cap1}</p></section>
<section id="pay"><h2>Shared payment methods</h2><p class="prompt">Payment methods posted in the channels, by type</p>
<p class="cap" style="margin:0 0 10px"><b>None of the {p["selectors"]} payment details is shared between two groups. {p["shared"]} are reposted by several channels of the same group, mostly the IRGC ({sum(1 for x in D["paylist"] if x["g"]=="irgc")} of {p["selectors"]}).</b></p>
<div class="row"><div class="leg">{leg2}</div><div>{pb}</div></div><p class="cap">{cap2} Channels posting them: {pg}.</p>
<details id="pdd"><summary>See every account number and crypto wallet ({p["selectors"]})</summary><div class="in">
<p class="prompt" style="color:var(--text)">Posted by the channels for fundraising, {nice(p["first"])} to {nice(p["last"])}; shown here for research reference only.</p>
<div class="pf"><label>Group<select id="pg"><option value="">All groups</option></select></label><label>Type<select id="pt"><option value="">All types</option><option value="bank">Bank cards and accounts</option><option value="crypto">Crypto wallets</option><option value="other">Phones and campaigns</option></select></label><label class="ps">Search<input id="pq" type="search" placeholder="Number, wallet or channel"></label></div>
<div id="pn" class="prompt" aria-live="polite"></div><div id="plist"></div></div></details></section>
<section id="themes"><h2>What each group pushes</h2><p class="prompt">Share of each group’s posts by topic</p>
<div class="row"><div class="leg">{leg3}</div><div>{tb}</div></div><p class="cap">{cap3}</p></section>
<section id="week"><h2>New this week: {rng(D["data_through"])}</h2><p class="prompt"><b>{rng(D["data_through"])}</b>, compared with the 3 weeks before ({rng(str(date.fromisoformat(D["data_through"])-__import__("datetime").timedelta(days=7)),21)})</p><div class="chips">{chiph}</div></section>
<details id="more"><summary>More: shared websites, method and sources</summary><div class="in"><p><b>Shared websites.</b> {infra}</p>
<p><b>Method.</b> A message counts as copied when the same text appears in two or more channels; the first channel to post it is the origin. Same-group copies (for example between Houthi channels) are included in the top bar; the flow chart shows only copies between different groups. Flows under 10 messages are left out.</p>
<div id="src"><b>Sources</b><ol>{''.join(f"<li>{html.escape(x)}</li>" for x in SRC)}</ol></div></div></details>
</main><div id="tip" role="tooltip"></div><div id="sheet" role="dialog" aria-label="Details"><button class="btn" aria-label="Close">Close</button><div></div></div><script>{JS}</script></body></html>'''
open(os.path.join(H,'..','index.html'),'w').write(page); print('ok',len(page))
