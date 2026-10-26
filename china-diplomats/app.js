(async function(){
const J=n=>fetch('data/'+n+'.json').then(r=>r.json());
const [H,ST,MX,BU,NET,TONE,SP,ACC,PO,RIP,WORLD]=await Promise.all(['headline','stream','matrix','bursts','network','tone','spread','accounts','posts','ripples'].map(J).concat([fetch('vendor/countries-50m.json').then(r=>r.json())]));
const countries=topojson.feature(WORLD,WORLD.objects.countries).features.filter(f=>f.properties.name!=='Antarctica');
const fmt=d3.format(','),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KIND={post:['Original post','#4fc3b0'],repost:['Repost','#e8a33d'],quote:['Quote','#c46ad6'],reply:['Reply','#5d8fe6']};
const TPC=['#4e9fe0','#e0703c','#5cbf7a','#b36bd6','#e6c34a','#4fc6c2','#9a9cf0','#c98a5a','#a8d65a'];
const tpColor=name=>{const i=ST.series.findIndex(s=>s.name===name);return i>=0&&i<5?TPC[i]:null};
const OTHER='#c8a24a';var VK={};
const hp=()=>new URLSearchParams(location.hash.slice(1));
function setHash(k,v){const q=hp();if(v==null)q.delete(k);else q.set(k,v);const t=q.toString();history.replaceState(null,'',location.pathname+location.search+(t?'#'+t:''))}
const TYPES={'Foreign ministry':'#d4145a','Embassy':'#ffffff','Consulate':'#3d2bff','Diplomat':'#ffaabb','Outside account':'#8b0000'};
const TSYM={'Foreign ministry':d3.symbolStar,'Embassy':d3.symbolSquare,'Consulate':d3.symbolTriangle,'Diplomat':d3.symbolDiamond,'Outside account':d3.symbolCircle};
const tIcon=(t,s=16)=>`<svg class="ti" width="${s}" height="${s}" viewBox="-8 -8 16 16" aria-hidden="true"><path d="${d3.symbol(TSYM[t]||d3.symbolCircle,s===16?90:60)()}" fill="${TYPES[t]}" stroke="#0b1526" stroke-width="1"/></svg>`;
const AGC=['#b0182f','#d9b26a','#3fa45b'];// AGG: aggressive-share steps. Not aggressive below AGT (4%): white. Pink to dark red = more aggressive.
const AGT=0.04,AGS=[0.08,0.20],AGR=['#ffffff','#f7b3c2','#e0526f','#8e0c22'];
const aggCol=a=>a<AGT?AGR[0]:a<AGS[0]?AGR[1]:a<AGS[1]?AGR[2]:AGR[3];
let TMODE='share';const MINA=()=>TONE.min_agg_posts||3,CB=()=>TONE.count_breaks||[3,10,50];
const nagg=c=>c.nagg!=null?c.nagg:Math.round(c.agg*c.posts);
const isHot=c=>c.agg>=AGT&&nagg(c)>=MINA();
const cntCol=c=>{const n=nagg(c),b=CB();return n<b[0]?AGR[0]:n<b[1]?AGR[1]:n<b[2]?AGR[2]:AGR[3]};
const colOf=c=>TMODE==='count'?cntCol(c):(isHot(c)?aggCol(c.agg):AGR[0]);
const TONEB_S=()=>[['Not aggressive (under 4% or under '+MINA()+' aggressive posts)',AGR[0]],['Somewhat aggressive (4-8%)',AGR[1]],['Aggressive (8-20%)',AGR[2]],['Most aggressive (20% or more)',AGR[3]]];
const TONEB_C=()=>{const b=CB();return [['Under '+b[0]+' aggressive posts',AGR[0]],[b[0]+'-'+(b[1]-1)+' aggressive posts',AGR[1]],[b[1]+'-'+(b[2]-1)+' aggressive posts',AGR[2]],[b[2]+' or more aggressive posts',AGR[3]]]};

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
d3.select('#heads').selectAll('div').data([[H.accounts,'accounts tracked'],[H.active,'posted in this period'],[H.posts,'posts collected'],[H.countries,'countries and organisations'],[H.clusters,'messages shared by 3+ accounts'],[H.topburst_acc,'accounts pushed the '+H.topburst+' in bursts']]).join('div').attr('class','head').html(d=>`<b>${fmt(d[0])}</b><span>${d[1]}</span>`);
// ---- legends and filters
const lg=(id,items,sq)=>d3.select(id).selectAll('div').data(items).join('div').html(d=>`<span class="sw ${sq?'sq':''}" style="background:${d[1]}"></span>${esc(d[0])}`);
lg('#lg-kind',Object.values(KIND));const drawTLeg=()=>{d3.select('#lg-tone').html('');lg('#lg-tone',(TMODE==='count'?TONEB_C():TONEB_S()).slice().reverse(),1);d3.select('#lg-tone').append('div').attr('class','li').text(`Countries with fewer than ${TONE.min_posts} posts are not shown`)};drawTLeg();
d3.select('#types').selectAll('button').data(Object.keys(TYPES)).join('button').attr('class','tg').attr('type','button').attr('aria-pressed','true').html(t=>`${tIcon(t)}${t}`)
 .on('click',function(e,t){on.has(t)?on.delete(t):on.add(t);this.setAttribute('aria-pressed',on.has(t));drawSpread(true)});
// ---- talking point picker
let cur=0;const NAR=SP.filter(d=>(d.accounts_7d??d.accounts)>=7).slice(0,5);SP.length=0;NAR.forEach(d=>SP.push(d));
const slug=n=>n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sel=d3.select('#tp');sel.selectAll('option').data(SP).join('option').attr('value',(d,i)=>i).text(d=>`${d.name} (${d.accounts_7d??d.accounts} accounts this week)`);
sel.on('change',function(){setTP(+this.value)});
d3.select('#chips').selectAll('button').data(SP).join('button').attr('class','chip').html(d=>`<span class="sw" style="background:${tpColor(d.name)||'transparent'};border:2px solid ${tpColor(d.name)||OTHER}"></span>${esc(d.name)}`).on('click',(e,d)=>setTP(SP.indexOf(d)));
const tpread=d3.select(document.getElementById('chips').parentNode).insert('button','#chips + *').attr('id','tpread').attr('type','button').attr('class','lnk').on('click',()=>openNarr(ST.series.findIndex(s=>s.name===SP[cur].name)));
function setTP(i){cur=i;{const k=ST.series.findIndex(s=>s.name===SP[i].name);tpread.attr('hidden',k<0?'':null).text('Read what it says ›').attr('aria-label',`Read what “${SP[i].name}” says and see a sample post`)}sel.property('value',i);d3.select('#chips').selectAll('button').attr('aria-pressed',(d,j)=>j===i);d3.select('#tpdesc').text(SP[i].desc);
 d3.select('#sp-title').text(`How it spread: ${SP[i].name}`);setHash('narrative',slug(SP[i].name));stop();drawSpread();play()}
function gotoNarr(name){const i=SP.findIndex(d=>d.name===name);if(i<0)return;setTP(i);document.getElementById('spread').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
function initNarr(){const m=location.hash.match(/narrative=([\w-]+)/);const ini=!!m;const i=m?SP.findIndex(d=>slug(d.name)===m[1]):-1;if(i>=0){setTP(i);setTimeout(()=>document.getElementById('spread').scrollIntoView(),50)}else{setTP(0);setHash('narrative',null)}}
addEventListener('hashchange',()=>{const m=location.hash.match(/narrative=([\w-]+)/);const i=m?SP.findIndex(d=>slug(d.name)===m[1]):-1;if(i>=0&&i!==cur)setTP(i)});
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
// Day view shows only the recent range where the talking points have data: from the day before the first post (at most the last 14 days, at least 7) to the latest day.
const DAYR=(()=>{const n=ST.days.length,f=ST.days.findIndex((d,i)=>ST.series.slice(0,5).some(s=>s.vals[i]>0));let a=Math.max(f<0?0:f-1,n-14);a=Math.max(0,Math.min(a,n-7));return [a,n]})();
(function(){const w=Math.max(320,document.getElementById('stream').clientWidth),h=Math.max(240,Math.round(w*0.32)),m={l:14,r:14,t:10,b:30};const DD=ST.days.slice(DAYR[0],DAYR[1]),O=DAYR[0];const days=DD.map(d=>new Date(d+'T12:00:00Z'));
 const data=DD.map((d,i)=>{const o={i};ST.series.slice(0,5).forEach((s,j)=>o[j]=s.vals[i+O]);return o});
 const keys=[0,1,2,3,4].filter(j=>ST.series[j]);const stk=d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data);
 const x=d3.scaleUtc().domain(d3.extent(days)).range([m.l,w-m.r]);const y=d3.scaleLinear().domain([d3.min(stk,l=>d3.min(l,d=>d[0])),d3.max(stk,l=>d3.max(l,d=>d[1]))]).range([h-m.b,m.t]);
 const area=d3.area().x((d,i)=>x(days[i])).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
 const svg=d3.select('#stream').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label','Streamgraph of daily posts in the top five talking points');
 const ps=svg.append('g').selectAll('path').data(stk).join('path').attr('d',area).attr('fill',d=>TPC[d.key]).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6);
 svg.append('g').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(d3.utcDay.every(Math.ceil(days.length/Math.max(2,Math.min(w<600?5:99,Math.floor(w/70)))))).tickFormat(d3.utcFormat('%-d %b'))).call(g=>{g.selectAll('text').attr('font-size',13);g.selectAll('line,path').attr('stroke','#5a6f94')});
 ps.on('mousemove',(e,d)=>{const [mx]=d3.pointer(e,svg.node());const i=d3.minIndex(days,dd=>Math.abs(x(dd)-mx*(w/svg.node().getBoundingClientRect().width)));
   showTip(e,`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${fday(DD[i])}: ${ST.series[d.key].vals[i+O]} posts`)});svg.on('mouseleave',hideTip);ps.style('cursor','pointer');hitOpen(svg,stk,x,y,days,w);narrKeys(ps,d=>d.key);ps
  .on('touchstart',(e,d)=>showTip(e.touches[0],`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${d3.sum(ST.series[d.key].vals)} posts in total`),{passive:true});
 tpChips('stream',keys);
})();
// One click handler on the whole chart: opens the talking point under the pointer, or the nearest layer, so thin layers and finger taps still hit.
function hitOpen(svg,stk,x,y,days,w){svg.style('cursor','pointer').on('click',e=>{const td=e.target&&e.target.__data__;if(td&&td.key!=null&&e.target.tagName==='path'){openNarr(td.key);return}const [mx,my]=d3.pointer(e,svg.node()),sc=w/svg.node().getBoundingClientRect().width,X=mx*sc,Y=my*sc;
 const i=d3.minIndex(days,dd=>Math.abs(x(dd)-X)),v=y.invert(Y);let best=null,bd=1/0;stk.forEach(l=>{const a=l[i][0],b=l[i][1];if(b<=a)return;const dd=v<a?a-v:v>b?v-b:0;if(dd<bd){bd=dd;best=l.key}});
 if(best!=null&&Y<y.range()[0])openNarr(best)})}
