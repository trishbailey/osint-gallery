(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var D,GM={},FAM={},EXT={},REL=[];
var mobile=function(){return window.matchMedia("(max-width:700px)").matches};
var S={hidden:{},dormant:true,inc:false,types:{"rivalry/fighting":true,"cooperation":true,"funding or arms":true,"split from / affiliate of":false}};
var TYPE={"rivalry/fighting":{c:"#ff9f43",name:"Fighting each other",dir:false},"cooperation":{c:"#2ee6d6",name:"Cooperation",dir:false},"funding or arms":{c:"#ff7eb6",name:"Funding or arms",dir:true},"split from / affiliate of":{c:"#ffffff",name:"Split from or affiliate of",dir:true,dash:"2 5"}};
var tip=null,map=null,graph=null,panelOpener=null;
var MON=[["rising","↑ Rising"],["steady","→ Steady"],["declining","↓ Declining"],["insufficient evidence","? Not enough evidence"]];
var MON_LABEL={"rising":"Rising","steady":"Steady","declining":"Declining","insufficient evidence":"Not enough evidence"};

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function plain(html){var d=document.createElement("div");d.innerHTML=html||"";$$("sup",d).forEach(function(x){x.remove()});return d.textContent.replace(/\s+/g," ").trim()}
var MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(d){var m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(d||"");return m?(+m[3])+" "+MONTHS[+m[2]-1]+" "+m[1]:(d||"")}
function col(g){return g.state==="dormant"?D.dissolved_color:FAM[g.family].color}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function nodeName(id){return GM[id]?GM[id].label:(EXT[id]?EXT[id].label:id)}
function cleanTitle(s){var t=s.title,bad=!t||/^(just a moment|access denied|document viewer|attention required|403|error|please wait|one moment)/i.test(t.trim());if(bad){try{var u=new URL(s.url);var seg=decodeURIComponent(u.pathname.split("/").filter(Boolean).pop()||"").replace(/[-_]+/g," ").replace(/\.(html?|php|aspx?)$/,"");return s.domain+(seg?": "+seg:"")}catch(e){return s.domain}}return t.replace(/\s+/g," ")}

/* tooltip */
function showTip(html,ev){if(!tip)return;tip.innerHTML=html;tip.hidden=false;moveTip(ev)}
function moveTip(ev){if(!tip||tip.hidden)return;var w=tip.offsetWidth,h=tip.offsetHeight,x=ev.clientX+14,y=ev.clientY+14;if(x+w>innerWidth-8)x=ev.clientX-w-14;if(x<8)x=8;if(y+h>innerHeight-8)y=ev.clientY-h-14;if(y<8)y=8;tip.style.left=x+"px";tip.style.top=y+"px"}
function hideTip(){if(tip)tip.hidden=true}
function focusTip(html,el){var r=el.getBoundingClientRect();showTip(html,{clientX:r.right,clientY:r.bottom})}
function bindTip(sel,fn){sel.on("mouseenter mousemove",function(e,d){showTip(fn(d),e)}).on("mouseleave",hideTip).on("focus",function(e,d){focusTip(fn(d),this)}).on("blur",hideTip)}

/* cards */
function snippet(g){var l=g.leader;return l.named?l.name:l.name}
function cardHTML(g,full){
  var c=col(g),st=g.state;
  var chip='<span class="st'+(st==="governing"?" gov":st==="dormant"?" dis":"")+'" style="--c:'+c+';--dis:'+D.dissolved_color+'">'+esc(FAM[g.family].name)+" · "+esc(g.state_label)+"</span>";
  var img=g.img?'<img src="'+esc(g.img.file)+'" width="72" height="72" alt="'+esc(g.label+" ("+g.img.kind+")")+'">':"";
  var since=g.leader.since?' <span class="muted">since '+esc(g.leader.since)+"</span>":"";
  var kv='<dt>Leader</dt><dd>'+g.leader_html+since+"</dd>";
  if(g.change){kv+='<dt>Recent change</dt><dd><b>'+esc(g.change.kind)+"</b>, "+esc(fmt(g.change.date))+". "+g.change.html+"</dd>"}
  kv+='<dt>Where</dt><dd>'+esc(g.areas)+"</dd>";
  var more="";
  var est=g.strength&&g.strength.estimates&&g.strength.estimates.length?g.strength.estimates.map(function(e){return "<li>"+esc(e.range)+", "+esc(e.source)+e.note+"</li>"}).join(""):"";
  more+='<dt>Strength</dt><dd>'+(est?'<ul class="est">'+est+"</ul>"+(g.strength.contested?'<span class="muted">Estimates differ. Confidence: '+esc(g.strength.conf)+".</span>":""):"No credible estimate")+"</dd>";
  if(g.momentum)more+='<dt>Momentum</dt><dd><b>'+esc(MON_LABEL[g.momentum.trend]||g.momentum.trend)+".</b> "+g.momentum.html+(g.momentum.conf?' <span class="muted">Confidence: '+esc(g.momentum.conf)+".</span>":"")+"</dd>";
  if(g.aliases&&g.aliases.length)more+='<dt>Also called</dt><dd>'+esc(g.aliases.join(", "))+"</dd>";
  if(g.facts_html)more+='<dt>Facts</dt><dd>'+g.facts_html+"</dd>";
  var cf=(g.contested||[]).map(function(x){return '<div class="cf"><b>Contested ('+esc(x.field)+'), confidence '+esc(x.conf)+".</b> "+esc(x.reason)+"</div>"}).join("");
  var srcs=(g.sources||[]).map(function(n){return '<sup class="fn"><a href="#src-'+n+'" class="fnl" data-src="'+n+'">'+n+"</a></sup>"}).join(" ");
  var rels=relsFor(g.id);
  var rl=rels.length&&full?'<h4 class="sub">Links to other groups</h4><ul class="rl">'+rels.map(relLi).join("")+"</ul>":"";
  var open=full?"":'<a class="opn" href="#p='+g.id+'">Open full details and links</a>';
  var inner='<dl class="kv">'+more+"</dl>"+cf+rl+(srcs?'<p class="muted">Sources: '+srcs+"</p>":"");
  return '<article class="card" id="'+(full?"pc-":"card-")+g.id+'" data-id="'+g.id+'" style="--c:'+c+'"><div class="chead">'+img+"<div><h3>"+esc(g.label)+'</h3><p class="full">'+esc(g.name)+"</p>"+chip+'</div></div><dl class="kv">'+kv+"</dl>"+
    (full?'<div class="morefull">'+inner+"</div>":'<details class="more"><summary>More</summary>'+inner+"</details>"+open)+"</article>";
}
function relsFor(id){return REL.filter(function(r){return r.source===id||r.target===id})}
function relLi(r){var o=r.source,t=r.target;return "<li><b>"+esc(nodeName(o))+" "+(TYPE[r.type].dir?"→":"↔")+" "+esc(nodeName(t))+'</b> <span class="muted">'+esc(TYPE[r.type].name)+", "+esc(r.basis)+", confidence "+esc(r.conf)+"</span><br>"+r.html+"</li>"}

/* static sections */
function renderStatic(){
  var C=D.content;
  $("#intro").textContent=C.intro;
  $("#asof").textContent=fmt(D.asof);
  $("#kpis").innerHTML=D.kpis.map(function(k){return '<div class="kpi"><b>'+k.value+"</b><span>"+esc(k.label)+"</span></div>"}).join("");
  $("#mapcap").innerHTML="<strong>The finding:</strong> "+C.finding_html;
  $("#barstitle").textContent=C.bars_title;
  var mx=Math.max.apply(null,C.bars.map(function(b){return b.value}));
  $("#bars").innerHTML=C.bars.map(function(b,i){return '<div class="bar" data-i="'+i+'" tabindex="0"><span class="nm">'+esc(b.name)+'</span><span class="tr"><span class="fill" style="width:'+(b.value/mx*100).toFixed(1)+'%"></span><span class="vl">'+esc(b.text)+"</span></span></div>"}).join("");
  $("#barsnote").innerHTML="Source: Africa Center for Strategic Studies"+C.bars_html+". Hover or tap a bar for the detail.";
  $$("#bars .bar").forEach(function(el){var b=C.bars[+el.dataset.i];var f=function(e){showTip("<b>"+esc(b.name)+": "+esc(b.text)+"</b>"+esc(b.note),e)};el.addEventListener("mousemove",f);el.addEventListener("mouseenter",f);el.addEventListener("mouseleave",hideTip);el.addEventListener("focus",function(){focusTip("<b>"+esc(b.name)+": "+esc(b.text)+"</b>"+esc(b.note),el)});el.addEventListener("blur",hideTip);el.addEventListener("click",function(e){f(e)})});
  // changes strip
  var ch=D.groups.filter(function(g){return g.change&&g.change.top}).sort(function(a,b){return a.change.date<b.change.date?1:-1});
  $("#changes").innerHTML=ch.map(function(g){return '<div class="chg" style="--c:'+col(g)+'"><b>'+esc(fmt(g.change.date))+" · "+esc(g.change.kind)+"</b><a href=\"#p="+g.id+'" style="color:inherit"><strong>'+esc(g.label)+"</strong></a><p>"+g.change.html+"</p></div>"}).join("");
  // family sections
  $("#families").innerHTML=D.families.map(function(f,i){var gs=D.groups.filter(function(g){return g.family===f.id});var counted=gs.filter(function(g){return g.counted}).length;gs.sort(function(a,b){return (b.counted-a.counted)});
    return '<details class="fam" id="fam-'+f.id+'" style="--c:'+f.color+'"'+(i===0?" open":"")+'><summary><span class="sw"></span>'+esc(f.name)+'<span class="ct">'+counted+" groups"+(gs.length>counted?", "+(gs.length-counted)+" dissolved":"")+"</span></summary><p class=\"muted\">"+esc(f.blurb)+'</p><div class="cards">'+gs.map(function(g){return cardHTML(g,false)}).join("")+"</div></details>"}).join("");
  // storylines
  var inc={};D.incidents.forEach(function(x){inc[x.id]=x});
  $("#stories").innerHTML=C.storylines.map(function(s,i){var items=s.incidents.map(function(id){return inc[id]}).filter(Boolean).sort(function(a,b){return a.date<b.date?1:-1});
    return '<details class="story"'+(i===0?" open":"")+"><summary>"+esc(s.theatre)+'<span class="ct">'+items.length+" incidents</span></summary><p class=\"bl\">"+s.bottom+"</p><ul>"+items.map(function(x){var g=GM[x.group];return '<li><span class="dt">'+esc(fmt(x.date))+(x.date_precision&&x.date_precision!=="day"?"<br>"+esc(x.date_precision):"")+'</span><div><span class="who" style="--c:'+FAM[x.family].color+'"><i></i>'+esc(g?g.label:x.group)+" · "+esc(x.place)+"</span><p>"+x.html+' <span class="muted">Confidence: '+esc(x.conf)+'.</span> <a class="show" href="#i='+x.id+'">Show on map</a></p></div></li>'}).join("")+"</ul></details>"}).join("");
  $("#storynote").textContent="Window: "+fmt(D.window[0])+" to "+fmt(D.window[1])+". Each entry is a major incident chosen from public reports, so the list is not a complete count.";
  // momentum
  $("#mom").innerHTML=MON.map(function(m){var gs=D.groups.filter(function(g){return g.counted&&g.momentum.trend===m[0]});return '<div class="mcol"><h3>'+m[1]+'<span class="ct">'+gs.length+'</span></h3><ul>'+gs.map(function(g){return '<li><a href="#p='+g.id+'" data-id="'+g.id+'" style="--c:'+col(g)+'"><i></i><span>'+esc(g.label)+"</span></a></li>"}).join("")+"</ul></div>"}).join("");
  $$("#mom a").forEach(function(a){var g=GM[a.dataset.id];var f=function(e){showTip("<b>"+esc(g.label)+": "+esc(MON_LABEL[g.momentum.trend])+"</b>"+esc(plain(g.momentum.html))+" Confidence: "+esc(g.momentum.conf||"n/a")+".",e)};a.addEventListener("mousemove",f);a.addEventListener("mouseenter",f);a.addEventListener("mouseleave",hideTip);a.addEventListener("focus",function(){focusTip("<b>"+esc(g.label)+": "+esc(MON_LABEL[g.momentum.trend])+"</b>"+esc(plain(g.momentum.html)),a)});a.addEventListener("blur",hideTip)});
  // takeaway
  $("#takebody").innerHTML=C.takeaway.map(function(t){return "<p><strong>"+esc(t.lead)+"</strong> "+t.html+"</p>"}).join("");
  $("#confnote").textContent=C.confidence_note;
  $("#gaps").textContent=C.gaps;
  // sources
  $("#srclist").innerHTML=D.sources.map(function(s){return '<li id="src-'+s.n+'" value="'+s.n+'"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(cleanTitle(s))+'</a> <span class="muted">'+esc(s.domain)+(s.status==="403"||s.status==="401"?", may need a browser to open":"")+"</span></li>"}).join("");
  $("#credlist").innerHTML=D.image_credits.map(function(c){return "<li>"+esc(c.label)+" ("+esc(c.kind)+'): <a href="'+esc(c.page)+'" target="_blank" rel="noopener noreferrer">'+esc(c.title)+"</a>, "+esc((c.author||"").replace(/(Unknown author)+/,"unknown author"))+", "+esc(c.license||"license on file page")+"</li>"}).join("")+'<li>Basemap: Natural Earth, public domain. Charts: D3 (ISC licence).</li>';
  // mobile relationship list
  $("#relist").innerHTML=Object.keys(TYPE).map(function(t,i){var rs=REL.filter(function(r){return r.type===t});return '<details'+(i===0?" open":"")+"><summary>"+esc(TYPE[t].name)+'<span class="ct">'+rs.length+"</span></summary><ul>"+rs.map(relLi).join("")+"</ul></details>"}).join("");
  // sidebar controls
  $("#famBtns").innerHTML=D.families.map(function(f){return '<button class="fbtn" type="button" aria-pressed="true" data-fam="'+f.id+'" style="--c:'+f.color+'"><span class="sw"></span>'+esc(f.name)+'<span class="ct">'+f.count+"</span></button>"}).join("");
  var nd=D.groups.filter(function(g){return g.state==="dormant"}).length;
  $("#dormBtn").innerHTML='<span class="sw" style="--c:'+D.dissolved_color+'"></span>Dissolved or dormant<span class="ct">'+nd+"</span>";
  $("#typeBtns").innerHTML=Object.keys(TYPE).map(function(t){var n=REL.filter(function(r){return r.type===t}).length;return '<button class="fbtn" type="button" aria-pressed="'+(S.types[t]?"true":"false")+'" data-type="'+esc(t)+'" style="--c:'+TYPE[t].c+'"><span class="ln'+(TYPE[t].dash?" dash":"")+'"></span>'+esc(TYPE[t].name)+'<span class="ct">'+n+"</span></button>"}).join("");
  $("#gkeyfam").innerHTML=D.families.map(function(f){return '<div class="keyrow" style="--c:'+f.color+'"><span class="sw"></span>'+esc(f.name)+"</div>"}).join("")+'<div class="keyrow" style="--c:'+D.dissolved_color+'"><span class="sw"></span>Dissolved or dormant</div>';
}

/* ------------ map ------------- */
function Map_(){
  var wrap=$("#mapwrap"),svg=d3.select("#mapsvg"),proj,path,W,H,zoom,t=d3.zoomIdentity,world,kmax=14,baseB,pulse=null;
  var REGIONS={"Africa":[[-20,-36],[55,38]],"Middle East":[[25,8],[66,42]],"South Asia":[[58,4],[96,40]],"Southeast Asia":[[92,-12],[132,22]]};
  function ext(){return mobile()?[[-18,-30],[80,44]]:[[-45,-34],[140,50]]}
  function build(){
    W=Math.round(wrap.clientWidth);if(!W)return;
    svg.selectAll("*").remove();
    var e=ext(),poly={type:"Polygon",coordinates:[[[e[0][0],e[0][1]],[e[1][0],e[0][1]],[e[1][0],e[1][1]],[e[0][0],e[1][1]],[e[0][0],e[0][1]]]]};
    proj=d3.geoNaturalEarth1();
    if(mobile()){H=400;proj.fitExtent([[4,4],[W-4,H-4]],{type:"MultiPoint",coordinates:[e[0],e[1],[e[0][0],e[1][1]],[e[1][0],e[0][1]]]})}
    else{proj.fitWidth(W-8,{type:"MultiPoint",coordinates:[e[0],e[1],[e[0][0],e[1][1]],[e[1][0],e[0][1]]]});proj.translate([proj.translate()[0]+4,proj.translate()[1]]);
      var pb=d3.geoPath(proj).bounds(poly);H=Math.max(380,Math.min(620,Math.round(pb[1][1]+14)))
      var cy=(pb[0][1]+pb[1][1])/2;proj.translate([proj.translate()[0],proj.translate()[1]+(H/2-cy)])}
    path=d3.geoPath(proj);
    svg.attr("width",W).attr("height",H);
    var sph=path.bounds({type:"Sphere"});baseB=sph;
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","#0a1222");
    var g=svg.append("g").attr("class","zg");
    g.append("g").selectAll("path").data(world.features).join("path").attr("d",path).attr("fill","#14264a").attr("stroke","#33507f").attr("stroke-width",.7).attr("vector-effect","non-scaling-stroke");
    svg.append("g").attr("class","callout");
    svg.append("g").attr("class","leaders");
    svg.append("g").attr("class","mk");
    zoom=d3.zoom().scaleExtent([1,kmax]).translateExtent([[sph[0][0]-W*.2,sph[0][1]-H*.2],[sph[1][0]+W*.2,sph[1][1]+H*.2]]).extent([[0,0],[W,H]]).on("zoom",function(ev){t=ev.transform;draw()});
    svg.call(zoom).on("dblclick.zoom",null);
    t=d3.zoomIdentity;draw();
  }
  function draw(){
    svg.select(".zg").attr("transform",t);
    var items=[];
    D.groups.forEach(function(g){if(S.hidden[g.family])return;if(g.state==="dormant"&&!S.dormant)return;items.push({k:"g:"+g.id,type:"g",d:g,lat:g.lat,lon:g.lon,r:11})});
    if(S.inc)D.incidents.forEach(function(x){if(S.hidden[x.family])return;items.push({k:"i:"+x.id,type:"i",d:x,lat:x.lat,lon:x.lon,r:13})});
    items.forEach(function(n){var p=t.apply(proj([n.lon,n.lat]));n.ax=p[0];n.ay=p[1];n.x=n.ax;n.y=n.ay});
    items=items.filter(function(n){return n.ax>-6&&n.ax<W+6&&n.ay>-6&&n.ay<H+6});
    d3.forceSimulation(items).force("x",d3.forceX(function(n){return n.ax}).strength(.18)).force("y",d3.forceY(function(n){return n.ay}).strength(.18)).force("c",d3.forceCollide(function(n){return n.r}).iterations(2)).stop().tick(120);
    var ld=svg.select(".leaders").selectAll("line").data(items.filter(function(n){return Math.hypot(n.x-n.ax,n.y-n.ay)>4}),function(n){return n.k});
    ld.join("line").attr("x1",function(n){return n.ax}).attr("y1",function(n){return n.ay}).attr("x2",function(n){return n.x}).attr("y2",function(n){return n.y}).attr("stroke","#8fa3c4").attr("stroke-width",1).attr("stroke-dasharray","2 2");
    var m=svg.select(".mk").selectAll("g.marker").data(items,function(n){return n.k});
    var en=m.enter().append("g").attr("class","marker").attr("tabindex",0).attr("role","button");
    en.append("circle").attr("class","hit").attr("r",15).attr("fill","#000").attr("fill-opacity",0);
    en.each(function(n){var el=d3.select(this);
      if(n.type==="g"){var gg=n.d;if(gg.state==="governing")el.append("circle").attr("r",13).attr("fill","none").attr("stroke","#c8a24a").attr("stroke-width",3);
        el.append("circle").attr("class","dot").attr("r",8).attr("fill",col(gg)).attr("stroke","#0b1526").attr("stroke-width",1.5);
        el.attr("aria-label",gg.label+", "+FAM[gg.family].name+", "+gg.state_label)}
      else{el.append("path").attr("class","dot").attr("d",d3.symbol().type(d3.symbolDiamond).size(300)()).attr("fill",FAM[n.d.family].color).attr("stroke","#fff").attr("stroke-width",1.6);
        el.attr("aria-label","Incident "+fmt(n.d.date)+", "+n.d.place)}});
    en.on("mouseenter mousemove",function(e,n){showTip(mtip(n),e)}).on("mouseleave",hideTip).on("focus",function(e,n){focusTip(mtip(n),this)}).on("blur",hideTip)
      .on("click",function(e,n){e.stopPropagation();hideTip();location.hash=(n.type==="g"?"p=":"i=")+n.d.id})
      .on("keydown",function(e,n){if(e.key==="Enter"||e.key===" "){e.preventDefault();location.hash=(n.type==="g"?"p=":"i=")+n.d.id}});
    m.exit().remove();
    svg.select(".mk").selectAll("g.marker").attr("transform",function(n){return "translate("+n.x+","+n.y+")"});
    // pulse ring for focused incident or group
    svg.select(".mk").selectAll("circle.ring").remove();
    if(pulse){svg.select(".mk").selectAll("g.marker").filter(function(n){return n.k===pulse}).insert("circle",":first-child").attr("class","ring").attr("r",20).attr("fill","none").attr("stroke","#c8a24a").attr("stroke-width",3)}
    // callout
    var co=svg.select(".callout");co.selectAll("*").remove();
    if(W>=860&&t.k<1.25){var p0=t.apply(proj([-33,-14])),p1=t.apply(proj([-2,14.5]));
      co.append("line").attr("x1",p0[0]+78).attr("y1",p0[1]-18).attr("x2",p1[0]).attr("y2",p1[1]).attr("stroke","#c8a24a").attr("stroke-width",1.5).attr("stroke-dasharray","4 3");
      var tx=co.append("text").attr("x",p0[0]).attr("y",p0[1]).attr("fill","#c8a24a").attr("font-size",15).attr("font-weight",600);
      tx.append("tspan").attr("x",p0[0]).text("Sahel: 42% of Africa's");tx.append("tspan").attr("x",p0[0]).attr("dy",19).text("militant Islamist deaths")}
    $("#zin").disabled=t.k>=kmax-.01;$("#zout").disabled=t.k<=1.01;
  }
  function mtip(n){
    if(n.type==="g"){var g=n.d;return "<b>"+esc(g.label)+"</b>"+esc(FAM[g.family].name+", "+g.state_label)+"<br>Leader: "+esc(plain(g.leader_html))+"<br>"+esc(g.areas)+"<br><span class=\"muted\">Click for details</span>"}
    var x=n.d;return "<b>"+esc(fmt(x.date)+": "+x.place)+"</b>"+esc(nodeName(x.group))+"<br>"+esc(plain(x.html))+"<br><span class=\"muted\">Confidence: "+esc(x.conf)+". Click for details</span>"}
  function viewTo(b,kcap){var p0=proj(b[0]),p1=proj([b[1][0],b[0][1]]),p2=proj([b[0][0],b[1][1]]),p3=proj(b[1]);
    var xs=[p0[0],p1[0],p2[0],p3[0]],ys=[p0[1],p1[1],p2[1],p3[1]],x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);
    var k=Math.min(kmax,kcap||kmax,.92*Math.min(W/(x1-x0),H/(y1-y0)));k=Math.max(1,k);
    var tr=d3.zoomIdentity.translate(W/2,H/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2);
    svg.transition().duration(450).call(zoom.transform,tr)}
  return {
    init:function(){world=window.__world;build();
      var rt;window.addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(function(){if(Math.round(wrap.clientWidth)!==W)build()},150)});
      $("#zin").addEventListener("click",function(){svg.transition().duration(250).call(zoom.scaleBy,1.8)});
      $("#zout").addEventListener("click",function(){svg.transition().duration(250).call(zoom.scaleBy,1/1.8)});
      $("#zreset").addEventListener("click",function(){pulse=null;svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity)});
      $("#regions").innerHTML=Object.keys(REGIONS).map(function(r){return '<button class="btn" type="button" data-region="'+r+'">'+r+"</button>"}).join("");
      $$("#regions button").forEach(function(b){b.addEventListener("click",function(){viewTo(REGIONS[b.dataset.region])})})},
    redraw:function(){if(W)draw()},
    focus:function(lat,lon,key){pulse=key;var d=.8;viewTo([[lon-d,lat-d*.8],[lon+d,lat+d*.8]],mobile()?3.5:5)},
    pulse:function(key){pulse=key;if(W)draw()}
  }
}

