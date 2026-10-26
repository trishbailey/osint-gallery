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
 Object.values(last).forEach(e=>{const c=(GF.P[e.imo]||{}).cls||"other";L.circleMarker([e.lat,e.lon],{renderer:cv,radius:5,color:"#0b1526",weight:1,fillColor:CLS[c][1],fillOpacity:.95}).bindTooltip(`<b>${esc(title((GF.P[e.imo]||{}).name||e.imo))}</b><br>${CLS[c][0]}<br>Last recorded ${fmt(e.s)}`).on("click",()=>openP(e.imo)).addTo(lay);b.push([e.lat,e.lon])});return b}
const C=S.cases,ch=C.chain,id=C.identity,nw=C.network,dk=C.dark;
const loHrs=ch.ev.filter(e=>e.t==="loitering"&&e.hz).reduce((a,e)=>a+(e.hrs||0),0),loHz=(ch.ev.find(e=>e.t==="loitering"&&e.hz)||{}).hz;
const flagsY=new Set(id.hist.filter(h=>h[2]>="2025-01-01").map(h=>h[1]));
const CH=[
 {k:"route",t:"1. Load in Russia, unload in Asia",
  c:`Over the past year these tankers made ${S.voyages.toLocaleString()} trips from a Russian oil terminal to a foreign port. ${pct}% of them ended in China, India or Turkey. Pacific oil from Kozmino goes mostly to China. Baltic oil from Primorsk and Ust-Luga goes mostly to India.`,
  d:()=>flows()},
 {k:"swap",t:"2. Waiting where cargoes change hands",
  c:`Tankers often spend days drifting in a few stretches of open water where ship-to-ship transfers cluster. ${esc(title(ch.name))} (IMO ${ch.imo}) loaded at ${esc(ch.load)} on ${fmt(ch.ld)}. It then loitered for about ${Math.round(loHrs/24)} days in the area ${esc(loHz?"off "+loHz.replace(/ \(.*/,""):"")}, and its next port call was in ${esc(cn(ch.dest))} on ${fmt(ch.da)}. Loitering is consistent with a transfer but does not prove one.`,
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
  c:`Sorted by what they did over 12 months, ${K.core} tankers are regular Russia runners and ${K.hub} are transfer hub ships, whose trips mostly include loitering or meetings consistent with ship-to-ship transfers. ${K.dev} were recently renamed or reflagged and kept loading Russian oil, and ${K.taxi} mix Russian cargoes with other trade. Regular runners made ${(S.classVoy||{}).core} of the ${S.voyages} trips.`,x:`<div class="cbars">${Object.keys(CLS).filter(k=>k!=="other").sort((a,b)=>(K[b]||0)-(K[a]||0)).map(k=>`<div class="row" title="${CLS[k][2]}"><span>${CLS[k][0]}</span><i style="width:${(100*(K[k]||0)/Math.max(K.hub,K.core,K.dev,K.taxi)).toFixed(0)}%;background:${CLS[k][1]}"></i><b>${K[k]||0}</b></div>`).join("")}</div><p class="note">${K.other} more tankers had too few recorded trips to fit a pattern.</p>`,
  key:Object.keys(CLS).map(k=>[CLS[k][1],CLS[k][0].toLowerCase()]),d:()=>lastPos()}];
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
function fit(b){if(b&&b.length)map.flyToBounds(L.latLngBounds(b).pad(.15),{duration:.8,maxZoom:6})}
function go(i){cur=Math.max(0,Math.min(CH.length-1,i));lay.clearLayers();hideRaw();fit(CH[cur].d());
 cards.querySelectorAll(".chap").forEach((c,j)=>c.classList.toggle("on",j===cur));document.getElementById("cpos").textContent=`${cur+1} / ${CH.length}`;
 const el=cards.children[cur];if(GF.phone())cards.scrollTo({left:el.offsetLeft-cards.offsetLeft,behavior:"smooth"})}
function step(i){go(i);if(!GF.phone())cards.children[cur].scrollIntoView({behavior:"smooth",block:"center"})}
document.getElementById("prev").onclick=()=>step(cur-1);document.getElementById("next").onclick=()=>step(cur+1);
const io=new IntersectionObserver(es=>{if(GF.phone()||mode!=="story")return;es.forEach(e=>{if(e.isIntersecting){const i=+e.target.dataset.i;if(i!==cur)go(i)}})},{rootMargin:"-45% 0px -45% 0px"});cards.querySelectorAll(".chap").forEach(c=>io.observe(c));
cards.querySelectorAll(".chap").forEach((c,i)=>c.onclick=()=>go(i));
let st;cards.addEventListener("scroll",()=>{if(!GF.phone())return;clearTimeout(st);st=setTimeout(()=>{const i=Math.round(cards.scrollLeft/cards.children[0].offsetWidth);if(i!==cur)go(i)},150)});
const raw=document.getElementById("rawt");
function explore(){lay.clearLayers();if(raw.checked){showRaw();return}hideRaw();const b=flows();hotspots();fit(b)}
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
 const CC={China:"#e05a6a",India:"#e8913a",Turkey:"#4fa3e0"};
 function draw(h){const rows=T.rows.filter(r=>r.hs===h),mx=Math.max(...rows.map(r=>r.usd));
  document.getElementById("trbars").innerHTML=Object.keys(CC).map(c=>`<div class="tgrp"><div class="tc">${c}</div>${!rows.some(r=>r.c===c)?`<div class="muted">Not reported by ${c} for this product</div>`:T.years.map(y=>{const r=rows.find(r=>r.c===c&&r.y===y);
   return r?`<div class="row" title="${c}, ${y}: US$ ${(r.usd/1e9).toFixed(1)} bn"><span>${y}</span><i style="width:${(100*r.usd/mx).toFixed(1)}%;background:${CC[c]}"></i><b>$${(r.usd/1e9).toFixed(1)} bn</b></div>`:`<div class="row"><span>${y}</span><em class="muted">not reported by partner</em></div>`}).join("")}</div>`).join("");
  box.querySelectorAll(".seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.h===h))}
 box.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>draw(b.dataset.h));draw("2709")});
})();