// chips under each talking-points chart: click opens the explanation panel
function tpChips(el,keys){VK[el]=keys;if(!document.getElementById(el).hidden)tpLeg(keys)}
function tpLeg(keys){d3.select('#lg-tp').html('').selectAll('div').data(keys).join('div').style('cursor','pointer').attr('title','Click to read what it says').html(k=>`<span class="sw sq" style="background:${TPC[k]}"></span>${esc(ST.series[k].name)}`).on('click',(e,k)=>openNarr(k));narrKeys(d3.select('#lg-tp').selectAll('div'),k=>k)}
// ---- matrix
(function(){const P=MX.points,R=MX.rows;const N=MX.total_accounts||R.length;d3.select('#mx-note').text(`Top ${R.length} of ${N} accounts`);d3.select('#mx-sub').text(`The ${R.length} accounts that posted the most on the top ${P.length} talking points of the past ${MX.window_days||7} days. Darker cells mean more posts.`);const cw=112,lw=200,rh=30,top=74;const w=lw+cw*P.length+10,h=top+rh*R.length+6;
 const svg=d3.select('#matrix').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Matrix of accounts by talking point');
 // one red ramp, light pink (few posts) to dark red (many); steps fitted to the data; empty cells = panel background
 const mxv=d3.max(R,r=>d3.max(P,p=>r.cells[p]||0))||1;const MXS=mxv>=11?[1,3,6,11]:mxv>=6?[1,2,3,5]:[1,2,3,4].slice(0,Math.max(2,mxv));const MXR=['#fde4ea','#f08aa2','#c8304d','#640514'].slice(4-MXS.length);
 const sidx=v=>d3.bisectRight(MXS,v)-1;const col=v=>MXR[sidx(v)];const lab=i=>i===MXS.length-1?`${MXS[i]}+`:MXS[i+1]-MXS[i]===1?`${MXS[i]}`:`${MXS[i]}–${MXS[i+1]-1}`;
 d3.select('#mxkey').remove();
 d3.select('#lg-mx').attr('data-ci-ignore','single-hue matrix ramp').html(`<div class="mxstrip">${MXR.map((c,i)=>`<span style="background:${c}"></span>`).join('')}</div><div class="mxnum">${MXR.map((c,i)=>`<span>${lab(i)}</span>`).join('')}</div><div class="mxends"><span>Fewer posts</span><span>More posts</span></div>`);
 const wrap=t=>{const w=t.replace(/[()']/g,'').split(' '),L=[''];w.forEach(x=>{if((L[L.length-1]+' '+x).trim().length>13&&L.length<4)L.push(x);else L[L.length-1]=(L[L.length-1]+' '+x).trim()});return L};
 svg.selectAll('text.c').data(P).join('text').attr('class','c').attr('text-anchor','middle').attr('font-size',13).each(function(d,i){const L=wrap(d);d3.select(this).selectAll('tspan').data(L).join('tspan').attr('x',lw+cw*i+cw/2).attr('y',(t,j)=>top-8-(L.length-1-j)*16).text(t=>t)});
 const g=svg.selectAll('g.r').data(R).join('g').attr('transform',(d,i)=>`translate(0,${top+rh*i})`);
 g.append('text').attr('x',lw-8).attr('y',rh/2+5).attr('text-anchor','end').attr('font-size',13).text(d=>`@${d.h}`);
 const cg2=g.selectAll('g.cell').data(r=>P.map((p,i)=>({r,p,i,v:r.cells[p]||0}))).join('g').attr('class','cell').attr('transform',d=>`translate(${lw+cw*d.i},0)`);
 const cells=cg2.append('rect').attr('x',2).attr('y',2).attr('width',cw-4).attr('height',rh-4).attr('rx',3).attr('fill',d=>d.v?col(d.v):'var(--panel)').attr('stroke','#24365a').attr('stroke-width',d=>d.v?0:1);
 svg.attr('data-ci-ignore','single-hue matrix ramp');
 cg2.filter(d=>d.v).append('text').attr('class','v').attr('x',cw/2).attr('y',rh/2+5).attr('text-anchor','middle').attr('font-size',13).attr('pointer-events','none').style('fill',d=>sidx(d.v)>=MXR.length-2?'#ffffff':'#0b1526').text(d=>d.v);
 tipOn(cells,d=>`<b>@${esc(d.r.h)}</b> (${esc(d.r.country)})<br>${esc(d.p)}: ${d.v} posts`);
})();
// ---- ripple: how one post is amplified over time
const RP=RIP;let rcur=0,rpos=1,rtimer=null;const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CTRY=[...new Set(ACC.map(a=>a.country).concat(['Botswana','Togo']))].filter(c=>c&&!/China|\(/.test(c)).sort((a,b)=>b.length-a.length);
const dupT=d3.rollup(RP,v=>v.length,d=>d.theme);
RP.forEach(d=>{d.sub='';if(dupT.get(d.theme)>1){const c=CTRY.find(c=>d.text.includes(c));d.sub=c?`: ${c}`:''}});
const rchip=d3.select('#rchips').selectAll('button').data(RP).join('button').attr('class','chip')
 .html(d=>`<span class="sw" style="background:${tpColor(d.theme)||'transparent'};border:2px solid ${tpColor(d.theme)||OTHER}"></span>${esc((d.theme||d.text.slice(0,40))+d.sub)} <span class="m">${new Date(d.t).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})} · ${d.amps.length}</span>`)
 .on('click',(e,d)=>{rcur=RP.indexOf(d);drawRipple();rplay()});
function fdur(m){return m<60?Math.round(m)+' min':m<1440?(m/60).toFixed(m<600?1:0)+' h':(m/1440).toFixed(1)+' days'}
let RG=null,RSPD=1;
function drawRipple(){const r=RP[rcur];rchip.attr('aria-pressed',(d,i)=>i===rcur);rstop();
 const box=document.getElementById('net');d3.select('#net').selectAll('*').remove();d3.select('#netlist').selectAll('*').remove();
 const amps=r.amps.slice();const maxD=Math.max(60,d3.max(amps,a=>a.delay)||60);
 d3.select('#amp-sub').html(`<b>${esc(r.theme||'Post')}</b>: a post by <b>${esc(r.label)}</b> (${fd(r.t)}) was reposted or quoted by <b>${amps.length}</b> tracked accounts. Rings show how long each took: closer to the centre means faster. <span class="m">“${esc(r.text)}”</span>`);
 const phone=box.clientWidth<700;
 const rs=d3.scaleLog().domain([1,maxD+1]);
 if(phone){const list=amps.slice(0,10);
  const row=d3.select('#netlist').selectAll('div').data(list).join('div').attr('class','dbar').on('click',(e,a)=>openPost(a));
  row.html(a=>`<div class="dl">${tIcon(a.type)}${esc(a.label)}</div><div class="dt"><i style="background:${TYPES[a.type]};width:${Math.max(4,rs(a.delay+1)*100)}%"></i><span>${fdur(a.delay)}</span></div>`);
  RG={amps:list,phone:true};
 } else {
 const w=box.clientWidth,h=Math.min(760,Math.max(560,w*0.6)),cx=w/2,cy=h/2,R0=70,R1=Math.min(w*0.42,h*0.46);
 const svg=d3.select('#net').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label','Ripple of accounts amplifying the selected post');
 const rad=d=>R0+(R1-R0)*rs(d+1);
 const rings=[60,360,1440,4320,10080].filter(m=>m<=maxD*1.05);
 const rg=svg.append('g');rings.forEach(m=>{rg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',rad(m)).attr('fill','none').attr('stroke','#2f4a78').attr('stroke-width',1.5);
  rg.append('text').attr('x',cx).attr('y',cy-rad(m)-6).attr('text-anchor','middle').attr('font-size',13).style('fill','#9aa6b8').text({60:'1 hour',360:'6 hours',1440:'1 day',4320:'3 days',10080:'7 days'}[m])});
 const lk=svg.append('g'),nd=svg.append('g');
 // measure pills, then place without overlaps
 const meas=svg.append('text').attr('font-size',13);
 const placed=[];const ctrW=(meas.text(r.label).node().getComputedTextLength()+30);placed.push({x:cx-ctrW/2,y:cy-16,w:ctrW,h:32});rings.forEach(m=>placed.push({x:cx-32,y:cy-rad(m)-22,w:64,h:20}));
 const ov=(a,b)=>a.x<b.x+b.w+6&&b.x<a.x+a.w+6&&a.y<b.y+b.h+4&&b.y<a.y+a.h+4;
 amps.forEach((a,i)=>{const pw=meas.text(a.label).node().getComputedTextLength()+30;let ang=-Math.PI/2+i*2.39996,rr=rad(a.delay),p;
  for(let k=0;k<400;k++){const x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);p={x:x-pw/2,y:y-14,w:pw,h:28,cx:x,cy:y};
   if(p.x>4&&p.x+p.w<w-4&&p.y>4&&p.y+p.h<h-4&&!placed.some(q=>ov(p,q)))break;ang+=0.07;if(k%40===39)rr+=10}
  placed.push(p);a._p=p});meas.remove();
 const links=lk.selectAll('line').data(amps).join('line').attr('x1',cx).attr('y1',cy).attr('x2',a=>a._p.cx).attr('y2',a=>a._p.cy).attr('stroke',a=>TYPES[a.type]).attr('stroke-linecap','round');
 const g=nd.selectAll('g').data(amps).join('g').attr('transform',a=>`translate(${a._p.x},${a._p.y})`).style('cursor','pointer').on('click',(e,a)=>openPost(a));
 g.append('rect').attr('width',a=>a._p.w).attr('height',28).attr('rx',14).attr('fill','#0f1b31').attr('stroke',a=>TYPES[a.type]).attr('stroke-width',2);
 g.append('path').attr('transform','translate(12,14)').attr('d',a=>d3.symbol(TSYM[a.type]||d3.symbolCircle,70)()).attr('fill',a=>TYPES[a.type]).attr('stroke','#0b1526').attr('stroke-width',1);
 g.append('text').attr('x',22).attr('y',19).attr('font-size',13).text(a=>a.label);
 tipOn(g,a=>`<b>${esc(a.label)}</b> (@${esc(a.h)})<br>${esc(a.type)} · ${esc(a.country)}<br>${a.k==='quote'?'Quoted':'Reposted'} after ${fdur(a.delay)}, ${fd(a.t)}<br>Click to read it`);
 const pulse=svg.append('circle').attr('cx',cx).attr('cy',cy).attr('fill','none').attr('stroke',tpColor(r.theme)||OTHER).attr('stroke-width',3);
 const cg=svg.append('g').attr('transform',`translate(${cx-ctrW/2},${cy-16})`).style('cursor','pointer').on('click',()=>openPost({h:r.h,id:r.oid,label:r.label,t:r.t,text:r.text,orig:true}));
 cg.append('rect').attr('width',ctrW).attr('height',32).attr('rx',16).attr('fill',tpColor(r.theme)||OTHER);
 cg.append('text').attr('x',ctrW/2).attr('y',21).attr('text-anchor','middle').attr('font-size',13).attr('font-weight',700).style('fill','#0b1526').text(r.label);
 tipOn(cg,()=>`<b>Original post</b> by ${esc(r.label)}<br>${fd(r.t)}<br>“${esc(r.text.slice(0,140))}”`);
 const clk=svg.append('text').attr('x',14).attr('y',24).attr('font-size',15).attr('font-weight',600).style('fill','#c8a24a');
 RG={amps,links,g,pulse,clk,phone:false};}
 RG.maxD=maxD;rset(RM?1:0);d3.select('#rplay').text(RM?'↺ Replay':'▶ Play')}
// playback time runs on a log scale, so long-delay amplifiers don't stall it; labels show the real delay
function rset(p){rpos=p;const m=p>=1?RG.maxD:Math.pow(RG.maxD+1,p)-1;d3.select('#rclock').property('value',Math.round(p*1000));
 const n=RG.amps.filter(a=>a.delay<=m).length;d3.select('#rlbl').text(`+${fdur(m)} after posting · ${n} of ${RG.amps.length} accounts joined`);
 if(RG.phone){d3.select('#netlist').selectAll('.dbar').classed('on',a=>a.delay<=m);return}
 RG.clk.text(`+${fdur(m)} · ${n} accounts joined`);
 RG.g.attr('opacity',a=>a.delay<=m?1:0).attr('pointer-events',a=>a.delay<=m?'all':'none');
 RG.links.attr('stroke-opacity',a=>a.delay<=m?.75:0).attr('stroke-width',a=>{const age=m-a.delay;return a.delay>m?0:age<RG.maxD*0.03?9:3.5});
 RG.pulse.attr('r',18+((m/ (RG.maxD/12))%1)*30).attr('stroke-opacity',p<1?1-((m/(RG.maxD/12))%1):0)}
function rstop(){if(rtimer){rtimer.stop();rtimer=null}d3.select('#rplay').text(rpos>=1?'↺ Replay':'▶ Play')}
function rplay(){if(RM){rset(1);return}if(rpos>=1)rpos=0;const dur=5000/RSPD;const s0=rpos,st=d3.now();d3.select('#rplay').text('❚❚ Pause');
 rtimer=d3.timer(()=>{const p=Math.min(1,s0+(d3.now()-st)/dur);rset(p);if(p>=1)rstop()})}
d3.select('#rplay').on('click',()=>rtimer?rstop():rplay());
d3.select('#rreplay').on('click',()=>{rstop();rpos=0;rplay()});
d3.select('#rspeed').on('click',function(){RSPD=RSPD===1?2:1;this.textContent=RSPD+'×';this.setAttribute('aria-label',`Playback speed ${RSPD}x, click to change`);if(rtimer){const p=rpos;rstop();rpos=p;rplay()}});
{let seen=false;const io=new IntersectionObserver(es=>{if(!seen&&es.some(e=>e.isIntersecting)){seen=true;io.disconnect();rstop();rpos=0;rplay()}},{threshold:.35});io.observe(document.getElementById('net'))}
d3.select('#rclock').on('input',function(){rstop();rset(this.value/1000);d3.select('#rplay').text(rpos>=1?'↺ Replay':'▶ Play')});
function openPost(a){const p=PO[a.id];d3.select('#ph').text(a.label);
 d3.select('#pbody').html(`<div class="post"><div class="m">@${esc(a.h)} · ${a.orig?'Original post':KIND[a.k]?.[0]||''} · ${fd(a.t)}</div><div>${esc(p?p.text:(a.text||''))}</div><a href="https://x.com/${encodeURIComponent(a.h)}/status/${a.id}" target="_blank" rel="noopener">Open on x.com ↗</a></div>`);
 panel.hidden=false;document.getElementById('pclose').focus()}

// ---- aggression heat map
(function(){const svg=d3.select('#tmap').append('svg').attr('data-ci-ignore','aggression diverging ramp').attr('viewBox',`0 0 ${W} ${HM}`).attr('role','img').attr('aria-label','World map of how aggressive or friendly posts are, by country');
 svg.append('path').attr('d',path({type:'Sphere'})).attr('fill','#0f1b31');
 const MP=TONE.min_posts,byGeo={};{const w=TONE.window,dd=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});TONE.windowLabel=w?`Last 30 days (${dd(w.start)} to ${dd(w.end)}${w.days<30?', '+w.days+' days so far: archive starts '+dd(w.start):''})`:'';}TONE.countries.forEach(c=>{if(c.geo&&c.posts>=MP)byGeo[c.geo]=c});
 const pct=x=>Math.round(x*100)+'%';
 const tip=c=>{if(!c)return '';const h=c.harsh[0],f=c.friendly[0];return `<b>${esc(c.country)}</b> · ${c.posts} posts<br><span style="color:#e2646e">Aggressive ${pct(c.agg)}</span> · <span style="color:#6fd08a">Friendly ${pct(c.fri)}</span>`+(h?`<br><i>Harshest:</i> “${esc(h.text.slice(0,110))}…”`:'')+(f?`<br><i>Friendliest:</i> “${esc(f.text.slice(0,110))}…”`:'')+'<br>Click to read the posts'};
 const zg=svg.append('g');const g=zg.append('g').selectAll('path').data(countries).join('path').attr('d',path).attr('stroke','#0b1526').attr('stroke-width',.5)
  .attr('fill',f=>{const c=byGeo[f.properties.name];return c?colOf(c):'#1b2c4a'}).attr('vector-effect','non-scaling-stroke')
  .style('cursor',f=>byGeo[f.properties.name]?'pointer':null).on('click',(e,f)=>{const c=byGeo[f.properties.name];if(c){selC(f.properties.name);openTone(c)}});
 tipOn(g,f=>{const c=byGeo[f.properties.name];return c?tip(c):`<b>${esc(f.properties.name)}</b><br>Not shown (no tracked account or fewer than ${MP} posts)`});
 const ents=TONE.countries.filter(c=>!c.geo&&c.ll&&c.posts>=MP);const eg=zg.append('g').selectAll('g').data(ents).join('g').attr('transform',d=>{const p=proj(d.ll);return `translate(${p[0]},${p[1]})`}).style('cursor','pointer').on('click',(e,c)=>openTone(c));
 eg.append('rect').attr('x',-7).attr('y',-7).attr('width',14).attr('height',14).attr('transform','rotate(45)').attr('stroke','#e6e9ef').attr('stroke-width',1).attr('fill',c=>colOf(c));
 tipOn(eg,c=>tip(c).replace('</b>','</b> (multilateral or headquarters)'));
 const scored=TONE.countries.filter(c=>c.posts>=MP).sort((a,b)=>b.agg-a.agg);
 const hot=scored.filter(isHot);let top=hot.slice(0,5);const nf=scored.length-hot.length;
 const THE=x=>/^(Philippines|Netherlands|United |UAE|EU|African Union|Maldives)/.test(x)?'the '+x:x,JA=n=>n.length<2?n.join(''):n.slice(0,-1).join(', ')+' and '+n[n.length-1];
 const setHead=()=>{if(TMODE==='count'){const bc=scored.slice().sort((a,b)=>nagg(b)-nagg(a)),t=bc[0],sec=bc.slice(1,3);
   d3.select('#tone-head').text(`${t.country}: ${nagg(t)} aggressive posts, the most of any country. Next come ${JA(sec.map(c=>THE(c.country)+' ('+nagg(c)+')'))}.`)}
  else d3.select('#tone-head').text(`${nf} of ${scored.length} countries and organisations post little or no aggressive wording. The sharpest tone comes from ${JA(top.slice(0,3).map(c=>THE(c.country)))}.`)};setHead();
 d3.select('#tone-win').text(TONE.windowLabel);d3.select('#tone-sub').text(`Share of each mission's posts with aggressive wording (accusations of hegemony, smears, interference, warnings), scored in ten languages. White means under ${Math.round(AGT*100)}% or fewer than ${MINA()} aggressive posts (By share), or fewer than ${CB()[0]} aggressive posts (By count). Countries with fewer than ${MP} posts are not shown. Click a country to see why its posts are harsh.`);
  const featOf=c=>countries.find(f=>f.properties.name===c.geo);
 const fit=(cs,pad)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;cs.forEach(c=>{const f=c.geo&&featOf(c);let b=f?path.bounds(f):null;const pt=r=>{const p=proj(c.ll||d3.geoCentroid(f));return [[p[0]-r,p[1]-r],[p[0]+r,p[1]+r]]};
   // countries split by the antimeridian (Fiji, Russia...) have bounds spanning the whole map; use a box around their capital/centroid instead
   if(!b||b[1][0]-b[0][0]>W*0.45)b=pt(f?24:8);x0=Math.min(x0,b[0][0]);y0=Math.min(y0,b[0][1]);x1=Math.max(x1,b[1][0]);y1=Math.max(y1,b[1][1])});
  const k=Math.min(4,0.9/Math.max((x1-x0)/W,(y1-y0)/HM));
  // centre on the main landmass centroid (not the bbox: Alaska, Fiji or outlying islands pull a bbox off-centre); for one country only
  let cx=(x0+x1)/2,cy=(y0+y1)/2;if(cs.length===1){const f=cs[0].geo&&featOf(cs[0]);if(f){let g_=f;if(f.geometry.type==='MultiPolygon'){const big=f.geometry.coordinates.map(c=>({type:'Feature',geometry:{type:'Polygon',coordinates:c}})).sort((a,b)=>d3.geoArea(b)-d3.geoArea(a))[0];g_=big}const p=proj(d3.geoCentroid(g_));cx=p[0];cy=p[1]}}
  // if the side panel covers the right of the map, centre in the part still visible
  let vw=W;const pn=document.getElementById('panel'),sr=svg.node().getBoundingClientRect();if(pn&&!pn.hidden){const pr=pn.getBoundingClientRect();if(pr.left>sr.left+sr.width*0.3&&pr.left<sr.right)vw=W*(pr.left-sr.left)/sr.width}
  return {k,x:vw/2-k*cx,y:HM/2-k*cy}};
 window.__cdTone={proj,W,HM};// used by the QA script to measure on-screen centring
 const setZ=(t,anim)=>{const tr=`translate(${t.x},${t.y}) scale(${t.k})`;(anim?zg.transition().duration(900):zg).attr('transform',tr);zg.selectAll('rect').attr('stroke-width',1/t.k).attr('transform',`rotate(45) scale(${1/Math.sqrt(t.k)})`)};
 const RM2=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Left column: one ranked list of countries (max 8) that meet the colouring thresholds for the current mode.
 let zoomed=true,selc=null;
 const zb=d3.select('#tzoom');const zlab=()=>zb.text(zoomed?'Show whole world':'Zoom to selected country').attr('aria-pressed',zoomed);
 const selC=geo=>g.attr('stroke',f=>f.properties.name===geo?'#ffffff':'#0b1526').attr('stroke-width',f=>f.properties.name===geo?1:.5).filter(f=>f.properties.name===geo).raise();
 const ranked=()=>TMODE==='count'?scored.filter(c=>nagg(c)>=CB()[0]).sort((a,b)=>nagg(b)-nagg(a)||b.agg-a.agg).slice(0,8):hot.slice(0,8);
 const zoomTo=(c,anim)=>{selc=c;zoomed=true;setZ(fit([c]),anim&&!RM2);zlab();selC(c.geo||'');d3.selectAll('#ttop .tli').classed('on',d=>d===c).attr('aria-pressed',d=>d===c)};
 const drawTop=()=>{top=ranked();d3.select('#ttop').html('');
  d3.select('#ttop').selectAll('li').data(top,c=>c.country).join('li').append('button').attr('class','tli').attr('type','button').attr('aria-pressed','false')
  .html((c,i)=>`<span class="sw sq" style="background:${colOf(c)}"></span><b>${i+1}. ${esc(c.country)}</b><span>${TMODE==='count'?nagg(c)+' aggressive posts':pct(c.agg)+' aggressive'}</span>`)
  .on('click',(e,c)=>{openTone(c);zoomTo(c,1)});
  if(top[0])zoomTo(top[0],0);else{zoomed=false;zlab()}};drawTop();
 zb.on('click',()=>{if(zoomed){zoomed=false;setZ({k:1,x:0,y:0},!RM2);zlab()}else if(selc)zoomTo(selc,1)});
 d3.selectAll('#tmode button').on('click',function(){TMODE=this.dataset.m;d3.selectAll('#tmode button').attr('aria-pressed',function(){return this.dataset.m===TMODE});g.attr('fill',f=>{const c=byGeo[f.properties.name];return c?colOf(c):'#1b2c4a'});eg.selectAll('rect').attr('fill',c=>colOf(c));drawTLeg();setHead();drawTop()});

})();
function explainHTML(x){if(!x)return '';const W=TONE.window;
 return `<h3 class="sh3">What the harsh posts are about</h3>${x.about.map(t=>`<p>${esc(t)}</p>`).join('')}`+(x.why.length?`<h3 class="sh3">Why</h3>${x.why.map(t=>`<p>${esc(t)}</p>`).join('')}`:'')
 +`<h3 class="sh3">Sample aggressive posts</h3>`+x.samples.map(p=>`<div class="post" style="border-left:4px solid ${AGR[3]};padding-left:8px"><div class="m">@${esc(p.h)} · ${esc(p.country)} · ${fd(p.t)}${p.lang?` · original in ${esc(p.lang)}, not translated`:''}</div><div>${esc(p.text)}</div><a href="https://x.com/${encodeURIComponent(p.h)}/status/${p.id}" target="_blank" rel="noopener">Open on x.com ↗</a></div>`).join('')}
