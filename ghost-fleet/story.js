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
function hotspots(only,fo=.35,rd){const hs=M.hot.filter(h=>h.k==="sts"&&(!only||only.includes(h.n)));const cnt=Object.fromEntries(S.sts);const b=[];
 hs.forEach(h=>{const n=cnt[h.n]||0;L.circle([h.lat,h.lon],{radius:h.r*1000*(1+Math.sqrt(n)/12),color:"#e8913a",weight:2,fillColor:"#e8913a",fillOpacity:fo,renderer:rd}).bindTooltip(`<b>${esc(h.n)}</b><br>${n.toLocaleString()} loitering events in 12 months`,{sticky:true}).addTo(lay);b.push([h.lat,h.lon])});return b}
const GR=L.svg({padding:.5});let gi=0;
// blink=true draws the transponder-gap dots as SVG paths with a class so CSS can pulse their opacity (canvas dots cannot be animated by CSS)
function evs(list,big,blink){const b=[];list.forEach(e=>{const c=EC[e.t]||"#f5f7fa",bl=blink&&e.t==="gap";L.circleMarker([e.lat,e.lon],{renderer:bl?GR:cv,className:bl?"gapdot g"+(gi++%6):"",radius:big?7:5,color:"#0b1526",weight:1,fillColor:c,fillOpacity:.95}).bindTooltip(`${e.t==="port"?"Port call":e.t==="gap"?"Transponder off":"Loitering"}: ${fmt(e.s)}${e.port?"<br>"+esc(title(e.port)):""}${e.pf?" ("+esc(cn(e.pf))+")":""}${e.hrs?"<br>"+Math.round(e.hrs)+" hours":""}${e.hz?"<br>"+esc(e.hz):""}${e.inf?"<br>Near "+esc(e.inf):""}`).addTo(lay);b.push([e.lat,e.lon])});return b}
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
 const CNP={CHN:[37.5,93],IND:[23.5,77],TUR:[38.6,32.2]},BA=GF.phone()?{CHN:[14,158],IND:[-18,76],TUR:[23,-44]}:{CHN:[19,144],IND:[-4,76],TUR:[38,-32]};GF.BA=BA;
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
// chapter 2: close-up of each waiting area on a self-hosted Natural Earth 10m coastline (data/waiting_10m.json, public domain)
const WD=await fetch("data/waiting_10m.json").then(r=>r.json()).catch(()=>null);
const WREGS=WD?S.sts.map(s=>WD.regions.find(r=>r.n===s[0])).filter(Boolean):[],WSH={"Malaysia, east of Singapore (EOPL)":"East of Singapore","Gulf of Oman off Fujairah and Sohar":"Gulf of Oman","Ceuta and Alboran Sea":"Ceuta and Alboran","Off Lomé, Togo":"Off Lomé"};
let wreg=0,wtk=0;
const WLAND={color:"#4d6a99",weight:.8,fillColor:"#2a4066",fillOpacity:1};
function baseOn(){wtk++;const B=GF.BASE;if(B&&!map.hasLayer(B)){B.addTo(map);B.bringToBack()}map.setMaxBounds(null);map.options.maxBoundsViscosity=0;map.setMinZoom(GF.phone()?1:2)}
function swapMap(){const R=WREGS[wreg];if(!R){const b=hotspots();return b.concat(evs(ch.ev,true))}
 map.removeLayer(GF.BASE);const bb=R.bbox,inb=(la,lo)=>la>=bb[0]&&la<=bb[2]&&lo>=bb[1]&&lo<=bb[3];
 L.geoJSON(WD.land,{renderer:cv,style:WLAND,onEachFeature:(f,l)=>l.bindTooltip(esc(f.properties.n),{sticky:true})}).addTo(lay);
 hotspots(S.sts.map(x=>x[0]),0,cv);
 // cities (gold rings) and ports (white dots): no permanent labels, the name shows on hover (desktop) or tap (phone)
 WD.cities.filter(c=>inb(c[1],c[2])).forEach(c=>L.circleMarker([c[1],c[2]],{renderer:cv,radius:3.5,color:"#f2d16b",weight:1.5,fillColor:"#0b1526",fillOpacity:1}).bindTooltip(`<b>${esc(c[0])}</b><br>City`,{direction:"top",offset:[0,-4]}).addTo(lay));
 (GF.WPI||[]).filter(p=>"LMS".includes(p[4])&&inb(p[2],p[3])).forEach(p=>L.circleMarker([p[2],p[3]],{renderer:cv,radius:3.5,color:"#0b1526",weight:1,fillColor:"#f5f7fa",fillOpacity:1}).bindTooltip(`<b>${esc(title(p[0]))}</b><br>Port, ${esc(p[1])}`,{direction:"top",offset:[0,-4]}).addTo(lay));
 return evs(ch.ev,true)}
