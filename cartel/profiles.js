/* Group profile cards (data/profiles.json): placed between "Who's in charge now" (#leaders) and "What's new" (#whatsnew). Always shows every group. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FNx=r=>window.FN?window.FN(r):"";
const I2={MEX:"MX",USA:"US",GTM:"GT",HND:"HN",SLV:"SV",COL:"CO",VEN:"VE",ECU:"EC",PER:"PE",CHL:"CL",BRA:"BR",PRY:"PY",HTI:"HT",BOL:"BO",ARG:"AR",ESP:"ES",AUS:"AU",PRT:"PT",CRI:"CR",PAN:"PA"};
const NM={MEX:"Mexico",USA:"United States",GTM:"Guatemala",HND:"Honduras",SLV:"El Salvador",COL:"Colombia",VEN:"Venezuela",ECU:"Ecuador",PER:"Peru",CHL:"Chile",BRA:"Brazil",PRY:"Paraguay",HTI:"Haiti",BOL:"Bolivia",ARG:"Argentina",ESP:"Spain",AUS:"Australia",PRT:"Portugal",CRI:"Costa Rica",PAN:"Panama"};
const flag=i=>(I2[i]||"").replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)))||i;
const EMO={fentanyl:"💊",meth:"⚗️",cocaine:"❄️",heroin:"💉",marijuana:"🌿",drugs_unspecified:"💊",precursors:"🧪",migrant_smuggling:"🚶",human_trafficking:"⛓️",extortion:"💰",kidnapping:"🚐",fuel_theft:"⛽",illegal_mining:"⛏️",logging_fishing:"🪵",arms:"🔫",money_laundering:"🏦",legit_economies:"🏢"};
const SHORT={drugs_unspecified:"Drugs",precursors:"Precursors",migrant_smuggling:"Migrant smuggling",human_trafficking:"Trafficking",logging_fishing:"Logging/fishing",arms:"Arms",money_laundering:"Laundering",legit_economies:"Legal economies",illegal_mining:"Illegal mining"};
const J=u=>fetch(u).then(r=>r.json());
Promise.all([J("data/profiles.json"),J("data/group_countries.json"),J("data/groups_business.json"),J("data/territory.json")]).then(([PR,GCN,BIZ,T])=>{
 const COL=Object.fromEntries(T.groups.map(g=>[g.id,g.color]));
 const LBL=Object.fromEntries(BIZ.lines.map(l=>[l.id,l.label]));const RANK={primary:0,secondary:1,minor:2};
 const lines=p=>{if(p.lines)return p.lines.map(id=>({id,c:p.lines_c}));const m={};(p.biz||[]).forEach(g=>{const b=BIZ.groups[g]||{};Object.entries(b).forEach(([id,v])=>{if(!v||!v.level)return;const r=RANK[v.level]??3;if(!(id in m)||r<m[id].r)m[id]={r,url:v.source_url}})});
   return Object.entries(m).filter(([,v])=>v.r<=1).sort((a,b)=>a[1].r-b[1].r).map(([id,v])=>({id,c:v.url?{url:v.url,name:(()=>{try{return new URL(v.url).hostname.replace(/^www\./,"")}catch(e){return "source"}})()}:null}))};
 const chart=(p,col)=>{const s=(p.membership_series||[]).slice().sort((a,b)=>a.year-b.year);
   if(s.length<2)return `<div class="pfnochart">No credible time series</div>`;
   const W=260,H=110,l=36,r=16,t=16,b=22,y0=Math.min(...s.map(d=>d.year)),y1=Math.max(...s.map(d=>d.year));
   const mx=Math.max(...s.map(d=>d.high??d.low))*1.15;const X=y=>l+14+(y1===y0?0:(y-y0)/(y1-y0))*(W-l-r-14),Y=v=>t+(1-v/mx)*(H-t-b);
   const fmt=v=>v>=1000?(Math.round(v/100)/10)+"k":v;
   const band=s.some(d=>d.high!=null&&d.high>d.low)?`<path d="M${s.map(d=>X(d.year)+","+Y(d.high??d.low)).join("L")}L${s.slice().reverse().map(d=>X(d.year)+","+Y(d.low)).join("L")}Z" fill="${col}" opacity=".22"/>`:"";
   const tk=[0,mx/1.15].map(v=>`<line x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a3d61"/><text x="${l-4}" y="${Y(v)+4}" text-anchor="end">${fmt(Math.round(v))}</text>`).join("");
   return `<svg class="pfchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Membership estimates by year">${tk}${band}<polyline points="${s.map(d=>X(d.year)+","+Y(d.low)).join(" ")}" fill="none" stroke="${col}" stroke-width="2.5"/>${s.map(d=>`<circle cx="${X(d.year)}" cy="${Y(d.low)}" r="4" fill="${col}"><title>${d.year}: ${d.low.toLocaleString()}${d.high==null?"+":d.high>d.low?"–"+d.high.toLocaleString():""}</title></circle><text x="${X(d.year)}" y="${Y(d.low)-7}" text-anchor="middle" class="v">${fmt(d.low)}${d.high==null?"+":""}</text><text x="${X(d.year)}" y="${H-6}" text-anchor="middle">${d.year}</text>`).join("")}</svg>`};
 const card=p=>{const col=COL[p.id]||"#e4572e";const gc=GCN.groups[p.id];const cs=gc?gc.countries:[];const s=p.membership_series||[];
   const srcs=[...new Set(s.map(d=>d.source))];
   return `<div class="pfcard" data-g="${p.id}" style="--c:${col}">
   ${p.image?`<figure class="pfimg"><img src="${esc(p.image.src)}" alt="${esc(p.image.caption)}" loading="lazy"><figcaption>${esc(p.image.caption)} · <a href="${esc(p.image.page)}" target="_blank" rel="noopener">${esc(p.image.author)}, ${esc(p.image.license)}</a></figcaption></figure>`:""}
   <h3>${esc(p.name)}</h3>${p.abbr?`<div class="pfabbr">${esc(p.abbr)}</div>`:""}
   <p class="pfwhat">${esc(p.what)}${FNx(p.what_c)}</p>
   <div class="pffound">🏁 ${esc(p.founded)}${FNx(p.founded_c)}</div>
   <div class="pfflags">${cs.map(c=>`<span class="pfflag" title="${esc(NM[c.iso]||c.iso)}">${flag(c.iso)}<span class="pfcn">${esc(NM[c.iso]||c.iso)}</span></span>`).join("")}${gc?FNx([...new Set(cs.flatMap(c=>c.cites||[]))]):""}</div>
   <div class="pflines">${lines(p).map(x=>`<span class="pfchip">${EMO[x.id]||"•"} ${esc(SHORT[x.id]||LBL[x.id]||x.id)}${x.c?FNx(x.c):""}</span>`).join("")||`<span class="muted small">No sourced crime lines</span>`}</div>
   <div class="pfmem"><div class="pfmemh">Members over time</div>${chart(p,col)}<div class="pfnote">${p.series_note?esc(p.series_note):""}${srcs.length?FNx(srcs):""}</div></div>
   <details class="pfmore"><summary>More</summary>${(p.more||[]).map(([t,c])=>`<p>${esc(t)}${FNx(c)}</p>`).join("")}</details></div>`};
 const sec=document.createElement("section");sec.className="tile pftile";sec.id="profiles";
 sec.innerHTML=`<details open class="pfdet"><summary><h2>Group profiles</h2><span class="muted"> · who each group is, where it operates, what it does</span></summary><div class="pfgrid">${PR.profiles.map(card).join("")}</div><div class="muted small">As of ${esc(PR.as_of)}. Descriptive only. Flags: sourced presence (home country first); absence means no sourced entry. Crime chips: primary/secondary activities in cited sources.</div></details>`;
 const place=()=>{const wn=document.getElementById("whatsnew"),ld=document.getElementById("leaders");
   if(wn){if(wn.previousElementSibling!==sec)wn.before(sec)}else if(ld){if(ld.nextElementSibling!==sec)ld.after(sec)}else if(!sec.isConnected){const mt=document.querySelector(".maptile");mt?mt.after(sec):document.body.appendChild(sec)}};
 place();let n=0;const iv=setInterval(()=>{place();if(++n>60)clearInterval(iv)},250);
 const lg=document.getElementById("grouplegend");if(lg)lg.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const g=b.dataset.g;sec.querySelectorAll(".pfcard").forEach(c=>c.classList.toggle("hl",!!g&&c.dataset.g===g))});
}).catch(e=>console.warn("profiles",e));
})();
