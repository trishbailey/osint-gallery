/* Africa Brief: expand every acronym and explain it at its first mention in each readable unit.
   Units: the main page flow, each card (conflict, Russia, Belt and Road, media owner, storyline, region),
   the map hover tip, the details panel and the legend. Headlines, source titles and media tags are quoted
   verbatim, so their explanations are appended as a "Terms" line instead of changing the quoted text. */
(function(){
 "use strict";
 /* [key, full name, short plain explanation, options]. options: also = other keys this entry covers */
 const G=[
 ["RSF","Rapid Support Forces","a Sudanese paramilitary force fighting the army since April 2023"],
 ["SAF","Sudanese Armed Forces","Sudan's national army"],
 ["SAF-RSF","Sudanese Armed Forces and Rapid Support Forces","the army and the paramilitary force fighting each other in Sudan since April 2023",{also:["SAF","RSF"]}],
 ["JNIM","Jama'at Nusrat al-Islam wal-Muslimin","an al-Qa'ida-aligned federation of armed groups in the Sahel, formed in 2017"],
 ["ISWAP","Islamic State West Africa Province","an Islamic State affiliate around Lake Chad and north-east Nigeria, formed in 2015 as a Boko Haram splinter"],
 ["IS Sahel","Islamic State Sahel Province","an Islamic State affiliate on the Mali, Niger and Burkina Faso border, formed in 2015",{also:["IS"]}],
 ["ISSP","Islamic State Sahel Province","an Islamic State affiliate on the Mali, Niger and Burkina Faso border",{also:["IS"]}],
 ["ISGS","Islamic State in the Greater Sahara","the earlier name of Islamic State Sahel Province"],
 ["IS","Islamic State","the armed group that declared a caliphate in Iraq and Syria in 2014"],
 ["ISIS","Islamic State of Iraq and Syria","one English name for Islamic State"],
 ["ISIL","Islamic State of Iraq and the Levant","another English name for Islamic State"],
 ["AQIM","al-Qa'ida in the Islamic Maghreb","al-Qa'ida's branch in Algeria and the Sahel"],
 ["GSPC","Salafist Group for Preaching and Combat","an Algerian armed group that later became al-Qa'ida in the Islamic Maghreb"],
 ["JAS","Jama'atu Ahlis Sunna Lidda'Awati Wal-Jihad","the formal name of Boko Haram"],
 ["M23/AFC","March 23 Movement and Alliance Fleuve Congo","a Congolese armed group and the political-military alliance that includes it, which hold large areas of eastern DR Congo",{also:["M23","AFC"]}],
 ["AFC/M23","Alliance Fleuve Congo and March 23 Movement","a political-military alliance and the Congolese armed group in it, which hold large areas of eastern DR Congo",{also:["M23","AFC"]}],
 ["M23","March 23 Movement","a Congolese armed group that holds large areas of eastern DR Congo"],
 ["AFC","Alliance Fleuve Congo","a political-military alliance that includes M23"],
 ["FDLR","Democratic Forces for the Liberation of Rwanda","a Rwandan armed group active in eastern DR Congo since about 2000"],
 ["CSP","Permanent Strategic Framework","an alliance of northern Mali armed groups"],
 ["AES","Alliance of Sahel States","the security and political alliance formed by Mali, Burkina Faso and Niger in 2023"],
 ["ECOWAS","Economic Community of West African States","West Africa's regional bloc"],
 ["AU","African Union","the continental body of African states"],
 ["LNA","Libyan National Army","the armed force that controls eastern Libya"],
 ["TPLF","Tigray People's Liberation Front","the party that governed Ethiopia's Tigray region"],
 ["FACA","Forces armées centrafricaines","the Central African Republic's national army"],
 ["CVJRR","Commission Vérité, Justice, Réparation et Réconciliation","the Central African Republic's truth and reconciliation commission"],
 ["ANP","Armée nationale populaire","Algeria's national army"],
 ["CCP","Chinese Communist Party","China's ruling party"],
 ["RPF","Rwandan Patriotic Front","Rwanda's ruling party"],
 ["PDCI","Parti démocratique de Côte d'Ivoire","an Ivorian opposition party"],
 ["MDM","Movimento Democrático de Moçambique","a Mozambican opposition party"],
 ["FSB","Federal Security Service","Russia's domestic security agency"],
 ["VIGINUM","Service de vigilance et de protection contre les ingérences numériques étrangères","the French government agency that tracks foreign online interference"],
 ["FCDO","Foreign, Commonwealth and Development Office","the United Kingdom's foreign ministry"],
 ["EEAS","European External Action Service","the European Union's diplomatic service"],
 ["UN","United Nations","the global organisation of member states"],
 ["UAE","United Arab Emirates","a federation of seven Gulf emirates, including Dubai and Abu Dhabi"],
 ["US","United States",""],
 ["UK","United Kingdom",""],
 ["EU","European Union","a bloc of 27 European states"],
 ["DR Congo (Zaire)","Democratic Republic of the Congo (Zaire)","",{plain:1}],
 ["DR Congo","Democratic Republic of the Congo","",{}],
 ["DRC","Democratic Republic of the Congo","",{also:["DR Congo"]}],
 ["CAR","Central African Republic","",{}],
 ["RD Congo","République démocratique du Congo","the Democratic Republic of the Congo",{note:1}],
 ["RDC","République démocratique du Congo","the Democratic Republic of the Congo",{note:1}],
 ["RCA","République centrafricaine","the Central African Republic",{note:1}],
 ["USGS","United States Geological Survey","the US government science agency that publishes mineral output data"],
 ["UCDP","Uppsala Conflict Data Program","a Swedish university project that records deaths in armed conflict"],
 ["GED","Georeferenced Event Dataset","the UCDP list of violent events with a place and a date"],
 ["ACLED","Armed Conflict Location and Event Data","a non-profit project that records political violence events"],
 ["OFAC","Office of Foreign Assets Control","the US Treasury office that administers sanctions"],
 ["AFRICOM","United States Africa Command","the US military command for Africa"],
 ["FTO","Foreign Terrorist Organization","a US State Department list category"],
 ["ISS","Institute for Security Studies","an African research group on security"],
 ["GI-TOC","Global Initiative Against Transnational Organized Crime","a research network on organised crime"],
 ["SWISSAID","","a Swiss non-profit development organisation"],
 ["A7A5","","a ruble-pegged digital token"],
 ["USDT","Tether","a dollar-pegged digital token",{}],
 ["HS","Harmonized System","the international product codes used in customs data"],
 ["LBMA","London Bullion Market Association","the trade body that sets standards for gold refiners"],
 ["DMCC","Dubai Multi Commodities Centre","a Dubai free zone for commodity trading"],
 ["U3O8","triuranium octoxide","the uranium oxide concentrate sold as yellowcake"],
 ["USD","United States dollars",""],
 ["LNG","liquefied natural gas",""],
 ["ASM","artisanal and small-scale mining",""],
 ["REO","rare earth oxides",""],
 ["MW","megawatts",""],
 ["JV","joint venture",""],
 ["LLC","limited liability company",""],
 ["SARL","société à responsabilité limitée","a French-style limited company"],
 ["SOMAIR","Société des Mines de l'Aïr","the uranium mining company at Arlit, Niger"],
 ["GERD","Grand Ethiopian Renaissance Dam","a dam on the Blue Nile in Ethiopia"],
 ["TB2","Bayraktar TB2","a Turkish-made armed drone"],
 ["WNA","World Nuclear Association","an industry body for the nuclear sector"],
 ["ICSID","International Centre for Settlement of Investment Disputes","the World Bank arbitration body for investor disputes"],
 ["GAC","Guinea Alumina Corporation","an alumina and bauxite company in Guinea"],
 ["EGA","Emirates Global Aluminium","a UAE aluminium producer"],
 ["NNPC","Nigerian National Petroleum Company","Nigeria's state oil company"],
 ["IOC","international oil company",""],
 ["NOC","National Oil Corporation","Libya's state oil company"],
 ["GNPOC","Greater Nile Petroleum Operating Company","the operator of the Sudan and South Sudan oil pipeline"],
 ["CNPC","China National Petroleum Corporation","a Chinese state oil company"],
 ["CHEC","China Harbour Engineering Company","a Chinese state port builder"],
 ["CREC","China Railway Engineering Corporation","a Chinese state railway builder"],
 ["CCECC","China Civil Engineering Construction Corporation","a Chinese state construction company"],
 ["CCCC","China Communications Construction Company","a Chinese state construction company"],
 ["NORINCO","China North Industries Group Corporation","a Chinese state defence and engineering group"],
 ["CGN","China General Nuclear Power Group","a Chinese state nuclear company"],
 ["CNNC","China National Nuclear Corporation","a Chinese state nuclear company"],
 ["CNUC","China National Uranium Corporation","a uranium company owned by China National Nuclear Corporation"],
 ["PLA","People's Liberation Army","China's armed forces"],
 ["KCT","Kribi Container Terminal","a container port in Cameroon"],
 ["LAPSSET","Lamu Port, South Sudan, Ethiopia Transport corridor","a planned road, rail and pipeline corridor from Lamu in Kenya"],
 ["AGL","Africa Global Logistics","a port and shipping services company owned by MSC"],
 ["MSC","Mediterranean Shipping Company","a Swiss-based shipping line"],
 ["NPA","Nigerian Ports Authority","Nigeria's state port body"],
 ["TPA","Tanzania Ports Authority","Tanzania's state port body"],
 ["CT2","Container Terminal 2","a container berth complex at Dar es Salaam"],
 ["CRS","Congressional Research Service","the research arm of the US Congress"],
 ["DoD","US Department of Defense","the US defence ministry"],
 ["MoU","memorandum of understanding","a non-binding written agreement"],
 ["SGR","Standard Gauge Railway",""],
 ["DP World","","a Dubai-based port operator",{}],
 ["BBC","British Broadcasting Corporation","the United Kingdom's public broadcaster"],
 ["DW","Deutsche Welle","Germany's public international broadcaster"],
 ["RFI","Radio France Internationale","France's public international radio"],
 ["RT","","formerly Russia Today, a Russian state-funded news channel"],
 ["CGTN","China Global Television Network","a Chinese state-run broadcaster"],
 ["TRT","Turkish Radio and Television Corporation","Turkey's public broadcaster"],
 ["ANO TV-Novosti","Autonomous Non-profit Organisation TV-Novosti","the Russian organisation that runs RT",{plain:1}],
 ["AKFED","Aga Khan Fund for Economic Development","an investment arm of the Aga Khan Development Network"],
 ["NMG","Nation Media Group","a Kenyan media company"],
 ["MDIF","Media Development Investment Fund","a non-profit investor in independent media"],
 ["ST","StarTimes","a Chinese-owned pay-television company"],
 ["AP","Associated Press","a United States news agency"],
 ["CNN","Cable News Network","a United States news channel"],
 ["FT","Financial Times","a London business newspaper"],
 ["WSJ","The Wall Street Journal","a United States business newspaper"],
 ["VOA","Voice of America","a United States government broadcaster"],
 ["RFE","Radio Free Europe","a United States government-funded broadcaster"],
 ["ENA","Ethiopian News Agency","Ethiopia's state news agency"],
 ["TSA","Tout sur l'Algérie","an Algerian news website"],
 ["LUSA","","Portugal's national news agency"],
 ["BU","Boston University","a United States university"],
 ["ASX","Australian Securities Exchange","Australia's stock exchange"],
 ["HKEX","Hong Kong Exchanges and Clearing","Hong Kong's stock exchange operator"],
 ["EIA","Energy Information Administration","the US government energy statistics agency"],
 ["FAO","Food and Agriculture Organization","the United Nations food and farming agency"],
 ["UNICEF","United Nations Children's Fund","the United Nations agency for children"],
 ["OMS","Organisation mondiale de la santé","the World Health Organization",{note:1}],
 ["WHO","World Health Organization","the United Nations health agency",{note:1}],
 ["IOM","International Organization for Migration","a United Nations-related migration agency"],
 ["OIM","Organização Internacional para as Migrações","the International Organization for Migration",{note:1}],
 ["ICC","International Criminal Court","the court in The Hague that tries war crimes"],
 ["COMESA","Common Market for Eastern and Southern Africa","a regional trade bloc"],
 ["JOJ","Jeux olympiques de la jeunesse","the Youth Olympic Games",{note:1}],
 ["PLF","projet de loi de finances","the French name for a finance bill",{note:1}],
 ["FCFA","franc CFA","the Central and West African CFA franc currencies",{note:1}],
 ["HFO","heavy fuel oil",""],
 ["AI","artificial intelligence",""],
 ["FX","foreign exchange",""],
 ["PM","prime minister",""],
 ["TV","television",""],
 ["GDP","gross domestic product",""],
 ["OSINT","open-source intelligence",""],
 ["WITS","World Integrated Trade Solution","a World Bank trade database"],
 ["EDT","Eastern Daylight Time",""],
 ["RSS","Really Simple Syndication","a news feed format"],
 ["API","application programming interface",""],
 ["NLLB-200","No Language Left Behind","an open-source translation model"],
 ["CC BY 4.0","Creative Commons Attribution 4.0","an open licence that allows reuse with credit"]
 ];
 const ENT={};G.forEach(e=>{const o=e[3]||{};ENT[e[0]]={k:e[0],full:e[1],note:e[2],also:o.also||[],plain:!!o.plain,noteOnly:!!o.note,noFull:!!o.noFull}});
 const esc=s=>s.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");
 const keys=Object.keys(ENT).sort((a,b)=>b.length-a.length);
 const RE=new RegExp("(?<![A-Za-z0-9_$])("+keys.map(esc).join("|")+")(?![A-Za-z0-9_$])","g");
 const UNIT="#tip,#panel,.mapside,article.cf,.rcard,.bricard,.ocard,details.story-g,details.region,#srclist";
 const NOTE=".items li,.ocard,#srclist li,.skwrap";
 const HEAD="h1,h2,h3,h4,h5,summary>b,.cfb h3";
 /* what to show for one entry */
 const longForm=(e,nested)=>{
  const a=e.k, body=(a+(e.note?", "+e.note:""));
  if(e.plain)return e.full;
  if(!e.full)return nested?"["+body+"]":a+" ("+e.note+")";
  return nested?e.full+" ["+body+"]":e.full+" ("+body+")";};
 const shortForm=(e,nested)=>e.plain?e.full:(e.full?(nested?e.full+" ["+e.k+"]":e.full+" ("+e.k+")"):null);
 const noteLine=e=>e.full?`${e.k} = ${e.full}${e.note?`, ${e.note}`:""}`:`${e.k} = ${e.note}`;
 const hiddenChart=el=>{const w=el.closest(".skwrap,.goldph");return !!(w&&getComputedStyle(w).display==="none");};
 const all_=e=>[e.k,...e.also];
 const depth=b=>(b.match(/\(/g)||[]).length-(b.match(/\)/g)||[]).length;
 const defined=(e,before,after)=>{
  if((e.k==="ISIS"||e.k==="ISIL")&&/Islamic State \(([A-Z]+\/)?$/.test(before))return true;
  if(e.full&&/\($/.test(before)){const b=before.slice(0,-1).trimEnd().toLowerCase().replace(/\s+/g," ");
   const f=e.full.toLowerCase().replace(/\s*\(.*$/,"").trim();if(f&&b.endsWith(f))return true;}
  return /^ \([A-Z][^)]{12,}\)/.test(after);};
 const BADSKIP="script,style,noscript,textarea,#abbr,sup,.badge,button,label.chip,summary.chip,.rlistph,.kpi b,code";
 /* ordered items of one unit: text nodes plus marks left by earlier expansions */
 const itemsOf=root=>{
  const top=root===document.body?null:root;const out=[];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
   if(n.nodeType===1){
    if(n.matches(".ax,.axn")){if(n.parentElement.closest(UNIT)===top)out.push({marks:(n.getAttribute("data-a")||"").split("|").filter(Boolean)});return NodeFilter.FILTER_REJECT;}
    if(n.matches(BADSKIP))return NodeFilter.FILTER_REJECT;
    if(n.tagName.toLowerCase()==="svg"&&!n.closest(".skwrap")&&!n.parentElement.closest(".skwrap"))return NodeFilter.FILTER_REJECT;
    if(n.matches(".skwrap,.goldph")&&hiddenChart(n))return NodeFilter.FILTER_REJECT;
    if(n.matches(UNIT)&&n!==root)return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_SKIP;}
   return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
  let n;while(n=w.nextNode())out.push({node:n});
  return out;};
 const process=root=>{
  root=root||document.body;const top=root===document.body?null:root;
  root.querySelectorAll(".axn").forEach(x=>{if(x.parentElement.closest(UNIT)===top)x.remove();});
  const seen=new Set(),notes=new Map(),todo=[];
  for(const it of itemsOf(root)){
   if(it.marks){it.marks.forEach(k=>seen.add(k));continue;}
   const node=it.node,t=node.nodeValue,p=node.parentElement;
   if(/^\s*https?:\/\//.test(t))continue;
   const isHead=!!p.closest(HEAD),noteEl=p.closest(NOTE),grp=!!p.closest(".grp>b");
   RE.lastIndex=0;let m;const pieces=[];let last=0;
   while((m=RE.exec(t))){
    const e=ENT[m[1]];const before=t.slice(0,m.index),after=t.slice(m.index+m[0].length);
    if(seen.has(e.k))continue;
    if(grp||defined(e,before,after)){all_(e).forEach(x=>seen.add(x));continue;}
    if(e.k==="PM"&&/\d\s*$/.test(before))continue;
    if(noteEl){all_(e).forEach(x=>seen.add(x));if(!notes.has(noteEl))notes.set(noteEl,[]);notes.get(noteEl).push(e);continue;}
    if(e.noteOnly){if(isHead)continue;all_(e).forEach(x=>seen.add(x));const b=p.closest("p,li,dd,div")||p;if(!notes.has(b))notes.set(b,[]);notes.get(b).push(e);continue;}
    const nested=depth(before)>0,joined=/^[-\/]/.test(after);
    let text,mark=true;
    if(isHead||joined){text=shortForm(e,nested);mark=false;}else text=longForm(e,nested);
    if(!text||text===m[0])continue;
    pieces.push(document.createTextNode(t.slice(last,m.index)));
    const s=document.createElement("span");s.className="ax";s.setAttribute("data-a",mark?all_(e).join("|"):"");s.textContent=text;pieces.push(s);
    if(mark)all_(e).forEach(x=>seen.add(x));
    last=m.index+m[0].length;}
   if(pieces.length){pieces.push(document.createTextNode(t.slice(last)));todo.push([node,pieces]);}}
  for(const [node,pieces] of todo){if(!node.parentNode)continue;const f=document.createDocumentFragment();pieces.forEach(x=>f.appendChild(x));node.parentNode.replaceChild(f,node);}
  notes.forEach((es,el)=>{if(!el.isConnected)return;const u=[...new Map(es.map(e=>[e.k,e])).values()];
   const d=document.createElement("span");d.className="axn";d.setAttribute("data-a",u.map(e=>all_(e).join("|")).join("|"));
   d.textContent="Terms: "+u.map(noteLine).join("; ")+".";el.appendChild(d);});
 };
 /* hover texts: native title attributes and SVG titles are read on their own */
 const titles=root=>{(root||document).querySelectorAll("[title],svg title").forEach(el=>{
  const isSvg=el.tagName.toLowerCase()==="title";const t=isSvg?el.textContent:el.getAttribute("title");
  if(!t||el.__axt===t)return;
  const seen=new Set();RE.lastIndex=0;let out="",last=0,m,ch=false;
  while((m=RE.exec(t))){const e=ENT[m[1]];if(seen.has(e.k)||e.noteOnly)continue;
   const before=t.slice(0,m.index),after=t.slice(m.index+m[0].length);
   if(defined(e,before,after)){seen.add(e.k);continue;}
   const nested=((before.match(/\(/g)||[]).length-(before.match(/\)/g)||[]).length)>0;
   const joined=/^[-\/]/.test(after);
   const x=joined?shortForm(e):longForm(e,nested);if(!x||x===m[0])continue;
   out+=t.slice(last,m.index)+x;last=m.index+m[0].length;ch=true;if(!joined)[e.k,...e.also].forEach(k=>seen.add(k));}
  if(ch){out+=t.slice(last);if(isSvg)el.textContent=out;else el.setAttribute("title",out);el.__axt=out;}
  else el.__axt=t;});};
 let busy=false,queued=new Set(),raf=0;
 const run=units=>{busy=true;try{units.forEach(u=>{if(u===document.body||u.isConnected)process(u)});titles(document);}finally{if(obs)obs.takeRecords();busy=false;}};
 const unitFor=n=>{const el=n.nodeType===1?n:n.parentElement;if(!el)return null;if(el.closest(".ax,.axn"))return null;return el.closest(UNIT)||document.body;};
 let obs=null;
 const start=()=>{
  run([document.body,...document.querySelectorAll(UNIT)]);
  obs=new MutationObserver(ms=>{if(busy)return;ms.forEach(m=>{m.addedNodes.forEach(n=>{const u=unitFor(n);if(u)queued.add(u);
    if(n.nodeType===1)n.querySelectorAll&&n.querySelectorAll(UNIT).forEach(x=>queued.add(x));});
   if(m.type==="characterData"){const u=unitFor(m.target);if(u)queued.add(u);}});
   if(queued.size&&!raf)raf=requestAnimationFrame(()=>{raf=0;const q=[...queued];queued=new Set();run(q);});});
  obs.observe(document.body,{childList:true,subtree:true});
  let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>run([document.body]),250);});
 };
 window._axRun=()=>run([document.body,...document.querySelectorAll(UNIT)]);
 window._axKeys=keys;
 const go=()=>{if(window._fn)start();else setTimeout(go,150);};
 go();
})();
