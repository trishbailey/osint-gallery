// Story mode and aggregated explore view. Uses window.GF exported by app.js.
(async function(){
while(!window.GF)await new Promise(r=>setTimeout(r,50));
const {map,cv,hideRaw,showRaw,openP,esc,fmt,title,M}=GF;
const S=await fetch("data/story.json").then(r=>r.json());
const CN={CHN:"China",IND:"India",TUR:"Turkey",KOR:"South Korea",BRA:"Brazil",EGY:"Egypt",MYS:"Malaysia",MAR:"Morocco",SDN:"Sudan",VEN:"Venezuela",IDN:"Indonesia",ARE:"UAE",LKA:"Sri Lanka",ESH:"Western Sahara",SGP:"Singapore"};
const cn=c=>CN[c]||c;
const LC={Primorsk:"#4fa3e0","Ust-Luga":"#4fa3e0",Novorossiysk:"#e8913a",Taman:"#e8913a",Kozmino:"#5cc98a",Murmansk:"#d97cb0"};
const EC={port:"#4fa3e0",loitering:"#e8913a",gap:"#e05a6a"};
const pct=Math.round(S.big3/S.voyages*100);
const lay=L.layerGroup().addTo(map);
function curve(a,b,bend=.18){const pts=[];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[1]-a[1],dy=b[0]-a[0];const c=[mx+dx*bend,my-dy*bend];for(let t=0;t<=1.0001;t+=.05)pts.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]]);return pts}
function flows(filter){const fs=S.flows.filter(f=>!filter||filter(f));const mx=Math.max(...fs.map(f=>f.n));const b=[];
 fs.forEach(f=>{const c=LC[f.from]||"#f2d16b";L.polyline(curve(f.a,f.b),{renderer:cv,color:c,weight:1.5+7*f.n/mx,opacity:.8}).bindTooltip(`<b>${esc(f.from)} → ${esc(cn(f.to))}</b><br>${f.n} voyages in 12 months`,{sticky:true}).addTo(lay);
  L.circleMarker(f.b,{renderer:cv,radius:4,color:"#0b1526",weight:1,fillColor:"#f5f7fa",fillOpacity:1}).bindTooltip(esc(cn(f.to))).addTo(lay);b.push(f.a,f.b)});
 const seen={};fs.forEach(f=>{if(seen[f.from])return;seen[f.from]=1;L.circleMarker(f.a,{radius:7,color:"#0b1526",weight:2,fillColor:LC[f.from]||"#f2d16b",fillOpacity:1}).bindTooltip(esc(f.from)+" (loading port)",{permanent:!GF.phone(),direction:f.from==="Ust-Luga"?"left":"right",className:"pill"}).addTo(lay)});
 return b}
function hotspots(only){const hs=M.hot.filter(h=>h.k==="sts"&&(!only||only.includes(h.n)));const cnt=Object.fromEntries(S.sts);const b=[];
 hs.forEach(h=>{const n=cnt[h.n]||0;L.circle([h.lat,h.lon],{radius:h.r*1000*(1+Math.sqrt(n)/12),color:"#e8913a",weight:2,fillColor:"#e8913a",fillOpacity:.35}).bindTooltip(`<b>${esc(h.n)}</b><br>${n.toLocaleString()} loitering events in 12 months`,{sticky:true}).addTo(lay);b.push([h.lat,h.lon])});return b}