const WLB={"Malaysia, east of Singapore (EOPL)":[["Malaysia","Indonesia"],["Singapore"]],"Gulf of Oman off Fujairah and Sohar":[["Iran","Oman","United Arab Emirates","Pakistan"],["Fujairah","Sohar","Muscat"]],"Ceuta and Alboran Sea":[["Spain","Morocco","Algeria"],["Algeciras","Ceuta","Tangier"]],"Off Lomé, Togo":[["Togo","Ghana","Benin","Nigeria"],["Lomé","Tema","Lagos"]]};
// Noctis map: nations, the major port city, and a plain label on the loiter spot
function swapLb(){const R=WREGS[wreg];if(!R)return LB(GF.LAND,[RU,"China","India"],["Kozmino"]);const w=WLB[R.n]||[[],[]],bb=R.bbox;
 const lo=ch.ev.filter(e=>e.t==="loitering"&&e.lat>=bb[0]&&e.lat<=bb[2]&&e.lon>=bb[1]&&e.lon<=bb[3]).map(e=>({t:GF.phone()?"Loiter spot":title(ch.name)+" loiter spot",lat:e.lat,lon:e.lon}));
 return LB({features:WD.land},w[0],w[1],lo)}
function swapView(){map.options.zoomSnap=.25;map.invalidateSize();map.setMaxBounds(null);const R=WREGS[wreg];if(!R)return fit([]);
 const bb=L.latLngBounds([R.bbox[0],R.bbox[1]],[R.bbox[2],R.bbox[3]]),tk=++wtk;map.options.maxBoundsViscosity=1;
 map.once("moveend",()=>{if(tk!==wtk)return;map.setMinZoom(map.getBoundsZoom(bb,true));map.setMaxBounds(bb)});
 map.flyToBounds(L.latLng(R.lat,R.lon).toBounds(R.rad*2000*1.9),{duration:.8,maxZoom:9})}
const WX=WREGS.length?`<div class="wreg" role="group" aria-label="Waiting areas">${WREGS.map((r,i)=>`<button type="button" data-r="${i}" aria-pressed="${i===0}">${esc(WSH[r.n]||r.n)} <span>${((S.sts.find(s=>s[0]===r.n)||[0,0])[1]).toLocaleString()}</span></button>`).join("")}</div><p class="note">Orange rings: waiting areas, sized by loitering events in 12 months <a class="sref" href="#src1">[1]</a>. White dots are ports and gold rings are cities; hover or tap a dot for its name. Pan and zoom within each area. ${esc(title(ch.name))}'s first and last stops are outside these close-ups.</p>`:"";
// chapter 6: loaded voyages per behaviour class on sea lanes (data/classroutes.json: identical origin/destination pairs merged, 'other' ships left out)
const CR=await fetch("data/classroutes.json").then(r=>r.json()).catch(()=>null);
const CROW=["core","taxi","dev","hub"].filter(k=>CLS[k]),CON=Object.fromEntries(CROW.map(k=>[k,k==="core"]));let crg=null;
const CT=document.createElement("div");CT.className="ctog";CT.setAttribute("role","group");CT.setAttribute("aria-label","Show sea routes by tanker group");
CT.innerHTML=CR?CROW.map(k=>`<button type="button" data-k="${k}" aria-pressed="${k==="core"}" style="--c:${CLS[k][1]}" title="${esc(CLS[k][2])}"><i></i>${esc(CLS[k][0])}</button>`).join(""):"";
function drawCR(){if(!CR||!crg)return;crg.clearLayers();const pn=(la,lo)=>{const k=Math.cos(la*Math.PI/180);let nm="",bd=1e9;(GF.WPI||[]).forEach(p=>{const d=(p[2]-la)**2+((p[3]-lo)*k)**2;if(d<bd){bd=d;nm=p[0]}});return nm?title(nm):"destination"};
 // thicker groups first, thinner on top, so the colours of all four groups stay visible on a shared sea lane; dark casings first so they never wash out another group's line
 const bw={core:3,taxi:2.2,dev:1.5,hub:.9},cx=Math.max(...CR.r.map(r=>r[2]),1),on=CROW.filter(k=>CON[k]),rows=k=>CR.r.filter(r=>r[0]===k).sort((a,b)=>b[2]-a[2]);
 on.forEach(k=>rows(k).forEach(r=>L.polyline(CR.lines[r[1]],{renderer:cv,color:"#0b1526",weight:bw[k]+1.4+1.4*Math.sqrt(r[2]/cx),opacity:.45,interactive:false,lineJoin:"round"}).addTo(crg)));
 on.forEach(k=>rows(k).forEach(r=>{const p=r[1].split("|"),w=bw[k]+1.4*Math.sqrt(r[2]/cx);L.polyline(CR.lines[r[1]],{renderer:cv,color:CLS[k][1],weight:w,opacity:1,lineJoin:"round",smoothFactor:1.2}).bindTooltip(`<b>${esc(p[0])} → ${esc(pn(+p[1],+p[2]))}</b><br>${esc(CLS[k][0])}: ${r[2]} loaded trip${r[2]>1?"s":""} in 12 months (aggregate sea route, not a ship track)`,{sticky:true}).addTo(crg)}));lbSoon()}
