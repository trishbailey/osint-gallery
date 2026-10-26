/* Three physical-goods route overlays: drugs & precursors, migrants, firearms (data/routes_*.geojson, pipeline/mk_routes3.py).
   Uses the map's own overlay helper (window.MAPX.mk from app.js) so toggles live in the Overlay box. Click a line: side panel with footnotes. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const L=[{k:"drug",f:"data/routes_drugs.geojson",label:"Drug and precursor routes",color:"#f230fd",dash:{cocaine:null,precursor:"1 5",synthetic:"9 5"}},
 {k:"migr",f:"data/routes_migrants.geojson",label:"Migrant routes",color:"#88fc15",dash:{"northbound land":null,"rail (La Bestia)":"14 6","sea":"1 5","southbound (reverse) 2025":"9 4 1 4"}},
 {k:"guns",f:"data/routes_firearms.geojson",label:"Firearm routes (southbound)",color:"#ff2277",dash:{land:null,sea:"1 5",air:"9 5"}}];
const FN=r=>(window.FN?window.FN(r):"");
function show(p,l){if(typeof drawer!=="function")return;drawer(`<h2>${esc(p.from)} → ${esc(p.to)}</h2><span class="tag" style="border-color:${l.color}">${esc(l.label)}</span><span class="tag">${esc(p.subtype)}</span><span class="tag">${esc(p.year)}</span><p>${esc(p.description)}${FN(p.sources)}</p>${p.sector?`<p><b>US Border Patrol sector:</b> ${esc(p.sector)}<br><b>Apprehensions:</b> ${(+p.encounters).toLocaleString()} (${esc(p.encounters_year)}, whole sector; FY2025 border-wide total fell to 237,565)</p>`:p.volume?`<p class="small">Sourced volume: ${(+p.volume).toLocaleString()}</p>`:""}${p.control?`<p><b>Controlling group / fee:</b> ${esc(p.control)}${FN(p.control_sources)}</p>`:""}<p class="muted small">Schematic corridor between places named in the sources.</p>`)}
function start(){const M=window.MAPX;if(!M||!window.__proj||!document.getElementById("layers")){return setTimeout(start,200)}
 const P=window.__proj,cv=d3.line().x(c=>P(c)[0]).y(c=>P(c)[1]).curve(d3.curveCatmullRom.alpha(.5)),rp=d=>d.geometry.type==="LineString"?cv(d.geometry.coordinates):d.geometry.type==="MultiLineString"?d.geometry.coordinates.map(cv).join(""):M.path(d);
 const ends=(s,fs,color)=>{const seen={},E=[];fs.forEach(f=>{const c=f.geometry.type==="MultiLineString"?f.geometry.coordinates.flat():f.geometry.coordinates;[[f.properties.from,c[0]],[f.properties.to,c[c.length-1]]].forEach(([n,ll])=>{if((ll[0]>-35||ll[0]<-125)&&!seen[n]){seen[n]=1;const q=P(ll);E.push({n,x:q[0],y:q[1]})}})});
  const eg=s.append("g").style("pointer-events","none").selectAll("g").data(E).join("g").attr("class","pt").attr("data-t",d=>`translate(${d.x},${d.y})`).attr("transform",function(){return `${this.dataset.t} scale(${1/(window.__zk||1)})`});
  eg.append("circle").attr("r",3.2).attr("fill",color).attr("stroke","#0b1526").attr("stroke-width",1);
  eg.append("text").text(d=>d.n).attr("x",5).attr("y",3.5).attr("font-size",10).attr("fill","#ffffff").attr("stroke","#0b1526").attr("stroke-width",2.5).attr("paint-order","stroke")};
 const OFF={drug:[0,0],migr:[2.5,2.5],guns:[-2.5,-2.5]};
 const arrows=(s,color)=>{const ar=[],tmp=d3.select("body").append("svg").style("position","absolute").style("visibility","hidden").style("width",0).style("height",0),tp=tmp.append("path").node();
  s.selectAll("path.ovl").each(function(){tp.setAttribute("d",this.getAttribute("d"));const L=tp.getTotalLength();if(!L||L<25)return;(L>200?[.3,.65,.95]:[.6]).forEach(t=>{const a=tp.getPointAtLength(L*t-1),b=tp.getPointAtLength(L*t);ar.push({x:b.x,y:b.y,r:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI})})});tmp.remove();
  s.append("g").style("pointer-events","none").selectAll("g").data(ar).join("g").attr("class","pt").attr("data-t",d=>`translate(${d.x},${d.y}) rotate(${d.r})`).attr("transform",function(){return `${this.dataset.t} scale(${1/(window.__zk||1)})`}).append("path").attr("d","M-4,-4L4,0L-4,4Z").attr("fill",color).attr("stroke","#0b1526").attr("stroke-width",1)};
 Promise.all(L.map(l=>fetch(l.f).then(r=>r.json()))).then(gs=>{
  const notes=document.createElement("div");notes.id="routenotes";notes.className="rnotes muted small";
  gs.forEach((g,i)=>{const l=L[i],vs=g.features.map(f=>+f.properties.volume||0),mx=Math.max(...vs,1);
   const sw=d=>d.properties.volume?1.8+3.2*Math.sqrt(d.properties.volume/mx):2.2;
   M.mk(l.k,l.label,l.color,s=>{s.append("g").selectAll("path").data(g.features).join("path").attr("d",rp).attr("fill","none").attr("stroke","#0b1526").attr("stroke-opacity",.85).attr("stroke-width",d=>sw(d)+2.5).attr("stroke-linecap","round").attr("vector-effect","non-scaling-stroke").style("pointer-events","none");
    s.append("g").selectAll("path").data(g.features).join("path").attr("class","ovl rt-"+l.k).attr("d",rp).attr("fill","none").attr("stroke",l.color).attr("stroke-width",sw).attr("stroke-linecap","round").attr("vector-effect","non-scaling-stroke").style("cursor","pointer").on("click",(e,d)=>show(d.properties,l)).append("title").text(d=>`${d.properties.from} → ${d.properties.to} (${d.properties.subtype})`);s.attr("transform",`translate(${OFF[l.k]})`);arrows(s,l.color);ends(s,g.features,l.color)});
   if(M.layers&&M.layers[l.k])M.layers[l.k].lower();
   const box=document.getElementById("layers"),lab=box.querySelector(`label[data-k="${l.k}"]`),hd=box.querySelector("b");
   if(lab){const ref=[...box.querySelectorAll("label")].find(x=>!L.some(y=>y.k===x.dataset.k));box.insertBefore(lab,ref||null);
    lab.querySelector(".dot").outerHTML=`<svg width="22" height="8" style="vertical-align:middle"><line x1="1" y1="4" x2="21" y2="4" stroke="${l.color}" stroke-width="3" stroke-linecap="round"/></svg>`}
   const subs=Object.keys(l.dash).filter(k=>g.features.some(f=>f.properties.subtype===k));
   notes.insertAdjacentHTML("beforeend",`<div data-k="${l.k}"><b style="color:${l.color}">${esc(l.label)}</b> (${g.features.length}). Click or hover a line for its type (${subs.join(", ")}). ${esc(g.notes.note)}${FN(g.notes.sources)}</div>`)});
  const mw=document.querySelector(".maptile .mapwrap");if(mw)mw.after(notes);
 }).catch(e=>console.warn("routes3:",e))}
start();})();
