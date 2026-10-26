const BRI_URL=window.BRI_DASHBOARD_URL||"../belt-and-road/";
const briHref=id=>BRI_URL+(id?"#p="+encodeURIComponent(id):"#region=africa");
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const COLORS={hex:["#FFD180","#FF6D00","#880E4F"]};
const BC={Russia:"#FF80FF",UAE:"#FFE272",Turkey:"#00FFE5",Iran:"#00FF00",Egypt:"#CC7A00",US:"#00CBFF",France:"#5B72CC",China:"#E52249",Rwanda:"#FF8E72"};
const FLAG=(sel,w)=>{w=w||20;const h=w*2/3;sel.append("rect").attr("x",-w/2-3).attr("y",-h/2-3).attr("width",w+6).attr("height",h+6).attr("fill","transparent");sel.append("use").attr("href","#cnflag").attr("x",-w/2).attr("y",-h/2).attr("width",w).attr("height",h);};
const SHEET="https://docs.google.com/spreadsheets/d/1fCulxY6AJ0br-O5hstRmIP9Lfco4-CMjYdHpH3Q7hTc/edit";
const BEIJING=[116.4,39.9];
const RU_REGION={mali:"sahel",burkina:"sahel",niger:"sahel",car:"car",libya:"north",sudan:"sudan"};
const GROUP_OF=k=>({"g-jnim":"jnim","g-jnim-cw":"jnim","g-issp":"issp","g-iswap":"iswap","g-shabaab":"shabaab","g-issom":"is","g-ism":"is"})[k];
const J=u=>d3.json(u).catch(()=>null);
Promise.all([J("data/ne_110m.geojson"),J("data/brief.json"),J("data/conflict_hex.geojson"),J("data/media.json"),J("data/stories.json"),J("data/ucdp_monthly.json")]).then(([geo,B,HX,MD,ST,UC])=>{
 document.getElementById("dd").textContent=new Date(B.data_date+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
 const S={};B.sources.forEach(s=>S[s.id]=s);
 /* ---------- endnotes: numbered in order of first appearance, reused for repeats ---------- */
 const FN=new Map(),FNL=[];
 const num=id=>{if(!FN.has(id)){FN.set(id,FNL.length+1);FNL.push(id);}return FN.get(id);};
 const fn=ids=>{ids=[...new Set((ids||[]).filter(i=>S[i]))];if(!ids.length)return "";return `<sup class="fn">${ids.map(i=>num(i)).sort((a,b)=>a-b).map(n=>`<a href="#src-${n}" aria-label="Source ${n}">${n}</a>`).join(",")}</sup>`;};
 const fnNums=ids=>[...new Set(ids.filter(i=>S[i]).map(num))].sort((a,b)=>a-b).join(",");
 const urlSrc=(url,title,pub)=>{const id="u:"+url;if(!S[id])S[id]={id,title,publisher:pub,date:"",url};return id;};
 const renderSources=()=>{document.getElementById("srclist").innerHTML=FNL.map((id,i)=>{const s=S[id];return `<li id="src-${i+1}"><b>${esc(s.publisher)}</b>, “${esc(s.title)}”${s.date?", "+esc(s.date):""}. <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></li>`;}).join("");};
 const prose=(t,rid)=>esc(t).replace(/\{\{([^|}]+)\|([^}]+)\}\}/g,(m,k,x)=>`<span class="pl" tabindex="0" data-r="${rid||""}" data-k="${k}">${x}</span>`).replace(/\s*\[\[([^\]]+)\]\]/g,(m,ids)=>fn(ids.split(",").map(s=>s.trim())));
 /* ---------- main map ---------- */
 const W=900,H=820,svg=d3.select("#svg");
 const afr={type:"FeatureCollection",features:geo.features.filter(f=>f.properties.CONTINENT==="Africa")};
 const proj=d3.geoMercator().fitExtent([[20,20],[W-20,H-20]],afr),path=d3.geoPath(proj);
 const r2c={};B.regions.forEach(r=>r.countries.forEach(c=>r2c[c]=r));
 const panel=h=>{document.getElementById("panel").innerHTML=h;renderSources();};
 const Z=svg.append("g");
 Z.append("rect").attr("class","sea").attr("x",-2000).attr("y",-2000).attr("width",5000).attr("height",5000);
 Z.append("g").selectAll("path").data(geo.features).join("path").attr("d",path).attr("class",f=>f.properties.CONTINENT==="Africa"?"country":"other");
 const gC=Z.append("g");
 gC.selectAll("path").data(afr.features.filter(f=>r2c[f.properties.ADM0_A3])).join("path").attr("d",path).attr("class","conf")
  .on("click",(e,f)=>openRegion(r2c[f.properties.ADM0_A3])).append("title").text(f=>r2c[f.properties.ADM0_A3].name+": click to zoom and open the section");
 const M=HX.meta,NOTE=`Shaded: about ${M.hex_km} km cells with at least ${M.threshold} conflict deaths (UCDP best estimate), ${M.period}. Source: ${M.source}. ${M.note}`;
 document.getElementById("mapnote").textContent=NOTE;
 const HC=COLORS.hex,gH=gC.append("g");
 gH.selectAll("path").data(HX.features).join("path").attr("d",path).attr("class","hex").attr("fill",f=>HC[f.properties.step-1])
  .on("click",(e,f)=>{const c=afr.features.find(a=>d3.geoContains(a,d3.geoCentroid(f)));const r=c&&r2c[c.properties.ADM0_A3];if(r)openRegion(r,f);else panel(`<p class="eyebrow">Conflict cell</p><h3>${esc(f.properties.country)}</h3><p><b>${f.properties.deaths}</b> deaths in ${f.properties.events} events, ${M.period}.</p>`);})
  .append("title").text(f=>`${f.properties.country}: ${f.properties.deaths} deaths, ${f.properties.events} events`);
 const tbl=ls=>`<h4>Outside backers</h4>${ls.map(l=>`<div class="bk" style="border-left-color:${BC[bk(l)]||"#FF80FF"}"><b>${esc(l.backer)}</b> → ${esc(l.actor)} <span class="badge st-${/document/i.test(l.confidence)?"documented":/alleg/i.test(l.confidence)?"alleged":"reported"}">${esc(l.confidence)}</span><br><span class="muted">${esc(l.means.join(", "))}</span><p>${esc(l.actions)}${fn(l.cites)}</p><p><b>Gets in return:</b> ${esc(l.returns)}</p>${l.position?`<p><b>Its own case:</b> ${esc(l.position)}</p>`:""}</div>`).join("")}`;
 function showR(r,f){_arcs.set(r.id);panel(`<p class="eyebrow">Conflict region</p><h3>${esc(r.name)}</h3>${f?`<p><b>This cell (${esc(f.properties.country)}):</b> ${f.properties.deaths} conflict deaths in ${f.properties.events} events.</p>`:""}<p>${esc(r.summary)}${fn(r.cites)}</p><p><a href="#r-${r.id}">Read the region section ↓</a> · <a href="#news" data-nf="${r.id}">News storylines ↓</a></p>`+
  (B.links.some(l=>l.region===r.id)?tbl(B.links.filter(l=>l.region===r.id)):"<p class=\"muted\">No outside-backer entries yet.</p>"));}
 const CAT=t=>["oil","gas","uranium"].includes(t)?"energy":t==="gold"?"gold":["water","arable"].includes(t)?"land":"battery";
 const CATS={energy:{c:"#AA00FF",s:d3.symbolSquare,n:"Energy (oil, gas, uranium)"},gold:{c:"#FFD600",s:d3.symbolDiamond,n:"Gold"},battery:{c:"#00B0FF",s:d3.symbolCircle,n:"Battery and critical minerals"},land:{c:"#AEEA00",s:d3.symbolStar,n:"Land and water"}};
 const KEY=new Set(["gold-sudan-rsf","gold-jebel-amer","gold-car-ndassima","gold-mali-refinery","gold-burkina-asm","gold-drc-east-asm","u-niger-somair","ta-drc","co-drc","oil-libya","oil-ssd-portsudan","oil-niger-benin","gas-mozambique","w-nile-gerd","land-sudan-gezira"]);
 const resPanel=d=>panel(`<p class="eyebrow">Resource · ${CATS[CAT(d.type)].n}</p><h3>${esc(d.name)}</h3><p><b>Resource:</b> ${esc(d.type)}</p><p><b>${esc(d.quantity)}</b> (${d.year||"n/a"}), world share ${esc(d.world_share)}${fn(d.cites)}</p><p><b>Controlled or operated by:</b> ${esc(d.controller)}</p><p><b>Conflict overlap:</b> ${esc(d.conflict_region||"none in current regions")} · <b>Confidence:</b> ${esc(d.confidence)}</p>${d.note?`<p class="muted">${esc(d.note)}</p>`:""}`);
 const gR=Z.append("g");
 const resSel=gR.selectAll("path").data(B.resources).join("path").attr("class","res").attr("fill",d=>CATS[CAT(d.type)].c)
  .attr("d",d=>d3.symbol(CATS[CAT(d.type)].s,190)()).attr("transform",d=>`translate(${proj(d.lonlat)})`)
  .style("display",d=>KEY.has(d.id)?null:"none").on("click",(e,d)=>resPanel(d));
 resSel.append("title").text(d=>d.name+" ("+d.type+")");
 window._resCount=()=>resSel.nodes().filter(n=>n.style.display!=="none").length;
 /* outside backers: straight lines */
 const bk=l=>{const n=l.backer;return n.startsWith("United Arab")?"UAE":n.startsWith("United States")?"US":n.split(/[ (]/)[0];};
 const gF=Z.append("g"),cl=([x,y])=>[Math.max(14,Math.min(W-14,x)),Math.max(14,Math.min(H-14,y))];
 const arcSel=gF.selectAll("path").data(B.links).join("path").attr("class","arc2")
  .attr("stroke",l=>BC[bk(l)]||"#FF80FF").attr("stroke-dasharray",l=>l.means.includes("withdrawal")?"5 4":null)
  .attr("d",l=>`M${cl(proj(l.backer_lonlat))}L${proj(l.target_lonlat)}`)
  .on("click",(e,l)=>{const r=B.regions.find(r=>r.id===l.region);r?showR(r):panel(tbl([l]));});
 arcSel.append("title").text(l=>`${l.backer} → ${l.actor} [${fnNums(l.cites)}]`);
 let showAll=false,active=null;
 const paint=()=>arcSel.style("display",l=>showAll||l.region===active?null:"none").attr("stroke-opacity",l=>active&&l.region===active?0.95:0.75);
 window._arcs={set:r=>{active=r;paint();},all:v=>{showAll=v;paint();}};
 /* China: straight lines from Beijing to each BRI marker (hover) */
 const BJ=cl(proj(BEIJING)),gB=Z.append("g"),gCN=gB.append("g");
 const placed=B.resources.filter(d=>KEY.has(d.id)).map(d=>proj(d.lonlat));
 (B.bri||[]).forEach(d=>{const [x,y]=proj(d.lonlat);for(const [ox,oy] of [[0,0],[0,24],[46,0],[0,-24],[-46,0],[46,24],[-46,24],[46,-24],[-46,-24],[0,48],[92,0]]){const px=x+ox,py=y+oy;
   if(!placed.some(([qx,qy])=>Math.abs(qx-px)<46&&Math.abs(qy-py)<24)){d._p=[px,py];d._o=[x,y];placed.push([px,py]);break;}}if(!d._p){d._p=[x,y];d._o=[x,y];}});
 const cnl=gCN.selectAll("line").data(B.bri).join("line").attr("class","cnline").attr("x1",BJ[0]).attr("y1",BJ[1]).attr("x2",d=>d._p[0]).attr("y2",d=>d._p[1]);
 gB.selectAll("line.lead").data(B.bri.filter(d=>d._p[0]!==d._o[0]||d._p[1]!==d._o[1])).join("line").attr("class","lead").attr("x1",d=>d._o[0]).attr("y1",d=>d._o[1]).attr("x2",d=>d._p[0]).attr("y2",d=>d._p[1]).attr("stroke","#EF5350").attr("stroke-width",1.2);
 const cnOn=d=>cnl.classed("on",x=>d===true||x===d);
 const briPanel=d=>panel(`<p class="eyebrow">China Belt &amp; Road project · ${esc(d.kind)} · ${esc(d.confidence)}</p><h3>${esc(d.name)}</h3><p><b>${esc(d.value)}</b>${fn(d.cites)}</p><p><b>Lender or builder:</b> ${esc(d.lender_builder)}</p><p><b>What China gets:</b> ${esc(d.china_gets)}</p><p><b>Host's case:</b> ${esc(d.host_position)}</p><p><a class="bri-inline" href="${briHref(d.id)}">See this project in the Belt and Road dashboard →</a></p>`);
 const bri=gB.selectAll("g.bri").data(B.bri).join("g").attr("class","bri").attr("transform",d=>`translate(${d._p})`).style("cursor","pointer")
  .on("mouseenter",(e,d)=>cnOn(d)).on("mouseleave",()=>cnOn(null)).on("click",(e,d)=>{if(e.metaKey||e.ctrlKey){location.href=briHref(d.id);return;}briPanel(d);});
 bri.each(function(){FLAG(d3.select(this),20);});
 bri.append("title").text(d=>`China – Belt & Road: ${d.name}, click for the Belt and Road dashboard`);
 /* backer labels */
 const gBL=Z.append("g"),seen=new Set(),labs=[];
 B.links.forEach(l=>{const k=bk(l);if(seen.has(k))return;seen.add(k);const a=cl(proj(l.backer_lonlat));
  const OFF={Turkey:[-10,18,"end"],Russia:[10,18,"start"],Rwanda:[44,-30,"start"],Egypt:[10,-10,"start"]},o=OFF[k]||[a[0]>W/2?-8:8,18,a[0]>W/2?"end":"start"];
  gBL.append("circle").attr("cx",a[0]).attr("cy",a[1]).attr("r",5).attr("fill",BC[k]||"#FF80FF").attr("stroke","#0b1526");
  if(k==="Rwanda")gBL.append("line").attr("x1",a[0]).attr("y1",a[1]).attr("x2",a[0]+o[0]+2).attr("y2",a[1]+o[1]+3).attr("stroke",BC[k]).attr("stroke-width",1.5);
  labs.push({x:a[0]+o[0],y:a[1]+o[1],a:o[2],t:l.backer.split(" (")[0],c:"#e6e9ef",cls:"blabel",china:k==="China"});});
 if(!seen.has("China")){gBL.append("circle").attr("cx",BJ[0]).attr("cy",BJ[1]).attr("r",5).attr("fill",BC.China).attr("stroke","#0b1526");labs.push({x:BJ[0]-8,y:BJ[1]+18,a:"end",t:"China (Beijing)",c:"#e6e9ef",cls:"blabel",china:true});}
 /* Russia alignment markers (toggle) */
 const gRU=Z.append("g").style("display","none");
 const ruPanel=r=>panel(ruCard(r));
 const rum=gRU.selectAll("g").data(B.russia).join("g").attr("class","rumark").attr("transform",r=>`translate(${proj(r.ll)})`).on("click",(e,r)=>ruPanel(r));
 rum.append("path").attr("d",d3.symbol(d3.symbolTriangle,190)());
 rum.append("title").text(r=>`Russia in ${r.theatre}: backs ${r.backs}. Fights ${r.fights.map(f=>f.n).join(", ")} [${fnNums(r.cites)}]`);
 /* A7 activity (toggle): country outlines + category marker */
 const A7=B.a7||{cats:{},countries:[]},A7S={partner:d3.symbolSquare,office:d3.symbolCircle,outreach:d3.symbolDiamond,refinery:d3.symbolStar};
 const gA7=Z.append("g").attr("class","a7lay").style("display","none");
 const a7Panel=c=>panel(`<p class="eyebrow">A7 payments network · ${esc(A7.cats[c.cat].n)}</p><h3>${esc(c.name)}</h3><p>${esc(c.t)}${fn(c.cites)}</p><p><a href="#flows">A7 gold route and sanctions ↓</a></p>`);
 A7.countries.forEach(c=>{const f=afr.features.find(x=>x.properties.ADM0_A3===c.iso);if(!f)return;const col=A7.cats[c.cat].c;
  const g=gA7.append("g").style("cursor","pointer").on("click",()=>a7Panel(c));
  g.append("path").attr("d",path(f)).attr("fill","none").attr("stroke",col).attr("stroke-width",3.5);
  const [x,y]=path.centroid(f);c._xy=[x,y];g.append("path").attr("class","a7m").attr("d",d3.symbol(A7S[c.cat],200)()).attr("transform",`translate(${x},${y})`).attr("fill",col).attr("stroke","#0b1526").attr("stroke-width",1.5);
  g.append("title").text(`A7 in ${c.name}: ${A7.cats[c.cat].n} [${fnNums(c.cites)}]`);});
 /* region labels with collision nudging, then all labels on dark pills */
 B.regions.forEach(r=>{const pts=[...B.resources,...(B.bri||[])].map(d=>proj(d.lonlat)),[x,y]=proj(r.label),w=r.name.length*4.3+8;let yy=y;
  for(const dy of [0,-18,18,-32,32,-46,46]){if(!pts.some(([px,py])=>Math.abs(px-x)<w&&py>y+dy-22&&py<y+dy+10)){yy=y+dy;break;}}labs.push({x,y:yy,a:"middle",t:r.name,c:"#e6e9ef",cls:"rlabel"});});
 const gTop=Z.append("g").attr("class","toplabels");
 labs.forEach(L=>{const g=gTop.append("g");const rc=g.append("rect");const t=g.append("text").attr("class",L.cls).attr("x",L.x).attr("y",L.y).attr("text-anchor",L.a).attr("fill",L.c).text(L.t);
  const b=t.node().getBBox();rc.attr("x",b.x-5).attr("y",b.y-2).attr("width",b.width+10).attr("height",b.height+4).attr("rx",(b.height+4)/2);
  if(L.china)g.style("cursor","pointer").style("pointer-events","all").on("mouseenter",()=>cnOn(true)).on("mouseleave",()=>cnOn(null)).append("title").text("China: hover to show lines to its Belt & Road projects");});
 /* legend */
 const LS=d3.select("#legsvg"),lg=LS.append("g").attr("class","legend").attr("transform","translate(14,26)");
 let y=0,cx=0,cy=0,my=0,col=0;const COLW=440;
 const head=t=>{if(y>0){my=Math.max(my,y);col++;if(col%2===0){cy+=my+16;my=0;cx=0;}else cx+=COLW;y=0;}lg.append("text").attr("class","lh").attr("x",cx).attr("y",cy+y).text(t);y+=21;},item=(draw,t)=>{const g=lg.append("g").attr("transform",`translate(${cx+8},${cy+y})`);draw(g);g.append("text").attr("x",30).text(t);y+=20;};
 head("Conflict deaths, last 12 months (Uppsala Conflict Data Program)");[["25–99",0],["100–499",1],["500 or more",2]].forEach(([t,i])=>item(g=>g.append("rect").attr("width",16).attr("height",13).attr("y",-11).attr("fill",HC[i]),t+" deaths per "+M.hex_km+" km cell"));
 head("Resources");Object.values(CATS).forEach(c=>item(g=>g.append("path").attr("d",d3.symbol(c.s,120)()).attr("transform","translate(8,-5)").attr("fill",c.c),c.n));
 head("Outside powers");item(g=>g.append("line").attr("x1",0).attr("x2",20).attr("y1",-5).attr("y2",-5).attr("stroke",BC.Russia).attr("stroke-width",3),"Backer line (colour per power)");
 item(g=>g.append("line").attr("x1",0).attr("x2",20).attr("y1",-5).attr("y2",-5).attr("stroke",BC.France).attr("stroke-width",3).attr("stroke-dasharray","4 3"),"Withdrawal");
 item(g=>g.append("path").attr("d",d3.symbol(d3.symbolTriangle,110)()).attr("transform","translate(8,-5)").attr("fill","#FF80FF"),"Russia alignment (layer, click for details)");
 {const g=lg.append("g").attr("transform",`translate(${cx+8},${cy+y})`);const f=g.append("g").attr("transform","translate(10,-5)");FLAG(f,20);g.append("text").attr("x",30).text("China Belt and Road project");y+=22;}
 {const a=lg.append("a").attr("href",briHref());a.append("text").attr("x",cx+8).attr("y",cy+y+2).text("Belt and Road dashboard →");y+=22;}
 head("A7 payments network (layer)");Object.entries(A7.cats).forEach(([k,c])=>item(g=>g.append("path").attr("d",d3.symbol(A7S[k],110)()).attr("transform","translate(8,-5)").attr("fill",c.c),c.n));
 my=Math.max(my,y);LS.attr("viewBox",`0 0 900 ${cy+my+30}`);
 [["L-conf",gC],["L-res",gR],["L-for",gF],["L-for",gBL],["L-bri",gB],["L-ru",gRU],["L-a7",gA7]].forEach(([id,g])=>document.getElementById(id).addEventListener("change",e=>g.style("display",e.target.checked?null:"none")));
 document.getElementById("L-allres").onchange=e=>resSel.style("display",d=>e.target.checked||KEY.has(d.id)?null:"none");
 document.getElementById("L-all").onchange=e=>{_arcs.all(e.target.checked);};
 /* zoom to region */
 const zoom=d3.zoom().scaleExtent([1,6]).on("zoom",e=>{const k=e.transform.k;Z.attr("transform",e.transform);resSel.attr("transform",d=>`translate(${proj(d.lonlat)}) scale(${1/k})`);bri.attr("transform",d=>`translate(${d._p}) scale(${1/k})`);rum.attr("transform",r=>`translate(${proj(r.ll)}) scale(${1/k})`);gBL.selectAll("circle").attr("r",5/k);gTop.selectAll("text").style("font-size",(14/e.transform.k)+"px");gTop.selectAll("rect").each(function(){const t=this.nextSibling,b=t.getBBox();d3.select(this).attr("x",b.x-5/e.transform.k).attr("y",b.y-2/e.transform.k).attr("width",b.width+10/e.transform.k).attr("height",b.height+4/e.transform.k).attr("rx",(b.height+4/e.transform.k)/2);});});
 svg.call(zoom).on("wheel.zoom",null).on("dblclick.zoom",null);
 const rb=document.getElementById("reset");rb.onclick=()=>{svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity);rb.classList.remove("show");};
 function openRegion(r,f){const fc={type:"FeatureCollection",features:afr.features.filter(x=>r.countries.includes(x.properties.ADM0_A3))};
  const [[x0,y0],[x1,y1]]=path.bounds(fc),k=Math.min(4,0.8/Math.max((x1-x0)/W,(y1-y0)/H));
  svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));rb.classList.add("show");
  showR(r,f);const d=document.getElementById("r-"+r.id);if(d)d.open=true;setNews(r.id);}
 window._openRegion=id=>openRegion(B.regions.find(r=>r.id===id));
 /* ---------- Russia card ---------- */
 const G=B.groups||{};
 const desBadges=g=>g&&G[g]?Object.entries(G[g].des||{}).filter(([k,v])=>v).map(([k,v])=>`<span class="badge des" title="${esc(k)}: ${esc(v)}">${esc(k)}</span>`).join(""):"";
 const gTip=g=>{const x=G[g];if(!x)return "";const par=x.parent&&G[x.parent]?` · part of ${G[x.parent].name}${G[G[x.parent].parent]?" → "+G[G[x.parent].parent].name:""}`:"";return `${x.full}${par}. Founded ${x.founded}. Area: ${x.area}. Designations: ${Object.entries(x.des||{}).map(([k,v])=>k+" "+v).join(", ")} [${fnNums(x.cites)}]`;};
 const ruCard=r=>`<p class="eyebrow">Russia alignment · <span class="badge st-${r.status}">${r.status}</span></p><h3>${esc(r.theatre)}</h3><p><b>Russian vehicle:</b> ${esc(r.vehicle)}</p><p><b>Backs:</b> ${esc(r.backs)}${fn(r.backs_cites)}</p><p><b>Fights:</b> ${r.fights.map(f=>`<span title="${esc(gTip(f.g))}">${esc(f.n)}</span> ${desBadges(f.g)}`).join(" · ")}</p><p><b>Backers of the other side:</b> ${r.opp_backers.length?r.opp_backers.map(o=>`${esc(o.n)} <span class="badge st-${o.status}">${o.status}</span>${fn(o.cites)}`).join("; "):"none documented"}</p><p><b>Each side's case:</b> ${esc(r.steelman)}${fn(r.cites)}</p>`;
 showR(B.regions.find(r=>r.id==="great-lakes"));
 /* ---------- region sections ---------- */
 const PL=B.places||{},UCM=UC?UC.months:[];
 const mname=m=>new Date(m+"-15T12:00:00Z").toLocaleDateString("en-GB",{month:"short",year:"numeric",timeZone:"UTC"});
 const SLs=(ST&&ST.storylines)||[];
 document.getElementById("rlist").innerHTML=B.regions.map(r=>{const ex=(B.explainers||{})[r.id]||{paras:[]};
  const gs=[...new Set((PL[r.id]||[]).map(p=>GROUP_OF(p.k)).filter(Boolean))];
  const ru=B.russia.filter(x=>RU_REGION[x.id]===r.id);
  const tot=UC&&UC.series[r.id]?d3.sum(UC.series[r.id]):null;
  return `<details class="tile region" id="r-${r.id}"><summary><h2>${esc(r.name)}</h2><span class="muted">${esc(r.summary)}${tot!=null?` · ${tot.toLocaleString()} conflict deaths, ${mname(UCM[0])}–${mname(UCM.at(-1))}`:""}</span></summary>
  <div class="rgrid"><div class="prose"><p class="bottom"><b>Bottom line:</b> ${prose(ex.bottom||r.summary,r.id)}</p>${ex.paras.map((p,i)=>`<p data-i="${i}">${prose(p.t,r.id)}</p>`).join("")}
  ${gs.length?`<h4>Armed groups named here</h4><div class="groups">${gs.map(g=>{const x=G[g];return `<div class="grp"><b>${esc(x.name)}</b> ${desBadges(g)}<br>${esc(x.full)}${x.parent&&G[x.parent]?`. Part of ${esc(G[x.parent].name)}`:""}. Founded ${esc(x.founded)}. ${esc(x.area)}.${fn(x.cites)}</div>`;}).join("")}</div>`:""}
  ${ru.length?`<h4>Russia here</h4>${ru.map(x=>`<p>${esc(x.theatre)}: Russia backs ${esc(x.backs.charAt(0).toLowerCase()+x.backs.slice(1))}${fn(x.backs_cites)} <a href="#russia">Russia section ↓</a></p>`).join("")}`:""}
  ${SLs.some(s=>s.region===r.id)?`<h4>Storylines</h4><p>${SLs.filter(s=>s.region===r.id).map(s=>`<a href="#news" data-nf="${r.id}" data-sl="${s.id}">${esc(s.title)}</a>`).join(" · ")}</p>`:""}</div>
  <div class="rmapcol"><svg class="loc" id="loc-${r.id}" viewBox="0 0 460 400" role="img" aria-label="Locator map, ${esc(r.name)}"></svg>
  <div class="lockey" data-r="${r.id}"><label class="chip"><input type="checkbox" data-l="hex" checked> Conflict</label><label class="chip"><input type="checkbox" data-l="places" checked> Places and groups</label><label class="chip"><input type="checkbox" data-l="res" checked> Mines and resources</label><label class="chip"><input type="checkbox" data-l="bri" checked> China Belt &amp; Road</label><label class="chip"><input type="checkbox" data-l="ru" ${ru.length?"checked":"disabled"}> Russia</label></div>
  <svg class="spark" id="sp-${r.id}" viewBox="0 0 460 96"></svg></div></div></details>`;}).join("");
 /* locator maps */
 const PSYM={city:[d3.symbolCircle,60,"#00CC28"],area:[d3.symbolCircle,0,"#00CC28"],mine:[d3.symbolDiamond,90,"#7367E5"],group:[d3.symbolCross,110,"#FF728E"],lake:[d3.symbolCircle,60,"#18FFFF"],base:[d3.symbolSquare,80,"#FF80FF"],dam:[d3.symbolSquare,80,"#64B5F6"]};
 const LOC={};
 const buildLoc=r=>{if(LOC[r.id])return;const sv=d3.select("#loc-"+r.id);if(sv.empty())return;const LW=460,LH=400;
  const fc={type:"FeatureCollection",features:afr.features.filter(x=>r.countries.includes(x.properties.ADM0_A3))};
  const pts=(PL[r.id]||[]).map(p=>p.ll);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  let [a0,a1,b0,b1]=[d3.min(xs),d3.max(xs),d3.min(ys),d3.max(ys)];const span=Math.max(a1-a0,b1-b0,11),cx=(a0+a1)/2,cy=(b0+b1)/2,hw=span*0.75,hh=span*0.65;
  const ext={type:"Feature",geometry:{type:"Polygon",coordinates:[[[cx-hw,cy-hh],[cx-hw,cy+hh],[cx+hw,cy+hh],[cx+hw,cy-hh],[cx-hw,cy-hh]]]}};
  const pj=d3.geoMercator().fitExtent([[10,10],[LW-10,LH-10]],ext),pa=d3.geoPath(pj);
  sv.append("rect").attr("width",LW).attr("height",LH).attr("fill","#0f1b31");
  sv.append("g").selectAll("path").data(afr.features).join("path").attr("d",pa).attr("class",f=>r.countries.includes(f.properties.ADM0_A3)?"lreg":"lland");
  const inB=c=>{const p=pj(c);return p&&p[0]>-5&&p[0]<LW+5&&p[1]>-5&&p[1]<LH+5;};
  const used=[];const hit=b=>used.some(u=>b.x<u.x+u.width+3&&u.x<b.x+b.width+3&&b.y<u.y+u.height+2&&u.y<b.y+b.height+2)||b.x<4||b.x+b.width>LW-4||b.y<4||b.y+b.height>LH-4;
  const lab=(g,x,y,t)=>{const el=g.append("text").attr("class","pn").text(t);let ok=null;
   for(const [dx,dy,a] of [[8,4,"start"],[-8,4,"end"],[8,-10,"start"],[-8,-10,"end"],[8,18,"start"],[-8,18,"end"],[0,-14,"middle"],[0,24,"middle"],[8,32,"start"],[-8,-24,"end"],[0,-30,"middle"],[0,40,"middle"],[8,-38,"start"],[-8,46,"end"]]){el.attr("x",x+dx).attr("y",y+dy).attr("text-anchor",a);const b=el.node().getBBox();if(!hit(b)){ok=b;break;}}
   if(!ok){el.remove();return;}used.push(ok);};
  [...(PL[r.id]||[]).map(p=>p.ll),...B.russia.filter(x=>RU_REGION[x.id]===r.id).map(x=>x.ll)].forEach(c=>{const [x,y]=pj(c);used.push({x:x-5,y:y-5,width:10,height:10});});
  const L={hex:sv.append("g"),res:sv.append("g"),bri:sv.append("g"),ru:sv.append("g"),places:sv.append("g")};
  L.hex.selectAll("path").data(HX.features.filter(f=>inB(d3.geoCentroid(f)))).join("path").attr("d",pa).attr("fill",f=>HC[f.properties.step-1]).attr("fill-opacity",.85).append("title").text(f=>`${f.properties.country}: ${f.properties.deaths} deaths`);
  
  B.resources.filter(d=>inB(d.lonlat)&&(d.conflict_region===r.id||r.countries.some(c=>(d.country||"").includes(c)))).forEach(d=>{const [x,y]=pj(d.lonlat);L.res.append("path").attr("class","res").attr("fill",CATS[CAT(d.type)].c).attr("d",d3.symbol(CATS[CAT(d.type)].s,90)()).attr("transform",`translate(${x},${y})`).style("cursor","pointer").on("click",()=>resPanel(d)).append("title").text(d.name);});
  B.bri.filter(d=>inB(d.lonlat)&&(d.region===r.id)).forEach(d=>{const [x,y]=pj(d.lonlat);const g=L.bri.append("g").attr("class","bri").attr("transform",`translate(${x},${y+14})`).style("cursor","pointer").on("click",()=>{location.href=briHref(d.id);});FLAG(g,18);g.append("title").text(`China – Belt & Road: ${d.name}, click for the Belt and Road dashboard`);});
  B.russia.filter(x=>RU_REGION[x.id]===r.id&&inB(x.ll)).forEach(x=>{const [px,py]=pj(x.ll);const g=L.ru.append("g").attr("class","rumark").attr("transform",`translate(${px},${py})`).style("cursor","pointer").on("click",()=>{document.getElementById("russia").scrollIntoView();});g.append("path").attr("d",d3.symbol(d3.symbolTriangle,150)());lab(L.ru,px,py,"RU · "+x.theatre);L.ru.selectAll("text.pn").attr("class","pn ru");g.append("title").text(`Russia in ${x.theatre}: backs ${x.backs} [${fnNums(x.cites)}]`);});
  const P=L.places.selectAll("g").data(PL[r.id]||[]).join("g").attr("class","pt").attr("data-k",p=>p.k).attr("transform",p=>`translate(${pj(p.ll)})`);
  P.append("path").attr("class","sym").attr("d",p=>d3.symbol(PSYM[p.t][0],PSYM[p.t][1]||1)()).attr("fill",p=>PSYM[p.t][2]).attr("stroke","#0b1526").attr("stroke-width",1.2);
  P.append("title").text(p=>p.n+(GROUP_OF(p.k)?": "+gTip(GROUP_OF(p.k)):p.note?": "+p.note:""));
  P.each(function(p){const [x,y]=pj(p.ll);const t=p.t==="area"?(p.s||p.n).toUpperCase():(p.s||p.n);if(p.t==="area"){const el=d3.select(L.places.node()).append("text").attr("class","pn").attr("text-anchor","middle").attr("x",x).attr("y",y+4).style("fill","#c8a24a").text(t);used.push(el.node().getBBox());}else lab(d3.select(L.places.node()),x,y,t);});
  P.on("click",(e,p)=>{const el=document.querySelector(`#r-${r.id} .prose .pl[data-k="${p.k}"]`);if(el){const para=el.closest("p");para.scrollIntoView({behavior:"smooth",block:"center"});para.classList.add("flash");setTimeout(()=>para.classList.remove("flash"),1600);}});
  /* inset */
  const ins=sv.append("g").attr("class","inset").attr("transform",`translate(${LW-96},${LH-100})`);ins.append("rect").attr("width",90).attr("height",94).attr("rx",3);
  const ip=d3.geoMercator().fitExtent([[4,4],[86,90]],afr),ia=d3.geoPath(ip);ins.append("path").attr("d",ia(afr));const [[i0,j0],[i1,j1]]=ia.bounds(ext);ins.append("rect").attr("class","box").attr("x",i0-1).attr("y",j0-1).attr("width",i1-i0+2).attr("height",j1-j0+2);
  LOC[r.id]={sv,L,P};
  /* UCDP monthly sparkline */
  const sp=d3.select("#sp-"+r.id),ser=UC&&UC.series[r.id];
  if(ser){const x=d3.scaleBand().domain(d3.range(ser.length)).range([8,452]).padding(.15),yy=d3.scaleLinear().domain([0,d3.max(ser)||1]).range([66,22]);
   sp.selectAll("rect").data(ser).join("rect").attr("x",(d,i)=>x(i)).attr("width",x.bandwidth()).attr("y",d=>yy(d)).attr("height",d=>66-yy(d)).append("title").text((d,i)=>`${mname(UCM[i])}: ${d.toLocaleString()} deaths`);
   sp.append("text").attr("x",8).attr("y",15).text(`UCDP conflict deaths per month (best estimate). Peak ${d3.max(ser).toLocaleString()}, ${mname(UCM[ser.indexOf(d3.max(ser))])}`);
   sp.append("text").attr("x",8).attr("y",86).text(mname(UCM[0]));sp.append("text").attr("x",452).attr("y",86).attr("text-anchor","end").text(mname(UCM.at(-1)));}
 };
 B.regions.forEach(r=>{const d=document.getElementById("r-"+r.id);d.addEventListener("toggle",()=>{if(d.open)buildLoc(r);});});
 /* locator layer toggles and text↔map linking */
 document.querySelectorAll(".lockey input").forEach(i=>i.onchange=()=>{const r=i.closest(".lockey").dataset.r;LOC[r].L[i.dataset.l].style("display",i.checked?null:"none");});
 const hl=(r,keys,on)=>{buildLoc(B.regions.find(x=>x.id===r));const o=LOC[r];if(!o)return;o.P.classed("on",p=>on&&keys.includes(p.k)).classed("dim",p=>on&&!keys.includes(p.k));};
 document.querySelectorAll(".prose .pl").forEach(el=>{const f=on=>{hl(el.dataset.r,[el.dataset.k],on);el.classList.toggle("on",on);};el.addEventListener("mouseenter",()=>f(true));el.addEventListener("mouseleave",()=>f(false));el.addEventListener("focus",()=>f(true));el.addEventListener("blur",()=>f(false));});
 /* ---------- Russia section ---------- */
 const renderRu=()=>{document.getElementById("rusec").innerHTML=`<p>Russia works through the Africa Corps, which took over from Wagner in Mali in June 2025, and through security deals with governments.${fn(["reuters-mali-2025"])} Each card shows whom Russia backs in a theatre and whom it fights. Open a card for who backs the other side and each side's case. Status tags read "documented", "reported" or "alleged".</p>
 <div class="rugrid">${B.russia.map(r=>`<article class="rucard"><header><svg width="16" height="14" aria-hidden="true"><path d="M8 1L15 13H1Z" fill="#FF80FF"/></svg><h4>${esc(r.theatre)}</h4>${stB(r.status)}</header><p class="veh">${esc(r.vehicle)}</p><p><b>Backs:</b> ${esc(r.backs)}${fn(r.backs_cites)}</p><p><b>Fights:</b> ${r.fights.map(f=>`<span class="chip" title="${esc(gTip(f.g))}">${esc(f.n)}</span>${desBadges(f.g)}`).join(" ")}</p>
 <details><summary>Other side's backers and each side's case</summary><p>${r.opp_backers.length?r.opp_backers.map(o=>`${esc(o.n)} ${stB(o.status)}${fn(o.cites)}`).join("<br>"):"None documented in our sources."}</p><p>${esc(r.steelman)}${fn(r.cites)}</p><p><a href="#r-${RU_REGION[r.id]}">Region section ↑</a></p></details></article>`).join("")}</div>
 <aside class="a7note"><b>A7 in Africa:</b> Russia's sanctioned A7 payments network opened offices in Nigeria and Zimbabwe in September 2025 and has courted Togo, Madagascar and Mali.${fn(["cir-a7-africa-2026","cir-a7-abroad-2025"])} Its route from Sahel gold to rubles is under Money flows, and the map has an "A7 activity" layer. <a href="#flows">Money flows ↓</a></aside>
 <p class="muted">Tick "Russia alignments" on the main map to place these theatres. Designation badges: US FTO = US Foreign Terrorist Organization list, UK = UK proscribed list, UN 1267 = UN ISIL (Da'esh) and Al-Qaida sanctions list. <a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;};
 /* ---------- news by storyline ---------- */
 const LN={en:"EN",fr:"FR",pt:"PT",ar:"AR",ru:"RU",sw:"SW",ha:"HA",so:"SO",am:"AM",ti:"TI",rw:"RW",rn:"RN",es:"ES"};
 const isState=s=>/^(yes|de facto)/i.test(s||"");
 const fmt=ts=>new Date(ts*1000).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"America/New_York"});
 const RN=Object.fromEntries([...B.regions.map(r=>[r.id,r.name]),["continent","Continent-wide"]]);
 const storyLi=(s,i)=>{const a=s.sources[0];return `<li class="${i>=5?"xtra":""}"><span class="badge lang">${LN[a.lang]||(a.lang||"").toUpperCase()}</span>${isState(a.state)?'<span class="badge state">State media</span>':""}<span class="muted">${fmt(s.last)} · ${s.n} outlet${s.n>1?"s":""}</span><br><a class="hl" href="${esc(a.link)}" target="_blank" rel="noopener">${esc(s.headline)}</a>${a.title_en&&a.title_en!==a.title?`<br><span class="orig">Original: ${esc(a.title)}</span>`:""}
  <div class="muted">${s.sources.map(x=>`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.outlet)}</a>${isState(x.state)?" (state media)":""}`).join(" · ")}</div>${s.link_line?`<div class="conn">${esc(s.link_line)}</div>`:""}</li>`;};
 const more=n=>n>5?`<p style="padding:0 14px 10px"><button class="btn more">Show ${n-5} more</button></p>`:"";
 const ctx=s=>`<div class="ctx"><p class="muted">Structural force: ${esc(s.force)}</p><dl><dt>Origins</dt><dd>${esc(s.origins)}</dd><dt>Drivers</dt><dd>${esc(s.drivers)}</dd><dt>Aims</dt><dd>${esc(s.aims)}</dd><dt>Current direction</dt><dd>${esc(s.direction)}</dd><dt>Counter-forces</dt><dd>${esc(s.counter)}</dd><dt>Stakes</dt><dd>${esc(s.stakes)}</dd><dt>Unresolved</dt><dd>${esc(s.unresolved)}</dd><dt>Who's who</dt><dd><ul class="whos">${s.whos.map(w=>`<li><b>${esc(w.n)}</b>: ${esc(w.d)}</li>`).join("")}</ul></dd></dl><p>Sources for this context${fn(s.cites)} ${s.places&&s.places.length&&s.region!=="continent"?`· <button class="btn showmap" data-r="${s.region}" data-k="${s.places.join(",")}">Show on the ${esc(RN[s.region])} map</button>`:""}</p></div>`;
 let curNews="sahel";
 function setNews(rid,sl){curNews=rid;const R=ST&&ST.regions.find(x=>x.id===rid);
  document.querySelectorAll(".nfilter .chip").forEach(c=>{c.classList.toggle("on",c.dataset.r===rid);c.setAttribute("aria-pressed",c.dataset.r===rid);});
  const box=document.getElementById("nbody");
  if(!R){box.innerHTML='<p class="muted">No news file in this build.</p>';return;}
  box.innerHTML=`<p class="muted">${R.count} items from the last 14 days, grouped into ${R.storylines.reduce((a,s)=>a+s.stories.length,0)+R.other.length} stories. Click a storyline for its context.</p>`+R.storylines.map(g=>{const s=SLs.find(x=>x.id===g.id);const last=g.stories.length?fmt(Math.max(...g.stories.map(x=>x.last))):"none in 14 days";
   return `<details class="story-g" id="sl-${s.id}" ${sl===s.id?"open":""}><summary><b>${esc(s.title)}</b><span class="muted">${g.stories.length} stor${g.stories.length===1?"y":"ies"} · latest ${last}</span></summary>${ctx(s)}${g.stories.length?`<ul class="items">${g.stories.map(storyLi).join("")}</ul>${more(g.stories.length)}`:'<p class="muted" style="padding:0 14px 10px">No matching items in the last 14 days.</p>'}</details>`;}).join("")+
   `<details class="story-g other"><summary><b>Other developments</b><span class="muted">${R.other.length} stories${R.other.length?" · latest "+fmt(Math.max(...R.other.map(x=>x.last))):""}</span></summary><p class="muted" style="padding:0 14px">Items that do not fit a standing storyline.</p><ul class="items">${R.other.map(storyLi).join("")}</ul>${more(R.other.length)}</details>`;
  box.querySelectorAll("button.more").forEach(b=>b.onclick=()=>{const u=b.closest("details").querySelector(".items");u.classList.add("all");b.remove();});
  box.querySelectorAll("button.showmap").forEach(b=>b.onclick=()=>{const r=b.dataset.r,ks=b.dataset.k.split(",");const d=document.getElementById("r-"+r);d.open=true;d.scrollIntoView({behavior:"smooth"});hl(r,ks,true);setTimeout(()=>hl(r,ks,false),4000);});
  if(sl){const e=document.getElementById("sl-"+sl);e&&e.scrollIntoView({behavior:"smooth"});}
  renderSources();}
 const xp=MD?MD.x:[];
 document.getElementById("newssec").innerHTML=`<p>News is grouped under standing storylines. Each storyline has a context header that explains where it came from, who drives it and what is at stake. Each item carries one line showing how it connects. Items that fit no storyline sit under "Other developments". Clicking a region on the map filters this list.</p><p class="prompt">Select a region to see its storylines.</p><div class="nfilter" role="group" aria-label="Filter news by region">${[...B.regions.map(r=>r.id),"continent"].map(id=>`<button class="chip" data-r="${id}">${esc(RN[id])}</button>`).join("")}</div><div id="nbody"></div>`;
 document.querySelectorAll(".nfilter .chip").forEach(c=>c.onclick=()=>setNews(c.dataset.r));
 document.addEventListener("click",e=>{const a=e.target.closest("[data-nf]");if(a){setNews(a.dataset.nf,a.dataset.sl);}});
 /* ---------- v1.3 graphics ---------- */
 const stB=s=>`<span class="badge st-${s}">${s}</span>`;
 const stOf=c=>/document/i.test(c)?"documented":/alleg/i.test(c)?"alleged":"reported";
 const flagI=w=>`<svg class="flagi" width="${w}" height="${w*2/3}" viewBox="0 0 ${w} ${w*2/3}" aria-hidden="true"><use href="#cnflag" width="${w}" height="${w*2/3}"/></svg>`;
 const goldChart=()=>{const R=B.goldroutes,el=document.getElementById("flowsec");
  el.innerHTML=`<p>Most African gold leaves through Dubai. The chart shows three routes: into the UAE, from the UAE to Switzerland, and from the UAE into crypto. Band widths are tonnes on one shared scale, and each band carries its own year. The crypto route has no published tonnage, so it is drawn as a dashed outline.</p>
  <svg id="goldsvg" class="goldsvg" viewBox="0 0 1160 500" role="img" aria-label="Gold routes from Africa through the UAE to Switzerland and crypto"></svg>
  <div class="rcards">
   <div class="rcard" style="border-top-color:#FFD600"><h4>1. ${esc(R.uae.label)}</h4><p><b>${R.uae.smuggled.t} t</b> of African gold reached the UAE in ${R.uae.smuggled.year} without being declared for export in Africa. That was 66.5% of the UAE's gold imports from Africa.${fn([R.uae.smuggled.cite])} Over ${R.uae.decade.year} the undeclared total was ${R.uae.decade.t.toLocaleString()} t.${fn([R.uae.decade.cite])}</p><ul>${R.uae.cases.map(c=>`<li>${stB(c.status)} ${esc(c.t)}${fn(c.cites)}</li>`).join("")}</ul></div>
   <div class="rcard" style="border-top-color:#00B0FF"><h4>2. ${esc(R.ch.label)}</h4><p><b>${R.ch.t} t</b> in ${esc(R.ch.year)}.${fn([R.ch.cite])} Over ${R.ch.decade.year}, Switzerland imported ${R.ch.decade.t.toLocaleString()} t of gold from Dubai.${fn([R.ch.decade.cite])}</p><p>${esc(R.ch.note)}${fn([R.ch.decade.cite])}</p></div>
   <div class="rcard" style="border-top-color:#AA00FF"><h4>3. ${esc(R.crypto.label)}</h4><ul>${R.crypto.cases.map(c=>`<li>${stB(c.status)} ${esc(c.t)}${fn(c.cites)}</li>`).join("")}</ul><p class="gap">${esc(R.crypto.gap)}</p></div>
   <div class="rcard" style="border-top-color:#FF80FF"><h4>${esc(R.a7.label)} ${stB(R.a7.status)}</h4>${R.a7.t.map((t,i)=>`<p>${esc(t)}${fn(i===0?["elliptic-a7a5-2026","ofac-a7-2025"]:i===1?["ofac-sdn-20250814","uk-a7a5-2025","eu-19th-2025"]:["elliptic-a7a5-2025","elliptic-a7a5-2026","ft-a7a5-2025","chainalysis-a7a5-2025","elliptic-a7-leaks"])}</p>`).join("")}<p class="gap"><b>Africa link:</b> ${esc(R.a7.africa)}</p></div>
  </div>
  <h3>A7: from Sahel gold to rubles ${stB(B.a7route.status)}</h3><p class="gap">${esc(B.a7route.note)}</p>
  <ol class="steps">${B.a7route.steps.map((s,i)=>`<li class="step"><span class="sn">${i+1}</span><h4>${esc(s.n)}</h4><p>${esc(s.t)}${fn(s.cites)}</p></li>`).join('<li class="arr" aria-hidden="true">→</li>')}</ol>
  <div class="step par"><h4>Parallel: ${esc(B.a7route.parallel.n)}</h4><p>${esc(B.a7route.parallel.t)}${fn(B.a7route.parallel.cites)}</p></div>
  <h3>Where A7's weight sits</h3><div class="cog">${B.a7cog.map(c=>`<div class="cogc"><h4>${esc(c.n)}</h4><p>${esc(c.t)}${fn(c.cites)}</p></div>`).join("")}</div>
  <h3>Sanctions and frictions</h3><ol class="tline">${B.a7fric.map(c=>`<li><b>${esc(c.n)}</b> ${esc(c.t)}${fn(c.cites)}</li>`).join("")}<li><b>African regulators</b> Our search found no public record of an African regulator acting against A7.</li></ol>
  <h3>Battery minerals</h3><div class="statrow">${B.sankey.battery.map((f,i)=>`<div class="stat" style="border-left-color:${i?"#00B0FF":"#AEEA00"}"><div class="big">${f.t.toLocaleString()} t</div><div>${esc(f.from)} → ${esc(f.to)}</div><div class="muted">${esc(f.year)}${fn([f.cite])}</div></div>`).join("")}</div>
  <p class="muted">The two battery figures are different minerals, so they are not drawn on one scale. <a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;
  const sv=d3.select("#goldsvg"),k=0.5,gap=15,OX=290,HX=560,DX=820;
  const ins=[...R.uae.inflows.map(f=>({n:f.from==="Russia"?"Russia (not African)":f.from,t:f.t,y:f.year,c:f.from==="Russia"?"#FF80FF":"#FFD600",cite:f.cite})),{n:"Undeclared African gold",t:R.uae.smuggled.t,y:R.uae.smuggled.year,c:"#FF6D00",cite:R.uae.smuggled.cite}];
  const tot=d3.sum(ins,d=>d.t),hubH=tot*k,hubY=20+(ins.length-1)*gap/2;let y=20,hy=hubY;
  ins.forEach(d=>{const h=d.t*k;sv.append("polygon").attr("points",`${OX+10},${y} ${HX},${hy} ${HX},${hy+h} ${OX+10},${y+h}`).attr("fill",d.c).attr("fill-opacity",.8).append("title").text(`${d.n} → UAE: ${d.t} t (${d.y}) [${fnNums([d.cite])}]`);
   sv.append("rect").attr("x",OX).attr("y",y).attr("width",10).attr("height",h).attr("fill",d.c);
   sv.append("text").attr("class","gl").attr("x",OX-8).attr("y",y+h/2+5).attr("text-anchor","end").text(`${d.n}: ${d.t} t (${d.y})`);y+=h+gap;hy+=h;});
  sv.append("rect").attr("x",HX).attr("y",hubY).attr("width",16).attr("height",hubH).attr("fill","#4CFFC9");
  sv.append("text").attr("class","gl gh").attr("x",HX+8).attr("y",hubY-8).attr("text-anchor","middle").text("UAE (Dubai)");
  const chH=R.ch.t*k;sv.append("polygon").attr("points",`${HX+16},${hubY} ${DX},${hubY} ${DX},${hubY+chH} ${HX+16},${hubY+chH}`).attr("fill","#00B0FF").attr("fill-opacity",.8).append("title").text(`UAE → Switzerland: ${R.ch.t} t (${R.ch.year}) [${fnNums([R.ch.cite])}]`);
  sv.append("rect").attr("x",DX).attr("y",hubY).attr("width",10).attr("height",chH).attr("fill","#00B0FF");
  const lab=(x,y0,lines,cls)=>{const t=sv.append("text").attr("class","gl "+(cls||"")).attr("x",x).attr("y",y0);lines.forEach((l,i)=>t.append("tspan").attr("x",x).attr("dy",i?18:0).text(l));};
  lab(DX+18,hubY+chH/2-4,["Switzerland",`${R.ch.t} t (${R.ch.year})`]);
  const cy=hubY+chH+30,cH=44;sv.append("polygon").attr("points",`${HX+16},${cy} ${DX},${cy} ${DX},${cy+cH} ${HX+16},${cy+cH}`).attr("fill","#AA00FF").attr("fill-opacity",.18).attr("stroke","#AA00FF").attr("stroke-width",2).attr("stroke-dasharray","7 5").append("title").text("UAE → crypto and stablecoins via OTC desks: no published tonnage. Documented case: Russian (Polyus) gold, OFAC 2024.");
  sv.append("text").attr("class","gl").attr("x",(HX+DX)/2+8).attr("y",cy+cH/2+5).attr("text-anchor","middle").text("no published tonnage");
  lab(DX+18,cy+16,["Crypto and stablecoins","via OTC desks (documented case:","Russian gold, not African)"]);
  const ay=cy+cH+52;sv.append("line").attr("x1",DX+5).attr("y1",cy+cH).attr("x2",DX+5).attr("y2",ay-6).attr("stroke","#FF80FF").attr("stroke-width",2).attr("stroke-dasharray","4 4");
  sv.append("rect").attr("x",DX-4).attr("y",ay-6).attr("width",18).attr("height",18).attr("fill","none").attr("stroke","#FF80FF").attr("stroke-width",2);
  lab(DX+18,ay+8,["A7A5 / Grinex: Russian settlement","rail (reported link, no African","gold source found)"],"ga7");
  sv.append("text").attr("class","gl").attr("x",OX).attr("y",y+18).text("Band width = tonnes, same scale for every band. Hover a band for its source number.");
  sv.attr("viewBox",`0 0 1160 ${Math.max(y+30,ay+70)}`);};
 const renderBackers=()=>{const regs=B.regions,bks=[...new Set(B.links.map(bk))].sort();
  const cell=(r,b)=>{const ls=B.links.filter(l=>l.region===r.id&&bk(l)===b);if(!ls.length)return `<span class="mx0"></span>`;const s=ls.map(l=>stOf(l.confidence));const st=s.includes("documented")?"documented":s.includes("reported")?"reported":"alleged";
   return `<button class="mx st-${st}" style="--c:${BC[b]||"#FF80FF"}" data-r="${r.id}" data-b="${esc(b)}" title="${esc(ls.map(l=>`${l.backer} → ${l.actor} (${l.confidence}): ${(l.means||[]).join(", ")}`).join("\n"))}">${ls.length}</button>`;};
  document.getElementById("bksec").innerHTML=`<p>Each dot is one or more outside states backing a side in a region. Solid dots are documented, dashed rings are reported or alleged. Hover for the actor and means, click for the full entry and sources.</p>
  <div class="mxwrap"><div class="mxg" style="grid-template-columns:minmax(150px,1.3fr) repeat(${bks.length},minmax(44px,1fr))"><span></span>${bks.map(b=>`<span class="mxh"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BC[b]||"#FF80FF"};margin-right:4px"></i>${esc(b)}</span>`).join("")}
  ${regs.map(r=>`<span class="mxr"><a href="#r-${r.id}">${esc(r.name)}</a></span>${bks.map(b=>cell(r,b)).join("")}`).join("")}</div></div><div id="mxdet"></div>
  <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;
  document.querySelectorAll("#bksec .mx").forEach(b=>b.addEventListener("click",()=>{document.getElementById("mxdet").innerHTML=tbl(B.links.filter(l=>l.region===b.dataset.r&&bk(l)===b.dataset.b));}));};
 const renderMinerals=()=>{const by={};B.resources.forEach(r=>{const m=/^([\d.]+)%$/.exec(r.world_share||"");if(!m)return;(by[r.type]??=[]).push({r,v:+m[1]});});
  const rows=Object.entries(by).map(([t,a])=>({t,a,v:d3.sum(a,x=>x.v),c:CATS[CAT(t)].c})).sort((a,b)=>b.v-a.v);
  const nm=t=>t.charAt(0).toUpperCase()+t.slice(1).replace("-"," ");
  document.getElementById("mnsec").innerHTML=`<p>Share of world mine output from the African producers on the map, from USGS figures. Colours follow the map's resource key. Hover a bar for the country split.</p>
  <div class="bars">${rows.map(x=>`<div class="bar" title="${esc(x.a.map(y=>`${y.r.name}: ${y.r.quantity}, ${y.v}% (${y.r.year})`).join("\n"))}"><span class="bl">${esc(nm(x.t))}</span><span class="bt"><span class="bf" style="width:${Math.min(x.v,100)}%;background:${x.c}"></span></span><span class="bv">${x.v.toFixed(x.v<10?1:0)}%</span><span class="bc">${esc(x.a.map(y=>y.r.name.split(" (")[0].replace(/^(DRC|South Africa|Guinea|Gabon|Ghana|Rwanda|Nigeria|Zambia|Madagascar|Zimbabwe|Mali|Mozambique|Tanzania|Namibia|Niger).*/,"$1")).join(", "))}${fn([...new Set(x.a.flatMap(y=>y.r.cites))])}</span></div>`).join("")}</div>
  <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;};
 /* ---------- sankey (unused) ---------- */
 function sankey(id,flows){const sv=d3.select("#"+id),W=1060,Hh=+sv.attr("viewBox").split(" ")[3];const cols={};flows.forEach(f=>{cols[f.from]??=0;cols[f.to]=Math.max(cols[f.to]??0,(cols[f.from]??0)+1);});
  const col=n=>cols[n];const nodes=[...new Set(flows.flatMap(f=>[f.from,f.to]))];const ncol=d3.max(nodes,col)+1;
  const val=n=>Math.max(d3.sum(flows.filter(f=>f.from===n),f=>f.t),d3.sum(flows.filter(f=>f.to===n),f=>f.t));
  const gap=14,usable=Hh-30;const per=d3.range(ncol).map(c=>nodes.filter(n=>col(n)===c));
  const k=d3.min(per,ns=>(usable-gap*(ns.length-1))/d3.sum(ns,n=>Math.max(val(n),1)));const minH=4;
  const pos={};per.forEach((ns,c)=>{let y=15;ns.forEach(n=>{const h=Math.max(val(n)*k,minH);pos[n]={x:40+c*((W-300)/(Math.max(ncol-1,1))),y,h,o:0,i:0};y+=h+gap;});});
  flows.forEach(f=>{const a=pos[f.from],b=pos[f.to],w=Math.max(f.t*k,3);const y0=a.y+a.o+w/2,y1=b.y+b.i+w/2;a.o+=w;b.i+=w;
   sv.append("path").attr("d",`M${a.x+12},${y0}C${(a.x+b.x)/2},${y0} ${(a.x+b.x)/2},${y1} ${b.x},${y1}`).attr("fill","none").attr("stroke",f.to==="Switzerland"?"#80CBC4":"#FFD54F").attr("stroke-opacity",.5).attr("stroke-width",w).append("title").text(`${f.from} → ${f.to}: ${f.t.toLocaleString()} t (${f.year}) [${fnNums([f.cite])}]`);});
  nodes.forEach(n=>{const p=pos[n];sv.append("rect").attr("x",p.x).attr("y",p.y).attr("width",12).attr("height",p.h).attr("fill","#c8a24a");
   const out=flows.filter(f=>f.from===n);const lab=col(n)===0?`${n}: ${out.map(f=>f.t.toLocaleString()+" t ("+f.year+")").join(", ")}`:n;
   sv.append("text").attr("class","sklabel").attr("x",col(n)===0?p.x-6:p.x+18).attr("y",p.y+p.h/2+5).attr("text-anchor",col(n)===0?"end":"start").text(lab);});
  const cw=sv.node().getBoundingClientRect().width;sv.selectAll("text.sklabel").style("font-size","15px");
  const Lb=sv.selectAll("text.sklabel").nodes().filter(t=>t.getAttribute("text-anchor")==="end");const kk=(d3.max(Lb,t=>t.getBBox().width)||0)/15;
  const a=15*kk/cw,xs=(a*W+12)/(1-a-12/cw);sv.attr("viewBox",`${-xs} 0 ${W+xs} ${Hh}`);sv.selectAll("text.sklabel").style("font-size",(15*(W+xs)/cw)+"px");
  document.getElementById(id+"-notes").innerHTML=flows.map(f=>`<span>${esc(f.from)} → ${esc(f.to)}: <b>${f.t.toLocaleString()} t</b>, ${f.year}.${fn([f.cite])}</span>`).join("");}
 /* ---------- BRI, media, method ---------- */
 const fillRest=()=>{
 document.getElementById("brisec").innerHTML=`<aside class="bri-cta"><div><p class="eyebrow">Beacon global dashboard</p><h3>China's role in Africa and beyond</h3><p>The Belt and Road dashboard tracks China's loans, ports, railways, bases and mining stakes worldwide.</p></div><a class="bri-btn" href="${briHref()}">Explore the Belt and Road dashboard →</a></aside><p>Fourteen China-linked projects sit in or near the conflict regions on this map. They include railways, ports, Africa's first Chinese military base, mining stakes and state loans. China's state lenders have lent to 49 African governments since 2000.${fn(["bu-cla-2024","bu-cla-db"])} Each card shows what China built or lent. Open it for what China gets and the host government's case.</p>
  ${(()=>{const K=k=>k.replace(/\s*\(.*\)/,"");const cnt=d3.rollups(B.bri,v=>v.length,b=>K(b.kind)).sort((a,b)=>b[1]-a[1]);const mx=d3.max(cnt,c=>c[1]);return `<div class="bars bri-bars">${cnt.map(([k,n])=>`<div class="bar"><span class="bl">${flagI(18)} ${esc(k.charAt(0).toUpperCase()+k.slice(1))}</span><span class="bt"><span class="bf" style="width:${n/mx*100}%;background:#FF1744"></span></span><span class="bv">${n}</span></div>`).join("")}</div>`;})()}
  <div class="bricards">${B.bri.map(b=>`<article class="bricard"><header>${flagI(20)}<h4><a href="${briHref(b.id)}">${esc(b.name)}</a></h4></header><p class="veh">${esc(b.country)} · ${esc(b.kind)}</p><p><b>${esc(b.value)}</b>${fn(b.cites)}</p><details><summary>Details</summary><p><b>Lender or builder:</b> ${esc(b.lender_builder)}</p><p><b>What China gets:</b> ${esc(b.china_gets)}</p><p><b>Host's case:</b> ${esc(b.host_position)}</p><p><b>Confidence:</b> ${esc(b.confidence)}</p></details></article>`).join("")}</div>
  <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;
 if(MD){const own=MD.ownership,fs=own.filter(o=>o.foreign_state),dom=own.filter(o=>!o.foreign_state);
 const oSrc=o=>fn((o.ownership_source||"").split(/\s*;\s*/).filter(u=>u.startsWith("http")).map(u=>urlSrc(u,"Ownership of "+o.name,o.name+" ownership source")));
 const TYI=o=>isState(o.state_media)?["#FF1744","■","State media"]:/aligned|backed/i.test(o.ownership_type)?["#FFAB00","◆","Private, state-aligned or state-backed"]:["#1DE9B6","●","Private"];
 const tag=o=>{const [c,s,n]=TYI(o);return `<span class="otag ${o.verified?"":"unv"}" title="${esc(`${o.name} (${o.country}). Owner: ${o.owner}. ${o.political_ties||""} ${o.verified?"Ownership verified.":"Ownership unverified."}`)}"><i style="color:${c}" aria-label="${n}">${s}</i> ${esc(o.name)}${oSrc(o)}</span>`;};
 const grp=(arr,key)=>d3.groups(arr,key).sort((a,b)=>b[1].length-a[1].length);
 const ownerKey=o=>{const m=/\(([^)]*(Group|Holdings|Ltd|Media)[^)]*)\)/.exec(o.owner);return m?m[1]:o.owner.split(/[,(]/)[0].trim();};
 document.getElementById("mediasec").innerHTML=`<p>Who owns an outlet shapes what it covers. State media are used here as each government's own narrative, never as confirmation of facts. Hover an outlet for its owner and ties. A dashed tag means its ownership is unverified.</p>
  <p class="okey"><span><i style="color:#FF1744">■</i> State media</span><span><i style="color:#FFAB00">◆</i> Private, state-aligned or state-backed</span><span><i style="color:#1DE9B6">●</i> Private</span></p>
  <h3>Foreign-state media active in Africa, by owner state</h3><div class="ogrid">${grp(fs,o=>o.country.split("/")[0]).map(([k,a])=>`<div class="ocard"><h4>${k==="China"?flagI(20)+" ":""}${esc(k)} <span class="cnt">${a.length}</span></h4>${a.map(tag).join("")}</div>`).join("")}</div>
  <h3>Key African and international outlets, by owner</h3><div class="ogrid">${grp(dom,ownerKey).map(([k,a])=>`<div class="ocard"><h4>${esc(k)} <span class="cnt">${a.length}</span></h4>${a.map(tag).join("")}</div>`).join("")}</div>
  <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;}
 document.getElementById("methodsec").innerHTML=`<ul><li><b>Conflict shading and monthly bars:</b> ${esc(NOTE)} Monthly bars use UCDP GED best estimates by region, counted in the month an event starts. Sudan's October 2025 bar is the RSF capture of El Fasher, which UCDP codes as two events with about 56,700 best-estimate deaths.</li><li><b>Resources, backers, Russia and Belt and Road:</b> every entry carries at least one numbered source. Contested links are marked "reported" or "alleged". Each side's own case is given.</li><li><b>Region explainers:</b> a bottom line, then one claim per paragraph, each with its source number. Descriptive only, with no forecasts or recommendations.</li>
  <li><b>Latest news:</b> fetched ${MD?esc(MD.fetched):"n/a"} from ${MD?MD.feeds_ok:0} of ${MD?MD.feeds_total:0} working RSS feeds. Items from the last 14 days are matched to a region by place and actor names, grouped into same-event stories by headline word overlap, then hung on a standing storyline by keyword match. Unmatched stories go to "Other developments". Non-English headlines are translated locally with NLLB-200 (facebook/nllb-200-distilled-600M), and originals are shown. No .cn sites are fetched.</li>
  <li><b>X posts:</b> read from the free X API for accounts in the source list.</li><li><b>Money flows:</b> only published figures are drawn, on one tonnage scale. The crypto route and the A7A5 rail have no published gold tonnage and are drawn as outlines. A7's African offices and outreach are documented by CIR and others. The gold-to-A7A5 route is marked "reported" because each step is public but no source traces one shipment through all of them. Personal names, wallets and web domains are left out.</li><li><b>Sources:</b> numbered in order of first appearance. A repeated source keeps its number.</li></ul>`;};
 const kpis=()=>{const tot=UC?d3.sum(Object.values(UC.series).flat()):null,G=B.goldroutes.uae.smuggled;
  const K=[[tot!=null?tot.toLocaleString():"n/a","conflict deaths in the last 12 months",["ucdp-ged"]],[B.regions.length,"conflict regions covered",[]],[G.t+" t","African gold reached the UAE undeclared in "+G.year,[G.cite]],[B.bri.length,"China Belt and Road projects mapped",[]],[2,"A7 offices in Africa (Nigeria, Zimbabwe)",["cir-a7-africa-2026"]]];
  document.getElementById("kpis").innerHTML=K.map(([v,t,c])=>`<div class="kpi"><b>${v}</b><span>${esc(t)}${fn(c)}</span></div>`).join("");};
 const ABBR={"AFC":"Alliance Fleuve Congo, the political wing allied to M23","API":"Application programming interface","CAR":"Central African Republic","CGTN":"China Global Television Network","CSP":"Permanent Strategic Framework, an alliance of northern Mali armed groups","DMCC":"Dubai Multi Commodities Centre, a free zone","DRC":"Democratic Republic of the Congo","EDT":"Eastern Daylight Time","FDLR":"Democratic Forces for the Liberation of Rwanda","FTO":"Foreign Terrorist Organization (US designation)","GED":"Georeferenced Event Dataset (UCDP)","ISIL":"Islamic State of Iraq and the Levant","ISWAP":"Islamic State West Africa Province","JNIM":"Jama'at Nusrat al-Islam wal-Muslimin, an al-Qa'ida-aligned Sahel federation","KCT":"Kribi Container Terminal","LAPSSET":"Lamu Port, South Sudan, Ethiopia Transport corridor","LLC":"Limited liability company","LNA":"Libyan National Army","LNG":"Liquefied natural gas","LTD":"Limited company","M23":"March 23 Movement, an armed group in eastern DRC","NLLB":"No Language Left Behind, the translation model used","OTC":"Over-the-counter (direct trading outside an exchange)","PLA":"People's Liberation Army (China)","RFI":"Radio France Internationale","RSS":"Really Simple Syndication, a news feed format","SOMAIR":"Société des Mines de l'Aïr, Niger uranium miner","TRT":"Turkish Radio and Television Corporation","U3O8":"Uranium oxide concentrate","USGS":"United States Geological Survey","A7A5":"A ruble-pegged digital token issued by the A7 network","ACLED":"Armed Conflict Location and Event Data","AES":"Alliance of Sahel States","CIR":"Centre for Information Resilience","EU":"European Union","LBMA":"London Bullion Market Association","OFAC":"Office of Foreign Assets Control (US Treasury)","PSB":"Promsvyazbank, a Russian state defence bank","RSF":"Rapid Support Forces (Sudan)","SAF":"Sudanese Armed Forces","UAE":"United Arab Emirates","UCDP":"Uppsala Conflict Data Program","UK":"United Kingdom","UN":"United Nations","US":"United States","USDT":"Tether, a dollar-pegged digital token","VEB.RF":"Russia's state development bank"};
 const abbr=()=>{const txt=document.querySelector("main").innerText;const found=new Set((txt.match(/\b[A-Z][A-Z0-9.]{1,}[A-Z0-9]\b/g)||[]));window._acr=[...found].filter(x=>!ABBR[x]);
  document.getElementById("abbrlist").innerHTML=Object.entries(ABBR).filter(([k])=>found.has(k)||txt.includes(k)).sort().map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");};
 document.addEventListener("click",e=>{const x=e.target.closest("sup.fn a");if(x)document.getElementById("srcdet").open=true;});
 kpis();setNews("sahel");renderBackers();renderMinerals();renderRu();goldChart();fillRest();abbr();renderSources();
 window._sankeyFlows=document.querySelectorAll("#goldsvg polygon").length;
 renderSources();
 window._fn=()=>({n:FNL.length,ids:FNL});
 window._check=()=>{const ts=[...document.querySelectorAll("svg text")].filter(t=>t.getBBox().width>0&&getComputedStyle(t).display!=="none"&&t.closest("svg").getBoundingClientRect().width>0);
  return {labels:ts.length,minFontPx:Math.min(...ts.map(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a)),small:ts.filter(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a<12.95).map(t=>t.textContent).slice(0,20)};};
});
