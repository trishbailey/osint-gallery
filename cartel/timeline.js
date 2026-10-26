/* Origins-and-growth swimlane timeline (replaces Who's who). Data: data/timeline.json. Optional data/group_countries.json for country badges. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ICON={found:"🌱",expand:"↗️",captured:"⛓️",killed:"⛓️"};
const LBL={found:"Founded",split:"Split / breakaway",alliance:"Alliance",expand:"Expansion",fto:"US FTO designation",captured:"Leader captured / jailed",killed:"Leader killed",raid:"State crackdown"};
const FALL={chapitos:"#ffffff",mayiza:"#00f62c",unidos:"#fd7db7",viagras:"#bb8f32",soles:"#af34b2",segmar:"#faff5d",chone_killers:"#5894f2",los_tiguerones:"#cf50ff",viv_ansanm:"#19f4e6",gran_grif:"#665522",tijuana:"#e07a5f",familia:"#9c89b8",auc:"#8d99ae",farc:"#a3b18a"};
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
 const ev=T.events.filter(e=>["found","expand","captured","killed"].includes(e.type)),regions=[...new Set(T.lanes.map(l=>l.region))];
 // family ordering: each child directly below its parent; leaf siblings first, siblings with their own children last,
 // so every parent->child connector only passes rows whose bars start after it (checked in pipeline/validate.py).
 const kids={};T.lanes.forEach(l=>{if(l.parent)(kids[l.parent]=kids[l.parent]||[]).push(l)});
 const lanes=[],fam={},depth={},sib={};
 regions.forEach(r=>{T.lanes.filter(l=>l.region===r&&(!l.parent||!T.lanes.some(p=>p.id===l.parent))).forEach(root=>{
  const walk=(l,d)=>{lanes.push(l);fam[l.id]=root.id;depth[l.id]=d;(kids[l.id]||[]).sort((a,b)=>(!!kids[a.id]-!!kids[b.id])||(a.founded-b.founded)||(a.id<b.id?-1:1)).forEach((k,i)=>{sib[k.id]=i;walk(k,d+1)})};walk(root,0)})});
 const rh=44,top=30,fgap=14,rgap=22,LW=210;
 const cc0=l=>countries(GC,l.id)||[];const maxc=Math.max(1,...lanes.map(l=>cc0(l).length));const RW=GC?Math.max(60,maxc*22+12):14;
 const W=Math.max(760,(host.clientWidth||1100)-2);
 let y=top;const ly={},rowsY=[];let pr=null,pf=null;
 lanes.forEach(l=>{if(l.region!==pr){if(pr!=null)y+=rgap;rowsY.push([l.region,y]);y+=18;pr=l.region;pf=null}else if(fam[l.id]!==pf)y+=fgap;pf=fam[l.id];ly[l.id]=y;y+=rh});
 const H=y+10;const TRUNK0=7,TRUNKD=11;const x=d3.scaleLinear().domain([1960,1978,2027]).range([LW,LW+50,W-RW]);
 host.innerHTML=`<div class="tl-legend tl-legend-top"><span><i class="tl-ic">🌱</i>Founded</span><span><i class="tl-ic">↗️</i>Expansion</span><span><i class="tl-ic">⛓️</i>Leader captured or killed</span><span><svg width="30" height="12"><rect x="2" y="2" width="26" height="8" rx="4" fill="#ffc971" opacity=".45"/></svg>Faded bar = dissolved</span><span><svg width="40" height="14"><path d="M2,7 H30" stroke="#ffc971" stroke-width="4"/><path d="M28,1 L38,7 L28,13z" fill="#ffc971"/></svg>Parent → child (each link says "split from" or "formed from break-up"; dotted, no arrow = alliance, not a split)</span></div><div class="muted small" style="margin:-2px 0 6px">Hover a lane for its founding year · click a lane to filter the map · hover a link for its source</div><div class="tl-wrap"><svg class="tl-svg" width="${W}" height="${H}"><defs></defs></svg><div class="tl-tip"></div></div><div class="tl-panel" hidden></div>`;
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
  const nm=(name[l.id]||l.id).replace(/\s*\(.*\)/,"").slice(0,34);
  g.append("text").attr("class","tl-name"+(depth[l.id]?"":" root")).attr("x",LW-10).attr("y",yy+4.5).attr("text-anchor","end").text(nm);
  g.append("rect").attr("x",0).attr("y",yy-9).attr("width",4).attr("height",18).attr("fill",c);
  g.append("rect").attr("x",x0).attr("y",yy-5).attr("width",Math.max(4,x1-x0)).attr("height",10).attr("rx",5).attr("fill",c).attr("opacity",l.ended?.55:.95);
  if(l.ended)g.append("text").attr("class","tl-x").attr("x",x1+4).attr("y",yy+4.5).text("dissolved "+l.ended);
  const cc=cc0(l);if(cc.length){const b=g.append("text").attr("class","tl-cc").attr("x",W-RW+8).attr("y",yy+6).text(cc.map(flag).join(" "));b.append("title").text("Sourced presence: "+cc.join(", "))}
  g.append("title").text(`${name[l.id]||l.id}: ${l.circa?"c. ":"founded "}${l.founded}${l.ended?`, dissolved ${l.ended}`:""}`);g.on("click",e=>{if(e.target.closest(".tl-ev"))return;openLane(l)});
  if(l.parent&&ly[l.parent]!=null){const P=T.lanes.find(p=>p.id===l.parent),lk=l.link||{kind:"split",year:l.founded,label:`split from ${name[l.parent]||l.parent}, ${l.founded}`,text:"",cites:l.cites};
   const py=ly[l.parent]+rh/2,xt=x(P.founded)+TRUNK0+TRUNKD*sib[l.id],al=lk.kind==="alliance",cp=al?"#c9d3e3":c;
   const id="tla-"+l.id;defs.append("marker").attr("id",id).attr("viewBox","0 0 10 10").attr("refX",8).attr("refY",5).attr("markerWidth",4).attr("markerHeight",4).attr("orient","auto").append("path").attr("d","M0,0 L10,5 L0,10z").attr("fill",cp);
   const r=8,d=x0>xt+r+6?`M${xt},${py+6} V${yy-r} Q${xt},${yy} ${xt+r},${yy} H${x0-2}`:`M${xt},${py+6} V${yy-7}`;
   const lg=linkG.append("g").attr("class","tl-link"+(al?" alliance":"")).attr("data-g",l.id);
   lg.append("path").attr("class","tl-branch").attr("stroke",cp).attr("d",d).attr("marker-end",al?null:`url(#${id})`).attr("stroke-dasharray",al?"2 5":null);
   lg.append("circle").attr("cx",xt).attr("cy",py).attr("r",5).attr("fill",cp).attr("stroke","#0b111b").attr("stroke-width",1.5);
   lg.append("path").attr("class","tl-bhit").attr("d",d);
   {const lx=Math.max(x0,xt+6)+4,lt=labG.append("text").attr("class","tl-split").attr("x",lx).attr("y",yy-10).attr("fill",cp).text(lk.label);const tw=lt.node().getComputedTextLength?lt.node().getComputedTextLength():0;if(lx+tw>W-RW-4)lt.attr("x",Math.max(xt+10,x0-6)).attr("text-anchor","end")}
   lg.on("mousemove",m=>{lg.classed("on",true);showTip(m,`<b style="color:${cp}">${esc(name[l.parent]||l.parent)} → ${esc(name[l.id]||l.id)}</b><br><b>${esc(lk.label)}</b><br>${esc(lk.text)}<br><span class="muted">${esc(FN.label(lk.cites))}</span>`)}).on("mouseleave",()=>{lg.classed("on",false);tip.style.display="none"});
  }
 });
 const seen={};ev.forEach(e=>{const k=e.group+e.year;const o=(seen[k]=(seen[k]||0)+1)-1;const cx=x(e.year+.5)+o*15,cy=ly[e.group]+rh/2;if(ly[e.group]==null)return;
  const g=laneG.append("g").attr("class","tl-ev").attr("transform",`translate(${cx},${cy})`).style("cursor","pointer");
  g.append("circle").attr("r",8).attr("fill","#0d1420").attr("stroke",C(e.group)).attr("stroke-width",1.5);
  g.append("text").attr("class","tl-ic t-"+e.type).attr("text-anchor","middle").attr("y",4).text(ICON[e.type]||"•");
  if(e.type==="fto"){g.append("rect").attr("x",-10).attr("y",8).attr("width",20).attr("height",10).attr("rx",3).attr("fill","#ffd166");g.append("text").attr("class","tl-fto").attr("text-anchor","middle").attr("y",16).text("FTO")}
  g.append("title").text(`${e.year} · ${LBL[e.type]||e.type}`);
  g.on("mousemove",m=>showTip(m,`<b>${e.year} · ${esc(LBL[e.type]||e.type)}</b><br>${esc(e.text)}<br><span class="muted">${esc(FN.label(e.cites))}</span>`)).on("mouseleave",()=>tip.style.display="none")
   .on("click",()=>{openLane(lanes.find(l=>l.id===e.group),e)});
 });
 function openLane(l,hi){const es=ev.filter(e=>e.group===l.id).sort((a,b)=>a.year-b.year);const cc=countries(GC,l.id);
  panel.hidden=false;panel.innerHTML=`<button class="tl-close" title="Close">×</button><h3><span class="dot" style="background:${C(l.id)}"></span>${esc(name[l.id]||l.id)}</h3><p class="small">${l.circa?"Emerged c. ":"Founded "}${l.founded}${FN(l.cites)}${l.parent?` · ${esc((l.link&&l.link.label)||("from "+(name[l.parent]||l.parent)))}${l.link?FN(l.link.cites):""}${l.link&&l.link.text?`<br><span class="muted">${esc(l.link.text)}</span>`:""}`:""}${cc&&cc.length?` · Present in: ${esc(cc.join(", "))}`:""}</p><ul class="tl-list">${es.map(e=>`<li class="${e===hi?"on":""}"><i class="tl-ic">${ICON[e.type]||"•"}</i><b>${e.year}</b> ${esc(e.text)}${FN(e.cites)}</li>`).join("")}</ul>`;
  panel.querySelector(".tl-close").onclick=()=>panel.hidden=true;
  sv.selectAll(".tl-lane").classed("dim",function(){return this.dataset.g!==l.id});
  const chip=document.querySelector(`#grouplegend .chip[data-g="${l.id}"]`);if(chip)chip.click();
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