function openExplain(title,x,sub){d3.select('#ph').text(title);d3.select('#pbody').html(`<p class="m">${esc(sub)} · ${esc(TONE.windowLabel)}</p>`+(explainHTML(x)||'<p>No aggressive posts in this window.</p>'));panel.hidden=false;document.getElementById('pclose').focus()}
function openTone(c){const row=(p,col)=>`<div class="post" style="border-left:4px solid ${col};padding-left:8px"><div class="m">@${esc(p.h)} · ${fd(p.t)}</div><div>${esc(p.text)}</div><a href="https://x.com/${encodeURIComponent(p.h)}/status/${p.id}" target="_blank" rel="noopener">Open on x.com ↗</a></div>`;
 d3.select('#ph').text(`${c.country}: ${Math.round(c.agg*100)}% aggressive, ${Math.round(c.fri*100)}% friendly`);
 d3.select('#pbody').html(`<p class="m">${c.posts} posts · ${esc(TONE.windowLabel)}</p>${c.agg>0?explainHTML(c.explain):''}<h3 class="sh3">Harshest</h3>${c.harsh.map(p=>row(p,AGC[0])).join('')||'<p class="m">No aggressive wording found.</p>'}<h3 class="sh3">Friendliest</h3>${c.friendly.map(p=>row(p,AGC[2])).join('')||'<p class="m">No friendly wording found.</p>'}`);
 panel.hidden=false;document.getElementById('pclose').focus()}
