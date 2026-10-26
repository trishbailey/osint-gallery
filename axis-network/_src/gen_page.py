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
def dur(sec):  # seconds -> readable duration with correct units
    sec=int(round(sec))
    if sec<60: return f"{sec} seconds"
    if sec<3600:
        m,s=divmod(sec,60); return f"about {m} minute{'s'*(m!=1)}"+(f" {s} seconds" if s else "")
    h,m=divmod(round(sec/60),60); return f"about {h} hour{'s'*(h!=1)}"+(f" {m} minutes" if m else "")
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
SRC=[f'Cross-group copies: identical message text (60+ characters after cleaning) posted by channels of two different groups, first post = origin. {f(D["coord"]["posts"])} public Telegram posts from {D["coord"]["channels"]} channels analysed for copies, {nice(D["coord"]["start"])} to {nice(D["coord"]["end"])}; main window {nice(D["window_start"])} to {nice(D["data_through"])}. Biggest cross-group source channels: '+', '.join(f'@{h} ({f(n)})' for h,_,n in D['topsrc30'])+'.',
 f'Payment methods (bank cards, bank accounts, donation phone numbers, named campaigns and crypto wallets) found in posts from {p["first"]} to {p["last"]}. Only {p["in_window"]} of {p["edges"]} postings fall inside the 30-day window, so this chart uses the whole payment collection.',
 'Channel group labels follow the channels’ own branding and published reporting. Sadaa al-Masirah (@sadaa_almasirah) is the largest single Houthi source.']

# Houthi threat targets (all numbers from data.json['threats'])
T=D['threats']; TR={r['k']:r for r in T['rows']}
def mult(r,a,b):
    x,y=r[a][1],r[b][1]
    return 'new' if x==0 and y>0 else (f'×{y/x:.1f}' if x else 'none')
cs=T['case']; aq=T['air']; iq=T['iraqi']
FN0=len(SRC)+1
tsrc=[f'Houthi threat posts: posts from {T["nch"]} Houthi channels ({f(T["nposts"])} posts) that contain an Arabic or English warning or threat phrase (for example “legitimate target”, “we warn”, “will be targeted”) and name a target, matched by keyword. Identical texts are counted once. Rates are threat posts naming the target per 10,000 Houthi posts in the same window, so changes in overall posting volume do not distort them. Baseline {nice(T["base_start"])} to {nice(str(date.fromisoformat(T["w30_start"])-__import__("datetime").timedelta(days=1)))} ({f(T["tot"]["base"])} posts); last 30 days {nice(T["w30_start"])} to {nice(T["end"])} ({f(T["tot"]["last30"])} posts); last 7 days from {nice(T["w7_start"])} ({f(T["tot"]["last7"])} posts) against the 3 weeks before ({f(T["tot"]["prior21"])} posts).',
 f'<a href="{cs["warn"]}" target="_blank" rel="noopener nofollow">Yemeni armed forces (Houthi) warning, @army21ye, {cs["warn_t"]}</a>',
 f'<a href="{cs["claim"]}" target="_blank" rel="noopener nofollow">Houthi military media claim, @MilitaryMediaY, {cs["claim_t"]}</a>']+[f'<a href="{u}" target="_blank" rel="noopener nofollow">{html.escape(t)}</a>' for _,u,t in cs['press']]+[
 f'Houthi warnings to airlines operating in Saudi airspace: {aq["n"]} threat posts since {nice(aq["first"])}; first <a href="{aq["first_url"]}" target="_blank" rel="noopener nofollow">{aq["first_url"].replace("https://","")}</a>, renewed in <a href="{aq["ex"]}" target="_blank" rel="noopener nofollow">{aq["ex"].replace("https://","")}</a>.']
if iq: tsrc.append(f'Iraqi militia reposts: identical text first posted by the Houthi military channels @MilitaryMediaY or @army21ye and later posted by an Iraqi militia channel, last 30 days ({iq["n"]} reposts by {iq["ch"]} channels). Fastest repost of the Oct 14 claim: <a href="{iq["claim"][2]}" target="_blank" rel="noopener nofollow">@{iq["claim"][0]}</a>.')
nF=lambda i:FN0+i
rz=TR['riyadh']; ar=TR['aramco']; sth=TR['south']
thead=(f'Houthi threats have shifted from Israel, the US and the Red Sea to named targets inside Saudi {nw("Arabia,",nF(0))} and claimed strikes have followed the {nw("warnings.",nF(1),nF(2),nF(3))}')
tcap=(f'In the last 30 days, Houthi threat posts named Riyadh {mult(rz,"base","last30").replace("×","")} times as often as in the months before, and Aramco {mult(ar,"base","last30").replace("×","")} times as often. '
      f'Threats naming the United States fell to {round(100*TR["us"]["last30"][1]/TR["us"]["base"][1])}% of their earlier rate and Israel to {round(100*TR["israel"]["last30"][1]/TR["israel"]["base"][1])}%, and the Red Sea dropped out ({TR["redsea"]["base"][0]} posts before, {TR["redsea"]["last30"][0]} in the last 30 {nw("days).",nF(0))}')