function evs(list,big){const b=[];list.forEach(e=>{const c=EC[e.t]||"#f5f7fa";L.circleMarker([e.lat,e.lon],{renderer:cv,radius:big?7:5,color:"#0b1526",weight:1,fillColor:c,fillOpacity:.95}).bindTooltip(`${e.t==="port"?"Port call":e.t==="gap"?"Transponder off":"Loitering"}: ${fmt(e.s)}${e.port?"<br>"+esc(title(e.port)):""}${e.pf?" ("+esc(cn(e.pf))+")":""}${e.hrs?"<br>"+Math.round(e.hrs)+" hours":""}${e.hz?"<br>"+esc(e.hz):""}${e.inf?"<br>Near "+esc(e.inf):""}`).addTo(lay);b.push([e.lat,e.lon])});return b}
function path(pts,c){L.polyline(pts,{renderer:cv,color:c,weight:3,opacity:.9,dashArray:"8 6"}).addTo(lay)}
const CLS=GF.CL,K=S.classes||{},NC=Object.values(K).reduce((a,b)=>a+b,0);
function lastPos(){const last={};M.events.forEach(e=>{if(!last[e.imo]||e.s>last[e.imo].s)last[e.imo]=e});const b=[];
 Object.values(last).forEach(e=>{const c=(GF.P[e.imo]||{}).cls||"other";if(c==="other")return;L.circleMarker([e.lat,e.lon],{renderer:cv,radius:5,color:"#0b1526",weight:1,fillColor:CLS[c][1],fillOpacity:.95}).bindTooltip(`<b>${esc(title((GF.P[e.imo]||{}).name||e.imo))}</b><br>${CLS[c][0]}<br>Last recorded ${fmt(e.s)}`).on("click",()=>openP(e.imo)).addTo(lay);b.push([e.lat,e.lon])});return b}
const B3=["CHN","IND","TUR"],B3C={CHN:"#9b7be8",IND:"#e8913a",TUR:"#4fa3e0"},B3F={CHN:"China",IND:"India",TUR:"Turkey"},B3P={CHN:[34,104],IND:[21,78.5],TUR:[39,35]},B3N=Object.fromEntries(S.dest);
function big3(){L.geoJSON(GF.LAND,{filter:f=>Object.values(B3F).includes(f.properties.n),style:f=>{const c=B3.find(k=>B3F[k]===f.properties.n);return{color:"#0b1526",weight:1,fillColor:B3C[c],fillOpacity:.7}},onEachFeature:(f,l)=>l.bindTooltip(esc(f.properties.n),{sticky:true})}).addTo(lay);
 const fs=S.flows.filter(f=>B3.includes(f.to)),rs=(S.routes||[]).slice().sort((x,y)=>y.n-x.n),mx=Math.max(...rs.map(r=>r.n));
 // sea-lane routes precomputed in the build (searoute); widest drawn first so thinner lanes stay visible on top
 rs.forEach(r=>L.polyline(r.line,{renderer:cv,color:"#0b1526",weight:2+5*r.n/mx+3,opacity:.85,interactive:false,lineJoin:"round"}).addTo(lay));
 rs.forEach(r=>L.polyline(r.line,{renderer:cv,color:RED,weight:2+5*r.n/mx,opacity:.35,lineJoin:"round",smoothFactor:1.5}).bindTooltip(`<b>${esc(r.from)} → ${esc(cn(r.to))}</b><br>${r.n} trips in 12 months (aggregate route, not a ship track)`,{sticky:true}).addTo(lay));
 ARW.set(rs,mx);
 const ph=GF.phone(),seen={};
 // port labels: fixed sea anchors + thin leader lines (geographic, so they hold at any zoom)
 const PA={Kozmino:[39.6,134.6],Primorsk:[62.3,21],"Ust-Luga":[57.8,26.5],Novorossiysk:[42.2,39.8],Taman:[47.6,38.5],Murmansk:[73,40]};if(ph)Object.assign(PA,{Kozmino:[39.5,126],Primorsk:[64.5,31],Novorossiysk:[42.2,39.8]});const PH=["Kozmino","Primorsk","Novorossiysk","Murmansk"];
 fs.forEach(f=>{if(seen[f.from])return;seen[f.from]=1;const dot=L.circleMarker(f.a,{radius:5,color:"#0b1526",weight:2,fillColor:"#f5f7fa",fillOpacity:1}).bindTooltip(esc(f.from)+" (loading port)").addTo(lay);
  const an=PA[f.from];if(!an||(ph&&!PH.includes(f.from)))return;
  L.polyline([f.a,an],{color:"#f5f7fa",weight:1,opacity:.8,interactive:false}).addTo(lay);
  L.marker(an,{icon:L.divIcon({className:"",iconSize:[0,0],html:`<div class="pl">${esc(f.from)}</div>`}),interactive:false}).addTo(lay)});
 // country names: small and light; counts in sea callouts joined by leader lines
 const CNP={CHN:[37.5,93],IND:[23.5,77],TUR:[38.6,32.2]},BA=GF.phone()?{CHN:[19,130],IND:[-4,72],TUR:[3,4]}:{CHN:[19,130],IND:[5,65],TUR:[27,15]};
 B3.forEach(c=>{
  L.polyline([B3P[c],BA[c]],{color:B3C[c],weight:1.5,opacity:1,interactive:false}).addTo(lay);
  L.marker(BA[c],{icon:L.divIcon({className:"",iconSize:[0,0],html:`<div class="b3l" style="border-color:${B3C[c]}"><b style="color:${B3C[c]}">${B3N[c]||0}</b><span>trips · ${Math.round(100*(B3N[c]||0)/S.voyages)}%</span></div>`}),interactive:false}).addTo(lay)});
 return ph?[[0,-6],[70,136]]:[[-2,-12],[72,138]]}
