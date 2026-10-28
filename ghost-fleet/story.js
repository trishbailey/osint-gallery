// Story mode and aggregated explore view. Uses window.GF exported by app.js.
(async function(){
while(!window.GF)await new Promise(r=>setTimeout(r,50));
const {map,cv,hideRaw,showRaw,openP,esc,fmt,title,M}=GF;
const S=await fetch("data/story.json").then(r=>r.json());
if(!GF.WPI)GF.WPI=await fetch("data/wpi.json").then(r=>r.json()).catch(()=>[]);
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
 const seen={};fs.forEach(f=>{if(seen[f.from])return;seen[f.from]=1;L.circleMarker(f.a,{radius:7,color:"#0b1526",weight:2,fillColor:LC[f.from]||"#f2d16b",fillOpacity:1}).bindTooltip(esc(f.from)+" (loading port)",{permanent:false,direction:f.from==="Ust-Luga"?"left":"right",className:"pill"}).addTo(lay)});
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
 rs.forEach(r=>L.polyline(r.line,{renderer:cv,color:"#0b1526",weight:1+.5*r.n/mx+2,opacity:.35,interactive:false,lineJoin:"round"}).addTo(lay));
 rs.forEach(r=>L.polyline(r.line,{renderer:cv,color:RED,weight:1+.5*r.n/mx,opacity:.7,lineJoin:"round",smoothFactor:1.5}).bindTooltip(`<b>${esc(r.from)} → ${esc(cn(r.to))}</b><br>${r.n} trips in 12 months (aggregate route, not a ship track)`,{sticky:true}).addTo(lay));
 ARW.set(rs,mx);
 const ph=GF.phone(),seen={};
 // ports: small dots only; the name shows on hover (desktop) or tap (phone), like the country names
 const PR=GF.PR||(GF.PR=L.svg({pane:"markerPane"}));fs.forEach(f=>{if(seen[f.from])return;seen[f.from]=1;L.circleMarker(f.a,{renderer:PR,radius:4,color:"#0b1526",weight:1.5,fillColor:"#f5f7fa",fillOpacity:1,interactive:false}).addTo(lay);L.circleMarker(f.a,{renderer:PR,radius:12,stroke:false,fillColor:"#fff",fillOpacity:.01}).bindTooltip(esc(f.from)+" (Russian loading port)",{direction:"top"}).on("click",e=>{L.DomEvent.stop(e);if(GF.TT)map.closeTooltip(GF.TT);GF.TT=L.tooltip({direction:"top",offset:[0,-8]}).setLatLng(f.a).setContent(esc(f.from)+" (Russian loading port)");map.openTooltip(GF.TT);map.once("click movestart",()=>GF.TT&&map.closeTooltip(GF.TT))}).addTo(lay)});
 // arrival ports: same white dots at each distinct route end (most-used destination port); name = nearest World Port Index port, on hover/tap only
 const AE={};rs.forEach(r=>{const e=r.line[r.line.length-1];AE[e.join()]=e});
 Object.values(AE).forEach(e=>{const k=Math.cos(e[0]*Math.PI/180);let nm="",bd=1e9;(GF.WPI||[]).forEach(p=>{const d=(p[2]-e[0])**2+((p[3]-e[1])*k)**2;if(d<bd){bd=d;nm=p[0]}});const tx=esc(nm?title(nm):"Destination")+" (arrival port)";
  L.circleMarker(e,{renderer:PR,radius:4,color:"#0b1526",weight:1.5,fillColor:"#f5f7fa",fillOpacity:1,interactive:false}).addTo(lay);L.circleMarker(e,{renderer:PR,radius:12,stroke:false,fillColor:"#fff",fillOpacity:.01}).bindTooltip(tx,{direction:"top"}).on("click",ev=>{L.DomEvent.stop(ev);if(GF.TT)map.closeTooltip(GF.TT);GF.TT=L.tooltip({direction:"top",offset:[0,-8]}).setLatLng(e).setContent(tx);map.openTooltip(GF.TT);map.once("click movestart",()=>GF.TT&&map.closeTooltip(GF.TT))}).addTo(lay)});
 // country names: small and light; counts in sea callouts joined by leader lines
 const CNP={CHN:[37.5,93],IND:[23.5,77],TUR:[38.6,32.2]},BA=GF.phone()?{CHN:[10,152],IND:[-18,76],TUR:[26,-42]}:{CHN:[16,140],IND:[-4,76],TUR:[38,-32]};GF.BA=BA;
 B3.forEach(c=>{
  L.polyline([B3P[c],BA[c]],{color:B3C[c],weight:1.5,opacity:1,interactive:false}).addTo(lay);
  L.marker(BA[c],{icon:L.divIcon({className:"",iconSize:[0,0],html:`<div class="b3l" style="border-color:${B3C[c]}"><b style="color:${B3C[c]}">${B3N[c]||0}</b><span>${GF.phone()?"":"trips · "}${Math.round(100*(B3N[c]||0)/S.voyages)}%</span></div>`}),interactive:false}).addTo(lay)});
 return ph?[[-12,-36],[70,148]]:[[-4,-26],[72,146]]}
const C=S.cases,ch=C.chain,id=C.identity,nw=C.network,dk=C.dark;
const loHrs=ch.ev.filter(e=>e.t==="loitering"&&e.hz).reduce((a,e)=>a+(e.hrs||0),0),loHz=(ch.ev.find(e=>e.t==="loitering"&&e.hz)||{}).hz;
const flagsY=new Set(id.hist.filter(h=>h[2]>="2025-01-01").map(h=>h[1]));

// chapter 3: identity timeline (names, flags and MMSI from vessels.json history via story.json; voyages from the 12-month voyage data)
const FN={DJI:"Djibouti",MWI:"Malawi",BEN:"Benin",CMR:"Cameroon",RUS:"Russia",PAN:"Panama",MLT:"Malta",KNA:"St Kitts and Nevis"},FC={PAN:"#2fb39b",DJI:"#4fa3e0",MWI:"#d94f8a",BEN:"#8fcf4a",CMR:"#9b7be8",RUS:"#e8613a"};
const fnm=c=>FN[c]||c,fcol=c=>FC[c]||"#f2d16b",GOLD="#c8a24a";
const D_=d=>Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)),dl=d=>new Date(D_(d)).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const T0=D_("2025-01-01"),T1=D_(S.window[1]),pp=d=>Math.max(0,Math.min(100,100*(D_(d)-T0)/(T1-T0)));
const hist=id.hist.map(h=>({name:h[0],flag:h[1],from:h[2],mmsi:h[3],to:h[4]||S.window[1]}));
const bands=hist.map((h,i)=>{const nx=hist[i+1],end=nx&&nx.from<h.to?nx.from:h.to;return{...h,end:end>S.window[1]?S.window[1]:end}}).filter(b=>b.end>"2025-01-01");
const flagAt=d=>{const b=[...bands].reverse().find(b=>b.from<=d);return b?b.flag:""};
const ticks=hist.map((h,i)=>{const pv=hist[i-1];if(!pv||h.from<"2025-01-01")return null;const w=[];if(pv.name!==h.name)w.push(`renamed ${title(pv.name)} to ${title(h.name)}`);if(pv.flag!==h.flag)w.push(`flag ${fnm(pv.flag)} to ${fnm(h.flag)}`);if(pv.mmsi!==h.mmsi)w.push("new MMSI");return w.length?{d:h.from,tip:`${dl(h.from)}: ${w.join(", ")}`}:null}).filter(Boolean);
const names=[];hist.forEach(h=>{if(h.to<="2025-01-01")return;const f=h.from<"2025-01-01"?"2025-01-01":h.from,l=names[names.length-1];if(l&&l.name===h.name)l.end=h.to;else names.push({name:h.name,from:f,end:h.to})});
const cnV=id.voy.filter(v=>v.dest==="CHN"),flCN=[...new Set(cnV.map(v=>flagAt(v.ld)).filter(Boolean))];
const IDC=`${esc(title(id.name))} (IMO ${id.imo}) changed name and flag repeatedly, yet ${flCN.length>1?`loaded at Kozmino for China under the flags of ${flCN.map(fnm).join(" and ")}`:"kept loading at Kozmino for China"}.`;
const dgrid=(n,k)=>{const C=60,r=Math.ceil(n/C),g=7;let c="";for(let i=0;i<n;i++)c+=`<circle cx="${(i%C)*g+3.5}" cy="${Math.floor(i/C)*g+3.5}" r="2.7" fill="${i<k?"#d94f8a":"#3f7fd0"}"/>`;
 return`<div class="dg"><div class="dgh"><b>${Math.round(100*k/n)}%</b><span>${k} of ${n} tankers took a new name, flag or MMSI in 12 months</span></div><svg viewBox="0 0 ${C*g} ${r*g}" role="img" aria-label="${k} of ${n} tankers changed name, flag or MMSI">${c}</svg></div>`};
