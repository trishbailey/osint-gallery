const COL={precursors:"#c8a24a",cocaine:"#e6e9ef","fentanyl / methamphetamine":"#ff6b6b",migrants:"#6aa684",firearms:"#b39ddb",cash:"#5b8fd1"};
const KCOL={rivalry:"#c0504d",alliance:"#6aa684",faction:"#9aa6b8","alleged link":"#c8a24a",service:"#5b8fd1"};
const LV={dominant:.95,significant:.75,present:.35};
const LVI={dominant:"●",significant:"◍",present:"○"},LVW={dominant:"Dominant",significant:"Significant",present:"Minor"};
const shadeG=(c,l)=>l==="dominant"?d3.lab(c).darker(0.7).formatHex():d3.interpolateLab(c,"#ffffff")(l==="significant"?0.42:0.78);
const swatches=c=>`<div class="lvramp"><span class="muted">less</span>${["present","significant","dominant"].map(l=>`<span class="sw" title="${LVW[l]}" style="background:${shadeG(c,l)}"></span>`).join("")}<span class="muted">more</span></div><div class="muted">${LVI.present} Minor · ${LVI.significant} Significant · ${LVI.dominant} Dominant</div>`;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
let SRC={},DM={};const ARCS=["sinaloa-war","cjng","border-fentanyl","ecuador","venezuela-caribbean","colombia","money","mexico","andes","brazil"];
const cite=ids=>FN(ids||[]);
const srcLink=ids=>FN(ids||[]);
const links=ls=>FN((ls||[]).map(l=>({url:l.url,name:l.source,title:l.title})));
const first=s=>{s=String(s||"");const m=s.match(/^.*?[.!?](\s|$)/);return m?m[0]:s};
function drawer(html){$("dbody").innerHTML=html;$("drawer").classList.add("on")}
$("dclose").onclick=()=>$("drawer").classList.remove("on");
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("drawer").classList.remove("on")});
const J=p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.json()});
Promise.all([J("data/sources.json"),J("data/routes.geojson"),J("data/crossings.geojson"),J("data/money_flows.json"),J("data/networks.json"),J("data/china.json"),J("data/events.json"),J("data/territory.json"),J("basemap/latam.topo.json"),
 J("data/violence.json"),J("data/disappearances.json"),J("data/extortion.json"),J("data/mx_states.json"),J("data/seizures.json"),J("data/overdoses.json"),J("data/political_violence.json"),J("data/overview.json"),
 ...ARCS.map(a=>J(`data/arcs/${a}.json`))]).then(([src,routes,cross,money,net,china,events,terr,topo,vio,dis,ext,mxs,seiz,od,pv,ov,...arcs])=>{
  DM={vio,dis,ext,mxs,seiz,od,pv};
  const adm=topojson.feature(topo,topo.objects.admin1);
  src.sources.forEach(s=>SRC[s.id]=s);
  $("asof").textContent=`Reference data as of ${src.as_of} · headlines updated ${events.as_of}`;
  const GC=Object.fromEntries(terr.groups.map(g=>[g.id,g]));
  kpis(net,cross,money,events,terr);
  const M=mapView(topo,adm,terr,routes,cross,china,GC);
  overview(ov,arcs,net,terr,events,M);violenceTile(M);borderTile();
  moneyTile(money);netTile(net,terr);cards(net,terr,M);ticker(events);background(arcs);sources(src);
});
function kpis(net,cross,money,events,terr){
  const fto=net.groups.filter(g=>g.fto).length, s=cross.stats;
  const cm=money.links.filter(l=>l.source==="cmln").reduce((a,l)=>a+l.value,0);
  const today=events.events.filter(e=>e.date===events.as_of).length;
  const K=[[fto,"groups tracked here are US-designated FTOs",srcLink(["FTO"])],
   [s.fy2025_border_fentanyl_lb.toLocaleString()+" lb",`fentanyl seized at the US border, FY2025 (${s.change_vs_fy2024_pct}% vs FY2024)`,srcLink(s.cites)],
   ["$"+cm+"bn","suspicious activity linked to Chinese money laundering networks, 2020-24",srcLink(["FINCEN_CMLN_FTA"])],
   [terr.regions.length,"states and departments with a sourced group footprint",srcLink(["DEA_MAP_SILLA","ACLED_RIFT"])],
   [today,`headlines in today's feed (${events.as_of})`,FN({url:"https://github.com/trishbailey/cartel-dashboard/blob/main/config/sources.yaml",name:"Cartel dashboard",title:"Headline feed list (config/sources.yaml)"})]];
  $("kpis").innerHTML=K.map(k=>`<div class="kpi"><div class="v">${k[0]}</div><div class="l">${k[1]}</div><div class="s">${k[2]}</div></div>`).join("");
}
function mapView(topo,adm,terr,routes,cross,china,GC){
  const svg=d3.select("#mapsvg"),W=svg.node().parentNode.clientWidth||1200,H=Math.round(Math.max(460,Math.min(W*0.62,window.innerHeight-250)));svg.attr("width",W).attr("height",H).style("height",H+"px");
  const view=document.createElement("div");view.className="overlay viewbtns";view.innerHTML='<button class="chip on" data-v="mx">Mexico</button><button class="chip" data-v="all">All Latin America</button><button class="chip" data-v="sa">South America</button>';svg.node().parentNode.appendChild(view);
  const proj=d3.geoConicEqualArea().parallels([-15,20]).rotate([78,0]).center([0,-2]).fitExtent([[10,10],[W-10,H-10]],{type:"MultiPoint",coordinates:[[-118,32.7],[-34.8,-7],[-70,-40],[-55,-34],[-81.3,-5]]});
  const path=d3.geoPath(proj),defs=svg.append("defs"),g=svg.append("g");
  adm.features.forEach(f=>{if(d3.geoArea(f)>2*Math.PI){const rv=p=>p.map(r=>r.slice().reverse());const g=f.geometry;g.coordinates=g.type==='Polygon'?rv(g.coordinates):g.coordinates.map(rv)}});
  const RB=Object.fromEntries(terr.regions.map(r=>[r.id,r]));
  const zoom=d3.zoom().scaleExtent([1,14]).translateExtent([[-W*.2,-H*.2],[W*1.2,H*1.2]]).on("zoom",e=>{g.attr("transform",e.transform);g.selectAll(".pt").attr("transform",function(){return `${this.dataset.t} scale(${1/e.transform.k})`})});svg.call(zoom).on("dblclick.zoom",null);
  const fitBox=(lo0,la0,lo1,la1)=>{const pts=[[lo0,la0],[lo1,la0],[lo0,la1],[lo1,la1],[(lo0+lo1)/2,la0],[(lo0+lo1)/2,la1]].map(proj);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const k=Math.min(14,0.92/Math.max((x1-x0)/W,(y1-y0)/H));return d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2)};
  const VIEWS={mx:fitBox(-117.5,14,-86.5,32.8),all:d3.zoomIdentity,sa:fitBox(-82,-40,-34,13)};
  view.querySelectorAll("button").forEach(b=>b.onclick=()=>{view.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));svg.transition().duration(700).call(zoom.transform,VIEWS[b.dataset.v])});
  g.append("g").selectAll("path").data(topojson.feature(topo,topo.objects.countries).features).join("path").attr("d",path).attr("fill",d=>d.properties.iso==="USA"?"#16243f":"#1b2c4a");
  const pats={};
  const pattern=cols=>{const k=cols.join("-").replace(/#/g,"");if(pats[k])return pats[k];const w=6*cols.length;
    const p=defs.append("pattern").attr("id","p"+k).attr("patternUnits","userSpaceOnUse").attr("width",w).attr("height",w).attr("patternTransform","rotate(45)");
    cols.forEach((c,i)=>p.append("rect").attr("x",i*6).attr("y",0).attr("width",6).attr("height",w).attr("fill",c));return pats[k]=`url(#p${k})`};
  let filt=null,fset=null,mode="groups";
  const dotp={};const dots=c=>{const k=c.replace("#","");if(dotp[k])return dotp[k];const p=defs.append("pattern").attr("id","d"+k).attr("patternUnits","userSpaceOnUse").attr("width",7).attr("height",7);
    p.append("rect").attr("width",7).attr("height",7).attr("fill",c).attr("fill-opacity",.4);p.append("circle").attr("cx",3.5).attr("cy",3.5).attr("r",1.7).attr("fill",c);return dotp[k]=`url(#d${k})`};
  const shade=(c,l)=>l==="dominant"?d3.lab(c).darker(0.7).formatHex():d3.interpolateLab(c,"#ffffff")(l==="significant"?0.42:0.78);
  const lvl=(c,l)=>({f:shade(c,l),o:1});
  const style=d=>{if(mode!=="groups")return chor(d);const r=RB[d.properties.id];if(!r)return{f:"#1b2c4a",o:1};
    if(fset){const e=r.groups.filter(x=>fset.includes(x.group)).sort((a,b)=>LV[b.level]-LV[a.level]);if(!e.length)return{f:"#1b2c4a",o:1};if(e.length===1)return lvl(GC[e[0].group].color,e[0].level);return{f:pattern(e.slice(0,3).map(x=>GC[x.group].color)),o:1}}
    if(filt){const e=r.groups.find(x=>x.group===filt);return e?lvl(GC[filt].color,e.level):{f:"#1b2c4a",o:1}}
    let heavy=r.groups.filter(x=>x.level!=="present");
    if(r.contested&&r.contested.groups.length>1)heavy=r.contested.groups.map(x=>({group:x}));
    const dom=r.groups.filter(x=>x.level==="dominant");if(dom.length===1&&!(r.contested&&r.contested.groups.length>1))heavy=dom;
    if(!heavy.length)return lvl(GC[r.groups[0].group].color,"present");
    if(heavy.length===1){const c=GC[heavy[0].group].color;return r.contested?{f:pattern([c,"#0b1526"]),o:1}:lvl(c,heavy[0].level||"dominant")}
    return{f:pattern(heavy.slice(0,3).map(x=>GC[x.group].color)),o:1}};
  const ad=g.append("g").selectAll("path").data(adm.features).join("path").attr("class","adm").attr("d",path).attr("stroke","none").attr("vector-effect","non-scaling-stroke").attr("stroke-width",1.5).style("cursor",d=>RB[d.properties.id]?"pointer":"default")
    .on("click",(e,d)=>regionShow(d)).on("mouseover",function(){d3.select(this).attr("stroke","#fff").raise()}).on("mouseout",function(){d3.select(this).attr("stroke",this.dataset.s||"none")});
  ad.append("title").text(d=>{const r=RB[d.properties.id];return (d.properties.name||"")+(r?": "+r.groups.map(x=>GC[x.group].name).join(", "):"")});
  const paint=()=>ad.each(function(d){const s=style(d);this.dataset.s=s.s||"";d3.select(this).attr("fill",s.f).attr("fill-opacity",s.o).attr("stroke",s.s||"none")});paint();
  g.append("path").datum(topojson.mesh(topo,topo.objects.admin1,(a,b)=>a!==b&&a.properties.iso===b.properties.iso&&a.properties.iso!=="USA")).attr("d",path).attr("fill","none").attr("stroke","#0b1526").attr("stroke-width",.6).attr("vector-effect","non-scaling-stroke").style("pointer-events","none");
  g.append("path").datum(topojson.mesh(topo,topo.objects.countries)).attr("d",path).attr("fill","none").attr("stroke","#8fa3c4").attr("stroke-width",1).attr("vector-effect","non-scaling-stroke").style("pointer-events","none");
  function regionShow(d){const r=RB[d.properties.id],mx=stateStats(d.properties.id);if(!r){drawer(`<h2>${esc(d.properties.name||"")}</h2>${mx}<p class="muted">No sourced group footprint is mapped here. That reflects data coverage, not an absence of organized crime.</p>`);return}
    drawer(`<h2>${esc(r.name)}</h2><div class="muted">${esc(r.iso)}</div>`+mx+(r.contested?`<h3>Contested</h3><div class="rg">${r.contested.groups.map(x=>`<span class="dot" style="background:${GC[x].color}"></span> ${esc(GC[x].name)}`).join(" vs ")}<div>${esc(r.contested.note)}</div>${cite(r.contested.cites)}</div>`:"")+
    "<h3>Groups active</h3>"+r.groups.slice().sort((a,b)=>LV[b.level]-LV[a.level]).map(x=>`<div class="rg"><span class="dot" style="background:${GC[x.group].color}"></span> <b>${esc(GC[x.group].name)}</b> <span class="lvl"><b>${LVI[x.level]} ${LVW[x.level]}</b> · ${esc(terr.levels[x.level])}${r.contested&&r.contested.groups.includes(x.group)?" · contests":""}</span>${x.note?`<div>${esc(x.note)}</div>`:""}${cite(x.cites)}</div>`).join(""))}
  // legend chips = filter
  const used=new Set(terr.regions.flatMap(r=>r.groups.map(x=>x.group)));
  const L=$("grouplegend");L.innerHTML=`<button class="chip on" data-g="">All groups</button>`+terr.groups.filter(x=>used.has(x.id)).map(x=>`<button class="chip" data-g="${x.id}"><span class="dot" style="background:${x.color}"></span>${esc(x.name)}</button>`).join("");
  const setF=id=>{filt=id||null;fset=null;L.querySelectorAll(".chip").forEach(b=>b.classList.toggle("on",b.dataset.g===(id||"")));paint();key()};
  L.querySelectorAll(".chip").forEach(b=>b.onclick=()=>setF(b.dataset.g));
  const key=()=>$("keybox").innerHTML=mode!=="groups"?chorKey():fset?`<b>Storyline groups</b><br>`+fset.map(x=>`<span class="dot" style="background:${GC[x].color}"></span> ${esc(GC[x].name)}`).join("<br>"):filt?`<b>${esc(GC[filt].name)}</b>`+swatches(GC[filt].color)
    :`<b>Presence</b>${swatches("#e4572e")}<span class="sw hatch"></span> ▧ Contested / shared (wide stripes)<br><span class="sw" style="background:#1b2c4a;border:1px solid #3a5583"></span> No sourced footprint`;key();
  $("mapnotes").innerHTML=`<p>${esc(terr.note)}</p><h3>Where footprint data is thin</h3><ul>${terr.thin.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  // overlays
  const proj2=c=>proj(c);
  const layers={};const og=g.append("g");
  const mk=(k,label,color,draw)=>{layers[k]=og.append("g").style("display","none");draw(layers[k]);
    const lab=document.createElement("label");lab.dataset.k=k;lab.innerHTML=`<input type="checkbox"> <span class="dot" style="background:${color}"></span> ${label}`;lab.querySelector("input").onchange=e=>layers[k].style("display",e.target.checked?null:"none");$("layers").appendChild(lab)};
  const rshow=p=>drawer(`<h2>${esc(p.name)}</h2><span class="tag">${esc(p.kind||p.category||"")}</span>${p.commodity?`<span class="tag">${esc(p.commodity)}</span>`:""}<p>${esc(p.text)}</p>${p.says_vs_does?`<p class="says">Says vs does: ${esc(p.says_vs_does)}</p>`:""}${cite(p.cites)}`);
  const lines=(sel,feat,color)=>{const dash=d=>d.properties.confidence==="reported"?null:"6 4";
    sel.append("g").selectAll("path").data(feat).join("path").attr("d",path).attr("fill","none").attr("stroke","#0b1526").attr("stroke-opacity",.9).attr("stroke-width",5).attr("stroke-linecap","round").attr("vector-effect","non-scaling-stroke").style("pointer-events","none");
    sel.append("g").selectAll("path").data(feat).join("path").attr("class","ovl").attr("d",path).attr("fill","none").attr("stroke",color).attr("stroke-width",2.5).attr("stroke-linecap","round").attr("stroke-dasharray",dash).attr("vector-effect","non-scaling-stroke").style("cursor","pointer").on("click",(e,d)=>rshow(d.properties)).append("title").text(d=>d.properties.name)};
  const drug=routes.features.filter(f=>["cocaine","fentanyl / methamphetamine","precursors"].includes(f.properties.commodity));
  mk("drug","Drug and precursor routes","#ff6b6b",s=>lines(s,drug,"#ff6b6b"));
  mk("other","Migrant and firearm routes","#6aa684",s=>lines(s,routes.features.filter(f=>["migrants","firearms"].includes(f.properties.commodity)),"#6aa684"));
  mk("money","Cash and money routes","#5b8fd1",s=>lines(s,routes.features.filter(f=>f.properties.commodity==="cash"),"#5b8fd1"));
  mk("cross","Border crossings and hubs","#ffffff",s=>{const n=s.selectAll("g").data(cross.features).join("g").attr("class","pt").attr("data-t",d=>`translate(${proj2(d.geometry.coordinates)})`).attr("transform",d=>`translate(${proj2(d.geometry.coordinates)})`).style("cursor","pointer").on("click",(e,d)=>rshow(d.properties));n.append("circle").attr("r",4).attr("fill","#fff").attr("stroke","#0b1526");n.append("title").text(d=>d.properties.name)});
  const CHI={precursors:["⚗","#c8a24a","Precursor chemicals"],ports:["⚓","#5b8fd1","Ports"],money:["$","#6aa684","Money laundering"],loans:["¥","#e07a5f","Loans / finance"]};
  mk("china",`China-linked sites (${china.items.filter(i=>i.lonlat).length})`,"#c8a24a",s=>{const n=s.selectAll("g").data(china.items.filter(i=>i.lonlat)).join("g").attr("class","pt").attr("data-t",d=>`translate(${proj2(d.lonlat)})`).attr("transform",d=>`translate(${proj2(d.lonlat)})`).style("cursor","pointer").on("click",(e,d)=>drawer(`<h2>${esc(d.title)}</h2><span class="tag">${esc((CHI[d.category]||[0,0,d.category])[2])}</span><p>${esc(d.text)}</p>${d.says_vs_does?`<p class="says">Says vs does: ${esc(d.says_vs_does)}</p>`:""}${cite(d.cites)}`));
    n.append("circle").attr("r",10).attr("fill",d=>(CHI[d.category]||[0,"#c8a24a"])[1]).attr("stroke","#0b1526").attr("stroke-width",1.5);n.append("text").attr("text-anchor","middle").attr("dy","0.35em").attr("fill","#0b1526").style("font-weight","800").style("font-size","12px").text(d=>(CHI[d.category]||["?"])[0]);n.append("text").attr("class","lbl").attr("x",13).attr("y",4).text(d=>d.title);
    setTimeout(()=>{const lb=$("layers").querySelector('label[data-k="china"]');if(lb)lb.insertAdjacentHTML("beforeend",`<div class="chleg">${Object.values(CHI).map(([i,c,l])=>`<span><i style="background:${c}">${i}</i>${l}</span>`).join("")}</div>`)},0)});
  // choropleth modes (Mexico states)
  const byReg={},clave={};DM.mxs.states.forEach(x=>{byReg[x.region]=x;clave[x.clave]=x.region});
  const CH={homicide:{label:"Homicide victims per 100,000, last 12 months",val:id=>{const x=byReg[id];return x?homRate(x.clave):null},src:DM.vio},
    disap:{label:"Disappeared and missing, not located, per 100,000 (cumulative)",val:id=>{const x=byReg[id],v=DM.dis.states.find(s=>s.region===id);return x&&v?v.v/x.pop*1e5:null},src:DM.dis},
    extort:{label:"Extortion incidents per 100,000 adults (ENVIPE 2025)",val:id=>{const v=DM.ext.states.find(s=>s.region===id);return v?v.v:null},src:DM.ext}};
  let sc=null;
  function chor(d){const v=CH[mode].val(d.properties.id);if(v==null)return{f:d.properties.iso==="MEX"?"#1b2c4a":"#16243f",o:d.properties.iso==="MEX"?1:.5};return{f:sc(v),o:.95}}
  function chorKey(){const c=CH[mode],[a,b]=sc.domain();const st=c.src;return `<b>${esc(c.label)}</b><div class="ramp" style="background:linear-gradient(90deg,${sc(a)},${sc((a+b)/2)},${sc(b)})"></div><div class="rampl"><span>less · ${Math.round(a).toLocaleString()}</span><span>${Math.round(b).toLocaleString()} · more</span></div><div class="muted">${esc(mode==="homicide"?"12 months to "+fmtM(st.last):mode==="disap"?"As of "+st.as_of:st.survey)}. Source: ${srcLink(st.cites)}${st.substitute?" (substitute, see notes)":""}</div>`}
  const MB=document.createElement("div");MB.className="overlay modebtns";MB.innerHTML='<b>Shade Mexico by</b><br>'+[["groups","Group presence"],["homicide","Homicide rate"],["disap","Disappearances"],["extort","Extortion"]].map(([k,l])=>`<button class="chip${k==="groups"?" on":""}" data-m="${k}">${l}</button>`).join("");svg.node().parentNode.appendChild(MB);
  const setMode=m=>{mode=m;MB.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.m===m));if(m!=="groups"){const vs=DM.mxs.states.map(x=>CH[m].val(x.region)).filter(v=>v!=null);sc=d3.scaleSequential([0,d3.max(vs)],d3.interpolateLab("#fde4d8","#7a1712"))}$("grouplegend").classList.toggle("dim",m!=="groups");paint();key()};
  MB.querySelectorAll("button").forEach(b=>b.onclick=()=>setMode(b.dataset.m));
  // seizures by area of responsibility, sized, placed at the area's main crossing (approximate)
  const AOR={"San Diego":[[-117.03,32.55],["San Diego Field Office","San Diego Sector"]],"El Centro":[[-115.5,32.68],["El Centro Sector"]],"Yuma":[[-114.62,32.49],["Yuma Sector"]],"Tucson":[[-110.94,31.34],["Tucson Field Office","Tucson Sector"]],
    "El Paso":[[-106.45,31.75],["El Paso Field Office","El Paso Sector"]],"Big Bend":[[-103.2,29.35],["Big Bend Sector"]],"Del Rio":[[-100.9,29.36],["Del Rio Sector"]],"Laredo":[[-99.5,27.5],["Laredo Field Office","Laredo Sector"]],"Rio Grande Valley":[[-98.2,26.1],["Rio Grande Valley Sector"]]};
  const last12=DM.seiz.national.fentanyl.slice(-12).map(p=>p.m),DR=["fentanyl","methamphetamine","cocaine"],DC={fentanyl:"#ff6b6b",methamphetamine:"#f4d35e",cocaine:"#e6e9ef"};
  const ap=Object.entries(AOR).map(([n,[ll,ks]])=>{const by={};DR.forEach(d=>by[d]=d3.sum(ks,k=>d3.sum(((DM.seiz.aor[k]||{})[d]||[]).filter(p=>last12.includes(p.m)),p=>p.lb)));return{name:n,ll,ks,by,tot:d3.sum(DR,d=>by[d])}});
  const rr=d3.scaleSqrt([0,d3.max(ap,a=>a.tot)],[0,26]);
  mk("seiz","Drug seizures by border area (last 12 months)","#ff6b6b",s=>{const n=s.selectAll("g").data(ap).join("g").attr("class","pt").attr("data-t",d=>`translate(${proj(d.ll)})`).attr("transform",d=>`translate(${proj(d.ll)})`).style("cursor","pointer").on("click",(e,d)=>drawer(`<h2>${esc(d.name)} border area</h2><p class="muted">CBP areas: ${esc(d.ks.join(", "))}. ${esc(last12[0])} to ${esc(last12[11])}. Marker sits at the area's main crossing (approximate).</p>${DR.map(k=>`<div class="rg"><span class="dot" style="background:${DC[k]}"></span> <b>${esc(k)}</b>: ${Math.round(d.by[k]).toLocaleString()} lb</div>`).join("")}<div class="muted">Fentanyl, meth and cocaine combined, lb per month</div>${spark(DM.seiz.national.fentanyl.slice(-24).map(p=>({m:p.m,v:d3.sum(d.ks,k=>d3.sum(DR,dr=>(((DM.seiz.aor[k]||{})[dr]||[]).find(q=>q.m===p.m)||{lb:0}).lb))})),{unit:" lb"})}<p class="note">${esc(DM.seiz.note)}</p>${cite(DM.seiz.cites)}<div class="cite"><a href="${esc(DM.seiz.source_url)}" target="_blank" rel="noopener">CBP CSV</a></div>`));
    n.append("circle").attr("r",d=>rr(d.tot)).attr("fill","#ff6b6b").attr("fill-opacity",.45).attr("stroke","#ff6b6b").attr("stroke-width",1.5);n.append("text").attr("class","lbl").attr("x",d=>rr(d.tot)+4).attr("y",4).text(d=>`${d.name} ${d.tot>=1000?Math.round(d.tot/1000).toLocaleString()+"k":Math.round(d.tot)} lb`);n.append("title").text(d=>`${d.name}: ${Math.round(d.tot).toLocaleString()} lb fentanyl+meth+cocaine, last 12 months`)});
  mk("pv","Killings of mayors and journalists (since Oct 2024)","#f15bb5",s=>{const n=s.selectAll("g").data(DM.pv.events).join("g").attr("class","pt").attr("data-t",d=>`translate(${proj(d.lonlat)})`).attr("transform",d=>`translate(${proj(d.lonlat)})`).style("cursor","pointer").on("click",(e,d)=>pvShow(d));
    n.append("text").attr("class","pvl").attr("text-anchor","middle").attr("dy","0.35em").attr("fill","#f15bb5").attr("stroke","#0b1526").attr("stroke-width",3).attr("paint-order","stroke").style("font-weight","800").style("font-size","15px").text(d=>d.kind==="official"?"M":"J");
    setTimeout(()=>{const lb=$("layers").querySelector('label[data-k="pv"]');if(lb)lb.querySelector(".dot").outerHTML='<span class="pvk">M</span> mayors <span class="pvk">J</span> journalists ·'},0);n.append("title").text(d=>`${d.date} ${d.name} (${d.role}), ${d.place}`)});
  fetch("data/capture.json").then(r=>r.json()).then(cp=>{const tot={};cp.countries.forEach(c=>tot[c.country]=c);const mx=d3.max(cp.countries,c=>c.total);
    const col=d3.scaleSequential([0,mx],d3.interpolateRgb("#f6d2c4","#7a0f0f"));const fc=topojson.feature(topo,topo.objects.countries).features.filter(f=>tot[f.properties.iso]);
    mk("corr",`Documented corruption cases (${cp.cases.length})`,"#b23a2e",s=>{s.selectAll("path").data(fc).join("path").attr("d",path).attr("fill",d=>col(tot[d.properties.iso].total)).attr("fill-opacity",.6).attr("stroke","#0b1526").attr("vector-effect","non-scaling-stroke").style("cursor","pointer")
      .on("click",(e,d)=>{const c=tot[d.properties.iso];drawer(`<h2>${esc(c.name)}: ${c.total} documented corruption cases</h2><p>${Object.entries(c.by_status).map(([k,v])=>`${v} ${esc(k)}`).join(" · ")}</p><p class="muted">${Object.entries(c.by_level).map(([k,v])=>`${v} ${esc(k)}`).join(", ")}. Full list with sources: &ldquo;Documented corruption cases&rdquo; section lower on the page.</p>`)}).append("title").text(d=>`${tot[d.properties.iso].name}: ${tot[d.properties.iso].total} cases`);
      s.selectAll("text").data(fc).join("text").attr("transform",d=>`translate(${path.centroid(d)})`).attr("text-anchor","middle").attr("fill","#fff").attr("stroke","#0b1526").attr("stroke-width",2.5).attr("paint-order","stroke").attr("font-size",12).attr("font-weight",700).style("pointer-events","none").text(d=>tot[d.properties.iso].total)})}).catch(e=>console.warn("capture overlay",e));
  svg.call(zoom.transform,VIEWS.mx);
  const layerOn=(k,on)=>{const lab=[...$("layers").querySelectorAll("label")].find(l=>l.dataset.k===k);if(lab){lab.querySelector("input").checked=on;layers[k].style("display",on?null:"none")}};
  return {setF:id=>{setF(id);document.querySelector(".maptile").scrollIntoView({behavior:"smooth"})},setMode,layerOn,
    story:sl=>{setMode("groups");setF("");fset=sl.groups&&sl.groups.length?sl.groups:null;L.querySelectorAll(".chip").forEach(b=>b.classList.remove("on"));paint();key();
      Object.keys(layers).forEach(k=>layerOn(k,(sl.layers||[]).includes(k)));svg.transition().duration(800).call(zoom.transform,fitBox(...sl.view));document.querySelector(".maptile").scrollIntoView({behavior:"smooth"})}};
}
function moneyTile(m){
  $("moneyunit").textContent=m.unit;
  const el=$("sankey"),W=el.parentNode.clientWidth-28,H=300;const svg=d3.select(el).attr("width",W).attr("height",H);
  const {nodes,links}=d3.sankey().nodeId(d=>d.id).nodeWidth(14).nodePadding(26).extent([[8,22],[W-200,H-8]])({nodes:m.nodes.map(d=>({...d})),links:m.links.map(d=>({...d}))});
  const gc={source:"#c8a24a",channel:"#5b8fd1",use:"#6aa684"};
  svg.append("g").selectAll("path").data(links).join("path").attr("d",d3.sankeyLinkHorizontal()).attr("fill","none").attr("stroke","#5b8fd1").attr("stroke-opacity",.4).attr("stroke-width",d=>Math.max(2,d.width)).style("cursor","pointer")
   .on("click",(e,d)=>drawer(`<h2>${esc(d.source.name)} → ${esc(d.target.name)}</h2><p><b>$${d.value}bn</b> (${esc(d.period||"")}, ${esc(d.status||"")})</p><p class="note">${esc(m.unit)}</p>${cite(d.cites)}`)).append("title").text(d=>`${d.source.name} → ${d.target.name}: $${d.value}bn`);
  const n=svg.append("g").selectAll("g").data(nodes).join("g");
  n.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>Math.max(2,d.y1-d.y0)).attr("fill",d=>gc[d.group]);
  n.append("text").attr("class","lbl").attr("x",d=>d.group==="source"?d.x1+6:d.group==="use"?d.x1+6:d.x0).attr("y",d=>d.group==="channel"?d.y0-5:(d.y0+d.y1)/2+4).text(d=>{const nm=d.name.length>34?d.name.slice(0,32)+"…":d.name;return d.group==="source"?`$${d.value}bn total`:`${nm} $${d.value}bn`});
  $("moneycav").innerHTML=`Covers only one channel: suspicious-activity reports tied to Chinese money-laundering networks filed with FinCEN, 2020-2024 (one source, one unit). Not total cartel money. <a href="#" onclick="document.querySelector('#moneycov').scrollIntoView({behavior:'smooth'});return false">Other channels ▾</a>`;
  const CH=[["Chinese money-laundering networks (bank/MSB reports)","$312bn reported suspicious activity, 2020-24",["FINCEN_CMLN_FTA"]],["Real estate","$53.7bn of the CMLN reports (overlapping tag)",["FINCEN_CMLN_FTA"]],["Trade-based laundering","$9.7bn of the CMLN reports (overlapping tag)",["FINCEN_CMLN_FTA"]],["Fentanyl-related bank reports","$1.4bn, 2024",["FINCEN_FENT_FTA"]],["Bulk cash smuggled south","no sourced figure",[]],["Remittances","no sourced figure",[]],["Crypto","no sourced figure",[]],["Fuel theft (huachicol)","no sourced figure",[]],["Extortion","no sourced figure in USD",[]]];
  $("moneycov").innerHTML=`<h3>Money channels: what has a sourced figure</h3><table class="mcov">${CH.map(([a,b,c])=>`<tr><td>${esc(a)}</td><td class="${/no sourced/.test(b)?"muted":""}">${esc(b)}${c.length?cite(c):""}</td></tr>`).join("")}</table><div class="small muted">Rows without a figure are known channels where no credible, sourced annual figure was found. Report figures are amounts flagged, not proven laundering.</div>`;
  $("moneymore").innerHTML=`<p><b>${esc(m.takeaway)}</b></p><p>${esc(m.summary)}</p><h3>Typologies flagged (overlapping)</h3>${m.typologies.map(t=>`<div>${esc(t.name)}: $${t.value}bn</div>`).join("")}${cite(["FINCEN_CMLN_FTA"])}<h3>Related</h3>${m.related.map(r=>`<div><b>${esc(r.name)}</b>${r.value?` ($${r.value}bn)`:""}: ${esc(r.text||"")}${cite(r.cites)}</div>`).join("")}<p class="note">${esc(m.notes)}</p>`;
}
function netTile(net,terr){
  const el=$("netsvg"),W=Math.max(380,el.parentNode.clientWidth-28),H=520;const svg=d3.select(el).attr("width",W).attr("height",H).attr("viewBox",`0 0 ${W} ${H}`);
  const tc=Object.fromEntries(terr.groups.filter(g=>g.network_id).map(g=>[g.network_id,g.color]));
  const COLS=[["Mexico",["chapitos","mayiza","sinaloa","juarez","cjng","unidos","viagras","gulf","cdn"],.02,0],["Central America",["ms13","b18","cmln"],.52,0],["Andes",["tda","soles","segmar","eln","choneros","lobos"],.52,4],["Brazil",["pcc","cv"],.52,11]];
  const by=Object.fromEntries(net.groups.map(g=>[g.id,{...g}]));const nodes=[];
  COLS.forEach(([lab,ids,fx,row])=>{const y0=22+row*36;svg.append("text").attr("class","nethd").attr("x",W*fx).attr("y",y0).text(lab);ids.filter(i=>by[i]).forEach((id,i)=>{const d=by[id];d.x=W*fx+6;d.y=y0+22+i*34;nodes.push(d)})});
  const edges=net.edges.filter(e=>by[e.source]&&by[e.target]&&by[e.source].x!=null&&by[e.target].x!=null).map(e=>({...e,source:by[e.source],target:by[e.target]}));
  const ST={alliance:["#4caf50",3,null],rivalry:["#e0605c",2.5,"6 4"],service:["#9aa6b8",1.4,null],"alleged link":["#9aa6b8",1.4,"2 3"],faction:["#9aa6b8",1.4,null]};
  $("netlegend").innerHTML=`<span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#4caf50" stroke-width="3"/></svg> alliance</span> <span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#e0605c" stroke-width="2.5" stroke-dasharray="6 4"/></svg> ✕ rivalry / war</span> <span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#9aa6b8" stroke-width="1.4"/></svg> faction / business / service</span> <span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#9aa6b8" stroke-width="1.4" stroke-dasharray="2 3"/></svg> alleged link</span>`;
  const cp=d=>{const sx=d.source.x,sy=d.source.y,tx=d.target.x,ty=d.target.y;const same=Math.abs(sx-tx)<5;const mx=same?sx+40+Math.abs(sy-ty)*.35:(sx+tx)/2,my=same?(sy+ty)/2:(sy+ty)/2-18;return [mx,my]};
  const eg=svg.append("g").selectAll("g").data(edges).join("g").attr("class","ne").style("cursor","pointer").on("click",(e,d)=>drawer(`<h2>${esc(d.source.name)} and ${esc(d.target.name)}</h2><span class="tag">${esc(d.kind)}</span><p>${esc(d.text)}</p>${cite(d.cites)}`));
  eg.append("path").attr("d",d=>{const [mx,my]=cp(d);return `M${d.source.x},${d.source.y}Q${mx},${my} ${d.target.x},${d.target.y}`}).attr("fill","none").attr("stroke",d=>ST[d.kind][0]).attr("stroke-width",d=>ST[d.kind][1]).attr("stroke-dasharray",d=>ST[d.kind][2]);
  eg.filter(d=>d.kind==="rivalry").append("text").attr("class","nx").attr("text-anchor","middle").attr("dy","0.35em").attr("transform",d=>{const [mx,my]=cp(d);return `translate(${(d.source.x+2*mx+d.target.x)/4},${(d.source.y+2*my+d.target.y)/4})`}).text("✕");
  eg.append("title").text(d=>`${d.source.name} – ${d.target.name}: ${d.kind}`);
  const n=svg.append("g").selectAll("g").data(nodes).join("g").attr("transform",d=>`translate(${d.x},${d.y})`).style("cursor","pointer").on("click",(e,d)=>drawer(groupHtml(d,net)))
   .on("mouseenter",(e,d)=>{eg.classed("dim",x=>x.source!==d&&x.target!==d);n.classed("dim",x=>x!==d&&!edges.some(k=>(k.source===d&&k.target===x)||(k.target===d&&k.source===x)))}).on("mouseleave",()=>{eg.classed("dim",false);n.classed("dim",false)});
  n.append("circle").attr("r",6).attr("fill",d=>tc[d.id]||"#9aa6b8").attr("stroke","#e6e9ef").attr("stroke-width",d=>d.fto?1.5:0);
  n.append("text").attr("class","netl").attr("x",9).attr("y",4).attr("fill",d=>tc[d.id]||"#c3ccd9").text(d=>d.name.split(" (")[0].replace(/^Cartel (de |del )?/,"").replace(/^Chinese money laundering networks?/i,"Chinese money brokers").slice(0,24));
}
function chinaTile(c){
  const ab={precursors:"PRE",ports:"PRT",money:"$",finance:"$",laundering:"$",infrastructure:"INF"};
  const cc={precursors:"#c8a24a",ports:"#5b8fd1",money:"#6aa684",finance:"#6aa684",laundering:"#6aa684"};
  const cnt=d3.rollups(c.items,v=>v.length,i=>i.category).sort((a,b)=>b[1]-a[1]),mx=d3.max(cnt,x=>x[1]);
  $("china").innerHTML=`<div class="chbars">${cnt.map(([k,n])=>`<div class="chb"><span class="ico sm" style="background:${cc[k]||"#9aa6b8"}">${esc(ab[k]||k.slice(0,3).toUpperCase())}</span><i style="width:${100*n/mx}%;background:${cc[k]||"#9aa6b8"}"></i><b>${n}</b></div>`).join("")}</div>`+c.items.map((i,k)=>`<div class="ch" data-k="${k}"><div class="ico" style="background:${cc[i.category]||"#9aa6b8"}">${esc(ab[i.category]||i.category.slice(0,3).toUpperCase())}</div><div class="t">${esc(i.title)}${FN(i.cites)}</div></div>`).join("");
  $("china").querySelectorAll(".ch").forEach(el=>el.onclick=()=>{const i=c.items[+el.dataset.k];drawer(`<h2>${esc(i.title)}</h2><span class="tag">${esc(i.category)}</span><p>${esc(i.text)}</p>${i.says_vs_does?`<p class="says">Says vs does: ${esc(i.says_vs_does)}</p>`:""}${cite(i.cites)}`)});
}
function groupHtml(x,net){const nm=Object.fromEntries(net.groups.map(g=>[g.id,g.name]));const es=net.edges.filter(e=>e.source===x.id||e.target===x.id);
  return `<h2>${esc(x.name)}</h2><span class="tag">${esc(x.kind)}</span><span class="tag">${esc(x.country)}</span>${x.fto?`<span class="tag fto">FTO ${x.fto.date}</span>`:""}<p>${esc(x.summary)}</p>${x.says_vs_does?`<p class="says">Says vs does: ${esc(x.says_vs_does)}</p>`:""}
  ${(x.leaders||[]).map(p=>`<div class="rg"><b>${esc(p.name)}</b> (${esc(p.role)}): ${esc(p.status)}${cite(p.cites)}</div>`).join("")}${cite(x.cites)}
  ${es.length?"<h3>Relationships</h3>"+es.map(e=>`<div class="rg"><span class="tag">${esc(e.kind)}</span>${esc(nm[e.source===x.id?e.target:e.source])}: ${esc(e.text)}${cite(e.cites)}</div>`).join(""):""}`}
