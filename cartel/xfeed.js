/* Breaking strip + "Latest from X" panel + 24h region badges. Self-contained: reads data/xfeed.json and data/breaking.json,
   listens to clicks on the map, legend and group cards built by app.js. Only verified accounts and professional outlets. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const J=p=>fetch(p).then(r=>r.ok?r.json():null).catch(()=>null);
const ago=t=>{const m=Math.max(0,(Date.now()-new Date(t))/6e4);return m<60?Math.round(m)+"m ago":m<1440?Math.round(m/60)+"h ago":Math.round(m/1440)+"d ago"};
const ST={confirmed:["Confirmed","bx-ok"],single_source:["Single source","bx-one"],official_claim_only:["Official claim only","bx-off"]};
const sel={region:null,group:null};
const ICO={confirmed:"✔",single_source:"①",official_claim_only:"🏛"};
const bil=(en,orig,lang)=>en&&lang!=="en"?`<span class="tx" data-en="${esc(en)}" data-es="${esc(orig)}">${esc(en)}</span><button class="es" title="Show original (${esc(lang||"es")})">ES</button>`:`<span class="tx">${esc(orig)}</span>`;
document.addEventListener("click",e=>{const b=e.target.closest("button.es");if(!b)return;e.stopPropagation();const s=b.previousElementSibling;const on=b.classList.toggle("on");s.textContent=on?s.dataset.es:s.dataset.en;b.textContent=on?"EN":"ES"},true);
const capped=(el,n)=>{const it=[...el.children];if(it.length<=n)return;it.slice(n).forEach(c=>c.classList.add("xtra"));const b=document.createElement("button");b.className="chip morebtn";b.textContent=`+${it.length-n} more`;b.onclick=()=>{const o=el.classList.toggle("showall");b.textContent=o?"show less":`+${it.length-n} more`};el.after(b)};
let X=null,B=null,RN={},GN={},GC={},NET=[];
Promise.all([J("data/xfeed.json"),J("data/breaking.json"),J("data/territory.json"),J("data/networks.json"),J("basemap/latam.topo.json")]).then(([xf,bk,terr,net,topo])=>{
  X=xf;B=bk;
  if(topo)topo.objects.admin1.geometries.forEach(g=>RN[g.properties.id]=g.properties.name);
  if(terr)terr.groups.forEach(g=>{GN[g.id]=g.name;GC[g.id]=g.color});
  if(net){NET=net.groups;net.groups.forEach(g=>{if(!GN[g.id])GN[g.id]=g.name})}
  if(terr)terr.groups.forEach(g=>{if(g.network_id&&!GC[g.network_id])GC[g.network_id]=g.color});
  strip();panel();waitMap();
});
function gdots(ids){return (ids||[]).map(g=>`<span class="xg"><span class="dot" style="background:${GC[g]||"#56657f"}"></span>${esc(GN[g]||g)}</span>`).join("")}
function gdots1(ids){return (ids||[]).slice(0,2).map(g=>`<span class="dot" title="${esc(GN[g]||g)}" style="background:${GC[g]||"#56657f"}"></span>`).join("")}
function rnames(ids){return (ids||[]).map(r=>esc(RN[r]||r)).join(", ")}
/* ---------- Breaking strip ---------- */
function strip(){
  if(!B||!B.events||!B.events.length)return;
  const s=document.createElement("section");s.className="tile bstrip";s.id="breaking";
  const ev=B.events.slice(0,40);
  const cnt=k=>B.events.filter(e=>e.status===k).length;
  s.innerHTML=`<div class="tilehead"><h2>Breaking</h2><span class="muted">Last 48 hours · verified outlets and official accounts only · <span class="bx bx-ok">Confirmed</span> ${cnt("confirmed")} <span class="bx bx-one">Single source</span> ${cnt("single_source")} <span class="bx bx-off">Official claim only</span> ${cnt("official_claim_only")}</span></div>
  <div class="bchips"><button class="chip on" data-s="">All</button><button class="chip" data-s="confirmed">Confirmed only</button></div>
  <div class="brow">${ev.map(e=>{const [l,c]=ST[e.status];const who=e.status==="confirmed"?e.outlets.join(" · "):e.outlets.join(", ");
   const first=e.first_report_precision==="day"?e.first_report.slice(0,10):ago(e.first_report);
   return `<div class="bcard ${e.status}" data-r="${esc((e.region_ids||[]).join(","))}" data-s="${e.status}" tabindex="0">
    <span class="bi ${c}" title="${l}">${ICO[e.status]}</span>${gdots1(e.group_ids)}<span class="btl">${bil(e.title_en,e.title,e.lang)}</span>
    <span class="bt">${e.region_ids&&e.region_ids.length?"📍"+rnames(e.region_ids.slice(0,1))+" · ":""}${esc(first)}</span>
    ${FN(e.sources.slice(0,6).map(x=>({url:x.url,name:x.name+(x.via.startsWith("X")?" (X)":""),title:e.title_en||e.title})))}</div>`}).join("")}</div>`;
  const k=document.getElementById("kpis");k.parentNode.insertBefore(s,k);
  s.querySelectorAll(".bchips .chip").forEach(b=>b.onclick=()=>{s.querySelectorAll(".bchips .chip").forEach(x=>x.classList.toggle("on",x===b));s.querySelectorAll(".bcard").forEach(c=>c.style.display=!b.dataset.s||c.dataset.s===b.dataset.s?"":"none")});
  s.querySelectorAll(".bcard").forEach(c=>c.onclick=e=>{if(e.target.closest("a"))return;const r=c.dataset.r.split(",").filter(Boolean);if(r.length){zoomTo(r);sel.region=r[0];render();document.querySelector(".maptile").scrollIntoView({behavior:"smooth",block:"start"})}});
}
/* ---------- map helpers ---------- */
function mapG(){const p=document.querySelector("#mapsvg path.adm");return p?p.parentNode.parentNode:null}
function regionPaths(ids){return [...document.querySelectorAll("#mapsvg path.adm")].filter(p=>p.__data__&&ids.includes(p.__data__.properties.id))}
function zoomTo(ids){
  const ps=regionPaths(ids),svg=document.getElementById("mapsvg"),g=mapG();if(!ps.length||!g)return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ps.forEach(p=>{const b=p.getBBox();x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.width);y1=Math.max(y1,b.y+b.height)});
  const W=svg.clientWidth,H=svg.clientHeight,k=Math.max(1,Math.min(10,.7/Math.max((x1-x0)/W,(y1-y0)/H)));
  const t=d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2);
  svg.__zoom=t;d3.select(g).transition().duration(700).attr("transform",t.toString());
  d3.select(g).selectAll(".pt").attr("transform",function(){return `${this.dataset.t} scale(${1/k})`});
  ps.forEach(p=>{d3.select(p).attr("stroke","#fff").raise();setTimeout(()=>d3.select(p).attr("stroke","none"),2500)});
}
function waitMap(n=0){if(mapG()){hook()}else if(n<60)setTimeout(()=>waitMap(n+1),250)}
function badges(){
  if(!X)return;const g=mapG(),cut=Date.now()-864e5,c={};
  X.posts.forEach(p=>{if(new Date(p.created_at)>=cut)p.region_ids.forEach(r=>c[r]=(c[r]||0)+1)});
  const L=d3.select(g).append("g").attr("class","xbadges").style("pointer-events","none");
  regionPaths(Object.keys(c)).forEach(p=>{const b=p.getBBox(),id=p.__data__.properties.id,t=`translate(${b.x+b.width/2},${b.y+b.height/2})`;
    const e=L.append("g").attr("class","pt xb").attr("data-t",t).attr("transform",t);
    e.append("circle").attr("r",9);e.append("text").attr("dy","0.35em").text(c[id]);
    e.append("title").text(`${RN[id]}: ${c[id]} X posts in the last 24 hours`)});
  const k=(d3.zoomTransform(document.getElementById("mapsvg"))||{k:1}).k;L.selectAll(".pt").attr("transform",function(){return `${this.dataset.t} scale(${1/k})`});
  const key=document.getElementById("keybox");if(key){const d=document.createElement("div");d.className="xkey";d.innerHTML=`<span class="xbk">n</span> X posts in last 24h`;key.appendChild(d)}
}
/* ---------- selection hooks (read-only listeners on app.js controls) ---------- */
function hook(){
  document.getElementById("mapsvg").addEventListener("click",e=>{const p=e.target.closest("path.adm");if(p&&p.__data__){sel.region=p.__data__.properties.id;render();setTimeout(()=>drawerPosts(sel.region),0)}});
  document.getElementById("grouplegend").addEventListener("click",e=>{const b=e.target.closest(".chip");if(b){sel.group=b.dataset.g||null;render()}});
  document.getElementById("cards").addEventListener("click",e=>{const b=e.target.closest("[data-map]");const c=e.target.closest(".gc");
    if(b){sel.group=b.dataset.map;render();return}if(c&&NET[+c.dataset.k]){sel.group=NET[+c.dataset.k].id;render()}});
}
function drawerPosts(id){const db=document.getElementById("dbody");if(!db||!X)return;const ps=X.posts.filter(p=>p.region_ids.includes(id)).slice(0,8);
  const d=document.createElement("div");d.className="xdr";d.innerHTML=`<h3>Latest from X (${ps.length?ps.length+" recent":"none in 7 days"})</h3>`+ps.map(p=>`<div class="rg"><a href="${esc(p.url)}" target="_blank" rel="noopener">@${esc(p.handle)}</a> <span class="muted">${esc(ago(p.created_at||p.date||X.as_of))}</span><div>${esc(p.text_en||p.text||"")}</div></div>`).join("");db.appendChild(d)}