function classMap(){if(!CR)return lastPos();const b=[];crg=L.layerGroup().addTo(lay);drawCR();
 const seen={};S.flows.forEach(f=>{if(seen[f.from])return;seen[f.from]=1;L.circleMarker(f.a,{renderer:cv,radius:4,color:"#0b1526",weight:1.5,fillColor:"#f5f7fa",fillOpacity:1}).bindTooltip(esc(f.from)+" (Russian loading port)",{direction:"top",offset:[0,-4]}).addTo(lay)});
 Object.values(CR.lines).forEach(l=>b.push(...l));return b}
const CH=[
 {k:"route",t:"1. Load in Russia, unload in Asia",
  c:`${pct}% of ${S.voyages.toLocaleString()} trips from Russian oil terminals ended in China, India or Turkey.`,
  key:B3.map(c=>[B3C[c],`${cn(c)}: ${B3N[c]} trips (${Math.round(100*B3N[c]/S.voyages)}%)`]),d:()=>big3(),lb:()=>LB(GF.LAND,[RU,"China","India","Turkey"],["Kozmino","Novorossiysk","Primorsk","Ust-Luga"])},
 {k:"swap",t:"2. Waiting where cargoes change hands",
  c:`${esc(title(ch.name))} loitered about ${loHrs<48?Math.round(loHrs)+" hours":Math.round(loHrs/24)+" days"}${esc(loHz?" off "+loHz.replace(/ \(.*/,""):"")} after loading at ${esc(ch.load)}, which is consistent with a transfer but does not prove one.`,
  x:WX,d:()=>swapMap(),view:()=>swapView(),lb:()=>swapLb(),ship:ch.imo},
 {k:"identity",t:"3. New name, same run",
  c:IDC,x:IDX,
  d:()=>{const b=[];id.voy.forEach((v,i)=>{L.polyline(curve(v.line[0],v.line[1]),{color:v.ld>=id.hist[id.hist.length-1][2]?"#d97cb0":"#5cc98a",weight:4,opacity:.9}).bindTooltip(`${fmt(v.ld)}: ${esc(v.load)} → ${esc(cn(v.dest))}`,{sticky:true}).addTo(lay);b.push(...v.line)});return b},
  key:[["#5cc98a","before the name change"],["#d97cb0","after"]],lb:()=>LB(GF.LAND,[RU,"China","Republic of Korea"],["Kozmino","Busan","Ningbo"]),ship:id.imo},
 {k:"network",t:"4. One company, many ships",
  c:`${esc(nw.name)} is linked to ${nw.ships.length} of these tankers, which made ${nw.flows.length} trips from Russian terminals in 12 months.`,
  hub:true,d:()=>{hubDraw();return[]},
  dMap:()=>{const b=[];nw.flows.forEach(f=>{L.polyline(curve(f[0],f[1]),{renderer:cv,color:"#b58cf0",weight:2.5,opacity:.7}).bindTooltip(esc(title(f[2])),{sticky:true}).addTo(lay);b.push(f[0],f[1])});return b},chips:nw.ships},
 {k:"dark",t:"5. Going dark",
  c:`${S.gaps} transponder gaps of 12+ hours in 12 months; of ${S.gapsJamWindow} inside our 90 days of GPS-interference data, ${S.gapsJam?S.gapsJam:"none"} fell where interference was reported, which points to switch-offs, not jamming.`,
  d:()=>{gi=0;evs(S.cases.allgaps.filter(e=>!dk.ev.includes(e)),false,true);return evs(dk.ev,true,true)},key:[["#e05a6a","transponder off"],["#4fa3e0","port call"]],lb:()=>LB(GF.LAND,[RU,"Morocco","Mauritania","Western Sahara","United Kingdom","France","Spain","Italy","Turkey","Egypt","Norway","Sweden","Finland","Germany"],["Saint Petersburg","Ust-Luga","Casablanca","Dakhla","Gibraltar","Port Said","Suez"]),ship:dk.imo},
 {k:"classes",t:"6. Five ways of working",
  c:`Tankers sorted by what they did in 12 months; regular runners made ${(S.classVoy||{}).core} of the ${S.voyages} trips.`,x:`${CR?'<div class="ctslot"></div><p class="note">Each line is a group\'s loaded trips from a Russian terminal to a buyer port along sea lanes. Thicker, brighter lines carry more trips. Tap a group to hide or show it.</p>':""}<div class="cbars">${Object.keys(CLS).filter(k=>k!=="other").sort((a,b)=>(K[b]||0)-(K[a]||0)).map(k=>`<div class="row" title="${CLS[k][2]}"><span>${CLS[k][0]}</span><i style="width:${(100*(K[k]||0)/Math.max(K.hub,K.core,K.dev,K.taxi)).toFixed(0)}%;background:${CLS[k][1]}"></i><b>${K[k]||0}</b></div>`).join("")}</div><p class="note">Tankers with too few trips are left off the map.</p>`,
  d:()=>classMap(),lb:()=>LB(GF.LAND,[RU,"China","India","Turkey"],["Kozmino","Novorossiysk","Primorsk"])}];
