/* Phone layout (<=640px): summary chips, region clusters on the map, filter sheet, grouped collapsible cards, bottom-sheet details, sideways-scrolling graphics. Does nothing on wider screens. */
(function(){
if(!window.matchMedia("(max-width:640px)").matches)return;
const $=id=>document.getElementById(id);
const REG={mexico:{n:"Mexico",s:"Mexico",ll:[-102.5,23.5],box:[[-117.5,14.5],[-86.5,32.8]]},ca:{n:"Central America and Haiti",s:"Central America",ll:[-84,15.5],box:[[-92.5,7],[-71.5,20.5]]},andes:{n:"Andes and Venezuela",s:"Andes",ll:[-74.5,0],box:[[-82,-18],[-59,12.5]]},south:{n:"Brazil and Southern Cone",s:"Brazil",ll:[-50,-17],box:[[-74,-40],[-34,5]]}};
const ISO2R={MEX:"mexico",GTM:"ca",HND:"ca",SLV:"ca",HTI:"ca",NIC:"ca",CRI:"ca",PAN:"ca",BLZ:"ca",COL:"andes",VEN:"andes",ECU:"andes",PER:"andes",BOL:"andes",BRA:"south",PRY:"south",ARG:"south",CHL:"south",URY:"south"};
const ALIAS={chapitos:"sinaloa",mayiza:"sinaloa",viv_ansanm:"haiti"};
const ORDER=["mexico","ca","andes","south"];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const when=(test,fn,max=80)=>{let n=0;const t=setInterval(()=>{const r=test();if(r||++n>max){clearInterval(t);if(r)fn(r)}},250)};
const drawer=html=>{$("dbody").innerHTML=html;$("drawer").classList.add("on");back.classList.add("on")};
/* backdrop shared by the details sheet and the filter sheet */
const back=document.createElement("div");back.className="mback";document.body.appendChild(back);
const side=document.querySelector(".mapside");
const closeAll=()=>{$("drawer").classList.remove("on");side&&side.classList.remove("msheet");back.classList.remove("on")};
back.onclick=closeAll;
new MutationObserver(()=>{if(!$("drawer").classList.contains("on")&&!(side&&side.classList.contains("msheet")))back.classList.remove("on");else back.classList.add("on")}).observe($("drawer"),{attributes:true,attributeFilter:["class"]});
fetch("data/group_countries.json").then(r=>r.json()).catch(()=>({groups:{}})).then(GCN=>{
 const regOf=id=>{id=ALIAS[id]||id;const g=GCN.groups[id];return g?ISO2R[g.home]||"south":null};
 const nameOf=id=>{const c=document.querySelector(`#grouplegend .chip[data-g="${id}"] .gname`);return c?c.textContent:id};
 /* 1. filters behind one button */
 const mt=document.querySelector(".maptile"),mr=document.querySelector(".maprow");
 if(mt&&mr&&side){
  const p=document.createElement("div");p.className="mprompt";p.textContent="Tap a region bubble or a state for details. Pinch to zoom.";
  const bar=document.createElement("div");bar.className="mfbar";bar.innerHTML='<button class="mfbtn" aria-haspopup="dialog">⚙️ Filters: groups and routes</button><span class="mfstate" aria-live="polite"></span>';
  mr.parentNode.insertBefore(p,mr);mr.parentNode.insertBefore(bar,mr);
  const hd=document.createElement("div");hd.className="mshhead";hd.innerHTML='<b>Filters</b><button class="mshdone">Done</button>';side.insertBefore(hd,side.firstChild);
  side.setAttribute("role","dialog");side.setAttribute("aria-label","Map filters");
  bar.querySelector(".mfbtn").onclick=()=>{side.classList.add("msheet");back.classList.add("on")};
  hd.querySelector(".mshdone").onclick=closeAll;
  const upd=()=>{const on=document.querySelector("#grouplegend .chip.on[data-g]:not([data-g=''])");const r=[...document.querySelectorAll("#routebox input:checked")].length;
   bar.querySelector(".mfstate").textContent=(on?nameOf(on.dataset.g):"All groups")+(r?` · ${r} route layer${r>1?"s":""}`:"")};
  side.addEventListener("click",()=>setTimeout(upd,60));side.addEventListener("change",upd);when(()=>document.querySelector("#grouplegend .chip"),upd);
 }
 /* 2. region clusters with counts on the map */
 const counts={};Object.keys(GCN.groups).forEach(id=>{const r=regOf(id);if(r)(counts[r]=counts[r]||[]).push(id)});
 when(()=>window.__proj&&document.querySelector("#mapsvg>g path"),()=>{
  const g=document.querySelector("#mapsvg>g"),NS="http://www.w3.org/2000/svg",cg=document.createElementNS(NS,"g");cg.setAttribute("class","mclusters");
  ORDER.filter(r=>counts[r]).forEach(r=>{const [x,y]=window.__proj(REG[r].ll),n=counts[r].length,R=16+n*1.6;
   const e=document.createElementNS(NS,"g");e.setAttribute("class","pt mclu");e.dataset.t=`translate(${x},${y})`;e.setAttribute("transform",`${e.dataset.t} scale(${1/(window.__zk||1)})`);
   e.setAttribute("role","button");e.setAttribute("tabindex","0");e.setAttribute("aria-label",`${REG[r].n}: ${n} groups`);
   e.innerHTML=`<circle r="${R}" fill="#0b1526" fill-opacity=".85" stroke="#c8a24a" stroke-width="3"/><text text-anchor="middle" dy="5" fill="#e6e9ef">${n}</text><text class="ml" text-anchor="middle" y="${R+16}">${esc(REG[r].s)}</text>`;
   const open=()=>{drawer(`<h2>${esc(REG[r].n)}</h2><p class="muted">${n} groups based here. Tap one to show only its footprint.</p><div class="mglist">${counts[r].map(id=>`<button class="mdet" data-mg="${id}">${esc(nameOf(id))}</button>`).join("")}</div><button class="mdet" data-mz="1">🔍 Zoom the map to this region</button><button class="mdet" data-mg="">Show all groups</button>`);
    $("dbody").querySelectorAll("[data-mg]").forEach(b=>b.onclick=()=>{const c=document.querySelector(`#grouplegend .chip[data-g="${b.dataset.mg}"]`);c&&c.click();closeAll();mt.scrollIntoView({behavior:"smooth"})});
    $("dbody").querySelector("[data-mz]").onclick=()=>{window.MAPZ&&window.MAPZ.fitLL(REG[r].box);closeAll()}};
   e.addEventListener("click",ev=>{ev.stopPropagation();open()});e.addEventListener("keydown",ev=>{if(ev.key==="Enter")open()});cg.appendChild(e)});
  g.appendChild(cg);
  /* start on the whole region so every cluster is visible */
  setTimeout(()=>window.MAPZ&&window.MAPZ.view("all"),400);
  /* clusters fade out once zoomed into a region, so states stay tappable */
  new MutationObserver(()=>{const z=(window.__zk||1)>2.2;cg.style.display=z?"none":"";document.getElementById("mapsvg").classList.toggle("mclon",!z)}).observe(g,{attributes:true,attributeFilter:["transform"]});
 });
 /* 3. grouped collapsible sections, one card per row, details in the bottom sheet */
 const group=(gridSel,cardSel,label,openFirst=true)=>when(()=>{const gr=document.querySelector(gridSel);return gr&&gr.querySelector(cardSel)&&gr},gr=>{
  const cards=[...gr.querySelectorAll(":scope>"+cardSel)];const by={};
  cards.forEach(c=>{const r=regOf((c.dataset.g||"").split(" ")[0])||"south";(by[r]=by[r]||[]).push(c)});
  ORDER.filter(r=>by[r]).forEach((r,i)=>{const d=document.createElement("details");d.className="mgrp";if(i===0&&openFirst)d.open=true;
   d.innerHTML=`<summary>${esc(REG[r].n)} <span class="mcnt">${by[r].length} ${label}</span></summary><div class="mgbody"></div>`;
   by[r].forEach(c=>d.lastChild.appendChild(c));gr.appendChild(d)});
  gr.style.display="block";return gr});
 group("#profiles .pfgrid",".pfcard","groups");
 when(()=>document.querySelector("#profiles .mgrp"),()=>document.querySelectorAll("#profiles .pfcard").forEach(c=>{const b=document.createElement("button");b.className="mdet";b.textContent="Full profile ▸";
  b.onclick=()=>{const k=c.cloneNode(true);k.querySelector(".mdet")?.remove();k.querySelector(".pfmore")?.setAttribute("open","");drawer(k.outerHTML)};c.appendChild(b)}));
 /* 4. wide graphics: full size, sideways scroll with a hint */
 const swipe=el=>{if(!el||el.dataset.msw)return;el.dataset.msw=1;const w=document.createElement("div");w.className="mscroll";el.parentNode.insertBefore(w,el);w.appendChild(el);
  const h=document.createElement("div");h.className="mswipe";h.textContent="↔ Swipe sideways to see the whole chart";w.parentNode.insertBefore(h,w)};
 when(()=>$("netsvg")&&$("netsvg").getAttribute("width"),()=>{const n=$("netsvg");n.style.width=n.getAttribute("width")+"px";swipe(n.parentNode.style.overflowX?n.parentNode:n)});
 when(()=>document.querySelector("#timeline .tl-wrap"),w=>{const h=document.createElement("div");h.className="mswipe";h.textContent="↔ Swipe sideways along the years";w.parentNode.insertBefore(h,w)});
});
})();
