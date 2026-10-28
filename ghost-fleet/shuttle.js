// Lead finding: the Pacific shuttle (Kozmino -> Shandong) and the rise of the Russian flag. Data: data/shuttle.json (built by _src/shuttle.py).
(async function(){
const S=await fetch("data/shuttle.json").then(r=>r.json());
while(!window.GF)await new Promise(r=>setTimeout(r,50));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const CC={CHN:"#9b7be8",IND:"#e8913a",TUR:"#4fa3e0"},CN={CHN:"China",IND:"India",TUR:"Turkey",RUS:"Russia",CMR:"Cameroon",SLE:"Sierra Leone",STP:"São Tomé and Príncipe",OMN:"Oman"};
const F={CHN:'<rect width="30" height="20" fill="#de2910"/><polygon points="5,3 6.2,6.6 10,6.6 7,8.8 8.1,12.4 5,10.2 1.9,12.4 3,8.8 0,6.6 3.8,6.6" fill="#ffde00"/>',
 IND:'<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ff9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="1"/>',
 TUR:'<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/><polygon points="17,10 19.8,9 19.8,11" fill="#fff"/>',
 RUS:'<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>',
 CMR:'<rect width="10" height="20" fill="#007a5e"/><rect x="10" width="10" height="20" fill="#ce1126"/><rect x="20" width="10" height="20" fill="#fcd116"/><polygon points="15,6.5 16,9.3 19,9.3 16.6,11 17.5,13.8 15,12.1 12.5,13.8 13.4,11 11,9.3 14,9.3" fill="#fcd116"/>',
 SLE:'<rect width="30" height="20" fill="#1eb53a"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#0072c6"/>',
 STP:'<rect width="30" height="20" fill="#12ad2b"/><rect y="5" width="30" height="10" fill="#ffce00"/><polygon points="0,0 9,10 0,20" fill="#d21034"/>'};
const flag=c=>F[c]?`<svg class="flg" data-ci-ignore viewBox="0 0 30 20" width="21" height="14" role="img" aria-label="${esc(CN[c]||c)} flag"><title>${esc(CN[c]||c)}</title>${F[c]}</svg>`:"";
const cy=Object.fromEntries(S.cycle.map(c=>[c.dest,c]));
const big=S.cycle.reduce((m,c)=>Math.max(m,c.days||0),0);
const shan=S.ports.filter(p=>p.lat>34.5&&p.lat<38.5&&p.lon<121.5).reduce((a,p)=>a+p.n,0);
const fNow=S.coreFlags.filter(f=>f[0]!=="RUS").slice(0,3);
const rs=S.rusSnap,full=S.rusMonths.filter(m=>m.m>S.window[0].slice(0,7)),first=full[0],last=full[full.length-1];
const pc=m=>Math.round(100*m.rus/m.all),mn=m=>new Date(m.m+"-15").toLocaleString("en-GB",{month:"short",year:"numeric"});
// headline
document.getElementById("leadh").textContent=`${S.core} tankers made a third of the fleet's oil voyages, shuttling between Russia's Pacific port and China`;
document.getElementById("leadp").textContent=`The same ships keep loading at Kozmino and sailing to China, which fits a dedicated shuttle pattern.`;
// chips
document.getElementById("leadchips").innerHTML=[[S.core+" ships","with 5+ voyages each"],[S.coreVoyPct+"%","of voyages, from "+S.coreShipPct+"% of ships"],[Math.round(cy.CHN.days)+" days","between loads, China run"]].map(c=>`<div class="lchip"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join("");
// map
const W=760,H=520,lo0=116.5,lo1=137.5,la0=29.5,la1=45.5;
const my=la=>Math.log(Math.tan(Math.PI/4+la*Math.PI/360)),X=lo=>(lo-lo0)/(lo1-lo0)*W,Y=la=>(my(la1)-my(la))/(my(la1)-my(la0))*H;
const ring=r=>"M"+r.map(p=>X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join("L")+"Z";
let land="";GF.LAND.features.forEach(f=>{const g=f.geometry;if(!g)return;const polys=g.type==="Polygon"?[g.coordinates]:g.type==="MultiPolygon"?g.coordinates:[];
 polys.forEach(p=>{const o=p[0];if(!o.some(q=>q[0]>lo0-3&&q[0]<lo1+3&&q[1]>la0-3&&q[1]<la1+3))return;land+=`<path d="${p.map(ring).join("")}"><title>${esc(f.properties.n||"")}</title></path>`})});
const rt=(S.route||[]).map(p=>[X(p[1]),Y(p[0])]);const rd="M"+rt.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join("L");
const mid=rt[Math.floor(rt.length*.45)],mid2=rt[Math.floor(rt.length*.45)+1]||mid,ang=Math.atan2(mid2[1]-mid[1],mid2[0]-mid[0])*180/Math.PI;
const pmax=Math.max(...S.ports.map(p=>p.n));
const inb=p=>p.lon>lo0&&p.lon<lo1&&p.lat>la0&&p.lat<la1;
const pts=S.ports.filter(inb).map(p=>`<circle class="sport" cx="${X(p.lon).toFixed(1)}" cy="${Y(p.lat).toFixed(1)}" r="${(3+9*Math.sqrt(p.n/pmax)).toFixed(1)}" fill="#9b7be8" stroke="#0b1526" stroke-width="1.5" tabindex="0" data-tip="${esc(/^CHN-/.test(p.port)?"Unnamed port":p.port.charAt(0)+p.port.slice(1).toLowerCase())}, China: ${p.n} voyages from Kozmino"><title>${esc(p.port)}: ${p.n} voyages from Kozmino</title></circle>`).join("");
const kz=[X(133.0),Y(42.75)];
const lead=(x1,y1,x2,y2)=>`<line class="lead" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#c8a24a" stroke-width="1"/>`;
// Callouts sit in open sea: clear of the route line and its leader lines, off the land, off the port dots (checked by _src/test_label_overlap.py).
// Each callout is centred on its anchor (lon, lat) and joined by a thin leader to the thing it describes.
const dj=S.ports.find(p=>p.port==="DONGJIAKOU")||S.ports[1]||S.ports[0];
const CO=[{lon:134.3,lat:40.4,tx:[X(133.0),Y(42.75)+8],html:`<b>${S.coreKozPct}%</b> of core-ship voyages load at Kozmino`},
 {lon:125.5,lat:31.4,tx:[X(dj.lon)+4,Y(dj.lat)+4],html:`<b>${shan}</b> of ${S.kozChina} China voyages end in Shandong`},
 {lon:133.0,lat:37.4,tx:"route",html:`Sea route: about ${Math.round(S.transitKozCHN)} days to Shandong`}];
const pt=(lo,la)=>[X(lo),Y(la)];
document.getElementById("shmap").innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the tanker route from Kozmino in Russia to ports in Shandong, China">
<g data-ci-ignore><rect width="${W}" height="${H}" fill="#0d1d36"/><g fill="#1b2d4d" stroke="#2c4470" stroke-width=".6">${land}</g></g>
<path d="${rd}" fill="none" id="shroute" stroke="#c8a24a" stroke-width="1.5" stroke-linejoin="round" opacity=".7"><title>Kozmino to Shandong: ${S.kozChina} voyages in 12 months</title></path>
<path d="${rd}" fill="none" stroke="transparent" stroke-width="14" class="hit" data-tip="Kozmino → China: ${S.kozChina} loaded voyages in 12 months, median ${S.transitKozCHN} days at sea"/>
<g class="sarr" transform="translate(${mid[0].toFixed(1)},${mid[1].toFixed(1)}) rotate(${ang.toFixed(0)})"><path d="M-7,-5 L5,0 L-7,5 Z" fill="#c8a24a"/></g>
${pts}
<circle class="sport" cx="${kz[0].toFixed(1)}" cy="${kz[1].toFixed(1)}" r="8" fill="#5cc98a" stroke="#0b1526" stroke-width="2" tabindex="0" data-tip="Kozmino, Russia: oil loading terminal on the Pacific coast"><title>Kozmino (loading port, Russia)</title></circle>
${CO.map((c,i)=>{const a=pt(c.lon,c.lat),t=c.tx==="route"?mid:c.tx;return lead(t[0],t[1],a[0],a[1])}).join("")}
</svg>
${CO.map(c=>`<div class="callout" style="left:${(X(c.lon)/W*100).toFixed(1)}%;top:${(Y(c.lat)/H*100).toFixed(1)}%">${c.html}</div>`).join("")}`;
// flowing chevrons along the route (shows the route, not ship positions)
(()=>{const svg=document.querySelector("#shmap svg"),pth=svg.querySelector("#shroute");if(!pth||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 svg.querySelector(".sarr").style.display="none";const len=pth.getTotalLength(),g=document.createElementNS("http://www.w3.org/2000/svg","g");svg.insertBefore(g,svg.querySelector(".sport"));
 let ch=[],sc=1,t0=null,vis=true;
 function build(){sc=svg.getBoundingClientRect().width/W||1;const gap=200/sc;g.innerHTML="";ch=[];for(let d=0;d<len;d+=gap){const e=document.createElementNS("http://www.w3.org/2000/svg","path");e.setAttribute("d","M-4,-3.5 L2,0 L-4,3.5");e.setAttribute("fill","none");e.setAttribute("stroke","#c8a24a");e.setAttribute("stroke-width","1.6");e.setAttribute("stroke-linecap","round");e.setAttribute("opacity",".9");g.appendChild(e);ch.push([e,d])}}
 build();addEventListener("resize",build);new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe(svg);
 function f(ts){if(t0===null)t0=ts;if(vis){const off=((ts-t0)/1000*16/sc)%(200/sc);ch.forEach(([e,d])=>{const L_=(d+off)%len,a=pth.getPointAtLength(L_),b=pth.getPointAtLength(Math.min(len,L_+1));e.setAttribute("transform",`translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) rotate(${(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI).toFixed(0)}) scale(${(1/Math.max(sc,.5)).toFixed(2)})`)})}requestAnimationFrame(f)}
 requestAnimationFrame(f)})();
// tooltips on hover or tap
const tip=document.getElementById("shtip"),box=document.getElementById("shmap");
box.addEventListener("pointermove",e=>{const t=e.target.closest("[data-tip]");if(!t){tip.hidden=true;return}const r=box.parentElement.getBoundingClientRect();tip.textContent=t.dataset.tip;tip.hidden=false;tip.style.left=Math.min(e.clientX-r.left+12,r.width-200)+"px";tip.style.top=(e.clientY-r.top+12)+"px"});
box.addEventListener("pointerleave",()=>tip.hidden=true);
box.addEventListener("focusin",e=>{const t=e.target.closest("[data-tip]");if(t){tip.textContent=t.dataset.tip;tip.hidden=false;tip.style.left="12px";tip.style.top="12px"}});
// turnaround bars
document.getElementById("shcyc").innerHTML=["CHN","IND","TUR"].map(k=>{const c=cy[k];return`<div class="srow" title="${esc(CN[k])}: median ${c.days} days between loads (${c.n} cycles)"><span class="sl">${flag(k)}${CN[k]}</span><span class="st"><i style="width:${(100*c.days/big).toFixed(1)}%;background:${CC[k]}"></i></span><b>${c.days} days</b></div>`}).join("");
// concentration bar
const dots=(n,k,lab,big,unit)=>{const C=60,r=Math.ceil(n/C),g=7;let c="";for(let i=0;i<n;i++)c+=`<circle cx="${(i%C)*g+3.5}" cy="${Math.floor(i/C)*g+3.5}" r="2.7" fill="${i<k?"#c8a24a":"#3f7fd0"}"/>`;
 return`<div class="dg" title="${k} of ${n} ${unit}"><div class="dgh"><b>${big}%</b><span>of ${lab}: ${k} of ${n}</span></div><svg viewBox="0 0 ${C*g} ${r*g}" role="img" aria-label="${k} of ${n} ${unit} are core ships">${c}</svg></div>`};
document.getElementById("shconc").innerHTML=dots(S.ships,S.core,"ships",S.coreShipPct,"ships")+dots(S.voyages,S.coreVoy,"voyages",S.coreVoyPct,"voyages");
document.getElementById("shmore").innerHTML=`<p>Baltic loaders made at most ${S.balticMax} voyages each, and ${S.repeatOnePct}% of repeat India or China ships served only one of them.</p>
<p>Core ships mostly fly ${fNow.map(f=>`<span class="nw">${flag(f[0])}${esc(CN[f[0]]||f[0])}</span>`).join(", ")} flags, not Russia's.</p>`;
document.getElementById("shnote").textContent=`Core ships made 5+ voyages in 12 months; tracking gaps can make cycles look longer, and the data does not show who charters or owns the ships.`;
// Russian flag
document.getElementById("rush").innerHTML=`<span class="nw">${flag("RUS")}Russian-flagged</span> tankers in the fleet rose from ${rs[0][1]} to ${rs[rs.length-1][1]} in a year`;
document.getElementById("rusp").textContent=`Russian-flagged ships' share of loading-terminal calls rose from ${pc(first)}% in ${mn(first)} to ${pc(last)}% in ${mn(last)}, much of it because other ships called less.`;
document.getElementById("ruschips").innerHTML=rs.map((r,i)=>`<div class="lchip"><b>${r[1]}</b><span>${new Date(r[0]).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</span></div>`).join('<span class="arr" aria-hidden="true">→</span>');
document.getElementById("rusbars").innerHTML=full.map(m=>`<div class="mcol" title="${mn(m)}: ${m.rus} of ${m.all} loading calls by Russian-flagged ships (${pc(m)}%)${m===last?", partial month":""}"><span class="mv">${pc(m)}%</span><span class="mb"><i style="height:${pc(m)}%;background:#c0504d"></i><i style="height:${100-pc(m)}%;background:#c8a24a"></i></span><span class="ml">${new Date(m.m+"-15").toLocaleString("en-GB",{month:"short"})}</span></div>`).join("");
})();
