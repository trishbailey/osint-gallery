const BRI_URL=window.BRI_DASHBOARD_URL||"../belt-and-road/";const BRI_SET=true;
const briHref=id=>BRI_URL+(id?"#p="+encodeURIComponent(id):"#region=africa");
const briLink=(t,cls,id)=>`<a class="${cls}" href="${briHref(id)}">${t}</a>`;
const COLORS={gold:"#B8860B",uranium:"#2E7D32",cobalt:"#1F4E9A",copper:"#B5502A",coltan:"#6B2D8C",tin:"#5D6D7E",tungsten:"#34495E",lithium:"#C2185B","rare-earths":"#00838F",graphite:"#111",manganese:"#8E44AD",bauxite:"#A04000",oil:"#000",gas:"#E67E22",water:"#1565C0",arable:"#558B2F"};
Promise.all([d3.json("data/ne_110m.geojson"),d3.json("data/brief.json"),d3.json("data/conflict_hex.geojson"),d3.json("data/media.json")]).then(([geo,B,HX,MD])=>{
 document.getElementById("dd").textContent=new Date(B.data_date+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
 const S={};B.sources.forEach(s=>S[s.id]=s);
 const W=900,H=820,svg=d3.select("#svg");
 const afr={type:"FeatureCollection",features:geo.features.filter(f=>f.properties.CONTINENT==="Africa")};
 const proj=d3.geoMercator().fitExtent([[20,20],[W-20,H-20]],afr),path=d3.geoPath(proj);
 const r2c={};B.regions.forEach(r=>r.countries.forEach(c=>r2c[c]=r));
 const cites=ids=>ids.map(i=>`<a class="cite" href="${S[i].url}" target="_blank" rel="noopener" title="${S[i].title}">${S[i].publisher}, ${S[i].date}</a>`).join(" ")||'<span class="muted">No source yet: not published</span>';
 const panel=h=>document.getElementById("panel").innerHTML=h;
 svg.append("g").selectAll("path").data(geo.features).join("path").attr("d",path)
  .attr("class",f=>f.properties.CONTINENT==="Africa"?"country":"other");
 const gC=svg.append("g");
 gC.selectAll("path").data(afr.features.filter(f=>r2c[f.properties.ADM0_A3])).join("path").attr("d",path).attr("class","conf")
  .on("click",(e,f)=>showR(r2c[f.properties.ADM0_A3])).append("title").text(f=>r2c[f.properties.ADM0_A3].name);
 const tbl=ls=>`<table class="lt"><tr><th>Backer</th><th>Backs</th><th>How</th><th>Gets in return</th><th>Confidence</th><th>Source</th></tr>${ls.map(l=>`<tr><td><b>${l.backer}</b></td><td>${l.actor}</td><td>${l.means.join(", ")}: ${l.actions}</td><td>${l.returns}</td><td>${l.confidence}</td><td>${cites(l.cites)}</td></tr>`).join("")}</table>`;
 const M=HX.meta,NOTE=`Shaded: ~${M.hex_km} km cells with ≥${M.threshold} conflict deaths (UCDP best estimate), ${M.period}. Source: ${M.source}. ${M.note}`;
 document.getElementById("mapnote").textContent=NOTE;
 const HC=["#F5A06E","#DC4F1A","#7F1A02"];
 const gH=gC.append("g");
 gH.selectAll("path").data(HX.features).join("path").attr("d",path).attr("class","hex").attr("fill",f=>HC[f.properties.step-1])
  .on("click",(e,f)=>{const c=afr.features.find(a=>d3.geoContains(a,d3.geoCentroid(f)));const r=c&&r2c[c.properties.ADM0_A3];if(r)showR(r,f);else panel(`<p class="eyebrow">Conflict cell</p><h3>${f.properties.country}</h3><p><b>${f.properties.deaths}</b> deaths in ${f.properties.events} events, ${M.period}.</p><p class="muted">${NOTE}</p>`);})
  .append("title").text(f=>`${f.properties.country}: ${f.properties.deaths} deaths, ${f.properties.events} events`);
 window._hexShare=HX.features.length;
 function showR(r,f){window._arcs&&_arcs.set(r.id);panel(`<p class="eyebrow">Conflict region</p><h3>${r.name}</h3>${f?`<p><b>This cell (${f.properties.country}):</b> ${f.properties.deaths} conflict deaths in ${f.properties.events} events.</p>`:""}<p class="muted">${NOTE}</p><p>${r.summary}</p><p>${cites(r.cites)}</p>`+
  (B.links.some(l=>l.region===r.id)?tbl(B.links.filter(l=>l.region===r.id)):"<p class=\"muted\">No foreign backing entries yet.</p>"));}
 const CAT=t=>["oil","gas","uranium"].includes(t)?"energy":t==="gold"?"gold":["water","arable"].includes(t)?"land":"battery";
 const CATS={energy:{c:"#212121",s:d3.symbolSquare,n:"Energy (oil, gas, uranium)"},gold:{c:"#D4A017",s:d3.symbolDiamond,n:"Gold"},battery:{c:"#1F5FA8",s:d3.symbolCircle,n:"Battery & critical minerals"},land:{c:"#2E7D32",s:d3.symbolStar,n:"Land & water"}};
 const KEY=new Set(["gold-sudan-rsf","gold-jebel-amer","gold-car-ndassima","gold-mali-refinery","gold-burkina-asm","gold-drc-east-asm","u-niger-somair","ta-drc","co-drc","oil-libya","oil-ssd-portsudan","oil-niger-benin","gas-mozambique","w-nile-gerd","land-sudan-gezira"]);
 const gR=svg.append("g");
 const resSel=gR.selectAll("path").data(B.resources).join("path").attr("class","res").attr("fill",d=>CATS[CAT(d.type)].c).attr("stroke","#fff").attr("stroke-width",1.5)
  .attr("d",d=>d3.symbol(CATS[CAT(d.type)].s,190)()).attr("transform",d=>`translate(${proj(d.lonlat)})`)
  .style("display",d=>KEY.has(d.id)?null:"none")
  .on("click",(e,d)=>panel(`<p class="eyebrow">Resource · ${CATS[CAT(d.type)].n} · <b>${d.type}</b></p><h3>${d.name}</h3><p><b>Mineral / resource:</b> ${d.type}</p><p><b>${d.quantity}</b> (${d.year||"n/a"}), world share ${d.world_share}</p><p><b>Controlled/operated by:</b> ${d.controller}</p><p><b>Conflict overlap:</b> ${d.conflict_region||"none in current regions"} · <b>Confidence:</b> ${d.confidence}</p>${d.note?`<p class="muted">${d.note}</p>`:""}<p>${cites(d.cites)}</p>`));
 resSel.append("title").text(d=>d.name+" ("+d.type+")");
 window._resCount=()=>resSel.nodes().filter(n=>n.style.display!=="none").length;
 const gB=svg.append("g");
 const placed=B.resources.filter(d=>KEY.has(d.id)).map(d=>proj(d.lonlat));
 (B.bri||[]).forEach(d=>{const [x,y]=proj(d.lonlat);for(const [ox,oy] of [[0,0],[0,24],[32,0],[0,-24],[-32,0],[32,24],[-32,24],[32,-24],[-32,-24],[0,48],[64,0]]){const px=x+ox,py=y+oy;
   if(!placed.some(([qx,qy])=>Math.abs(qx-px)<32&&Math.abs(qy-py)<24)){d._p=[px,py];d._o=[x,y];placed.push([px,py]);break;}}if(!d._p)d._p=[x,y];});
 gB.selectAll("line").data((B.bri||[]).filter(d=>d._o&&(d._p[0]!==d._o[0]||d._p[1]!==d._o[1]))).join("line").attr("x1",d=>d._o[0]).attr("y1",d=>d._o[1]).attr("x2",d=>d._p[0]).attr("y2",d=>d._p[1]).attr("stroke","#C62828").attr("stroke-width",1.2);
 const bri=gB.selectAll("g").data(B.bri||[]).join("g").attr("class","bri").attr("transform",d=>`translate(${d._p})`).style("cursor","pointer")
  .on("click",(e,d)=>panel(`<p class="eyebrow">China / Belt and Road · ${d.kind} · ${d.confidence}</p><h3>${d.name}</h3><p><b>${d.value}</b></p><p><b>Lender / builder:</b> ${d.lender_builder}</p><p><b>What China gets:</b> ${d.china_gets}</p><p><b>Host's case:</b> ${d.host_position}</p><p>${cites(d.cites)}</p><p class="bri-panel-link">${briLink("See this project in the global Belt and Road dashboard →","bri-inline",d.id)}</p>`));
 bri.append("rect").attr("x",-14).attr("y",-10).attr("width",28).attr("height",20).attr("rx",4).attr("fill","#fff").attr("stroke","#C62828").attr("stroke-width",2);
 bri.append("text").attr("class","cnb").attr("text-anchor","middle").attr("y",5).text("CN");
 bri.append("title").text(d=>d.name);

 const BC={Russia:"#C2185B",UAE:"#E65100",Turkey:"#00897B",Iran:"#6D4C41",Egypt:"#3949AB",US:"#1565C0",France:"#455A64",China:"#B71C1C",Rwanda:"#2E7D32"};
 const bk=l=>{const n=l.backer;return n.startsWith("United Arab")?"UAE":n.startsWith("United States")?"US":n.split(/[ (]/)[0];};
 const gF=svg.append("g"),cl=([x,y])=>[Math.max(14,Math.min(W-14,x)),Math.max(14,Math.min(H-14,y))];
 const fan={};B.links.forEach(l=>{const k=bk(l)+l.region;fan[k]=(fan[k]||0);l._i=fan[k]++;});
 const arcSel=gF.selectAll("path").data(B.links).join("path").attr("class","arc2")
  .attr("stroke",l=>BC[bk(l)]||"#06707B").attr("stroke-dasharray",l=>l.means.includes("withdrawal")?"5 4":null)
  .attr("d",l=>{const a=cl(proj(l.backer_lonlat)),b=proj(l.target_lonlat),dx=b[0]-a[0],dy=b[1]-a[1],k=0.08;
    return `M${a}Q${(a[0]+b[0])/2-dy*k},${(a[1]+b[1])/2+dx*k} ${b}`;})
  .on("click",(e,l)=>{const r=B.regions.find(r=>r.id===l.region);r?showR(r):panel(tbl([l]));})
 arcSel.append("title").text(l=>l.backer+" → "+l.actor);
 let showAll=false,active=null;
 const paint=()=>arcSel.style("display",l=>showAll||l.region===active?null:"none").attr("stroke-opacity",l=>active&&l.region===active?0.95:0.7);
 window._arcs={set:r=>{active=r;paint();},all:v=>{showAll=v;paint();}};
 const gBL=svg.append("g"),seen=new Set();
 B.links.forEach(l=>{const k=bk(l);if(seen.has(k))return;seen.add(k);const a=cl(proj(l.backer_lonlat));
  const OFF={Turkey:[-10,18,"end"],Russia:[10,18,"start"],Rwanda:[44,-30,"start"],Egypt:[10,-10,"start"]},o=OFF[k]||[a[0]>W/2?-8:8,18,a[0]>W/2?"end":"start"];
  gBL.append("circle").attr("cx",a[0]).attr("cy",a[1]).attr("r",5).attr("fill",BC[k]||"#06707B").attr("stroke","#fff");
  if(k==="Rwanda")gBL.append("line").attr("x1",a[0]).attr("y1",a[1]).attr("x2",a[0]+o[0]+2).attr("y2",a[1]+o[1]+3).attr("stroke",BC[k]).attr("stroke-width",1.5);
  gBL.append("text").attr("class","blabel").attr("x",a[0]+o[0]).attr("y",a[1]+o[1]).attr("text-anchor",o[2]).attr("fill",BC[k]||"#06707B").text(l.backer.split(" (")[0].replace("United Arab Emirates","UAE"));});
 const gL=svg.append("g");gL.selectAll("text").data(B.regions).join("text").attr("class","rlabel").attr("text-anchor","middle")
  .attr("x",r=>proj(r.label)[0]).attr("y",r=>proj(r.label)[1]).text(r=>r.name)
  .each(function(r){const pts=[...B.resources,...(B.bri||[])].map(d=>proj(d.lonlat)),[x,y]=proj(r.label),w=this.getComputedTextLength()/2+8;
   for(const dy of [0,-18,18,-32,32,-46,46]){if(!pts.some(([px,py])=>Math.abs(px-x)<w&&py>y+dy-22&&py<y+dy+10)){d3.select(this).attr("y",y+dy);break;}}});
 gC.selectAll("path.conf").on("mouseenter",(e,f)=>{if(!showAll)_arcs.set(r2c[f.properties.ADM0_A3].id);});

 const labs=[...gL.selectAll("text").nodes(),...gBL.selectAll("text").nodes()];
 const boxes=labs.map(t=>{const b=t.getBBox();return {x:b.x-4,y:b.y-2,w:b.width+8,h:b.height+4,t};});
 const gTop=svg.append("g").attr("class","toplabels");
 boxes.forEach(b=>{gTop.append("rect").attr("x",b.x).attr("y",b.y).attr("width",b.w).attr("height",b.h).attr("rx",b.h/2).attr("fill","#fff").attr("fill-opacity",1);gTop.node().appendChild(b.t.cloneNode(true));});
 gL.style("display","none");gBL.selectAll("text").style("display","none");
 window._check=()=>{const tops=[...gTop.selectAll("text").nodes()];const miss=tops.filter(t=>{const p=t.previousSibling;if(!p||p.tagName!=="rect")return true;const r=p.getBBox(),b=t.getBBox();return !(r.x<=b.x&&r.y<=b.y&&r.x+r.width>=b.x+b.width&&r.y+r.height>=b.y+b.height&&p.getAttribute("fill")==="#fff");}).map(t=>t.textContent);
   return {labels:tops.length,withBackground:tops.length-miss.length,missing:miss,minFontPx:Math.min(...tops.map(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a))};};
 const lg=svg.append("g").attr("class","legend").attr("transform","translate(24,600)");
 lg.append("rect").attr("x",-10).attr("y",-26).attr("width",330).attr("height",222).attr("rx",4).attr("fill","#fff").attr("stroke","#c3ccd5");
 let y=0;const head=t=>{lg.append("text").attr("class","lh").attr("y",y).text(t);y+=22;},item=(draw,t)=>{const g=lg.append("g").attr("transform",`translate(8,${y})`);draw(g);g.append("text").attr("x",26).text(t);y+=21;};
 head("Conflict deaths, 12 months (UCDP)");[["25–99",0],["100–499",1],["500+",2]].forEach(([t,i])=>item(g=>g.append("rect").attr("width",16).attr("height",13).attr("y",-11).attr("fill",HC[i]),t+" deaths per ~"+M.hex_km+" km cell"));
 head("Resources");Object.values(CATS).forEach(c=>item(g=>g.append("path").attr("d",d3.symbol(c.s,120)()).attr("transform","translate(8,-5)").attr("fill",c.c),c.n));
 head("Outside powers");item(g=>{g.append("line").attr("x1",0).attr("x2",18).attr("y1",-5).attr("y2",-5).attr("stroke","#C2185B").attr("stroke-width",3);},"Backer line (colour per power)");
 item(g=>g.append("line").attr("x1",0).attr("x2",18).attr("y1",-5).attr("y2",-5).attr("stroke","#455A64").attr("stroke-width",3).attr("stroke-dasharray","4 3"),"Withdrawal");
 head("China / Belt and Road");item(g=>{g.append("rect").attr("x",-6).attr("y",-16).attr("width",26).attr("height",19).attr("rx",3).attr("fill","#fff").attr("stroke","#C62828").attr("stroke-width",2);g.append("text").attr("class","cnb").attr("x",9).attr("y",-2).attr("text-anchor","middle").style("font-size","13px").text("CN");},"Port, rail, base, loan or stake");
 {const g=lg.append("g").attr("transform",`translate(8,${y+2})`);const host=BRI_SET?g.append("a").attr("href",briHref()):g;const t=host.append("text").attr("class","lg-link").style("font-weight","700").style("fill","#06707B").style("font-size","14px").text("More on China worldwide →");if(!BRI_SET)g.append("text").attr("class","lg-soon").style("fill","#33475B").style("font-style","italic").attr("x",t.node().getComputedTextLength()+8).text("(coming soon)");y+=23;}
 lg.attr("transform",`translate(24,${H-y-30})`);lg.select("rect").attr("height",y+18);
 [["L-conf",gC],["L-res",gR],["L-for",gF],["L-for",gBL],["L-bri",gB]].forEach(([id,g])=>document.getElementById(id).addEventListener("change",e=>g.style("display",e.target.checked?null:"none")));
 document.getElementById("L-allres").onchange=e=>resSel.style("display",d=>e.target.checked||KEY.has(d.id)?null:"none");
 document.getElementById("L-all").onchange=e=>_arcs.all(e.target.checked);
 const SEC=[["who","Who's who"],["drivers","Drivers"],["money","Money flows"],["case","Each side's own case"],["avs","Actions vs statements"]];
 const LN={en:"EN",fr:"FR",pt:"PT",ar:"AR",ru:"RU",sw:"SW",ha:"HA",so:"SO",am:"AM",ti:"TI",rw:"RW",rn:"RN",es:"ES"};
 const isState=s=>/^(yes|de facto)/i.test(s||"");
 const fmt=ts=>new Date(ts*1000).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"America/New_York"});
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const newsHtml=rid=>{const it=MD.news[rid]||[],xp=MD.x.filter(p=>p.region===rid);return `<div class="news"><h4>Latest news</h4>${it.length?`<ul>${it.map(n=>`<li><span class="badge lang">${LN[n.lang]||n.lang.toUpperCase()}</span>${isState(n.state)?'<span class="badge state">State media</span>':""} <b>${esc(n.outlet_name)}</b> · ${fmt(n.ts)}<br><a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title_en||n.title)}</a>${n.title_en?`<br><span class="orig" lang="${n.lang}">Original: ${esc(n.title)}</span>`:""}</li>`).join("")}</ul>`:'<p class="muted">No matching items in this fetch.</p>'}
  ${xp.length?`<h4>On X</h4><ul>${xp.map(p=>`<li><span class="badge lang">${LN[p.lang]}</span>${p.state?'<span class="badge state">State media ('+p.state+')</span>':""} <b>@${esc(p.handle)}</b> · ${new Date(p.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"America/New_York"})}<br><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.text_en||p.text)}</a>${p.text_en?`<br><span class="orig">Original: ${esc(p.text)}</span>`:""}</li>`).join("")}</ul>`:""}</div>`;};
 document.getElementById("rlist").innerHTML=B.regions.map(r=>{const ex=(B.explainers||{})[r.id]||{};const all=new Set(r.cites);SEC.forEach(([k])=>(ex[k]||[]).forEach(i=>i.c.forEach(c=>all.add(c))));
  return `<article class="card region" id="r-${r.id}"><h3>${r.name}</h3><p class="lead2">${r.summary}</p><div class="exgrid"><div>${SEC.map(([k,t])=>`<h4>${t}</h4>${(ex[k]||[]).length?`<ul>${ex[k].map(i=>`<li>${i.t} ${cites(i.c)}</li>`).join("")}</ul>`:'<p class="muted">No sourced entry yet.</p>'}`).join("")}
  <h4>Sources</h4><p class="srcs">${cites([...all].filter(i=>S[i]))}</p></div>${newsHtml(r.id)}</div></article>`;}).join("");
 function sankey(id,flows){const sv=d3.select("#"+id),W=1060,Hh=+sv.attr("viewBox").split(" ")[3];const cols={};flows.forEach(f=>{cols[f.from]??=0;cols[f.to]=Math.max(cols[f.to]??0,(cols[f.from]??0)+1);});
  const col=n=>cols[n];const nodes=[...new Set(flows.flatMap(f=>[f.from,f.to]))];const ncol=d3.max(nodes,col)+1;
  const val=n=>Math.max(d3.sum(flows.filter(f=>f.from===n),f=>f.t),d3.sum(flows.filter(f=>f.to===n),f=>f.t));
  const gap=14,usable=Hh-30;const per=d3.range(ncol).map(c=>nodes.filter(n=>col(n)===c));
  const k=d3.min(per,ns=>(usable-gap*(ns.length-1))/d3.sum(ns,n=>Math.max(val(n),1)));const minH=4;
  const pos={};per.forEach((ns,c)=>{let y=15;ns.forEach(n=>{const h=Math.max(val(n)*k,minH);pos[n]={x:40+c*((W-300)/(Math.max(ncol-1,1))),y,h,o:0,i:0};y+=h+gap;});});
  flows.forEach((f,j)=>{const a=pos[f.from],b=pos[f.to],w=Math.max(f.t*k,3);const y0=a.y+a.o+w/2,y1=b.y+b.i+w/2;a.o+=w;b.i+=w;
   sv.append("path").attr("d",`M${a.x+12},${y0}C${(a.x+b.x)/2},${y0} ${(a.x+b.x)/2},${y1} ${b.x},${y1}`).attr("fill","none").attr("stroke",f.to==="Switzerland"?"#06707B":"#D4A017").attr("stroke-opacity",.55).attr("stroke-width",w).append("title").text(`${f.from} → ${f.to}: ${f.t.toLocaleString()} t (${f.year}), ${S[f.cite].publisher}`);});
  nodes.forEach(n=>{const p=pos[n];sv.append("rect").attr("x",p.x).attr("y",p.y).attr("width",12).attr("height",p.h).attr("fill","#11273C");
   const out=flows.filter(f=>f.from===n);const lab=col(n)===0?`${n}: ${out.map(f=>f.t.toLocaleString()+" t ("+f.year+")").join(", ")}`:n;
   sv.append("text").attr("class","sklabel").attr("x",col(n)===0?p.x-6:p.x+18).attr("y",p.y+p.h/2+5).attr("text-anchor",col(n)===0?"end":"start").text(lab);});
  const cw=sv.node().getBoundingClientRect().width;sv.attr("viewBox",`0 0 ${W} ${Hh}`);sv.selectAll("text.sklabel").style("font-size","15px");
   const L=sv.selectAll("text.sklabel").nodes().filter(t=>t.getAttribute("text-anchor")==="end");const kk=(d3.max(L,t=>t.getBBox().width)||0)/15;
   const a=15*kk/cw, xs=(a*W+12)/(1-a-12/cw);sv.attr("viewBox",`${-xs} 0 ${W+xs} ${Hh}`);sv.selectAll("text.sklabel").style("font-size",(15*(W+xs)/cw)+"px");
  document.getElementById(id+"-notes").innerHTML=flows.map(f=>`<span>${f.from} → ${f.to}: <b>${f.t.toLocaleString()} t</b>, ${f.year}. ${cites([f.cite])}</span>`).join("");}
 sankey("sk-gold",B.sankey.gold);sankey("sk-battery",B.sankey.battery);
 window._sankeyFlows=B.sankey.gold.length+B.sankey.battery.length;
 document.getElementById("brisec").innerHTML=`<aside class="bri-cta"><div><p class="eyebrow">Beacon global dashboard</p><h3>China's role in Africa and beyond</h3><p>The Belt and Road dashboard tracks China's loans, ports, railways, bases and mining stakes worldwide, so these Africa projects can be read against the rest of the network.</p></div>${briLink("Explore the Belt and Road dashboard →","bri-btn")}</aside><p>Fourteen China-linked projects sit in or near the conflict regions on this map: railways, ports, Africa's first Chinese military base, mining stakes and state loans. China's state lenders have lent to 49 African governments since 2000. Each row below shows what China built or lent, what it gets in return and how the host government presents the deal. ${cites(["bu-cla-2024","bu-cla-db"].filter(i=>S[i]))}</p>
  <div class="tscroll"><table class="lt"><tr><th>Project</th><th>Type</th><th>Country</th><th>What China built or lent</th><th>What China gets</th><th>Host's case</th><th>Confidence</th><th>Sources</th></tr>${B.bri.map(b=>`<tr><td><b>${b.name}</b></td><td>${b.kind}</td><td>${b.country}</td><td>${b.value}. ${b.lender_builder}</td><td>${b.china_gets}</td><td>${b.host_position}</td><td>${b.confidence}</td><td>${cites(b.cites)}</td></tr>`).join("")}</table></div>`;
 const own=MD.ownership,fs=own.filter(o=>o.foreign_state),dom=own.filter(o=>!o.foreign_state);
 const orow=o=>`<tr><td><b>${esc(o.name)}</b></td><td>${esc(o.country)}</td><td>${esc(o.owner)}</td><td>${esc(o.ownership_type)}</td><td>${esc(o.political_ties||"")}</td><td>${isState(o.state_media)?'<span class="badge state">State media</span>':""}</td><td>${o.verified?'<span class="badge ok">Verified</span>':'<span class="badge unv">Unverified</span>'}</td><td>${(o.ownership_source||"").split(/\s*;\s*/).filter(u=>u.startsWith("http")).map((u,i)=>`<a class="cite" href="${esc(u)}" target="_blank" rel="noopener">source ${i+1}</a>`).join(" ")}</td></tr>`;
 const OH='<tr><th>Outlet</th><th>Base</th><th>Owner</th><th>Type</th><th>Political ties</th><th>State</th><th>Status</th><th>Ownership sources</th></tr>';
 document.getElementById("mediasec").innerHTML=`<p>Who owns an outlet shapes what it covers. State media are used here as each government's own narrative, never as confirmation of facts. A row is <b>Verified</b> only when we opened its ownership sources; <b>Unverified</b> rows rely on reference listings and are shown for context.</p>
  <h3>Foreign-state media active in Africa</h3><div class="tscroll"><table class="lt">${OH}${fs.map(orow).join("")}</table></div>
  <h3>Key African and international outlets (verified ownership)</h3><div class="tscroll"><table class="lt">${OH}${dom.map(orow).join("")}</table></div>`;
 document.getElementById("methodsec").innerHTML=`<ul><li><b>Conflict shading:</b> ${NOTE}</li><li><b>Resources, backers and Belt and Road:</b> every entry cites at least one source; confidence is "documented", "credible allegation" or "reported". The "position" field gives each party's own case.</li><li><b>Region explainers:</b> short sourced points; descriptive only, no forecasts or recommendations. Sections without a sourced entry are marked.</li>
  <li><b>Latest news:</b> fetched ${MD.fetched} from ${MD.feeds_ok} of ${MD.feeds_total} working RSS feeds in the source list; items matched to a region by place and actor names in the headline, newest first, one per outlet and at most two state-media items per region. Non-English headlines were machine-translated locally with the open-source NLLB-200 model (facebook/nllb-200-distilled-600M); originals are shown. No .cn sites are fetched.</li>
  <li><b>X posts:</b> one recent-search read of the free X API covering ten accounts from the source list; a handful of relevant posts selected by hand.</li><li><b>Money flows:</b> only published figures; gold flows use UAE trade data for 2024 reported by SWISSAID (UN Comtrade, since withdrawn from Comtrade) and Swiss imports Jan-Sep 2025.</li><li><b>Sources:</b> ${B.sources.length} sources in total.</li></ul>`;
 showR(B.regions.find(r=>r.id==="great-lakes"));
});
