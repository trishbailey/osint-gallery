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
 const noCard=g=>{if(!["unidos"].includes(g))return "";const v=sz.groups[g];if(!v)return "";const nm=v.members.find(e=>e.no_credible_estimate),nr=v.revenue.find(e=>e.no_credible_estimate);return `<p class="small">Members: ${nm?"No credible estimate"+(nm.note&&nm.note!=="None found."?" ("+esc(nm.note.replace(/\.$/,""))+")":""):""}. Revenue: ${nr?"No credible estimate":""}.</p>`};
 const person=l=>`<div class="lp"><div class="ph">${ph(l)}</div><div class="lpt"><b>${esc(l.name)}</b>${l.alias?`<div class="al">“${esc(l.alias)}”</div>`:""}${l.faction&&l.role==="faction_leader"?`<div class="rl">${esc(l.faction)}</div>`:""}
  <div class="bdg">${ICON(l)}${l.confidence?`<span class="cf ${CONF[l.confidence][1]}" title="${esc(l.confidence)}">${CONF[l.confidence][0]}</span>`:""}${l.role==="reported_successor"?`<span class="cf c3">Successor?</span>`:""}${l.reward_usd?`<span class="rw" title="US reward">${usd(l.reward_usd)}</span>`:""}</div></div></div>`;
 const more=l=>`<div class="lmore"><b>${esc(l.name)}</b>: ${esc(l.title)}. ${esc(l.status_note)}${FN(l.status_source)}${l.reward_usd?` Reward up to ${usd(l.reward_usd)}${FN(l.reward_source)}.`:""} ${esc(l.known_for)}${l.leadership_note?" "+esc(l.leadership_note):""}${l.sources.map(FN).join("")}${l.charges.length?`<ul>${l.charges.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>`:""}${(l.photo&&!l.photo.placeholder)?`<div class="lic">Photo: ${esc(l.photo.credit)}, ${esc(l.photo.license)}${FN({name:"photo",url:l.photo.image_source_url})}</div>`:""}</div>`;
 t.innerHTML=`<div class="tilehead"><h2>Who's in charge now</h2><span class="muted">One card per group. Tap a card for details. Badges: Official = confirmed by officials; Multiple outlets; Contested.</span></div>
 <div id="ldnote" class="muted small"></div>
 <div class="nowgrid" id="ldgrid">${G.map(g=>{const ls=live(g.id);return `<div class="gc ld" data-g="${g.id}${["chapitos","mayiza"].includes(g.id)?" sinaloa":""}" tabindex="0">
  <div class="gch"><span class="gchip">${esc(g.name)}</span>${LS[g.leadership]?`<span class="lsb ${g.leadership}">${LS[g.leadership]}</span>`:""}</div>
  ${ls.length?ls.map(person).join(""):`<div class="unk">? Leadership unknown</div>`}
  <div class="gcf">${sizeBadge(g.id)}<span class="bis">${bizIcons(g.id)}</span></div>
  <div class="bd"><p>${esc(g.leadership_note)}${g.sources.map(FN).join("")}</p>${noCard(g.id)}${ls.map(more).join("")}</div></div>`}).join("")}</div>
 <details class="more former"><summary>Jailed, extradited or dead (${former.length})</summary><div class="fgrid">${former.map(l=>`<div class="fc ld" data-g="${l.group_key}" tabindex="0">${person(l)}<span class="gchip sm">${esc((G.find(g=>g.id===l.group_key)||{}).name||l.group_key)}</span><div class="bd">${more(l)}</div></div>`).join("")}</div></details>
 <div class="ldcharts"><div class="chbox wide"><h3>How the business shifted</h3><div id="bzshift"></div></div></div>
 <details class="more"><summary>About these cards</summary><p class="small">${esc(ld.method)} As of ${esc(ld.as_of)}. ${esc(sz.note)} ${esc(bz.note)} * = figure for the whole Sinaloa Cartel.</p></details>`;
 {const mt=document.querySelector(".maptile");if(mt)mt.after(t);else anchor.parentNode.insertBefore(t,anchor);}
 const grid=t.querySelector("#ldgrid");
 t.addEventListener("click",e=>{if(e.target.closest("a"))return;const c=e.target.closest(".gc,.fc");if(c)c.classList.toggle("open")});
 // group colours (members/revenue bar charts moved onto profile cards; kept for palette_check)
 const GCOL={sinaloa:"#8f8509",cjng:"#00ccff",gulf:"#ffa26a",cdn:"#307b0a",lnfm:"#1c70c5",clan:"#958fff",eln:"#8931ff",tda:"#29b47b",choneros:"#ff2400",lobos:"#b06208",pcc:"#ea34b2",ms13:"#f0c740",unidos:"#fd7db7"};
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