const box=document.getElementById("story"),cards=document.getElementById("chapters");
cards.innerHTML=CH.map((c,i)=>`<article class="chap" data-i="${i}" data-ch="${c.k}" tabindex="0"><h3>${c.t}</h3><p>${c.c}</p>${c.x||""}${c.key?`<div class="key">${c.key.map(k=>`<span><i style="background:${k[0]}"></i>${k[1]}</span>`).join("")}</div>`:""}${c.ship?`<button class="lnk" data-p="${c.ship}">Open ship profile</button>`:""}${c.chips?`<div>${c.chips.map(s=>`<span class="chip" role="button" tabindex="0" data-p="${s[0]}">${esc(title(s[1]))}</span>`).join("")}</div>`:""}</article>`).join("");
(()=>{const tl=cards.querySelector(".tl"),tp=tl&&tl.querySelector(".tltip");if(!tl)return;
 const show=(t,x)=>{tp.textContent=t.dataset.tip;tp.hidden=false;const r=tl.getBoundingClientRect(),b=t.getBoundingClientRect(),w=tp.offsetWidth;tp.style.left=Math.max(0,Math.min(r.width-w,b.left-r.left+b.width/2-w/2))+"px"};
 tl.addEventListener("pointerover",e=>{const t=e.target.closest("[data-tip]");if(t&&e.pointerType!=="touch")show(t)});
 tl.addEventListener("pointerleave",()=>tp.hidden=true);
 tl.addEventListener("focusin",e=>{const t=e.target.closest("[data-tip]");if(t)show(t)});
 tl.addEventListener("click",e=>{e.stopPropagation();const t=e.target.closest("[data-tip]");if(t)show(t);else tp.hidden=true})})();