const C=S.cases,ch=C.chain,id=C.identity,nw=C.network,dk=C.dark;
const loHrs=ch.ev.filter(e=>e.t==="loitering"&&e.hz).reduce((a,e)=>a+(e.hrs||0),0),loHz=(ch.ev.find(e=>e.t==="loitering"&&e.hz)||{}).hz;
const flagsY=new Set(id.hist.filter(h=>h[2]>="2025-01-01").map(h=>h[1]));
const CH=[
 {k:"route",t:"1. Load in Russia, unload in Asia",
  c:`Over the past year these tankers made ${S.voyages.toLocaleString()} trips from a Russian oil terminal to a foreign port. ${pct}% of them ended in China, India or Turkey. Pacific oil from Kozmino goes mostly to China. Baltic oil from Primorsk and Ust-Luga goes mostly to India.`,
  key:B3.map(c=>[B3C[c],`${cn(c)}: ${B3N[c]} trips (${Math.round(100*B3N[c]/S.voyages)}%)`]),d:()=>big3()},
 {k:"swap",t:"2. Waiting where cargoes change hands",
  c:`Tankers often spend days drifting in a few stretches of open water where ship-to-ship transfers cluster. ${esc(title(ch.name))} (IMO ${ch.imo}) loaded at ${esc(ch.load)} on ${fmt(ch.ld)}. It then loitered for about ${loHrs<48?Math.round(loHrs)+" hours":Math.round(loHrs/24)+" days"} in the area ${esc(loHz?"off "+loHz.replace(/ \(.*/,""):"")}, and its next port call was in ${esc(cn(ch.dest))} on ${fmt(ch.da)}. Loitering is consistent with a transfer but does not prove one.`,
  d:()=>{const b=hotspots();return b.concat(evs(ch.ev,true))},ship:ch.imo},
 {k:"identity",t:"3. New name, same run",
  c:`${S.changed} of ${S.ships} tankers took a new name, flag or radio identity (MMSI) in the past 12 months. ${esc(title(id.name))} (IMO ${id.imo}) sailed under ${flagsY.size} different flags from January 2025: ${[...flagsY].join(", ")}. It became ${esc(title(id.name))} in ${fmt(id.hist[id.hist.length-1][2])}. It was carrying Kozmino oil to China before the change and kept doing so afterwards.`,
  d:()=>{const b=[];id.voy.forEach((v,i)=>{L.polyline(curve(v.line[0],v.line[1]),{color:v.ld>=id.hist[id.hist.length-1][2]?"#d97cb0":"#5cc98a",weight:4,opacity:.9}).bindTooltip(`${fmt(v.ld)}: ${esc(v.load)} → ${esc(cn(v.dest))}`,{sticky:true}).addTo(lay);b.push(...v.line)});return b},
  key:[["#5cc98a","before the name change"],["#d97cb0","after"]],ship:id.imo},
 {k:"network",t:"4. One company, many ships",
  c:`Many of these tankers are owned or managed by a handful of companies. ${esc(nw.name)} is linked to ${nw.ships.length} of them (${nw.ships.map(s=>esc(title(s[1]))).join(", ")}), which made ${nw.flows.length} trips from Russian terminals in 12 months. Using several small companies spreads the risk: if one ship is stopped, the others keep sailing.`,
  d:()=>{const b=[];nw.flows.forEach(f=>{L.polyline(curve(f[0],f[1]),{renderer:cv,color:"#b58cf0",weight:2.5,opacity:.7}).bindTooltip(esc(title(f[2])),{sticky:true}).addTo(lay);b.push(f[0],f[1])});return b},chips:nw.ships},
 {k:"dark",t:"5. Going dark",
  c:`${S.gaps} times in 12 months, one of these tankers switched off or lost its transponder for 12 hours or more (${S.gapShips} ships). ${S.gapsJamWindow} of these gaps fall within the 90 days of GPS-interference data we have, and none happened where interference was reported that day. That points to switch-offs rather than jamming. ${esc(title(dk.name))} (IMO ${dk.imo}) went dark three times off West Africa between April and June 2026.`,
  d:()=>{evs(S.cases.allgaps.filter(e=>!dk.ev.includes(e)));return evs(dk.ev,true)},key:[["#e05a6a","transponder off"],["#4fa3e0","port call"]],ship:dk.imo},
 {k:"classes",t:"6. Five ways of working",
  c:`Sorted by what they did over 12 months, ${K.core} tankers are regular Russia runners and ${K.hub} are transfer hub ships, whose trips mostly include loitering or meetings consistent with ship-to-ship transfers. ${K.dev} were recently renamed or reflagged and kept loading Russian oil, and ${K.taxi} mix Russian cargoes with other trade. Regular runners made ${(S.classVoy||{}).core} of the ${S.voyages} trips.`,x:`<div class="cbars">${Object.keys(CLS).filter(k=>k!=="other").sort((a,b)=>(K[b]||0)-(K[a]||0)).map(k=>`<div class="row" title="${CLS[k][2]}"><span>${CLS[k][0]}</span><i style="width:${(100*(K[k]||0)/Math.max(K.hub,K.core,K.dev,K.taxi)).toFixed(0)}%;background:${CLS[k][1]}"></i><b>${K[k]||0}</b></div>`).join("")}</div><p class="note">Some tankers have too few recorded trips to classify and are left off this map.</p>`,
  key:Object.keys(CLS).filter(k=>k!=="other").map(k=>[CLS[k][1],CLS[k][0]]),d:()=>lastPos()}];
