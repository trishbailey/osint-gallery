/* Foreign recruits maps: one circle per country, circle AREA proportional to people (radius = k * sqrt(n), the same k on every map).
   Filled red circle = cumulative total counted by Ukraine (darker red = more people, linear in the number). Dashed gold ring = contracts signed
   from January to September 2026 ONLY, which is not a total. Africa is one combined total for 37 countries, drawn at sea with a leader line.
   Labels touch their circle's edge; each is moved to the first free spot so it covers no circle and no other label. Sources are in data/foreign.json. */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var fmt=function(n){return Number(n).toLocaleString('en-US')};
var ph=function(){return window.matchMedia('(max-width:700px)').matches};
var RAMP=['#fdedeb','#fea498','#e43d3c','#8a0114'],GOLD='#c8a24a',F,W,NB;
var rOf=function(n){return (ph()?F.rk_ph:F.rk)*Math.sqrt(n)};
function col(v){var s=Math.min(1,v/F.vmax)*3,i=Math.min(2,Math.floor(s));return d3.interpolateRgb(RAMP[i],RAMP[i+1])(s-i)}
/* region frames (lon, lat corners), svg height on desktop and on a phone, and label direction preferences */
var MAPS={
 central:{box:[[47,33],[85,54]],boxph:[[53,34],[81,52]],h:[430,330],conic:true},
 belarus:{box:[[19,47],[39,58]],h:[430,330]},
 africa:{box:[[-26,-30],[58,26]],h:[400,340]},
 latam:{box:[[-90,-22],[-58,14]],h:[400,340]},
 seasia:{box:[[92,-12],[142,12]],h:[400,230]}
};
var PREFS={yemen:['bottom','bR','top','tR','left','right'],sudan:['left','top','right'],sierraleone:['bottom','right','top'],turkmenistan:['left','bottom','top'],tajikistan:['right','bottom'],kyrgyzstan:['top','right']};
var PREF=['right','left','top','bottom','tr','tl','br','bl'];
function boxPts(b){var p=[],x,y;for(x=b[0][0];x<=b[1][0];x+=2){p.push([x,b[0][1]],[x,b[1][1]])}for(y=b[0][1];y<=b[1][1];y+=2){p.push([b[0][0],y],[b[1][0],y])}return p}
function legend(){
 var el=$('#forkey');if(!el||!F)return;
 var vals=[8000,3000,1000],R=rOf(8000),w=2*R+84,h=2*R+20,s='<h3 class="sideh">Circle area shows people</h3><svg width="'+w+'" height="'+h+'" role="img" aria-label="Three nested sample circles for 8,000, 3,000 and 1,000 people" data-ci-ignore="1">';
 vals.forEach(function(v){var r=rOf(v),cy=h-3-r;s+='<circle cx="'+(R+2)+'" cy="'+cy+'" r="'+r+'" fill="'+col(v)+'" stroke="#fdedeb" stroke-width="1" data-ramp="foreign"/>'});
 vals.forEach(function(v){var r=rOf(v),y=h-3-2*r;s+='<line x1="'+(R+2)+'" y1="'+y+'" x2="'+(2*R+10)+'" y2="'+y+'" stroke="#9aa6b8" stroke-width="1"/><text x="'+(2*R+14)+'" y="'+(y+4)+'" class="fk-t">'+fmt(v)+'</text>'});
 s+='</svg>';
 var rr=14;
 s+='<ul class="legend forkeyl"><li><svg width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="'+col(5000)+'" stroke="#fdedeb" stroke-width="1" data-ramp="foreign"/></svg><span><b>Filled red circle:</b> a cumulative total counted by Ukraine. Darker red means more people.</span></li>'
  +'<li><svg width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="'+rr+'" fill="none" stroke="'+GOLD+'" stroke-width="2.5" stroke-dasharray="5 3"/></svg><span><b>Dashed gold ring:</b> contracts signed from January to September 2026 only. Not a total.</span></li></ul>'
  +'<p class="note">Ukrainian figures, not independently verified.</p>';
 el.innerHTML=s}