let NET;
function cards(net,terr,M){NET=net;
  const tc=Object.fromEntries(terr.groups.filter(g=>g.network_id).map(g=>[g.network_id,g]));
  $("cards").innerHTML=net.groups.map((x,k)=>{const L=(x.leaders||[])[0];const t=tc[x.id];
   return `<div class="gc" data-k="${k}" style="border-left-color:${t?t.color:"#56657f"}"><h4>${esc(x.name)}</h4>${x.fto?`<span class="tag fto">FTO</span>`:""}<span class="tag">${esc(x.country)}</span>
   ${L?`<div class="st" title="${esc(L.name)}: ${esc(L.status)}">${/dead|killed|died/i.test(L.status)?"✝":/custody|jail|prison|extradit|arrest|convicted|sentenced|detained/i.test(L.status)?"⛓":"🎯"} ${esc(L.name.split(" (")[0])}</div>`:""}
   <div class="full">${groupHtml(x,net).replace(/<h2>.*?<\/h2>/,"")}${t?`<button class="chip" data-map="${t.id}">Show footprint on map</button>`:""}</div></div>`}).join("");
  $("cards").querySelectorAll(".gc").forEach(el=>el.onclick=e=>{if(e.target.closest("a"))return;const b=e.target.closest("[data-map]");if(b){e.stopPropagation();M.setF(b.dataset.map);return}el.classList.toggle("open")});
}
function ticker(ev){
  const th=["all",...new Set(ev.events.map(e=>e.theatre))],F=$("evfilters");let cur="all";
  F.innerHTML=th.map(t=>`<button class="chip ${t==="all"?"on":""}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
  const draw=()=>$("events").innerHTML=ev.events.filter(e=>cur==="all"||e.theatre===cur).map(e=>{const T=e.title_en||e.title;return `<div class="ev"><a href="${esc(e.url)}" target="_blank" rel="noopener" title="${e.title_en?"Original: "+esc(e.title):esc(e.title)}">${esc(T.length>90?T.slice(0,88)+"…":T)}</a> <span class="m">${esc(e.source)} · ${esc(e.date.slice(5))}</span></div>`}).join("")||"<p class='muted'>No items.</p>";
  F.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{cur=b.dataset.t;F.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));draw()});draw();$("events").classList.add("capped8");
}
function background(arcs){$("arcs").innerHTML=arcs.filter(a=>["mexico","venezuela-caribbean","andes","brazil","money"].includes(a.id)).map(a=>`<div class="arc"><h3>${esc(a.title)}</h3><p>${esc(a.current_phase)}</p><details class="more"><summary>History and turning points</summary>${a.history.map(h=>`<div><b>${esc(h.period)}</b>: ${esc(h.text)}</div>`).join("")}${a.turning_points.map(t=>`<div>${esc(t.date)}: ${esc(t.text)}</div>`).join("")}${a.log.length?"<h3>Recent</h3>"+a.log.slice(-4).reverse().map(l=>`<div>${esc(l.date)}: ${esc(l.text)}${links(l.links)}</div>`).join(""):""}${cite(a.cites)}</details></div>`).join("")}
function sources(s){$("srclist").innerHTML=`<p class="muted">${esc(s.note)}</p><table>${s.sources.map(x=>`<tr><td>${esc(x.id)}</td><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></td><td>${esc(x.publisher)}</td><td>${esc(x.date)}</td></tr>`).join("")}</table>`}

// ---------- data modules ----------
const fmtM=m=>{const [y,mm]=m.split("-");return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mm-1]+" "+y};
function homRate(cl){const v=DM.vio.states[String(cl)];if(!v)return null;const l=v.slice(-12),y=l[l.length-1].m.slice(0,4);const pop=DM.vio.population[`${cl}|${y}`]||DM.mxs.states.find(x=>x.clave===cl).pop;return d3.sum(l,p=>p.v)/pop*1e5}
function spark(pts,{w=330,h=64,color="#ff6b6b",unit=""}={}){const x=d3.scaleLinear([0,pts.length-1],[2,w-2]),y=d3.scaleLinear([0,d3.max(pts,p=>p.v)||1],[h-14,4]);
  const ln=d3.line((p,i)=>x(i),p=>y(p.v));const mx=d3.max(pts,p=>p.v),lst=pts[pts.length-1];
  return `<svg width="${w}" height="${h}" class="sparksvg"><line x1="2" x2="${w-2}" y1="${h-14}" y2="${h-14}" stroke="#24365a"/><path d="${ln(pts)}" fill="none" stroke="${color}" stroke-width="1.8"/><circle cx="${x(pts.length-1)}" cy="${y(lst.v)}" r="2.5" fill="${color}"/><text x="2" y="${h-2}" class="ax">${fmtM(pts[0].m)}</text><text x="${w-2}" y="${h-2}" text-anchor="end" class="ax">${fmtM(lst.m)}</text><text x="${w-2}" y="11" text-anchor="end" class="ax">max ${Math.round(mx).toLocaleString()}${unit}</text></svg>`}
function stateStats(id){const st=DM.mxs.states.find(x=>x.region===id);if(!st)return"";const v=DM.vio.states[String(st.clave)]||[],l=v.slice(-24);
  const dis=DM.dis.states.find(x=>x.region===id),ex=DM.ext.states.find(x=>x.region===id);
  return `<h3>Violence indicators</h3><div class="rg"><b>${homRate(st.clave).toFixed(1)}</b> homicide victims per 100,000 in the 12 months to ${fmtM(v[v.length-1].m)} (${d3.sum(v.slice(-12),p=>p.v).toLocaleString()} victims)<div class="muted">Monthly victims, last 24 months</div>${spark(l)}${cite(DM.vio.cites)}</div>
  <div class="rg"><b>${dis.v.toLocaleString()}</b> disappeared or missing people not located (${(dis.v/st.pop*1e5).toFixed(0)} per 100,000), as of ${esc(DM.dis.as_of)}${cite(DM.dis.cites)}</div>
  <div class="rg"><b>${ex.v.toLocaleString()}</b> extortion incidents per 100,000 adults (${esc(DM.ext.survey)}; national ${DM.ext.national.toLocaleString()})${cite(DM.ext.cites)}</div>`}
function pvShow(d){drawer(`<h2>${esc(d.name)}</h2><span class="tag">${esc(d.role)}</span><span class="tag">${esc(d.date)}</span><p>Killed in ${esc(d.place)}. Location precision: ${esc(d.precision)}.</p><p class="note">${esc(DM.pv.note)}</p>${cite(d.cites)}<div class="cite"><a href="${esc(d.url)}" target="_blank" rel="noopener">Source list</a></div>`)}
function lineChart(el,series,{h=190,unit="",yfmt=d3.format("~s"),note=""}={}){const W=el.clientWidth||520,m={l:44,r:10,t:8,b:22};el.innerHTML="";
  const svg=d3.select(el).append("svg").attr("width",W).attr("height",h);const all=series.flatMap(s=>s.pts);const ms=[...new Set(all.map(p=>p.m))].sort();
  const x=d3.scalePoint(ms,[m.l,W-m.r]),y=d3.scaleLinear([0,d3.max(all,p=>p.v)*1.05],[h-m.b,m.t]).nice();
  svg.append("g").attr("transform",`translate(0,${h-m.b})`).call(d3.axisBottom(x).tickValues(ms.filter(t=>t.endsWith("-01"))).tickFormat(t=>t.slice(0,4)).tickSizeOuter(0)).attr("class","axis");
  svg.append("g").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(yfmt)).attr("class","axis").call(g=>g.selectAll(".tick line").clone().attr("x2",W-m.l-m.r).attr("stroke","#24365a"));
  series.forEach(s=>{svg.append("path").datum(s.pts).attr("fill","none").attr("stroke",s.color).attr("stroke-width",s.w||2).attr("stroke-dasharray",s.dash||null).attr("d",d3.line(p=>x(p.m),p=>y(p.v)));
    svg.append("g").selectAll("circle").data(s.pts).join("circle").attr("cx",p=>x(p.m)).attr("cy",p=>y(p.v)).attr("r",6).attr("fill","transparent").append("title").text(p=>`${s.name}, ${fmtM(p.m)}: ${Math.round(p.v).toLocaleString()}${unit}`)});
  const lg=document.createElement("div");lg.className="minilegend";lg.innerHTML=series.map(s=>`<span><span class="dot" style="background:${s.color};height:4px"></span> ${esc(s.name)}</span>`).join("");el.prepend(lg)}
function violenceTile(M){const v=DM.vio,ms=[...new Set(Object.values(v.states).flatMap(s=>s.map(p=>p.m)))].sort();
  const nat=ms.map(m=>({m,v:d3.sum(Object.values(v.states),s=>(s.find(p=>p.m===m)||{v:0}).v)}));
  lineChart($("homchart"),[{name:"Homicide victims per month, all Mexico",color:"#ff6b6b",pts:nat}],{unit:" victims"});
  $("homnote").innerHTML=`${esc(fmtM(v.first))} to ${esc(fmtM(v.last))}. ${esc(v.note)} ${cite(v.cites)} <span class="muted">ACLED event data was not used: its API requires a registered key (${srcLink(["ACLED_ACCESS"])}).</span>`;
  // state ranking strip: rate last 12 months
  const rk=DM.mxs.states.map(s=>({s,r:homRate(s.clave)})).sort((a,b)=>b.r-a.r).slice(0,8);
  $("homrank").innerHTML=`<div class="muted">Highest homicide rates, 12 months to ${esc(fmtM(v.last))} (per 100,000)</div>`+rk.map(x=>`<div class="bar" data-r="${x.s.region}"><span>${esc(x.s.name)}</span><i style="width:${x.r/rk[0].r*100}%"></i><b>${x.r.toFixed(0)}</b></div>`).join("");
  $("homrank").querySelectorAll(".bar").forEach(b=>b.onclick=()=>{M.setMode("homicide");document.querySelector(".maptile").scrollIntoView({behavior:"smooth"})});
  // political violence timeline
  const el=$("pvtime"),W=el.clientWidth||520,H=96,ev=DM.pv.events;const x=d3.scaleTime([new Date(ev[0].date+"T00:00"),new Date()],[14,W-14]);
  const svg=d3.select(el).append("svg").attr("width",W).attr("height",H);svg.append("g").attr("transform",`translate(0,${H-20})`).attr("class","axis").call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat("%b %Y")));
  const lane={official:26,journalist:52};svg.selectAll("text.ln").data([["official","Mayors"],["journalist","Journalists"]]).join("text").attr("class","ax").attr("x",2).attr("y",d=>lane[d[0]]-10).text(d=>d[1]);
  svg.append("g").selectAll("path").data(ev).join("path").attr("transform",d=>`translate(${x(new Date(d.date+"T00:00"))},${lane[d.kind]})`).attr("d",d=>d.kind==="official"?d3.symbol(d3.symbolTriangle,60)():d3.symbol(d3.symbolCircle,50)()).attr("fill",d=>d.kind==="official"?"#f15bb5":"#4cc9f0").attr("stroke","#0b1526").style("cursor","pointer").on("click",(e,d)=>pvShow(d)).append("title").text(d=>`${d.date} ${d.name}, ${d.place}`);
  $("pvnote").innerHTML=`${ev.filter(e=>e.kind==="official").length} sitting mayors and ${ev.filter(e=>e.kind==="journalist").length} journalists or media workers, ${esc(DM.pv.first)} to ${esc(DM.pv.last)}. Click a mark. Candidates and other officials are not yet included. ${cite(DM.pv.cites)}`}
function borderTile(){const s=DM.seiz,C={fentanyl:"#ff6b6b",methamphetamine:"#f4d35e",cocaine:"#e6e9ef"};
  lineChart($("seizchart"),[{name:"Fentanyl",color:C.fentanyl,pts:s.national.fentanyl.map(p=>({m:p.m,v:p.lb}))}],{unit:" lb"});
  lineChart($("seizchart2"),["methamphetamine","cocaine"].map(d=>({name:d[0].toUpperCase()+d.slice(1),color:C[d],pts:s.national[d].map(p=>({m:p.m,v:p.lb}))})),{unit:" lb"});
  $("seiznote").innerHTML=`Pounds seized per month at the Southwest border, ${esc(fmtM(s.first))} to ${esc(fmtM(s.last))}. Fentanyl is charted separately because it is seized in far smaller weights. ${esc(s.note)} ${cite(s.cites)}`;
  const o=DM.od,CC={US:"#9cc1f0",AZ:"#c8a24a",CA:"#6aa684",NM:"#b39ddb",TX:"#ff9f1c"};
  lineChart($("odchart"),[{name:"United States",color:CC.US,pts:o.series.US}],{unit:" deaths"});
  lineChart($("odchart2"),["AZ","CA","NM","TX"].map(k=>({name:k,color:CC[k],pts:o.series[k]})),{unit:" deaths"});
  $("odnote").innerHTML=`Overdose deaths in the 12 months ending each month, ${esc(fmtM(o.first))} to ${esc(fmtM(o.last))}. ${esc(o.note)} ${cite(o.cites)}`}
// ---------- situation overview and storylines ----------
function overview(ov,arcs,net,terr,events,M){
  const f=ov.sentences[0];$("ovtext").innerHTML=`${esc(first(f.text))} ${FN(f.cites)}`;
  const TG=Object.fromEntries(terr.groups.map(g=>[g.id,g]));
  const ss=arcs.filter(a=>a.storyline).sort((a,b)=>a.storyline.order-b.storyline.order);
  const ST={escalating:["▲","#e0605c"],stable:["■","#c8a24a"],deescalating:["▼","#6aa684"]};
  $("stories").innerHTML=ss.map((a,k)=>{const sl=a.storyline,st=ST[a.status]||ST[sl.status]||["●","#9cc1f0"];const c=(sl.groups||[]).map(g=>TG[g]&&TG[g].color).filter(Boolean)[0]||"#56657f";
    const cs=[...new Set(sl.what.flatMap(w=>w.cites))];
    return `<div class="sc" data-k="${k}"><span class="sti" style="color:${st[1]}" title="${esc(a.status||sl.status||"active")}">${st[0]}</span><span class="dot" style="background:${c}"></span><b>${esc(sl.title)}</b><span class="muted sl1">${esc(first(sl.what[0].text))}</span>${FN(cs)}<span class="go">map →</span></div>`}).join("");
  $("stories").querySelectorAll(".sc").forEach(el=>el.onclick=e=>{if(e.target.closest("a"))return;$("stories").querySelectorAll(".sc").forEach(x=>x.classList.toggle("on",x===el));M.story(ss[+el.dataset.k].storyline)})}