// group toggles live in the chapter-6 card on desktop and become a wrapping chip row above the map on phones
const ctRow=document.createElement("div");ctRow.id="ctogbar";ctRow.hidden=true;document.querySelector(".sw2").insertBefore(ctRow,document.getElementById("map"));
function ctPlace(){const slot=cards.querySelector(".ctslot");if(!CR||!slot)return;if(GF.phone()){ctRow.appendChild(CT)}else{slot.appendChild(CT);ctRow.hidden=true}}
function ctShow(){ctRow.hidden=!(CR&&GF.phone()&&cur===5&&mode==="story")}
ctPlace();matchMedia("(max-width:700px)").addEventListener("change",()=>{ctPlace();ctShow()});
CT.querySelectorAll("button").forEach(b=>b.onclick=e=>{e.stopPropagation();CON[b.dataset.k]=!CON[b.dataset.k];b.setAttribute("aria-pressed",CON[b.dataset.k]);if(cur===5&&mode==="story")drawCR();else go(5)});
cards.querySelectorAll(".wreg button").forEach(b=>b.onclick=e=>{e.stopPropagation();wreg=+b.dataset.r;cards.querySelectorAll(".wreg button").forEach(k=>k.setAttribute("aria-pressed",k===b));go(1)});
cards.querySelectorAll("[data-p]").forEach(b=>b.onclick=e=>{e.stopPropagation();openP(b.dataset.p)});
let cur=0,mode="story";
// ---- place-name labels: nations and major port cities only. Plain light text, no box; laid out by labels.js so none sits on a route, dot, callout, other label or foreign land.
const NATN={"Russian Federation":"Russia","Dem. Rep. Korea":"North Korea","Republic of Korea":"South Korea","United Arab Emirates":"UAE"};
const RU="Russian Federation",CITY={"Kozmino":[42.74,132.95,RU],"Novorossiysk":[44.72,37.77,RU],"Primorsk":[60.36,28.61,RU],"Ust-Luga":[59.68,28.40,RU],"Saint Petersburg":[59.93,30.25,RU],"Murmansk":[68.97,33.08,RU],
 "Qingdao":[36.07,120.38,"China"],"Ningbo":[29.87,121.55,"China"],"Busan":[35.10,129.04,"Republic of Korea"],"Singapore":[1.29,103.85,"Singapore"],
 "Fujairah":[25.12,56.34,"United Arab Emirates"],"Sohar":[24.36,56.75,"Oman"],"Muscat":[23.61,58.59,"Oman"],"Algeciras":[36.13,-5.45,"Spain"],"Ceuta":[35.89,-5.32,"Spain"],"Tangier":[35.78,-5.80,"Morocco"],
 "Lomé":[6.13,1.22,"Togo"],"Tema":[5.64,0.0,"Ghana"],"Lagos":[6.45,3.40,"Nigeria"],"Casablanca":[33.60,-7.62,"Morocco"],"Dakhla":[23.70,-15.93,"Western Sahara"],"Gibraltar":[36.14,-5.35,"Spain"],"Port Said":[31.27,32.30,"Egypt"],"Suez":[29.96,32.55,"Egypt"]};
const LB=(land,nat,city,extra)=>({land,nat,city,extra});
const LBP=map.createPane("plcp");LBP.style.zIndex=640;LBP.style.pointerEvents="none";
const LBSVG=document.createElementNS("http://www.w3.org/2000/svg","svg");LBSVG.setAttribute("width","1");LBSVG.setAttribute("height","1");LBSVG.style.cssText="position:absolute;left:0;top:0;overflow:visible";LBP.appendChild(LBSVG);
let LBS=null,lbMoving=false,lbT=0;
const lbOn=()=>!document.body.classList.contains("hubon");
function lbClear(){LBP.querySelectorAll(".plc").forEach(e=>e.remove());LBSVG.innerHTML=""}
function labels(spec){LBS=spec;lbClear();lbSoon()}
function lbSoon(){clearTimeout(lbT);lbT=setTimeout(lbDraw,40)}
const lbFlat=a=>a.flatMap?a.flatMap(x=>Array.isArray(x)?lbFlat(x):[x]):a;
function lbObst(ctx,pad){ctx.lineJoin=ctx.lineCap="round";const cb=map.getContainer().getBoundingClientRect();
 map.eachLayer(l=>{if(l instanceof L.Polygon||l.options&&l.options.opacity===0)return;
  if(l instanceof L.Polyline){const q=lbFlat(l.getLatLngs()).filter(x=>x&&x.lat!==undefined).map(x=>map.latLngToContainerPoint(x));if(q.length<2)return;
   ctx.lineWidth=(l.options.weight||2)+2*pad;ctx.beginPath();q.forEach((c,i)=>i?ctx.lineTo(c.x,c.y):ctx.moveTo(c.x,c.y));ctx.stroke()}
  else if(l instanceof L.CircleMarker){const o=l.options;if(o.stroke===false&&(o.fillOpacity||0)<.05)return;const c=map.latLngToContainerPoint(l.getLatLng()),r=l._radius||o.radius||4;
   ctx.beginPath();if(r>40){ctx.lineWidth=(o.weight||1)+2*pad;ctx.arc(c.x,c.y,r,0,7);ctx.stroke()}else{ctx.arc(c.x,c.y,r+(o.weight||0)/2+pad,0,7);ctx.fill()}}});
 map.getContainer().querySelectorAll(".b3l,.arwnote,.leaflet-control").forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&getComputedStyle(e).display!=="none")ctx.fillRect(r.left-cb.left-pad,r.top-cb.top-pad,r.width+2*pad,r.height+2*pad)})}