/* ------------ graph ------------- */
function Graph_(){
  var wrap=$("#graphwrap"),svg=d3.select("#graphsvg"),W,H,nodes,links,sel={};
  function pairKey(a,b){return a<b?a+"|"+b:b+"|"+a}
  function build(){
    if(mobile()||!wrap.clientWidth)return;
    W=Math.round(wrap.clientWidth);H=W<760?760:740;
    svg.selectAll("*").remove();svg.attr("width",W).attr("height",H);
    var ids={};REL.forEach(function(r){ids[r.source]=1;ids[r.target]=1});
    var deg={};REL.forEach(function(r){deg[r.source]=(deg[r.source]||0)+1;deg[r.target]=(deg[r.target]||0)+1});
    nodes=Object.keys(ids).map(function(id){var g=GM[id],e=EXT[id];return {id:id,g:g,ext:!!e,label:g?g.label:e.label,fam:g?g.family:"ext",r:8+Math.min(deg[id],10)*.7,deg:deg[id]}});
    var byId={};nodes.forEach(function(n){byId[n.id]=n});
    links=REL.map(function(r,i){return {s:byId[r.source],t:byId[r.target],r:r,source:byId[r.source],target:byId[r.target]}});
    var cnt={},idx={};links.forEach(function(l){var k=pairKey(l.r.source,l.r.target);cnt[k]=(cnt[k]||0)+1});
    links.forEach(function(l){var k=pairKey(l.r.source,l.r.target);idx[k]=(idx[k]||0);l.off=(idx[k]-(cnt[k]-1)/2)*26*(l.r.source<l.r.target?1:-1);idx[k]++});
    var C={"al-qaeda":[.2,.34],"islamic-state":[.64,.26],"iran-axis":[.42,.84],"independent":[.9,.74],"ext":[.5,.55]};
    var sim=d3.forceSimulation(nodes).force("link",d3.forceLink(links).distance(function(l){return l.r.type==="split from / affiliate of"?95:135}).strength(.18))
      .force("charge",d3.forceManyBody().strength(-420))
      .force("x",d3.forceX(function(n){return W*C[n.fam][0]}).strength(.12)).force("y",d3.forceY(function(n){return H*C[n.fam][1]}).strength(.12))
      .force("col",d3.forceCollide(function(n){return n.r+Math.min(n.label.length,24)*2.7}).iterations(3)).stop();
    for(var i=0;i<400;i++)sim.tick();
    nodes.forEach(function(n){n.w=Math.max(n.label.length*6.9,n.r*2)+10;});
    for(var it=0;it<160;it++){
      for(var a=0;a<nodes.length;a++)for(var b=a+1;b<nodes.length;b++){var p=nodes[a],q=nodes[b];
        var ox=(p.w+q.w)/2-Math.abs(p.x-q.x),oy=((p.r+q.r)/2+26)-Math.abs((p.y+9)-(q.y+9));
        if(ox>0&&oy>0){if(oy<=ox*.55||oy<ox&&it<80){var sy=(p.y<q.y?-1:1)*oy/2;p.y+=sy;q.y-=sy}else{var sx=(p.x<q.x?-1:1)*ox/2;p.x+=sx;q.x-=sx}}}
      nodes.forEach(function(n){n.x=Math.max(n.w/2+4,Math.min(W-n.w/2-4,n.x));n.y=Math.max(n.r+8,Math.min(H-n.r-26,n.y))})}
    var defs=svg.append("defs");
    Object.keys(TYPE).forEach(function(t,i){defs.append("marker").attr("id","ar"+i).attr("viewBox","0 0 10 10").attr("refX",9).attr("refY",5).attr("markerWidth",7).attr("markerHeight",7).attr("orient","auto").append("path").attr("d","M0,0L10,5L0,10z").attr("fill",TYPE[t].c)});
    svg.append("rect").attr("width",W).attr("height",H).attr("fill","#0a1222");
    sel.link=svg.append("g").selectAll("g").data(links).join("g").attr("class","lk");
    sel.link.append("path").attr("class","vis").attr("fill","none").attr("stroke",function(l){return TYPE[l.r.type].c}).attr("stroke-width",2.4).attr("stroke-dasharray",function(l){return TYPE[l.r.type].dash?TYPE[l.r.type].dash:(l.r.basis==="reported"?"7 5":null)}).attr("marker-end",function(l){var i=Object.keys(TYPE).indexOf(l.r.type);return TYPE[l.r.type].dir?"url(#ar"+i+")":null});
    sel.link.append("path").attr("class","hit").attr("fill","none").attr("stroke","#000").attr("stroke-opacity",0).attr("stroke-width",14).style("cursor","pointer");
    sel.node=svg.append("g").selectAll("g.nd").data(nodes).join("g").attr("class","nd marker").attr("tabindex",0).attr("role","button").attr("aria-label",function(n){return n.label+", open details"});
    sel.node.append("circle").attr("class","dot").attr("r",function(n){return n.r}).attr("fill",function(n){return n.ext?"#0a1222":col(n.g)}).attr("stroke",function(n){return n.ext?"#e6e9ef":"#0b1526"}).attr("stroke-width",function(n){return n.ext?2.5:1.5});
    sel.node.filter(function(n){return n.g&&n.g.state==="governing"}).insert("circle",".dot").attr("r",function(n){return n.r+4}).attr("fill","none").attr("stroke","#c8a24a").attr("stroke-width",3);
    sel.node.append("text").attr("class","lbl").attr("text-anchor","middle").attr("y",function(n){return n.r+15}).text(function(n){return n.label});
    bindTip(sel.node,function(n){if(n.ext)return "<b>"+esc(n.label)+"</b>"+esc(EXT[n.id].name)+"<br><span class=\"muted\">External actor. Click for its links.</span>";var g=n.g;return "<b>"+esc(g.label)+"</b>"+esc(FAM[g.family].name+", "+g.state_label)+"<br>Leader: "+esc(plain(g.leader_html))+"<br><span class=\"muted\">"+n.deg+" links. Click for details.</span>"});
    sel.node.on("click",function(e,n){hideTip();location.hash="p="+n.id}).on("keydown",function(e,n){if(e.key==="Enter"||e.key===" "){e.preventDefault();location.hash="p="+n.id}});
    sel.node.on("mouseenter.hl focus.hl",function(e,n){var nb={};nb[n.id]=1;links.forEach(function(l){if(l.s===n||l.t===n){nb[l.s.id]=1;nb[l.t.id]=1}});sel.node.style("opacity",function(m){return nb[m.id]?1:.25});sel.link.style("opacity",function(l){return l.s===n||l.t===n?1:.12})}).on("mouseleave.hl blur.hl",function(){sel.node.style("opacity",null);sel.link.style("opacity",null)});
    bindTip(sel.link.select(".hit"),function(l){return "<b>"+esc(nodeName(l.r.source))+" "+(TYPE[l.r.type].dir?"→":"↔")+" "+esc(nodeName(l.r.target))+"</b>"+esc(TYPE[l.r.type].name+", "+l.r.basis+", confidence "+l.r.conf)+"<br>"+esc(plain(l.r.html))});
    sel.link.select(".hit").on("click",function(e,l){hideTip()});
    position();apply();
  }
  function position(){
    sel.node.attr("transform",function(n){return "translate("+n.x+","+n.y+")"});
    sel.link.selectAll("path").attr("d",function(l){var s=l.s,t=l.t,dx=t.x-s.x,dy=t.y-s.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
      var a=[s.x+ux*(s.r+4)+nx*l.off*.15,s.y+uy*(s.r+4)+ny*l.off*.15],b=[t.x-ux*(t.r+6)+nx*l.off*.15,t.y-uy*(t.r+6)+ny*l.off*.15];
      var mx=(s.x+t.x)/2+nx*l.off,my=(s.y+t.y)/2+ny*l.off;return "M"+a[0]+","+a[1]+"Q"+mx+","+my+" "+b[0]+","+b[1]})
  }
  function apply(){
    if(!sel.link)return;
    var vis={};
    sel.link.style("display",function(l){var on=S.types[l.r.type]&&!S.hidden[l.s.fam]&&!S.hidden[l.t.fam];on=S.types[l.r.type]&&(l.s.ext||!S.hidden[l.s.fam])&&(l.t.ext||!S.hidden[l.t.fam]);if(on){vis[l.s.id]=1;vis[l.t.id]=1}return on?null:"none"});
    sel.node.style("display",function(n){return vis[n.id]?null:"none"});
  }
  return {init:function(){build();var rt;window.addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(function(){if(!mobile()&&Math.round(wrap.clientWidth)!==W)build()},200)})},apply:apply}
}