const IDX=`<div class="idl">${dgrid(S.ships,S.changed)}<div class="tl" role="group" aria-label="Identity timeline for ${esc(title(id.name))}"><div class="tln">${names.map(n=>`<span style="left:${pp(n.from)}%;width:${pp(n.end)-pp(n.from)}%">${pp(n.end)-pp(n.from)<8?"":esc(title(n.name))}</span>`).join("")}</div>
<div class="tlb">${bands.map(b=>`<i tabindex="0" style="left:${pp(b.from<"2025-01-01"?"2025-01-01":b.from)}%;width:${pp(b.end)-pp(b.from<"2025-01-01"?"2025-01-01":b.from)}%;background:${fcol(b.flag)}" data-tip="${esc(fnm(b.flag))} flag, ${dl(b.from)} to ${dl(b.end)}"></i>`).join("")}${ticks.map(t=>`<u tabindex="0" style="left:${pp(t.d)}%" data-tip="${esc(t.tip)}"></u>`).join("")}</div>
<div class="tlv">${id.voy.filter(v=>v.load==="Kozmino").map(v=>`<b tabindex="0" class="${v.dest==="CHN"?"vc":"vo"}" style="left:${pp(v.ld)}%" data-tip="${dl(v.ld)}: loaded at Kozmino for ${esc(v.dest==="KOR"?"South Korea":cn(v.dest))} (${esc(fnm(flagAt(v.ld)))} flag)"></b>`).join("")}<em style="left:${pp(S.window[0])}%" data-tip="Voyage data starts ${dl(S.window[0])}"></em></div>
<div class="tla">${[["2025-01-01","Jan 2025"],["2025-07-01","Jul"],["2026-01-01","Jan 2026"],["2026-07-01","Jul"]].map(a=>`<span style="left:${pp(a[0])}%">${a[1]}</span>`).join("")}</div><div class="tltip" hidden></div></div>
<div class="tlk">${[...new Set(bands.map(b=>b.flag))].map(f=>`<span><i style="background:${fcol(f)}"></i>${esc(fnm(f))}</span>`).join("")}<span><i class="mk vc"></i>Kozmino to China</span><span><i class="mk vo"></i>Kozmino to South Korea</span><span><i class="tk"></i>Name or MMSI change</span><span><i class="ds"></i>Voyage data starts ${dl(S.window[0])}</span></div></div>`;
const CH=[
 {k:"route",t:"1. Load in Russia, unload in Asia",
  c:`${pct}% of ${S.voyages.toLocaleString()} trips from Russian oil terminals ended in China, India or Turkey.`,
  key:B3.map(c=>[B3C[c],`${cn(c)}: ${B3N[c]} trips (${Math.round(100*B3N[c]/S.voyages)}%)`]),d:()=>big3()},
 {k:"swap",t:"2. Waiting where cargoes change hands",
  c:`${esc(title(ch.name))} loitered about ${loHrs<48?Math.round(loHrs)+" hours":Math.round(loHrs/24)+" days"}${esc(loHz?" off "+loHz.replace(/ \(.*/,""):"")} after loading at ${esc(ch.load)}, which is consistent with a transfer but does not prove one.`,
  d:()=>{const b=hotspots();return b.concat(evs(ch.ev,true))},ship:ch.imo},
 {k:"identity",t:"3. New name, same run",
  c:IDC,x:IDX,
  d:()=>{const b=[];id.voy.forEach((v,i)=>{L.polyline(curve(v.line[0],v.line[1]),{color:v.ld>=id.hist[id.hist.length-1][2]?"#d97cb0":"#5cc98a",weight:4,opacity:.9}).bindTooltip(`${fmt(v.ld)}: ${esc(v.load)} → ${esc(cn(v.dest))}`,{sticky:true}).addTo(lay);b.push(...v.line)});return b},
  key:[["#5cc98a","before the name change"],["#d97cb0","after"]],ship:id.imo},
 {k:"network",t:"4. One company, many ships",
  c:`${esc(nw.name)} is linked to ${nw.ships.length} of these tankers, which made ${nw.flows.length} trips from Russian terminals in 12 months.`,
  d:()=>{const b=[];nw.flows.forEach(f=>{L.polyline(curve(f[0],f[1]),{renderer:cv,color:"#b58cf0",weight:2.5,opacity:.7}).bindTooltip(esc(title(f[2])),{sticky:true}).addTo(lay);b.push(f[0],f[1])});return b},chips:nw.ships},
 {k:"dark",t:"5. Going dark",
  c:`${S.gaps} transponder gaps of 12+ hours in 12 months; of ${S.gapsJamWindow} inside our 90 days of GPS-interference data, ${S.gapsJam?S.gapsJam:"none"} fell where interference was reported, which points to switch-offs, not jamming.`,
  d:()=>{evs(S.cases.allgaps.filter(e=>!dk.ev.includes(e)));return evs(dk.ev,true)},key:[["#e05a6a","transponder off"],["#4fa3e0","port call"]],ship:dk.imo},
 {k:"classes",t:"6. Five ways of working",
  c:`Tankers sorted by what they did in 12 months; regular runners made ${(S.classVoy||{}).core} of the ${S.voyages} trips.`,x:`<div class="cbars">${Object.keys(CLS).filter(k=>k!=="other").sort((a,b)=>(K[b]||0)-(K[a]||0)).map(k=>`<div class="row" title="${CLS[k][2]}"><span>${CLS[k][0]}</span><i style="width:${(100*(K[k]||0)/Math.max(K.hub,K.core,K.dev,K.taxi)).toFixed(0)}%;background:${CLS[k][1]}"></i><b>${K[k]||0}</b></div>`).join("")}</div><p class="note">Tankers with too few trips are left off the map.</p>`,
  key:Object.keys(CLS).filter(k=>k!=="other").map(k=>[CLS[k][1],CLS[k][0]]),d:()=>lastPos()}];
