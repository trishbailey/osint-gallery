// Cross-link to the Africa Brief (shown on the Africa view).
const AFRICA_BRIEF_URL="../africa-brief/";
// Dark-theme marker palette: min CIEDE2000 pair dE 26.7 (checked in code, see _src/palette_check.py)
const COL={port:"#2EC4D6",railway:"#6E8CFF",mine:"#E8C24A","military base":"#FF5A57",loan:"#F27FD0",infrastructure:"#6FD36A"};
const SYM={port:d3.symbolCircle,railway:d3.symbolSquare,mine:d3.symbolTriangle,"military base":d3.symbolStar,loan:d3.symbolDiamond,infrastructure:d3.symbolCross};
const TLAB={port:"Ports",railway:"Railways",mine:"Mines","military base":"Military and dual-use sites",loan:"Loans",infrastructure:"Other infrastructure"};
const REG={all:"All regions",africa:"Africa","south-asia":"South Asia","southeast-asia":"Southeast Asia","south-america":"South America","central-asia":"Central Asia","middle-east":"Middle East",europe:"Europe and the Balkans",pacific:"Pacific Islands"};
// Continent-wide totals: never drawn as places.
const AGG=new Set(["bri-loans","bri-loans-top"]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch(_){return u}};
const symSvg=(t,sz=18)=>`<svg width="${sz}" height="${sz}" viewBox="-9 -9 18 18" aria-hidden="true"><path d="${d3.symbol(SYM[t],110)()}" fill="${COL[t]}" stroke="#0b1526" stroke-width="1"/></svg>`;
Promise.all([d3.json("data/bri.json"),d3.json("data/ne_110m.geojson")]).then(([D,W])=>{
 document.getElementById("dd").textContent=D.data_date;
 const E=D.entries,byId=new Map(E.map(e=>[e.id,e]));
 const mapbox=d3.select(".mapbox"),tip=mapbox.append("div").attr("class","tip").style("display","none");
 const svg=d3.select("#map"),proj=d3.geoNaturalEarth1().fitSize([960,500],W),path=d3.geoPath(proj);
 const root=svg.append("g");
 const landSel=root.append("g").selectAll("path").data(W.features).join("path").attr("class","land").attr("d",path);
 let rot=0;function setRot(r){if(r===rot)return;rot=r;proj.rotate([r,0]);landSel.attr("d",path)}
 const lg=root.append("g").attr("class","labels"),g=root.append("g");let k=1;
 const sizeAll=()=>{g.selectAll(".mk").attr("d",d=>d3.symbol(SYM[d.type],150/(k*k))());lg.selectAll("text").attr("font-size",14/k).attr("stroke-width",4/k).attr("dy",-9/k)};
 const zoom=d3.zoom().scaleExtent([1,14]).on("zoom",ev=>{k=ev.transform.k;root.attr("transform",ev.transform);sizeAll()});
 svg.call(zoom);
 let region="africa",cur=null,lastFocus=null;const on=new Set(Object.keys(COL));
 const rf=d3.select("#regions");
 Object.entries(REG).forEach(([r,lab])=>{const n=r==="all"?E.length:E.filter(e=>e.region===r).length;
  rf.append("button").attr("type","button").attr("data-r",r).text(`${lab} (${n})`).on("click",()=>{location.hash="region="+r})});
 const lgd=d3.select("#legend");
 Object.keys(COL).forEach(t=>{const n=E.filter(e=>e.type===t&&!AGG.has(e.id)).length;if(!n)return;
  lgd.append("button").attr("type","button").attr("data-t",t).attr("aria-pressed","true").html(`${symSvg(t)}<span>${TLAB[t]} (${n})</span>`)
   .on("click",function(){on.has(t)?on.delete(t):on.add(t);this.setAttribute("aria-pressed",on.has(t));draw()})});
 function zoomTo(lonlat,s){const[x,y]=proj(lonlat);svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(480-s*x,250-s*y).scale(s))}
 function zoomRegion(){if(region==="all"){svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity);return}
  const xs=E.filter(e=>e.region===region&&!AGG.has(e.id)).map(e=>proj([e.lon,e.lat]));
  const [x0,x1]=d3.extent(xs,p=>p[0]),[y0,y1]=d3.extent(xs,p=>p[1]),s=Math.min(8,0.85/Math.max((x1-x0+60)/960,(y1-y0+60)/500));
  svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(480-s*(x0+x1)/2,250-s*(y0+y1)/2).scale(s))}
 const card=e=>`<button type="button" class="pcard" data-id="${esc(e.id)}" aria-label="Open details: ${esc(e.name)}"><span class="ct">${symSvg(e.type,16)} ${esc(TLAB[e.type])}</span><b>${esc(e.name)}</b><span class="cc">${esc(e.country)}</span><span class="pill ${e.confidence}">${e.confidence} confidence</span></button>`;
 function openPanel(e){cur=e;g.selectAll(".mk").classed("sel",d=>d===e);
  const notes=e.sources.map((u,i)=>`<a href="#n-${i+1}" class="fn" data-n="${i+1}" aria-label="Source ${i+1}">${i+1}</a>`).join(",");
  const link=location.origin+location.pathname+"#p="+e.id;
  document.getElementById("pbody").innerHTML=`<p class="ct">${symSvg(e.type,16)} ${esc(TLAB[e.type])} · ${esc(e.country)} · ${REG[e.region]}</p><h2 id="ptitle">${esc(e.name)}</h2><span class="pill ${e.confidence}">${e.confidence} confidence</span>
  <dl><dt>Scale</dt><dd>${esc(e.value)}<sup>${notes}</sup></dd><dt>Lender or builder</dt><dd>${esc(e.backer)}</dd><dt>What China gets</dt><dd>${esc(e.china_gets)}</dd>
  <dt>Host country's case</dt><dd>${esc(e.host_case)}</dd>${e.confidence_reason?`<dt>Why this confidence</dt><dd>${esc(e.confidence_reason)}</dd>`:""}
  <dt>Link to this project</dt><dd><a href="#p=${esc(e.id)}">${esc(link)}</a></dd></dl>
  <details class="srcs" id="srcs"><summary>Sources (${e.sources.length})</summary><ol>${e.sources.map((u,i)=>`<li id="n-${i+1}"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a></li>`).join("")}</ol></details>`;
  document.querySelectorAll("#pbody .fn").forEach(a=>a.addEventListener("click",ev=>{ev.preventDefault();const s=document.getElementById("srcs");s.open=true;document.getElementById("n-"+a.dataset.n).scrollIntoView({block:"nearest"})}));
  const p=document.getElementById("panel");lastFocus=lastFocus||document.activeElement;p.classList.add("open");p.setAttribute("aria-hidden","false");document.getElementById("scrim").hidden=false;document.getElementById("close").focus()}
 function closePanel(){const p=document.getElementById("panel");if(!p.classList.contains("open"))return;p.classList.remove("open");p.setAttribute("aria-hidden","true");document.getElementById("scrim").hidden=true;cur=null;g.selectAll(".mk").classed("sel",false);
  history.replaceState(null,"","#region="+region);if(lastFocus&&lastFocus.focus)lastFocus.focus();lastFocus=null}
 document.getElementById("close").onclick=closePanel;document.getElementById("scrim").onclick=closePanel;
 document.addEventListener("keydown",ev=>{if(ev.key==="Escape")closePanel()});
 document.addEventListener("click",ev=>{const b=ev.target.closest(".pcard");if(b){lastFocus=b;location.hash="p="+b.dataset.id}});
 function draw(){const inR=e=>region==="all"||e.region===region;
  const v=E.filter(e=>inR(e)&&!AGG.has(e.id)&&on.has(e.type)),all=E.filter(e=>inR(e)&&!AGG.has(e.id));
  document.getElementById("title").textContent="China's Belt and Road: "+REG[region];
  const cs=new Set(all.flatMap(e=>e.country.split(" / ")));
  const st=[[all.length,"projects"],[cs.size,"countries"],[all.filter(e=>e.type==="port").length,"ports"],[all.filter(e=>e.type==="military base").length,"military and dual-use sites"],[all.filter(e=>e.type==="loan").length,"major loans"],[all.filter(e=>e.confidence==="high").length,"high confidence"]];
  document.getElementById("stats").innerHTML=st.map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join("");
  g.selectAll(".mk").data(v,d=>d.id).join("path").attr("class","mk").attr("fill",d=>COL[d.type]).classed("sel",d=>d===cur)
   .attr("transform",d=>`translate(${proj([d.lon,d.lat])})`).attr("tabindex",0).attr("role","button").attr("aria-label",d=>`${d.name}, ${d.country}, ${TLAB[d.type]}`)
   .on("click",(ev,d)=>{lastFocus=ev.currentTarget;location.hash="p="+d.id}).on("keydown",(ev,d)=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();lastFocus=ev.currentTarget;location.hash="p="+d.id}})
   .on("mouseenter mousemove",(ev,d)=>{const r=mapbox.node().getBoundingClientRect();tip.style("display","block").style("left",(ev.clientX-r.left+14)+"px").style("top",(ev.clientY-r.top+10)+"px").html(`<b>${esc(d.name)}</b><span>${esc(d.country)} · ${TLAB[d.type]} · click for details</span>`)}).on("mouseleave",()=>tip.style("display","none"));
  // Country labels at the mean position of each country's projects in view
  const lab=region==="all"?[]:d3.rollups(all.filter(e=>!e.country.includes("/")),vs=>proj([d3.mean(vs,e=>e.lon),d3.mean(vs,e=>e.lat)]),e=>e.country);
  lg.selectAll("text").data(lab,d=>d[0]).join("text").attr("class","clab").attr("x",d=>d[1][0]).attr("y",d=>d[1][1]).attr("text-anchor","middle").text(d=>d[0]);
  sizeAll();
  rf.selectAll("button").classed("on",function(){return this.dataset.r===region}).attr("aria-pressed",function(){return this.dataset.r===region});
  document.getElementById("ctitle").textContent=`Projects: ${REG[region]} (${v.length})`;
  document.getElementById("pcards").innerHTML=d3.sort(v,e=>Object.keys(COL).indexOf(e.type),e=>e.name).map(card).join("")||'<p class="muted">No project types selected.</p>';
  const ag=E.filter(e=>AGG.has(e.id)&&inR(e));document.getElementById("agg").hidden=!ag.length;document.getElementById("aggcards").innerHTML=ag.map(card).join("");
  const ab=document.getElementById("africa-brief");ab.hidden=!(AFRICA_BRIEF_URL&&region==="africa");if(AFRICA_BRIEF_URL)ab.querySelector("a").href=AFRICA_BRIEF_URL}
 function route(){const h=new URLSearchParams(location.hash.slice(1)),p=h.get("p"),r=h.get("region");
  if(p&&byId.has(p)){const e=byId.get(p);const nr=e.region;const ch=nr!==region;region=nr;setRot(region==="pacific"?-160:0);draw();if(AGG.has(e.id)){if(ch)zoomRegion()}else zoomTo([e.lon,e.lat],5);openPanel(e);return}
  region=REG[r]?r:"africa";setRot(region==="pacific"?-160:0);closePanel();draw();zoomRegion()}
 window.addEventListener("hashchange",route);route();window._ready=true;
});
