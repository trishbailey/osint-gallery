/* Left map sidebar: full group names + country flags on the clickable group chips (click handlers from app.js stay attached). */
(function(){
const FULL={sinaloa:"Sinaloa Cartel",cjng:"Jalisco New Generation Cartel (CJNG)",gulf:"Gulf Cartel",cdn:"Cartel del Noreste (CDN)",lnfm:"La Nueva Familia Michoacana",juarez:"Juárez Cartel / La Línea",clan:"Clan del Golfo",eln:"National Liberation Army (ELN)",exfarc:"FARC dissidents",tda:"Tren de Aragua",choneros:"Los Choneros",lobos:"Los Lobos",pcc:"Primeiro Comando da Capital (PCC)",cv:"Comando Vermelho",ms13:"Mara Salvatrucha (MS-13)",b18:"Barrio 18",haiti:"Viv Ansanm / Gran Grif"};
const I2={MEX:"MX",USA:"US",GTM:"GT",HND:"HN",SLV:"SV",COL:"CO",VEN:"VE",ECU:"EC",PER:"PE",CHL:"CL",BRA:"BR",PRY:"PY",HTI:"HT",BOL:"BO",ARG:"AR",ESP:"ES",AUS:"AU",PRT:"PT",NIC:"NI",CRI:"CR",PAN:"PA",DOM:"DO",BLZ:"BZ",URY:"UY",GUY:"GY",SUR:"SR",CAN:"CA",CHN:"CN",ITA:"IT",NLD:"NL",BEL:"BE",JAM:"JM",TTO:"TT"};
const flag=i=>(I2[i]||"").replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
fetch("data/group_countries.json").then(r=>r.json()).catch(()=>({groups:{}})).then(GCN=>{
 let n=0;const t=setInterval(()=>{const cs=document.querySelectorAll("#grouplegend .chip[data-g]:not([data-full])");
  cs.forEach(b=>{const id=b.dataset.g;if(!id){b.dataset.full=1;return}const dot=b.querySelector(".dot");const g=GCN.groups[id];
   const fl=g?g.countries.map(c=>flag(c.iso)).filter(Boolean).join(" "):"";
   b.dataset.full=1;b.innerHTML=(dot?dot.outerHTML:"")+`<span class="gname">${esc(FULL[id]||b.textContent.trim())}</span>`+(fl?`<span class="gflags">${fl}</span>`:"")});
  if((cs.length&&document.querySelector("#grouplegend .chip[data-g='']"))||++n>60)clearInterval(t)},250)});
})();
/* Desktop: lock the sidebar height to the map box so the route toggles stay beside the map */
(function(){
const mq=window.matchMedia("(min-width:821px)"),side=document.querySelector(".mapside"),mw=document.querySelector(".maprow>.mapwrap");
if(!side||!mw)return;
const fit=()=>{if(!mq.matches){side.style.height="";return}side.style.height=mw.getBoundingClientRect().height+"px"};
if(window.ResizeObserver)new ResizeObserver(fit).observe(mw);window.addEventListener("resize",fit);mq.addEventListener&&mq.addEventListener("change",fit);fit();
})();
/* Label floor: SVG text drawn inside a scaled viewBox can render below 13px; raise any such label so it shows at >=13px on screen */
(function(){
const fix=()=>document.querySelectorAll("svg text").forEach(t=>{const m=t.getScreenCTM&&t.getScreenCTM();if(!m)return;const s=Math.hypot(m.a,m.b);if(!s)return;
 const f=parseFloat(getComputedStyle(t).fontSize);if(f*s<13)t.style.fontSize=(13.05/s).toFixed(2)+"px"});
let q;const run=()=>{clearTimeout(q);q=setTimeout(fix,200)};
[800,2000,4000,8000].forEach(d=>setTimeout(fix,d));window.addEventListener("resize",run);
if(window.MutationObserver)new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();
/* keep the map zoom buttons below the Presence legend strip */
(function(){const k=document.getElementById("keybox");if(!k||!window.ResizeObserver)return;
const fit=()=>{const z=document.querySelector(".mapwrap .zoombtns");if(z)z.style.top=(k.offsetHeight+10)+"px"};
new ResizeObserver(fit).observe(k);setTimeout(fit,1500);setTimeout(fit,4000)})();
