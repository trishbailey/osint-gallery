(async function(){
const J=n=>fetch('data/'+n+'.json').then(r=>r.json());
const [H,ST,MX,BU,NET,TONE,SP,ACC,PO,RIP,WORLD]=await Promise.all(['headline','stream','matrix','bursts','network','tone','spread','accounts','posts','ripples'].map(J).concat([fetch('vendor/countries-50m.json').then(r=>r.json())]));
const countries=topojson.feature(WORLD,WORLD.objects.countries).features.filter(f=>f.properties.name!=='Antarctica');
const fmt=d3.format(','),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KIND={post:['Original post','#4fc3b0'],repost:['Repost','#e8a33d'],quote:['Quote','#c46ad6'],reply:['Reply','#5d8fe6']};
const TPC=['#4e9fe0','#e0703c','#5cbf7a','#b36bd6','#e6c34a'];
const tpColor=name=>{const i=ST.series.findIndex(s=>s.name===name);return i>=0?TPC[i]:null};
const OTHER='#c8a24a';
const hp=()=>new URLSearchParams(location.hash.slice(1));
function setHash(k,v){const q=hp();if(v==null)q.delete(k);else q.set(k,v);const t=q.toString();history.replaceState(null,'',location.pathname+location.search+(t?'#'+t:''))}
const TYPES={'Foreign ministry':'#e05a5a','Embassy':'#4e9fe0','Consulate':'#5cbf7a','Diplomat':'#e6b33a','Outside account':'#b36bd6'};
const AGC=['#b0182f','#d9b26a','#3fa45b'];// AGG: aggressive-share steps. Not aggressive below AGT (4%): white. Pink to dark red = more aggressive.
const AGT=0.04,AGS=[0.08,0.20],AGR=['#ffffff','#f7b3c2','#e0526f','#8e0c22'];
const aggCol=a=>a<AGT?AGR[0]:a<AGS[0]?AGR[1]:a<AGS[1]?AGR[2]:AGR[3];
const TONEB=[['Not aggressive (under 4% of posts)',AGR[0]],['Somewhat aggressive (4-8%)',AGR[1]],['Aggressive (8-20%)',AGR[2]],['Most aggressive (20% or more)',AGR[3]]];

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
lg('#lg-kind',Object.values(KIND));lg('#lg-tp',ST.series.map((s,i)=>[s.name,TPC[i]]),1);lg('#lg-tone',TONEB,1);d3.select('#lg-tone').append('div').attr('class','li').text(`Countries with fewer than ${TONE.min_posts} posts are not shown`);
d3.select('#types').selectAll('button').data(Object.entries(TYPES)).join('button').attr('class','tg').attr('aria-pressed','true').html(d=>`<span class="sw" style="background:${d[1]}"></span>${d[0]}`)
 .on('click',function(e,d){on.has(d[0])?on.delete(d[0]):on.add(d[0]);this.setAttribute('aria-pressed',on.has(d[0]));drawSpread(true);drawRipple()});
const side=document.getElementById('side'),ft=document.getElementById('ftoggle');
ft.onclick=()=>{side.classList.toggle('open');ft.setAttribute('aria-expanded',side.classList.contains('open'))};
document.getElementById('sclose').onclick=()=>{side.classList.remove('open');ft.setAttribute('aria-expanded','false')};
// ---- talking point picker
let cur=0;const NAR=SP.filter(d=>d.accounts>=5);SP.length=0;NAR.forEach(d=>SP.push(d));
const slug=n=>n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sel=d3.select('#tp');sel.selectAll('option').data(SP).join('option').attr('value',(d,i)=>i).text(d=>`${d.name} (${d.accounts} accounts)`);
sel.on('change',function(){setTP(+this.value)});
d3.select('#chips').selectAll('button').data(SP).join('button').attr('class','chip').html(d=>`<span class="sw" style="background:${tpColor(d.name)||'transparent'};border:2px solid ${tpColor(d.name)||OTHER}"></span>${esc(d.name)}`).on('click',(e,d)=>setTP(SP.indexOf(d)));
function setTP(i){cur=i;sel.property('value',i);d3.select('#chips').selectAll('button').attr('aria-pressed',(d,j)=>j===i);d3.select('#tpdesc').text(SP[i].desc);
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
(function(){const w=Math.max(320,document.getElementById('stream').clientWidth),h=Math.max(240,Math.round(w*0.32)),m={l:14,r:14,t:10,b:30};const days=ST.days.map(d=>new Date(d+'T12:00:00Z'));
 const data=ST.days.map((d,i)=>{const o={i};ST.series.forEach((s,j)=>o[j]=s.vals[i]);return o});
 const keys=ST.series.map((s,j)=>j);const stk=d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data);
 const x=d3.scaleUtc().domain(d3.extent(days)).range([m.l,w-m.r]);const y=d3.scaleLinear().domain([d3.min(stk,l=>d3.min(l,d=>d[0])),d3.max(stk,l=>d3.max(l,d=>d[1]))]).range([h-m.b,m.t]);
 const area=d3.area().x((d,i)=>x(days[i])).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
 const svg=d3.select('#stream').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label','Streamgraph of daily posts in the top five talking points');
 const ps=svg.append('g').selectAll('path').data(stk).join('path').attr('d',area).attr('fill',d=>TPC[d.key]).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6);
 svg.append('g').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(d3.utcDay.every(w<600?3:1)).tickFormat(d3.utcFormat('%-d %b'))).call(g=>{g.selectAll('text').attr('font-size',13);g.selectAll('line,path').attr('stroke','#5a6f94')});
 ps.on('mousemove',(e,d)=>{const [mx]=d3.pointer(e,svg.node());const i=d3.minIndex(days,dd=>Math.abs(x(dd)-mx*(w/svg.node().getBoundingClientRect().width)));
   showTip(e,`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${fday(ST.days[i])}: ${ST.series[d.key].vals[i]} posts`)});svg.on('mouseleave',hideTip);ps.style('cursor','pointer').on('click',(e,d)=>openNarr(d.key));narrKeys(ps,d=>d.key);ps
  .on('touchstart',(e,d)=>showTip(e.touches[0],`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${d3.sum(ST.series[d.key].vals)} posts in total`),{passive:true});
})();
// ---- matrix
(function(){const P=MX.points,R=MX.rows.slice(0,25);const cw=112,lw=200,rh=30,top=74;const w=lw+cw*P.length+10,h=top+rh*R.length+6;
 const svg=d3.select('#matrix').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Matrix of accounts by talking point');
 const mxv=d3.max(R,r=>d3.max(P,p=>r.cells[p]||0));const MXB=[['1–2 posts','#2f6f8f'],['3–5 posts','#8f5419'],['6 or more','#8e2a4f']];const col=v=>v>=6?MXB[2][1]:v>=3?MXB[1][1]:MXB[0][1];d3.select('#mxkey').html(MXB.map(b=>`<span class="li"><span class="sw" style="background:${b[1]}"></span>${b[0]}</span>`).join(''));
 const wrap=t=>{const w=t.replace(/[()']/g,'').split(' '),L=[''];w.forEach(x=>{if((L[L.length-1]+' '+x).trim().length>13&&L.length<4)L.push(x);else L[L.length-1]=(L[L.length-1]+' '+x).trim()});return L};
 svg.selectAll('text.c').data(P).join('text').attr('class','c').attr('text-anchor','middle').attr('font-size',13).each(function(d,i){const L=wrap(d);d3.select(this).selectAll('tspan').data(L).join('tspan').attr('x',lw+cw*i+cw/2).attr('y',(t,j)=>top-8-(L.length-1-j)*16).text(t=>t)});
 const g=svg.selectAll('g.r').data(R).join('g').attr('transform',(d,i)=>`translate(0,${top+rh*i})`);
 g.append('text').attr('x',lw-8).attr('y',rh/2+5).attr('text-anchor','end').attr('font-size',13).text(d=>`@${d.h}`);
 const cells=g.selectAll('rect').data(r=>P.map(p=>({r,p,v:r.cells[p]||0}))).join('rect').attr('x',(d,i)=>lw+cw*i+2).attr('y',2).attr('width',cw-4).attr('height',rh-4).attr('rx',3).attr('fill',d=>d.v?col(d.v):'#162744');
 g.selectAll('text.v').data(r=>P.map(p=>({p,v:r.cells[p]||0}))).join('text').attr('class','v').attr('x',(d,i)=>lw+cw*i+cw/2).attr('y',rh/2+5).attr('text-anchor','middle').attr('font-size',13).text(d=>d.v||'');
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
let RG=null;
function drawRipple(){const r=RP[rcur];rchip.attr('aria-pressed',(d,i)=>i===rcur);rstop();
 const box=document.getElementById('net');d3.select('#net').selectAll('*').remove();d3.select('#netlist').selectAll('*').remove();
 const amps=r.amps.filter(a=>on.has(a.type));const maxD=Math.max(60,d3.max(amps,a=>a.delay)||60);
 d3.select('#amp-sub').html(`<b>${esc(r.theme||'Post')}</b>: a post by <b>${esc(r.label)}</b> (${fd(r.t)}) was reposted or quoted by <b>${amps.length}</b> tracked accounts. Rings show how long each took: closer to the centre means faster. <span class="m">“${esc(r.text)}”</span>`);
 const phone=box.clientWidth<700;
 const rs=d3.scaleLog().domain([1,maxD+1]);
 if(phone){const list=amps.slice(0,10);
  const row=d3.select('#netlist').selectAll('div').data(list).join('div').attr('class','dbar').on('click',(e,a)=>openPost(a));
  row.html(a=>`<div class="dl"><span class="sw" style="background:${TYPES[a.type]}"></span>${esc(a.label)}</div><div class="dt"><i style="background:${TYPES[a.type]};width:${Math.max(4,rs(a.delay+1)*100)}%"></i><span>${fdur(a.delay)}</span></div>`);
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
 g.append('circle').attr('cx',12).attr('cy',14).attr('r',5).attr('fill',a=>TYPES[a.type]);
 g.append('text').attr('x',22).attr('y',19).attr('font-size',13).text(a=>a.label);
 tipOn(g,a=>`<b>${esc(a.label)}</b> (@${esc(a.h)})<br>${esc(a.type)} · ${esc(a.country)}<br>${a.k==='quote'?'Quoted':'Reposted'} after ${fdur(a.delay)}, ${fd(a.t)}<br>Click to read it`);
 const pulse=svg.append('circle').attr('cx',cx).attr('cy',cy).attr('fill','none').attr('stroke',tpColor(r.theme)||OTHER).attr('stroke-width',3);
 const cg=svg.append('g').attr('transform',`translate(${cx-ctrW/2},${cy-16})`).style('cursor','pointer').on('click',()=>openPost({h:r.h,id:r.oid,label:r.label,t:r.t,text:r.text,orig:true}));
 cg.append('rect').attr('width',ctrW).attr('height',32).attr('rx',16).attr('fill',tpColor(r.theme)||OTHER);
 cg.append('text').attr('x',ctrW/2).attr('y',21).attr('text-anchor','middle').attr('font-size',13).attr('font-weight',700).style('fill','#0b1526').text(r.label);
 tipOn(cg,()=>`<b>Original post</b> by ${esc(r.label)}<br>${fd(r.t)}<br>“${esc(r.text.slice(0,140))}”`);
 const clk=svg.append('text').attr('x',14).attr('y',24).attr('font-size',15).attr('font-weight',600).style('fill','#c8a24a');
 RG={amps,links,g,pulse,clk,phone:false};}
 RG.maxD=maxD;rset(RM?1:0);if(RM)d3.select('#rplay').text('↺ Replay')}
function rset(p){rpos=p;const m=RG.maxD*p;d3.select('#rclock').property('value',Math.round(p*1000));
 const n=RG.amps.filter(a=>a.delay<=m).length;d3.select('#rlbl').text(`+${fdur(m)} after posting · ${n} of ${RG.amps.length} accounts joined`);
 if(RG.phone){d3.select('#netlist').selectAll('.dbar').classed('on',a=>a.delay<=m);return}
 RG.clk.text(`+${fdur(m)} · ${n} accounts joined`);
 RG.g.attr('opacity',a=>a.delay<=m?1:0).attr('pointer-events',a=>a.delay<=m?'all':'none');
 RG.links.attr('stroke-opacity',a=>a.delay<=m?.75:0).attr('stroke-width',a=>{const age=m-a.delay;return a.delay>m?0:age<RG.maxD*0.03?9:3.5});
 RG.pulse.attr('r',18+((m/ (RG.maxD/12))%1)*30).attr('stroke-opacity',p<1?1-((m/(RG.maxD/12))%1):0)}
function rstop(){if(rtimer){rtimer.stop();rtimer=null}d3.select('#rplay').text(rpos>=1?'↺ Replay':'▶ Play')}
function rplay(){if(RM){rset(1);return}if(rpos>=1)rpos=0;const dur=Math.min(40000,Math.max(6000,RG.maxD/1440*10000));const s0=rpos,st=d3.now();d3.select('#rplay').text('❚❚ Pause');
 rtimer=d3.timer(()=>{const p=Math.min(1,s0+(d3.now()-st)/dur);rset(p);if(p>=1)rstop()})}
d3.select('#rplay').on('click',()=>rtimer?rstop():rplay());
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
 const zg=svg.append('g');const g=zg.append('g').selectAll('path').data(countries).join('path').attr('d',path).attr('stroke','#2c426b').attr('stroke-width',.4)
  .attr('fill',f=>{const c=byGeo[f.properties.name];return c?aggCol(c.agg):'#1b2c4a'}).attr('vector-effect','non-scaling-stroke')
  .style('cursor',f=>byGeo[f.properties.name]?'pointer':null).on('click',(e,f)=>{const c=byGeo[f.properties.name];if(c)openTone(c)});
 tipOn(g,f=>{const c=byGeo[f.properties.name];return c?tip(c):`<b>${esc(f.properties.name)}</b><br>Not shown (no tracked account or fewer than ${MP} posts)`});
 const ents=TONE.countries.filter(c=>!c.geo&&c.ll&&c.posts>=MP);const eg=zg.append('g').selectAll('g').data(ents).join('g').attr('transform',d=>{const p=proj(d.ll);return `translate(${p[0]},${p[1]})`}).style('cursor','pointer').on('click',(e,c)=>openTone(c));
 eg.append('rect').attr('x',-7).attr('y',-7).attr('width',14).attr('height',14).attr('transform','rotate(45)').attr('stroke','#e6e9ef').attr('stroke-width',1).attr('fill',c=>aggCol(c.agg));
 tipOn(eg,c=>tip(c).replace('</b>','</b> (multilateral or headquarters)'));
 const scored=TONE.countries.filter(c=>c.posts>=MP).sort((a,b)=>b.agg-a.agg);
 const hot=scored.filter(c=>c.agg>=AGT),top=hot.slice(0,5),nf=scored.filter(c=>c.agg<AGT).length;
 d3.select('#tone-head').text(`${nf} of ${scored.length} countries and organisations post almost no aggressive wording. The sharpest tone comes from ${(n=>n.slice(0,-1).join(', ')+' and '+n[n.length-1])(top.slice(0,3).map(c=>/^(Philippines|Netherlands|United |UAE|EU|African Union|Czech)/.test(c.country)?'the '+c.country:c.country))}.`);
 d3.select('#tone-win').text(TONE.windowLabel);d3.select('#tone-sub').text(`Share of each mission's posts with aggressive wording (accusations of hegemony, smears, interference, warnings), scored in ten languages. White means under ${Math.round(AGT*100)}%. Countries with fewer than ${MP} posts are not shown. Click a country or key area to see why its posts are harsh.`);
  const featOf=c=>countries.find(f=>f.properties.name===c.geo);
 const fit=(cs,pad)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;cs.forEach(c=>{const f=c.geo&&featOf(c);const b=f?path.bounds(f):(()=>{const p=proj(c.ll);return [[p[0]-8,p[1]-8],[p[0]+8,p[1]+8]]})();x0=Math.min(x0,b[0][0]);y0=Math.min(y0,b[0][1]);x1=Math.max(x1,b[1][0]);y1=Math.max(y1,b[1][1])});
  const k=Math.min(4,0.9/Math.max((x1-x0)/W,(y1-y0)/HM));return {k,x:W/2-k*(x0+x1)/2,y:HM/2-k*(y0+y1)/2}};
 const setZ=(t,anim)=>{const tr=`translate(${t.x},${t.y}) scale(${t.k})`;(anim?zg.transition().duration(900):zg).attr('transform',tr);zg.selectAll('rect').attr('stroke-width',1/t.k).attr('transform',`rotate(45) scale(${1/Math.sqrt(t.k)})`)};
 const RM2=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Key areas come from analyze.py (account regions, rolling 30-day window), with generated sentences.
 const byName={};scored.forEach(c=>byName[c.country]=c);
 const AR=(TONE.areas||[]).slice(0,4).map(a=>({...a,cs:a.countries.map(n=>byName[n]).filter(Boolean)})).filter(a=>a.cs.length);AR.forEach(a=>a.z=fit(a.cs));
 let zoomed=true,act=AR[0];
 const zb=d3.select('#tzoom');const zlab=()=>zb.text(zoomed?'Show whole world':'Zoom to key area').attr('aria-pressed',zoomed);
 const outline=names=>g.attr('stroke',f=>names.has(f.properties.name)?'#c8a24a':'#2c426b').attr('stroke-width',f=>names.has(f.properties.name)?2.5:.4);
 const pick=(a,anim)=>{act=a;zoomed=true;setZ(a.z,anim&&!RM2);zlab();outline(new Set(a.cs.map(c=>c.geo)));
  d3.selectAll('.tarea').classed('on',d=>d===a).attr('aria-pressed',d=>d===a)};
 ['#tareas','#tareas-m'].forEach(id=>d3.select(id).selectAll('li').data(AR).join('li').append('button').attr('type','button').attr('class','tarea')
  .html(a=>`<b>${esc(a.name)}</b><span class="tc">${a.cs.map(c=>`<span class="sw sq" style="background:${aggCol(c.agg)}"></span>${esc(c.country)} ${pct(c.agg)}`).join(' · ')}</span><span class="tw">${esc(a.sentence)}</span>`)
  .on('click',(e,a)=>{pick(a,1);openExplain(a.name+': why the harsh posts',a.explain,a.cs.map(c=>`${c.country} ${pct(c.agg)} aggressive`).join(' · '))}));
 if(act)pick(act,0);else{zoomed=false;zlab()}
 zb.on('click',()=>{if(zoomed){zoomed=false;setZ({k:1,x:0,y:0},!RM2);outline(new Set());d3.selectAll('.tarea').classed('on',false).attr('aria-pressed',false);zlab()}else if(act)pick(act,1)});
 d3.select('#ttop').selectAll('li').data(top).join('li').append('button').attr('class','tli').attr('type','button')
  .html((c,i)=>`<span class="sw sq" style="background:${aggCol(c.agg)}"></span><b>${i+1}. ${esc(c.country)}</b><span>${pct(c.agg)} aggressive · ${c.posts} posts</span>`)
  .on('click',function(e,c){zoomed=true;setZ(fit([c]),1);zlab();g.attr('stroke',f=>f.properties.name===c.geo?'#c8a24a':'#2c426b').attr('stroke-width',f=>f.properties.name===c.geo?2.5:.4);
   const r=document.getElementById('tmap').getBoundingClientRect(),b=this.getBoundingClientRect();openTone(c)});

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
 const card=d3.select('#bgroups').selectAll('div.bg').data(g).join('div').attr('class','bg').style('border-left-color',d=>tpColor(d.name)||OTHER);
 card.append('h3').html(d=>`<span class="sw" style="background:${tpColor(d.name)||'transparent'};border:2px solid ${tpColor(d.name)||OTHER}"></span>${esc(d.name)} <span class="m">${d.bs.length} burst${d.bs.length>1?'s':''}</span>`);
 card.selectAll('button.br').data(d=>d.bs).join('button').attr('class','br').on('click',(e,b)=>openBurst(b))
  .html(b=>`<span class="bw">${fd(b.start)} to ${fd(b.end)}</span><span class="bn"><b>${b.accounts}</b> accounts · <b>${b.countries}</b> countries</span><span class="bq">“${esc(b.quote)}”</span>`);
 const days=BU.days,cs=30,lw=110,top=34,w=lw+24*cs+10,h=top+days.length*cs+12;
 const cell={};BU.bursts.forEach(b=>b.ids.forEach(id=>{const p=PO[id];if(!p)return;const k=p.t.slice(0,13);(cell[k]=cell[k]||[]).push(b)}));
 const svg=d3.select('#calv').append('svg').attr('class','native').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Calendar of bursts by day and hour, coloured by talking point');
 svg.selectAll('text.hr').data(d3.range(0,24,3)).join('text').attr('class','hr').attr('x',d=>lw+d*cs+cs/2).attr('y',top-10).attr('text-anchor','middle').attr('font-size',13).text(d=>String(d).padStart(2,'0')+':00');
 const gd=svg.selectAll('g.d').data(days).join('g').attr('class','d').attr('transform',(d,i)=>`translate(0,${top+i*cs})`);
 gd.append('text').attr('x',lw-12).attr('y',cs/2+5).attr('text-anchor','end').attr('font-size',13).text(d=>fday(d));
 const data=d=>d3.range(24).map(hh=>{const bs=cell[d+'T'+String(hh).padStart(2,'0')]||[];const t=d3.greatest(d3.rollups(bs,v=>v.length,b=>b.name),x=>x[1]);return {d,hh,n:bs.length,a:BU.cal[d]?.all[hh]||0,name:t?t[0]:null,bs:[...new Set(bs)]}});
 const cells=gd.selectAll('rect.c').data(data).join('rect').attr('class','c').attr('x',d=>lw+d.hh*cs+2).attr('y',2).attr('width',cs-4).attr('height',cs-4).attr('rx',3)
  .attr('fill',d=>d.name?(tpColor(d.name)||'#0f1b31'):d.a?'#172a4b':'#101d35').attr('stroke',d=>d.name&&!tpColor(d.name)?OTHER:'none').attr('stroke-width',2.5)
  .style('cursor',d=>d.name?'pointer':'default').on('click',(e,d)=>{if(d.bs.length)openBurst(d.bs[0])});
 tipOn(cells,d=>`<b>${fday(d.d)}, ${String(d.hh).padStart(2,'0')}:00 UTC</b><br>${d.a} posts${d.name?`<br>Burst: <b>${esc(d.name)}</b> (${d.n} posts)<br>Click to read them`:''}`);
})();
function openBurst(b){d3.select('#ph').text(b.name);
 const body=d3.select('#pbody').html(`<p class="muted">${b.accounts} accounts in ${b.countries} countries and organisations, ${fd(b.start)} to ${fd(b.end)}</p>`);
 b.ids.forEach(id=>{const p=PO[id];if(!p)return;body.append('div').attr('class','post').html(`<div class="m">@${esc(p.h)} · ${esc(p.country)} · ${KIND[p.k][0]} · ${fd(p.t)}</div><div>${esc(p.text)}</div><a href="https://x.com/${encodeURIComponent(p.h)}/status/${id}" target="_blank" rel="noopener">Open on x.com ↗</a>`)});
 panel.hidden=false;document.getElementById('pclose').focus()}

// ---- talking points by week and by month (built from the daily data)
function periodChart(el,unit){const box=document.getElementById(el);const fmtD=d3.utcFormat('%-d %b');
 const key=d=>{const x=new Date(d+'T00:00:00Z');if(unit==='month')return d.slice(0,7)+'-01';const wd=(x.getUTCDay()+6)%7;return new Date(+x-wd*864e5).toISOString().slice(0,10)};
 const keys=[...new Set(ST.days.map(key))];
 const P=keys.map(k=>{const ds=ST.days.filter(d=>key(d)===k);const s=new Date(k+'T00:00:00Z');const e=unit==='month'?new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0)):new Date(+s+6*864e5);
  const a=new Date(ds[0]+'T00:00:00Z'),b=new Date(ds[ds.length-1]+'T00:00:00Z');const partial=+a>+s||+b<+e||ds[ds.length-1]===H.end.slice(0,10);
  const base=unit==='month'?d3.utcFormat('%B %Y')(s):`Week of ${fmtD(s)}`;
  return {k,label:base,sub:partial?`partial: ${fmtD(a)}${+a===+b?'':'–'+fmtD(b)}`:`${fmtD(s)}–${fmtD(e)}`,vals:ST.series.map(sr=>d3.sum(ds,d=>sr.vals[ST.days.indexOf(d)]))}});
 const w=Math.max(320,box.clientWidth);
 if(P.length>=3){const h=Math.max(240,Math.round(w*0.32)),m={l:14,r:14,t:10,b:46};
  const data=P.map(p=>{const o={};p.vals.forEach((v,j)=>o[j]=v);return o});const stk=d3.stack().keys(ST.series.map((s,j)=>j)).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data);
  const x=d3.scalePoint().domain(P.map(p=>p.k)).range([m.l+80,w-m.r-80]);const y=d3.scaleLinear().domain([d3.min(stk,l=>d3.min(l,d=>d[0])),d3.max(stk,l=>d3.max(l,d=>d[1]))]).range([h-m.b,m.t]);
  const svg=d3.select(box).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`Streamgraph of posts per ${unit} in the top five talking points`);
  const ps=svg.append('g').selectAll('path').data(stk).join('path').attr('d',d3.area().x((d,i)=>x(P[i].k)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis)).attr('fill',d=>TPC[d.key]).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6).style('cursor','pointer');
  const ax=svg.append('g').selectAll('g').data(P).join('g').attr('transform',p=>`translate(${x(p.k)},${h-m.b+18})`);
  ax.append('text').attr('text-anchor','middle').attr('font-size',13).text(p=>p.label);ax.append('text').attr('y',17).attr('text-anchor','middle').attr('font-size',13).style('fill','#9aa6b8').text(p=>p.sub);
  ps.on('mousemove',(e,d)=>{const [mx]=d3.pointer(e,svg.node());const sc=w/svg.node().getBoundingClientRect().width;const i=d3.minIndex(P,p=>Math.abs(x(p.k)-mx*sc));showTip(e,`<b>${esc(ST.series[d.key].name)}</b><br><i>${esc(ST.series[d.key].line)}</i><br>${P[i].label} (${P[i].sub}): ${P[i].vals[d.key]} posts<br>Click to read what it says`)});
  svg.on('mouseleave',hideTip);ps.on('click',(e,d)=>openNarr(d.key));narrKeys(ps,d=>d.key);
 } else {
  // too few periods for a stream: ranked bars per period
  const nar=w<520,rowH=nar?52:34,lw=nar?0:Math.min(250,w*0.45),h=P.length*(ST.series.length*rowH+56)+6;
  const svg=d3.select(box).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('role','img').attr('aria-label',`Posts per ${unit} in the top five talking points`);
  const mx=d3.max(P,p=>d3.max(p.vals));const x=d3.scaleLinear().domain([0,mx]).range([0,w-lw-60]);let y0=0;
  P.forEach(p=>{svg.append('text').attr('x',0).attr('y',y0+22).attr('font-size',15).attr('font-weight',600).text(p.label);
   svg.append('text').attr('x',0).attr('y',y0+40).attr('font-size',13).style('fill','#9aa6b8').text(p.sub);
   const ord=ST.series.map((s,j)=>j).sort((a,b)=>p.vals[b]-p.vals[a]);
   const g=svg.append('g').attr('transform',`translate(0,${y0+52})`).selectAll('g').data(ord).join('g').attr('transform',(j,i)=>`translate(0,${i*rowH})`).style('cursor','pointer').on('click',(e,j)=>openNarr(j));narrKeys(g,j=>j);
   g.append('text').attr('x',nar?0:lw-10).attr('y',nar?14:rowH/2+3).attr('text-anchor',nar?'start':'end').attr('font-size',13).text(j=>ST.series[j].name);
   g.append('rect').attr('x',lw).attr('y',nar?20:4).attr('height',rowH-12).attr('rx',3).attr('width',j=>Math.max(2,x(p.vals[j]))).attr('fill',j=>TPC[j]);
   g.append('text').attr('x',j=>lw+x(p.vals[j])+8).attr('y',nar?rowH-18:rowH/2+3).attr('font-size',13).text(j=>p.vals[j]);
   tipOn(g,j=>`<b>${esc(ST.series[j].name)}</b><br><i>${esc(ST.series[j].line)}</i><br>${p.label} (${p.sub}): ${p.vals[j]} posts<br>Click to read what it says`);
   y0+=ST.series.length*rowH+56});
 }}
