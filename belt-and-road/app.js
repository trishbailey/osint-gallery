// Placeholder: set to the deployed Africa Brief URL. Link stays hidden while empty.
const AFRICA_BRIEF_URL="../africa-brief/";
const COL={port:"#087F8C",railway:"#11273C",mine:"#C98A1B","military base":"#9A3B3B",loan:"#6B4FA0",infrastructure:"#4A7A3D"};
const SYM={port:d3.symbolCircle,railway:d3.symbolSquare,mine:d3.symbolTriangle,"military base":d3.symbolStar,loan:d3.symbolDiamond,infrastructure:d3.symbolCross};
const REG={all:"All regions",africa:"Africa","south-asia":"South Asia","southeast-asia":"Southeast Asia","south-america":"South America"};
Promise.all([d3.json("data/bri.json"),d3.json("data/ne_110m.geojson")]).then(([D,W])=>{
 document.getElementById("dd").textContent=D.data_date;
 const byId=new Map(D.entries.map(e=>[e.id,e]));
 const svg=d3.select("#map"),proj=d3.geoNaturalEarth1().fitSize([960,500],W),path=d3.geoPath(proj);
 const root=svg.append("g");
 root.append("g").selectAll("path").data(W.features).join("path").attr("class","land").attr("d",path);
 const g=root.append("g");let k=1;
 const zoom=d3.zoom().scaleExtent([1,12]).on("zoom",ev=>{k=ev.transform.k;root.attr("transform",ev.transform);g.selectAll(".mk").attr("d",d=>d3.symbol(SYM[d.type],140/(k*k))())});
 svg.call(zoom);
 let region="all",cur=null;const on=new Set(Object.keys(COL));
 const rf=d3.select("#regions");
 Object.entries(REG).forEach(([r,lab])=>{const n=r==="all"?D.entries.length:D.entries.filter(e=>e.region===r).length;
  rf.append("button").attr("type","button").attr("data-r",r).text(`${lab} (${n})`).on("click",()=>{location.hash=r==="all"?"":"region="+r})});
 const f=d3.select("#filters");
 Object.keys(COL).forEach(t=>{const n=D.entries.filter(e=>e.type===t).length;if(!n)return;
  const l=f.append("label");l.append("input").attr("type","checkbox").property("checked",true).on("change",function(){this.checked?on.add(t):on.delete(t);draw()});
  l.append("span").html(` <b style="color:${COL[t]}">■</b> ${t} (${n})`)});
 const tb=d3.select("#tbl tbody"),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const host=u=>{try{return new URL(u).hostname}catch(_){return u}};
 function zoomTo(lonlat,scale){const[x,y]=proj(lonlat);svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(480-scale*x,250-scale*y).scale(scale))}
 function zoomRegion(){if(region==="all"){svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity);return}
  const v=D.entries.filter(e=>e.region===region),xs=v.map(e=>proj([e.lon,e.lat]));
  const [x0,x1]=d3.extent(xs,p=>p[0]),[y0,y1]=d3.extent(xs,p=>p[1]),s=Math.min(8,0.8/Math.max((x1-x0+40)/960,(y1-y0+40)/500));
  svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(480-s*(x0+x1)/2,250-s*(y0+y1)/2).scale(s))}
 function show(e){cur=e;g.selectAll(".mk").classed("sel",d=>d===e);
  const link=location.origin+location.pathname+"#p="+e.id;
  document.getElementById("panel").innerHTML=`<h3>${esc(e.name)}</h3><span class="pill ${e.confidence}">${e.confidence} confidence</span>
  <dl><dt>Country</dt><dd>${esc(e.country)} · ${REG[e.region]}</dd><dt>Type</dt><dd>${esc(e.kind)}</dd><dt>Scale</dt><dd>${esc(e.value)}</dd>
  <dt>Lender / builder</dt><dd>${esc(e.backer)}</dd><dt>What China gets</dt><dd>${esc(e.china_gets)}</dd>
  <dt>Host country's case</dt><dd>${esc(e.host_case)}</dd>${e.confidence_reason?`<dt>Why this confidence</dt><dd>${esc(e.confidence_reason)}</dd>`:""}<dt>Coordinates</dt><dd>${e.lat}, ${e.lon}</dd>
  <dt>Sources</dt><dd>${e.sources.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join("<br>")}</dd>
  <dt>Link to this project</dt><dd><a href="#p=${esc(e.id)}">${esc(link)}</a></dd></dl>`}
 function draw(){const v=D.entries.filter(e=>on.has(e.type)&&(region==="all"||e.region===region));
  g.selectAll(".mk").data(v,d=>d.id).join("path").attr("class","mk").attr("fill",d=>COL[d.type]).classed("sel",d=>d===cur)
   .attr("d",d=>d3.symbol(SYM[d.type],140/(k*k))()).attr("transform",d=>`translate(${proj([d.lon,d.lat])})`).on("click",(_,d)=>{location.hash="p="+d.id})
   .selectAll("title").data(d=>[d]).join("title").text(d=>d.name);
  tb.selectAll("tr").data(v,d=>d.id).join("tr").on("click",(_,d)=>{location.hash="p="+d.id})
   .html(d=>`<td><a href="#p=${esc(d.id)}">${esc(d.name)}</a></td><td>${esc(d.country)}</td><td>${REG[d.region]}</td><td>${d.type}</td><td><span class="pill ${d.confidence}">${d.confidence}</span></td>`);
  rf.selectAll("button").classed("on",function(){return this.dataset.r===region});
  const ab=document.getElementById("africa-brief");
  ab.hidden=!(AFRICA_BRIEF_URL&&region==="africa");if(AFRICA_BRIEF_URL)ab.querySelector("a").href=AFRICA_BRIEF_URL}
 function route(){const h=new URLSearchParams(location.hash.slice(1));
  const p=h.get("p"),r=h.get("region");
  if(p&&byId.has(p)){const e=byId.get(p);region=e.region;draw();show(e);zoomTo([e.lon,e.lat],5);document.getElementById("panel").scrollIntoView({block:"nearest"});return}
  region=REG[r]?r:"all";cur=null;draw();zoomRegion();
  document.getElementById("panel").innerHTML='<p class="muted">Click a marker or a table row for details.</p>'}
 window.addEventListener("hashchange",route);route();
});
