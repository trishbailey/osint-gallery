/* Leader cards + state capture layer. Self-contained; hooks: legend chips and Who's-who cards. */
(function(){
const J=p=>fetch(p).then(r=>{if(!r.ok)throw new Error(p);return r.json()});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* Footnotes: uses the shared page helper window.FN (public/footnotes.js); otherwise this local fallback
   numbers sources by URL and renders one "Sources" list at the bottom of the page. Swap by defining window.footnote. */
const FN_LOCAL=(()=>{const idx=new Map();let box;function render(){if(!box){box=document.getElementById("pagesources")||Object.assign(document.createElement("section"),{id:"pagesources",className:"tile"});if(!box.parentNode)(document.querySelector("main")||document.body).appendChild(box)}
  box.innerHTML=`<h2>Sources</h2><ol class="srcl">${[...idx.values()].map(v=>`<li id="src-${v.n}"><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.url.replace(/^https:\/\/(www\.)?/,"").slice(0,90))}</a></li>`).join("")}</ol>`}
  let pend=0;return s=>{if(!s||!s.url)return"";let v=idx.get(s.url);if(!v){v={n:idx.size+1,url:s.url};idx.set(s.url,v);if(!pend){pend=1;setTimeout(()=>{pend=0;render()},0)}}return `<sup class="fn"><a href="#src-${v.n}" title="${esc(s.name||"")}">${v.n}</a></sup>`}})();
