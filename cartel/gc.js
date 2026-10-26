/* Countries per group (data/group_countries.json): flag rows on cards, auto-zoom + "outside the map" note on cartel filter. */
(function(){
const I2={MEX:"MX",USA:"US",GTM:"GT",HND:"HN",SLV:"SV",COL:"CO",VEN:"VE",ECU:"EC",PER:"PE",CHL:"CL",BRA:"BR",PRY:"PY",HTI:"HT",BOL:"BO",ARG:"AR",ESP:"ES",AUS:"AU",PRT:"PT"};
const NM={MEX:"Mexico",USA:"US",GTM:"Guatemala",HND:"Honduras",SLV:"El Salvador",COL:"Colombia",VEN:"Venezuela",ECU:"Ecuador",PER:"Peru",CHL:"Chile",BRA:"Brazil",PRY:"Paraguay",HTI:"Haiti",PRT:"Portugal",BOL:"Bolivia",ARG:"Argentina",ESP:"Spain",AUS:"Australia"};
const flag=i=>(I2[i]||"").replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)))||i;
const ALIAS={viv_ansanm:"haiti",chapitos:"sinaloa",mayiza:"sinaloa"};
const ct=ids=>typeof cite==="function"?cite(ids):"";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const OUT=new Set(["USA","PRT","ESP","AUS"]);const SA=new Set(["COL","VEN","ECU","PER","CHL","BRA","PRY","BOL","ARG"]);
fetch("data/group_countries.json").then(r=>r.json()).then(GCN=>{
 const G=id=>GCN.groups[ALIAS[id]||id];
 const row=g=>`<div class="gcc" style="display:flex;flex-wrap:wrap;gap:2px 6px;max-width:100%">${g.countries.map(c=>`<span class="gcf" title="${esc(NM[c.iso]||c.iso)}" style="cursor:help;font-size:16px">${flag(c.iso)}</span>`).join("")}</div>`;
 function deco(){document.querySelectorAll("#cards .gc:not([data-gcc])").forEach(el=>{const n=window.NET||(typeof NET!=="undefined"?NET:null);const x=n&&n.groups?n.groups[+el.dataset.k]:(n&&n[+el.dataset.k]);const g=x&&G(x.id);el.dataset.gcc=1;if(g)el.querySelector("h4").insertAdjacentHTML("afterend",row(g))});
  document.querySelectorAll(".nowgrid .ld:not([data-gcc])").forEach(el=>{const g=G(el.dataset.g.split(" ")[0]);el.dataset.gcc=1;const h=el.querySelector(".gch");if(g&&h)h.insertAdjacentHTML("afterend",row(g))})}
 let n=0;const t=setInterval(()=>{deco();if(++n>40)clearInterval(t)},300);
 const lg=document.getElementById("grouplegend");const note=document.createElement("div");note.id="gcnote";note.className="gcnote small";lg.after(note);
 lg.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const id=b.dataset.g;note.innerHTML="";if(!id)return;const g=G(id);if(!g)return;
  const inmap=g.countries.filter(c=>!OUT.has(c.iso)).map(c=>c.iso);const v=inmap.every(i=>i==="MEX")?"mx":inmap.every(i=>SA.has(i))?"sa":"all";
  setTimeout(()=>{if(window.MAPZ)window.MAPZ.view(v)},50);
  const out=g.countries.filter(c=>OUT.has(c.iso));
  note.innerHTML=`<b>Countries:</b> ${g.countries.map(c=>flag(c.iso)+" "+esc(NM[c.iso]||c.iso)).join(" · ")}`+(out.length?` — <b>Also active outside the map:</b> ${out.map(c=>esc(NM[c.iso]||c.iso)+ct(c.cites)).join(", ")}`:"")});
}).catch(e=>console.warn("group_countries",e));
})();
/* Name the selected state in the map title (group). */
(()=>{const h=document.querySelector(".maptile h2");if(!h)return;const base="Who is active where";
 const upd=()=>{const g=document.querySelector("#grouplegend .chip.on");
  h.textContent=`${base}: ${g&&g.dataset.g?(g.querySelector(".gname")||g).textContent.trim():"all groups"}`};
 document.addEventListener("click",e=>{if(e.target.closest("#grouplegend .chip"))setTimeout(upd,0)});setTimeout(upd,1500);setTimeout(upd,4000)})();