function lbLand(ctx,fill){const bb=map.getBounds().pad(.15),n=bb.getNorth(),so=bb.getSouth(),e=bb.getEast(),w=bb.getWest();
 (LBS.land.features||[]).forEach(f=>{const g=f.geometry;if(!g)return;const polys=g.type==="Polygon"?[g.coordinates]:g.type==="MultiPolygon"?g.coordinates:[];ctx.fillStyle=fill(f.properties.n);
  polys.forEach(p=>{if(!p[0].some(q=>q[0]>w&&q[0]<e&&q[1]>so&&q[1]<n)&&!(p[0].some(q=>q[0]<w)&&p[0].some(q=>q[0]>e)&&p[0].some(q=>q[1]<n)&&p[0].some(q=>q[1]>so)))return;
   ctx.beginPath();p.forEach(r=>{r.forEach((q,i)=>{const c=map.latLngToContainerPoint([q[1],q[0]]);i?ctx.lineTo(c.x,c.y):ctx.moveTo(c.x,c.y)});ctx.closePath()});ctx.fill("evenodd")})})}
function lbDraw(){if(!LBS||lbMoving||!lbOn()||!window.GFL)return;lbClear();const sz=map.getSize(),items=[];
 const mkEl=(kind,txt,key)=>{const el=document.createElement("div");el.className="plc "+kind;el.dataset.kind=kind;if(key)el.dataset.cn=key;el.textContent=txt;LBP.appendChild(el);return el};
 const add=(kind,txt,ll,key)=>{const c=ll?map.latLngToContainerPoint(ll):{x:sz.x/2,y:sz.y/2};const el=mkEl(kind,txt,key);items.push({kind,key,ax:c.x,ay:c.y,w:el.offsetWidth,h:el.offsetHeight,el})};
 (LBS.nat||[]).forEach(k=>add("nation",NATN[k]||k,null,k));
 (LBS.city||[]).forEach(n=>{const c=CITY[n];if(c)add("city",n==="Saint Petersburg"?"St Petersburg":n,[c[0],c[1]],c[2])});
 (LBS.extra||[]).forEach(x=>add("city",x.t,[x.lat,x.lon],null));
 GFL.layout({w:sz.x,h:sz.y,pad:5,land:lbLand,obst:lbObst,items});
 items.forEach(it=>{if(!it.at){it.el.remove();return}const a=it.at,p=map.containerPointToLayerPoint(L.point(a.l,a.t));it.el.style.left=p.x+"px";it.el.style.top=p.y+"px";
  const q=map.containerPointToLayerPoint(L.point(it.ax,it.ay));
  if(a.lead){const m=map.containerPointToLayerPoint(L.point(a.lead[0],a.lead[1])),e=map.containerPointToLayerPoint(L.point(a.lead[2],a.lead[3]));
   LBSVG.insertAdjacentHTML("beforeend",`<line class="plead" x1="${m.x.toFixed(1)}" y1="${m.y.toFixed(1)}" x2="${e.x.toFixed(1)}" y2="${e.y.toFixed(1)}"/>`);
   if(a.dot)LBSVG.insertAdjacentHTML("beforeend",`<circle class="pdot" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="2.5"/>`)}});
 LBP.style.opacity=1}