function place(svg,items,W_,H_){
 var placed=[],circles=items.map(function(d){return {x:d.x,y:d.y,r:d.r}}),g=svg.append('g').attr('class','flabs');
 var hit=function(a,b){return !(a.x1<=b.x0||a.x0>=b.x1||a.y1<=b.y0||a.y0>=b.y1)};
 var cr=function(r,c){var cx=Math.max(r.x0,Math.min(c.x,r.x1)),cy=Math.max(r.y0,Math.min(c.y,r.y1));return Math.hypot(cx-c.x,cy-c.y)<c.r+1};
 items.slice().sort(function(a,b){return b.r-a.r}).forEach(function(d){
  var t=g.append('text').attr('class','dlab');
  t.append('tspan').attr('x',0).attr('dy','1em').style('font-weight',600).text(d.label[0]);
  d.label.slice(1).forEach(function(l){t.append('tspan').attr('x',0).attr('dy','1.15em').text(l)});
  var bb=t.node().getBBox(),w=bb.width,h=bb.height,gp=3,best=null;
  var cands={right:[d.x+d.r+gp,d.y-h/2],left:[d.x-d.r-gp-w,d.y-h/2],top:[d.x-w/2,d.y-d.r-gp-h],bottom:[d.x-w/2,d.y+d.r+gp],
   tr:[d.x+d.r*.71+gp,d.y-d.r*.71-gp-h],tl:[d.x-d.r*.71-gp-w,d.y-d.r*.71-gp-h],br:[d.x+d.r*.71+gp,d.y+d.r*.71+gp],bR:[d.x+d.r-w,d.y+d.r+gp],tR:[d.x+d.r-w,d.y-d.r-gp-h],bl:[d.x-d.r*.71-gp-w,d.y+d.r*.71+gp]};
  (d.pref||PREF).concat(PREF).some(function(k){
   var c=cands[k],r={x0:c[0],y0:c[1],x1:c[0]+w,y1:c[1]+h};
   if(r.x0<2||r.y0<2||r.x1>W_-2||r.y1>H_-2)return false;
   if(circles.some(function(ci){return cr(r,ci)}))return false;
   if(placed.some(function(p){return hit(r,p)}))return false;
   best=r;return true});
  if(!best){var c=cands[(d.pref||PREF)[0]];best={x0:Math.max(2,Math.min(W_-w-2,c[0])),y0:Math.max(2,Math.min(H_-h-2,c[1]))};best.x1=best.x0+w;best.y1=best.y0+h}
  placed.push(best);t.attr('transform','translate('+(best.x0-bb.x)+','+(best.y0-bb.y)+')')})
}
function drawMap(id){
 var cfg=MAPS[id],el=$('#fm-'+id);if(!el)return;var w=el.clientWidth;if(!w)return;var h=cfg.h[ph()?1:0];el.innerHTML='';
 var its=F.items.filter(function(i){return i.map===id});
 var svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img').attr('aria-label',el.getAttribute('data-alt')||id);
 var proj=cfg.conic?d3.geoConicConformal().rotate([-66,0]).parallels([38,50]):d3.geoMercator();
 proj.fitExtent([[0,0],[w,h]],{type:'MultiPoint',coordinates:boxPts(ph()&&cfg.boxph?cfg.boxph:cfg.box)});
 var path=d3.geoPath(proj),have={};its.forEach(function(i){have[i.name]=1});
 var g=svg.append('g');
 g.selectAll('path.cn').data(W.features).enter().append('path').attr('class',function(f){return 'cn'+(have[f.properties.name]?' hv':'')}).attr('d',path);
 if(cfg.conic)g.selectAll('path.cn2').data(NB.features).enter().append('path').attr('class',function(f){return 'cn'+(have[f.properties.name]?' hv':'')}).attr('d',path);
 var pts=its.map(function(i){var p=proj(i.ll);return {i:i,x:p[0],y:p[1],r:rOf(i.value)}});
 var lab=[];
 pts.filter(function(p){return p.i.kind==='agg'}).forEach(function(p){
  var t=proj(F.africa_target),dx=t[0]-p.x,dy=t[1]-p.y,L=Math.hypot(dx,dy);
  svg.append('path').attr('class','leader').attr('d','M'+(p.x+dx/L*(p.r+1))+','+(p.y+dy/L*(p.r+1))+'L'+t[0]+','+t[1]);
  svg.append('circle').attr('class','leaderdot').attr('cx',t[0]).attr('cy',t[1]).attr('r',3)});
 pts.slice().sort(function(a,b){return b.r-a.r}).forEach(function(p){
  var i=p.i,gp=svg.append('g').attr('class','fg '+i.kind).attr('tabindex',0).attr('data-tip',i.tip)
   .attr('aria-label',i.name+': '+fmt(i.value)+(i.kind==='y2026'?' contracts, January to September 2026 only':i.kind==='agg'?' recruited in total, to August 2026':' counted, cumulative'));
  if(i.kind==='y2026')gp.append('circle').attr('class','fc ring').attr('cx',p.x).attr('cy',p.y).attr('r',p.r);
  else gp.append('circle').attr('class','fc').attr('data-ramp','foreign').attr('cx',p.x).attr('cy',p.y).attr('r',p.r).attr('fill',col(i.value));
  gp.append('circle').attr('class','fhit').attr('cx',p.x).attr('cy',p.y).attr('r',Math.max(p.r,14));
  var sub=i.kind==='y2026'?fmt(i.value)+' in Jan to Sep 2026':fmt(i.value);
  lab.push({x:p.x,y:p.y,r:p.r,label:i.kind==='agg'?['Africa, 37 countries','combined: '+fmt(i.value)]:i.kind==='y2026'?[i.name,fmt(i.value)+', 2026 only']:[i.name,fmt(i.value)],pref:i.kind==='agg'?['bottom','top','left']:PREFS[i.id]})});
 place(svg,lab,w,h)}
function draw(){legend();Object.keys(MAPS).forEach(drawMap)}
Promise.all(['data/foreign.json','data/world110.json','vendor/ne_neighbours.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(function(res){
 F=res[0];W=res[1];NB=res[2];draw();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)draw()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(draw,150)});
 document.documentElement.setAttribute('data-fg','1');
}).catch(function(e){console.error(e);var el=$('#fgrid');if(el)el.innerHTML='<p class="notice">The foreign recruits maps failed to load.</p>'});
})();