d3.select('#tplay').on('click',()=>{if(ttimer)return tstop();let i=0;setT(0);d3.select('#tplay').text('❚❚ Pause');ttimer=setInterval(()=>{i++;if(i>=TONE.periods.length){tstop();setT(-1);return}setT(i)},1600)});
const panel=document.getElementById('panel');
// ---- bursts: grouped by talking point, with what was said
(function(){const g=d3.groups(BU.bursts,b=>b.name).map(([name,bs])=>({name,bs:bs.sort((a,b)=>a.start<b.start?-1:1),acc:d3.sum(bs,b=>b.accounts)})).sort((a,b)=>b.acc-a.acc);
 d3.select('#bsum').text(`See each burst: message, accounts and timing (${BU.bursts.length} bursts)`);
 const card=d3.select('#bgroups').selectAll('div.bg').data(g).join('div').attr('class','bg').style('border-left-color',d=>tpColor(d.name)||OTHER);
 card.append('h3').html(d=>`<span class="sw" style="background:${tpColor(d.name)||'transparent'};border:2px solid ${tpColor(d.name)||OTHER}"></span>${esc(d.name)} <span class="m">${d.bs.length} burst${d.bs.length>1?'s':''}</span>`);
 card.selectAll('button.br').data(d=>d.bs).join('button').attr('class','br').on('click',(e,b)=>openBurst(b))
  .html(b=>`<span class="bw">${fd(b.start)} to ${fd(b.end)}</span><span class="bn"><b>${b.accounts}</b> accounts · <b>${b.countries}</b> countries</span><span class="bq">“${esc(b.quote)}”</span>`);
})();
function openBurst(b,ttl){d3.select('#ph').text(ttl||b.name);
 const body=d3.select('#pbody').html(`<p class="muted">${b.accounts} accounts in ${b.countries} countries and organisations, ${fd(b.start)} to ${fd(b.end)}</p>`);
 b.ids.forEach(id=>{const p=PO[id];if(!p)return;body.append('div').attr('class','post').html(`<div class="m">@${esc(p.h)} · ${esc(p.country)} · ${KIND[p.k][0]} · ${fd(p.t)}</div><div>${esc(p.text)}</div><a href="https://x.com/${encodeURIComponent(p.h)}/status/${id}" target="_blank" rel="noopener">Open on x.com ↗</a>`)});
 panel.hidden=false;document.getElementById('pclose').focus()}