const box=document.getElementById("story"),cards=document.getElementById("chapters");
cards.innerHTML=CH.map((c,i)=>`<article class="chap" data-i="${i}" data-ch="${c.k}" tabindex="0"><h3>${c.t}</h3><p>${c.c}</p>${c.x||""}${c.key?`<div class="key">${c.key.map(k=>`<span><i style="background:${k[0]}"></i>${k[1]}</span>`).join("")}</div>`:""}${c.ship?`<button class="lnk" data-p="${c.ship}">Open ship profile</button>`:""}${c.chips?`<div>${c.chips.map(s=>`<span class="chip" role="button" tabindex="0" data-p="${s[0]}">${esc(title(s[1]))}</span>`).join("")}</div>`:""}</article>`).join("");
(()=>{const tl=cards.querySelector(".tl"),tp=tl&&tl.querySelector(".tltip");if(!tl)return;
 const show=(t,x)=>{tp.textContent=t.dataset.tip;tp.hidden=false;const r=tl.getBoundingClientRect(),b=t.getBoundingClientRect(),w=tp.offsetWidth;tp.style.left=Math.max(0,Math.min(r.width-w,b.left-r.left+b.width/2-w/2))+"px"};
 tl.addEventListener("pointerover",e=>{const t=e.target.closest("[data-tip]");if(t&&e.pointerType!=="touch")show(t)});
 tl.addEventListener("pointerleave",()=>tp.hidden=true);
 tl.addEventListener("focusin",e=>{const t=e.target.closest("[data-tip]");if(t)show(t)});
 tl.addEventListener("click",e=>{e.stopPropagation();const t=e.target.closest("[data-tip]");if(t)show(t);else tp.hidden=true})})();
