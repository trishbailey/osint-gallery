// Belt and Road v1.2. Cross-link to the Africa Brief.
const MOB=window.matchMedia("(max-width:430px)").matches; // real phone layout
const AFRICA_BRIEF_URL="../africa-brief/";
// Five display groups (legend <= 5). Marker palette min CIEDE2000 pair dE checked by _src/palette_check.py and _src/check_page.py.
const GRP={port:"port",railway:"railway",mine:"mine","military base":"military",loan:"other",infrastructure:"other"};
const COL={port:"#2EC4D6",railway:"#7C8CFF",mine:"#E8C24A",military:"#FF5A57",other:"#6FD36A"};
const SYM={port:d3.symbolCircle,railway:d3.symbolSquare,mine:d3.symbolTriangle,military:d3.symbolStar,other:d3.symbolDiamond};
const TLAB={port:"Ports",railway:"Railways",mine:"Mines and refineries",military:"Military and spy sites",other:"Loans, roads, power and other"};
const DEF_ON=MOB?["port","railway","mine","military","other"]:["port","railway","military"]; // phones cluster markers, so every type can start on // simpler default view: the core layer only
const LAND="#1b2c4a",HOST="#a0508a",HL="#9a6f2e",BUB="#7d4aa8"; // mid-tone fills (Trish 2026-10-26): land, project-site area (pink), highlighted country (amber), region bubble (purple); every pair dE >= 20
const MW=960,MH=window.innerWidth<700?560:540,MS=window.innerWidth<700?2.1:1,TS=window.innerWidth<700?2.7:1; // TS keeps map text >= 13px on phones // taller map and bigger symbols on phones
const REG={all:"All regions",africa:"Africa","south-asia":"South Asia","southeast-asia":"Southeast Asia","central-asia":"Central Asia","middle-east":"Middle East",europe:"Europe and the Balkans",pacific:"Pacific Islands","south-america":"South America","central-america-caribbean":"Central America and Caribbean"};
const AGG=new Set(["bri-loans","bri-loans-top"]);
const BEIJING=[116.4,39.9];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch(_){return u}};
const symSvg=(g,sz=16)=>`<svg width="${sz}" height="${sz}" viewBox="-9 -9 18 18" aria-hidden="true"><path d="${d3.symbol(SYM[g],110)()}" fill="${COL[g]}" stroke="#0b1526" stroke-width="1"/></svg>`;
Promise.all([d3.json("data/bri.json"),d3.json("data/ne_110m.geojson")]).then(([D,W])=>{
 document.getElementById("dd").textContent=D.data_date;
 const GL=D.glossary||{},ISO=D.iso||{};
 const FULL={UAE:"United Arab Emirates","DR Congo":"Democratic Republic of the Congo","Angola (top)":"Angola"};
 const flag=(c,cls="fl")=>ISO[c]?`<img class="${cls}" src="vendor/flags/${ISO[c]}.svg" alt="" title="${esc(FULL[c]||c)}" width="20" height="15">`:"";
 const flags=country=>country.split(" / ").map(c=>flag(c)).join("");
 const acr=Object.keys(GL).filter(k=>/^[A-Z]/.test(k)).sort((a,b)=>b.length-a.length);
 // Spell out every acronym on first use within one block of text.
 function gl(t,seen){t=esc(t);for(const a of acr){const re=new RegExp("(^|[^A-Za-z0-9])("+a.replace(/[&-]/g,"\\$&")+")(?![A-Za-z])");const m=t.match(re);if(!m||seen.has(a))continue;seen.add(a);const ex=GL[a];
   if(t.toLowerCase().includes(ex.toLowerCase().split(",")[0].replace(/^the /,"")))continue;
   t=t.replace(re,(_,p,w)=>`${p}<abbr title="${esc(ex)}">${w}</abbr> (${esc(ex)})`)}return t}
 const E=D.entries.map(e=>({...e,g:GRP[e.type]||"other"})),byId=new Map(E.map(e=>[e.id,e]));
 const mapbox=d3.select(".mapbox"),tip=mapbox.append("div").attr("class","tip").style("display","none");
 const svg=d3.select("#map"),proj=d3.geoNaturalEarth1().fitSize([MW,MH],W),path=d3.geoPath(proj);
 const defs=svg.append("defs");
 Object.entries(COL).forEach(([g,c])=>defs.append("marker").attr("id","ar-"+g).attr("viewBox","0 0 10 10").attr("refX",9).attr("refY",5).attr("markerWidth",5).attr("markerHeight",5).attr("orient","auto")
   .append("path").attr("d","M0,0L10,5L0,10z").attr("fill",c).attr("stroke","#0b1526").attr("stroke-width",1));
 const root=svg.append("g");
 const nm=f=>f.properties.NAME||f.properties.name||f.properties.ADMIN||"";
 const AL={"United Arab Emirates":"UAE","Dem. Rep. Congo":"DR Congo","Democratic Republic of the Congo":"DR Congo","Bosnia and Herz.":"Bosnia and Herzegovina","Solomon Is.":"Solomon Islands","Antigua and Barb.":"Antigua and Barbuda","Dominican Rep.":"Dominican Republic","Macedonia":"North Macedonia","Lao PDR":"Laos"};
 const cn=f=>AL[nm(f)]||nm(f);
 const landSel=root.append("g").selectAll("path").data(W.features).join("path").attr("class","land").attr("d",path).attr("fill",LAND)
   .on("mouseenter mousemove",(ev,f)=>{if(!f.__host)return;showTip(ev,`<b>${esc(nm(f))}</b><span>${f.__host} project${f.__host>1?"s":""} in this view</span>`)}).on("mouseleave",()=>tip.style("display","none"));
 let rot=0;function setRot(r){if(r===rot)return;rot=r;proj.rotate([r,0]);landSel.attr("d",path);lines.selectAll("path").attr("d",path);g.selectAll(".mk").attr("transform",d=>`translate(${proj([d.lon,d.lat])})`);halo.selectAll("circle").attr("transform",d=>`translate(${proj([d.lon,d.lat])})`);locLand.attr("d",path)}
 const bub=root.append("g").attr("class","bubbles"),halo=root.append("g").attr("class","halos"),lines=root.append("g").attr("class","lines"),lg=root.append("g").attr("class","labels"),g=root.append("g");let k=1;
 const sizeAll=()=>{bub.selectAll("circle").attr("r",d=>(9+3.2*Math.sqrt(d.n))*MS/k).attr("stroke-width",2*MS/k);bub.selectAll("text").attr("font-size",d=>(d.lab?14:15)*TS/k).attr("stroke-width",4*TS/k).each(function(d){const t=d3.select(this);if(!d.lab){t.attr("dy","0.35em").attr("x",0).attr("y",0);return}const R=(9+3.2*Math.sqrt(d.n))*MS/k+6*TS/k;
   t.attr("text-anchor",{n:"middle",s:"middle",e:"start",w:"end"}[d.lp]).attr("x",d.lp==="e"?R:d.lp==="w"?-R:0).attr("y",d.lp==="n"?-R:d.lp==="s"?R:0).attr("dy",d.lp==="s"?"0.8em":d.lp==="n"?"-0.1em":"0.35em")});halo.selectAll("circle").attr("r",13*MS/k);g.selectAll(".mk").attr("d",d=>d3.symbol(SYM[d.g],150*MS*MS/(k*k))());lg.selectAll("text").attr("font-size",14*MS/k).attr("stroke-width",4*MS/k);lines.selectAll("path").attr("stroke-width",function(){return (this.classList.contains("case")?7:4)*MS/k})};
 const zoom=d3.zoom().scaleExtent([1,14]).on("zoom",ev=>{const was=clustered();k=ev.transform.k;if(was!==clustered()&&window._ready)renderMarks();root.attr("transform",ev.transform);sizeAll();locView(ev.transform)});
 svg.attr("viewBox",`0 0 ${MW} ${MH}`).call(zoom);
 function showTip(ev,h){const r=mapbox.node().getBoundingClientRect();tip.style("display","block").style("left",Math.min(ev.clientX-r.left+14,r.width-270)+"px").style("top",(ev.clientY-r.top+10)+"px").html(h)}
 // Fixed bubble anchors per region (lon, lat) and label side, so bubbles and names never overlap.
 const ANC={europe:[[14,50],"n"],"central-asia":[[70,47],"n"],"middle-east":[[42,25],"w"],africa:[[20,2],"s"],"south-asia":[[79,18],"s"],"southeast-asia":[[110,8],"e"],pacific:[[168,-14],"w"],"south-america":[[-60,-16],"s"],"central-america-caribbean":[[-82,17],"n"]};
 let VALL=[],region="all",cur=null,lastFocus=null,q="",VIS=[];const clustered=()=>region==="all"&&k<2.2;const on=new Set(DEF_ON),conf=new Set(["high","medium","low"]);
 const rf=d3.select("#regions");
 Object.entries(REG).forEach(([r,lab])=>{const n=r==="all"?E.length:E.filter(e=>e.region===r).length;
  rf.append("button").attr("type","button").attr("data-r",r).html(`<span>${lab}</span><span class="n">${n}</span>`).on("click",()=>{location.hash="region="+r})});
 const sIn=document.getElementById("q");sIn.addEventListener("input",()=>{q=sIn.value.trim().toLowerCase();draw()});
 const lgd=d3.select("#legend");
 Object.keys(COL).forEach(t=>{lgd.append("button").attr("type","button").attr("data-t",t).attr("aria-pressed",on.has(t)).html(`${symSvg(t,14)}<span>${TLAB[t]}</span>`)
   .on("click",function(){on.has(t)?on.delete(t):on.add(t);this.setAttribute("aria-pressed",on.has(t));draw()})});
 const cf=d3.select("#conf");
 [["high","High"],["medium","Medium"],["low","Low"]].forEach(([c,l])=>cf.append("button").attr("type","button").attr("aria-pressed","true").html(`<span class="dot ${c}"></span><span>${l}</span>`)
   .on("click",function(){conf.has(c)?conf.delete(c):conf.add(c);this.setAttribute("aria-pressed",conf.has(c));draw()}));
 document.getElementById("key").innerHTML=`<li>${flag("China")}<span>China (lender, builder or owner)</span></li><li><span class="sw" style="background:${HOST};border-radius:50%"></span><span>Project site</span></li><li><span class="sw" style="background:${HL}"></span><span>Country named in the text you point at</span></li><li><span class="sw ln"></span><span>Link to Beijing (on hover)</span></li>`;
 // Highlight a named place: its country fill and its project markers.
 function hlC(c,id){landSel.style("fill",f=>c&&cn(f)===c?HL:LAND).classed("hl",f=>!!c&&cn(f)===c);g.selectAll(".mk").classed("hlm",d=>!!id&&d.id===id)}
 window._hl=hlC;if(window.innerWidth<860)document.getElementById("filters").open=false;
 document.addEventListener("mouseover",ev=>{const t=ev.target.closest("[data-c]");if(t)hlC(t.dataset.c,t.dataset.id)});
 document.addEventListener("mouseout",ev=>{const t=ev.target.closest("[data-c]");if(t&&!t.contains(ev.relatedTarget))hlC(null)});
 document.addEventListener("focusin",ev=>{const t=ev.target.closest("[data-c]");if(t)hlC(t.dataset.c,t.dataset.id)});
 document.addEventListener("click",ev=>{const t=ev.target.closest(".place");if(t){ev.preventDefault();hlC(t.dataset.c);const f=W.features.find(f=>cn(f)===t.dataset.c);if(f){const[[a,b],[c2,d]]=path.bounds(f),s=Math.min(8,0.6/Math.max((c2-a)/MW,(d-b)/MH));svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity.translate(MW/2-s*(a+c2)/2,MH/2-s*(b+d)/2).scale(s))}}});
 // Locator inset: the whole world with the current map view outlined.
 const loc=d3.select("#loc").attr("viewBox",`0 0 ${MW} ${MH}`),locLand=loc.append("g").selectAll("path").data(W.features).join("path").attr("d",path).attr("class","lland");
 {const bs=W.features.map(f=>path.bounds(f)),x0=d3.min(bs,b=>b[0][0]),y0=d3.min(bs,b=>b[0][1]),x1=d3.max(bs,b=>b[1][0]),y1=d3.max(bs,b=>b[1][1]);loc.attr("viewBox",`${x0} ${y0} ${x1-x0} ${y1-y0}`)}
 const locBox=loc.append("rect").attr("class","lbox");
 function locDraw(){locLand.classed("lreg",f=>(f.__host||0)>0)}
 function locView(t){const x0=Math.max(0,-t.x/t.k),y0=Math.max(0,-t.y/t.k),x1=Math.min(MW,(MW-t.x)/t.k),y1=Math.min(MH,(MH-t.y)/t.k);locBox.attr("x",x0).attr("y",y0).attr("width",Math.max(8,x1-x0)).attr("height",Math.max(8,y1-y0))}
 locView(d3.zoomIdentity);
 function zoomTo(lonlat,s){const[x,y]=proj(lonlat);svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(MW/2-s*x,MH/2-s*y).scale(s))}
 function zoomRegion(){if(region==="all"){svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity);return}
  const xs=E.filter(e=>e.region===region&&!AGG.has(e.id)).map(e=>proj([e.lon,e.lat]));
  const [x0,x1]=d3.extent(xs,p=>p[0]),[y0,y1]=d3.extent(xs,p=>p[1]),s=Math.min(8,0.85/Math.max((x1-x0+60)/MW,(y1-y0+60)/MH));
  svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(MW/2-s*(x0+x1)/2,MH/2-s*(y0+y1)/2).scale(s))}
 const sum=e=>{let t=e.value.split(/; |\. /)[0];if(t.length>110)t=t.slice(0,t.lastIndexOf(" ",105))+" …";return t};
 const card=e=>`<button type="button" class="pcard" data-id="${esc(e.id)}" data-c="${esc(e.country.split(" / ")[0])}" aria-label="Open details: ${esc(e.name)}"><span class="pn">${symSvg(e.g,16)}<b>${gl(e.name,new Set())}</b></span><span class="sum">${gl(sum(e),new Set())}</span><span class="cc">${flags(e.country)}<span>${esc(e.country)}</span><span class="pill ${e.confidence}">${e.confidence} confidence</span></span></button>`;
 function openPanel(e){cur=e;g.selectAll(".mk").classed("sel",d=>d===e);const seen=new Set();
  const notes=e.sources.map((u,i)=>`<a href="#n-${i+1}" class="fn" data-n="${i+1}" aria-label="Source ${i+1}">${i+1}</a>`).join(",");
  const val=gl(e.value,seen),lw=val.lastIndexOf(" ");
  const link=location.origin+location.pathname+"#p="+e.id;
  const PL=t=>{for(const c of e.country.split(" / ")){if(c.length<3)continue;let done=false;const re=new RegExp("(^|[^A-Za-z])("+c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")(?![A-Za-z])");t=t.split(/(<[^>]*>)/).map(x=>{if(done||x.startsWith("<")||!re.test(x))return x;done=true;return x.replace(re,(_,p,w)=>`${p}<a href="#" class="place" data-c="${esc(c)}">${w}</a>`)}).join("")}return t};
  document.getElementById("pbody").innerHTML=`<p class="ct">${symSvg(e.g,14)} ${esc(TLAB[e.g])} · ${REG[e.region]}</p><h2 id="ptitle">${gl(e.name,seen)}</h2><p class="cc">${flags(e.country)}${flag("China")} ${e.country.split(" / ").map(c=>`<a href="#" class="place" data-c="${esc(c)}" title="Show ${esc(FULL[c]||c)} on the map">${esc(FULL[c]||c)}</a>`).join(" / ")}</p><span class="pill ${e.confidence}">${e.confidence} confidence</span>
  <dl><dt>Scale</dt><dd>${val.slice(0,lw+1)}<span class="nw">${val.slice(lw+1)}<sup>${notes}</sup></span></dd><dt>Lender or builder</dt><dd>${PL(gl(e.backer,seen))}</dd><dt>What China gets</dt><dd>${PL(gl(e.china_gets,seen))}</dd>
  <dt>Host country's case</dt><dd>${PL(gl(e.host_case,seen))}</dd>${e.confidence_reason?`<dt>Why this confidence</dt><dd>${gl(e.confidence_reason,seen)}</dd>`:""}
  <dt>Map</dt><dd><button type="button" class="showmap" id="showmap">Show on map</button></dd><dt>Link to this project</dt><dd><a href="#p=${esc(e.id)}">${esc(link)}</a></dd></dl>
  ${e.region==="africa"?`<p><a class="xlink" href="${AFRICA_BRIEF_URL}">Read the Africa Brief &rarr;</a></p>`:""}
  <details class="srcs" id="srcs"><summary>Sources (${e.sources.length})</summary><ol>${e.sources.map((u,i)=>`<li id="n-${i+1}"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a></li>`).join("")}</ol></details>`;
  document.getElementById("showmap").onclick=()=>{closePanel();if(AGG.has(e.id))return;cur=e;zoomTo([e.lon,e.lat],5);document.querySelector(".mapbox").scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>{renderMarks();showLine(e)},750)};
  document.querySelectorAll("#pbody .fn").forEach(a=>a.addEventListener("click",ev=>{ev.preventDefault();const s=document.getElementById("srcs");s.open=true;document.getElementById("n-"+a.dataset.n).scrollIntoView({block:"nearest"})}));
  const p=document.getElementById("panel");lastFocus=lastFocus||document.activeElement;p.classList.add("open");p.setAttribute("aria-hidden","false");document.getElementById("scrim").hidden=false;document.getElementById("close").focus()}
 function closePanel(){const p=document.getElementById("panel");if(!p.classList.contains("open"))return;p.classList.remove("open");p.setAttribute("aria-hidden","true");document.getElementById("scrim").hidden=true;cur=null;g.selectAll(".mk").classed("sel",false);
  history.replaceState(null,"","#region="+region);if(lastFocus&&lastFocus.focus)lastFocus.focus();lastFocus=null}
 document.getElementById("close").onclick=closePanel;document.getElementById("scrim").onclick=closePanel;
 document.addEventListener("keydown",ev=>{if(ev.key==="Escape")closePanel()});
 document.addEventListener("click",ev=>{const b=ev.target.closest(".pcard");if(b){lastFocus=b;location.hash="p="+b.dataset.id}});
 // Hover-only link line from Beijing to the project, in the marker's colour over a dark casing.
 function showLine(d){const ls={type:"LineString",coordinates:[BEIJING,[d.lon,d.lat]]};
  lines.selectAll("path").data([["case",ls],["ln",ls]]).join("path").attr("class",x=>x[0]).attr("d",x=>path(x[1])).attr("fill","none")
   .attr("stroke",x=>x[0]==="case"?"#0b1526":COL[d.g]).attr("marker-end",x=>x[0]==="ln"?`url(#ar-${d.g})`:null);sizeAll()}
 const hideLine=()=>lines.selectAll("path").remove();
 function draw(){tip.style("display","none");hideLine();const inR=e=>region==="all"||e.region===region;
  const qm=e=>!q||[e.name,e.country,e.backer,e.kind,e.value].join(" ").toLowerCase().includes(q);
  const all0=E.filter(e=>inR(e)&&!AGG.has(e.id)&&conf.has(e.confidence)&&qm(e)),all=MOB?all0.filter(e=>on.has(e.g)):all0,v=all0.filter(e=>on.has(e.g));VIS=v;VALL=all;
  document.getElementById("title").textContent=region==="all"?"China's Belt and Road projects":"China's Belt and Road projects: "+REG[region];
  const cs=new Set(all.flatMap(e=>e.country.split(" / ")));
  const st=region==="all"?[[all.length,"projects"],[cs.size,"host countries"],[Object.keys(REG).length-1,"regions"]]:[[all.length,"projects"],[cs.size,"host countries"],[all.filter(e=>e.g==="port").length,"ports"]];
  document.getElementById("stats").innerHTML=st.map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join("");
  const cnt=d3.rollup(all.flatMap(e=>e.country.split(" / ")),x=>x.length,x=>x);
  landSel.each(f=>{f.__host=cnt.get(cn(f))||0}).style("fill",LAND).classed("hosted",f=>!!f.__host);hlC(null);
  locDraw();renderMarks();
  rf.selectAll("button").classed("on",function(){return this.dataset.r===region}).attr("aria-pressed",function(){return this.dataset.r===region});
  document.getElementById("ctitle").textContent=`Projects: ${REG[region]} (${all.length})`;
  // Collapsible groups: by region on the world view, by country inside a region.
  const gk=e=>region==="all"?e.region:e.country.split(" / ")[0];
  const keep=new Set([...document.querySelectorAll("details.grp[open]")].map(d=>d.dataset.g)),sameR=window._lastR===region;window._lastR=region;
  const grp=d3.sort(d3.groups(all,gk),x=>-x[1].length),openN=!MOB&&region!=="all"?3:0;
  document.getElementById("pcards").innerHTML=grp.map(([kk,xs])=>`<details class="grp" data-g="${esc(kk)}"${(sameR?keep.has(kk):grp.findIndex(x=>x[0]===kk)<openN)?" open":""}><summary>${region==="all"?"":flag(kk)}<span class="gname">${esc(region==="all"?REG[kk]:(FULL[kk]||kk))}</span><span class="gtypes">${Object.keys(COL).filter(t=>xs.some(e=>e.g===t)).map(t=>symSvg(t,13)).join("")}</span><span class="n">${xs.length}</span></summary><div class="cards">${d3.sort(xs,e=>e.name).map(card).join("")}</div></details>`).join("")||'<p class="muted">No projects match these filters.</p>';
  msum(all);
  const ag=E.filter(e=>AGG.has(e.id)&&inR(e));document.getElementById("agg").hidden=!ag.length;document.getElementById("aggcards").innerHTML=ag.map(card).join("")}
 function renderMarks(){const v=VIS,cl=clustered();
  // World view: one bubble per region with its project count; zoom in or tap a bubble to see each project.
  const bd=cl?Object.keys(ANC).map(r=>{const xs=(MOB?v:VALL).filter(e=>e.region===r);return {r,n:xs.length,p:proj(ANC[r][0]),lp:ANC[r][1]}}).filter(d=>d.n):[];
  bub.selectAll("g.bb").data(bd,d=>d.r).join(en=>{const x=en.append("g").attr("class","bb").attr("tabindex",0).attr("role","button");x.append("circle");x.append("text").attr("class","bn");x.append("text").attr("class","bl");return x})
   .attr("transform",d=>`translate(${d.p})`).attr("aria-label",d=>`${REG[d.r]}: ${d.n} projects. Show this region`)
   .on("click",(ev,d)=>{location.hash="region="+d.r}).on("keydown",(ev,d)=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();location.hash="region="+d.r}})
   .on("mouseenter mousemove",(ev,d)=>{if(!MOB)showTip(ev,`<b>${REG[d.r]}</b><span>${d.n} projects · click to zoom in</span>`)}).on("mouseleave",()=>tip.style("display","none"))
   .each(function(d){const x=d3.select(this);x.select("circle").datum(d).attr("fill",BUB).attr("stroke","#c8a24a");x.select(".bn").datum({n:d.n}).attr("text-anchor","middle").text(d.n);x.select(".bl").datum({n:d.n,lab:1,lp:d.lp}).attr("text-anchor","middle").text(MOB?"":REG[d.r])});
  const mv=cl?[]:v;
  halo.selectAll("circle").data(mv,d=>d.id).join("circle").attr("class","site").attr("fill",HOST).attr("transform",d=>`translate(${proj([d.lon,d.lat])})`);
  g.selectAll(".mk").data(mv,d=>d.id).join("path").attr("class","mk").attr("fill",d=>COL[d.g]).classed("sel",d=>d===cur)
   .attr("transform",d=>`translate(${proj([d.lon,d.lat])})`).attr("tabindex",0).attr("role","button").attr("aria-label",d=>`${d.name}, ${d.country}, ${TLAB[d.g]}`)
   .on("click",(ev,d)=>{lastFocus=ev.currentTarget;location.hash="p="+d.id}).on("keydown",(ev,d)=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();lastFocus=ev.currentTarget;location.hash="p="+d.id}})
   .on("mouseenter mousemove focus",(ev,d)=>{if(MOB)return;showLine(d);showTip(ev.clientX!==undefined?ev:{clientX:0,clientY:0},`<b>${gl(d.name,new Set())}</b><span>${flags(d.country)} ${esc(FULL[d.country]||d.country)} · ${TLAB[d.g]} · click for details</span>`)}).on("mouseleave blur",()=>{if(MOB)return;tip.style("display","none");hideLine()});
  // Permanent labels: none on the bubble view (bubbles carry the region names); countries with 3+ projects in a region view on desktop only.
  const lab=cl||MOB?[]:d3.rollups(v.filter(e=>!e.country.includes("/")),vs=>({n:vs.length,p:proj([d3.mean(vs,e=>e.lon),d3.mean(vs,e=>e.lat)])}),e=>e.country).filter(d=>d[1].n>=3).map(d=>[d[0],d[1].p]);
  lg.selectAll("text").data(lab,d=>d[0]).join("text").attr("class","clab").attr("x",d=>d[1][0]).attr("y",d=>d[1][1]).attr("dy","-0.8em").attr("text-anchor","middle").text(d=>d[0]);
  sizeAll()}
 // Phone summary: totals by region and by type; tapping one filters the page.
 function msum(all){if(!MOB)return;const rs=d3.sort(Object.keys(REG).filter(r=>r!=="all").map(r=>[r,E.filter(e=>e.region===r&&!AGG.has(e.id)).length]),x=>-x[1]),mx=d3.max(rs,x=>x[1]);
  document.getElementById("mreg").innerHTML=`<button type="button" class="rbar${region==="all"?" on":""}" data-r="all" aria-pressed="${region==="all"}"><span class="rl">All regions</span><span class="n">${E.filter(e=>!AGG.has(e.id)).length}</span></button>`+rs.map(([r,n])=>`<button type="button" class="rbar${region===r?" on":""}" data-r="${r}" aria-pressed="${region===r}"><span class="rl">${REG[r]}</span><span class="bar"><i style="width:${(100*n/mx).toFixed(0)}%"></i></span><span class="n">${n}</span></button>`).join("");
  const base=E.filter(e=>(region==="all"||e.region===region)&&!AGG.has(e.id));
  document.getElementById("mtype").innerHTML=Object.keys(COL).map(t=>`<button type="button" class="tchip" data-t="${t}" aria-pressed="${on.has(t)&&on.size<5}">${symSvg(t,16)}<span>${TLAB[t]}</span><span class="n">${base.filter(e=>e.g===t).length}</span></button>`).join("");
  document.getElementById("fcount").textContent=(on.size<5||conf.size<3||q)?" (on)":""}
 if(MOB){document.body.classList.add("mob");
  document.getElementById("mreg").addEventListener("click",ev=>{const b=ev.target.closest("[data-r]");if(b)location.hash="region="+b.dataset.r});
  document.getElementById("mtype").addEventListener("click",ev=>{const b=ev.target.closest("[data-t]");if(!b)return;const t=b.dataset.t;const only=on.size===1&&on.has(t);on.clear();(only?Object.keys(COL):[t]).forEach(x=>on.add(x));lgd.selectAll("button").attr("aria-pressed",function(){return on.has(this.dataset.t)});draw()});
  const sh=document.getElementById("fsheet");["search","legend","conf","key","locw"].forEach(id=>{const n=document.getElementById(id);const h=n.previousElementSibling&&n.previousElementSibling.matches("h2.sh")?n.previousElementSibling:null;if(h)sh.querySelector(".fbody").appendChild(h);sh.querySelector(".fbody").appendChild(n)});
  const wnn=document.getElementById("whatsnew");wnn.open=false;document.getElementById("msum").after(wnn);
  const openS=o=>{sh.classList.toggle("open",o);sh.setAttribute("aria-hidden",!o);document.getElementById("fbtn").setAttribute("aria-expanded",o);if(o)document.getElementById("fdone").focus()};
  document.getElementById("fbtn").onclick=()=>openS(true);document.getElementById("fdone").onclick=()=>openS(false);window._sheet=openS}
 const wn=D.whats_new||[];
 document.getElementById("wnlist").innerHTML=wn.map(w=>{const e=w.id&&byId.get(w.id),dt=new Date(w.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
  if(e)return `<li><time datetime="${w.date}">${dt}</time><button type="button" class="pcard wn" data-id="${esc(e.id)}" data-c="${esc(e.country.split(" / ")[0])}">${flags(e.country)}<span>${gl(w.text,new Set())}</span></button></li>`;
  const n=E.filter(x=>x.region===w.region).length;return `<li><time datetime="${w.date}">${dt}</time><a class="wnr" href="#region=${esc(w.region)}">New region: ${esc(REG[w.region]||w.region)} (${n} projects) &rarr;</a></li>`}).join("");
 function route(){const h=new URLSearchParams(location.hash.slice(1)),p=h.get("p"),r=h.get("region");
  if(p&&byId.has(p)){const e=byId.get(p);const nr=e.region;const ch=nr!==region;region=nr;if(!on.has(e.g)){on.add(e.g);lgd.select(`[data-t="${e.g}"]`).attr("aria-pressed",true)}setRot(region==="pacific"?-160:0);draw();if(AGG.has(e.id)){if(ch)zoomRegion()}else zoomTo([e.lon,e.lat],5);openPanel(e);if(MOB)showLine(e);return}
  region=REG[r]?r:"all";setRot(region==="pacific"?-160:0);closePanel();draw();zoomRegion()}
 window.addEventListener("hashchange",route);route();window._ready=true;
});