tcase=(f'<div class="tcard"><div class="tch">Warning, then strike</div><ol class="tsteps">'
 f'<li><b>{cs["warn_t"]}</b> Houthi forces tell civilians to leave three Saudi sites if Saudi Arabia strikes {nw("Sanaa:",nF(1))} {", ".join(cs["sites"])}.</li>'
 f'<li><b>Overnight, Oct 13–14</b> A missile hits an administrative building at Aramco’s headquarters in Dhahran, causing a fire across several floors. Saudi Arabia’s energy ministry confirmed a fire; AP and Reuters reported heavy {nw("damage.",nF(3),nF(4),nF(5))}</li>'
 f'<li><b>{cs["claim_t"]}</b> Houthi military media claim strikes on all three {nw("sites.",nF(2))} Press reports confirm only the Aramco headquarters hit.</li></ol></div>')
tlines=(f'<ul class="tl"><li><b>New target: airlines.</b> Since {nice(aq["first"])}, Houthi channels have posted {aq["n"]} warnings telling international airlines that Saudi airspace is {nw("unsafe.",nF(6))}</li>'
 +(f'<li><b>Iraqi militias amplify within minutes.</b> Iraqi militia channels reposted Houthi military statements {iq["n"]} times in the last 30 days, half of them within {dur(iq["med"])}; @{iq["claim"][0]} reposted the Oct 14 strike claim after {iq["claim"][1]} {nw("seconds.",nF(7))}</li>' if iq else '')+'</ul>')
def flagli(x):
    if x['why']=='first': return f'<li><b>{html.escape(x["l"])}</b> <span>named for the first time ({nice(x["first"])}, <a href="{x["url"]}" target="_blank" rel="noopener nofollow">post</a>)</span></li>'
    return f'<li><b>{html.escape(x["l"])}</b> <span>{x["n7"]} threat posts this week, {x["r7"]:g} per 10,000 posts vs {x["rp"]:g} in the 3 weeks before</span></li>'
tflag=(f'<div class="tnew"><div class="tch">New or surging this week ({rng(T["end"])})</div>'+(f'<ul>{"".join(flagli(x) for x in T["flag"])}</ul>' if T['flag'] else '<p class="prompt" style="margin:4px 0 0">No target met the rule this week.</p>')
 +'<p class="tnote">Rule: a target’s 7-day rate is at least twice its rate in the 3 weeks before, with 5 or more posts, or a named facility appears in a threat post for the first time.</p></div>')
tcave=f'<p class="tnote">Counts come from Arabic and English keyword matching. Strike claims are the Houthis’ own except where press reports confirm them. Data through {nice(T["end"])} (latest collected post).</p>'
GA='''<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z61EKRP8QV"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Z61EKRP8QV');</script>'''
# threat-target map: only targets with a locatable place and >0 posts in last 30 days
GEO={'riyadh':(24.71,46.68,'Riyadh'),'aramco':(26.29,50.11,'Aramco HQ, Dhahran'),'south':(17.9,43.4,'Jizan, Najran, Asir'),'uae':(24.45,54.38,'UAE'),'bab':(12.6,43.35,'Bab al-Mandab'),'hormuz':(26.57,56.25,'Strait of Hormuz'),'israel':(31.5,34.9,'Israel')}
QT={'riyadh':[('“Evacuate immediately and stay away from the targets our forces will strike” if Saudi Arabia hits Sanaa, listing King Khalid Airport and Aramco’s Riyadh refinery.','Oct 13','https://t.me/army21ye/3878'),('Houthi military claims missiles and drones hit King Khalid International Airport and the Aramco refinery in Riyadh.','Oct 14','https://t.me/MilitaryMediaY/47040')],
 'aramco':[('Houthi military tells civilians to evacuate “Aramco headquarters in Dammam” before any strike.','Oct 13','https://t.me/army21ye/3878'),('Houthi military claims a “large number” of ballistic and cruise missiles and drones hit Aramco in Dhahran.','Oct 14','https://t.me/MilitaryMediaY/47040')],
 'south':[('Houthi military claims strikes on Abha airport, Khamis Mushait air base and “sensitive sites” in Najran and Jizan.','Oct 5','https://t.me/masirah_sada/191126')]}
QT['kkia']=QT['riyadh'];QT['aramhq']=QT['aramco'];QT['khamis']=QT['south']
KD=T.get('kind',{});MAPD=[]
def bd(k,nm):
    x=KD.get(k)
    if not x: return ''
    nd=', '.join(f'{a} {n}' for a,n in sorted(x['named'].items(),key=lambda z:-z[1]))
    gn=', '.join(f'{a} {n}' for a,n in sorted(x['general'].items(),key=lambda z:-z[1]))
    return f'Of {x["n"]} threat posts naming {nm}: {x["n"]-x["ngen"]} name a specific site ({nd}); {x["ngen"]} name no site ({gn}). Posts can name several sites.'