// headline findings
const H=[[`${pct}%`,`of ${S.voyages.toLocaleString()} trips from Russian oil terminals ended in China, India or Turkey`,"route"],
 [S.changed.toLocaleString(),`of ${S.ships} tankers changed name, flag or MMSI in 12 months`,"identity"],
 [S.sts[0][1].toLocaleString(),`loitering events off ${S.sts[0][0].replace(/ \(.*/,"")}, the busiest transfer area`,"hot"],
 [S.loads[0][0],`busiest loading port (${S.loads[0][1]} trips), then ${S.loads[1][0]} (${S.loads[1][1]}) and ${S.loads[2][0]} (${S.loads[2][1]})`,"loads"],
 [`${K.core}`,`regular Russia runners among ${NC} tankers, plus ${K.hub} transfer hub ships`,"classes"],
 [S.gaps,`transponder switch-offs, none in reported GPS-interference zones`,"dark"]];
document.getElementById("heads").innerHTML=H.map(h=>`<button class="head" data-g="${h[2]}"><b>${esc(h[0])}</b><span>${esc(h[1])}</span></button>`).join("");
const box=document.getElementById("story"),cards=document.getElementById("chapters");
cards.innerHTML=CH.map((c,i)=>`<article class="chap" data-i="${i}" tabindex="0"><h3>${c.t}</h3><p>${c.c}</p>${c.x||""}${c.key?`<div class="key">${c.key.map(k=>`<span><i style="background:${k[0]}"></i>${k[1]}</span>`).join("")}</div>`:""}${c.ship?`<button class="lnk" data-p="${c.ship}">Open ship profile</button>`:""}${c.chips?`<div>${c.chips.map(s=>`<span class="chip" role="button" tabindex="0" data-p="${s[0]}">${esc(title(s[1]))}</span>`).join("")}</div>`:""}</article>`).join("");
cards.querySelectorAll("[data-p]").forEach(b=>b.onclick=e=>{e.stopPropagation();openP(b.dataset.p)});
let cur=0,mode="story";
// chapter 1: red chevrons flowing along the aggregate sea routes, source port -> buyer. Canvas overlay, runs only while visible.
const RED="#e8423f",ARW=(()=>{const c=document.createElement("canvas");c.className="arw";map.createPane("arwp").style.zIndex=450;map.getPane("arwp").appendChild(c);const x=c.getContext("2d");
 const rm=matchMedia("(prefers-reduced-motion: reduce)");let R=null,M=1,P=[],vis=true,raf=0,t0=performance.now();
 function proj(){const s=map.getSize(),d=devicePixelRatio||1;c.width=s.x*d;c.height=s.y*d;c.style.width=s.x+"px";c.style.height=s.y+"px";x.setTransform(d,0,0,d,0,0);L.DomUtil.setPosition(c,map.containerPointToLayerPoint([0,0]));
  P=(R||[]).map(r=>{const p=r.line.map(q=>map.latLngToContainerPoint(q)),L=[0];for(let i=1;i<p.length;i++)L.push(L[i-1]+p[i].distanceTo(p[i-1]));const k=r.n/M;return{p,L,T:L[L.length-1],gap:Math.max(16,60-44*k),sz:2.5+3*k}})}
 function at(o,d){let i=1;while(i<o.L.length-1&&o.L[i]<d)i++;const a=o.p[i-1],b=o.p[i],f=(d-o.L[i-1])/((o.L[i]-o.L[i-1])||1);return[a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,Math.atan2(b.y-a.y,b.x-a.x)]}
 function chev(px,py,an,s,head){x.save();x.translate(px,py);x.rotate(an);x.beginPath();if(head){x.moveTo(s*1.6,0);x.lineTo(-s,s*1.2);x.lineTo(-s,-s*1.2);x.closePath();x.fill()}else{x.moveTo(-s,-s);x.lineTo(s*.6,0);x.lineTo(-s,s);x.stroke()}x.restore()}
 function draw(now){x.clearRect(0,0,c.width,c.height);if(!R)return;const off=rm.matches?0:((now-t0)/1000*28);x.strokeStyle=x.fillStyle=RED;x.lineCap=x.lineJoin="round";
  P.forEach(o=>{x.lineWidth=Math.max(1.6,o.sz*.45);for(let d=(off%o.gap);d<o.T-o.sz*2;d+=o.gap){const[a,b,an]=at(o,d);chev(a,b,an,o.sz,false)}const[a,b,an]=at(o,o.T-.01);chev(a,b,an,o.sz+.8,true)})}
 function loop(now){raf=0;if(!R)return;draw(now);if(vis&&!rm.matches&&!document.hidden)raf=requestAnimationFrame(loop)}
 function kick(){if(!raf&&R)raf=requestAnimationFrame(loop)}
 map.on("zoomstart movestart",()=>{c.style.opacity=0});map.on("zoomend moveend resize",()=>{c.style.opacity=1;proj();kick();draw(performance.now())});
 new IntersectionObserver(e=>{vis=e[0].isIntersecting;kick()}).observe(map.getContainer());document.addEventListener("visibilitychange",kick);rm.addEventListener&&rm.addEventListener("change",kick);
 return{set(rs,mx){R=rs;M=mx||1;proj();if(!R){x.clearRect(0,0,c.width,c.height);return}draw(performance.now());kick()},running:()=>!!raf,pts:()=>P.map(o=>o.p.map(q=>[q.x,q.y]))}})();