const VIEWS={day:['stream','Top talking points by day','Posts per day in each of the five talking points carried by the most accounts. Hover for counts; click one to see it spread on the map.'],
 week:['streamw','Top talking points by week','The same five talking points added up by week (Monday to Sunday). Partial weeks show the dates covered.'],
 month:['streamm','Top talking points by month','Posts per month, ranked. Collection began on 17 October, so October is partial; this becomes a stream once there are three months of data.']};
const drawn={day:1};
function setView(v,push){if(!VIEWS[v])v='day';for(const k in VIEWS)document.getElementById(VIEWS[k][0]).hidden=k!==v;
 if(!drawn[v]){periodChart(VIEWS[v][0],v);drawn[v]=1}
 d3.select('#tp-title').text(VIEWS[v][1]);d3.select('#tp-sub').text(VIEWS[v][2]);
 d3.selectAll('#tpview button').attr('aria-pressed',function(){return this.dataset.v===v});if(push)setHash('view',v==='day'?null:v)}
d3.selectAll('#tpview button').on('click',function(){setView(this.dataset.v,1)});
setView(hp().get('view')||'day');
addEventListener('hashchange',()=>{const v=hp().get('view')||'day';setView(v)});

document.getElementById('pclose').onclick=()=>{panel.hidden=true};
function openNarr(k){const n=ST.series[k];if(!n)return;window._lastFocus=document.activeElement;
 const sm=n.sample;d3.select('#ph').text(n.name);
 d3.select('#pbody').html(`<p class="says">${esc(n.says)}</p>`+(sm?`<h3 class="sh3">Sample post</h3><div class="post"><div class="m">${esc((ACC.find(a=>a.h===sm.h)||{}).name||sm.h)} (@${esc(sm.h)}) · ${fd(sm.t)}</div><div>“${esc(sm.text)}”</div><div class="m">${sm.lang==='English'?'Original in English':`Translated from ${esc(sm.lang)}`}</div><a href="https://x.com/${encodeURIComponent(sm.h)}/status/${sm.id}" target="_blank" rel="noopener">Open on x.com ↗</a></div>`:''));
 panel.hidden=false;document.getElementById('pclose').focus()}
function narrKeys(sel,key){sel.attr('tabindex',0).attr('role','button').attr('aria-label',d=>{const k=key(d);return `${ST.series[k].name}: open explanation`}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNarr(key(d))}})}
document.getElementById('pclose').addEventListener('click',()=>{window._lastFocus&&window._lastFocus.focus&&window._lastFocus.focus()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!panel.hidden&&window._lastFocus)setTimeout(()=>window._lastFocus.focus(),0);panel.hidden=true;side.classList.remove('open')}});
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
  return `<h3 class="sh3"><span class="sw" style="background:${TYPES[t]}"></span>${esc(t)} (${n})</h3><dl class="accl">`+cs.map(c=>`<dt>${esc(c)}</dt><dd>${G[t][c].map(a=>`<a href="https://x.com/${encodeURIComponent(a.h)}" target="_blank" rel="noopener">${esc(a.name)} <span class="m">@${esc(a.h)}</span></a>`).join('')}</dd>`).join('')+'</dl>'}).join(''));
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
