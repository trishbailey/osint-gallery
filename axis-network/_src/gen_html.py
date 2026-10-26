import json,csv
W='/home/box/agent-data/agents/39ef6fec-7081-4cce-b3bf-015c6d31f16f/irgc_work/'
M=json.load(open('model.json')); S=M['S']; OS=json.load(open(W+'dashboard/data_page.json'))['S']
M['INF']=json.load(open('infra.json')); M['MAP']=json.load(open('basemap.json')); INF=M['INF']; M['PAY']=json.load(open('pay.json')); M['PAY']['TOP']=json.load(open('paytop.json'))
js=(open('page.js').read().replace('function frame(T)',open('pay.js').read()+'\nfunction frame(T)',1)).replace('__MODEL__',json.dumps(M,ensure_ascii=False))
f=lambda n:f'{n:,}'
xc={(a,b):(n,s) for a,b,n,s in S['xcopy']}
bg=S['by_group']
CSS='''#infra .ilab.minor{display:none} #infra.showall .ilab.minor{display:inline} .fgrid.g5{grid-template-columns:repeat(6,1fr)} .fgrid.g5>:nth-child(-n+3){grid-column:span 2} .fgrid.g5>:nth-child(n+4){grid-column:span 3} @media(max-width:1000px){.fgrid.g5{grid-template-columns:1fr 1fr} .fgrid.g5>*{grid-column:auto!important} .fgrid.g5>:last-child{grid-column:1/-1!important}} @media(max-width:600px){.fgrid.g5{grid-template-columns:1fr}} .fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:14px 0} .fcard{background:#fff;border:1px solid #e4e4e4;border-left:6px solid #555;border-radius:10px;padding:14px 16px;line-height:1.55} .frow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px} .farr{font-weight:800;color:#555} .fh{font-weight:800;font-size:16.5px;line-height:1.3;margin-bottom:6px} .fs{font-size:14.5px;color:#333} .fv{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12.5px;color:#555} .fv b{font-size:26px;line-height:1} .fbar{width:110px;height:10px;background:#eee;border-radius:5px;overflow:hidden} .fbar i{display:block;height:100%} .fdots{display:inline-flex;gap:3px} .fdots i{width:9px;height:9px;border-radius:50%;display:inline-block} @media(max-width:760px){.legend{position:static!important;gap:6px!important} .legend .lg{display:none} .ibox{position:static!important;margin-top:8px} #infra>svg{width:100%!important} .fgrid{grid-template-columns:1fr}} .ilegend{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 8px;font-size:13px} .intro{font-size:17px;line-height:1.5;margin:6px 0 8px} .howto{font-size:14px;background:#f3f6f8;border-left:4px solid #555;padding:6px 10px;margin:4px 0 8px} @media(max-width:760px){main{padding:8px!important} .card{padding:10px!important} h1{font-size:21px!important} .legend{font-size:11px!important} .metrics,.grid{grid-template-columns:repeat(2,1fr)!important} svg{max-width:100%;height:auto} .haspop>svg{width:100%!important} .pop{position:static!important;margin-top:8px} .popline{display:none!important} table{display:block;overflow-x:auto}} body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f6f6f4;color:#222}main{max-width:1160px;margin:0 auto;padding:22px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:0 0 8px;display:flex;align-items:center;gap:8px}.sub{color:#555;font-size:14px}
.card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:16px;margin:16px 0}.cap{font-size:12px;color:#666;margin-top:6px}
.find{background:#f7f7f2;border-left:4px solid #888;padding:8px 14px;margin-top:10px;font-size:14px}.find ul{margin:4px 0 0 18px;padding:0}.find li{margin:3px 0}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;align-items:center;position:sticky;top:0;background:#fffffff2;padding:8px 10px;border-bottom:1px solid #ddd;z-index:3}
.lg{display:inline-flex;align-items:center;gap:5px}.ring{display:inline-flex;width:24px;height:24px;border-radius:50%;border:3px solid;overflow:hidden;background:#fff;align-items:center;justify-content:center;font-size:8px}.ring img{width:100%;height:100%;object-fit:cover}.ring.sm{width:22px;height:22px}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.m{background:#fff;border:1px solid #e3e3e3;border-radius:8px;padding:10px;border-top:4px solid #888}.m .v{font-size:26px;font-weight:700}.m .k{font-size:11px;text-transform:uppercase;color:#777}.m .d{font-size:11px;color:#777}
.bars{flex:1;min-width:300px}.br{display:flex;align-items:center;font-size:12px;margin:3px 0}.br span{width:150px;padding-left:5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.br i{display:inline-block;height:12px;margin-right:6px}
.chip{display:inline-flex;align-items:center;gap:3px;border:1.5px solid;border-radius:10px;padding:0 6px 0 3px;font-weight:700;font-size:.92em;line-height:1.5;background:#fff;white-space:nowrap;vertical-align:baseline}.chip i{display:inline-block;width:9px;height:9px;border-radius:50%}.chip img{width:14px;height:14px;border-radius:50%;object-fit:cover}
.sw{display:inline-block;width:12px;height:12px;border-radius:50%}.sw.sq{border-radius:1px}.sw.dia{border-radius:1px;transform:rotate(45deg) scale(.85)}.tag{font-style:normal;font-size:10px;font-weight:800;border:1.5px solid;border-radius:6px;padding:0 3px;margin-right:5px}
.corner{position:absolute;background:#ffffffee;border:1px solid #ccc;border-radius:8px;padding:8px 10px;font-size:12px;z-index:9;box-shadow:0 1px 4px #0002}.corner .cl{display:flex;align-items:center;gap:5px;margin:2px 0}.corner .ct{font-size:12px;display:block;margin-bottom:3px}.corner .ck{font-size:10.5px;color:#333;margin-top:5px;line-height:1.5}.corner .ring{width:20px;height:20px;border-width:2.5px}
.haspop{min-height:0}.pop{display:none;position:absolute;top:0;background:#fff;border:2.5px solid;border-radius:10px;padding:8px 10px;font-size:12px;box-shadow:0 2px 10px #0003;z-index:6;max-height:600px;overflow:auto}.pop .ph{display:flex;align-items:center;gap:6px;font-size:15px;border-bottom:2px solid;padding-bottom:4px;margin-bottom:4px}.pop ol{margin:4px 0;padding-left:22px}.pop ol.cols{columns:2;column-gap:14px}.pop li{break-inside:avoid;font-size:11.5px;line-height:1.45}.pop i{color:#666;font-style:normal}.popline{position:absolute;left:0;top:0;pointer-events:none;display:none;z-index:5;overflow:visible}
.wtm{margin-top:10px;background:#eef4fb;border:1px solid #b9cde4;border-radius:8px;padding:8px 12px}.wtm b{font-size:14px}.wtm p{margin:4px 0 0;font-size:14.5px;line-height:1.5}
#rank{display:flex;gap:18px;flex-wrap:wrap}.storyhead{font-size:14px;min-height:64px}.small{font-size:12px;color:#666}.grid2{display:flex;gap:20px;flex-wrap:wrap}.grid2>div{flex:1;min-width:320px} .pbrow{display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap} .pbl{width:270px;display:flex;align-items:center;gap:6px} .pbbar{flex:1;min-width:240px;display:flex;height:26px;border-radius:6px;overflow:hidden;border:1px solid #ddd} .pseg{border:0;color:#fff;font-weight:800;font-size:12px;cursor:pointer;padding:0} .pseg.on{outline:3px solid #000;outline-offset:-3px} .pnwrap{display:flex;gap:14px;flex-wrap:wrap} #paynet{display:flex;gap:14px;flex-wrap:wrap} .pnsvg{flex:3;min-width:300px;width:100%;border:1px solid #eee;border-radius:8px;touch-action:manipulation}  .ptr{border:1px solid #e4e4e4;border-left:6px solid #2e7d32;border-radius:8px;margin:6px 0;background:#fff} .ptr summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 10px} .ptr summary::-webkit-details-marker{display:none} .ptr .rk{background:#2e7d32;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px} .ptr .val{font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:14px;word-break:break-all} .ptr .ty{border:1.5px solid #2e7d32;color:#2e7d32;border-radius:6px;padding:0 5px;font-size:11px;font-weight:800} .ptr .nm{flex:1 1 260px;font-size:13.5px} .ptr .ct{font-size:12.5px;color:#555;white-space:nowrap} .ptr .bd{padding:0 12px 10px 44px;font-size:13px;line-height:1.5} .ptr.dim{opacity:.25} .ptr.hl{box-shadow:0 0 0 3px #2e7d3255} .pinfo{flex:1;min-width:220px;border:2px solid #9e9e9e;border-radius:10px;padding:8px 10px;font-size:12.5px;align-self:flex-start} .flow{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap} .fstep{flex:1;min-width:230px;border:1px solid #ddd;border-top:5px solid #555;border-radius:10px;padding:10px 12px;font-size:13.5px;line-height:1.5;background:#fff} .fstep h4{margin:0 0 4px;font-size:15px} .farrow{align-self:center;font-size:26px;color:#777;font-weight:800} .stag{display:inline-block;border:1.5px solid #b71c1c;color:#b71c1c;border-radius:6px;padding:0 6px;font-size:11.5px;font-weight:800;margin:2px 2px 0 0} .inf{display:inline-block;border:1.5px dashed #6a1b9a;color:#6a1b9a;border-radius:6px;padding:0 5px;font-size:11px;font-weight:800} .unv{display:inline-block;border:1.5px dashed #8d6e63;color:#6d4c41;border-radius:6px;padding:0 5px;font-size:11px;font-weight:800} .mono{font-family:ui-monospace,Menlo,monospace;word-break:break-all;font-size:12px} .fn{font-size:11.5px;color:#555;word-break:break-all} @media(max-width:760px){.farrow{transform:rotate(90deg);width:100%;text-align:center}.pbl{width:100%}}'''
from chips import chipify
GCOL={x['id']:x['color'] for x in M['G']}
def _viz(v,c):
    if not v: return ''
    k=v[0]
    if k=='num': return f'<div class="fv"><b style="color:{c}">{v[1]}</b><span>{v[2]}</span></div>'
    if k=='bar': return f'<div class="fv"><div class="fbar"><i style="width:{v[1]*100:.0f}%;background:{c}"></i></div><span>{v[1]*100:.0f}% {v[2]}</span></div>'
    if k=='dots': n=round(v[1]*10); return '<div class="fv"><span class="fdots">'+''.join(f'<i style="background:{c if i<n else "#e3e3e3"}"></i>' for i in range(10))+f'</span><span>{v[1]*100:.0f}% {v[2]}</span></div>'
    return ''
