/* Click affordances: hover tooltip on states, chip titles, one-time pulse hint. */
(function(){
const tip=document.createElement("div");tip.className="ixtip";tip.textContent="Click for details";document.body.appendChild(tip);
const svg=document.getElementById("mapsvg");
svg.addEventListener("mousemove",e=>{const p=e.target.closest("path.adm")||document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.matches&&x.matches("path.adm"));if(!p){tip.style.display="none";return}
 const n=p.__data__&&p.__data__.properties&&p.__data__.properties.name;tip.textContent=(n?n+" · ":"")+"Click for details";
 tip.style.display="block";tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+14)+"px"});
svg.addEventListener("mouseleave",()=>tip.style.display="none");
function chips(){document.querySelectorAll("#grouplegend .chip").forEach(b=>b.title=b.dataset.g?"Show only this cartel":"Show all groups")}
const lg=document.getElementById("grouplegend");new MutationObserver(chips).observe(lg,{childList:true});chips();
let seen=false;try{seen=localStorage.getItem("ixPulse")==="1"}catch(e){}
const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function pulse(n){const p=[...document.querySelectorAll("path.adm")].find(x=>x.__data__&&x.__data__.properties.name==="Sinaloa");
 if(!p){if(n<40)setTimeout(()=>pulse(n+1),250);return}
 p.classList.add("ixpulse");const r=p.getBoundingClientRect();const h=document.createElement("div");h.className="ixhint";h.textContent="👆 Click me";
 const w=document.querySelector(".mapwrap");const wr=w.getBoundingClientRect();h.style.left=(r.left-wr.left+r.width/2)+"px";h.style.top=(r.top-wr.top+r.height/2)+"px";w.appendChild(h);
 const stop=()=>{p.classList.remove("ixpulse");h.remove()};setTimeout(stop,reduce?4000:6000);svg.addEventListener("click",stop,{once:true});
 try{localStorage.setItem("ixPulse","1")}catch(e){}}
if(!seen)pulse(0);
})();
