"""Builds axis-network/index.html from ../data.json (run build_data.py first). Static, $0, one GA tag."""
import json, os, html
H=os.path.dirname(os.path.abspath(__file__)); D=json.load(open(os.path.join(H,'..','data.json')))
G={'houthi':['Houthis (Ansar Allah)','#e5534b'],'irgc':['IRGC and Iranian state','#3fb950'],'hezbollah':['Hezbollah','#f2cc60'],
   'hamas':['Hamas and allied media','#39c5cf'],'iraqi':['Iraqi militias','#5b8def'],'aligned':['Pro-Axis news outlets','#a855f7'],'pij':['Palestinian Islamic Jihad (PIJ)','#ff7eb6']}
TC=['#e5534b','#39c5cf','#f2cc60','#ff7eb6','#5b8def']
f=lambda n:f'{n:,}'
from datetime import date
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
@media(max-width:700px){main{padding:14px 12px 30px}h1{font-size:24px}.intro{font-size:15.5px}.strip{gap:6px}.st{padding:8px}.st b{font-size:19px}.st span{font-size:13px}
 section{padding:12px}.row{grid-template-columns:1fr;gap:8px}.leg{flex-direction:row;flex-wrap:wrap;gap:6px 12px;font-size:13px}.tb{grid-template-columns:1fr;gap:2px;margin:8px 0}
 .chips{grid-template-columns:1fr;gap:6px}.chip{display:grid;grid-template-columns:auto 1fr;gap:0 10px;align-items:center}.chip b{grid-row:span 2;font-size:21px}.cap{font-size:14.5px}}