def fnd(items):
    out=[]
    for it in items:
        a,b,h,t=it[:4]; v=it[4] if len(it)>4 else None
        c=GCOL.get(a or b,'#555')
        row=''
        if a or b:
            ch=lambda g:f'<span data-chip="{g}"></span>' if g else '<span class="small">all groups</span>'
            row='<div class="frow">'+ch(a)+(' <span class="farr">→</span> '+ch(b) if b else '')+'</div>'
        if not (a or b): row='<div class="frow"><span class="chip" style="border-color:#555;color:#333;padding:0 8px">All groups</span></div>'
        out.append(f'<div class="fcard" style="border-left-color:{c}">{row}<div class="fh">{h}</div><div class="fs">{chipify(t)}</div>{_viz(v,c)}</div>')
    return '<div class="fgrid'+(' g5' if len(out)==5 and any(x[2].startswith('Nearly half of repeats') for x in items) else '')+'">'+''.join(out)+'</div>'
def card(g,label,val,desc): return f'<div class="m" style="border-top-color:{dict((x["id"],x["color"]) for x in M["G"]).get(g,"#888")}"><div class="k">{label}</div><div class="v">{val}</div><div class="d">{desc}</div></div>'
logos=list(csv.DictReader(open(W+'dashboard/logos/logos.csv')))
credits='; '.join(f'{r["GROUP"]}: {r["SOURCE_URL"]} ({r["LICENSE"]})' for r in logos if r['FILE'])
eh=OS['eitaa_hist']; ehm=max(eh)
eitaa_svg='<svg viewBox="0 0 420 250" width="100%"><defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#333"/></marker></defs><circle cx="215" cy="12" r="5" fill="#229ED9"/><text x="215" y="30" font-size="11.5" font-weight="700" fill="#1b7fb0" text-anchor="middle">Telegram (original post)</text><line x1="225" x2="395" y1="12" y2="12" stroke="#333" stroke-width="1.5" marker-end="url(#arw)"/><text x="410" y="16" font-size="11.5" font-weight="700" text-anchor="end" dy="16">Eitaa (copy later)</text><text x="20" y="16" font-size="11" fill="#555" dy="16">← Eitaa posted first</text><g transform="translate(0,34)">'+''.join(f'<rect x="{20+i*13}" y="{170-v/ehm*150:.1f}" width="11" height="{max(0.5,v/ehm*150):.1f}" fill="#2e7d32" opacity="{0.55 if i<15 else 1}"/>' for i,v in enumerate(eh))+'<line x1="215" x2="215" y1="10" y2="172" stroke="#333" stroke-dasharray="3 2"/><text x="20" y="190" font-size="10">−30 min (Eitaa first)</text><text x="410" y="190" font-size="10" text-anchor="end">+30 min (Telegram first)</text><text x="232" y="30" font-size="10">137 posts within ±1 min</text></g><text x="215" y="245" font-size="11.5" font-weight="700" text-anchor="middle">Time from Telegram post → copy on Eitaa</text></svg>'
xl=OS['x_lags']; m=max(abs(r[3]) for r in xl)
gcol={'almayadeen':'#9e9e9e','manarbreaking':'#f9a825'}
def _xrow(i,r):
    w=max(1.5,(abs(r[3])/m)**.5*120); y=20+i*20; v=abs(r[3]); vt=f"{v if v<60 else round(v/60,1)}{' s' if v<60 else ' min'}"
    fill=gcol.get(r[1],"#c62828"); cw=5.6  # approx px per char at 10px
    s=f'<text x="185" y="{y}" font-size="10" text-anchor="end">{r[1]} → {r[2]}</text>'
    if r[3]>=0:
        s+=f'<rect x="310" y="{y-10}" width="{w:.1f}" height="13" fill="{fill}"/><text x="{310+w+3:.1f}" y="{y}" font-size="10">+{vt}</text>'
        return s
    x0=310-w; s+=f'<rect x="{x0:.1f}" y="{y-10}" width="{w:.1f}" height="13" fill="{fill}"/>'
    full=f"X first −{vt}"; short=f"−{vt}"
    if x0-3-len(full)*cw>=192: s+=f'<text x="{x0-3:.1f}" y="{y}" font-size="10" text-anchor="end">{full}</text>'
    elif w>=len(full)*cw+8: s+=f'<text x="{x0+4:.1f}" y="{y}" font-size="10" fill="#fff" font-weight="700">{full}</text>'
    else: s+=f'<text x="{x0-3:.1f}" y="{y}" font-size="10" text-anchor="end">{short}</text>'
    return s