cards.querySelectorAll("[data-p]").forEach(b=>b.onclick=e=>{e.stopPropagation();openP(b.dataset.p)});
let cur=0,mode="story";
// chapter 1: red chevrons flowing along the aggregate sea routes, source port -> buyer. Canvas overlay, runs only while visible.
const RED="#e8423f",ARW=(()=>{const c=document.createElement("canvas");c.className="arw";map.createPane("arwp").style.zIndex=450;map.getPane("arwp").appendChild(c);const nt=document.createElement("div");nt.className="arwnote";nt.textContent="Red arrows: trips from Russian oil ports to each buyer, along common sea lanes";map.getContainer().appendChild(nt);const x=c.getContext("2d");
 const rm=matchMedia("(prefers-reduced-motion: reduce)");let R=null,M=1,P=[],vis=true,raf=0,t0=performance.now();
 function proj(){const s=map.getSize(),d=devicePixelRatio||1;c.width=s.x*d;c.height=s.y*d;c.style.width=s.x+"px";c.style.height=s.y+"px";x.setTransform(d,0,0,d,0,0);L.DomUtil.setPosition(c,map.containerPointToLayerPoint([0,0]));
  P=(R||[]).map(r=>{const p=r.line.map(q=>map.latLngToContainerPoint(q)),L=[0];for(let i=1;i<p.length;i++)L.push(L[i-1]+p[i].distanceTo(p[i-1]));const k=r.n/M;return{p,L,T:L[L.length-1],gap:250-100*k,sz:2.2+1*k}})}
 function at(o,d){let i=1;while(i<o.L.length-1&&o.L[i]<d)i++;const a=o.p[i-1],b=o.p[i],f=(d-o.L[i-1])/((o.L[i]-o.L[i-1])||1);return[a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,Math.atan2(b.y-a.y,b.x-a.x)]}
 function chev(px,py,an,s,head){x.save();x.translate(px,py);x.rotate(an);x.beginPath();if(head){x.moveTo(s*1.6,0);x.lineTo(-s,s*1.2);x.lineTo(-s,-s*1.2);x.closePath();x.fill()}else{x.moveTo(-s,-s);x.lineTo(s*.6,0);x.lineTo(-s,s);x.stroke()}x.restore()}
 function draw(now){x.clearRect(0,0,c.width,c.height);if(!R)return;const off=rm.matches?0:((now-t0)/1000*16);x.strokeStyle=x.fillStyle=RED;x.lineCap=x.lineJoin="round";
  P.forEach(o=>{x.lineWidth=1.3;for(let d=(off%o.gap);d<o.T-o.sz*2;d+=o.gap){const[a,b,an]=at(o,d);chev(a,b,an,o.sz,false)}const[a,b,an]=at(o,o.T-.01);chev(a,b,an,o.sz,true)})}
 function loop(now){raf=0;if(!R)return;draw(now);if(vis&&!rm.matches&&!document.hidden)raf=requestAnimationFrame(loop)}
 function kick(){if(!raf&&R)raf=requestAnimationFrame(loop)}
 map.on("zoomstart movestart",()=>{c.style.opacity=0});map.on("zoomend moveend resize",()=>{c.style.opacity=1;proj();kick();draw(performance.now())});
 new IntersectionObserver(e=>{vis=e[0].isIntersecting;kick()}).observe(map.getContainer());document.addEventListener("visibilitychange",kick);rm.addEventListener&&rm.addEventListener("change",kick);
 return{set(rs,mx){R=rs;nt.style.display=rs?"block":"none";M=mx||1;proj();if(!R){x.clearRect(0,0,c.width,c.height);return}draw(performance.now());kick()},running:()=>!!raf,pts:()=>P.map(o=>o.p.map(q=>[q.x,q.y]))}})();
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
setMode("story");
})();