/* ---------- Latest from X ---------- */
function panel(){
  const t=document.createElement("section");t.className="tile xpanel";t.id="xpanel";
  const m=document.querySelector(".maptile");m.appendChild(t);render();
}
function render(){
  const t=document.getElementById("xpanel");if(!t)return;
  if(!X){t.innerHTML=`<div class="tilehead"><h2>Latest from X</h2><span class="muted">Feed not available yet.</span></div>`;return}
  const ps=X.posts.filter(p=>(!sel.region||p.region_ids.includes(sel.region))&&(!sel.group||p.group_ids.includes(sel.group)));
  const pill=(k,label)=>`<button class="chip on xclr" data-k="${k}">${label} ✕</button>`;
  t.innerHTML=`<div class="tilehead"><h2>Latest from X</h2><span class="muted">Verified accounts · English shown, ES = original · updated ${esc(ago(X.as_of))} · ${X.posts.length} posts in 7 days</span></div>
   <div class="chips small">${sel.region?pill("region","📍 "+esc(RN[sel.region]||sel.region)):`<span class="muted">Click a state or department on the map</span>`}${sel.group?pill("group",`<span class="dot" style="background:${GC[sel.group]||"#56657f"}"></span>${esc(GN[sel.group]||sel.group)}`):`<span class="muted">· choose a group in the legend or a card</span>`}</div>
   <div class="xlist">${ps.length?ps.slice(0,30).map(p=>`<div class="xp${p.source_type==="official"?" xoff":""}">${p.source_type==="official"?`<span class="bi bx-off" title="Official statement">🏛</span>`:`<span class="bi" title="${esc(p.source_type)}">𝕏</span>`}${gdots1(p.group_ids)}<a class="xh" href="${esc(p.url)}" target="_blank" rel="noopener" title="Open post">@${esc(p.handle)}</a><span class="xx">${bil(p.text_en,p.text,p.lang)}</span><span class="xa">${p.region_ids.length?"📍"+rnames(p.region_ids.slice(0,1))+" · ":""}${ago(p.created_at)}</span></div>`).join(""):`<div class="muted">No tagged posts in the last 7 days for this selection.</div>`}</div>`;
  t.querySelectorAll(".xclr").forEach(b=>b.onclick=()=>{sel[b.dataset.k]=null;render()});const xl=t.querySelector(".xlist");if(xl&&xl.children.length)capped(xl,6);
}
})();
