/* "What's new": digested developments grouped under ongoing trends (data/whatsnew.json, built per docs/DIGEST.md).
   Placed directly under the leaders section; supersedes the raw Breaking strip and Storylines (hidden via whatsnew.css).
   Clicks reuse the map's own controls: group legend chips (filter), view buttons (zoom), state paths (drawer). */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const J=u=>fetch(u).then(r=>r.json());
const VB={"Confirmed":["✔","ok","Confirmed: 2+ independent reliable sources"],"Single source":["1","one","Single source"],"Official claim only":["⚑","off","Official claim only"]};
const ST={escalating:"▲ escalating",steady:"■ steady",easing:"▼ easing"};
const fmt=d=>{const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const [y,mo,da]=d.split("-");return `${+da} ${m[+mo-1]}`};
Promise.all([J("data/whatsnew.json"),J("data/territory.json")]).then(([wn,terr])=>{
  const GC=Object.fromEntries(terr.groups.map(g=>[g.id,g]));
  const FN=window.FN||(()=>"");
  const chips=gs=>(gs||[]).filter(g=>GC[g]).map(g=>`<span class="wnchip" style="--c:${GC[g].color}">${esc(GC[g].name)}</span>`).join("");
  const devH=(d,ti,di)=>{const v=VB[d.verification]||["?","one",d.verification];
    return `<li class="wndev" data-t="${ti}" data-d="${di}" tabindex="0"><span class="wnd">${esc(fmt(d.date))}</span> <span class="wnpl">📍${esc(d.place)}</span> <span class="wnv ${v[1]}" title="${esc(v[2])}">${v[0]}</span><span class="wntx">${esc(d.text)}${FN(d.sources)}</span></li>`};
  const all=[...wn.trends];const s=document.createElement("section");s.className="tile wntile";s.id="whatsnew";
  s.innerHTML=`<div class="tilehead"><h2>What's new</h2><span class="muted">Last 7 days, by storyline · click to show on map · ✔ confirmed · 1 single source · ⚑ official claim</span></div>
  <div class="wngrid">${wn.trends.map((t,ti)=>`<div class="wncard" data-t="${ti}" style="--c:${(GC[(t.groups||[])[0]]||{}).color||"#56657f"}">
    <div class="wnhead" tabindex="0"><div class="wnchips">${chips(t.groups)}${t.status&&ST[t.status]?`<span class="wnst ${t.status}">${ST[t.status]}</span>`:""}</div><h3>${esc(t.title)}</h3><p class="wnctx">${esc(t.context)}${FN(t.context_sources)}</p></div>
    <ul class="wndevs">${t.developments.map((d,di)=>devH(d,ti,di)).join("")}</ul></div>`).join("")}
  ${(wn.other||[]).length?`<div class="wncard wnother" style="--c:#56657f"><div class="wnhead"><h3>Other notable</h3></div><ul class="wndevs">${wn.other.map((d,di)=>devH(d,"o",di)).join("")}</ul></div>`:""}</div>
  <div class="muted small">As of ${esc(wn.as_of)}. ${esc(wn.note)}</div>`;
  /* last content section: directly after the network (Alliances and rivalries) */
  const place=()=>{const nr=document.querySelector("section.netrow");if(nr){if(nr.nextElementSibling!==s)nr.after(s)}else (document.querySelector("main")||document.body).appendChild(s)};
  place();
  const chip=g=>{const b=document.querySelector(`#grouplegend .chip[data-g="${g||""}"]`);if(b)b.click()};
  const view=v=>{if(window.MAPZ)window.MAPZ.view(v)};
  const region=id=>{const p=[...document.querySelectorAll("#mapsvg path.adm")].find(p=>p.__data__&&p.__data__.properties&&p.__data__.properties.id===id);if(p)p.dispatchEvent(new MouseEvent("click",{bubbles:true}))};
  const go=(groups,v,regions,open)=>{chip((groups||[]).length===1?groups[0]:(groups||[]).find(g=>GC[g])||"");if(v)view(v);
    const mt=document.querySelector(".maptile");if(mt)mt.scrollIntoView({behavior:"smooth"});if(open&&regions&&regions[0])setTimeout(()=>region(regions[0]),400)};
  const sel=el=>{s.querySelectorAll(".on").forEach(x=>x.classList.remove("on"));el.classList.add("on")};
  s.addEventListener("click",e=>{if(e.target.closest("a,sup"))return;const dv=e.target.closest(".wndev"),hd=e.target.closest(".wnhead");
    if(dv){const t=dv.dataset.t==="o"?{groups:[],view:"all"}:wn.trends[+dv.dataset.t];const d=(dv.dataset.t==="o"?wn.other:t.developments)[+dv.dataset.d];sel(dv);
      go(d.groups&&d.groups.length?d.groups:t.groups,t.view,d.regions,true)}
    else if(hd){const c=hd.closest(".wncard");if(c.dataset.t==null)return;const t=wn.trends[+c.dataset.t];sel(c);go(t.groups,t.view,t.regions,false)}});
  s.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches(".wndev,.wnhead"))e.target.click()});
}).catch(e=>console.warn("whatsnew:",e));
})();
