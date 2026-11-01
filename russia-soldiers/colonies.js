/* Prison colony map: one circle per colony that sent recruits to Wagner, 1 Jul 2022 to 7 Feb 2023. Circle AREA is proportional to the minimum number recruited
   (radius = k * sqrt(n), so a circle twice as wide holds four times the men). Source: Mediazona with BBC News Russian, 10 Jun 2024 (CC BY-SA 4.0).
   Zoom: Ctrl and scroll or two-finger pinch, drag with a mouse; one finger still scrolls the page. No buttons. */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
var fmt=function(n){return Number(n).toLocaleString('en-US')};
var ph=function(){return window.matchMedia('(max-width:700px)').matches};
var YEL='#e8c547',C,G,NB,cur;
var rOf=function(n){return (ph()?0.5:0.62)*Math.sqrt(n)};      /* 506 -> 14 px on desktop, 11 px on a phone */
function tip(c){return '<b>'+esc(c.name)+'</b><br>'+esc(c.region)+'<br>Minimum recruited: '+fmt(c.n)+' (Wagner period, Jul 2022 to Feb 2023 only)<br>Killed, Wagner payment records: '+fmt(c.killed)+(c.note?'<br>'+esc(c.note):'')}
function key(){
 var s=[100,300,500],h='<h3 class="sideh">Circle size</h3><ul class="legend colkey">';
 s.forEach(function(n){var r=rOf(n);h+='<li><svg width="'+(2*rOf(500)+4)+'" height="'+(2*rOf(500)+4)+'" aria-hidden="true"><circle cx="'+(rOf(500)+2)+'" cy="'+(rOf(500)+2)+'" r="'+r+'" fill="'+YEL+'" fill-opacity=".75" stroke="#0b1526" stroke-width="1"/></svg>'+n+' recruits at least</li>'});
 h+='</ul><p class="note">Minimum recruits per colony, Wagner period Jul 2022 to Feb 2023 only. Area shows the number.</p>';
 $('#colkey').innerHTML=h}
function top(){
 var a=C.colonies.slice().sort(function(x,y){return y.n-x.n}).slice(0,10);
 $('#coltop').innerHTML=a.map(function(c,i){return '<li><span class="ct-n">'+fmt(c.n)+'</span><span class="ct-l"><b>'+esc(c.name)+'</b>, '+esc(c.region)+'</span><span class="ct-k">'+fmt(c.killed)+' killed</span></li>'}).join('')}
function draw(){
 var el=$('#colmap');if(!el)return;var w=el.clientWidth;if(!w)return;var h=ph()?400:540;
 el.innerHTML='';
 var svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img')
  .attr('aria-label','Map of Russia with one yellow circle for each prison colony that sent recruits to Wagner between July 2022 and February 2023. Circle area shows the minimum number recruited. Hover or tap a circle for the colony, its region, the minimum recruited and the number killed.');
 var proj=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]).fitExtent([[6,6],[w-6,h-6]],{type:'FeatureCollection',features:G.features});
 var path=d3.geoPath(proj),g=svg.append('g');
 g.append('g').selectAll('path').data(NB.features).enter().append('path').attr('class','cn').attr('d',path);
 g.append('g').selectAll('path').data(G.features).enter().append('path').attr('class','rg').attr('d',path);
 var pts=C.colonies.slice().sort(function(a,b){return b.n-a.n});   /* big circles first, small ones stay hoverable on top */
 var dots=g.append('g').selectAll('circle').data(pts).enter().append('circle').attr('class','col')
  .attr('cx',function(c){return proj([c.lon,c.lat])[0]}).attr('cy',function(c){return proj([c.lon,c.lat])[1]}).attr('r',function(c){return rOf(c.n)})
  .attr('fill',YEL).attr('fill-opacity',.72).attr('stroke','#0b1526').attr('stroke-width',1).attr('tabindex',0).attr('data-tip',tip)
  .attr('aria-label',function(c){return c.name+', '+c.region+': at least '+fmt(c.n)+' recruited, '+fmt(c.killed)+' killed'});
 var zm=d3.zoom().scaleExtent([1,10]).translateExtent([[0,0],[w,h]]).filter(function(e){if(e.type==='wheel')return e.ctrlKey;if(e.touches)return e.touches.length>1;return !e.button})
  .on('zoom',function(e){g.attr('transform',e.transform);var k=e.transform.k;dots.attr('r',function(c){return rOf(c.n)/Math.sqrt(k)}).attr('stroke-width',1/k);g.selectAll('.cn,.rg').attr('stroke-width',function(){return .5/k})});
 svg.call(zm).style('touch-action','pan-y');
}
Promise.all(['data/colonies.json','vendor/ru_admin1.geojson','vendor/ne_neighbours.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(function(res){
 C=res[0];G=res[1];NB=res[2];key();top();draw();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)draw()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){key();draw()},150)});
 document.documentElement.setAttribute('data-col','1');
}).catch(function(e){console.error(e);var el=$('#colmap');if(el)el.innerHTML='<p class="notice">The prison colony map failed to load.</p>'});
})();