LBL={'riyadh':'Riyadh (city)','south':'Jizan/Najran/Asir','uae':'UAE','bab':'Bab al-Mandab','hormuz':'Hormuz','israel':'Israel'}
DIR={'riyadh':'left','kkia':'top','ryref':'bottom','aramhq':'top','abha':'left','khamis':'right','south':'bottom','yanbu':'bottom','rabigh':'left','uae':'bottom','bab':'left','hormuz':'right','israel':'right','shaybah':'right','jizanap':'left','najranap':'right','jedap':'left','dmmap':'top'}
for k,(la,lo,nm) in GEO.items():
    r=TR.get(k)
    if not r or k=='aramco': continue
    b,l=r['base'][1],r['last30'][1]
    cc=r['last30'][0]; extra=''
    if k in KD: cc=KD[k]['ngen']; extra=bd(k,LBL[k].split(' (')[0])
    if not cc: continue
    MAPD.append({'k':k,'n':LBL.get(k,nm),'la':la,'lo':lo,'c':cc,'cb':r['base'][0],'x':(round(l/b,1) if b else None),'up':l>b,'q':QT.get(k,[]),'ex':(KD[k]['ex'] if k in KD else r['ex'][:2]),'bd':extra,'gen':k in KD,'dir':DIR.get(k,'right'),'t':('city' if k=='riyadh' else 'area'),'minor':False})
for x in T.get('sites',[]):
    b,l=x['base'][1],x['last30'][1]
    MAPD.append({'k':x['k'],'n':x['l'],'la':x['la'],'lo':x['lo'],'c':x['last30'][0],'cb':x['base'][0],'x':(round(l/b,1) if b else None),'up':l>b,'q':QT.get(x['k'],[]),'ex':x['ex'][:2],'bd':f'Type: {x["t"]}.'+(f' Linked to {T["air"]["link"][x["l"]]} of the {T["air"]["n"]} warnings to airlines.' if x['l'] in T['air'].get('link',{}) else ''),'gen':False,'dir':DIR.get(x['k'],'right'),'t':x['t'],'minor':x.get('minor',False)})
UNMAPPED=[TR[k]['l'] for k in TR if k not in GEO or not TR[k]['last30'][0]]+(['Aramco sites not named ('+str(KD['aramco']['ngen'])+' posts)'] if 'aramco' in KD else [])

