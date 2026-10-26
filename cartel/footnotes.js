/* Shared footnote helper. Any script can call window.FN(refs) and insert the returned HTML where a citation belongs.
   refs: a source id from data/sources.json, an object {url, name|source|publisher, title?, date?}, or an array of these.
   Markers are tiny superscript numbers; numbers follow order of first appearance on the page and repeat for the same source.
   The numbered list is rendered into <ol id="fnlist"> at the bottom, with back-links. FN.label(refs) gives "[n] Outlet" text for tooltips. */
(function(){
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const REG={},KEY={};let SRC={};
fetch("data/sources.json").then(r=>r.json()).then(s=>{s.sources.forEach(x=>SRC[x.id]=x);schedule()}).catch(()=>{});
function norm(r){if(r==null)return null;if(typeof r==="string"){const s=SRC[r];return {k:"id:"+r,id:r,url:s&&s.url,name:s?s.publisher:r,title:s&&s.title,date:s&&s.date}}
  const url=r.url||"";return {k:"u:"+url,url,name:r.name||r.source||r.publisher||"",title:r.title||"",date:r.date||""}}
function key(r){const n=norm(r);if(!n)return null;if(!REG[n.k]||(!REG[n.k].url&&n.url))REG[n.k]=n;return n.k}
const FN=refs=>{const a=(Array.isArray(refs)?refs:[refs]).map(key).filter(Boolean);return [...new Set(a)].map(k=>`<sup class="fn" data-fk="${esc(k)}"><a href="#fn-x">·</a></sup>`).join("")};
FN.label=refs=>(Array.isArray(refs)?refs:[refs]).map(key).filter(Boolean).map(k=>`[${KEY[k]||"?"}] ${REG[k].name}`).join(", ");
FN.tip=refs=>`<span class="info">ⓘ<span class="tip">${FN(refs)} ${esc((Array.isArray(refs)?refs:[refs]).map(r=>norm(r)&&norm(r).name).filter(Boolean).join(", "))}</span></span>`;
let t=null,busy=false;function schedule(){if(!t)t=setTimeout(renumber,150)}
function renumber(){t=null;busy=true;const order=[];
  document.querySelectorAll("sup.fn").forEach(s=>{const k=s.dataset.fk;if(!(k in KEY)){KEY[k]=0}if(!order.includes(k)&&!s.closest("#drawer"))order.push(k)});
  Object.keys(KEY).forEach(k=>{if(!order.includes(k))order.push(k)});
  order.forEach((k,i)=>KEY[k]=i+1);
  const seen={};document.querySelectorAll("sup.fn").forEach(s=>{const n=KEY[s.dataset.fk];const a=s.firstChild;if(a.textContent!=String(n)){a.textContent=n;a.href="#fn-"+n}
    if(!s.closest("#drawer")&&!seen[n]){seen[n]=1;a.id="fnref-"+n}});
  const ol=document.getElementById("fnlist");if(ol){const h=order.map((k,i)=>{const s=REG[k];return `<li id="fn-${i+1}"><b>${esc(s.name)}</b>${s.title?": "+(s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)):s.url?`: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>`:""}${s.date?` <span class="muted">(${esc(s.date)})</span>`:""} <a class="back" href="#fnref-${i+1}" title="Back to text">↩</a></li>`}).join("");if(ol.dataset.h!==h){ol.innerHTML=h;ol.dataset.h=h}const sn=document.getElementById("srcn");if(sn)sn.textContent=order.length}
  busy=false}
new MutationObserver(m=>{if(busy)return;if(m.some(x=>!(x.target.closest&&x.target.closest("#fnlist"))))schedule()}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",e=>{const a=e.target.closest('sup.fn a, a[href^="#fn-"], a[href="#sources"]');if(!a)return;const d=document.getElementById("srcdet");if(!d)return;d.open=true;const t=document.querySelector(a.getAttribute("href"));if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"center"});t.classList.add("fnhit");setTimeout(()=>t.classList.remove("fnhit"),2000);history.replaceState(null,"",a.getAttribute("href"))}});
window.FN=FN;})();
