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