CSS='''.wkl{margin:6px 0 0;padding-left:18px;font-size:14.5px;line-height:1.5}.wkl li{margin:4px 0;overflow-wrap:anywhere}
.tlab{background:rgba(11,21,38,.82);border:1px solid #24365a;color:#e6e9ef;font-size:13px;font-weight:600;padding:1px 5px;box-shadow:none;border-radius:4px}.tlab:before{display:none}#tmap{height:520px;border-radius:10px;border:1px solid var(--line);background:#0b1526}.leaflet-container{font:inherit}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:var(--panel2);color:var(--text);border:1px solid var(--gold)}.leaflet-popup-content{font-size:14px;line-height:1.4;margin:10px 12px}.leaflet-popup-content a{color:var(--gold)}.tq{margin:6px 0;font-style:italic}.tdot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}.tl2w{overflow:visible}.tl2{font-size:13px;font-weight:600;color:#e6e9ef;white-space:nowrap;pointer-events:none;text-shadow:0 0 2px #0b1526,0 0 3px #0b1526,0 0 4px #0b1526}.tlk{overflow:visible;pointer-events:none}.tleg .tlh{font-size:13px;font-weight:700;color:var(--gold);margin-top:6px}.tleg .tln{font-size:13px;line-height:1.35}.tleg svg{flex:none}.tmk{background:none;border:0}.tl2t{background:transparent;border:0;box-shadow:none;color:#f3f5f8;font-size:13px;font-weight:600;padding:0 2px;text-shadow:0 0 2px #0b1526,0 0 3px #0b1526,0 0 5px #0b1526}.tl2t:before{display:none}.tm-ctl a{display:flex!important;align-items:center;justify-content:center;color:#1a2a44}.tm-hint{position:absolute;inset:auto 0 40%;text-align:center;z-index:800;pointer-events:none;opacity:0;transition:opacity .2s}.tm-hint.on{opacity:1}.tm-hint{color:#fff;font-size:15px;font-weight:600;text-shadow:0 0 4px #000,0 0 8px #000}#tmapw.tfs{position:fixed;inset:0;z-index:5000;background:#0b1526}#tmapw.tfs #tmap{height:100vh!important;border-radius:0}body.tfs-lock{overflow:hidden}@media (max-width:600px){.tleg{display:grid!important;grid-template-columns:1fr 1fr;gap:4px 10px}.tleg .lghint,.tleg .tlh,.tleg .tln{grid-column:1/-1}}.case-mk{color:var(--gold);font-weight:700;font-size:13px;white-space:nowrap;text-shadow:0 0 3px #000}@media (max-width:600px){#tmap{height:420px}}

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
.lgb{display:flex;align-items:center;gap:8px;background:var(--panel2);border:1px solid var(--line);border-radius:999px;color:var(--text);font:inherit;font-size:14px;padding:6px 12px;min-height:40px;cursor:pointer;text-align:left;transition:border-color .15s,background .15s}.lgb i{width:13px;height:13px;border-radius:50%;flex:none}.lgb:hover{border-color:var(--gold);background:#16294a}.lgb[aria-pressed=true]{border-color:var(--gold);background:#1d3157;box-shadow:inset 0 0 0 1px var(--gold);font-weight:700}.lgb:focus-visible,.node:focus-visible{outline:2px solid var(--gold);outline-offset:2px}.lghint{font-size:13.5px;color:var(--gold);font-weight:600;margin:0 0 2px}@keyframes lgp{0%,100%{border-color:var(--line)}50%{border-color:var(--gold)}}.leg .lgb{animation:lgp 1.2s ease-in-out 2}@media (prefers-reduced-motion:reduce){.leg .lgb{animation:none;transition:none}}@media (max-width:600px){.lghint{flex-basis:100%}.lgb{min-height:44px;font-size:13.5px}}#fsel{align-items:center!important;flex-wrap:nowrap;padding:8px 10px!important;gap:8px!important}#fsel .btn{padding:4px 10px;min-height:32px;font-size:13px;white-space:nowrap}#fsel>div{flex:1 1 auto;min-width:0}
.node{cursor:pointer}#fsel{background:var(--panel2);border:1px solid var(--gold);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14.5px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}#fsel[hidden]{display:none}#fsel .btn{flex:none}
#threats .thd{font-size:17px;font-weight:700;margin:2px 0 12px;max-width:900px}.tw{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.trow{display:grid;grid-template-columns:230px 1fr;gap:12px;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid var(--line);color:var(--text);font:inherit;text-align:left;padding:7px 0;cursor:pointer;min-height:48px}.trow:hover,.trow:focus-visible{background:var(--panel2);outline:none}
.trow .tn{font-size:14.5px;font-weight:600}.trow .tv{display:block;font-size:13px;color:var(--muted);font-weight:400}.ttr{position:relative;height:26px}.ttr .z{position:absolute;top:-4px;bottom:-4px;width:2px;background:#e6e9ef}.ttr .bar{position:absolute;top:3px;height:20px;border-radius:3px}
.tcard,.tnew{background:var(--panel2);border:1px solid var(--line);border-left:4px solid #b24762;border-radius:10px;padding:12px 14px;margin:14px 0 0}.tnew{border-left-color:var(--gold)}.tch{font-weight:700;font-size:16px;margin-bottom:4px}
.tsteps{margin:4px 0 0;padding-left:20px;font-size:15px}.tsteps li{margin:5px 0}.tsteps b{color:var(--gold);margin-right:6px}.tl{font-size:15px;padding-left:20px;margin:12px 0 0}.tl li{margin:5px 0}.tnew ul{margin:4px 0 0;padding-left:20px;font-size:15px}.tnew span{color:var(--text)}.tnote{font-size:13px;color:var(--muted);margin:10px 0 0}
#sheet a{overflow-wrap:anywhere}
@media(max-width:700px){.trow{grid-template-columns:1fr;gap:4px}.tw{margin-top:4px}#threats .thd{font-size:16px}main{padding:14px 12px 30px}h1{font-size:24px}.intro{font-size:15.5px}.strip{gap:6px}.st{padding:8px}.st b{font-size:19px}.st span{font-size:13px}
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
DATA=json.dumps(dict(MAP=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'basemap.json'))),BG=D['by_group'],PL=D['paylist'],G={k:v for k,v in G.items()},f30=D['flow30'],f7=D['flow7'],T=D['threats']),ensure_ascii=False)
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
 if(!s){ro.hidden=true}else{const SN={houthi:'Houthis',irgc:'IRGC',hezbollah:'Hezbollah',hamas:'Hamas',iraqi:'Iraqi militias',aligned:'Pro-Axis media',pij:'PIJ'},nm=g=>`<b style="color:${D.G[g][1]}">${SN[g]||D.G[g][0]}</b>`,out=FP.filter(r=>r[0]===s),inn=FP.filter(r=>r[1]===s),sum=a=>a.reduce((x,r)=>x+r[2],0);
  ro.hidden=false;ro.querySelector('div').innerHTML=`${nm(s)} · ${mode==='f30'?'last 30 days':'last 7 days'}: <b>${sum(out).toLocaleString()}</b> posted first · <b>${sum(inn).toLocaleString()}</b> copied from others`}
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
let TW='30';
function thr(){const T=D.T,a=TW==='30'?'base':'prior21',b=TW==='30'?'last30':'last7',box=document.getElementById('thr');
 const fd=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 const dm=d=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()-1);return x.toISOString().slice(0,10)};
 document.getElementById('ttitle').textContent=TW==='30'?`Last 30 days (${fd(T.w30_start)}–${fd(T.end)}) vs ${fd(T.base_start)}–${fd(dm(T.w30_start))}`:`Last 7 days (${fd(T.w7_start)}–${fd(T.end)}) vs the 3 weeks before`;
 const R=T.rows.map(r=>({...r,d:+(r[b][1]-r[a][1]).toFixed(1)})).sort((x,y)=>y.d-x.d);
 const mp=Math.max(1,...R.map(r=>r.d)),mn=Math.max(1,...R.map(r=>-r.d)),z=100*mn/(mp+mn);
 box.innerHTML=R.map((r,i)=>{const w=100*Math.abs(r.d)/(mp+mn),up=r.d>=0,x=r[a][1],y=r[b][1],m=x?(y?`×${(y/x).toFixed(1)}`:"none now"):(y?"new":"");
  return `<button type="button" class="trow" data-i="${r.k}" aria-label="${r.l}: ${x} to ${y} per 10,000 posts. Open details"><span class="tn">${r.l}<span class="tv">${x} → ${y} per 10,000 posts${m?' · '+m:''}</span></span><span class="ttr"><span class="bar" style="left:${up?z:z-w}%;width:${Math.max(w,.6)}%;background:${up?'#b24762':'#4379a8'}"></span><span class="z" style="left:calc(${z}% - 1px)"></span></span></button>`}).join('');
 box.querySelectorAll('.trow').forEach(btn=>btn.onclick=()=>{const r=T.rows.find(q=>q.k===btn.dataset.i),lw=TW==='30'?'Earlier baseline':'3 weeks before',nw=TW==='30'?'Last 30 days':'Last 7 days';
  SH.querySelector('div').innerHTML=`<b>${r.l}</b><br>${lw}: ${r[a][0]} threat posts (${r[a][1]} per 10,000 Houthi posts)<br>${nw}: ${r[b][0]} threat posts (${r[b][1]} per 10,000)`+(r.ex.length?`<br>Latest example posts: ${r.ex.map(e=>`<a href="${e[0]}" target="_blank" rel="noopener nofollow">${e[1]}</a>`).join(' · ')}`:'');SH.classList.add('on');TIP.style.display='none'})}
document.querySelectorAll('[data-tw]').forEach(b=>b.onclick=()=>{TW=b.dataset.tw;document.querySelectorAll('[data-tw]').forEach(x=>x.setAttribute('aria-pressed',x===b));thr()});thr();
(function(){const M=__M__,RG=__RG__;if(!window.L)return;
const PH=innerWidth<=480,TOUCH=matchMedia('(pointer:coarse)').matches;
const C={city:'#f2c94c',airport:'#3fd0e0',energy:'#ff8c42',military:'#c86bfa',government:'#5ad16b',area:'#ff8fb8'},UP='#e5484d',DN='#4f7dff';
const m=L.map('tmap',{scrollWheelZoom:!TOUCH,dragging:!TOUCH,tap:false,zoomSnap:.5,minZoom:3,maxZoom:16,attributionControl:true,zoomControl:true});
m.setView([22.5,46],5);m.createPane('lbl').style.zIndex=450;m.getPane('lbl').style.pointerEvents='none';
const E='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';
m.attributionControl.setPrefix(PH?false:'<a href="https://leafletjs.com">Leaflet</a>');L.tileLayer(E+'Base/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri, HERE, Garmin, OpenStreetMap',maxZoom:16}).addTo(m);
L.tileLayer(E+'Reference/MapServer/tile/{z}/{y}/{x}',{pane:'lbl',maxZoom:16}).addTo(m);
if(TOUCH){const ct=m.getContainer(),hint=document.createElement('div');hint.className='tm-hint';hint.textContent='Use two fingers to move and zoom the map';ct.appendChild(hint);let ht;
 ct.addEventListener('touchstart',e=>{if(e.touches.length>1){m.dragging.enable();hint.classList.remove('on')}else{m.dragging.disable();hint.classList.add('on');clearTimeout(ht);ht=setTimeout(()=>hint.classList.remove('on'),1200)}},{passive:true});
 ct.addEventListener('touchend',e=>{if(!e.touches.length)m.dragging.disable()},{passive:true})}
const e=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const SN={riyadh:'Riyadh',kkia:'Riyadh airport',ryref:'Riyadh refinery',mod:'Defence ministry',south:'Jizan, Najran, Asir',khamis:'Khamis Mushait air base',israel:'Israel',yanbu:'Yanbu',aramhq:'Aramco HQ',abha:'Abha airport',bab:'Bab al-Mandab',hormuz:'Hormuz',uae:'UAE',rabigh:'Rabigh refinery',dmmap:'Dammam airport',jizanap:'Jizan airport',najranap:'Najran airport',jedap:'Jeddah airport',shaybah:'Shaybah'};
const G={city:'<path d="M5 17V9h4V5h6v12M7 11h0M12 8h1M12 11h1M12 14h1" stroke="#0b1526" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
 airport:'<path d="M12 4c.8 0 1.2.8 1.2 1.6V10l5.8 3.4v1.6l-5.8-1.8v3.6l1.8 1.3V19L12 18.2 9 19v-1.3l1.8-1.3v-3.6L5 14.6V13l5.8-3.4V5.6C10.8 4.8 11.2 4 12 4z" fill="#0b1526"/>',
 energy:'<path d="M12 4c2.5 3.3 5 6 5 9.2A5 5 0 0 1 7 13.2C7 10 9.5 7.3 12 4z" fill="#0b1526"/>',
 military:'<path d="M12 4l6.5 2.5v5c0 4-2.8 6.8-6.5 8.5-3.7-1.7-6.5-4.5-6.5-8.5v-5z" fill="#0b1526"/>',
 government:'<path d="M4.5 9.5L12 5l7.5 4.5zM6.5 10.5v6M10 10.5v6M14 10.5v6M17.5 10.5v6M4.5 18h15" stroke="#0b1526" stroke-width="1.8" fill="#0b1526" stroke-linecap="round"/>'};
const OFF={riyadh:[0,0],kkia:[22,-26],ryref:[24,22],mod:[-28,8],khamis:[18,-10],abha:[-18,10]};
const pop=t=>{const col=t.up?UP:DN,x=t.x==null?'new (not named before)':(t.x>=1?`${t.x}× its earlier rate`:`${Math.round(t.x*100)}% of its earlier rate`);
 let h=`<b>${e(t.n)}</b><br><span class="tdot" style="background:${col}"></span>${t.c} threat posts${t.gen?' with no specific site':''} in last 30 days, ${x}`;
 if(t.bd)h+=`<div style="margin-top:6px">${e(t.bd)}</div>`;
 if(t.q.length)h+=t.q.map(q=>`<div class="tq">${e(q[0])}</div><div>${q[1]} · <a href="${q[2]}" target="_blank" rel="noopener nofollow">${q[2].replace('https://','')}</a></div>`).join('');
 else h+=`<div class="tq">Mentions only; no clear direct threat line in the sample.</div>`+t.ex.map(u=>`<div><a href="${u[0]}" target="_blank" rel="noopener nofollow">${u[0].replace('https://','')}</a> · ${u[1]}</div>`).join('');
 if(t.k==='aramhq')h+=`<div style="margin-top:6px"><b>Oct 13 warning → Oct 14 claimed strike</b></div>`;return h};
const b=[],PTS=[],AR=[];
M.forEach(t=>{const h=pop(t),col=t.up?UP:DN;
 if(t.t==='area'){let ly;const st={color:col,weight:2,dashArray:t.up?null:'5 4',fillColor:C.area,fillOpacity:.3};
  ly=RG[t.k]?L.geoJSON(RG[t.k],{style:()=>st}):L.circle([t.la,t.lo],Object.assign({radius:45000},st));
  ly.addTo(m).bindPopup(h,{maxWidth:280});ly.bindTooltip(SN[t.k]||t.n,{className:'tl2t',direction:'center',permanent:false});AR.push(ly);const bb=ly.getBounds?ly.getBounds():null;if(bb){b.push(bb.getSouthWest(),bb.getNorthEast())}else b.push([t.la,t.lo]);return}
 const r=t.minor?0:Math.round(9+Math.min(9,Math.sqrt(t.c)*1.05)),s=t.minor?14:20;
 const mk=L.marker([t.la,t.lo],{keyboard:true,title:SN[t.k]||t.n,riseOnHover:true}).bindPopup(h,{maxWidth:280});
 mk.bindTooltip(e(SN[t.k]||t.n),{permanent:true,direction:'right',className:'tl2t',offset:[r?r+2:10,0],opacity:1});
 PTS.push({t,mk,r,s,col});if(!t.minor)b.push([t.la,t.lo])});
function icon(p,z){const o=(z<8&&OFF[p.t.k])?OFF[p.t.k]:[0,0],R=Math.max(p.r,p.s/2+2),W=2*R+Math.abs(o[0])*2+8,H=2*R+Math.abs(o[1])*2+8,cx=W/2+o[0],cy=H/2+o[1];
 const ring=p.r?`<circle cx="${cx}" cy="${cy}" r="${p.r}" fill="${p.col}" fill-opacity=".14" stroke="${p.col}" stroke-width="2"${p.t.up?'':' stroke-dasharray="4 3"'}/>`:'';
 const lead=(o[0]||o[1])?`<line x1="${W/2}" y1="${H/2}" x2="${cx}" y2="${cy}" stroke="${C[p.t.t]}" stroke-width="1.2"/><circle cx="${W/2}" cy="${H/2}" r="2.2" fill="${C[p.t.t]}"/>`:'';
 const k=p.s/24,ic=`<g transform="translate(${cx-p.s/2},${cy-p.s/2}) scale(${k})"><circle cx="12" cy="12" r="11.5" fill="${C[p.t.t]}" stroke="#0b1526" stroke-width="1.2"/>${G[p.t.t]||''}</g>`;
 const bx=cx+p.s/2-1,by=cy-p.s/2-1,badge=p.r?`<g><circle cx="${bx}" cy="${by}" r="5.5" fill="${p.col}" stroke="#0b1526" stroke-width="1"/><path d="${p.t.up?`M${bx-3} ${by+1.6}L${bx} ${by-2.4}L${bx+3} ${by+1.6}z`:`M${bx-3} ${by-1.6}L${bx} ${by+2.4}L${bx+3} ${by-1.6}z`}" fill="#fff"/></g>`:'';
 return L.divIcon({className:'tmk',html:`<svg width="${W}" height="${H}" overflow="visible">${lead}${ring}${ic}${badge}</svg>`,iconSize:[W,H],iconAnchor:[W/2,H/2],popupAnchor:[o[0],o[1]-R],tooltipAnchor:[o[0],o[1]]})}
const LZ=PH?8:7;
function upd(){const z=m.getZoom();PTS.forEach(p=>{const show=!p.t.minor||z>=7;if(show){p.mk.setIcon(icon(p,z));if(!m.hasLayer(p.mk))p.mk.addTo(m);const lab=z>=(p.t.minor?Math.max(LZ,8):LZ);const tt=p.mk.getTooltip();if(tt){const el=tt.getElement();if(el)el.style.display=lab?'':'none'}}else if(m.hasLayer(p.mk))m.removeLayer(p.mk)});
 AR.forEach(a=>{a.setStyle&&a.setStyle({fillOpacity:z>=8?.12:.3})})}
m.on('zoomend',upd);m.on('popupopen',()=>{});
const home=()=>m.fitBounds(b,{padding:PH?[14,14]:[28,28]});
const Ctl=L.Control.extend({options:{position:'topleft'},onAdd(){const d=L.DomUtil.create('div','leaflet-bar tm-ctl');
 d.innerHTML='<a href="#" role="button" title="Reset view" aria-label="Reset view" data-a="home"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></a><a href="#" role="button" title="Full screen" aria-label="Full screen" data-a="fs"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></a>';
 L.DomEvent.disableClickPropagation(d);d.addEventListener('click',ev=>{const a=ev.target.closest('a');if(!a)return;ev.preventDefault();if(a.dataset.a==='home')home();else fs()});return d}});
new Ctl().addTo(m);
const wrap=document.getElementById('tmapw');
function fs(){const on=!wrap.classList.contains('tfs');if(on&&wrap.requestFullscreen&&!PH){wrap.requestFullscreen().catch(()=>{})}else if(!on&&document.fullscreenElement){document.exitFullscreen()}
 wrap.classList.toggle('tfs',on);document.body.classList.toggle('tfs-lock',on);setTimeout(()=>m.invalidateSize(),60)}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&wrap.classList.contains('tfs')){wrap.classList.remove('tfs');document.body.classList.remove('tfs-lock');setTimeout(()=>m.invalidateSize(),60)}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&wrap.classList.contains('tfs'))fs()});
window.__tmap=m;home();upd()})();
flow();let rw=innerWidth;addEventListener('resize',()=>{if(innerWidth!==rw){rw=innerWidth;flow()}});
'''.replace('__D__',DATA).replace('__M__',json.dumps(MAPD,ensure_ascii=False)).replace('__RG__',open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'regions.json')).read())
RX=mult(rz,"base","last30").replace("×","");AX=mult(ar,"base","last30").replace("×","")
INTRO=(f'In the last 30 days, Houthi Telegram channels named Riyadh in threats {RX} times as often as in the months before, and Aramco {AX} times as often, while threats against Israel and the US fell. '
 f'On Oct 13 the Houthi military told civilians to evacuate Aramco’s headquarters, King Khalid Airport and the Riyadh refinery; on Oct 14 it claimed strikes on all three. '
 f'Based on {c["channels"]} public Telegram channels of Iran’s “Axis of Resistance”. Tap any target or bar for details; sources are in the More section.')