map.on("movestart zoomstart",()=>{lbMoving=true;LBP.style.opacity=0});map.on("moveend zoomend resize",()=>{lbMoving=false;lbSoon()});
// chapter 4: hub-and-spoke graphic (replaces the old line map, whose lines crossed land; the old map code stays below as CH[3].dMap and is not called)
const HUBC="#b58cf0",HUB=document.createElement("div");HUB.id="hub";HUB.setAttribute("role","group");HUB.setAttribute("aria-label",`${nw.name} and its ${nw.ships.length} tankers`);map.getContainer().insertAdjacentElement("afterend",HUB);
function hubDraw(){const W=HUB.clientWidth,H=HUB.clientHeight;if(!W||!H)return;
 const cnt={};nw.flows.forEach(f=>{cnt[f[2]]=(cnt[f[2]]||0)+1});const tot=nw.flows.length;
 const ships=nw.ships.map(s=>({imo:s[0],name:title(s[1]),n:cnt[s[1]]||0})).sort((a,b)=>b.n-a.n),mx=Math.max(...ships.map(s=>s.n),1);
 // alternate big and small around the ring so neighbours differ
 const order=[];ships.forEach((s,i)=>{order[i%2?ships.length-1-((i-1)/2|0):(i/2|0)]=s});
 const nb=W<500?46:30,vt=46,vb=H-nb-38,cx=W/2,cy=(vt+vb)/2,R0=W<500?44:50,rr=s=>6+11*Math.sqrt(s.n/mx),fs=14;
 const cv2=document.createElement("canvas").getContext("2d");cv2.font=`600 ${fs}px system-ui,sans-serif`;
 const lw=Math.max(...ships.map(s=>cv2.measureText(s.name).width*1.1));
 const rx=Math.max(R0+40,Math.min(W/2-lw-34,W*.34)),ry=Math.min((vb-vt)/2,300);
 const nodes=order.map((s,i)=>{const th=-Math.PI/2+i*2*Math.PI/order.length,x=cx+rx*Math.cos(th),y=cy+ry*Math.sin(th),r=rr(s),w=cv2.measureText(s.name).width*1.1,c=Math.cos(th);
  let tx,ty,an;if(Math.abs(c)<.35){tx=x;an="middle";ty=Math.sin(th)<0?y-r-8:y+r+fs+2}else if(c>0){tx=x+r+6;an="start";ty=y+5}else{tx=x-r-6;an="end";ty=y+5}
  // keep the name inside the box; if clamping would put it on the node, lift it above the node instead
  const l0=an==="middle"?tx-w/2:an==="start"?tx:tx-w;let l=Math.max(6,Math.min(W-6-w,l0));if(l!==l0){const sh=l-l0;tx+=sh;if(Math.abs(c)>=.35&&Math.abs(l-(x-r))<w){tx=Math.max(6+w/2,Math.min(W-6-w/2,x));an="middle";ty=y-r-8}}
  return{...s,x,y,r,tx,ty,an}});
 HUB.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(nw.name)} linked to ${ships.length} tankers that made ${tot} trips from Russian terminals">
 ${nodes.map(n=>`<line x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="${HUBC}" stroke-width="1.2" opacity=".75"/>`).join("")}
 <circle cx="${cx}" cy="${cy}" r="${R0}" fill="${GOLD}" stroke="#0b1526" stroke-width="2"/>
 <text x="${cx}" y="${cy-16}" text-anchor="middle" font-size="14" font-weight="700" fill="#0b1526"><tspan x="${cx}">Citrine</tspan><tspan x="${cx}" dy="17">Marine</tspan><tspan x="${cx}" dy="17" font-weight="600">${tot} trips</tspan></text>
 ${nodes.map(n=>`<g class="hn" tabindex="0" role="button" data-tip="${esc(n.name)} · IMO ${esc(n.imo)} · ${n.n} trip${n.n===1?"":"s"} from Russian terminals"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r+10).toFixed(1)}" fill="transparent"/><circle class="hd" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${HUBC}" stroke="#0b1526" stroke-width="1.5"/><text x="${n.tx.toFixed(1)}" y="${n.ty.toFixed(1)}" text-anchor="${n.an}" font-size="${fs}" font-weight="600" fill="#f5f7fa" class="hl2">${esc(n.name)}</text></g>`).join("")}
 </svg><div class="hubtip" hidden></div><p class="hubnote">Dot size = trips from Russian terminals. Hover or tap a ship for its IMO number and trip count.</p>`;
 const tp=HUB.querySelector(".hubtip");
 const show=(g,x,y)=>{tp.textContent=g.dataset.tip;tp.hidden=false;const w=tp.offsetWidth;tp.style.left=Math.max(6,Math.min(W-w-6,x))+"px";tp.style.top=Math.max(6,y)+"px"};
 HUB.querySelectorAll(".hn").forEach(g=>{const c=g.querySelector(".hd"),px=+c.getAttribute("cx"),py=+c.getAttribute("cy"),r=+c.getAttribute("r");
  g.onpointerenter=e=>{if(e.pointerType!=="touch")show(g,px+r+10,py-34)};g.onpointerleave=e=>{if(e.pointerType!=="touch")tp.hidden=true};
  g.onfocus=()=>show(g,px+r+10,py-34);g.onblur=()=>tp.hidden=true;
  g.onclick=e=>{e.stopPropagation();show(g,px+r+10,py-34)}});
 HUB.onclick=()=>tp.hidden=true}
new ResizeObserver(()=>{if(!lbOn())hubDraw()}).observe(HUB);
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
// red gap dots blink only while chapter 5 is showing and the map is on screen (CSS opacity only; static under prefers-reduced-motion)
let mapVis=true;const blinkSet=()=>map.getContainer().classList.toggle("gapblink",mode==="story"&&CH[cur].k==="dark"&&mapVis&&!document.hidden);
new IntersectionObserver(e=>{mapVis=e[0].isIntersecting;blinkSet()}).observe(map.getContainer());document.addEventListener("visibilitychange",blinkSet);
function go(i){cur=Math.max(0,Math.min(CH.length-1,i));const hubOn=!!CH[cur].hub;document.body.classList.toggle("hubon",hubOn);lay.clearLayers();ARW.set(null);hideRaw();labels(null);
 if(hubOn){HUB.innerHTML="";hubDraw()}else{baseOn();labels(CH[cur].lb?CH[cur].lb():null);{const b=CH[cur].d();CH[cur].view?CH[cur].view():fit(b)}}
 blinkSet();ctShow();cards.querySelectorAll(".chap").forEach((c,j)=>c.classList.toggle("on",j===cur));document.getElementById("cpos").textContent=`${cur+1} / ${CH.length}`;
 const el=cards.children[cur];if(GF.phone())cards.scrollTo({left:el.offsetLeft-cards.offsetLeft,behavior:"smooth"})}
function step(i){go(i);if(!GF.phone())cards.children[cur].scrollIntoView({behavior:"smooth",block:"center"})}
document.getElementById("prev").onclick=()=>step(cur-1);document.getElementById("next").onclick=()=>step(cur+1);
const io=new IntersectionObserver(es=>{if(GF.phone()||mode!=="story")return;es.forEach(e=>{if(e.isIntersecting){const i=+e.target.dataset.i;if(i!==cur)go(i)}})},{rootMargin:"-45% 0px -45% 0px"});cards.querySelectorAll(".chap").forEach(c=>io.observe(c));
cards.querySelectorAll(".chap").forEach((c,i)=>c.onclick=()=>go(i));
let st;cards.addEventListener("scroll",()=>{if(!GF.phone())return;clearTimeout(st);st=setTimeout(()=>{const i=Math.round(cards.scrollLeft/cards.children[0].offsetWidth);if(i!==cur)go(i)},150)});
const raw=document.getElementById("rawt");
function explore(){document.body.classList.remove("hubon");blinkSet();ctShow();lay.clearLayers();ARW.set(null);baseOn();labels(LB(GF.LAND,["Russian Federation","China","India","Turkey","Brazil","Egypt"],["Kozmino","Novorossiysk","Primorsk"]));if(raw.checked){showRaw();return}hideRaw();const b=flows();hotspots();fit(b)}
function setMode(m){mode=m;document.body.classList.toggle("story",m==="story");document.body.classList.toggle("explore",m!=="story");
 document.querySelectorAll("#modes button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.m===m));setTimeout(()=>map.invalidateSize(),0);m==="story"?go(cur):explore()}
document.querySelectorAll("#modes button").forEach(b=>b.onclick=()=>setMode(b.dataset.m));
raw.onchange=()=>{document.body.classList.toggle("raw",raw.checked);explore()};
setMode("story");
})();