// ---- talking points by week and by month (built from the daily data)
// Week = weekly points over the last five weeks; Month = daily points over the last 30 days. Each view picks its own top five talking points from its span, in the Day view's chart style.
function periodChart(el,unit){const box=document.getElementById(el);const n=ST.days.length;
 let pts,O;if(unit==='week'){const wk=d=>{const x=new Date(d+'T00:00:00Z');return new Date(+x-((x.getUTCDay()+6)%7)*864e5).toISOString().slice(0,10)};
  const ks=[...new Set(ST.days.map(wk))].slice(-5);pts=ks.map(k=>({d:new Date(k+'T12:00:00Z'),ix:ST.days.map((d,i)=>wk(d)===k?i:-1).filter(i=>i>=0)}))}
 else{pts=ST.days.slice(-30).map((d,i)=>({d:new Date(d+'T12:00:00Z'),ix:[n-Math.min(30,n)+i]}))}
 const tot=j=>d3.sum(pts,p=>d3.sum(p.ix,i=>ST.series[j].vals[i]));
 const keys=ST.series.map((s,j)=>j).filter(j=>tot(j)>0).sort((a,b)=>tot(b)-tot(a)).slice(0,5);
 const val=(p,j)=>d3.sum(p.ix,i=>ST.series[j].vals[i]);
 const f=pts.findIndex(p=>keys.some(j=>val(p,j)>0));if(f>1&&unit!=='month')pts=pts.slice(f-1);
 const w=Math.max(320,box.clientWidth),h=Math.max(240,Math.round(w*0.32)),m={l:26,r:26,t:10,b:30};const days=pts.map(p=>p.d);
 const data=pts.map(p=>{const o={};keys.forEach(j=>o[j]=val(p,j));return o});
 const stk=d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data);
 const x=d3.scaleUtc().domain(d3.extent(days)).range([m.l,w-m.r]);const y=d3.scaleLinear().domain([d3.min(stk,l=>d3.min(l,d=>d[0])),d3.max(stk,l=>d3.max(l,d=>d[1]))]).range([h-m.b,m.t]);
 const area=d3.area().x((d,i)=>x(days[i])).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
 const svg=d3.select(box).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`Streamgraph of the top five talking points ${unit==='week'?'by week, last five weeks':'by day, last 30 days'}`);
 // Golden Week annotation (1-8 Oct) when the window includes it
 const gw=[...new Set(days.map(d=>d.getUTCFullYear()))].map(yr=>[new Date(Date.UTC(yr,9,1)),new Date(Date.UTC(yr,9,8,23))]).find(([a,b])=>+days[0]<=+b&&+days[days.length-1]>=+a-864e5);
 if(gw){const xa=Math.max(m.l,x(gw[0])),xb=Math.min(w-m.r,x(gw[1]));svg.append('rect').attr('x',xa).attr('y',m.t).attr('width',Math.max(0,xb-xa)).attr('height',h-m.b-m.t).attr('fill','#c8a24a').attr('fill-opacity',.08).attr('pointer-events','none');
  svg.append('text').attr('x',xa+6).attr('y',m.t+16).attr('font-size',13).style('fill','#9aa6b8').attr('pointer-events','none').text('Golden Week');
  d3.select(box).append('p').attr('class','gwnote').style('font-size','13px').style('color','var(--muted)').style('margin','6px 0 0').text('Posting dips 2–5 October during China’s National Day holiday (Golden Week), after a spike of National Day greetings on 1 October. Weekends are also quieter.')}
 const ps=svg.append('g').selectAll('path').data(stk).join('path').attr('d',area).attr('fill',d=>TPC[d.key]).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6);
 const nt=Math.max(2,Math.min(w<600?5:99,Math.floor(w/70))),step=Math.ceil(days.length/nt);
 svg.append('g').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(days.filter((d,i)=>(days.length-1-i)%step===0)).tickFormat(d3.utcFormat('%-d %b'))).call(g=>{g.selectAll('text').attr('font-size',13);g.selectAll('line,path').attr('stroke','#5a6f94')});
 const fd2=d3.utcFormat('%-d %b');
 ps.on('mousemove',(e,d)=>{const [mx]=d3.pointer(e,svg.node());const i=d3.minIndex(days,dd=>Math.abs(x(dd)-mx*(w/svg.node().getBoundingClientRect().width)));
   showTip(e,`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${unit==='week'?'Week of '+fd2(days[i]):fday(ST.days[pts[i].ix[0]])}: ${data[i][d.key]} posts`)});svg.on('mouseleave',hideTip);ps.style('cursor','pointer');hitOpen(svg,stk,x,y,days,w);narrKeys(ps,d=>d.key);
 ps.on('touchstart',(e,d)=>showTip(e.touches[0],`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${d3.sum(data,o=>o[d.key])} posts in this span`),{passive:true});
 tpChips(el,keys)}
