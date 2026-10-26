(async function(){
const J=n=>fetch('data/'+n+'.json').then(r=>r.json());
const [H,ST,MX,BU,NET,TONE,SP,ACC,PO,WORLD]=await Promise.all(['headline','stream','matrix','bursts','network','tone','spread','accounts','posts'].map(J).concat([fetch('vendor/countries-50m.json').then(r=>r.json())]));
const countries=topojson.feature(WORLD,WORLD.objects.countries).features.filter(f=>f.properties.name!=='Antarctica');
const fmt=d3.format(','),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KIND={post:['Original post','#4fc3b0'],repost:['Repost','#e8a33d'],quote:['Quote','#c46ad6'],reply:['Reply','#5d8fe6']};
const TPC=['#4e9fe0','#e0703c','#5cbf7a','#b36bd6','#e6c34a'];
const TYPES={'Foreign ministry':'#e05a5a','Embassy':'#4e9fe0','Consulate':'#5cbf7a','Diplomat':'#e6b33a','Outside account':'#b36bd6'};
const TONEB=[['Strongly cooperative','#3a86d6',-1,-0.6],['Cooperative','#45c1b4',-0.6,-0.2],['Mixed','#d9c255',-0.2,0.2],['Confrontational','#e8833a',0.2,0.6],['Strongly confrontational','#d6455d',0.6,1.01]];
const toneCol=s=>s==null?null:TONEB.find(b=>s>=b[2]&&s<b[3])[1];
const accType={};ACC.forEach(a=>accType[a.h]=a.type);
let on=new Set(Object.keys(TYPES));
const tip=d3.select('#tip');
function showTip(e,h){tip.html(h).attr('hidden',null);const w=tip.node().offsetWidth,hh=tip.node().offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+hh>innerHeight-8)y=e.clientY-hh-14;tip.style('left',Math.max(4,x)+'px').style('top',Math.max(4,y)+'px')}
function hideTip(){tip.attr('hidden',true)}
function tipOn(sel,f){sel.on('mouseenter mousemove',(e,d)=>showTip(e,f(d))).on('mouseleave',hideTip).on('touchstart',(e,d)=>{showTip(e.touches[0],f(d))},{passive:true})}
const fd=s=>new Date(s).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
const fday=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
// ---- header
d3.select('#cover').text(`Coverage: ${fday(H.start.slice(0,10))} to ${fd(H.end)}, ${H.days} days. Collection is ongoing and later posts are added daily.`);
d3.select('#heads').selectAll('div').data([[H.accounts,'accounts tracked'],[H.active,'posted in this period'],[H.posts,'posts collected'],[H.countries,'countries and organisations'],[H.clusters,'messages shared by 3+ accounts'],[H.bursts,'synchronized bursts']]).join('div').attr('class','head').html(d=>`<b>${fmt(d[0])}</b><span>${d[1]}</span>`);
// ---- legends and filters
const lg=(id,items,sq)=>d3.select(id).selectAll('div').data(items).join('div').html(d=>`<span class="sw ${sq?'sq':''}" style="background:${d[1]}"></span>${esc(d[0])}`);
lg('#lg-kind',Object.values(KIND));lg('#lg-tp',ST.series.map((s,i)=>[s.name,TPC[i]]),1);lg('#lg-tone',TONEB,1);
d3.select('#types').selectAll('button').data(Object.entries(TYPES)).join('button').attr('class','tg').attr('aria-pressed','true').html(d=>`<span class="sw" style="background:${d[1]}"></span>${d[0]}`)
 .on('click',function(e,d){on.has(d[0])?on.delete(d[0]):on.add(d[0]);this.setAttribute('aria-pressed',on.has(d[0]));drawSpread(true);drawNet()});
const side=document.getElementById('side'),ft=document.getElementById('ftoggle');
ft.onclick=()=>{side.classList.toggle('open');ft.setAttribute('aria-expanded',side.classList.contains('open'))};
document.getElementById('sclose').onclick=()=>{side.classList.remove('open');ft.setAttribute('aria-expanded','false')};
// ---- talking point picker
let cur=0;
const sel=d3.select('#tp');sel.selectAll('option').data(SP).join('option').attr('value',(d,i)=>i).text(d=>`${d.name} (${d.accounts} accounts)`);
sel.on('change',function(){setTP(+this.value)});
d3.select('#chips').selectAll('button').data(SP).join('button').text(d=>d.name).on('click',(e,d)=>setTP(SP.indexOf(d)));
function setTP(i){cur=i;sel.property('value',i);d3.select('#chips').selectAll('button').attr('aria-pressed',(d,j)=>j===i);d3.select('#tpdesc').text(SP[i].desc);stop();drawSpread();play()}
// ---- spread map
const W=Math.max(320,document.getElementById('map').clientWidth),HM=Math.round(W*0.5);
const proj=d3.geoNaturalEarth1().fitExtent([[4,4],[W-4,HM-4]],{type:'Sphere'}),path=d3.geoPath(proj);
const msvg=d3.select('#map').append('svg').attr('viewBox',`0 0 ${W} ${HM}`).attr('role','img').attr('aria-label','World map of accounts posting the selected talking point');
msvg.append('path').attr('d',path({type:'Sphere'})).attr('fill','#0f1b31');
msvg.append('g').selectAll('path').data(countries).join('path').attr('d',path).attr('fill','#1b2c4a').attr('stroke','#2c426b').attr('stroke-width',.4);
const gA=msvg.append('g'),gD=msvg.append('g');
const mlab=msvg.append('text').attr('x',14).attr('y',HM-14).attr('font-size',15).attr('font-weight',600).style('fill','#c8a24a');
let pts=[],t0,t1,timer=null,pos=1;
function jitter(list){const seen={};return list.map(s=>{const k=s.country;const n=seen[k]=(seen[k]||0)+1;const p=proj(s.ll);const a=n*2.4,r=n>1?3+2.2*Math.sqrt(n):0;return Object.assign({},s,{x:p[0]+r*Math.cos(a),y:p[1]+r*Math.sin(a)})})}
function drawSpread(keep){const c=SP[cur];t0=+new Date(c.first);t1=Math.max(+new Date(c.last),t0+3600e3);
 pts=jitter(c.spread.filter(s=>s.ll&&on.has(accType[s.h]||'Outside account')));
 d3.select('#sp-sub').text(`${c.name}: ${c.n} posts from ${c.accounts} accounts in ${c.countries} countries and organisations, ${fd(c.first)} to ${fd(c.last)}. Lines run from the first account to post it.`);
 const o=pts[0];
 gA.selectAll('path').data(pts.slice(1),d=>d.id).join('path').attr('fill','none').attr('stroke','#c8a24a').attr('stroke-opacity',.35).attr('stroke-width',1)
  .attr('d',d=>{const mx=(o.x+d.x)/2,my=(o.y+d.y)/2-Math.abs(o.x-d.x)*.18;return `M${o.x},${o.y}Q${mx},${my} ${d.x},${d.y}`});
 const dots=gD.selectAll('circle').data(pts,d=>d.id).join('circle').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',(d,i)=>i?5:8).attr('fill',d=>KIND[d.k][1]).attr('stroke','#0b1526').attr('stroke-width',1.2).style('cursor','pointer');
 tipOn(dots,d=>`<b>@${esc(d.h)}</b><br>${esc(d.country)}<br>${KIND[d.k][0]}, ${fd(d.t)}`);
 setPos(keep?pos:1)}
function setPos(p){pos=p;const now=t0+(t1-t0)*p;d3.select('#clock').property('value',Math.round(p*1000));
 gD.selectAll('circle').attr('opacity',d=>+new Date(d.t)<=now?1:0).attr('pointer-events',d=>+new Date(d.t)<=now?'all':'none');
 gA.selectAll('path').attr('opacity',d=>+new Date(d.t)<=now?1:0);
 const n=pts.filter(d=>+new Date(d.t)<=now).length;d3.select('#clocklbl').text(`${fd(new Date(now).toISOString())} · ${n} accounts`);mlab.text(`${n} of ${pts.length} accounts`)}
function stop(){if(timer){timer.stop();timer=null}d3.select('#play').text(pos>=1?'↺ Replay':'▶ Play')}
function play(){if(pos>=1)pos=0;d3.select('#play').text('❚❚ Pause');const s0=pos,start=d3.now(),dur=8000*(1-s0);timer=d3.timer(()=>{const p=Math.min(1,s0+(d3.now()-start)/8000);setPos(p);if(p>=1)stop()});if(dur<=0)stop()}
d3.select('#play').on('click',()=>timer?stop():play());
d3.select('#clock').on('input',function(){stop();setPos(this.value/1000);d3.select('#play').text(pos>=1?'↺ Replay':'▶ Play')});
// ---- streamgraph
(function(){const w=Math.max(320,document.getElementById('stream').clientWidth),h=Math.max(240,Math.round(w*0.32)),m={l:14,r:14,t:10,b:30};const days=ST.days.map(d=>new Date(d+'T12:00:00Z'));
 const data=ST.days.map((d,i)=>{const o={i};ST.series.forEach((s,j)=>o[j]=s.vals[i]);return o});
 const keys=ST.series.map((s,j)=>j);const stk=d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data);
 const x=d3.scaleUtc().domain(d3.extent(days)).range([m.l,w-m.r]);const y=d3.scaleLinear().domain([d3.min(stk,l=>d3.min(l,d=>d[0])),d3.max(stk,l=>d3.max(l,d=>d[1]))]).range([h-m.b,m.t]);
 const area=d3.area().x((d,i)=>x(days[i])).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
 const svg=d3.select('#stream').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label','Streamgraph of daily posts in the top five talking points');
 const ps=svg.append('g').selectAll('path').data(stk).join('path').attr('d',area).attr('fill',d=>TPC[d.key]).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6);
 svg.append('g').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(d3.utcDay.every(w<600?3:1)).tickFormat(d3.utcFormat('%-d %b'))).call(g=>{g.selectAll('text').attr('font-size',13);g.selectAll('line,path').attr('stroke','#5a6f94')});
 ps.on('mousemove',(e,d)=>{const [mx]=d3.pointer(e,svg.node());const i=d3.minIndex(days,dd=>Math.abs(x(dd)-mx*(w/svg.node().getBoundingClientRect().width)));
   showTip(e,`<b>${esc(ST.series[d.key].name)}</b><br>${fday(ST.days[i])}: ${ST.series[d.key].vals[i]} posts`)});svg.on('mouseleave',hideTip);ps
  .on('touchstart',(e,d)=>showTip(e.touches[0],`<b>${esc(ST.series[d.key].name)}</b><br>${d3.sum(ST.series[d.key].vals)} posts in total`),{passive:true});
})();
// ---- matrix
(function(){const P=MX.points,R=MX.rows.slice(0,25);const cw=112,lw=200,rh=30,top=74;const w=lw+cw*P.length+10,h=top+rh*R.length+6;
 const svg=d3.select('#matrix').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Matrix of accounts by talking point');
 const mxv=d3.max(R,r=>d3.max(P,p=>r.cells[p]||0));const col=d3.scaleSequential([0,mxv],t=>d3.interpolateRgb('#1d3157','#a0522d')(t));
 const wrap=t=>{const w=t.replace(/[()']/g,'').split(' '),L=[''];w.forEach(x=>{if((L[L.length-1]+' '+x).trim().length>13&&L.length<4)L.push(x);else L[L.length-1]=(L[L.length-1]+' '+x).trim()});return L};
 svg.selectAll('text.c').data(P).join('text').attr('class','c').attr('text-anchor','middle').attr('font-size',13).each(function(d,i){const L=wrap(d);d3.select(this).selectAll('tspan').data(L).join('tspan').attr('x',lw+cw*i+cw/2).attr('y',(t,j)=>top-8-(L.length-1-j)*16).text(t=>t)});
 const g=svg.selectAll('g.r').data(R).join('g').attr('transform',(d,i)=>`translate(0,${top+rh*i})`);
 g.append('text').attr('x',lw-8).attr('y',rh/2+5).attr('text-anchor','end').attr('font-size',13).text(d=>`@${d.h}`);
 const cells=g.selectAll('rect').data(r=>P.map(p=>({r,p,v:r.cells[p]||0}))).join('rect').attr('x',(d,i)=>lw+cw*i+2).attr('y',2).attr('width',cw-4).attr('height',rh-4).attr('rx',3).attr('fill',d=>d.v?col(d.v):'#162744');
 g.selectAll('text.v').data(r=>P.map(p=>({p,v:r.cells[p]||0}))).join('text').attr('class','v').attr('x',(d,i)=>lw+cw*i+cw/2).attr('y',rh/2+5).attr('text-anchor','middle').attr('font-size',13).text(d=>d.v||'');
 tipOn(cells,d=>`<b>@${esc(d.r.h)}</b> (${esc(d.r.country)})<br>${esc(d.p)}: ${d.v} posts`);
})();
// ---- network
function drawNet(){const w=Math.max(760,document.getElementById('net').clientWidth),h=660;d3.select('#net').selectAll('*').remove();
 const nodes=NET.nodes.filter(n=>on.has(n.type)).map(n=>Object.assign({},n));const ids=new Set(nodes.map(n=>n.id));
 const links=NET.links.filter(l=>ids.has(l.s)&&ids.has(l.t)).map(l=>({source:l.s,target:l.t,w:l.w,fast:l.fast}));
 d3.select('#amp-sub').text(`Arrows run from the account that reposted or quoted to the account it amplified. Thicker lines mean more reposts. ${Math.round(NET.fast_share*100)}% of all ${fmt(NET.total_edges)} reposts and quotes came within an hour of the original (median delay ${Math.round(NET.median_delay_min/60)} hours). Shown: the ${NET.nodes.length} most connected accounts.`);
 const r=d=>4+Math.sqrt(d.deg)*1.1;
 const sim=d3.forceSimulation(nodes).force('l',d3.forceLink(links).id(d=>d.id).distance(90).strength(.25)).force('c',d3.forceManyBody().strength(-320)).force('x',d3.forceX(w/2).strength(.06)).force('y',d3.forceY(h/2).strength(.09))
  .force('col',d3.forceCollide(d=>r(d)+20)).stop();for(let i=0;i<400;i++)sim.tick();
 nodes.forEach(d=>{d.x=Math.max(70,Math.min(w-70,d.x));d.y=Math.max(20,Math.min(h-24,d.y))});
 const svg=d3.select('#net').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Network of accounts that amplify each other');
 svg.append('defs').append('marker').attr('id','ar').attr('viewBox','0 -4 8 8').attr('refX',8).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto').append('path').attr('d','M0,-4L8,0L0,4').attr('fill','#8ea3c7');
 const ln=svg.append('g').selectAll('line').data(links).join('line').attr('stroke','#8ea3c7').attr('stroke-opacity',.45).attr('stroke-width',d=>.6+Math.sqrt(d.w)*.7).attr('marker-end','url(#ar)')
  .each(function(d){const dx=d.target.x-d.source.x,dy=d.target.y-d.source.y,L=Math.hypot(dx,dy)||1,rt=r(d.target)+2;d3.select(this).attr('x1',d.source.x).attr('y1',d.source.y).attr('x2',d.target.x-dx/L*rt).attr('y2',d.target.y-dy/L*rt)});
 tipOn(ln,d=>`@${esc(d.source.id)} → @${esc(d.target.id)}<br>${d.w} reposts or quotes, ${d.fast} within an hour`);
 const g=svg.append('g').selectAll('g').data(nodes).join('g').attr('transform',d=>`translate(${d.x},${d.y})`).style('cursor','pointer');
 g.append('circle').attr('r',r).attr('fill',d=>TYPES[d.type]).attr('stroke','#0b1526').attr('stroke-width',1.5);
 g.append('text').attr('y',d=>-r(d)-4).attr('text-anchor','middle').attr('font-size',13).attr('paint-order','stroke').attr('stroke','#12203a').attr('stroke-width',3).text(d=>'@'+d.id);
 tipOn(g,d=>`<b>@${esc(d.id)}</b><br>${esc(d.type)} · ${esc(d.country)}<br>Amplified others ${d.out} times · amplified by others ${d.inn} times`);
}
// ---- tone map
let tstep=-1,ttimer=null;
(function(){const svg=d3.select('#tmap').append('svg').attr('viewBox',`0 0 ${W} ${HM}`).attr('role','img').attr('aria-label','World map of tone by country');
 svg.append('path').attr('d',path({type:'Sphere'})).attr('fill','#0f1b31');
 svg.append('g').attr('id','tc').selectAll('path').data(countries).join('path').attr('d',path).attr('stroke','#2c426b').attr('stroke-width',.4);
 const ents=TONE.countries.filter(c=>!c.geo&&c.ll);const eg=svg.append('g').attr('id','te').selectAll('g').data(ents).join('g').attr('transform',d=>{const p=proj(d.ll);return `translate(${p[0]},${p[1]})`});
 eg.append('rect').attr('x',-6).attr('y',-6).attr('width',12).attr('height',12).attr('transform','rotate(45)').attr('stroke','#e6e9ef').attr('stroke-width',1);
 const lab=svg.append('text').attr('x',14).attr('y',HM-14).attr('font-size',15).attr('font-weight',600).style('fill','#c8a24a').attr('id','tlab');
 const lbl=p=>{const i=TONE.periods.indexOf(p),s=new Date(p+'T00:00:00Z'),e=new Date(+s+6*864e5),a=new Date(Math.max(+s,+new Date(H.start))),b=new Date(Math.min(+e,+new Date(H.end)));const part=(+a>+s||+b<+e-864e5)?' (partial week)':'';const f=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});return (f(a)===f(b)?f(a):`${f(a)}–${f(b)}`)+part};
 const steps=[['All dates',-1]].concat(TONE.periods.map((p,i)=>[lbl(p),i]));
 d3.select('#tsteps').selectAll('button').data(steps).join('button').text(d=>d[0]).on('click',(e,d)=>{tstop();setT(d[1])});
 const byGeo={};TONE.countries.forEach(c=>{if(c.geo)byGeo[c.geo]=c});
 function val(c){if(!c)return null;return tstep<0?{s:c.overall,n:c.posts}:c.vals[tstep]}
 window.setT=function(i){tstep=i;d3.select('#tsteps').selectAll('button').attr('aria-pressed',d=>d[1]===i);
  const paths=svg.select('#tc').selectAll('path').attr('fill',f=>{const v=val(byGeo[f.properties.name]);return v&&v.s!=null?toneCol(v.s):'#1b2c4a'});
  tipOn(paths,f=>{const c=byGeo[f.properties.name];if(!c)return `<b>${esc(f.properties.name)}</b><br>No tracked mission account`;const v=val(c);return `<b>${esc(c.country)}</b><br>${v.n} posts${v.s==null?'<br>Too few tone words to score':`<br>Tone score ${v.s>0?'+':''}${v.s.toFixed(2)} (−1 cooperative, +1 confrontational)`}`});
  svg.select('#te').selectAll('rect').attr('fill',c=>{const v=val(c);return v&&v.s!=null?toneCol(v.s):'#1b2c4a'});
  tipOn(svg.select('#te').selectAll('g'),c=>{const v=val(c);return `<b>${esc(c.country)}</b> (multilateral or headquarters)<br>${v.n} posts${v.s==null?'<br>Too few tone words to score':`<br>Tone score ${v.s>0?'+':''}${v.s.toFixed(2)}`}`});
  lab.text(steps.find(d=>d[1]===i)[0])};
 setT(-1);
})();
function tstop(){if(ttimer){clearInterval(ttimer);ttimer=null}d3.select('#tplay').text('▶ Play')}
d3.select('#tplay').on('click',()=>{if(ttimer)return tstop();let i=0;setT(0);d3.select('#tplay').text('❚❚ Pause');ttimer=setInterval(()=>{i++;if(i>=TONE.periods.length){tstop();setT(-1);return}setT(i)},1600)});
// ---- burst calendar
(function(){const days=BU.days,cs=30,lw=110,top=34,w=lw+24*cs+10,h=top+days.length*cs+40;
 const svg=d3.select('#calv').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Calendar of synchronized bursts by day and hour');
 const mx=d3.max(days,d=>d3.max(BU.cal[d]?.burst||[0]))||1;const col=d3.scaleSequential([0,mx],t=>d3.interpolateRgb('#1d3157','#f0c35a')(t));
 svg.selectAll('text.hr').data(d3.range(0,24,3)).join('text').attr('class','hr').attr('x',d=>lw+d*cs+cs/2).attr('y',top-10).attr('text-anchor','middle').attr('font-size',13).text(d=>String(d).padStart(2,'0')+':00');
 const g=svg.selectAll('g.d').data(days).join('g').attr('class','d').attr('transform',(d,i)=>`translate(0,${top+i*cs})`).style('cursor','pointer').on('click',(e,d)=>openDay(d));
 g.append('rect').attr('x',0).attr('y',1).attr('width',lw-8).attr('height',cs-2).attr('fill','transparent');
 g.append('text').attr('x',lw-12).attr('y',cs/2+5).attr('text-anchor','end').attr('font-size',13).text(d=>fday(d));
 const cells=g.selectAll('rect.c').data(d=>d3.range(24).map(hh=>({d,hh,b:BU.cal[d]?.burst[hh]||0,a:BU.cal[d]?.all[hh]||0}))).join('rect').attr('class','c').attr('x',d=>lw+d.hh*cs+1).attr('y',1).attr('width',cs-2).attr('height',cs-2).attr('rx',3).attr('fill',d=>d.b?col(d.b):d.a?'#172a4b':'#101d35');
 tipOn(cells,d=>`<b>${fday(d.d)}, ${String(d.hh).padStart(2,'0')}:00 UTC</b><br>${d.a} posts, ${d.b} in bursts<br>Click to read that day's bursts`);
 const L=[0,Math.ceil(mx/3),Math.ceil(2*mx/3),mx];const lg=svg.append('g').attr('transform',`translate(${lw},${h-26})`);
 lg.append('text').attr('x',0).attr('y',14).attr('font-size',13).text('Posts in bursts per hour:');
 L.forEach((v,i)=>{lg.append('rect').attr('x',170+i*70).attr('y',2).attr('width',16).attr('height',16).attr('rx',3).attr('fill',v?col(v):'#172a4b');lg.append('text').attr('x',192+i*70).attr('y',15).attr('font-size',13).text(v)});
})();
const panel=document.getElementById('panel');
function openDay(d){const bs=BU.bursts.filter(b=>b.start.slice(0,10)===d);d3.select('#ph').text(`Bursts on ${fday(d)}`);
 const body=d3.select('#pbody').html(bs.length?'':'<p class="muted">No synchronized bursts started on this day.</p>');
 bs.forEach(b=>{body.append('div').attr('class','bh').text(`${b.name} · ${b.accounts} accounts from ${fd(b.start)}`);
  b.ids.forEach(id=>{const p=PO[id];if(!p)return;body.append('div').attr('class','post').html(`<div class="m">@${esc(p.h)} · ${esc(p.country)} · ${KIND[p.k][0]} · ${fd(p.t)}</div><div>${esc(p.text)}</div><a href="https://x.com/${encodeURIComponent(p.h)}/status/${id}" target="_blank" rel="noopener">Open on x.com ↗</a>`)})});
 panel.hidden=false;document.getElementById('pclose').focus()}
document.getElementById('pclose').onclick=()=>{panel.hidden=true};
addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;side.classList.remove('open')}});
// ---- method
d3.select('#method').html(`Posts were collected from ${H.accounts} X accounts run by China's foreign ministry, embassies, consulates, ambassadors and missions to international organisations, using X's full-archive search through a free connector. This version covers ${fday(H.start.slice(0,10))} to ${fd(H.end)}; earlier posts are not included. Messages count as the same talking point when posts repost the same original or when their text is a near-duplicate (character n-gram similarity, which works across scripts but does not match translations into other languages). Eight large clusters were reviewed and named by hand; related clusters were merged under one name. A burst is four or more accounts posting the same message within six hours. Tone counts words from fixed confrontational and cooperative word lists in English, Chinese, Japanese, Spanish, French, Portuguese, Russian and Arabic; it measures word choice, not intent. Location is the country an account is posted to, not where a post was written. Basemap: Natural Earth via world-atlas. The page describes past activity and makes no forecasts.`);
window._check={ready:true};
setTP(0);drawNet();
})();
