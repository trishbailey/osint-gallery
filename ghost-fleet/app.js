(async function(){
const T={port:{c:"#4fa3e0",l:"Port calls"},loitering:{c:"#e8913a",l:"Loitering at sea"},gap:{c:"#e05a6a",l:"Transponder off (AIS gap)"},encounter:{c:"#5cc98a",l:"Meetings with other ships"},sar:{c:"#b58cf0",l:"Radar-detected ships with no AIS"}};
const HK={sts:"#e8913a",load:"#c8a24a",choke:"#4fa3e0"};
const [M,P,TR,LAND,INF,EEZ,WPI,JAM]=await Promise.all(["data/map.json","data/profiles.json","data/tracks.json","data/land_50m.geojson","data/infra.json","data/eez.json","data/wpi.json","data/jam.json"].map(u=>fetch(u).then(r=>r.json())));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const title=s=>String(s||"").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const day=864e5,t0=Date.parse(M.from),t1=Date.parse(M.to),nd=Math.round((t1-t0)/day);

const map=L.map("map",{worldCopyJump:true,preferCanvas:true,minZoom:2,attributionControl:true}).setView([45,30],3);
map.attributionControl.setPrefix('<a href="https://globalfishingwatch.org" target="_blank" rel="noopener">Powered by Global Fishing Watch.</a> Basemap: Natural Earth');
L.geoJSON(LAND,{style:{color:"#4d6a99",weight:.7,fillColor:"#2a4066",fillOpacity:1},onEachFeature:(f,l)=>l.bindTooltip(esc(f.properties.n),{sticky:true})}).addTo(map);
const cv=L.canvas({padding:.5});
const on={port:true,loitering:true,gap:true,encounter:true,sar:false};
let from=0,to=nd,sel=null;
const layers={};for(const k in T)layers[k]=L.layerGroup().addTo(map);
const cnt=t=>t==="sar"?M.sar.reduce((a,b)=>a+b.n,0):M.events.filter(e=>e.t===t).length;
// legend
const CL={hub:["Transfer hub ships","#e8913a","Most trips include loitering in transfer areas or meetings at sea, consistent with ship-to-ship transfers"],core:["Regular Russia runners","#4fa3e0","Load at Russian oil terminals in at least three of the last four quarters"],dev:["Recently renamed or reflagged","#d97cb0","New name, flag or MMSI in the last year, and loaded Russian oil at least twice since"],taxi:["Mixed-trade tankers","#5cc98a","Load in Russia now and then, and call at non-Russian ports in most quarters"],other:["Occasional or little data","#f2d16b","Too few recorded trips to fit a pattern"]};
const clsOn=Object.fromEntries(Object.keys(CL).map(k=>[k,k!=="other"]));
{const cb=document.getElementById("clsf");cb.innerHTML=Object.entries(CL).map(([k,v])=>`<button class="hl wide" data-c="${k}" aria-pressed="${clsOn[k]}" title="${v[2]}"><span class="sw" style="background:${v[1]}"></span>${v[0]} <span class="muted">${Object.values(P).filter(p=>p.cls===k).length}</span></button>`).join("");
 cb.querySelectorAll("button").forEach(b=>b.onclick=()=>{const k=b.dataset.c;clsOn[k]=!clsOn[k];b.setAttribute("aria-pressed",clsOn[k]);draw()})}
const lg=document.getElementById("legend");
for(const k in T){if(!cnt(k)){on[k]=false;continue}const b=document.createElement("button");b.setAttribute("aria-pressed",on[k]);b.innerHTML=`<span class="sw" style="background:${T[k].c}"></span>${T[k].l}<span class="ct">${cnt(k).toLocaleString()}</span>`;b.onclick=()=>{on[k]=!on[k];b.setAttribute("aria-pressed",on[k]);draw()};lg.appendChild(b)}
// hotspots
const hot=L.layerGroup().addTo(map);const hon={sts:false,load:false,choke:false};
function drawHot(){hot.clearLayers();M.hot.forEach(h=>{if(!hon[h.k])return;L.circle([h.lat,h.lon],{radius:h.r*1000,color:HK[h.k],weight:2,dashArray:"6 4",fill:true,fillOpacity:.08,interactive:false}).addTo(hot);L.marker([h.lat,h.lon],{icon:L.divIcon({className:"",html:`<span style="background:#0f1b31;border:1px solid ${HK[h.k]};color:#e6e9ef;padding:1px 6px;border-radius:9px;font-size:13px;white-space:nowrap">${esc(h.n)}</span>`}),interactive:false}).addTo(hot)})}
document.querySelectorAll(".hl:not([data-c])").forEach(b=>{b.setAttribute("aria-pressed","false");b.onclick=()=>{const k=b.dataset.k;hon[k]=!hon[k];document.querySelectorAll(`.hl[data-k=${k}]`).forEach(x=>x.setAttribute("aria-pressed",hon[k]));drawHot();if(hon[k])document.getElementById("map").scrollIntoView({behavior:"smooth"})}});
// infrastructure
const inf=L.layerGroup();let infOn=false;
INF.cable.forEach(f=>L.polyline(f.c.map(c=>[c[1],c[0]]),{renderer:cv,color:"#5cc98a",weight:1.5,opacity:.7}).bindTooltip("Undersea cable: "+esc(f.n),{sticky:true}).addTo(inf));
INF.pipe.forEach(f=>L.polyline(f.c.map(c=>[c[1],c[0]]),{renderer:cv,color:"#f2d16b",weight:1.5,opacity:.8}).bindTooltip(esc(f.n),{sticky:true}).addTo(inf));
function setInf(v){infOn=v;document.querySelectorAll("#infra,.hl[data-x=infra]").forEach(b=>b.setAttribute("aria-pressed",v));if(v){inf.addTo(map);inf.eachLayer(l=>l.bringToBack&&l.bringToBack())}else map.removeLayer(inf)}
document.getElementById("infra").onclick=()=>setInf(!infOn);document.querySelectorAll(".hl[data-x=infra]").forEach(b=>b.onclick=()=>{setInf(!infOn);if(infOn){map.setView([59.5,24],5);document.getElementById("map").scrollIntoView({behavior:"smooth"})}});
// reference layers
function tog(id,layer,cb){let v=false;const b=document.getElementById(id);b.onclick=()=>{v=!v;b.setAttribute("aria-pressed",v);v?layer.addTo(map):map.removeLayer(layer);cb&&cb(v)}}
const eez=L.layerGroup();EEZ.forEach(l=>L.polyline(l.map(c=>[c[1],c[0]]),{renderer:cv,color:"#6fc3c9",weight:1,opacity:.8,dashArray:"4 3",interactive:false}).addTo(eez));tog("eezb",eez);
const wpi=L.layerGroup();WPI.forEach(p=>L.circleMarker([p[2],p[3]],{renderer:cv,radius:p[4]==="L"?4:2.5,color:"#d97cb0",weight:1,fillColor:"#d97cb0",fillOpacity:.9}).bindTooltip(`Port: ${esc(title(p[0]))} (${esc(p[1])})`).addTo(wpi));tog("wpib",wpi);
const jam=L.layerGroup();let jamOn=false,jamDay="";
function drawJam(){if(!jamOn)return;const d=new Date(+clock.value).toISOString().slice(0,10);if(d===jamDay)return;jamDay=d;jam.clearLayers();(JAM.days[d]||[]).forEach(([h,l])=>{const b=JAM.hex[h];if(b)L.polygon(b,{renderer:cv,stroke:false,fillColor:l===2?"#d94f8a":"#b06ac9",fillOpacity:.55,interactive:false}).addTo(jam)})}
tog("jamb",jam,v=>{jamOn=v;jamDay="";drawJam()});
// phone: filters toggle
const ft=document.getElementById("ftoggle"),side=document.getElementById("side");ft.onclick=()=>{const o=side.classList.toggle("open");ft.setAttribute("aria-expanded",o)};
const phone=()=>innerWidth<700;
// dates
const fr=document.getElementById("from"),tt=document.getElementById("to");
[fr,tt].forEach(x=>{x.min=0;x.max=nd});fr.value=0;tt.value=nd;
const dl=()=>document.getElementById("datelbl").textContent=fmt(t0+from*day)+" – "+fmt(t0+to*day);
fr.oninput=()=>{from=Math.min(+fr.value,to);draw()};tt.oninput=()=>{to=Math.max(+tt.value,from);draw()};
// search
const dlst=document.getElementById("names");Object.values(P).filter(p=>p.n90).forEach(p=>{const o=document.createElement("option");o.value=`${p.name} (${p.imo})`;dlst.appendChild(o)});
document.getElementById("q").onchange=e=>{const m=e.target.value.match(/(\d{7})/)||[];const imo=m[1]||Object.values(P).find(p=>p.name.toLowerCase()===e.target.value.toLowerCase())?.imo;if(imo&&P[imo]){openP(imo)}};
function tip(e){const p=P[e.imo]||{};let s=`<b>${esc(p.name||e.imo)}</b> · IMO ${e.imo}<br>${T[e.t].l}: ${fmt(e.s)}`;
 if(e.port)s+=`<br>Port: ${esc(title(e.port))}`;if(e.hrs)s+=`<br>${e.hrs} hours`;if(e.with)s+=`<br>With: ${esc(e.with)}`;if(e.hz)s+=`<br>Area: ${esc(e.hz)}`;if(e.jam)s+=`<br>GPS interference reported nearby that day`;if(e.eez===0&&e.t!=='port')s+=`<br>On the high seas`;if(e.inf)s+=`<br>Within 2 km of ${esc(e.inf)}`;return s+"<br><i>Click for ship profile</i>"}
function draw(){dl();const a=new Date(t0+from*day).toISOString().slice(0,10),b=new Date(t0+(to+1)*day).toISOString().slice(0,10);
 for(const k in layers)layers[k].clearLayers();let ne=0,nv=new Set();
 const clus=phone()&&!sel&&map.getZoom()<5,cells={};
 M.events.forEach(e=>{if(!on[e.t]||e.s<a||e.s>=b)return;if(sel&&e.imo!==sel)return;if(!sel&&P[e.imo]&&!clsOn[P[e.imo].cls||"other"])return;if(netSel!=null&&!M.nets[netSel].ships.includes(e.imo))return;ne++;nv.add(e.imo);
  if(clus){const k=Math.round(e.lat/8)+","+Math.round(e.lon/8);const c=cells[k]||(cells[k]={n:0,la:0,lo:0,t:{}});c.n++;c.la+=e.lat;c.lo+=e.lon;c.t[e.t]=(c.t[e.t]||0)+1;return}
  L.circleMarker([e.lat,e.lon],{renderer:cv,radius:e.t==="gap"?6:4,color:T[e.t].c,weight:1,fillColor:T[e.t].c,fillOpacity:.75}).bindTooltip(tip(e)).on("click",()=>openP(e.imo)).addTo(layers[e.t])});
 Object.values(cells).forEach(c=>{const top=Object.entries(c.t).sort((x,y)=>y[1]-x[1])[0][0];const r=Math.min(26,10+Math.sqrt(c.n));
  L.marker([c.la/c.n,c.lo/c.n],{icon:L.divIcon({className:"",iconSize:[r*2,r*2],html:`<div class="clu" style="width:${r*2}px;height:${r*2}px;border-color:${T[top].c}">${c.n}</div>`})}).bindTooltip(Object.entries(c.t).map(([k,v])=>`${T[k].l}: ${v}`).join("<br>")).on("click",ev=>map.setView(ev.latlng,5)).addTo(layers.port)});
 if(on.sar&&!sel)M.sar.forEach(s=>{if(s.d<a||s.d>=b)return;L.circleMarker([s.lat,s.lon],{renderer:cv,radius:3,color:T.sar.c,weight:0,fillColor:T.sar.c,fillOpacity:.8}).bindTooltip(`<b>Radar-detected ship, no AIS</b><br>${esc(s.area)} · ${fmt(s.d)}<br>${s.n} detection(s)`).addTo(layers.sar)});
 stats(nv.size,ne)}
function stats(nv,ne){const s=document.getElementById("stats");const lo=M.events.filter(e=>e.t==="loitering"&&P[e.imo]&&e.hz).length;
 s.innerHTML=[[Object.keys(P).length.toLocaleString(),"tankers followed"],[nv.toLocaleString(),"ships active in view"],[ne.toLocaleString(),"events in view"],[lo.toLocaleString(),"loitering events in known transfer areas, 90 days"]].map(x=>`<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")}
// networks
let netSel=null;
document.getElementById("nets").innerHTML=M.nets.slice(0,12).map((n,i)=>{const ch=n.ships.map(s=>P[s]?.churn||[0,0,0,0]);const churn=ch.filter(c=>c[0]+c[1]+c[2]>=7).length;
 return `<div class="card net"><button class="hl" data-n="${i}" aria-pressed="false">${esc(n.name)}${n.country?" · "+esc(n.country):""} — ${n.ships.length} ships</button><div>${n.ships.slice(0,8).map(s=>`<span class="chip" role="button" tabindex="0" data-i="${s}">${esc(P[s]?.name||s)}</span>`).join("")}${n.ships.length>8?`<span class="muted"> +${n.ships.length-8} more</span>`:""}</div>${churn?`<div class="muted">${churn} of these ships show heavy name, flag or owner churn.</div>`:""}</div>`}).join("");
document.querySelectorAll("#nets .chip").forEach(c=>{c.onclick=()=>openP(c.dataset.i);c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openP(c.dataset.i)}}});
document.querySelectorAll("#nets button[data-n]").forEach(b=>b.onclick=()=>{const i=+b.dataset.n;netSel=netSel===i?null:i;document.querySelectorAll("#nets button[data-n]").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.n===netSel));draw();if(netSel!=null)document.getElementById("map").scrollIntoView({behavior:"smooth"})});
if(M.shared.length)document.getElementById("addr").innerHTML=`<h3 class="sh">Addresses shared by three or more companies</h3>`+M.shared.slice(0,10).map(s=>`<div class="card"><b>${esc(s.address)}</b><div class="muted">${s.companies.map(esc).join(", ")}</div></div>`).join("");
// panel
const panel=document.getElementById("panel");document.getElementById("pclose").onclick=()=>{panel.hidden=true;sel=null;draw();history.replaceState(null,"",location.pathname)};
let LINK=null;const loadLink=()=>LINK||(LINK=Promise.all(["data/vessels.json","data/owners.json"].map(u=>fetch(u).then(r=>r.json()))).then(([v,o])=>({V:Object.fromEntries(v.vessels.map(x=>[x.imo,x])),O:o})));
// ships linked to a company but outside the tracked-tanker set have no activity profile: show their identity and company records instead of doing nothing
async function openLinked(imo){sel=null;history.replaceState(null,"","#p="+imo);draw();
 document.getElementById("pbody").innerHTML=`<h2 id="ptitle">IMO ${esc(imo)}</h2><div class="muted">Loading the ship record…</div>`;panel.hidden=false;
 let d={V:{},O:{}};try{d=await loadLink()}catch(e){}
 if(sel!==null)return;const v=d.V[imo],o=d.O[imo]||[];
 document.getElementById("pbody").innerHTML=`<h2 id="ptitle">${esc(v?v.name:"IMO "+imo)}</h2><div class="muted">IMO ${esc(imo)}</div>
 <h3>Why there is no activity profile</h3><p>This ship is linked to a company network on this page but is not one of the tracked tankers, so there are no port-call, loitering, transponder-gap or meeting records for it here.</p>
 ${v&&v.history&&v.history.length?`<h3>Identity history (names, flags, MMSI numbers)</h3><ul>${v.history.map(h=>`<li>${esc(h.name)} · ${esc(h.flag||"no flag")} · MMSI ${esc(h.mmsi||"not recorded")} <span class="muted">${h.from||"?"} to ${h.to||"?"}</span></li>`).join("")}</ul>`:""}
 ${o.length?`<h3>Companies behind the ship</h3><ul>${o.map(c=>`<li><b>${esc(String(c.role||"").replace(/^./,x=>x.toUpperCase()))}</b>: ${esc(c.name)}${c.country?" · "+esc(c.country):""} <span class="muted">${c.from?("from "+c.from):""}${c.to?(" to "+c.to):""}</span></li>`).join("")}</ul>`:'<p class="muted">No company records on file.</p>'}`}
function openP(imo){const p=P[imo];if(!p){openLinked(imo);return}sel=imo;history.replaceState(null,"","#p="+imo);
 const B=p.base,lab={port:"Port calls",loitering:"Loitering",gap:"AIS gaps",encounter:"Meetings"};
 document.getElementById("pbody").innerHTML=`<h2 id="ptitle">${esc(p.name)}</h2><div class="muted">IMO ${p.imo}</div>${p.cls?`<div class="clsb"><span class="sw" style="background:${CL[p.cls][1]}"></span><b>${CL[p.cls][0]}</b><div class="muted">${CL[p.cls][2]}.</div></div>`:""}
 <h3>What stands out</h3>${p.notes.map(n=>`<div class="flag">${esc(n)}</div>`).join("")}
 <h3>Activity per month: earlier in the year vs last 90 days</h3><div class="cmp"><span></span><b>Earlier</b><b>Last 90 days</b>${Object.keys(lab).map(k=>`<span>${lab[k]}</span><span>${B[k][0]}</span><span>${B[k][1]}</span>`).join("")}</div>
 <h3>Usual ports (earlier in the year)</h3><div>${p.portsBefore.map(([k,v])=>`<span class="chip">${esc(title(k.split("|")[0]))} ${v}×</span>`).join("")||'<span class="muted">None recorded</span>'}</div>
 <h3>Ports in the last 90 days</h3><div>${p.portsRecent.map(([k,v])=>`<span class="chip">${esc(title(k.split("|")[0]))} ${v}×</span>`).join("")||'<span class="muted">None recorded</span>'}</div>
 <h3>Identity history (names, flags, MMSI numbers)</h3><ul>${p.history.map(h=>`<li>${esc(h.name)} · ${esc(h.flag||"no flag")} · MMSI ${esc(h.mmsi)} <span class="muted">${h.from||"?"} to ${h.to||"?"}</span></li>`).join("")||"<li class=muted>Not available</li>"}</ul>
 ${p.companies&&p.companies.length?`<h3>Companies behind the ship</h3><ul>${p.companies.map(c=>`<li><b>${esc(c.role)}</b>: ${esc(c.name)}${c.country?" · "+esc(c.country):""} <span class="muted">${c.from?("from "+c.from):""}${c.to?(" to "+c.to):""}</span></li>`).join("")}</ul>`:""}
 <div class="muted">Changes on record: ${p.churn[0]} names, ${p.churn[1]} flags, ${p.churn[2]} owners, ${p.churn[3]} managers.</div>
 ${p.owners.length?`<h3>Registered owners</h3><ul>${p.owners.map(o=>`<li>${esc(o.name)} ${o.flag?"· "+esc(o.flag):""} <span class="muted">${o.from||"?"} to ${o.to||"?"}</span></li>`).join("")}</ul>`:""}
 <p class="muted">Map now shows only this ship. Press Play with "Selected ship" to watch its route.</p>`;
 panel.hidden=false;draw();const tr=TR[imo];if(tr&&tr.length)map.fitBounds(tr.map(x=>[x[1],x[2]]),{maxZoom:6,padding:[30,30]});setOne(true)}
// animation
const clock=document.getElementById("clock"),cl=document.getElementById("clocklbl");clock.min=t0;clock.max=t1;clock.step="any";clock.value=t0;
const anim=L.layerGroup().addTo(map);let playing=false,one=false,last=0;
const TRK=Object.fromEntries(Object.entries(TR).map(([k,v])=>[k,v.map(x=>[Date.parse(x[0]+"Z"),x[1],x[2]])]));
function pos(tr,t){if(t<tr[0][0]||t>tr[tr.length-1][0])return null;let i=1;while(tr[i][0]<t)i++;const a=tr[i-1],b=tr[i],f=(t-a[0])/Math.max(1,b[0]-a[0]);let dl=b[2]-a[2];if(dl>180)dl-=360;if(dl<-180)dl+=360;return[a[1]+(b[1]-a[1])*f,a[2]+dl*f]}
function frame(){const t=+clock.value;drawJam();cl.textContent=fmt(t);anim.clearLayers();const ids=one&&sel?[sel]:Object.keys(TRK);
 ids.forEach(id=>{const tr=TRK[id];if(!tr)return;const p=pos(tr,t);if(!p)return;
  for(let k=3;k>=1;k--){const pts=[];for(let s=0;s<=6;s++){const q=pos(tr,t-(k*4-s*4/6)*day);if(q)pts.push(q)}if(pts.length>1)L.polyline(pts,{renderer:cv,color:"#f5f7fa",weight:2,opacity:.15+.25*(3-k),interactive:false}).addTo(anim)}
  L.circleMarker(p,{renderer:cv,radius:one?7:4,color:"#0b1526",weight:1,fillColor:"#f5f7fa",fillOpacity:1}).bindTooltip(`<b>${esc(P[id]?.name||id)}</b><br>${fmt(t)}`).on("click",()=>openP(id)).addTo(anim)})}
function tick(ts){if(!playing)return;if(last){const dt=(ts-last)/1000;let v=+clock.value+dt*(+document.getElementById("speed").value)*day;if(v>t1)v=t0;clock.value=v;frame()}last=ts;requestAnimationFrame(tick)}
const pb=document.getElementById("play");pb.onclick=()=>{playing=!playing;pb.setAttribute("aria-pressed",playing);pb.textContent=playing?"❚❚ Pause":"▶ Play";last=0;if(playing)requestAnimationFrame(tick)};
clock.oninput=frame;
function setOne(v){one=v;document.getElementById("aOne").classList.toggle("on",v);document.getElementById("aAll").classList.toggle("on",!v);document.getElementById("aOne").setAttribute("aria-pressed",v);document.getElementById("aAll").setAttribute("aria-pressed",!v);frame()}
document.getElementById("aAll").onclick=()=>setOne(false);document.getElementById("aOne").onclick=()=>{if(!sel){alert("Pick a ship first: click a dot, a table row or use Find a ship.");return}setOne(true)};
map.on("zoomend",()=>{if(phone())draw()});draw();frame();
const RAWL=[...Object.values(layers),anim];window.GF={LAND,CL,map,cv,esc,fmt,title,M,P,phone,openP,hideRaw(){RAWL.forEach(l=>map.removeLayer(l));if(playing)pb.click()},showRaw(){RAWL.forEach(l=>l.addTo(map));draw()}};const h=location.hash.match(/p=(\d{7})/);if(h)openP(h[1]);
})();