/* ------------ panel + hash ------------- */
function openPanel(html,opener){var p=$("#panel");$("#pbody").innerHTML=html;p.classList.add("open");p.setAttribute("aria-hidden","false");p.scrollTop=0;panelOpener=opener||document.activeElement;$("#pclose").focus({preventScroll:true})}
function closePanel(){var p=$("#panel");p.classList.remove("open");p.setAttribute("aria-hidden","true");if(map)map.pulse(null);if(/^#[pi]=/.test(location.hash))history.replaceState(null,"",location.pathname+location.search);if(panelOpener&&panelOpener.focus)try{panelOpener.focus({preventScroll:true})}catch(e){}}
function scrollMap(){var m=$("#map");var top=m.getBoundingClientRect().top+window.scrollY-8;window.scrollTo({top:top,behavior:"smooth"})}
function route(){
  var h=location.hash,m=/^#([pi])=(.+)$/.exec(h);
  if(!m){return}
  var id=decodeURIComponent(m[2]);
  if(m[1]==="p"){
    var g=GM[id],e=EXT[id];
    if(g){openPanel(cardHTML(g,true));if(map)map.pulse("g:"+id);hl("#card-"+id,false)}
    else if(e){var rs=relsFor(id);openPanel('<article class="card" style="--c:#e6e9ef"><div class="chead"><div><h3>'+esc(e.label)+'</h3><p class="full">'+esc(e.name)+'</p><span class="st" style="--c:#e6e9ef">Outside actor, '+esc(e.kind)+'</span></div></div><h4 class="sub">Links to groups</h4><ul class="rl">'+rs.map(relLi).join("")+"</ul></article>")}
  }else{
    var x=D.incidents.filter(function(i){return i.id===id})[0];if(!x)return;
    if(!S.inc){S.inc=true;$("#incBtn").setAttribute("aria-pressed","true")}
    var g2=GM[x.group];
    openPanel('<article class="card" style="--c:'+FAM[x.family].color+'"><div class="chead"><div><h3>'+esc(x.place)+"</h3><p class=\"full\">"+esc(fmt(x.date)+(x.date_precision!=="day"?" ("+x.date_precision+")":""))+'</p><span class="st" style="--c:'+FAM[x.family].color+'">'+esc(g2?g2.label:x.group)+'</span></div></div><p>'+x.html+'</p><p class="muted">Confidence: '+esc(x.conf)+'. Theatre: '+esc(x.theatre)+'.</p><p><a class="opn" href="#p='+x.group+'">Open '+esc(g2?g2.label:"")+" details</a></p></article>");
    scrollMap();if(map)map.focus(x.lat,x.lon,"i:"+x.id);
  }
}
function hl(sel){var el=$(sel);if(!el)return;el.classList.add("flash");setTimeout(function(){el.classList.remove("flash")},1600)}
function onFn(e){var a=e.target.closest&&e.target.closest("a.fnl");if(!a)return;e.preventDefault();var n=a.dataset.src,det=$("#srcdet");det.open=true;var el=document.getElementById("src-"+n);if(el){setTimeout(function(){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("flash");setTimeout(function(){el.classList.remove("flash")},1800)},30)}}

function wire(){
  document.addEventListener("click",onFn);
  $("#pclose").addEventListener("click",closePanel);
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&$("#panel").classList.contains("open"))closePanel()});
  $("#famBtns").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var f=b.dataset.fam;S.hidden[f]=!S.hidden[f];b.setAttribute("aria-pressed",S.hidden[f]?"false":"true");map.redraw();graph.apply()});
  $("#dormBtn").addEventListener("click",function(){S.dormant=!S.dormant;this.setAttribute("aria-pressed",S.dormant?"true":"false");map.redraw()});
  $("#incBtn").addEventListener("click",function(){S.inc=!S.inc;this.setAttribute("aria-pressed",S.inc?"true":"false");map.redraw()});
  $("#typeBtns").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var t=b.dataset.type;S.types[t]=!S.types[t];b.setAttribute("aria-pressed",S.types[t]?"true":"false");graph.apply()});
  window.addEventListener("hashchange",route);
}

function init(){
  tip=$("#tip");
  D.groups.forEach(function(g){GM[g.id]=g});D.families.forEach(function(f){FAM[f.id]=f});D.external.forEach(function(e){EXT[e.id]=e});REL=D.relations;
  document.documentElement.style.setProperty("--dis",D.dissolved_color);
  renderStatic();wire();
  map=Map_();map.init();graph=Graph_();graph.init();
  route();
}
Promise.all([fetch("data.json").then(function(r){return r.json()}),fetch("data/world.json").then(function(r){return r.json()})]).then(function(a){D=a[0];window.__world=a[1];init()}).catch(function(e){var m=document.getElementById("err");if(m){m.hidden=false}console.error(e)});
})();