x_svg='<svg viewBox="0 0 460 280" width="100%"><defs><marker id="arx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#333"/></marker></defs><circle cx="310" cy="12" r="5" fill="#229ED9"/><text x="300" y="16" font-size="11.5" font-weight="700" fill="#1b7fb0" text-anchor="end">Telegram (original post)</text><line x1="320" x2="440" y1="12" y2="12" stroke="#333" stroke-width="1.5" marker-end="url(#arx)"/><text x="455" y="31" font-size="11.5" font-weight="700" text-anchor="end">X (first copy)</text><text x="300" y="31" font-size="11" fill="#555" text-anchor="end">← X posted first</text><g transform="translate(0,36)">'+''.join(_xrow(i,r) for i,r in enumerate(xl))+'<line x1="310" x2="310" y1="5" y2="215" stroke="#229ED9" stroke-width="2"/></g><text x="310" y="274" font-size="11.5" font-weight="700" text-anchor="middle">Time from Telegram post → first copy on X</text></svg>'
sab=S['sab_out']; att=S['att']
body=f'''<div class="legend" data-legend></div><main>
<h1>How messages travel between Iran's allied armed groups on Telegram</h1>
<div class="intro">Iran and its allied armed groups run hundreds of Telegram channels. We collected a month of their public posts (20 Sep – 20 Oct 2026) and tracked when the same message appeared on channels belonging to different groups. The map shows which groups pass messages to which.</div>
<div class="sub">Groups: Iran's Revolutionary Guard (IRGC) and Iranian state media, Hezbollah, the Houthis, Hamas and Hamas-aligned media, Palestinian Islamic Jihad (PIJ), Iraqi militias, and pro-Axis news outlets such as Al Mayadeen. All times are US Eastern. The graphics play on their own and loop.</div>
<div class="card metrics">
{card('irgc','Telegram channels studied',f(S['channels']),'across 7 groups')}{card('houthi','Posts collected',f(S['posts']),'over one month')}
{card('hamas','Messages that reached another group',f(S['xclusters']),'same wording seen on another group’s channel')}{card('iraqi','Repeats that name no source','44.6%','of later posts repeating earlier wording')}
{card('hezbollah','Open forwards between groups',f(S['xref_total']),'forwards, links or mentions of another group’s channel')}{card('pij','Typical delay, Telegram to X',f"{OS['x_median_first']:.0f} seconds",'until the first copy on X')}</div>

<div class="card"><h2>1. Map: which groups pass messages to which</h2>
<div class="howto"><b>How to read this:</b> each badge is a group, placed at its home base. Moving dots are messages turning up later on another group’s channels; thicker lines mean more messages.</div><div id="net"></div>
<div class="cap">Solid line = the later post forwards or names the source. Dashed = same words, no source named. Dotted = both likely took it from the same statement. Hover or tap a badge to list its channels.</div>
{fnd([('houthi','irgc',"Houthi messages surface on Iranian state channels","Houthi wording often reappears later on Iranian state outlets, usually with no source named.",('num','310','messages')),
('aligned','hezbollah',"Pro-Axis outlets feed Hezbollah channels most","The biggest single stream runs from outlets such as Al Mayadeen into Hezbollah channels, almost never credited.",('num','902','messages')),
('hamas','irgc',"Hamas-aligned news resurfaces on Iranian channels","Messages from Hamas-aligned channels also turn up on Iranian and Hezbollah channels, almost always uncredited.",('num','122','messages')),
('houthi','hezbollah',"Hezbollah openly forwards Houthi posts","This is the one route where most later posts forward or name the Houthi outlet.",('bar',142/222,'forward or name the source')),
(None,None,"Nearly half of repeats name no source","Later posts repeating another channel's words usually say nothing about where they came from.",('dots',0.446,'name no source'))])}<div class="wtm"><b>What this means</b><p>Messages move between these groups every day, mostly from Iranian, Houthi and pro-Axis news outlets toward Hezbollah and Iraqi channels. Most later posts repeat the words without saying where they came from, so readers cannot tell where a claim began. Matching words can also come from a shared statement, so this shows a common supply of material, not proof that one channel copied another.</p></div></div>

<div class="card"><h2>2. Where shared messages go, group by group</h2><div id="sankey"></div>
<div class="cap">Each band starts at the group that posted a message first (left) and ends at the group where the same words appeared later (right). Thicker bands mean more messages.</div>
{fnd([(None,None,"Messages regularly cross group lines","Thousands of messages first posted by one group later appeared on another group's channels.",('num',f(S['xclusters']),'messages')),
(None,None,"Open forwards are the exception","Plain repeated wording is far more common than forwards or links between groups.",('num',f(S['xref_total']),'open forwards')),
('houthi','irgc',"Many Houthi repeats share one source","Many repeated Houthi messages name the Yemeni military spokesman, so a shared statement is the likely origin.")])}<div class="wtm"><b>What this means</b><p>This chart adds up where shared messages end up. The biggest stream runs from pro-Axis news outlets such as Al Mayadeen into Hezbollah’s channels, usually within minutes and without naming the source. In practice the network behaves much like one shared newsroom.</p></div></div>

<div class="card"><h2>3. The busiest channels and who they feed</h2><div id="ring"></div>
<div class="cap">The busiest channels, grouped by colour around the ring. Badges mark hubs, channels whose messages often reappear elsewhere. Line styles as in the map.</div>
{fnd([('iraqi',None,"Sabereen News leads Iraqi militia channels","Its messages reappear on many other Iraqi militia channels, usually within minutes."),
('hamas',None,"The two Shehab channels mirror each other","Most of their posts are identical, but we count them as separate channels."),
('hamas',None,"Official Hamas and PIJ channels are silent","Their statements reach Telegram through news channels such as QudsN, Shehab and Palinfo."),
('hamas',None,"Safa's role is under-counted","Safa adds its own prefix to posts, so exact-wording matching misses many of its repeats.")])}<div class="wtm"><b>What this means</b><p>A small number of large channels supply messages that many smaller ones carry. If a claim starts at one of these hubs, it can spread across the network within minutes.</p></div></div>

<div class="card"><h2>4. Day by day: messages reaching another group</h2><div id="lapse"></div>
<div class="cap">Each bar is one day, coloured by the group that posted first. The counter keeps a running total.</div>
{fnd([(None,None,"Sharing happens every single day","Messages cross between groups on every day of the month, not just around big events.",('num','31 of 31','days'))])}<div class="wtm"><b>What this means</b><p>Sharing between groups is routine and happens every day of the month. That points to an everyday habit rather than one-off campaigns.</p></div></div>

<div class="card" style="border:2px solid #555"><h2>5. Four messages, replayed as they spread</h2><div id="story"></div>
<div class="cap">Each row is one channel or X account; the clock is sped up. Filled dot = first post or an open forward; hollow dot = same words, no source named.</div>
{fnd([(None,None,"Repeats follow within seconds","The second channel typically posts the same words within a minute of the first.",('num',f"{S['lag']['2'][0]*60:.0f} s",'typical gap')),
('houthi','hezbollah',"A helicopter video spread in minutes","Houthi military media posted it first; Hezbollah channels and X accounts followed within minutes."),
('hamas','irgc',"QudsN wording reached Al-Alam within seconds","No source was named, though both may have used the same statement.")])}<div class="wtm"><b>What this means</b><p>Each replay follows one message from its first post to the last channel that carried it. The same words often appear on several channels within minutes. Most of those later posts do not say where the message first appeared.</p></div></div>

<div class="card"><h2>6. Which channels start messages, and which pass them on</h2><div id="rank"></div>
<div class="cap">Starters: messages a channel posted first that later appeared elsewhere. Passers-on: messages it posted after another channel.</div>
{fnd([('houthi',None,"Sadaa al-Masirah (@sadaa_almasirah) starts the most messages","A handful of channels start most shared material; many others mainly pass it on.")])}<div class="wtm"><b>What this means</b><p>A few channels start most of the shared material, while others mainly pass it on. Knowing which is which shows where a claim probably began.</p></div></div>

<div class="card"><h2>7. How fast messages jump to Eitaa and X</h2><div class="grid2"><div><b>Telegram to Eitaa (an Iranian messaging app): delay for IRGC channels</b>{eitaa_svg}</div><div><b>Telegram to X: delay until the first copy</b>{x_svg}</div></div>
<div class="cap">Eitaa: matched posts from IRGC channels that run on both apps. X: the first X post found for each traced message.</div>
{fnd([('irgc',None,"IRGC channels post to Eitaa at once","Most core IRGC channels publish the same item on Eitaa at almost the same moment.",('bar',136/183,'near-simultaneous')),
('aligned',None,"Al Mayadeen reaches X almost instantly","Its X account posts within a second of its Telegram post.",('num','<1 s','to X')),
('houthi',None,"Some Houthi outlets post on X first","Some Almasirah accounts occasionally put items on X before Telegram.")])}<div class="wtm"><b>What this means</b><p>Iranian outlets often post the same item on Telegram and Eitaa at once, which suggests one team runs both. Some outlets reach X within seconds, so a claim can jump platforms almost immediately.</p></div></div>

<div class="card"><h2>8. Shared web infrastructure behind the channels</h2><div id="infra"></div>
<div class="cap">Websites named in the channels and the public internet records behind them. Circle = website, square = server address, triangle = name server, hexagon = hosting company, diamond = tracking ID, person = registrant, rectangle = email. Grey = no group. Dashed = reported elsewhere, not re-checked. Dotted grey = weak link (shared commercial hosting only). A private person’s record is hidden. Hover or tap a shape to see its source.</div>
{fnd([('irgc',None,"Bonyad Mostazafan runs its own name servers","Sites tied to the foundation, sanctioned by the US in 2020, sit on its own name servers.",('num','7','sites')),
('pij',None,"PIJ's site runs on Iranian DNS","saraya.ps uses an Iranian DNS provider and a Russian server; VirusTotal flags it as malicious.",('num','3','malicious detections')),
('houthi',None,"A Houthi video platform sits on TeleYemen","meyon.com.ye, a video site carrying Houthi-linked playlists, is hosted by Yemen's state telecom."),
('hamas',None,"A fake Qassam site sought donations","alqassambrigade.com copied the Qassam Brigades site; its fund@ and info@ addresses belong to the copy.")])}
<div class="wtm"><b>What this means</b><p>Behind the channels sit websites, and colours show which group’s channels posted or linked each one, not who owns it. Sites tied to Bonyad Mostazafan, an Iranian foundation under US sanctions, share their own name servers, and the PIJ armed wing’s site relies on an Iranian DNS provider. The only overlap between groups is weak: a now-suspended site shares cheap Iranian shared hosting with an IRGC-linked site, which many unrelated sites also use.</p></div></div>

<div class="card" id="payments"><h2>9. How the channels ask for money</h2>
<div class="sub">Payment details posted in public channel posts: bank cards, IBANs, crypto wallets and phone numbers. Values are shown in full. We scanned {f(567044)} posts from 140 channels; {len(M['PAY']['C'])} channels posted at least one detail.</div>
<h3 style="margin:14px 0 4px">9a. Which payment methods each group uses</h3><div id="paybar"></div>
<div class="wtm"><b>What this means</b><p>IRGC-linked channels mostly ask for money through Iranian bank cards and bank accounts, which work inside Iran's own banking system. The Gaza Now channels instead use a crypto wallet and Egyptian mobile-money numbers, which can be paid from abroad. One Iraqi militia channel posted a single donation phone number.</p></div>
<h3 style="margin:18px 0 4px">9b. Top IRGC fundraising campaigns and payment details</h3>
<div class="cap">Ranked by the number of IRGC-linked channels that posted each detail, then by number of posts. Tap a row for the full note and the channels. Names are translated from Persian.</div>
<div class="small" style="margin:6px 0"><b>No payment detail was posted by channels in more than one group.</b></div>
<div id="paytop"></div>
<div class="wtm"><b>What this means</b><p>The bank details that IRGC-linked channels share most widely are for religious and charity causes: Arbaeen pilgrim stations, children's medical bills and a sheep-sacrifice campaign for the Leader's health. The same small set of channels, led by @sepahcybery, @sepah and @sarbazane_g, posts every one of them. That suggests coordinated promotion rather than many separate appeals.</p></div>
<h3 style="margin:18px 0 4px">9c. Worked example: one Gaza Now crypto appeal, from post to exchange</h3>
<div class="flow">
<div class="fstep" style="border-top-color:#00897b"><h4>1. The appeal</h4><span data-chip="hamas">Gaza Now</span> <span class="stag">OFAC SDGT, 27 Mar 2024</span><span class="stag">UK sanctions</span> <span class="stag">Hamas: US FTO and SDGT</span><sup>a</sup>
<p style="margin:6px 0 0">X account <b>@nowgnna</b> (“غزة الآن - Gaza Now”, about 474,000 followers) first posted the wallet on <b>5 Sep, 3:29 PM ET</b>, asking for money to buy water for a Gaza City camp. Another account reposted it on 6 Sep. @nowgnna posted it four more times on <b>7–8 Oct</b>, and the Telegram channels gazaalannet and gazaalanpa posted it four times on the same days. The 8 Oct posts also listed one InstaPay and four Vodafone Cash numbers in Egypt.</p>
<p class="small" style="margin:4px 0 0">The US list names “GAZAALANNET” as an alias, but we have not confirmed that these accounts are run by the sanctioned entity.</p></div>
<div class="farrow">→</div>
<div class="fstep" style="border-top-color:#5e35b1"><h4>2. The wallet</h4><div class="mono">0x33c5df0bf813be615c9513c307ac1a555ef997cb</div><span class="small">USDT on BNB Smart Chain (posted as “USDT BEB20”) · not on the US sanctions list</span>
<p style="margin:6px 0 0">First funded with 0.1378 BNB on 4 Sep at 4:59 PM ET (20:59:42 UTC) by an unlabeled personal wallet, <b>about 22.5 hours before @nowgnna’s original 5 Sep post</b><sup>b</sup>. No USDT moved until <b>7 Oct, 5:40 PM ET</b>. It then received <b>210.928 USDT</b> in 7 transfers from 6 senders, up to 16 Oct; 87% came from wallets tagged as Binance and MEXC.</p></div>
<div class="farrow">→</div>
<div class="fstep" style="border-top-color:#f9a825"><h4>3. The exchange</h4><div class="mono">0xf440139a62b2b939699c5b3e09f88e40464ab9bc</div><span class="small">Public tag: “Bybit 35 (Exchange)”</span>
<p style="margin:6px 0 0">The wallet sent <b>188.388 USDT</b> in two transfers, each emptying the balance within 2 minutes of a deposit, to this Bybit-tagged address. That suggests the collection wallet is a Bybit customer deposit address <span class="inf">inferred</span>, based on flow behaviour and public tags; Bybit has not confirmed it. <b>22.54 USDT</b> was still held on 21 Oct.</p></div>
</div>
<div class="wtm"><b>What this means</b><p>A sanctioned media brand advertised a new, unlisted wallet, so the money avoided the addresses already blocked. The sums are small, about $211, but the trail ends at a major exchange, which may hold identity records for the account. The Egyptian mobile-money numbers in the same posts cannot be traced from public data.</p></div>
<div class="fn" style="margin-top:8px">Facts from the Beacon Intelligence Group report (21 Oct 2026). <sup>a</sup> https://www.state.gov/foreign-terrorist-organizations/ · https://home.treasury.gov/news/press-releases/jy2213 · https://ofac.treasury.gov/recent-actions/20240327 · https://www.gov.uk/government/news/new-sanctions-on-persons-linked-to-hamas-supporting-media-network · https://x.com/nowgnna/status/2096319900461543718 · https://bscscan.com/address/0x33c5df0bf813be615c9513c307ac1a555ef997cb · https://etherscan.io/address/0xf440139a62b2b939699c5b3e09f88e40464ab9bc · <sup>b</sup> https://bscscan.com/tx/0x4dbeb729b39bcac90f895ea3fa41627cad1f472c0d467304127874f8c1ac5280</div>
</div>

<div class="small" style="margin:8px 0 24px">Emblems: {credits}. Credit: Beacon Intelligence Group.</div></main>'''
for gid,sec in [('irgc','1. Group'),]: pass
GA="""<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z61EKRP8QV"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());  gtag('config', 'G-Z61EKRP8QV');</script>"""
html=f'<!doctype html><html><head>{GA}<meta charset="utf-8"><title>Axis channel flows, 20 Sep – 20 Oct 2026</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style></head><body data-pop="1">{body}<script>{js}</script></body></html>'
exec(open('themes.py').read()); _A='<div class="small" style="margin:8px 0 24px">Emblems'; html=html.replace(_A,open('themes_sec.html').read()+_A,1)
open(W+'dashboard/axis_flow_dashboard_2026-10-22_v7_10.html','w').write(html)
# kiosk page for video/cards
K=f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS} body{{width:1280px;height:720px;overflow:hidden;background:#fff}} .legend{{position:static;border:0;padding:4px 18px}} #net{{width:1010px;margin:-6px 0 0 0}} .hd{{display:flex;justify-content:space-between;align-items:baseline;padding:10px 18px 0}}</style></head><body>
<div class="hd"><b style="font-size:24px">How messages travel between Iran’s allied groups on Telegram</b><b style="font-size:20px" id="day"></b><span style="font-size:13px;color:#555">Beacon Intelligence Group</span></div><div id="net"></div><div class="corner" data-corner style="right:14px;top:52px;width:228px"></div>
<div style="position:absolute;bottom:8px;left:18px;font-size:12px;color:#555">Badges sit at each group’s home base. Moving dots are messages turning up later on another group’s channels; thicker lines mean more. Solid = forwarded or source named · dashed = same words, no source · dotted = likely a shared statement. Public Telegram posts, 20 Sep – 20 Oct 2026, {f(S['channels'])} channels, {f(S['posts'])} posts.</div>
<script>{js};const dd=document.getElementById('day');const T0=QT!==null?+QT:0;dd.textContent=DAYS[Math.floor(T0/1.2)%31]+' 2026';</script></body></html>'''
open('kiosk.html','w').write(K)
print(len(html))