const VIEWS={day:['stream','Top talking points by day','Posts per day in each of the five talking points carried by the most accounts. Hover for a summary; click a talking point to read what it says and see a sample post.'],
 week:['streamw','Top talking points by week','Posts per week (Monday to Sunday) over the last five weeks, for the five talking points with the most posts in that span. Hover for a summary; click a talking point to read what it says and see a sample post.'],
 month:['streamm','Top talking points by month','Posts per day over the last 30 days (the archive starts on 1 October), for the five talking points with the most posts this month. Hover for a summary; click a talking point to read what it says and see a sample post.']};
const drawn={day:1};
function setView(v,push){if(!VIEWS[v])v='day';for(const k in VIEWS)document.getElementById(VIEWS[k][0]).hidden=k!==v;
 if(!drawn[v]){periodChart(VIEWS[v][0],v);drawn[v]=1}
 if(VK[VIEWS[v][0]])tpLeg(VK[VIEWS[v][0]]);
 d3.select('#tp-title').text(VIEWS[v][1]);d3.select('#tp-sub').text(VIEWS[v][2]);
 d3.selectAll('#tpview button').attr('aria-pressed',function(){return this.dataset.v===v});if(push)setHash('view',v==='day'?null:v)}
d3.selectAll('#tpview button').on('click',function(){setView(this.dataset.v,1)});
setView(hp().get('view')||'day');
addEventListener('hashchange',()=>{const v=hp().get('view')||'day';setView(v)});