DESC=html.escape(f'Houthi threats now name Riyadh {RX}× and Aramco {AX}× as often as before; an Oct 13 evacuation warning was followed by claimed strikes on Oct 14.')
BRIDGE=f'Iraqi militia channels reposted Houthi military statements {iq["n"]} times in the last 30 days, a median of {dur(iq["med"])} after the original.'
MAPNOTE='Not mapped: '+', '.join(UNMAPPED)+' (no single place, or no threat posts in the last 30 days). Change compares threat posts per 10,000 Houthi posts with May–Sep. Quotes are translated from Arabic.'
WK=T.get('week',{});tl=lambda x:', '.join(x)
lk=lambda u:f'<a href="{u}" target="_blank" rel="noopener nofollow">{u.replace("https://","")}</a>'
wl=[]
if T['flag']: wl.append('<li><b>New or surging:</b> '+'; '.join(f'{html.escape(x["l"])} ({x["n7"]} posts, {x["r7"]:g} vs {x["rp"]:g} per 10,000)' if x['why']!='first' else f'{html.escape(x["l"])} (first named {nice(x["first"])}, {lk(x["url"])})' for x in T['flag'])+'</li>')
if WK.get('warns'): wl+= [f'<li><b>Warning, {w["d"]}:</b> {html.escape(tl(w["t"]))} · {lk(w["u"])}</li>' for w in WK['warns']]
else: wl.append('<li><b>Warnings:</b> no new official Houthi military warning naming a target this week.</li>')
if WK.get('claims'): wl+= [f'<li><b>Claimed strike, {c["d"]}:</b> {html.escape(tl(c["t"]))} · {lk(c["u"])}</li>' for c in WK['claims']]
WEEK=(f'<section id="week"><h2>New this week: {rng(T["end"])}</h2><p class="prompt">Houthi threat targets this week vs the 3 weeks before. Claims are the Houthis’ own.</p><ul class="wkl">{"".join(wl)}</ul></section>' if (T['flag'] or WK.get('warns') or WK.get('claims')) else f'<section id="week"><h2>New this week: {rng(T["end"])}</h2><p class="prompt">Nothing new in Houthi threats this week compared with the 3 weeks before.</p></section>')
page=f'''<!doctype html><html lang="en"><head>{GA}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Houthi threats turn to Saudi Arabia | Axis Channel Network</title><meta name="description" content="{DESC}"><meta property="og:title" content="Houthi threats turn to Saudi Arabia"><meta property="og:description" content="{DESC}"><meta property="og:image" content="https://beacon-tools.onrender.com/axis-network/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><link rel="icon" href="../favicon.svg"><style>{CSS}</style></head><body><main>
<h1>Houthi threats turn to Saudi Arabia</h1>
<p class="intro">{INTRO}</p>
<div class="thru">Data through {nice(D["data_through"])} (latest collected post) · main window: {rng(D["data_through"],30)}</div>
<div class="strip"><div class="st"><b>{c["channels"]}</b><span>channels</span></div><div class="st"><b>{f(c["posts"])}</b><span>posts collected</span></div><div class="st"><b>{f(x30)}</b><span>messages copied across groups</span></div></div>
<section id="threats"><h2>Houthi threat targets</h2><p class="thd">{thead}</p>
<div class="row"><div class="leg tleg"><div class="lghint">Tap a target for the threats</div><div class="tlh">Target type</div><span>__IC_city__City</span><span>__IC_airport__Airport</span><span>__IC_energy__Oil / energy site</span><span>__IC_military__Military base</span><span>__IC_government__Government building</span><span><i style="background:rgba(255,143,184,.45);border:2px solid #ff8fb8;border-radius:3px"></i>Province, country or strait</span><div class="tlh">Last 30 days vs before</div><span><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#e5484d" fill-opacity=".14" stroke="#e5484d" stroke-width="2"/><path d="M6 12L10 6L14 12z" fill="#e5484d"/></svg>Named more often</span><span><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#4f7dff" fill-opacity=".14" stroke="#4f7dff" stroke-width="2" stroke-dasharray="4 3"/><path d="M6 8L10 14L14 8z" fill="#4f7dff"/></svg>Named less often</span><span class="tln">Ring size = threat posts. Zoom in for exact sites, names and smaller targets.</span></div><div><div id="tmapw"><div id="tmap" role="region" aria-label="Map of Houthi threat targets"></div></div><p class="cap">{MAPNOTE}</p></div></div>
<div class="row"><div class="leg"><span><i style="background:#b24762"></i>Named more often</span><span><i style="background:#4379a8"></i>Named less often</span>
<div class="tw"><button class="btn" data-tw="30" aria-pressed="true">30 days</button><button class="btn" data-tw="7" aria-pressed="false">7 days</button></div></div>
<div><div class="lbl" id="ttitle"></div><p class="prompt">Change in threat posts naming each target, per 10,000 Houthi posts. Tap a row for counts and example posts.</p><div id="thr"></div></div></div>
<p class="cap">{tcap}</p>{tcase}{tlines}{tcave}</section>
<section id="map"><h2>How Houthi messaging spreads</h2><p class="thd">{BRIDGE}</p><h3 style="font-size:17px;margin:12px 0 4px">Which groups pass messages to which</h3><p class="prompt">Each circle is a group at its home base; lines show messages first posted by one group and later copied by another (last 30 days). Thicker lines mean more messages; moving dots show direction.</p>
<div id="net"></div><p class="cap">Line colour = the group that posted first. Hover or tap a line or circle for numbers. Pro-Axis news outlets have no single base and are placed on their own. Flows under 10 messages are left out.</p></section>
<section id="spread"><h2 style="font-size:18px">Where messages start and how they spread</h2><p class="prompt">Who posts first when the same message appears in several channels (last 30 days)</p>
<div class="row"><div class="leg"><div class="lghint">Tap a group to highlight it</div>{leg1}</div><div>{s1bar}<div class="lbl">Copied across groups, <span id="ftitle">last 30 days</span>: posted first (left) → copied by (right)</div>
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
{WEEK}
<details id="more"><summary>More: shared websites, method and sources</summary><div class="in"><p><b>Shared websites.</b> {infra}</p>
<p><b>Method.</b> A message counts as copied when the same text appears in two or more channels; the first channel to post it is the origin. Same-group copies (for example between Houthi channels) are included in the top bar; the flow chart shows only copies between different groups. Flows under 10 messages are left out.</p>
<div id="src"><b>Sources</b><ol>{''.join(f"<li>{html.escape(x)}</li>" for x in SRC)}{''.join(f"<li>{x}</li>" for x in tsrc)}</ol></div></div></details>
</main><div id="tip" role="tooltip"></div><div id="sheet" role="dialog" aria-label="Details"><button class="btn" aria-label="Close">Close</button><div></div></div><script>{JS}</script></body></html>'''
import re as _re
_GL=dict(_re.findall(r"(city|airport|energy|military|government):'(<path[^']*)'",open(__file__).read()))
_CC={'city':'#f2c94c','airport':'#3fd0e0','energy':'#ff8c42','military':'#c86bfa','government':'#5ad16b'}
for _k,_c in _CC.items(): page=page.replace(f'__IC_{_k}__',f'<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.5" fill="{_c}"/>{_GL[_k]}</svg>')
open(os.path.join(H,'..','index.html'),'w').write(page); print('ok',len(page))
