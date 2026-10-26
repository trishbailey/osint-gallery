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
const CST={convicted:["Convicted","#c0504d"],charged:["Charged","#c8a24a"],alleged:["Alleged","#5b8fd1"],sanctioned:["Sanctioned","#8e6cc0"],pardoned:["Pardoned","#4a9a8a"],acquitted:["Acquitted","#4a9a8a"],dropped:["Dropped","#4a9a8a"],delisted:["Delisted","#4a9a8a"]};
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
 <div class="ldcharts"><div class="chbox"><h3>Members (published estimates)</h3><div id="szmem"></div></div><div class="chbox"><h3>Annual revenue, USD billions</h3><div id="szrev"></div></div><div class="chbox wide"><h3>Lines of business</h3><div id="bzgrid"></div></div></div>
 <details class="more"><summary>About these cards</summary><p class="small">${esc(ld.method)} As of ${esc(ld.as_of)}. ${esc(sz.note)} ${esc(bz.note)} * = figure for the whole Sinaloa Cartel.</p></details>`;
 {const mt=document.querySelector(".maptile");if(mt)mt.after(t);else anchor.parentNode.insertBefore(t,anchor);}
 const grid=t.querySelector("#ldgrid");
 t.addEventListener("click",e=>{if(e.target.closest("a"))return;const c=e.target.closest(".gc,.fc");if(c)c.classList.toggle("open")});
 // plain linear bar charts (members, revenue)
 const GCOL={sinaloa:"#8f8509",cjng:"#00ccff",gulf:"#ffa26a",cdn:"#307b0a",lnfm:"#1c70c5",clan:"#958fff",eln:"#8931ff",tda:"#29b47b",choneros:"#ff2400",lobos:"#b06208",pcc:"#ea34b2",ms13:"#f0c740",unidos:"#fd7db7"};
 const fN=v=>Math.round(v).toLocaleString("en-US"),fB=v=>"$"+(v>=1e9?(v/1e9).toFixed(1).replace(/\.0$/,"")+"B":Math.round(v/1e6)+"M");
 const memRows=[],revRows=[],noMem=[],noRev=[],revNotes=[];
 Object.entries(sz.groups).forEach(([k,v])=>{
  const ms=v.members.filter(e=>!e.no_credible_estimate&&e.unit==="members");
  if(!ms.length)noMem.push(v.label);else{const e=ms[0],alt=v.members.filter(x=>x!==e&&!x.no_credible_estimate&&!(x.source_name===e.source_name&&/armed/.test(x.unit)));
   let note=alt.map(x=>`${x.source_name}: ${fN(x.low)}${/armed/.test(x.unit)?" armed":""} (${x.year})`).join("; ");if(k==="ms13")note="US only, 2018";
   memRows.push({k,g:v.label,e,lo:e.low,hi:e.high,atl:e.high==null,upto:false,lab:(e.high==null?"at least ":"")+fN(e.low)+(e.high&&e.high!==e.low?"–"+fN(e.high):""),note})}
  v.revenue.forEach(e=>{if(e.no_credible_estimate)noRev.push(v.label);else if(e.unit!=="annual_revenue_usd")revNotes.push(`${v.label}: pesos only (COP ${fN(e.low/1e9)}bn/yr, ${e.year}), not converted`);
   else if(/PARTIAL/.test(e.note))revNotes.push(`${v.label}: partial only (${fB(e.low)}/yr from illegal gold mining in one area, ${e.year})`);
   else revRows.push({k,g:v.label,e,lo:e.low??e.high,hi:e.high,atl:e.high==null,upto:e.low==null,lab:(e.low==null?"up to ":e.high==null?"at least ":"")+fB(e.low??e.high),note:`${e.year} estimate`})})});
 function bars(el,rows,fmt){rows.sort((a,b)=>(b.hi??b.lo)-(a.hi??a.lo));const W=440,rh=22,ml=150,mr=120,H=rows.length*rh+22;const mx=d3.max(rows,r=>Math.max(r.hi??r.lo,r.lo)*(r.atl?1.12:1));
  const x=d3.scaleLinear([0,mx],[ml,W-mr]).nice();const sv=d3.select(el).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("class","rbars");
  sv.append("g").attr("transform",`translate(0,${H-20})`).call(d3.axisBottom(x).ticks(4).tickFormat(fmt)).attr("class","ax");
  rows.forEach((r,i)=>{const y=i*rh+2,c=GCOL[r.k]||"#8fa0bb",gg=sv.append("g");gg.append("title").text(`${r.lab}. ${r.e.note}`);
   gg.append("text").attr("x",ml-6).attr("y",y+12).attr("text-anchor","end").attr("class","bl").text(r.g.length>22?r.g.slice(0,21)+"…":r.g);
   const solidEnd=r.upto?x(0):x(r.lo);if(!r.upto)gg.append("rect").attr("x",ml).attr("y",y+3).attr("height",12).attr("width",Math.max(2,solidEnd-ml)).attr("fill",c);
   let end=solidEnd;if(r.upto){gg.append("rect").attr("x",ml).attr("y",y+3).attr("height",12).attr("width",x(r.hi)-ml).attr("fill",c).attr("fill-opacity",.35).attr("stroke",c).attr("stroke-dasharray","3 2");end=x(r.hi)}
   else if(r.hi&&r.hi>r.lo){gg.append("rect").attr("x",solidEnd).attr("y",y+3).attr("height",12).attr("width",x(r.hi)-solidEnd).attr("fill",c).attr("fill-opacity",.4);end=x(r.hi)}
   else if(r.atl){gg.append("path").attr("d",`M${solidEnd},${y+3}h14l7,6l-7,6h-14z`).attr("fill",c).attr("fill-opacity",.35);end=solidEnd+22}
   gg.append("text").attr("x",end+4).attr("y",y+12).attr("class","bv").text(r.lab);
   gg.append("text").attr("x",end+4+r.lab.length*6.2).attr("y",y+8).attr("class","bsup").text(i+1)});
  const fl=d3.select(el).append("ol").attr("class","bnotes small");fl.html(rows.map(r=>`<li><b>${esc(r.g)}</b>: ${esc(r.lab)}${r.e.year&&!/estimate/.test(r.note)?` (${r.e.year})`:""}${r.note?"; "+esc(r.note):""}${FN(SRC(r.e))}</li>`).join(""))}
 const leg=`<div class="small muted rleg"><span class="lg1"></span> estimate <span class="lg2"></span> published range <span class="lg3">▶</span> &ldquo;at least&rdquo; (lower bound) <span class="lg4"></span> &ldquo;up to&rdquo; (upper bound)</div>`;
 bars("#szmem",memRows,v=>fN(v));
 t.querySelector("#szmem").insertAdjacentHTML("beforeend",leg+`<div class="small muted">No credible estimate: ${[...new Set(noMem)].map(esc).join(", ")||"none"}. Conflicting figures from other sources are in the numbered notes.</div>`);
 bars("#szrev",revRows,v=>"$"+(v/1e9)+"B");
 t.querySelector("#szrev").insertAdjacentHTML("beforeend",leg+`<div class="small muted">No credible USD estimate: ${[...new Set(noRev)].map(esc).join(", ")}.</div><div class="small muted">${revNotes.map(esc).join(" · ")}.</div>`);
 // business heat-map
 const used=bz.lines.filter(x=>G.some(g=>(bz.groups[g.id]||{})[x.id]));
 t.querySelector("#bzgrid").innerHTML=`<table class="bz"><thead><tr><th></th>${used.map(x=>`<th title="${esc(x.label)}"><div class="vl"><span class="vli">${BI[x.id]||"·"}</span> ${esc(x.label)}</div></th>`).join("")}</tr></thead><tbody>${G.map(g=>`<tr><th>${esc(g.name)}</th>${used.map(x=>{const c=(bz.groups[g.id]||{})[x.id];return `<td>${c?`<span class="hm ${c.level}" title="${esc(x.label)}: ${c.level}">${c.level==="primary"?"●":c.level==="secondary"?"◐":"○"}</span>${FN({name:x.label,url:c.source_url})}`:""}</td>`}).join("")}</tr>`).join("")}</tbody></table><div class="small muted">● primary ◐ secondary ○ minor. Empty = no source found.</div>`;
 function setG(g,from){grid.parentNode.querySelectorAll(".ld").forEach(c=>{const m=!g||c.dataset.g.split(" ").includes(g);c.classList.toggle("hl",!!g&&m);c.classList.remove("dim")});
  const n=g?grid.querySelectorAll(".ld.hl").length:0;
  t.querySelector("#ldnote").textContent=g?(from?`Highlighted from ${from}: `:"")+`${gname[g]||g}`+(n?"":" (not among the 14 tracked groups)"):"";}
 document.addEventListener("click",e=>{const c=e.target.closest("#grouplegend .chip[data-g]");if(c){setG(c.dataset.g,"map");return}
  const k=e.target.closest("#cards [data-map]");if(k)setG(k.dataset.map,"Who's who")},true);
 // ---------- documented corruption cases: one collapsed section (no map overlay) ----------
 const s=document.createElement("section");s.className="tile cptile";s.id="capture";
 const cases=cp.cases.slice().sort((a,b)=>a.country.localeCompare(b.country)||ORDER.indexOf(a.status)-ORDER.indexOf(b.status)||b.date.localeCompare(a.date));
 const cname={};cp.countries.forEach(c=>cname[c.country]=c.name);
 s.innerHTML=`<details class="more"><summary><b>Documented corruption cases (${cp.cases.length})</b> <span class="muted">· convictions, charges, US sanctions, acquittals/dismissals; counts of cases, not a verdict on any government</span></summary>
 <div class="cpcases">${cp.countries.map(c=>`<h3>${esc(c.name)} (${c.total})</h3>`+cases.filter(x=>x.country===c.country).map(x=>`<div class="cp" style="border-left-color:${CST[x.status][1]}"><span class="st" style="background:${CST[x.status][1]}33;color:${CST[x.status][1]}">${CST[x.status][0]}</span> <b>${esc(x.person)}</b> <span class="m">· ${esc(x.office)} · ${esc(x.level)} · ${esc(x.date)}</span><div class="m">Group link: ${esc(x.group_link)}</div><div>${esc(x.note)}</div>${x.sources.map(A).join("")}</div>`).join("")).join("")}</div>
 <p class="small muted">${esc(cp.method)}</p></details>`;
 const ov=document.querySelector("section.ovtile");ov.parentNode.insertBefore(s,ov.nextElementSibling);
}).catch(e=>console.error("leaders/capture:",e));
})();
