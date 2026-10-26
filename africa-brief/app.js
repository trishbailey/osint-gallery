const PH=()=>matchMedia("(max-width:600px)").matches;
const BRI_URL=window.BRI_DASHBOARD_URL||"../belt-and-road/";
const briHref=id=>BRI_URL+(id?"#p="+encodeURIComponent(id):"#region=africa");
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const COLORS={hex:["#F6A8A0","#E04040","#821414"]};
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
 const panel=h=>{document.getElementById("panel").innerHTML=h;renderSources();window._onPanel&&window._onPanel();};
 const Z=svg.append("g");
 Z.append("rect").attr("class","sea").attr("x",-2000).attr("y",-2000).attr("width",5000).attr("height",5000);
 Z.append("g").selectAll("path").data(geo.features).join("path").attr("d",path).attr("class",f=>f.properties.CONTINENT==="Africa"?"country":"other");
 const gC=Z.append("g");
 gC.selectAll("path").data(afr.features.filter(f=>r2c[f.properties.ADM0_A3])).join("path").attr("d",path).attr("class","conf")
  .on("click",(e,f)=>openRegion(r2c[f.properties.ADM0_A3])).append("title").text(f=>r2c[f.properties.ADM0_A3].name+": click to zoom and open the section");
 const M=HX.meta,NOTE=`Shaded: about ${M.hex_km} km cells with at least ${M.threshold} conflict deaths (UCDP best estimate), ${M.period}. Source: ${M.source}. ${M.note}`;
 document.getElementById("mapnote").textContent=NOTE;
 const HC=COLORS.hex,gH=gC.append("g");
 gH.selectAll("path").data(HX.features).join("path").attr("d",path).attr("class","hex").attr("fill",f=>HC[f.properties.step-1]).attr("stroke",f=>f.properties.step===3?"#F6A8A0":null).attr("stroke-width",f=>f.properties.step===3?0.7:null)
  .on("click",(e,f)=>{const c=afr.features.find(a=>d3.geoContains(a,d3.geoCentroid(f)));const r=c&&r2c[c.properties.ADM0_A3];if(r)openRegion(r,f);else panel(`<p class="eyebrow">Conflict cell</p><h3>${esc(f.properties.country)}</h3><p><b>${f.properties.deaths}</b> deaths in ${f.properties.events} events, ${M.period}.</p>`);})
  .append("title").text(f=>`${f.properties.country}: ${f.properties.deaths} deaths, ${f.properties.events} events`);
 const tbl=ls=>`<h4>Outside backers</h4>${ls.map(l=>`<div class="bk" style="border-left-color:${BC[bk(l)]||"#FF80FF"}"><b>${esc(l.backer)}</b> → ${esc(l.actor)} <span class="badge st-${/document/i.test(l.confidence)?"documented":/alleg/i.test(l.confidence)?"alleged":"reported"}">${esc(l.confidence)}</span><br><span class="muted">${esc(l.means.join(", "))}</span><p>${esc(l.actions)}${fn(l.cites)}</p><p><b>Gets in return:</b> ${esc(l.returns)}</p>${l.position?`<p><b>Its own case:</b> ${esc(l.position)}</p>`:""}</div>`).join("")}`;
 function showR(r,f){panel(`<p class="eyebrow">Conflict region</p><h3>${esc(r.name)}</h3>${f?`<p><b>This cell (${esc(f.properties.country)}):</b> ${f.properties.deaths} conflict deaths in ${f.properties.events} events.</p>`:""}<p>${esc(r.summary)}${fn(r.cites)}</p><p><a href="#r-${r.id}">Read the region section ↓</a> · <a href="#news" data-nf="${r.id}">News storylines ↓</a></p>`+
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
/* tooltip (custom, 13px+, hover, focus and tap) */
const tip=document.getElementById("tip");
const tipShow=(h,e)=>{tip.innerHTML=h;tip.hidden=false;const r=tip.getBoundingClientRect();let x=e.clientX+14,y=e.clientY+14;if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;tip.style.left=Math.max(4,x)+"px";tip.style.top=Math.max(4,y)+"px";};
const tipAt=(h,el)=>{const b=el.getBoundingClientRect();tipShow(h,{clientX:b.left+b.width/2,clientY:b.bottom});};
const tipHide=()=>{tip.hidden=true;};
window._tip=()=>tip.hidden?null:tip.innerText;
const bk=l=>{const n=l.backer;return n.startsWith("United Arab")?"UAE":n.startsWith("United States")?"US":n.split(/[ (]/)[0];};
const cl=([x,y])=>[Math.max(14,Math.min(W-14,x)),Math.max(14,Math.min(H-14,y))];
/* foreign powers: one flag row per country, lines from the capital on hover or tap only */
const PW=B.powers,CAPS=Object.assign({},PW.caps,{Ukraine:{n:"Ukraine",f:"uaflag"}}),ORD=PW.order;
const byIso=d3.group(PW.items,d=>d.iso);
const stT=x=>x.ended?"ended":x.st;
const powItems=(p,iso)=>byIso.get(iso).filter(x=>x.p===p);
const powTip=(p,iso)=>{const it=powItems(p,iso);return `<b>${esc(CAPS[p].n)}</b><div class="tsub">in ${esc(it[0].host)}</div><ul>${it.slice(0,6).map(x=>`<li>${esc(x.t)} <i class="tst">${stT(x)}</i> <span class="tfn">[${fnNums(x.cites)}]</span></li>`).join("")}${it.length>6?`<li>…and ${it.length-6} more, click for all</li>`:""}</ul>`;};
const powPanel=(p,iso)=>{const it=powItems(p,iso);panel(`<p class="eyebrow">Foreign involvement</p><h3>${esc(CAPS[p].n)} in ${esc(it[0].host)}</h3><ul class="plist">${it.map(x=>`<li>${esc(x.t)} <span class="badge st-${x.ended?"reported":x.st}">${stT(x)}</span>${fn(x.cites)}</li>`).join("")}</ul>${p==="China"?`<p><a class="bri-inline" href="${briHref()}">See these projects in the Belt and Road dashboard →</a></p>`:""}<p><a href="#backers">Who is fighting whom ↓</a></p>`);};
const anchor={},rows=[];
const AOFF={SOM:[14,40],DJI:[26,-10],ERI:[-6,-12],SOL:[30,0],RWA:[-40,6],ETH:[-6,8],COD:[0,26],TCD:[0,-26],SDN:[8,-20],LBY:[0,-30],NER:[-10,20],MLI:[18,10],SEN:[-14,0],GHA:[0,6],NGA:[0,10],CAF:[0,6],TZA:[10,0],KEN:[0,0],ZWE:[0,0],AGO:[0,0],NAM:[0,0],CMR:[-14,0],BFA:[0,4]};
afr.features.forEach(f=>{const iso=f.properties.ADM0_A3;if(!byIso.has(iso))return;const c=path.centroid(f),o=AOFF[iso]||[0,0];anchor[iso]=[c[0]+o[0],c[1]+o[1]];});
const gHL=Z.append("g").attr("class","hlc"),gPL=Z.append("g").attr("class","plines"),gP=Z.append("g").attr("class","pflags");
let pinned=false,zk=1;
const drawLines=pairs=>{gPL.selectAll("*").remove();const seen=new Set();pairs.forEach(([p,iso])=>{if(!CAPS[p]||!CAPS[p].ll||!anchor[iso])return;const a=cl(proj(CAPS[p].ll)),b=anchor[iso],ended=powItems(p,iso).every(x=>x.ended);
  gPL.append("line").attr("class","pline"+(ended?" ended":"")).attr("x1",a[0]).attr("y1",a[1]).attr("x2",b[0]).attr("y2",b[1]);
  if(!seen.has(p)){seen.add(p);gPL.append("circle").attr("class","pcap").attr("cx",a[0]).attr("cy",a[1]).attr("r",5/zk);const g=gPL.append("g").attr("class","pcapl");const t=g.append("text").attr("x",a[0]).attr("y",a[1]-10/zk).attr("text-anchor","middle").style("font-size",(14/zk)+"px").text(CAPS[p].cap+(proj(CAPS[p].ll)[0]>W||proj(CAPS[p].ll)[1]<0?" (off map)":""));const bb=t.node().getBBox();g.insert("rect","text").attr("x",bb.x-5/zk).attr("y",bb.y-2/zk).attr("width",bb.width+10/zk).attr("height",bb.height+4/zk).attr("rx",(bb.height+4/zk)/2);}});
  window._lines=gPL.selectAll("line").size();};
const clearLines=()=>{if(pinned)return;gPL.selectAll("*").remove();window._lines=0;};
window._lines=0;
const countryOn=iso=>{const ps=[...new Set(byIso.get(iso).map(x=>x.p))];drawLines(ps.map(p=>[p,iso]));};
ORD.forEach(()=>{});
[...byIso.keys()].filter(iso=>anchor[iso]).sort((a,b)=>byIso.get(b).length-byIso.get(a).length).forEach(iso=>{
 const ps=ORD.filter(p=>byIso.get(iso).some(x=>x.p===p)),fw=20,fh=13.3,gap=4,n=ps.length,shown=n>4?ps.slice(0,4):ps,hid=n>4?ps.slice(4):[];
 const wid=shown.length*(fw+gap)+(hid.length?30:0)-gap;let [x,y]=anchor[iso];
 for(let t=0;t<12&&rows.some(r=>Math.abs(r.x-x)<(r.w+wid)/2+4&&Math.abs(r.y-y)<fh+6);t++)y+=fh+6;
 rows.push({x,y,w:wid});anchor[iso]=[x,y];
 const host=byIso.get(iso)[0].host.replace(/ \(.*\)/,"");
 const row=gP.append("g").attr("class","prow").attr("data-iso",iso).attr("transform",`translate(${x},${y})`);row.datum({x,y});
 const inner=row.append("g").attr("transform",`translate(${-wid/2},${-fh/2})`);
 const mk=(p,i,cls)=>{const ended=powItems(p,iso).every(z=>z.ended);const g=inner.append("g").attr("class","pf "+(cls||"")+(ended?" ended":"")).attr("data-p",p).attr("transform",`translate(${i*(fw+gap)},0)`).attr("tabindex",0).attr("role","img").attr("aria-label",`${CAPS[p].n} in ${host}${ended?" (ended)":""}`);
  g.append("rect").attr("x",-2).attr("y",-2).attr("width",fw+4).attr("height",fh+4).attr("fill","transparent");
  g.append("use").attr("href","#"+CAPS[p].f).attr("width",fw).attr("height",fh);
  if(ended)g.append("line").attr("x1",0).attr("y1",fh).attr("x2",fw).attr("y2",0).attr("class","endx");
  const on=e=>{drawLines([[p,iso]]);e.clientX!=null?tipShow(powTip(p,iso),e):tipAt(powTip(p,iso),g.node());};
  g.on("mouseenter",on).on("focus",on).on("mouseleave",()=>{if(!pinned){clearLines();tipHide();}}).on("blur",()=>{pinned=false;clearLines();tipHide();})
   .on("click",e=>{e.stopPropagation();pinned=false;on(e);pinned=true;powPanel(p,iso);});
  return g;};
 shown.forEach((p,i)=>mk(p,i));
 if(hid.length){const hs=hid.map((p,i)=>mk(p,shown.length+i,"hidf").style("display","none"));
  const ch=inner.append("g").attr("class","pchip").attr("transform",`translate(${shown.length*(fw+gap)},0)`).attr("tabindex",0).attr("role","button").attr("aria-label",`${hid.length} more: ${hid.map(p=>CAPS[p].n).join(", ")}`);
  ch.append("rect").attr("width",28).attr("height",fh).attr("rx",4);ch.append("text").attr("x",14).attr("y",fh-2.5).attr("text-anchor","middle").text("+"+hid.length);
  const ex=e=>{ch.style("display","none");hs.forEach(h=>h.style("display",null));const h=`<b>${esc(host)}: ${hid.length} more</b><ul>${hid.map(p=>`<li>${esc(CAPS[p].n)}</li>`).join("")}</ul>`;e&&e.clientX!=null?tipShow(h,e):tipAt(h,ch.node());};
  ch.on("mouseenter",ex).on("focus",ex).on("click",e=>{e.stopPropagation();ex(e);});
  row.on("mouseleave",()=>{if(pinned)return;tipHide();ch.style("display",null);hs.forEach(h=>h.style("display","none"));});}
});
window._prow=()=>gP.selectAll(".prow").size();
const cName=f=>{const p=f.properties;return p.ADM0_A3==="SOL"?"Somaliland":p.ADM0_A3==="COG"?"Republic of the Congo":(p.ADMIN||p.NAME);};
const cOver=(e,f)=>{const iso=f.properties.ADM0_A3;if(pinned)return;let sub="";if(byIso.has(iso)){countryOn(iso);const ps=[...new Set(byIso.get(iso).map(x=>x.p))];sub=`<div class="tsub">Foreign involvement: ${ps.map(p=>esc(CAPS[p].n)).join(", ")}</div>`;}
 const h=`<b>${esc(cName(f))}</b>${sub}`;e&&e.clientX!=null&&e.type!=="focus"?tipShow(h,e):tipAt(h,e.currentTarget||e.target);};
const cOut=()=>{if(pinned)return;clearLines();tipHide();};
Z.selectAll("path.country").attr("tabindex",0).attr("aria-label",f=>cName(f)+(byIso.has(f.properties.ADM0_A3)?", foreign involvement":"")).each(function(){d3.select(this).select("title").remove();})
 .on("mouseenter",cOver).on("mousemove",(e,f)=>{if(!pinned&&e.clientX!=null)window._tip&&tipShow(document.getElementById("tip").innerHTML,e);}).on("mouseleave",cOut).on("focus",cOver).on("blur",()=>{pinned=false;cOut();})
 .on("click",(e,f)=>{e.stopPropagation();pinned=false;cOver(e,f);pinned=true;if(PH()){tipHide();window._ctrySheet(f.properties.ADM0_A3,cName(f));}});
gC.selectAll("path.conf").each(function(){d3.select(this).select("title").remove();}).on("click.name",(e,f)=>{pinned=false;cOver(e,f);pinned=true;if(PH())tipHide();}).on("mouseenter",cOver).on("mouseleave",cOut);
Z.select("rect.sea").on("click",()=>{pinned=false;clearLines();tipHide();});
document.addEventListener("click",e=>{if(pinned&&!e.target.closest("#svg")){pinned=false;clearLines();tipHide();}});
const hlConf=isos=>{gHL.selectAll("*").remove();if(!isos)return;gHL.selectAll("path").data(afr.features.filter(f=>isos.includes(f.properties.ADM0_A3))).join("path").attr("d",path).attr("class","hlpath");};
/* labels: region names on dark pills */
const labs=[];
B.regions.forEach(r=>{const pts=Object.values(anchor),[x,y]=proj(r.label),w=r.name.length*4.3+8;let yy=y;
 for(const dy of [0,-18,18,-32,32,-46,46]){if(!pts.some(([px,py])=>Math.abs(px-x)<w+30&&py>y+dy-24&&py<y+dy+12)){yy=y+dy;break;}}labs.push({x,y:yy,a:"middle",t:r.name,c:"#FFE272",cls:"rlabel"});});
const gTop=Z.append("g").attr("class","toplabels");
labs.forEach(L=>{const g=gTop.append("g");const rc=g.append("rect");const t=g.append("text").attr("class",L.cls).attr("x",L.x).attr("y",L.y).attr("text-anchor",L.a).attr("fill",L.c).text(L.t);
 const b=t.node().getBBox();rc.attr("x",b.x-5).attr("y",b.y-2).attr("width",b.width+10).attr("height",b.height+4).attr("rx",(b.height+4)/2);});
/* country labels: full names on dark pills, placed around flag rows */
const gCL=Z.append("g").attr("class","clabels"),CLN=f=>{const p=f.properties;return p.ADM0_A3==="SOL"?"Somaliland":p.ADM0_A3==="COG"?"Republic of the Congo":(p.ADMIN||p.NAME);};
const clData=afr.features.map(f=>({iso:f.properties.ADM0_A3,n:CLN(f),c:path.centroid(f),a:path.area(f)})).filter(d=>isFinite(d.c[0])).sort((a,b)=>(byIso.has(b.iso)-byIso.has(a.iso))||b.a-a.a);
const placeC=k=>{gCL.selectAll("*").remove();const s=1/k,fs=13*s,ob=[];
 rows.forEach(r=>ob.push({x0:r.x-r.w/2*s-3*s,x1:r.x+r.w/2*s+3*s,y0:r.y-9*s,y1:r.y+9*s}));
 gTop.selectAll("rect").each(function(){const b=this.getBBox();ob.push({x0:b.x-2*s,x1:b.x+b.width+2*s,y0:b.y-2*s,y1:b.y+b.height+2*s});});
 const hit=b=>ob.some(o=>b.x0<o.x1&&b.x1>o.x0&&b.y0<o.y1&&b.y1>o.y0),hidden=[];
 const C=[[0,0]];for(const r of [16,24,34,46,60,76])for(let a=0;a<16;a++){const t=a*Math.PI/8;C.push([Math.cos(t)*r*1.6,Math.sin(t)*r]);}
 clData.forEach(d=>{const g=gCL.append("g").attr("class","cl"),ln=g.append("line").attr("class","clead"),rc=g.append("rect"),t=g.append("text").attr("class","clabel").attr("text-anchor","middle").style("font-size",fs+"px").text(d.n);
  let ok=null;for(const [dx,dy] of C){const x=d.c[0]+dx*s,y=d.c[1]+dy*s;t.attr("x",x).attr("y",y+4.5*s);const b=t.node().getBBox(),bb={x0:b.x-5*s,x1:b.x+b.width+5*s,y0:b.y-2*s,y1:b.y+b.height+2*s};
   if(k===1&&(bb.x0<2||bb.x1>W-2||bb.y0<2||bb.y1>H-2))continue;if(!hit(bb)){ok={bb,x,y,dx,dy};break;}}
  if(!ok){g.remove();hidden.push(d.n);return;}ob.push(ok.bb);
  rc.attr("x",ok.bb.x0).attr("y",ok.bb.y0).attr("width",ok.bb.x1-ok.bb.x0).attr("height",ok.bb.y1-ok.bb.y0).attr("rx",(ok.bb.y1-ok.bb.y0)/2);
  if(Math.hypot(ok.dx,ok.dy)>20){ln.attr("x1",d.c[0]).attr("y1",d.c[1]).attr("x2",ok.x).attr("y2",ok.y).style("stroke-width",s);g.insert("circle","line").attr("cx",d.c[0]).attr("cy",d.c[1]).attr("r",2*s).attr("class","cdot");}else ln.remove();});
 window._hiddenLabels=hidden;};
/* placeC(1); kept for later use: country labels now show on hover only */
gP.raise();gPL.raise();
/* legend (short) */
const LS=d3.select("#legsvg"),lg=LS.append("g").attr("class","legend").attr("transform","translate(10,22)");let ly=0;
const offP=new Set(),offC=new Set();let offEnded=false;
const item=(txt,draw,on,click,aria)=>{const g=lg.append("g").attr("class","litem").attr("transform",`translate(0,${ly})`).attr("tabindex",0).attr("role","button").attr("aria-label",aria||txt).attr("aria-pressed",on());
 g.append("rect").attr("class","lhit").attr("x",-6).attr("y",-15).attr("width",228).attr("height",PH()?42:22).attr("y",PH()?-25:-15).attr("rx",4);draw(g);g.append("text").attr("x",32).text(txt);
 const upd=()=>g.classed("off",!on()).attr("aria-pressed",on());const go=()=>{click();upd();syncL();};g.on("click",go).on("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});ly+=PH()?44:24;return upd;};
const head=t=>{lg.append("text").attr("class","lh").attr("y",ly).text(t);ly+=24;};
const ups=[];const syncL=()=>ups.forEach(u=>u());
const cb=id=>document.getElementById(id),setCb=(id,v)=>{cb(id).checked=v;cb(id).onchange({target:{checked:v}});};
head("Conflict deaths, 12 months");lg.append("text").attr("class","lsub").attr("y",ly-6).text("Light to dark red: fewer to more");ly+=18;
[["25 to 99",0],["100 to 499",1],["500 or more",2]].forEach(([t,i])=>ups.push(item(t,g=>g.append("rect").attr("width",20).attr("height",13).attr("y",-11).attr("fill",HC[i]).attr("stroke",i===2?"#F6A8A0":null),()=>cb("L-conf").checked,()=>setCb("L-conf",!cb("L-conf").checked),`Conflict deaths ${t}: toggle conflict layer`)));
ly+=8;head("Foreign powers");lg.append("text").attr("class","lsub").attr("y",ly-6).text("Click to hide or show");ly+=18;
const applyP=()=>{gP.selectAll(".pf").style("display",function(){const p=this.getAttribute("data-p"),en=this.classList.contains("ended");return offP.has(p)||(offEnded&&en)?"none":null;});};
ORD.forEach(p=>ups.push(item(CAPS[p].n,g=>g.append("use").attr("href","#"+CAPS[p].f).attr("x",0).attr("y",-12).attr("width",20).attr("height",13.3),()=>cb("L-pow").checked&&!offP.has(p),()=>{if(!cb("L-pow").checked)setCb("L-pow",true);offP.has(p)?offP.delete(p):offP.add(p);applyP();},`${CAPS[p].n} flags: toggle`)));
ups.push(item("More powers (hover the chip)",g=>{g.append("rect").attr("class","pchipk").attr("width",28).attr("height",13.3).attr("y",-12).attr("rx",4);g.append("text").attr("x",14).attr("y",-1.5).attr("text-anchor","middle").attr("class","pchipt").text("+2");},()=>cb("L-pow").checked,()=>setCb("L-pow",!cb("L-pow").checked),"All foreign power flags: toggle"));
ups.push(item("Ended, for example a withdrawal",g=>{g.append("use").attr("href","#frflag").attr("y",-12).attr("width",20).attr("height",13.3).attr("opacity",.45);g.append("line").attr("x1",0).attr("y1",1.3).attr("x2",20).attr("y2",-12).attr("class","endx");},()=>cb("L-pow").checked&&!offEnded,()=>{offEnded=!offEnded;applyP();},"Ended involvement flags: toggle"));
ly+=8;head("Resources");
const applyR=()=>resSel.style("display",d=>(cb("L-allres").checked||KEY.has(d.id))&&!offC.has(CAT(d.type))?null:"none");
Object.entries(CATS).forEach(([k,c])=>ups.push(item(c.n.replace(/ \(.*\)/,""),g=>g.append("path").attr("d",d3.symbol(c.s,120)()).attr("transform","translate(10,-5)").attr("fill",c.c),()=>cb("L-res").checked&&!offC.has(k),()=>{if(!cb("L-res").checked){offC.clear();Object.keys(CATS).forEach(x=>x!==k&&offC.add(x));setCb("L-res",true);}else offC.has(k)?offC.delete(k):offC.add(k);applyR();},`${c.n}: toggle`)));
LS.attr("viewBox",`0 0 236 ${ly+16}`);const lgR=null,legH=()=>{};
/* layers: defaults are conflict + flags; everything else under More layers, off */
gR.style("display","none");
document.getElementById("L-conf").onchange=e=>{gC.style("display",e.target.checked?null:"none");gH&&gH.style("display",e.target.checked?null:"none");syncL();};
document.getElementById("L-pow").onchange=e=>{gP.style("display",e.target.checked?null:"none");if(!e.target.checked){pinned=false;gPL.selectAll("*").remove();}syncL();};
document.getElementById("L-res").onchange=e=>{gR.style("display",e.target.checked?null:"none");syncL&&syncL();};
document.getElementById("L-allres").onchange=e=>{if(e.target.checked&&!document.getElementById("L-res").checked){document.getElementById("L-res").checked=true;document.getElementById("L-res").onchange({target:{checked:true}});}applyR();};
 /* zoom to region */
 const zoom=d3.zoom().scaleExtent([1,6]).on("zoom",e=>{const k=e.transform.k;zk=k;Z.attr("transform",e.transform);resSel.attr("transform",d=>`translate(${proj(d.lonlat)}) scale(${1/k})`);gP.selectAll(".prow").attr("transform",d=>`translate(${d.x},${d.y}) scale(${1/k})`);gPL.selectAll("*").remove();gCL.selectAll("*").remove();gTop.selectAll("text").style("font-size",(14/e.transform.k)+"px");gTop.selectAll("rect").each(function(){const t=this.nextSibling,b=t.getBBox();d3.select(this).attr("x",b.x-5/e.transform.k).attr("y",b.y-2/e.transform.k).attr("width",b.width+10/e.transform.k).attr("height",b.height+4/e.transform.k).attr("rx",(b.height+4/e.transform.k)/2);});});
 svg.call(zoom).on("wheel.zoom",null).on("dblclick.zoom",null);
 const rb=document.getElementById("reset");rb.onclick=()=>{svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity);rb.classList.remove("show");};
 function openRegion(r,f){const fc={type:"FeatureCollection",features:afr.features.filter(x=>r.countries.includes(x.properties.ADM0_A3))};
  const [[x0,y0],[x1,y1]]=path.bounds(fc),k=Math.min(4,0.8/Math.max((x1-x0)/W,(y1-y0)/H));
  if(!PH()){svg.transition().duration(700).call(zoom.transform,d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));rb.classList.add("show");}
  showR(r,f);const d=document.getElementById("r-"+r.id);if(d)d.open=true;setNews(r.id);}
 window._openRegion=id=>openRegion(B.regions.find(r=>r.id===id));
/* ---------- armed groups: affiliation only ---------- */
const G=B.groups||{},GA=B.galign||{};
const aff=g=>GA[g]?`<span class="aff">${esc(GA[g])}</span>`:"";
const gTip=g=>{const x=G[g];if(!x)return "";const par=x.parent&&G[x.parent]?` · part of ${G[x.parent].name}${G[G[x.parent].parent]?" → "+G[G[x.parent].parent].name:""}`:"";return `${x.full}${par}. Founded ${x.founded}. Area: ${x.area} [${fnNums(x.cites)}]`;};
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
  ${gs.length?`<h4>Armed groups named here</h4><div class="groups">${gs.map(g=>{const x=G[g];return `<div class="grp"><b>${esc(x.name)}</b> ${aff(g)}<br>${esc(x.full)}${x.parent&&G[x.parent]?`. Part of ${esc(G[x.parent].name)}`:""}. Founded ${esc(x.founded)}. ${esc(x.area)}.${fn(x.cites)}</div>`;}).join("")}</div>`:""}
  ${ru.length?`<h4>Russia here</h4>${ru.map(x=>`<p>${esc(x.theatre)}: Russia backs ${esc(x.backs.charAt(0).toLowerCase()+x.backs.slice(1))}${fn(x.backs_cites)} <a href="#backers">Who is fighting whom ↑</a></p>`).join("")}`:""}
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
  L.hex.selectAll("path").data(HX.features.filter(f=>inB(d3.geoCentroid(f)))).join("path").attr("d",pa).attr("fill",f=>HC[f.properties.step-1]).attr("stroke",f=>f.properties.step===3?"#F6A8A0":null).attr("stroke-width",f=>f.properties.step===3?0.7:null).attr("fill-opacity",.85).append("title").text(f=>`${f.properties.country}: ${f.properties.deaths} deaths`);
  
  B.resources.filter(d=>inB(d.lonlat)&&(d.conflict_region===r.id||r.countries.some(c=>(d.country||"").includes(c)))).forEach(d=>{const [x,y]=pj(d.lonlat);L.res.append("path").attr("class","res").attr("fill",CATS[CAT(d.type)].c).attr("d",d3.symbol(CATS[CAT(d.type)].s,90)()).attr("transform",`translate(${x},${y})`).style("cursor","pointer").on("click",()=>resPanel(d)).append("title").text(d.name);});
  B.bri.filter(d=>inB(d.lonlat)&&(d.region===r.id)).forEach(d=>{const [x,y]=pj(d.lonlat);const g=L.bri.append("g").attr("class","bri").attr("transform",`translate(${x},${y+14})`).style("cursor","pointer").on("click",()=>{location.href=briHref(d.id);});FLAG(g,18);g.append("title").text(`China – Belt & Road: ${d.name}, click for the Belt and Road dashboard`);});
  B.russia.filter(x=>RU_REGION[x.id]===r.id&&inB(x.ll)).forEach(x=>{const [px,py]=pj(x.ll);const g=L.ru.append("g").attr("transform",`translate(${px-10},${py-6.7})`).attr("role","img").attr("aria-label","Russia in "+x.theatre).style("cursor","pointer").on("click",()=>{document.getElementById("backers").scrollIntoView();window._cfFilter&&window._cfFilter("ru");});g.append("use").attr("href","#ruflag").attr("width",20).attr("height",13.3);lab(L.ru,px,py,"Russia · "+x.theatre);g.append("title").text(`Russia in ${x.theatre}: backs ${x.backs} [${fnNums(x.cites)}]`);});
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
/* ---------- who is fighting whom, and who backs them ---------- */
const PN=p=>CAPS[p]?CAPS[p].n:p;
const fI=(p,w)=>`<svg class="flagi" width="${w}" height="${(w*2/3).toFixed(1)}" viewBox="-1 -1 32 22" role="img" aria-label="${esc(PN(p))}"><use href="#${CAPS[p]?CAPS[p].f:"cnflag"}"/></svg>`;
const renderConflicts=()=>{const CF=B.conflicts,RN0=Object.fromEntries(B.regions.map(r=>[r.id,r.name]));const ord=B.regions.map(r=>r.id);CF.sort((a,b)=>ord.indexOf(a.region)-ord.indexOf(b.region));
 const hasRu=c=>[...c.a.b,...c.b.b].some(x=>x.p==="Russia");
 const bl=x=>`<li>${fI(x.p,20)}<span><b>${esc(PN(x.p))}:</b> ${esc(x.t)} <i class="tst">${esc(x.st)}</i>${fn(x.cites)}</span></li>`;
 const side=(s,cls)=>`<div class="side ${cls}"><h4>${esc(s.n)}</h4>${(s.g||[]).map(aff).join("")}<ul class="bks">${s.b.length?s.b.map(bl).join(""):'<li class="muted">No foreign state backer in our sources</li>'}</ul></div>`;
 const ru=B.russia;
 document.getElementById("cfsec").innerHTML=`<p>One card per active war. Each side's foreign backers sit under it, with what they provide. Hover a card to light up the war on the map; click it to open the region. Russia backs the governments in the Sahel and the Central African Republic and Haftar's camp in Libya, and has ties to both sides in Sudan.${fn(["reuters-mali-2025","icg-car-2026","rfi-alkhadim-2025","reuters-ru-sudan-base-2025","cnn-wagner-rsf-2023"])} Use the Russia filter to see only those wars.</p>
 <div class="cffilter" role="group" aria-label="Filter conflicts"><button class="chip on" data-f="all" aria-pressed="true">All</button>${[...new Set(CF.map(c=>c.region))].map(r=>`<button class="chip" data-f="${r}" aria-pressed="false">${esc(RN0[r])}</button>`).join("")}<button class="chip" data-f="ru" aria-pressed="false">${fI("Russia",18)} Russia's involvement</button></div>
 <div class="cfgrid">${CF.map(c=>`<article class="cf" data-id="${c.id}" data-r="${c.region}" data-ru="${hasRu(c)?1:0}" tabindex="0"><svg class="cfloc" id="cfl-${c.id}" viewBox="0 0 200 190" role="img" aria-label="Locator map: ${esc(c.title)}"></svg>
  <div class="cfb"><h3>${esc(c.title)}</h3><div class="vs">${side(c.a,"sa")}<div class="vsx" aria-hidden="true">vs</div>${side(c.b,"sb")}</div>
  ${c.med?`<p class="med"><b>Mediators:</b> ${c.med.map(x=>`${fI(x.p,18)} ${esc(PN(x.p))}${fn(x.cites)}`).join(" · ")}</p>`:""}
  <details><summary>Details</summary>${[c.a,c.b].filter(s=>s.m&&s.m.length).map(s=>`<p><b>With ${esc(s.n.split(" (")[0])}:</b> ${esc(s.m.join("; "))}</p>`).join("")}<p><b>Each side's case:</b> ${esc(c.details)}${fn(c.cites)}</p><p><a href="#r-${c.region}">${esc(RN0[c.region])} section ↓</a></p></details></div></article>`).join("")}</div>
 <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;
 const fil=f=>{document.querySelectorAll(".cffilter .chip").forEach(b=>{b.classList.toggle("on",b.dataset.f===f);b.setAttribute("aria-pressed",b.dataset.f===f);});document.querySelectorAll(".cf").forEach(a=>a.hidden=!(f==="all"||a.dataset.r===f||(f==="ru"&&a.dataset.ru==="1")));};
 document.querySelectorAll(".cffilter .chip").forEach(b=>b.onclick=()=>fil(b.dataset.f));window._cfFilter=fil;
 document.querySelectorAll(".cf").forEach(a=>{const c=CF.find(x=>x.id===a.dataset.id);
  a.addEventListener("mouseenter",()=>{hlConf(c.iso);a.classList.add("on");});a.addEventListener("mouseleave",()=>{hlConf(null);a.classList.remove("on");});
  a.addEventListener("focus",()=>hlConf(c.iso));a.addEventListener("blur",()=>hlConf(null));
  a.addEventListener("click",e=>{if(e.target.closest("details,a,sup"))return;const d=document.getElementById("r-"+c.region);if(d){d.open=true;d.scrollIntoView({behavior:"smooth"});}});
  const sv=d3.select("#cfl-"+c.id),fc={type:"FeatureCollection",features:afr.features.filter(f=>c.iso.includes(f.properties.ADM0_A3))};
  const pj=d3.geoMercator().fitExtent([[60,8],[194,182]],fc),pa=d3.geoPath(pj);
  sv.append("rect").attr("width",200).attr("height",190).attr("fill","#0f1b31");
  sv.append("g").selectAll("path").data(afr.features).join("path").attr("d",pa).attr("class",f=>c.iso.includes(f.properties.ADM0_A3)?"lreg":"lland");
  sv.append("g").selectAll("path").data(HX.features.filter(f=>fc.features.some(x=>d3.geoContains(x,d3.geoCentroid(f))))).join("path").attr("d",pa).attr("fill",f=>HC[f.properties.step-1]).attr("stroke",f=>f.properties.step===3?"#F6A8A0":null).attr("stroke-width",f=>f.properties.step===3?0.7:null).attr("fill-opacity",.9);
  const ins=sv.append("g").attr("transform","translate(4,118)");ins.append("rect").attr("width",54).attr("height",66).attr("rx",3).attr("class","insbg");
  const ip=d3.geoMercator().fitExtent([[3,3],[51,63]],afr),ia=d3.geoPath(ip);ins.append("path").attr("d",ia(afr)).attr("class","insaf");ins.append("path").attr("d",ia(fc)).attr("class","insc");});};
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
const goldChart=()=>{const R=B.goldroutes,SK=R.sankey,el=document.getElementById("flowsec");
 el.innerHTML=`<p>Where Africa's declared gold went in ${SK.year}, as recorded by the importing countries, and where the UAE sent gold on. Band width is tonnes.${fn(SK.cites)}</p><p class="prompt skhint">Hover a band to see its tonnes and source, or hover a place to highlight its flows.</p>
 <div class="skwrap"><svg id="goldsvg" class="goldsvg" viewBox="0 0 1320 640" role="img" aria-label="Sankey chart of African gold exports by destination, ${SK.year}"></svg></div><div id="goldph" class="goldph"></div>
 <p class="muted">${esc(SK.note)}${fn(SK.cites)} ${SK.excluded.map(x=>`Left out: ${esc(x.origin)} → ${esc(x.hub)} (${x.tonnes} t), because the ${esc(x.why)}.`).join(" ")}</p>
 <div class="rcards">
  <div class="rcard" style="border-top-color:#FFE272"><h4>1. ${esc(R.uae.label)}</h4><p><b>${R.uae.smuggled.t} t</b> of African gold reached the UAE in ${R.uae.smuggled.year} without being declared for export in Africa. That was 66.5% of the UAE's gold imports from Africa.${fn([R.uae.smuggled.cite])} Over ${R.uae.decade.year} the undeclared total was ${R.uae.decade.t.toLocaleString()} t.${fn([R.uae.decade.cite])}</p><ul>${R.uae.cases.map(c=>`<li>${stB(c.status)} ${esc(c.t)}${fn(c.cites)}</li>`).join("")}</ul></div>
  <div class="rcard" style="border-top-color:#00CBFF"><h4>2. ${esc(R.ch.label)}</h4><p><b>${R.ch.t} t</b> in ${esc(R.ch.year)}.${fn([R.ch.cite])} Over ${R.ch.decade.year}, Switzerland imported ${R.ch.decade.t.toLocaleString()} t of gold from Dubai.${fn([R.ch.decade.cite])}</p><p>${esc(R.ch.note)}${fn([R.ch.decade.cite])}</p></div>
  <div class="rcard" style="border-top-color:#FF80FF"><h4>3. ${esc(R.crypto.label)} ${stB(R.crypto.status)}</h4><p>${esc(R.crypto.t)}${fn(R.crypto.cites)}</p><p>${esc(R.a7.t)}${fn(R.a7.cites)}</p></div>
 </div>
 <h3>Battery minerals</h3><div class="statrow">${B.sankey.battery.map((f,i)=>`<div class="stat" style="border-left-color:${i?"#00CBFF":"#00FF00"}"><div class="big">${f.t.toLocaleString()} t</div><div>${esc(f.from)} → ${esc(f.to)}</div><div class="muted">${esc(f.year)}${fn([f.cite])}</div></div>`).join("")}</div>
 <p class="muted">The two battery figures are different minerals, so they are not drawn on one scale. <a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;
 const sv=d3.select("#goldsvg"),SW=1320,SH=640;
 const OC={"Sahel (Mali, Burkina Faso, Niger)":"#FFE272","Sudan":"#FF80FF","Ghana":"#00FF00","South Africa":"#00CBFF","Guinea":"#FF8E72","Other African countries":"#CC7A00"};
 const links=[...SK.links.map(l=>({source:l.s,target:l.t,value:l.tonnes,k:"in"})),...SK.reexports.map(l=>({source:"UAE",target:l.t,value:l.tonnes,k:"re"}))];
 {/* phone: same flows as stacked bars, one scale, top to bottom */
  const ph=document.getElementById("goldph"),mx=d3.max([...d3.rollups(links.filter(l=>l.k==="in"),v=>d3.sum(v,l=>l.value),l=>l.source).map(d=>d[1]),...d3.rollups(links,v=>d3.sum(v,l=>l.value),l=>l.target).map(d=>d[1])]);
  const nm=k=>k==="UAE"?"United Arab Emirates":k==="USA"?"United States":k==="All other"?"Other destinations":k==="Hong Kong"?"Hong Kong (direct)":String(k).startsWith("UAE → ")?String(k).replace("UAE → ","").replace(/^all other$/,"Other places")+" via UAE":k;const seg=(l,c)=>`<span class="bf" tabindex="0" role="button" style="width:${l.value/mx*100}%;background:${c}" data-tip="${esc(`<b>${nm(l.source)} → ${nm(l.target)}: ${l.value} tonnes (${SK.year||""})</b>`)}" aria-label="${esc(`${nm(l.source)} to ${nm(l.target)}: ${l.value} tonnes`)}"></span>`;
  const grp=(title,keys,by,col)=>`<h4 class="gph">${title}</h4><div class="gbars">${keys.map(k=>{const ls=links.filter(by(k));const t=Math.round(d3.sum(ls,l=>l.value)*10)/10;return `<div class="gbar"><div class="gl2"><span>${esc(nm(k))}</span><b>${t} t</b></div><div class="bt">${ls.sort((a,b)=>b.value-a.value).map(l=>seg(l,col(l))).join("")}</div></div>`;}).join("")}</div>`;
  const ins=links.filter(l=>l.k==="in"),O=[...new Set(ins.map(l=>l.source))].sort((a,b)=>d3.sum(ins.filter(l=>l.source===b),l=>l.value)-d3.sum(ins.filter(l=>l.source===a),l=>l.value));
  const D=[...new Set(ins.map(l=>l.target))].sort((a,b)=>d3.sum(ins.filter(l=>l.target===b),l=>l.value)-d3.sum(ins.filter(l=>l.target===a),l=>l.value));
  const RE=links.filter(l=>l.k==="re").sort((a,b)=>b.value-a.value);
  ph.innerHTML=`<p class="prompt">Tap a bar segment for its tonnes. All bars use one scale.</p><div class="gkey">${Object.entries(OC).map(([k,c])=>`<span><i style="background:${c}"></i>${esc(k)}</span>`).join("")}</div>
   ${grp("1. Where the gold comes from",O,k=>l=>l.k==="in"&&l.source===k,l=>OC[l.source]||"#CC7A00")}
   ${grp("2. First buyer: direct from Africa, or the United Arab Emirates",D,k=>l=>l.k==="in"&&l.target===k,l=>OC[l.source]||"#CC7A00")}
   ${grp("3. What the United Arab Emirates sends on (all origins)",RE.map(l=>l.target),k=>l=>l.k==="re"&&l.target===k,()=>"#00FFE5")}
   <p class="gnote"><b>${SK.smuggled.share}</b> of the United Arab Emirates' African gold imports were not declared at export in Africa (SWISSAID, ${SK.smuggled.year}).${fn([SK.smuggled.cite])}</p>
   <p class="gnote gcr">Crypto step: proceeds are reported to move through the dollar token USDT and the ruble token A7A5. No public source gives a tonnage.</p>`;
  ph.querySelectorAll(".bf").forEach(b=>{const s=e=>{e.stopPropagation();tipAt(b.dataset.tip,b);};b.addEventListener("click",s);b.addEventListener("focus",s);b.addEventListener("mouseenter",e=>tipShow(b.dataset.tip,e));b.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")tipHide();});b.addEventListener("blur",tipHide);});}
 /* two linked stages: Africa -> first destination (UAE is one of them, at the bottom), then a separate UAE onward stage */
 const ins=links.filter(l=>l.k==="in"),res=links.filter(l=>l.k==="re").sort((a,b)=>b.value-a.value);
 let OR=[...new Set(ins.map(l=>l.source))],DS=[...new Set(ins.map(l=>l.target))].filter(d=>d!=="UAE"),DO=[...DS,"UAE"];
 const bc=(n,side,order)=>{const ls=ins.filter(l=>(side?l.target:l.source)===n);return d3.sum(ls,l=>l.value*order.indexOf(side?l.source:l.target))/d3.sum(ls,l=>l.value);};
 for(let it=0;it<10;it++){OR.sort((a,b)=>bc(a,0,DO)-bc(b,0,DO));DS.sort((a,b)=>bc(a,1,OR)-bc(b,1,OR));DO=[...DS,"UAE"];}
 const oi=new Map([...OR,...DO].map((n,i)=>[n,i]));
 const sk=d3.sankey().nodeId(d=>d.name).nodeWidth(12).nodePadding(15).nodeSort((a,b)=>oi.get(a.name)-oi.get(b.name)).extent([[300,46],[640,SH-70]]);
 const G0=sk({nodes:[...OR,...DO].map(name=>({name})),links:ins.map(d=>Object.assign({},d))});
 const U=G0.nodes.find(d=>d.name==="UAE"),ky=(U.y1-U.y0)/U.value,X2=930,rp=12;
 const rtot=d3.sum(res,l=>l.value);let ty=Math.min(U.y0-20,SH-52-(rtot*ky+rp*(res.length-1))),sy=U.y0;
 const RN=res.map(l=>{const h=l.value*ky,n={name:l.target,value:l.value,x0:X2,x1:X2+12,y0:ty,y1:ty+h,sourceLinks:[],targetLinks:[]};const sh=l.value/rtot*(U.y1-U.y0);
  const L={source:U,target:n,value:l.value,k:"re",sa:sy,sb:sy+sh,ta:ty,tb:ty+h};n.targetLinks.push(L);ty+=h+rp;sy+=sh;return [n,L];});
 const rib=l=>{const x0=U.x1,x1=l.target.x0,xm=(x0+x1)/2;return `M${x0},${l.sa}C${xm},${l.sa} ${xm},${l.ta} ${x1},${l.ta}L${x1},${l.tb}C${xm},${l.tb} ${xm},${l.sb} ${x0},${l.sb}Z`;};
 const lab=n=>n==="UAE"?"United Arab Emirates":n==="USA"?"United States":n==="All other"?"Other destinations":n==="Hong Kong"?"Hong Kong (direct)":n.startsWith("UAE → ")?n.replace("UAE → ","").replace(/^all other$/,"Other places")+" via UAE":n;
 sv.append("text").attr("class","skh").attr("x",300).attr("y",24).text("1. From Africa to the first buyer");
 sv.append("text").attr("class","skh").attr("x",X2).attr("y",Math.max(24,RN[0][0].y0-14)).text("2. Sent on by the United Arab Emirates");
 const gA=sv.append("g").attr("fill","none");
 gA.selectAll("path").data(G0.links).join("path").attr("class","skl").attr("d",d3.sankeyLinkHorizontal()).attr("stroke",l=>OC[l.source.name]||"#CC7A00").attr("stroke-width",l=>Math.max(1.5,l.width)).attr("stroke-opacity",.75);
 sv.append("g").selectAll("path").data(RN.map(d=>d[1])).join("path").attr("class","skl skr").attr("d",rib).attr("fill","#00FFE5").attr("fill-opacity",.75).attr("stroke","none");
 const lk=sv.selectAll(".skl").attr("tabindex",0).attr("aria-label",l=>`${lab(l.source.name)} to ${lab(l.target.name)}: ${l.value} tonnes`);
 const op=(l,v)=>sv.selectAll(".skl").each(function(x){const s=d3.select(this);s.attr(x.k==="re"?"fill-opacity":"stroke-opacity",v(x));});
 const ltip=l=>l.k==="re"?`<b>${esc(lab(l.target.name))}: ${l.value} t (${SK.year||""})</b><div class="tsub">Gold of all origins sent on by the United Arab Emirates, not only African. UN Comtrade, imports from the UAE reported by the partner <span class="tfn">[${fnNums(SK.cites)}]</span></div>`:`<b>${esc(l.source.name)} → ${esc(lab(l.target.name))}: ${l.value} t (${SK.year})</b><div class="tsub">${(100*l.value/SK.total).toFixed(1)}% of the African gold drawn. UN Comtrade HS 7108, imports reported by ${l.target.name==="All other"?"the smaller hubs":esc(lab(l.target.name))} <span class="tfn">[${fnNums(SK.cites)}]</span></div>`;
 const dim=l=>op(l,x=>x===l?.95:.3),rst=()=>op(null,()=>.75);
 lk.on("mousemove",(e,l)=>{dim(l);tipShow(ltip(l),e);}).on("mouseleave",()=>{rst();tipHide();})
  .on("focus",function(e,l){dim(l);tipAt(ltip(l),this);}).on("blur",()=>{rst();tipHide();})
  .on("click",(e,l)=>{e.stopPropagation();dim(l);tipShow(ltip(l),e);});
 const ALL=[...G0.nodes,...RN.map(d=>d[0])];
 const nd=sv.append("g").selectAll("g").data(ALL).join("g").attr("class","skn").attr("tabindex",0).attr("aria-label",d=>`${lab(d.name)}: ${Math.round(d.value*10)/10} tonnes`);
 nd.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>Math.max(2,d.y1-d.y0)).attr("rx",4).attr("fill",d=>OC[d.name]||(d.name.startsWith("UAE")?"#00FFE5":"#F5F7FF"));
 const nOn=d=>op(null,l=>l.source===d||l.target===d||(d===U&&l.k==="re")?.95:.15);
 nd.on("mouseenter",(e,d)=>nOn(d)).on("focus",(e,d)=>nOn(d)).on("mouseleave",rst).on("blur",rst);
 const pill=(x,y,txt,anc,cls)=>{const g=sv.append("g").attr("class","skp "+(cls||""));const t=g.append("text").attr("x",x).attr("y",y).attr("text-anchor",anc).text(txt);const b=t.node().getBBox();g.insert("rect","text").attr("x",b.x-6).attr("y",b.y-2).attr("width",b.width+12).attr("height",b.height+4).attr("rx",(b.height+4)/2);return g;};
 ALL.forEach(d=>{const v=Math.round(d.value*10)/10,ym=(d.y0+d.y1)/2+5;
  if(OR.includes(d.name))pill(d.x0-8,ym,`${d.name} ${v} t`,"end");
  else if(d===U)pill(d.x1+8,d.y0-8,`${lab(d.name)} ${v} t in`,"start","skhub");
  else pill(d.x1+8,ym,`${lab(d.name)} ${v} t`,"start");});
 /* keep stacked labels in the right column apart */
 {const col=sv.selectAll(".skp").filter(function(){return +this.querySelector("text").getAttribute("x")>600&&!this.classList.contains("skhub");}).nodes();
  [[600,900],[900,1400]].forEach(([a,b])=>{const ps=col.filter(g=>{const x=+g.querySelector("text").getAttribute("x");return x>a&&x<b;}).sort((p,q)=>p.getBBox().y-q.getBBox().y);let last=-1e9;ps.forEach(g=>{const bb=g.getBBox();const dy=Math.max(0,last+3-bb.y);if(dy)g.setAttribute("transform",`translate(0,${dy})`);last=bb.y+bb.height+dy;});});}
 const sm=SK.smuggled,sg=pill(U.x0-8,U.y1+22,`${sm.share} undeclared at export (SWISSAID, ${sm.year})`,"end","sksm").attr("tabindex",0);
 sg.on("mousemove",e=>tipShow(`<b>Undeclared African gold in the UAE</b><div class="tsub">${esc(sm.what)} <span class="tfn">[${fnNums([sm.cite])}]</span></div>`,e)).on("mouseleave",tipHide).on("focus",function(){tipAt(`<b>Undeclared African gold in the UAE</b><div class="tsub">${esc(sm.what)}</div>`,this);}).on("blur",tipHide);
 const cy=SH-14,cx=U.x1;sv.append("path").attr("class","skc").attr("d",`M${cx},${U.y1}C${cx+80},${U.y1} ${cx+80},${cy} ${X2},${cy}`);
 const cg=pill(X2+8,cy+5,"USDT / A7A5 crypto (reported, no tonnage)","start","skcl").attr("tabindex",0);
 const ct=`<b>UAE → crypto: USDT and A7A5</b><div class="tsub">Status: reported. ${esc(R.crypto.t)} Drawn with no width because no tonnage is published. <span class="tfn">[${fnNums(R.crypto.cites)}]</span></div>`;
 cg.on("mousemove",e=>tipShow(ct,e)).on("mouseleave",tipHide).on("focus",function(){tipAt(ct,this);}).on("blur",tipHide);
 window._sankey={year:SK.year,links:G0.links.length+RN.length,dest:Object.fromEntries(G0.nodes.filter(d=>!OR.includes(d.name)).map(d=>[d.name,Math.round(d.value*10)/10])),order:{OR,DO}};};
const DN=c=>c==="DRC"?"DR Congo":c;
const renderMinerals=()=>{const CN=["DRC","Rwanda","South Africa","Ghana","Nigeria","Madagascar","Namibia","Niger","Zambia","Zimbabwe","Mali","Mozambique","Tanzania","Gabon","Guinea"];
 const ctry=n=>n.startsWith("SOMAIR")?"Niger":n.startsWith("Balama")?"Mozambique":(CN.find(c=>n.startsWith(c)||n.includes("("+c)||n.includes(c+")"))||n.split(" ")[0]);
 const MC={"DRC":"#00CBFF","Rwanda":"#FF80FF","South Africa":"#FFE272","Ghana":"#00FF00","Nigeria":"#CC7A00","Madagascar":"#FF8E72"},OTH="#E52249";
 const by={};B.resources.forEach(r=>{const m=/^([\d.]+)%$/.exec(r.world_share||"");if(!m)return;(by[r.type]??=[]).push({r,v:+m[1],c:ctry(r.name)});});
 const rows=Object.entries(by).map(([t,a])=>({t,a:a.sort((x,y)=>y.v-x.v),v:d3.sum(a,x=>x.v)})).sort((a,b)=>b.v-a.v);
 const yrs=B.resources.filter(r=>/%$/.test(r.world_share||"")).map(r=>+r.year).filter(Boolean);
 const nm=t=>t.charAt(0).toUpperCase()+t.slice(1).replace("-"," ");
 const tipH=(x,y)=>`<b>${esc(nm(x.t))}: Africa ${x.v.toFixed(x.v<10?1:0)}% of world mine output</b><ul>${x.a.map(s=>`<li${s===y?' class="cur"':""}><b>${esc(DN(s.c))}</b> ${s.v}% · ${esc(s.r.quantity)} (${s.r.year}) <span class="tfn">[${fnNums(s.r.cites)}]</span></li>`).join("")}</ul>`;
 document.getElementById("mnsec").innerHTML=`<p class="prompt">Hover or tap a bar to see which countries produce it.</p>
 <div class="mgrid"><div class="mkey mside" role="group" aria-label="Legend: click a country to hide or show it"><b class="sideh">Producer</b>${[...Object.entries(MC),["other","Other producers (named on the bar)",OTH]].map(a=>{const [k,lab,c]=a.length===3?a:[a[0],DN(a[0]),a[1]];return `<button type="button" class="mk" data-k="${esc(k)}" aria-pressed="true"><i style="background:${c}"></i>${esc(lab)}</button>`;}).join("")}</div><div>
 <div class="bars mbars">${rows.map((x,i)=>`<div class="bar" data-i="${i}" tabindex="0" role="button" aria-label="${esc(nm(x.t))}: ${x.v.toFixed(1)}% of world output. ${esc(x.a.map(s=>DN(s.c)+" "+s.v+"%").join(", "))}"><span class="bl">${esc(nm(x.t))}</span><span class="bt">${x.a.map((s,j)=>`<span class="bf" data-j="${j}" data-k="${MC[s.c]?esc(s.c):"other"}" style="width:${s.v}%;background:${MC[s.c]||OTH}"></span>`).join("")}</span><span class="bv">${x.v.toFixed(x.v<10?1:0)}%</span><span class="bc">${esc(x.a.map(s=>DN(s.c)+" "+s.v+"%").join(", "))}${fn([...new Set(x.a.flatMap(y=>y.r.cites))])}</span></div>`).join("")}</div>
 <p class="muted">Bars run from 0 to 100% of world mine output, on one scale, largest first. Each segment is one producer country. USGS figures, ${d3.min(yrs)}–${d3.max(yrs)}. <a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p></div></div>`;
 document.querySelectorAll(".mk").forEach(b=>b.onclick=()=>{const on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",on);b.classList.toggle("off",!on);document.querySelectorAll(`.mbars .bf[data-k="${CSS.escape(b.dataset.k)}"]`).forEach(x=>x.classList.toggle("off",!on));});
 document.getElementById("mnh").textContent=`Africa's share of world mine output, by mineral (US Geological Survey, ${d3.min(yrs)===d3.max(yrs)?d3.max(yrs):d3.min(yrs)+"–"+d3.max(yrs)})`;
 document.querySelectorAll(".mbars .bar").forEach(b=>{const x=rows[+b.dataset.i];
  b.addEventListener("mousemove",e=>{const s=e.target.closest(".bf");tipShow(tipH(x,s?x.a[+s.dataset.j]:null),e);});b.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")tipHide();});b.addEventListener("blur",tipHide);
  b.addEventListener("focus",()=>tipAt(tipH(x),b.querySelector(".bt")));b.addEventListener("blur",tipHide);
  b.addEventListener("click",e=>{e.stopPropagation();const s=e.target.closest(".bf");tipShow(tipH(x,s?x.a[+s.dataset.j]:null),e);});});
 document.addEventListener("click",e=>{if(!e.target.closest(".mbars,#svg,#goldsvg,#goldph"))tipHide();});};
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
  <h3>Foreign-state media active in Africa, by owner state</h3><div class="ogrid">${grp(fs,o=>o.country.split("/")[0]).map(([k,a])=>`<div class="ocard"><h4>${k==="China"?flagI(20)+" ":""}${esc(DN(k))} <span class="cnt">${a.length}</span></h4>${a.map(tag).join("")}</div>`).join("")}</div>
  <h3>Key African and international outlets, by owner</h3><div class="ogrid">${grp(dom,ownerKey).map(([k,a])=>`<div class="ocard"><h4>${esc(DN(k))} <span class="cnt">${a.length}</span></h4>${a.map(tag).join("")}</div>`).join("")}</div>
  <p class="muted"><a href="${SHEET}" target="_blank" rel="noopener">Full data in the Google Sheet ↗</a></p>`;}
 document.getElementById("methodsec").innerHTML=`<ul><li><b>Conflict shading and monthly bars:</b> ${esc(NOTE)} Monthly bars use UCDP GED best estimates by region, counted in the month an event starts. Sudan's October 2025 bar is the RSF capture of El Fasher, which UCDP codes as two events with about 56,700 best-estimate deaths.</li><li><b>Resources, backers, Russia and Belt and Road:</b> every entry carries at least one numbered source. Contested links are marked "reported" or "alleged". Each side's own case is given.</li><li><b>Region explainers:</b> a bottom line, then one claim per paragraph, each with its source number. Descriptive only, with no forecasts or recommendations.</li>
  <li><b>Latest news:</b> fetched ${MD?esc(MD.fetched):"n/a"} from ${MD?MD.feeds_ok:0} of ${MD?MD.feeds_total:0} working RSS feeds. Items from the last 14 days are matched to a region by place and actor names, grouped into same-event stories by headline word overlap, then hung on a standing storyline by keyword match. Unmatched stories go to "Other developments". Non-English headlines are translated locally with NLLB-200 (facebook/nllb-200-distilled-600M), and originals are shown. No .cn sites are fetched.</li>
  <li><b>X posts:</b> read from the free X API for accounts in the source list.</li><li><b>Money flows:</b> the gold chart uses UN Comtrade HS 7108 imports for ${B.goldroutes.sankey.year}, as reported by each importing country (mirror data), so every band is one year. UAE onward exports are partner imports from the UAE and include gold of all origins. The crypto route has no published tonnage and is drawn as a line with no width, marked "reported". Personal names, wallets and web domains are left out.</li><li><b>Sources:</b> numbered in order of first appearance. A repeated source keeps its number.</li></ul>`;};
 const kpis=()=>{const tot=UC?d3.sum(Object.values(UC.series).flat()):null,G=B.goldroutes.uae.smuggled;
  const K=[[tot!=null?tot.toLocaleString():"n/a","conflict deaths in the last 12 months",["ucdp-ged"]],[B.regions.length,"conflict regions covered",[]],[G.t+" t","African gold reached the UAE undeclared in "+G.year,[G.cite]],[B.bri.length,"China Belt and Road projects mapped",[]]];
  document.getElementById("kpis").innerHTML=K.map(([v,t,c])=>`<div class="kpi"><b>${v}</b><span>${esc(t)}</span></div>`).join("");K.forEach(k=>fn(k[2]));};
 const ABBR={"AFC":"Alliance Fleuve Congo, the political wing allied to M23","API":"Application programming interface","CAR":"Central African Republic","CGTN":"China Global Television Network","CSP":"Permanent Strategic Framework, an alliance of northern Mali armed groups","DMCC":"Dubai Multi Commodities Centre, a free zone","DRC":"Democratic Republic of the Congo","EDT":"Eastern Daylight Time","FDLR":"Democratic Forces for the Liberation of Rwanda","GED":"Georeferenced Event Dataset (UCDP)","ISIL":"Islamic State of Iraq and the Levant","ISWAP":"Islamic State West Africa Province","JNIM":"Jama'at Nusrat al-Islam wal-Muslimin, an al-Qa'ida-aligned Sahel federation","KCT":"Kribi Container Terminal","LAPSSET":"Lamu Port, South Sudan, Ethiopia Transport corridor","LLC":"Limited liability company","LNA":"Libyan National Army","LNG":"Liquefied natural gas","LTD":"Limited company","M23":"March 23 Movement, an armed group in eastern DRC","NLLB":"No Language Left Behind, the translation model used","OTC":"Over-the-counter (direct trading outside an exchange)","PLA":"People's Liberation Army (China)","RFI":"Radio France Internationale","RSS":"Really Simple Syndication, a news feed format","SOMAIR":"Société des Mines de l'Aïr, Niger uranium miner","TRT":"Turkish Radio and Television Corporation","U3O8":"Uranium oxide concentrate","USGS":"United States Geological Survey","A7A5":"A ruble-pegged digital token issued by the A7 network","ACLED":"Armed Conflict Location and Event Data","AES":"Alliance of Sahel States","CIR":"Centre for Information Resilience","EU":"European Union","LBMA":"London Bullion Market Association","OFAC":"Office of Foreign Assets Control (US Treasury)","PSB":"Promsvyazbank, a Russian state defence bank","RSF":"Rapid Support Forces (Sudan)","SAF":"Sudanese Armed Forces","UAE":"United Arab Emirates","UCDP":"Uppsala Conflict Data Program","UK":"United Kingdom","UN":"United Nations","US":"United States","USDT":"Tether, a dollar-pegged digital token","VEB.RF":"Russia's state development bank"};
 const abbr=()=>{const txt=document.querySelector("main").innerText;const found=new Set((txt.match(/\b[A-Z][A-Z0-9.]{1,}[A-Z0-9]\b/g)||[]));window._acr=[...found].filter(x=>!ABBR[x]);
  document.getElementById("abbrlist").innerHTML=Object.entries(ABBR).filter(([k])=>found.has(k)||txt.includes(k)).sort().map(([k,v])=>`<dt>${esc(DN(k))}</dt><dd>${esc(v)}</dd>`).join("");};
 document.addEventListener("click",e=>{const x=e.target.closest("sup.fn a");if(x)document.getElementById("srcdet").open=true;});
 kpis();setNews("sahel");renderConflicts();renderMinerals();goldChart();fillRest();abbr();renderSources();
  renderSources();
 /* ---------- phone layout (max 600px): chips, region clusters, bottom sheets, collapsible sections ---------- */
 {const scrim=document.createElement("div");scrim.id="scrim";document.body.appendChild(scrim);
  const closeSheets=()=>{document.querySelectorAll(".sheet-open").forEach(x=>x.classList.remove("sheet-open"));document.body.classList.remove("sheet-on");};
  const addX=el=>{if(el.querySelector(":scope>.shx"))return;const b=document.createElement("button");b.className="shx";b.type="button";b.textContent="Close";b.setAttribute("aria-label","Close details");b.onclick=closeSheets;el.prepend(b);};
  const openSheet=el=>{if(!PH())return;closeSheets();addX(el);el.classList.add("sheet-open");document.body.classList.add("sheet-on");el.scrollTop=0;el.querySelector(".shx").focus({preventScroll:true});};
  scrim.onclick=closeSheets;document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheets();});
  const pEl=document.getElementById("panel");window._onPanel=()=>{if(PH())openSheet(pEl);};
  const side=document.querySelector(".mapside"),fb=document.createElement("button");fb.id="fbtn";fb.type="button";fb.className="fbtn";fb.innerHTML="Filters and legend";fb.setAttribute("aria-haspopup","dialog");
  document.querySelector(".mapgrid").before(fb);fb.onclick=()=>openSheet(side);
  const pr=document.querySelector("#map>.prompt");if(PH()&&pr)pr.textContent="Numbers mark conflict regions, listed under the map with the foreign powers involved. Tap a number, a list row or a country for details.";
  window._sheet={open:id=>openSheet(document.querySelector(id)),close:closeSheets};
  /* country tap on phone: details in the sheet */
  window._ctrySheet=(iso,name)=>{if(!PH())return;const ps=byIso.has(iso)?[...new Set(byIso.get(iso).map(x=>x.p))]:[];
   panel(`<p class="eyebrow">Country</p><h3>${esc(name)}</h3>${ps.length?`<p class="muted">Foreign involvement</p><ul class="plist">${ps.map(p=>`<li><svg class="pfi" viewBox="0 0 20 13.3" aria-hidden="true"><use href="#${CAPS[p].f}" width="20" height="13.3"/></svg><b>${esc(CAPS[p].n)}:</b> ${powItems(p,iso).map(x=>esc(x.t)+(x.ended?" (ended)":"")).join("; ")}</li>`).join("")}</ul>`:`<p>No foreign military or major economic involvement is tracked here.</p>`}`);};
  /* clusters: one pill per region with its foreign powers and a count */
  const gK=Z.append("g").attr("class","kclust");
  const drawK=()=>{gK.selectAll("*").remove();const ls=document.getElementById("rlistph");if(ls)ls.remove();if(!PH())return;const sw=svg.node().getBoundingClientRect().width||390,bs=W/sw;
   const nodes=B.regions.map((r,i)=>{const ps=ORD.filter(p=>r.countries.some(c=>byIso.has(c)&&byIso.get(c).some(x=>x.p===p)));const [x,y]=proj(r.label);return {r,ps,i:i+1,x,y};});
   /* small numbered markers; nudge apart so none overlap */
   const R=12*bs;for(let it=0;it<60;it++)for(const a of nodes)for(const b of nodes){if(a===b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,m=2*R+3*bs;if(d<m){const k=(m-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k;}}
   const go=n=>openRegion(n.r);
   nodes.forEach(n=>{const g=gK.append("g").attr("class","kp").attr("transform",`translate(${n.x},${n.y}) scale(${bs})`).attr("tabindex",0).attr("role","button").attr("aria-label",`${n.i}. ${n.r.name}: ${n.ps.length} foreign powers. Open details`);
    g.append("circle").attr("class","khit").attr("r",22);g.append("circle").attr("class","kbg").attr("r",12);g.append("text").attr("class","kn").attr("y",5).attr("text-anchor","middle").text(n.i);
    g.on("click",e=>{e.stopPropagation();go(n);}).on("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go(n);}});});
   const l=document.createElement("ol");l.id="rlistph";l.className="rlistph";l.setAttribute("aria-label","Conflict regions on the map");
   l.innerHTML=nodes.map(n=>`<li><button type="button" data-r="${n.r.id}"><span class="rn">${n.i}</span><span class="rt">${esc(n.r.name)}</span><span class="rf">${n.ps.slice(0,3).map(p=>`<svg viewBox="0 0 20 13.3" aria-hidden="true"><use href="#${CAPS[p].f}" width="20" height="13.3"/></svg>`).join("")}</span><span class="rc">${n.ps.length} ${n.ps.length===1?"power":"powers"}</span></button></li>`).join("");
   document.querySelector(".mapwrap").after(l);l.querySelectorAll("button").forEach(b=>b.onclick=()=>openRegion(B.regions.find(r=>r.id===b.dataset.r)));
   window._clusters=nodes.map(n=>({id:n.r.id,n:n.ps.length}));};
  drawK();document.getElementById("L-pow").addEventListener("change",e=>gK.style("display",e.target.checked?null:"none"));let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(drawK,200);});
  /* collapsible sections on phone */
  if(PH())["backers","minerals","flows","bri","media","news","regions","method"].forEach((id,i)=>{const s=document.getElementById(id);if(!s)return;const h=s.querySelector(":scope>h2");if(!h)return;
   const b=document.createElement("button");b.type="button";b.className="secbtn";b.setAttribute("aria-expanded",i===0?"true":"false");b.setAttribute("aria-controls",id);b.innerHTML=h.innerHTML;h.innerHTML="";h.appendChild(b);s.classList.add("pcol");if(i)s.classList.add("collapsed");
   b.onclick=()=>{const open=s.classList.toggle("collapsed")===false;b.setAttribute("aria-expanded",open);};});
  document.querySelectorAll('nav a[href^="#"]').forEach(a=>a.addEventListener("click",()=>{const s=document.querySelector(a.getAttribute("href"));if(s&&s.classList.contains("collapsed")){s.classList.remove("collapsed");s.querySelector(".secbtn")?.setAttribute("aria-expanded","true");}}));
 }
 window._fn=()=>({n:FNL.length,ids:FNL});
 window._check=()=>{const ts=[...document.querySelectorAll("svg text")].filter(t=>t.getBBox().width>0&&getComputedStyle(t).display!=="none"&&t.closest("svg").getBoundingClientRect().width>0);
  return {labels:ts.length,minFontPx:Math.min(...ts.map(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a)),small:ts.filter(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a<12.95).map(t=>t.textContent).slice(0,20)};};
});
