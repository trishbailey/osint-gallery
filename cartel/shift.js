/* "How the business shifted": small multiples of annual regional series (data/business_shift.json).
   Mounts into #bzshift (created by leaders.js). Describes the record only. */
(function(){
const COL={fentanyl:"#ff4d4d",meth:"#35b8ff",cocaine:"#f2e85c",marijuana:"#3ddc6a",extortion:"#ff66b3",fuel:"#ff9a2e",migrants:"#9b7bff",gold:"#22ffff"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FNX=s=>typeof window.FN==="function"?window.FN(s):"";
const nf=v=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?Math.round(v/1e3)+"k":v.toLocaleString("en-US");
function draw(el,d){
 const tip=document.createElement("div");tip.className="shtip";document.body.appendChild(tip);
 el.innerHTML=`<p class="small muted shnote">Annual totals for the region from official records, not per-cartel figures. Seizures and encounters also reflect enforcement effort. No prediction.</p><div class="shgrid">${d.panels.map(p=>{const w=p.title.split(" "),last=w.pop();return `<figure class="shp" data-p="${p.id}"><figcaption><b>${esc(w.join(" "))} <span class="nw">${esc(last)}${FNX(p.sources)}</span></b><span class="shu">${esc(p.unit)}; ${esc(p.years)}</span></figcaption><svg role="img" aria-label="${esc(p.title)}"></svg></figure>`}).join("")}</div>`;
 d.panels.forEach(p=>{
  const fig=el.querySelector(`[data-p="${p.id}"]`),svg=d3.select(fig).select("svg");
  const W=fig.clientWidth||360,H=170,m={l:52,r:20,t:12,b:26};
  svg.attr("viewBox",`0 0 ${W} ${H}`).attr("width","100%");
  const ser=p.series.map(s=>{const b=s.points[0].v;return {...s,pts:s.points.map(x=>({...x,iv:p.indexed?x.v/b*100:x.v}))}});
  const ys=[...new Set(ser.flatMap(s=>s.pts.map(x=>x.y)))].sort();
  const x=d3.scaleLinear().domain([p.id==="drugs"?ys[0]:Math.min(2015,ys[0]),d3.max(ys)]).range([m.l,W-m.r]);
  const y=d3.scaleLinear().domain([0,d3.max(ser.flatMap(s=>s.pts.map(q=>q.iv)))*1.08]).nice().range([H-m.b,m.t]);
  const g=svg.append("g");
  g.append("g").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(d3.range(Math.ceil(x.domain()[0]),x.domain()[1]+1).filter((v,i,a)=>{const st=Math.max(1,Math.ceil(a.length/Math.max(3,Math.floor((W-m.l-m.r)/60))));return (a[a.length-1]-v)%st===0})).tickFormat(d3.format("d"))).attr("class","shax");
  g.append("g").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v=>p.indexed?v:nf(v))).attr("class","shax");
  if(p.indexed)g.append("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",y(100)).attr("y2",y(100)).attr("class","shref");
  ser.forEach(s=>{const c=COL[s.id];
   g.append("path").datum(s.pts).attr("fill","none").attr("stroke",c).attr("stroke-width",3).attr("d",d3.line().x(q=>x(q.y)).y(q=>y(q.iv)));
   g.selectAll(null).data(s.pts).join("circle").attr("cx",q=>x(q.y)).attr("cy",q=>y(q.iv)).attr("r",4).attr("fill",c).attr("tabindex",0).attr("class","shpt")
    .on("mouseenter focus",(e,q)=>{tip.innerHTML=`<b style="color:${c}">${esc(s.label)}</b> · ${p.years.startsWith("US fiscal")?"FY":""}${q.y}<br>${q.v.toLocaleString("en-US")} ${p.id==="drugs"?"lb":esc(p.unit.split(" ")[0])}${p.indexed?` (index ${Math.round(q.iv)})`:""}`;tip.style.display="block";const r=e.target.getBoundingClientRect();tip.style.left=(r.left+window.scrollX+10)+"px";tip.style.top=(r.top+window.scrollY-48)+"px"})
    .on("mouseleave blur",()=>tip.style.display="none");
   const lp=s.pts[s.pts.length-1];
   {const pk=s.pts.reduce((a,b)=>b.iv>a.iv?b:a);g.append("text").attr("x",Math.min(x(pk.y),W-m.r-4)).attr("y",y(pk.iv)-8).attr("text-anchor",x(pk.y)>W*0.6?"end":"middle").attr("fill",c).attr("class","shlab").text(s.label)}});
  if(p.id==="drugs"){g.selectAll(".shlab").remove();const lg=document.createElement("div");lg.className="shleg";lg.innerHTML=ser.map(s=>`<span><i style="background:${COL[s.id]}"></i>${esc(s.label)}</span>`).join("");fig.insertBefore(lg,fig.querySelector("svg"))}
 });
}
function boot(){const el=document.getElementById("bzshift");if(!el||!window.d3)return false;
 fetch("data/business_shift.json").then(r=>r.json()).then(d=>draw(el,d)).catch(e=>{el.closest(".chbox").remove();console.warn(e)});return true}
if(!boot()){const mo=new MutationObserver(()=>{if(boot())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}
})();
