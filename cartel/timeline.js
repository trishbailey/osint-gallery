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
function draw(host,T,N,TR,GC){
 const name={},col={};(N&&N.groups||[]).forEach(g=>name[g.id]=g.name);(TR&&TR.groups||[]).forEach(g=>{col[g.id]=g.color;if(!name[g.id])name[g.id]=g.name});
 const C=id=>col[id]||FALL[id]||"#8fa0bb";
 const lanes=T.lanes,ev=T.events,regions=[...new Set(lanes.map(l=>l.region))];
 const rh=22,top=26,gap=14,LW=196,RW=GC?96:14,W=Math.max(760,host.clientWidth||1100);
 let y=top;const ly={},rowsY=[];regions.forEach(r=>{rowsY.push([r,y]);y+=12;lanes.filter(l=>l.region===r).forEach(l=>{ly[l.id]=y;y+=rh});y+=gap});
 const H=y;const x=d3.scaleLinear().domain([1960,1980,2027]).range([LW,LW+46,W-RW]);
 host.innerHTML=`<div class="tl-legend">${Object.keys(ICON).map(k=>`<span><i class="tl-ic">${ICON[k]}</i>${LBL[k]}</span>`).join("")}<span><i class="tl-x">✕</i>Dissolved</span><span class="muted">· ≈ = approximate founding year · click a lane to filter the map</span></div><div class="tl-wrap"><svg class="tl-svg" width="${W}" height="${H}"></svg><div class="tl-tip"></div></div><div class="tl-panel" hidden></div>`;
 const sv=d3.select(host).select("svg"),tip=host.querySelector(".tl-tip"),panel=host.querySelector(".tl-panel");
 [1980,1985,1990,1995,2000,2005,2010,2015,2020,2025].forEach(t=>{sv.append("line").attr("class","tl-grid").attr("x1",x(t)).attr("x2",x(t)).attr("y1",top-6).attr("y2",H-gap);sv.append("text").attr("class","tl-ax").attr("x",x(t)).attr("y",top-10).attr("text-anchor","middle").text(t)});
 sv.append("text").attr("class","tl-ax").attr("x",LW+2).attr("y",top-10).text("…");rowsY.forEach(([r,yy])=>sv.append("text").attr("class","tl-reg").attr("x",4).attr("y",yy+8).text(r.toUpperCase()));
 lanes.forEach(l=>{const yy=ly[l.id]+rh/2,c=C(l.id),x0=x(l.founded),x1=x(l.ended||2026.8);
  const g=sv.append("g").attr("class","tl-lane").attr("data-g",l.id).style("cursor","pointer");
  g.append("rect").attr("x",0).attr("y",ly[l.id]).attr("width",W).attr("height",rh).attr("class","tl-hit");
  g.append("text").attr("class","tl-name").attr("x",LW-8).attr("y",yy+4).attr("text-anchor","end").text((name[l.id]||l.id).replace(/\s*\(.*\)/,"").slice(0,30));
  if(l.parent&&ly[l.parent]!=null){const py=ly[l.parent]+rh/2;sv.insert("path",":first-child").attr("class","tl-branch").attr("stroke",c).attr("d",`M${x0},${py} C${x0+8},${py} ${x0-8},${yy} ${x0+2},${yy}`)}
  g.append("rect").attr("x",x0).attr("y",yy-4).attr("width",Math.max(3,x1-x0)).attr("height",8).attr("rx",4).attr("fill",c).attr("opacity",l.ended?.45:.9);
  if(l.circa)g.append("text").attr("class","tl-circa").attr("x",x0-3).attr("y",yy+4).attr("text-anchor","end").text("≈");
  if(l.ended)g.append("text").attr("class","tl-x").attr("x",x1+3).attr("y",yy+4).text("✕");
  const cc=countries(GC,l.id);if(cc&&cc.length){const s=cc.slice(0,2).join(" ")+(cc.length>2?` +${cc.length-2}`:"");const b=g.append("text").attr("class","tl-cc").attr("x",W-RW+6).attr("y",yy+4).text(s);b.append("title").text("Sourced presence: "+cc.join(", "))}
  g.on("click",e=>{if(e.target.closest(".tl-ev"))return;openLane(l)});
 });
 const seen={};ev.forEach(e=>{const k=e.group+e.year;const o=(seen[k]=(seen[k]||0)+1)-1;const cx=x(e.year+.5)+o*11,cy=ly[e.group]+rh/2;if(ly[e.group]==null)return;
  const g=sv.append("g").attr("class","tl-ev").attr("transform",`translate(${cx},${cy})`).style("cursor","pointer");
  g.append("circle").attr("r",7).attr("fill","#0d1420").attr("stroke",C(e.group)).attr("stroke-width",1.5);
  g.append("text").attr("class","tl-ic t-"+e.type).attr("text-anchor","middle").attr("y",3.5).text(ICON[e.type]||"•");
  g.on("mousemove",m=>{const r=host.querySelector(".tl-wrap").getBoundingClientRect();tip.innerHTML=`<b>${e.year} · ${esc(LBL[e.type]||e.type)}</b><br>${esc(e.text)}<br><span class="muted">${esc(FN.label(e.cites))}</span>`;tip.style.display="block";tip.style.left=Math.min(m.clientX-r.left+12,r.width-280)+"px";tip.style.top=(m.clientY-r.top+12)+"px"}).on("mouseleave",()=>tip.style.display="none")
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