document.getElementById('pclose').onclick=()=>{panel.hidden=true};
function openNarr(k){const n=ST.series[k];if(!n)return;window._lastFocus=document.activeElement;
 const sm=n.sample;d3.select('#ph').text(n.name);
 d3.select('#pbody').html(`<p class="says">${esc(n.says)}</p>`+(sm?`<h3 class="sh3">Sample post</h3><div class="post"><div class="m">${esc((ACC.find(a=>a.h===sm.h)||{}).name||sm.h)} (@${esc(sm.h)}) · ${fd(sm.t)}</div><div>“${esc(sm.text)}”</div><div class="m">${sm.lang==='English'?'Original in English':sm.orig?`Original in ${esc(sm.lang)}`:`Translated from ${esc(sm.lang)}`}</div><a href="https://x.com/${encodeURIComponent(sm.h)}/status/${sm.id}" target="_blank" rel="noopener">Open on x.com ↗</a></div>`:''));
 panel.hidden=false;document.getElementById('pclose').focus()}
function narrKeys(sel,key){sel.attr('tabindex',0).attr('role','button').attr('aria-label',d=>{const k=key(d);return `${ST.series[k].name}: open explanation`}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNarr(key(d))}})}
document.getElementById('pclose').addEventListener('click',()=>{window._lastFocus&&window._lastFocus.focus&&window._lastFocus.focus()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!panel.hidden&&window._lastFocus)setTimeout(()=>window._lastFocus.focus(),0);panel.hidden=true}});
// ---- method
d3.select('#method').html(`Posts were collected from ${H.accounts} X accounts run by China's foreign ministry, embassies, consulates, ambassadors and missions to international organisations, using X's full-archive search through a free connector. This version covers ${fday(H.start.slice(0,10))} to ${fd(H.end)}; earlier posts are not included. Messages count as the same talking point when posts repost the same original or when their text is a near-duplicate (character n-gram similarity, which works across scripts but does not match translations into other languages). Eight large clusters were reviewed and named by hand; related clusters were merged under one name. A burst is four or more accounts posting the same message within six hours. Tone counts words from fixed confrontational and cooperative word lists in English, Chinese, Japanese, Spanish, French, Portuguese, Russian and Arabic; it measures word choice, not intent. Location is the country an account is posted to, not where a post was written. Basemap: Natural Earth via world-atlas. The page describes past activity and makes no forecasts.`);
window._check={ready:true};
initNarr();drawRipple();