const FN=s=>(typeof window.FN==="function"?window.FN(s):FN_LOCAL(s));
const A=FN;
const STI={at_large:"●",jailed:"⛓",extradited:"✈",dead:"✝",reported_dead:"✝?"};
const BI={fentanyl:"💊",meth:"🧪",cocaine:"❄",heroin:"💉",marijuana:"🌿",drugs_unspecified:"📦",precursors:"⚗",migrant_smuggling:"🚶",human_trafficking:"⛓",extortion:"💰",kidnapping:"🎯",fuel_theft:"⛽",illegal_mining:"⛏",logging_fishing:"🌲",arms:"🔫",money_laundering:"🏦",legit_economies:"🏪"};
const STL={at_large:"At large",jailed:"Jailed",extradited:"In US custody",dead:"Dead",reported_dead:"Reported dead"};
const CST={convicted:["Convicted","#c0504d"],charged:["Charged","#c8a24a"],alleged:["Alleged","#9aa6b8"],sanctioned:["Sanctioned","#8e6cc0"],pardoned:["Pardoned","#4a9a8a"],acquitted:["Acquitted","#4a9a8a"],dropped:["Dropped","#4a9a8a"],delisted:["Delisted","#4a9a8a"]};
const ORDER=["convicted","charged","alleged","sanctioned","pardoned","acquitted","dropped","delisted"];
const usd=n=>"$"+(n>=1e6?(n/1e6)+"M":n.toLocaleString());
Promise.all([J("data/leaders.json"),J("data/capture.json"),J("data/networks.json"),J("data/territory.json"),J("basemap/latam.topo.json"),J("data/groups_size.json"),J("data/groups_business.json")]).then(([ld,cp,net,ter,topo,sz,bz])=>{
 const gname={};net.groups.forEach(g=>gname[g.id]=g.name);ter.groups.forEach(g=>gname[g.id]=gname[g.id]||g.name);
 const anchor=document.querySelector(".row2b")||document.querySelector("main").lastElementChild;
 // ---------- leaders: who's in charge now ----------
 const t=document.createElement("section");t.className="tile ldtile";t.id="leaders";
 const L=ld.leaders,G=ld.groups,BL=Object.fromEntries(bz.lines.map(x=>[x.id,x.label]));
 const live=g=>L.filter(l=>l.group_key===g&&l.role!=="former_leader"),former=L.filter(l=>l.role==="former_leader");
 const sizeOf=g=>{for(const[k,v]of Object.entries(sz.groups)){if(k===g||(v.applies_to||[]).includes(g))return [k,v]}return [g,null]};
 const fmtN=n=>n>=1e9?(n/1e9).toFixed(n%1e9?1:0)+"B":n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+"M":n>=1e3?Math.round(n/1e3*10)/10+"k":String(n);
 const rng=e=>e.low!=null&&e.high!=null&&e.low!==e.high?`${fmtN(e.low)}–${fmtN(e.high)}`:e.high==null?`${fmtN(e.low)}+`:e.low==null?`≤${fmtN(e.high)}`:`~${fmtN(e.low)}`;
 const SRC=e=>({name:e.source_name||"source",url:e.source_url,date:e.year?String(e.year):""});
 const ph=l=>{const p=l.photo||{};return `<img src="${esc(p.placeholder?"img/leaders/placeholder.svg":p.file)}" alt="${p.placeholder?"No photo available":"Photo of "+esc(l.name)}" loading="lazy">`};
 const ICON=l=>`<span class="sti ${l.status}" title="${STL[l.status]}">${STI[l.status]}</span>`;
 const CONF={"confirmed by officials":["Official","c1"],"reported by multiple outlets":["Multiple outlets","c2"],"reported, contested":["Contested","c3"]};
 const LS={single:"",split:"Split",contested:"Contested",collective:"Collective",unknown:"Unknown"};
 const bizIcons=g=>{const r=bz.groups[g]||{};return Object.entries(r).filter(([,c])=>c.level!=="minor").sort((a,b)=>a[1].level.localeCompare(b[1].level)).map(([k,c])=>`<span class="bi ${c.level}" title="${esc(BL[k])} (${c.level})">${BI[k]||"•"}</span>`).join("")};
 const sizeBadge=g=>{const[k,v]=sizeOf(g);const e=v&&v.members.find(x=>!x.no_credible_estimate);return e?`<span class="szb" title="${esc((k!==g?v.label+": ":"")+e.unit+", "+e.year)}">👥 ${rng(e)}${k!==g?"*":""}</span>`:`<span class="szb na" title="No credible membership estimate">👥 n/a</span>`};
 const person=l=>`<div class="lp"><div class="ph">${ph(l)}</div><div class="lpt"><b>${esc(l.name)}</b>${l.alias?`<div class="al">“${esc(l.alias)}”</div>`:""}${l.faction&&l.role==="faction_leader"?`<div class="rl">${esc(l.faction)}</div>`:""}
  <div class="bdg">${ICON(l)}${l.confidence?`<span class="cf ${CONF[l.confidence][1]}" title="${esc(l.confidence)}">${CONF[l.confidence][0]}</span>`:""}${l.role==="reported_successor"?`<span class="cf c3">Successor?</span>`:""}${l.reward_usd?`<span class="rw" title="US reward">${usd(l.reward_usd)}</span>`:""}</div></div></div>`;
 const more=l=>`<div class="lmore"><b>${esc(l.name)}</b>: ${esc(l.title)}. ${esc(l.status_note)}${FN(l.status_source)}${l.reward_usd?` Reward up to ${usd(l.reward_usd)}${FN(l.reward_source)}.`:""} ${esc(l.known_for)}${l.leadership_note?" "+esc(l.leadership_note):""}${l.sources.map(FN).join("")}${l.charges.length?`<ul>${l.charges.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>`:""}${(l.photo&&!l.photo.placeholder)?`<div class="lic">Photo: ${esc(l.photo.credit)}, ${esc(l.photo.license)}${FN({name:"photo",url:l.photo.image_source_url})}</div>`:""}</div>`;
 t.innerHTML=`<div class="tilehead"><h2>Who's in charge now</h2><span class="muted">One card per group. Tap a card for details. Badges: Official = confirmed by officials; Multiple outlets; Contested.</span></div>
 <div id="ldnote" class="muted small"></div>
 <div class="nowgrid" id="ldgrid">${G.map(g=>{const ls=live(g.id);return `<div class="gc ld" data-g="${g.id}${["chapitos","mayiza"].includes(g.id)?" sinaloa":""}" tabindex="0">
  <div class="gch"><span class="gchip">${esc(g.name)}</span>${LS[g.leadership]?`<span class="lsb ${g.leadership}">${LS[g.leadership]}</span>`:""}</div>
  ${ls.length?ls.map(person).join(""):`<div class="unk">? Leadership unknown</div>`}
  <div class="gcf">${sizeBadge(g.id)}<span class="bis">${bizIcons(g.id)}</span></div>
  <div class="bd"><p>${esc(g.leadership_note)}${g.sources.map(FN).join("")}</p>${ls.map(more).join("")}</div></div>`}).join("")}</div>
 <details class="more former"><summary>Jailed, extradited or dead (${former.length})</summary><div class="fgrid">${former.map(l=>`<div class="fc ld" data-g="${l.group_key}" tabindex="0">${person(l)}<span class="gchip sm">${esc((G.find(g=>g.id===l.group_key)||{}).name||l.group_key)}</span><div class="bd">${more(l)}</div></div>`).join("")}</div></details>
 <div class="ldcharts"><div class="chbox"><h3>Members (published ranges)</h3><div id="szmem"></div></div><div class="chbox"><h3>Annual revenue, USD (log scale)</h3><div id="szrev"></div></div><div class="chbox wide"><h3>Lines of business</h3><div id="bzgrid"></div></div></div>
 <details class="more"><summary>About these cards</summary><p class="small">${esc(ld.method)} As of ${esc(ld.as_of)}. ${esc(sz.note)} ${esc(bz.note)} * = figure for the whole Sinaloa Cartel.</p></details>`;
 {const mt=document.querySelector(".maptile");if(mt)mt.after(t);else anchor.parentNode.insertBefore(t,anchor);}
 const grid=t.querySelector("#ldgrid");
 t.addEventListener("click",e=>{if(e.target.closest("a"))return;const c=e.target.closest(".gc,.fc");if(c)c.classList.toggle("open")});
 // membership range bars (log x)
 const memRows=[],revRows=[],noMem=[],noRev=[];
 Object.entries(sz.groups).forEach(([k,v])=>{v.members.forEach(e=>e.no_credible_estimate?noMem.push(v.label):memRows.push({g:v.label,e}));v.revenue.forEach(e=>e.no_credible_estimate?noRev.push(v.label):e.unit==="annual_revenue_usd"?revRows.push({g:v.label,e}):noRev.push(v.label+" (non-USD figure only)"))});
 function bars(el,rows,dom,tv,lo){const W=420,rh=22,H=rows.length*rh+24,ml=150;const x=d3.scaleLog(dom,[ml,W-30]).clamp(true);
  const sv=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("class","rbars");
  sv.append("g").attr("transform",`translate(0,${H-20})`).call(d3.axisBottom(x).tickValues(tv).tickFormat(v=>(lo>=1e7?"$":"")+fmtN(v))).attr("class","ax");
  rows.forEach((r,i)=>{const y=i*rh+4,e=r.e,a=e.low??lo,b=e.high??e.low*1.6,open=e.high==null||e.low==null;const gg=sv.append("g");
   gg.append("text").attr("x",ml-6).attr("y",y+13).attr("text-anchor","end").attr("class","bl").text(r.g.length>22?r.g.slice(0,21)+"…":r.g);
   gg.append("rect").attr("x",x(a)).attr("y",y+3).attr("height",12).attr("width",Math.max(4,x(b)-x(a))).attr("rx",3).attr("class","rb"+(open?" open":"")+(/armed/.test(e.unit)?" armed":"")+(/PARTIAL/.test(e.note)?" partial":"")).append("title").text(`${rng(e)} ${e.unit}, ${e.year}. ${e.note}`);
   gg.append("text").attr("x",Math.min(x(b)+4,W-28)).attr("y",y+13).attr("class","bv").text(rng(e))});
  const fl=d3.select(el).append("div").attr("class","fnrow small");
  fl.html(rows.map((r,i)=>`<span class="ii" title="${esc(r.e.note)}">ⓘ${i+1}${FN(SRC(r.e))}</span>`).join(" "))}
 bars("#szmem",memRows,[800,60000],[1e3,3e3,1e4,3e4],800);
 t.querySelector("#szmem").insertAdjacentHTML("beforeend",`<div class="small muted">Lighter bars: armed members only. No credible estimate: ${[...new Set(noMem)].map(esc).join(", ")||"none"}.</div>`);
 bars("#szrev",revRows,[1e7,1e10],[1e7,1e8,1e9,1e10],1e7);
 t.querySelector("#szrev").insertAdjacentHTML("beforeend",`<div class="small muted">Hatched = partial (one activity or area). No sourced USD estimate: ${[...new Set(noRev)].map(esc).join(", ")}.</div>`);
 // business heat-map
 const used=bz.lines.filter(x=>G.some(g=>(bz.groups[g.id]||{})[x.id]));
 t.querySelector("#bzgrid").innerHTML=`<table class="bz"><thead><tr><th></th>${used.map(x=>`<th title="${esc(x.label)}"><span>${BI[x.id]||""}</span><div class="vl">${esc(x.label)}</div></th>`).join("")}</tr></thead><tbody>${G.map(g=>`<tr><th>${esc(g.name)}</th>${used.map(x=>{const c=(bz.groups[g.id]||{})[x.id];return `<td>${c?`<span class="hm ${c.level}" title="${esc(x.label)}: ${c.level}">${c.level==="primary"?"●":c.level==="secondary"?"◐":"○"}</span>${FN({name:x.label,url:c.source_url})}`:""}</td>`}).join("")}</tr>`).join("")}</tbody></table><div class="small muted">● primary ◐ secondary ○ minor. Empty = no source found.</div>`;
 function setG(g,from){grid.parentNode.querySelectorAll(".ld").forEach(c=>{const m=!g||c.dataset.g.split(" ").includes(g);c.classList.toggle("hl",!!g&&m);c.classList.toggle("dim",!!g&&!m)});
  const n=g?grid.querySelectorAll(".ld.hl").length:0;
  t.querySelector("#ldnote").textContent=g?(from?`Highlighted from ${from}: `:"")+`${gname[g]||g}`+(n?"":" (not among the 14 tracked groups)"):"";}
 document.addEventListener("click",e=>{const c=e.target.closest("#grouplegend .chip[data-g]");if(c){setG(c.dataset.g,"map");return}
  const k=e.target.closest("#cards [data-map]");if(k)setG(k.dataset.map,"Who's who")},true);
 // ---------- capture ----------
 const s=document.createElement("section");s.className="tile cptile";s.id="capture";
 s.innerHTML=`<div class="tilehead"><h2>State capture and corruption: documented cases</h2><span class="muted">Convictions, charges, US sanctions, and acquittals/dismissals. Counts of cases, not a verdict on any government.</span></div>
 <div class="cplegend">${ORDER.map(k=>`<span title="${esc(cp.status_legend[k])}"><i style="background:${CST[k][1]}"></i>${CST[k][0]}</span>`).join("")}</div>
 <div class="cpwrap"><svg id="cpmap"></svg><div><div class="muted small">Cases by country (shade = total). Click a country.</div><div id="cplist"></div><div id="cpcases" class="cpcases"></div></div></div>
 <details class="more"><summary>Method and gaps</summary><p class="small">${esc(cp.method)} Status meanings: ${ORDER.map(k=>`<b>${CST[k][0]}</b>: ${esc(cp.status_legend[k])}`).join("; ")}.</p></details>`;
 anchor.parentNode.insertBefore(s,anchor);
 const tot={};cp.countries.forEach(c=>tot[c.country]=c);const mx=d3.max(cp.countries,c=>c.total);
 const col=d3.scaleSequentialSqrt([0,mx],d3.interpolateRgb("#3a2b2b","#e0605c"));
 const svg=d3.select("#cpmap"),W=svg.node().clientWidth||520,H=420;svg.attr("viewBox",`0 0 ${W} ${H}`);
 const fc=topojson.feature(topo,topo.objects.countries);
 const proj=d3.geoConicEqualArea().parallels([-15,20]).rotate([78,0]).fitExtent([[6,6],[W-6,H-6]],{type:"MultiPoint",coordinates:[[-117,32.5],[-35,-7],[-70,-28],[-81.3,-5],[-60,10]]});
 const path=d3.geoPath(proj);
 svg.append("g").selectAll("path").data(fc.features).join("path").attr("class","c").attr("d",path)
  .attr("fill",d=>tot[d.properties.iso]?col(tot[d.properties.iso].total):"#1a2742")
  .on("click",(e,d)=>tot[d.properties.iso]&&pick(d.properties.iso)).append("title").text(d=>tot[d.properties.iso]?`${tot[d.properties.iso].name}: ${tot[d.properties.iso].total} documented cases`:"No cases recorded in this dataset");
 svg.append("g").selectAll("text").data(fc.features.filter(d=>tot[d.properties.iso])).join("text").attr("transform",d=>`translate(${path.centroid(d)})`).attr("text-anchor","middle").attr("fill","#fff").attr("font-size",11).attr("font-weight",700).attr("pointer-events","none").text(d=>tot[d.properties.iso].total);
 const list=s.querySelector("#cplist");
 list.innerHTML=cp.countries.map(c=>`<div class="cprow" data-c="${c.country}"><span>${esc(c.name)}</span><span class="cpbar">${ORDER.filter(k=>c.by_status[k]).map(k=>`<span title="${CST[k][0]}: ${c.by_status[k]}" style="background:${CST[k][1]};width:${100*c.by_status[k]/mx}%"></span>`).join("")}</span><b>${c.total}</b></div>`).join("");
 list.onclick=e=>{const r=e.target.closest(".cprow");if(r)pick(r.dataset.c)};
 function pick(iso){const c=tot[iso];list.querySelectorAll(".cprow").forEach(r=>r.classList.toggle("sel",r.dataset.c===iso));svg.selectAll("path.c").classed("sel",d=>d.properties.iso===iso);
  const cs=cp.cases.filter(x=>x.country===iso).sort((a,b)=>ORDER.indexOf(a.status)-ORDER.indexOf(b.status)||b.date.localeCompare(a.date));
  const lv=Object.entries(c.by_level).map(([k,v])=>`${v} ${k}`).join(", ");
  s.querySelector("#cpcases").innerHTML=`<div class="small"><b>${esc(c.name)}</b>: ${c.total} cases (${lv})</div>`+cs.map(x=>`<div class="cp" style="border-left-color:${CST[x.status][1]}"><span class="st" style="background:${CST[x.status][1]}33;color:${CST[x.status][1]}">${CST[x.status][0]}</span> <b>${esc(x.person)}</b> <span class="m">· ${esc(x.office)} · ${esc(x.level)} · ${esc(x.date)}</span><div class="m">Group link: ${esc(x.group_link)}</div><div>${esc(x.note)}</div>${x.sources.map(A).join("")}</div>`).join("");}
 pick(cp.countries[0].country);
}).catch(e=>console.error("leaders/capture:",e));
})();