'''
def sbar(parts,total,cls=''):  # parts: [(label,value,color,tip)]
    return '<div class="sbar">'+''.join(f'<i style="flex:{v};background:{col}" tabindex="0" data-tip="{html.escape(tip)}">{round(100*v/total) if 100*v/total>=9 else ""}{"%" if 100*v/total>=9 else ""}</i>' for l,v,col,tip in parts if v)+'</div>'
order=sorted(G,key=lambda g:-ao.get(g,0))
s1bar=sbar([(gl(g),ao[g],G[g][1],f'<b>{gl(g)}</b><br>start {f(ao[g])} copied messages ({100*ao[g]/tot:.1f}%)') for g in order if ao[g]],tot)
leg1=''.join(f'<span><i style="background:{G[g][1]}"></i>{gl(g)}</span>' for g in ['houthi','hamas','iraqi','aligned','hezbollah'])
# payments: stacked bars per type (shared vs single)
pb=''
mx=max(t[1] for t in p['by_type'])
for t,n,sh in p['by_type']:
    pb+=f'<div class="tb"><div class="gn">{t}</div><div style="display:flex;align-items:center;gap:8px"><div class="sbar" style="margin:0;height:28px;width:{100*n/mx:.1f}%">'+(f'<i style="flex:{sh};background:#f2cc60" tabindex="0" data-tip="<b>{t}</b><br>{sh} of {n} posted by 2 or more channels"></i>' if sh else '')+(f'<i style="flex:{n-sh};background:#39c5cf" tabindex="0" data-tip="<b>{t}</b><br>{n-sh} of {n} posted by one channel only"></i>' if n-sh else '')+f'</div><b style="font-size:15px">{n}</b></div></div>'
leg2='<span><i style="background:#f2cc60"></i>Posted by 2+ channels</span><span><i style="background:#39c5cf"></i>One channel only</span>'
pg=', '.join(f'{gl(g)} {n}' for g,n in p['by_group'].items())
# themes
tb=''
for g in ['houthi','irgc','hezbollah','hamas','iraqi','aligned','pij']:
    v=th['by_group'][g]; tb+=f'<div class="tb"><div class="gn"><i style="background:{G[g][1]}"></i>{gl(g)}</div>'+sbar([(th['cats'][i],v[i],TC[i],f'<b>{gl(g)}</b><br>{th["cats"][i]}: {v[i]:.0f}% of posts') for i in range(5)],sum(v))+'</div>'
tb=tb.replace('margin:4px 0 12px','')
leg3=''.join(f'<span><i style="background:{TC[i]}"></i>{l}</span>' for i,l in enumerate(th['cats']))
chiph=''.join(f'<div class="chip"><b>{a}</b><span>{b}</span><em>{e}</em></div>' for a,b,e in chips)
infra=f'{D["infra"]["sites"]} websites promoted by the channels were mapped to their servers. Only one link crosses groups: almoqawma.com, posted by both Hamas and Hezbollah channels, shared server addresses with the IRGC-linked pgsa.ir. Everything else stays inside one group.'
DATA=json.dumps(dict(G={k:v for k,v in G.items()},f30=D['flow30'],f7=D['flow7']),ensure_ascii=False)
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
 const L=ph()?112:230,R=ph()?112:230,gap=10,nw=12,tot=P.reduce((a,r)=>a+r[2],0);
 const so={},ta={};P.forEach(r=>{so[r[0]]=(so[r[0]]||0)+r[2];ta[r[1]]=(ta[r[1]]||0)+r[2]});
 const sk=Object.keys(so).sort((a,b)=>so[b]-so[a]),tk=Object.keys(ta).sort((a,b)=>ta[b]-ta[a]);
 const Hh=ph()?440:440,k=(Hh-gap*Math.max(sk.length,tk.length))/tot;
 const svg=el('svg',{width:W,height:Hh+30,role:'img','aria-label':'Flow of copied messages from the group that posted first (left) to the group that copied (right)'},box);
 el('text',{x:0,y:16,fill:'#e6e9ef','font-size':14,'font-weight':700},svg).textContent='Posted first ↓';
 const t2=el('text',{x:W,y:16,fill:'#e6e9ef','font-size':14,'font-weight':700,'text-anchor':'end'},svg);t2.textContent='Copied by ↓';
 const ys={},yt={};let y=30;sk.forEach(g=>{ys[g]=y;y+=so[g]*k+gap});y=30;tk.forEach(g=>{yt[g]=y;y+=ta[g]*k+gap});
 const x0=L,x1=W-R,os={...ys},ot={...yt},lg=el('g',{},svg);
 P.forEach(r=>{const h=r[2]*k,a=os[r[0]],b=ot[r[1]];os[r[0]]+=h;ot[r[1]]+=h;const m=(x0+x1)/2;
  const pth=el('path',{d:`M${x0+nw},${a}C${m},${a} ${m},${b} ${x1-nw},${b}L${x1-nw},${b+h}C${m},${b+h} ${m},${a+h} ${x0+nw},${a+h}Z`,fill:D.G[r[0]][1],'fill-opacity':.6,stroke:D.G[r[0]][1],'stroke-opacity':.9,'stroke-width':.5,tabindex:0},lg);
  pth.dataset.tip=`<b style="color:${D.G[r[0]][1]}">${D.G[r[0]][0]}</b> → <b style="color:${D.G[r[1]][1]}">${D.G[r[1]][0]}</b><br>${r[2].toLocaleString()} messages copied`;
  pth.addEventListener('mouseenter',()=>pth.setAttribute('fill-opacity',.95));pth.addEventListener('mouseleave',()=>pth.setAttribute('fill-opacity',.6))});
 const short=g=>ph()?{houthi:'Houthis',irgc:'IRGC / Iran',hezbollah:'Hezbollah',hamas:'Hamas',iraqi:'Iraqi militias',aligned:'Pro-Axis media',pij:'PIJ'}[g]:D.G[g][0];
 const lab=(g,x,y0,h,v,anchor,tx)=>{el('rect',{x,y:y0,width:nw,height:Math.max(2,h),fill:D.G[g][1]},svg);
   const t=el('text',{x:tx,y:y0+h/2+(ph()?-2:5),fill:'#e6e9ef','font-size':ph()?13:14.5,'text-anchor':anchor},svg);t.textContent=short(g)+' ';const s=ph()?el('tspan',{'font-weight':700,fill:D.G[g][1],x:tx,dy:15},t):el('tspan',{'font-weight':700,fill:D.G[g][1]},t);s.textContent=v.toLocaleString()};
 sk.forEach(g=>lab(g,x0,ys[g],so[g]*k,so[g],'end',x0-6));tk.forEach(g=>lab(g,x1-nw,yt[g],ta[g]*k,ta[g],'start',x1+6));
 document.getElementById('ftitle').textContent=mode==='f30'?'last 30 days':'last 7 days'}
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{mode=b.dataset.w;document.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b));flow()});
flow();let rw=innerWidth;addEventListener('resize',()=>{if(innerWidth!==rw){rw=innerWidth;flow()}});
'''.replace('__D__',DATA)
page=f'''<!doctype html><html lang="en"><head>{GA}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Axis Channel Network</title><meta name="description" content="How Iran-aligned Telegram channels share messages and raise money."><link rel="icon" href="../favicon.svg"><style>{CSS}</style></head><body><main>
<h1>Axis Channel Network</h1>
<p class="intro">This page tracks {c["channels"]} public Telegram channels run by or aligned with Iran’s “Axis of Resistance”: the Houthis, the IRGC and Iranian state media, Hezbollah, Hamas, Palestinian Islamic Jihad and Iraqi militias. It shows where their messages start and how they spread, how they ask for money, and what each group talks about. Tap or hover any bar for details; sources are in the More section.</p>
<div class="thru">Data through {nice(D["data_through"])} · main window: 30 days from {nice(D["window_start"])}</div>
<div class="strip"><div class="st"><b>{c["channels"]}</b><span>channels</span></div><div class="st"><b>{f(c["posts"])}</b><span>posts collected</span></div><div class="st"><b>{f(x30)}</b><span>messages copied across groups</span></div></div>
<section id="spread"><h2>Where messages start and how they spread</h2><p class="prompt">Who posts first when the same message appears in several channels (last 30 days)</p>
<div class="row"><div class="leg">{leg1}</div><div>{s1bar}<div class="lbl">Copied across groups, <span id="ftitle">last 30 days</span>: posted first (left) → copied by (right)</div>
<div style="display:flex;gap:8px;margin:6px 0"><button class="btn" data-w="f30" aria-pressed="true">30 days</button><button class="btn" data-w="f7" aria-pressed="false">7 days</button></div><div id="flow"></div></div></div>
<p class="cap">{cap1}</p></section>
<section id="pay"><h2>Shared payment methods</h2><p class="prompt">Payment methods posted in the channels, by type</p>
<div class="row"><div class="leg">{leg2}</div><div>{pb}</div></div><p class="cap">{cap2} Channels posting them: {pg}.</p></section>
<section id="themes"><h2>What each group pushes</h2><p class="prompt">Share of each group’s posts by topic</p>
<div class="row"><div class="leg">{leg3}</div><div>{tb}</div></div><p class="cap">{cap3}</p></section>
<section id="week"><h2>New this week</h2><p class="prompt">{nice(D["data_through"])} and the 6 days before, compared with the 3 weeks before</p><div class="chips">{chiph}</div></section>
<details id="more"><summary>More: shared websites, method and sources</summary><div class="in"><p><b>Shared websites.</b> {infra}</p>
<p><b>Method.</b> A message counts as copied when the same text appears in two or more channels; the first channel to post it is the origin. Same-group copies (for example between Houthi channels) are included in the top bar; the flow chart shows only copies between different groups. Flows under 10 messages are left out.</p>
<div id="src"><b>Sources</b><ol>{''.join(f"<li>{html.escape(x)}</li>" for x in SRC)}</ol></div></div></details>
</main><div id="tip" role="tooltip"></div><div id="sheet" role="dialog" aria-label="Details"><button class="btn" aria-label="Close">Close</button><div></div></div><script>{JS}</script></body></html>'''
open(os.path.join(H,'..','index.html'),'w').write(page); print('ok',len(page))