// ---- drop-downs
(function(){const G={};ACC.forEach(a=>{(G[a.type]=G[a.type]||{});(G[a.type][a.country]=G[a.type][a.country]||[]).push(a)});
 d3.select('#dd-acc summary').text(`Accounts tracked (${ACC.length})`);
 d3.select('#acc-how').text(`Accounts are official PRC accounts on X: the foreign ministry and its spokespeople, embassies, consulates, missions and ambassadors. Each was checked live on X; accounts with no posts in over 90 days are dropped. List last checked: ${H.list_checked}.`);
 const order=['Foreign ministry','Embassy','Consulate','Diplomat','Outside account'];
 d3.select('#acc-list').html(order.filter(t=>G[t]).map(t=>{const cs=Object.keys(G[t]).sort();const n=cs.reduce((s,c)=>s+G[t][c].length,0);
  return `<h3 class="sh3">${tIcon(t)}${esc(t)} (${n})</h3><dl class="accl">`+cs.map(c=>`<dt>${esc(c)}</dt><dd>${G[t][c].map(a=>`<a href="https://x.com/${encodeURIComponent(a.h)}" target="_blank" rel="noopener">${esc(a.name)} <span class="m">@${esc(a.h)}</span></a>`).join('')}</dd>`).join('')+'</dl>'}).join(''));
 const f=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 d3.select('#read-txt').text(`This page shows only openly official Chinese government accounts on X, with posts from ${f(H.start)} to ${f(H.end)} (UTC). When many accounts use similar wording or post at the same time, that shows shared messaging; it is not proof of coordination or of who directs it. Aggression and friendliness scores measure word choice, not intent.`);
 let A=null,F=[],shown=0;
 const fill=(id,vals)=>d3.select(id).selectAll('option.v').data(vals).join('option').attr('class','v').attr('value',d=>d[0]).text(d=>d[1]);
 async function load(){if(A)return;A=await (await fetch('data/archive.json')).json();
  fill('#aacc',[...new Set(A.rows.map(r=>r[1]))].sort((a,b)=>a.localeCompare(b)).map(h=>[h,'@'+h]));
  fill('#actry',[...new Set(A.rows.map(r=>r[4]))].filter(c=>c&&c!=='?').sort().map(c=>[c,c]));
  fill('#anar',A.narratives.map((n,i)=>[i,n]));
  const ds=A.rows.map(r=>r[2].slice(0,10)).sort();['#afrom','#ato'].forEach(s=>d3.select(s).attr('min',ds[0]).attr('max',ds[ds.length-1]));run()}
 function run(){if(!A)return;const q=document.getElementById('aq').value.trim().toLowerCase(),ac=aacc.value,ct=actry.value,nr=anar.value,fr=afrom.value,to=ato.value;
  F=A.rows.filter(r=>(!q||r[6].toLowerCase().includes(q))&&(!ac||r[1]===ac)&&(!ct||r[4]===ct)&&(nr===''||r[5]===+nr)&&(!fr||r[2].slice(0,10)>=fr)&&(!to||r[2].slice(0,10)<=to)).sort((a,b)=>a[2]<b[2]?1:-1);
  shown=0;d3.select('#ares').html('');more();d3.select('#acount').text(`${fmt(F.length)} of ${fmt(A.rows.length)} posts match`)}
 function more(){const nx=F.slice(shown,shown+50);shown+=nx.length;
  d3.select('#ares').insert('div').attr('class','acards').html(nx.map(r=>`<article class="post acard"><div class="m">@${esc(r[1])} · ${esc(r[4])} · ${esc(r[2].replace('T',' '))} UTC · ${A.kinds[r[3]]}${r[5]>=0?` · ${esc(A.narratives[r[5]])}`:''}</div><div>${esc(r[6])}</div><a href="https://x.com/${encodeURIComponent(r[1])}/status/${r[0]}" target="_blank" rel="noopener">Open on x.com ↗</a></article>`).join(''));
  document.getElementById('amore').hidden=shown>=F.length}
 let tm;['aq','aacc','actry','anar','afrom','ato'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(run,200)}));
 amore.onclick=more;
 acsv.onclick=()=>{if(!A)return;const e=v=>'"'+String(v).replace(/"/g,'""')+'"';const csv='id,account,country,time_utc,kind,talking_point,text,url\n'+F.map(r=>[r[0],r[1],r[4],r[2],A.kinds[r[3]],r[5]>=0?A.narratives[r[5]]:'',r[6],`https://x.com/${r[1]}/status/${r[0]}`].map(e).join(',')).join('\n');
  const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='china-diplomats-posts.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 document.getElementById('dd-arch').addEventListener('toggle',e=>{if(e.target.open)load()});
})();
})();
