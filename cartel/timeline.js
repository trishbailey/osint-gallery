/* Origins-and-growth swimlane timeline (replaces Who's who). Data: data/timeline.json. Optional data/group_countries.json for country badges. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ICON={found:"●",split:"Y",alliance:"⚭",expand:"▲",fto:"T",captured:"⛓",killed:"✝",raid:"!"};
const LBL={found:"Founded",split:"Split / breakaway",alliance:"Alliance",expand:"Expansion",fto:"US FTO designation",captured:"Leader captured / jailed",killed:"Leader killed",raid:"State crackdown"};
const FALL={chapitos:"#f08a6a",mayiza:"#b8402a",unidos:"#56657f",viagras:"#7d8597",soles:"#c77dff",segmar:"#80b918",chone_killers:"#48cae4",los_tiguerones:"#2a9d8f",viv_ansanm:"#c9ada7",gran_grif:"#9a8c98"};
const get=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
function mount(){const host=document.getElementById("timeline");if(!host)return;
 Promise.all([get("data/timeline.json"),get("data/networks.json"),get("data/territory.json"),get("data/group_countries.json")]).then(([T,N,TR,GC])=>{if(!T)return;draw(host,T,N,TR,GC)})}
function countries(GC,id){if(!GC)return null;const g=(GC.groups||GC)[id];if(!g)return null;const a=Array.isArray(g)?g:(g.countries||[]);return a.map(x=>typeof x==="string"?x:(x.iso||x.code||x.country)).filter(Boolean)}
const I2={MEX:"MX",USA:"US",GTM:"GT",HND:"HN",SLV:"SV",COL:"CO",VEN:"VE",ECU:"EC",PER:"PE",CHL:"CL",BRA:"BR",PRY:"PY",HTI:"HT",BOL:"BO",ARG:"AR",ESP:"ES",AUS:"AU",PRT:"PT",CAN:"CA",DOM:"DO",PAN:"PA",CRI:"CR",NIC:"NI",BLZ:"BZ",TTO:"TT",NLD:"NL",ITA:"IT",CHN:"CN"};
const flag=i=>(I2[i]||"").replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)))||i;
function draw(host,T,N,TR,GC){
 const name={},col={};(N&&N.groups||[]).forEach(g=>name[g.id]=g.name);(TR&&TR.groups||[]).forEach(g=>{col[g.id]=g.color;if(!name[g.id])name[g.id]=g.name});
 T.lanes.forEach(l=>{if(l.name)name[l.id]=l.name});
 const FB=Object.assign({},FALL,window.CARTEL_FALL||{});const C=id=>FB[id]&&!col[id]?FB[id]:(col[id]||FB[id]||"#ff9f1c");
 const ev=T.events,regions=[...new Set(T.lanes.map(l=>l.region))];
 // family ordering: each child directly below its parent
 const kids={};T.lanes.forEach(l=>{if(l.parent)(kids[l.parent]=kids[l.parent]||[]).push(l)});
 const lanes=[],fam={},depth={};
 regions.forEach(r=>{T.lanes.filter(l=>l.region===r&&(!l.parent||!T.lanes.some(p=>p.id===l.parent))).forEach(root=>{
  const walk=(l,d)=>{lanes.push(l);fam[l.id]=root.id;depth[l.id]=d;(kids[l.id]||[]).sort((a,b)=>a.founded-b.founded).forEach(k=>walk(k,d+1))};walk(root,0)})});
 const rh=40,top=30,fgap=14,rgap=22,LW=210;
 const cc0=l=>countries(GC,l.id)||[];const maxc=Math.max(1,...lanes.map(l=>cc0(l).length));const RW=GC?Math.max(60,maxc*22+12):14;
 const W=Math.max(1100,host.clientWidth||1100);
 let y=top;const ly={},rowsY=[];let pr=null,pf=null;
 lanes.forEach(l=>{if(l.region!==pr){if(pr!=null)y+=rgap;rowsY.push([l.region,y]);y+=18;pr=l.region;pf=null}else if(fam[l.id]!==pf)y+=fgap;pf=fam[l.id];ly[l.id]=y;y+=rh});
 const H=y+10;const x=d3.scaleLinear().domain([1960,1978,2027]).range([LW,LW+50,W-RW]);
 host.innerHTML=`<div class="tl-legend">${Object.keys(ICON).map(k=>`<span><i class="tl-ic">${ICON[k]}</i>${LBL[k]}</span>`).join("")}<span><i class="tl-x">✕</i>Dissolved</span><span><svg width="34" height="12"><path d="M2,6 H26" stroke="#ffc971" stroke-width="3"/><path d="M24,1 L32,6 L24,11z" fill="#ffc971"/></svg>Lineage: child breaks from parent</span><span class="muted">≈ approximate founding year · click a lane to filter the map</span></div><div class="tl-wrap"><svg class="tl-svg" width="${W}" height="${H}"><defs></defs></svg><div class="tl-tip"></div></div><div class="tl-panel" hidden></div>`;
 const sv=d3.select(host).select("svg.tl-svg"),defs=sv.select("defs"),tip=host.querySelector(".tl-tip"),panel=host.querySelector(".tl-panel"),wrap=host.querySelector(".tl-wrap");
 const showTip=(m,h)=>{const r=wrap.getBoundingClientRect();tip.innerHTML=h;tip.style.display="block";tip.style.left=Math.min(m.clientX-r.left+wrap.scrollLeft+12,wrap.scrollLeft+r.width-290)+"px";tip.style.top=(m.clientY-r.top+12)+"px"};
 const fam0=lanes.map(l=>l);let alt=0;let lastF=null;
 lanes.forEach(l=>{if(fam[l.id]!==lastF){alt^=1;lastF=fam[l.id]}if(alt)sv.append("rect").attr("class","tl-fam").attr("x",0).attr("y",ly[l.id]-2).attr("width",W).attr("height",rh+4)});
 [1980,1985,1990,1995,2000,2005,2010,2015,2020,2025].forEach(t=>{sv.append("line").attr("class","tl-grid").attr("x1",x(t)).attr("x2",x(t)).attr("y1",top-6).attr("y2",H-10);sv.append("text").attr("class","tl-ax").attr("x",x(t)).attr("y",top-12).attr("text-anchor","middle").text(t)});
 rowsY.forEach(([r,yy])=>sv.append("text").attr("class","tl-reg").attr("x",6).attr("y",yy+13).text(r.toUpperCase()));
 const linkG=sv.append("g"),laneG=sv.append("g"),labG=sv.append("g");
 lanes.forEach(l=>{const yy=ly[l.id]+rh/2,c=C(l.id),x0=x(l.founded),x1=x(l.ended||2026.8);
  const g=laneG.append("g").attr("class","tl-lane").attr("data-g",l.id).style("cursor","pointer");
  g.append("rect").attr("x",0).attr("y",ly[l.id]).attr("width",W).attr("height",rh).attr("class","tl-hit");
  const nm=(name[l.id]||l.id).replace(/\s*\(.*\)/,"").slice(0,28);
  g.append("text").attr("class","tl-name"+(depth[l.id]?"":" root")).attr("x",LW-10).attr("y",yy+4.5).attr("text-anchor","end").text((depth[l.id]?"↳ ":"")+nm);
  g.append("rect").attr("x",0).attr("y",yy-9).attr("width",4).attr("height",18).attr("fill",c);
  g.append("rect").attr("x",x0).attr("y",yy-5).attr("width",Math.max(4,x1-x0)).attr("height",10).attr("rx",5).attr("fill",c).attr("opacity",l.ended?.55:.95);
  if(l.circa)g.append("text").attr("class","tl-circa").attr("x",x0-4).attr("y",yy+4.5).attr("text-anchor","end").text("≈");
  if(l.ended)g.append("text").attr("class","tl-x").attr("x",x1+4).attr("y",yy+4.5).text("✕ "+l.ended);
  const cc=cc0(l);if(cc.length){const b=g.append("text").attr("class","tl-cc").attr("x",W-RW+8).attr("y",yy+6).text(cc.map(flag).join(" "));b.append("title").text("Sourced presence: "+cc.join(", "))}
  g.on("click",e=>{if(e.target.closest(".tl-ev"))return;openLane(l)});
  if(l.parent&&ly[l.parent]!=null){const py=ly[l.parent]+rh/2,sy=(l.split&&l.split.year)||l.founded,xs=x(sy+.5)-(x(sy+.5)>x0?0:0),xe=Math.max(x0,xs)+2,mid=(py+yy)/2;
   const id="tla-"+l.id;defs.append("marker").attr("id",id).attr("viewBox","0 0 10 10").attr("refX",8).attr("refY",5).attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto").append("path").attr("d","M0,0 L10,5 L0,10z").attr("fill",c);
   const d=`M${xs},${py+5} C${xs},${mid} ${xs},${yy} ${xe+14},${yy}`;
   const lg=linkG.append("g").attr("class","tl-link").attr("data-g",l.id);
   lg.append("path").attr("class","tl-branch").attr("stroke",c).attr("d",d).attr("marker-end",`url(#${id})`);
   lg.append("circle").attr("cx",xs).attr("cy",py).attr("r",4.5).attr("fill",c).attr("stroke","#0b111b").attr("stroke-width",1.5);
   lg.append("path").attr("class","tl-bhit").attr("d",d);
   const sp=l.split||{text:`${name[l.id]||l.id} breaks from ${name[l.parent]||l.parent}.`,cites:l.cites};
   const lt=labG.append("text").attr("class","tl-split").attr("x",xs-6).attr("y",yy-8).attr("text-anchor","end").attr("fill",c).text("split "+sy);
   lg.on("mousemove",m=>{lg.classed("on",true);showTip(m,`<b style="color:${c}">${esc(name[l.parent]||l.parent)} → ${esc(name[l.id]||l.id)} · split ${sy}</b><br>${esc(sp.text)}<br><span class="muted">${esc(FN.label(sp.cites))}</span>`)}).on("mouseleave",()=>{lg.classed("on",false);tip.style.display="none"});
  }
 });
 const seen={};ev.forEach(e=>{const k=e.group+e.year;const o=(seen[k]=(seen[k]||0)+1)-1;const cx=x(e.year+.5)+o*15,cy=ly[e.group]+rh/2;if(ly[e.group]==null)return;
  const g=laneG.append("g").attr("class","tl-ev").attr("transform",`translate(${cx},${cy})`).style("cursor","pointer");
  g.append("circle").attr("r",8).attr("fill","#0d1420").attr("stroke",C(e.group)).attr("stroke-width",1.5);
  g.append("text").attr("class","tl-ic t-"+e.type).attr("text-anchor","middle").attr("y",4).text(ICON[e.type]||"•");
  g.on("mousemove",m=>showTip(m,`<b>${e.year} · ${esc(LBL[e.type]||e.type)}</b><br>${esc(e.text)}<br><span class="muted">${esc(FN.label(e.cites))}</span>`)).on("mouseleave",()=>tip.style.display="none")
   .on("click",()=>{openLane(lanes.find(l=>l.id===e.group),e)});
 });
 function openLane(l,hi){const es=ev.filter(e=>e.group===l.id).sort((a,b)=>a.year-b.year);const cc=countries(GC,l.id);
  panel.hidden=false;panel.innerHTML=`<button class="tl-close" title="Close">×</button><h3><span class="dot" style="background:${C(l.id)}"></span>${esc(name[l.id]||l.id)}</h3><p class="small">${l.circa?"Emerged c. ":"Founded "}${l.founded}${l.parent?` · from ${esc(name[l.parent]||l.parent)}`:""}${FN(l.cites)}${cc&&cc.length?` · Present in: ${esc(cc.join(", "))}`:""}</p><ul class="tl-list">${es.map(e=>`<li class="${e===hi?"on":""}"><i class="tl-ic">${ICON[e.type]||"•"}</i><b>${e.year}</b> ${esc(e.text)}${FN(e.cites)}</li>`).join("")}</ul>`;
  panel.querySelector(".tl-close").onclick=()=>panel.hidden=true;
  sv.selectAll(".tl-lane").classed("dim",function(){return this.dataset.g!==l.id});
  const chip=document.querySelector(`#grouplegend .chip[data-g="${l.id}"]`);if(chip)chip.click();
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