GF.ARW=ARW;
function fit(b){map.options.zoomSnap=.25;if(GF.phone())map.setMinZoom(1);map.invalidateSize();if(b&&b.length)map.flyToBounds(L.latLngBounds(b).pad(.15),{duration:.8,maxZoom:6})}
function go(i){cur=Math.max(0,Math.min(CH.length-1,i));lay.clearLayers();ARW.set(null);hideRaw();fit(CH[cur].d());
 cards.querySelectorAll(".chap").forEach((c,j)=>c.classList.toggle("on",j===cur));document.getElementById("cpos").textContent=`${cur+1} / ${CH.length}`;
 const el=cards.children[cur];if(GF.phone())cards.scrollTo({left:el.offsetLeft-cards.offsetLeft,behavior:"smooth"})}
function step(i){go(i);if(!GF.phone())cards.children[cur].scrollIntoView({behavior:"smooth",block:"center"})}
document.getElementById("prev").onclick=()=>step(cur-1);document.getElementById("next").onclick=()=>step(cur+1);
const io=new IntersectionObserver(es=>{if(GF.phone()||mode!=="story")return;es.forEach(e=>{if(e.isIntersecting){const i=+e.target.dataset.i;if(i!==cur)go(i)}})},{rootMargin:"-45% 0px -45% 0px"});cards.querySelectorAll(".chap").forEach(c=>io.observe(c));
cards.querySelectorAll(".chap").forEach((c,i)=>c.onclick=()=>go(i));
let st;cards.addEventListener("scroll",()=>{if(!GF.phone())return;clearTimeout(st);st=setTimeout(()=>{const i=Math.round(cards.scrollLeft/cards.children[0].offsetWidth);if(i!==cur)go(i)},150)});
const raw=document.getElementById("rawt");
function explore(){lay.clearLayers();ARW.set(null);if(raw.checked){showRaw();return}hideRaw();const b=flows();hotspots();fit(b)}
function setMode(m){mode=m;document.body.classList.toggle("story",m==="story");document.body.classList.toggle("explore",m!=="story");
 document.querySelectorAll("#modes button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m));setTimeout(()=>map.invalidateSize(),0);m==="story"?go(cur):explore()}
document.querySelectorAll("#modes button").forEach(b=>b.onclick=()=>setMode(b.dataset.m));
raw.onchange=()=>{document.body.classList.toggle("raw",raw.checked);explore()};
document.querySelectorAll(".head").forEach(b=>b.onclick=()=>{const g=b.dataset.g;
 if(g==="hot"){setMode("explore");lay.clearLayers();fit(hotspots([S.sts[0][0]]).map(p=>[p[0]+3,p[1]+3]).concat(hotspots([S.sts[0][0]]).map(p=>[p[0]-3,p[1]-3])))}
 else if(g==="loads"){setMode("explore");lay.clearLayers();fit(flows(f=>f.from===S.loads[0][0]))}
 else{setMode("story");step(CH.findIndex(c=>c.k===g))}
 if(GF.phone()||mode!=="story")document.getElementById("map").scrollIntoView({behavior:"smooth",block:"center"})});
setMode("story");
fetch("data/trade.json").then(r=>r.ok?r.json():null).then(T=>{const box=document.getElementById("trade");if(!T||!T.rows.length){box.remove();return}
 const CC={China:"#9b7be8",India:"#e8913a",Turkey:"#4fa3e0"};
 function draw(h){const rows=T.rows.filter(r=>r.hs===h),mx=Math.max(...rows.map(r=>r.usd));
  document.getElementById("trbars").innerHTML=Object.keys(CC).map(c=>`<div class="tgrp"><div class="tc">${c}</div>${!rows.some(r=>r.c===c)?`<div class="muted">Not reported by ${c} for this product</div>`:T.years.map(y=>{const r=rows.find(r=>r.c===c&&r.y===y);
   return r?`<div class="row" title="${c}, ${y}: US$ ${(r.usd/1e9).toFixed(1)} bn"><span>${y}</span><i style="width:${(100*r.usd/mx).toFixed(1)}%;background:${CC[c]}"></i><b>$${(r.usd/1e9).toFixed(1)} bn</b></div>`:`<div class="row"><span>${y}</span><em class="muted">not reported by partner</em></div>`}).join("")}</div>`).join("");
  box.querySelectorAll(".seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.h===h))}
 box.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>draw(b.dataset.h));draw("2709")});
})();
