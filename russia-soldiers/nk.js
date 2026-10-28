/* North Korea section: a two-way relationship graphic and a route map. Status: documented (solid), reported (long dashes), contested (dots). */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
var ph=function(){return window.matchMedia('(max-width:700px)').matches};
var N,G,NB,svgM,zm,cur,T0,VIEWS;
var DASH={documented:null,reported:'16 7',contested:'2 8'};
var SRC={yonhap_nis:'Yonhap on South Korea\u2019s NIS, 2 Sep 2025',bbc_nk:'BBC News, 14 Sep 2026',bbc_shoigu:'BBC News, 18 Jun 2025',bbc_foreign:'BBC News Russian and Mediazona, 10 Jul 2026',istories_nk_en:'iStories and Open Source Centre, 16 Mar 2026',msmt_meduza:'Meduza on the MSMT report, 17 Sep 2026',nk_unit_meduza:'Meduza and Reuters, 5 Aug 2026',bbc_treaty:'BBC News, 19 Jun 2024'};
function tipOf(r){var s={};r.ev.forEach(function(e){s[e.src]=1});
 return '<b>'+esc(r.short)+'</b><br><span class="tgs">'+r.status+'</span> '+esc(r.more)+'<br>Source: '+Object.keys(s).map(function(k){return esc(SRC[k]||k)}).join('; ')}
function rel(){
 var el=$('#nkrel');if(!el)return;var w=el.clientWidth;if(!w)return;
 el.innerHTML='';var rows=N.rows,RH=44,HH=30,x0=52,x1=w-52,y=0,items=[];
 var ru=rows.filter(function(r){return r.dir==='to_ru'}),nk=rows.filter(function(r){return r.dir==='to_nk'});
 var h=HH*2+(ru.length+nk.length)*RH+12;
 var svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Flows between North Korea and Russia: troops, workers, munitions and missiles to Russia; food, oil, cash and technology back. Each row is marked documented, reported or contested.');
 var nodes=svg.append('g');
 function node(x,label,y1,y2){nodes.append('rect').attr('x',x).attr('y',y1).attr('width',40).attr('height',y2-y1).attr('rx',8).attr('fill','#1d3a63').attr('stroke','#c8a24a');
  nodes.append('text').attr('class','nodet').attr('transform','translate('+(x+25)+','+((y1+y2)/2)+') rotate(-90)').attr('text-anchor','middle').text(label)}
 node(0,'North Korea',2,h-8);node(w-40,'Russia',2,h-8);
 function block(list,head,toRu,y){
  svg.append('text').attr('class','nkh').attr('x',x0).attr('y',y+20).text(head);y+=HH;
  list.forEach(function(r){
   var col=N.kinds[r.kind].color,ay=y+30,len=x1-x0-100;
   var g=svg.append('g').attr('class','nkr').attr('tabindex',0).attr('data-tip',tipOf(r)).attr('aria-label',r.short+', '+r.status);
   g.append('rect').attr('x',x0-4).attr('y',y).attr('width',x1-x0+8).attr('height',RH-2).attr('fill','none').attr('pointer-events','all');
   g.append('text').attr('class','nkt').attr('x',x0).attr('y',y+15).text(r.short);
   var ax0=toRu?x0:x0+len,ax1=toRu?x0+len:x0,hl=13,sg=toRu?1:-1;
   g.append('line').attr('x1',ax0).attr('x2',ax1-sg*hl).attr('y1',ay).attr('y2',ay).attr('stroke',col).attr('stroke-width',6).attr('stroke-linecap',r.status==='documented'?'butt':'round').attr('stroke-dasharray',DASH[r.status]);
   g.append('polygon').attr('points',[[ax1,ay],[ax1-sg*hl,ay-8],[ax1-sg*hl,ay+8]].join(' ')).attr('fill',col);
   g.append('text').attr('class','nks nks-'+r.status).attr('x',x1).attr('y',ay+4).attr('text-anchor','end').text(r.status);
   y+=RH});
  return y}
 y=block(ru,'North Korea to Russia',true,y);y=block(nk,'Russia to North Korea',false,y+4);
 el.setAttribute('data-ready','1');
}
function mapDraw(){
 var el=$('#nkmap');if(!el)return;var w=el.clientWidth;if(!w)return;el.innerHTML='';var h0=ph()?360:0;
 var svg=d3.select(el).append('svg').attr('width',w).attr('role','img').attr('aria-label','Map of the routes between North Korea and Russia: troops and workers by land, munitions by sea from Rajin to Dunai and by rail to a depot near Tikhoretsk.');
 svgM=svg;
 var proj=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]);
 var pts=[];for(var lo=28;lo<=136;lo+=4){pts.push([lo,36.5]);pts.push([lo,58.5])}for(var la=36.5;la<=58.5;la+=4){pts.push([28,la]);pts.push([136,la])}
 var mp={type:'MultiPoint',coordinates:pts};proj.fitWidth(w-12,mp);var bb=d3.geoPath(proj).bounds(mp),hh=Math.ceil(bb[1][1]-bb[0][1])+12;proj.translate([proj.translate()[0]-bb[0][0]+6,proj.translate()[1]-bb[0][1]+6]);var h=h0||hh;svg.attr('height',h);
 var base={k:proj.scale(),t:proj.translate()};
 var pb=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]).scale(base.k).translate(base.t);
 function view(ll,k){var p=pb(ll);return d3.zoomIdentity.translate(w/2-k*p[0],h/2-k*p[1]).scale(k)}
 VIEWS={all:d3.zoomIdentity,ru:view([45,50.5],ph()?3.4:2.6),kr:view([129,41.5],ph()?5:3.4)};
 T0=ph()?VIEWS.ru:VIEWS.all;
 if(!cur||cur.w!==w)cur={w:w,t:T0};
 var gl=svg.append('g'),gr=svg.append('g'),gp=svg.append('g');
 var cn=gl.selectAll('path.cn').data(NB.features).enter().append('path').attr('class','cn');
 var rg=gl.selectAll('path.rg').data(G.features).enter().append('path').attr('class','rg');
 var lines=gr.selectAll('g.ml').data(N.lines).enter().append('g').attr('class','ml').attr('tabindex',0);
 lines.append('path').attr('class','mlp');lines.append('polygon').attr('class','mlh');
 var rowBy={};N.rows.forEach(function(r){rowBy[r.id]=r});
 var pl=Object.keys(N.places).map(function(k){var p=N.places[k];p.id=k;return p});
 var dots=gp.selectAll('circle').data(pl).enter().append('circle').attr('class','dot0').attr('r',5).attr('data-tip',function(p){return '<b>'+esc(p.name)+'</b><br>Named in '+esc(SRC[p.src]||p.src)});
 var LAB={pyongyang:[0,-12,'middle'],kursk:[-8,-12,'end'],alabuga:[0,18,'middle'],tikhoretsk:[8,20,'start'],rajin:[8,24,'start']};
 var labs=gp.selectAll('text').data(pl.filter(function(p){return LAB[p.id]})).enter().append('text').attr('class','dlab').text(function(p){return p.id==='rajin'?'Rajin and Dunai ports':p.name});
 function render(t){
  proj.scale(base.k*t.k).translate([t.x+base.t[0]*t.k,t.y+base.t[1]*t.k]);var P=d3.geoPath(proj);cn.attr('d',P);rg.attr('d',P);
  dots.attr('cx',function(p){return proj(p.ll)[0]}).attr('cy',function(p){return proj(p.ll)[1]}).style('display',function(p){return p.id==='dunai'?'none':null});
  labs.attr('x',function(p){return proj(p.ll)[0]+LAB[p.id][0]}).attr('y',function(p){return proj(p.ll)[1]+LAB[p.id][1]}).attr('text-anchor',function(p){return LAB[p.id][2]});
  var bend={m_troops:-0.16,m_builders:-0.07,m_workers:0.14,m_sea:0.0,m_rail:0.12,m_missile:0.07};
  lines.each(function(l,i){var A=proj(N.places[l.frm].ll),B0=proj(N.places[l.to].ll),r=rowBy[l.row],col=N.kinds[l.kind].color;
   var dx=B0[0]-A[0],dy=B0[1]-A[1],d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,hl=l.id==='m_sea'?8:14,hw=l.id==='m_sea'?5.5:8;
   var B=[B0[0]-ux*Math.min(hl,d*0.4),B0[1]-uy*Math.min(hl,d*0.4)];
   var nx=-uy,ny=ux,b=(bend[l.id]||0)*d,C=[(A[0]+B[0])/2+nx*b,(A[1]+B[1])/2+ny*b];
   var ex=B0[0]-C[0],ey=B0[1]-C[1],el2=Math.hypot(ex,ey)||1;ex/=el2;ey/=el2;
   var g=d3.select(this).attr('data-tip','<b>'+esc(l.label)+'</b><br><span class="tgs">'+r.status+'</span> '+esc(r.more)+'<br>Source: '+esc(r.ev.map(function(e){return SRC[e.src]||e.src}).filter(function(v,i,a){return a.indexOf(v)===i}).join('; '))).attr('aria-label',l.label+', '+r.status);
   var bx=B0[0]-ex*hl,by=B0[1]-ey*hl;
   g.select('path').attr('d','M'+A+'Q'+C+' '+[bx,by]).attr('stroke',col).attr('stroke-width',l.id==='m_sea'?4:5).attr('stroke-dasharray',DASH[r.status]).attr('stroke-linecap',r.status==='documented'?'butt':'round');
   g.select('polygon').attr('points',[B0,[bx-ey*hw,by+ex*hw],[bx+ey*hw,by-ex*hw]].join(' ')).attr('fill',col)});
 }
 zm=d3.zoom().scaleExtent([1,12]).filter(function(e){if(e.type==='wheel')return e.ctrlKey;if(e.touches)return e.touches.length>1;return !e.button}).on('zoom',function(e){cur.t=e.transform;render(e.transform)});
 svg.call(zm).on('dblclick.zoom',null);svg.call(zm.transform,cur.t);el.setAttribute('data-ready','1');
}
function key(){
 var h='<h3 class="sideh">Colour: what moves</h3><ul class="legend">';
 Object.keys(N.kinds).forEach(function(k){h+='<li><span class="sw" style="background:'+N.kinds[k].color+'"></span>'+esc(N.kinds[k].name)+'</li>'});
 h+='</ul><h3 class="sideh">Line: how firm</h3><ul class="legend">';
 [['documented','Documented',null],['reported','Reported','16 7'],['contested','Contested','2 8']].forEach(function(x){
  h+='<li data-tip="'+esc(N.status[x[0]])+'" tabindex="0"><svg width="46" height="12" aria-hidden="true"><line x1="2" x2="44" y1="6" y2="6" stroke="#e6e9ef" stroke-width="5" '+(x[2]?'stroke-linecap="round" stroke-dasharray="'+x[2]+'"':'')+'/></svg>'+x[1]+'</li>'});
 h+='</ul><p class="note">Hover a line for its source. Documented: records, imagery or both governments confirm it. Reported: one credible outlet or agency. Contested: sources disagree, or only one side of the war claims it.</p>';
 h+='<div class="seg"><button type="button" class="chipb" id="nz-in">Zoom in</button><button type="button" class="chipb" id="nz-out">Zoom out</button><button type="button" class="chipb" id="nz-ru">Russian end</button><button type="button" class="chipb" id="nz-kr">Korean end</button><button type="button" class="chipb" id="nz-reset">Reset view</button></div>';
 $('#nkkey').innerHTML=h;
 var z=function(f){return function(){svgM.transition().duration(250).call(zm.scaleBy,f)}};
 $('#nz-in').addEventListener('click',z(1.7));$('#nz-out').addEventListener('click',z(1/1.7));
 var go=function(v){return function(){cur.t=VIEWS[v];svgM.transition().duration(300).call(zm.transform,VIEWS[v])}};
 $('#nz-ru').addEventListener('click',go('ru'));$('#nz-kr').addEventListener('click',go('kr'));$('#nz-reset').addEventListener('click',go('all'));
}
function all(){rel();mapDraw()}
Promise.all(['data/nk.json','vendor/ru_admin1.geojson','vendor/ne_neighbours.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(function(res){
 N=res[0];G=res[1];NB=res[2];key();all();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)all()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(all,150)});
}).catch(function(e){console.error(e)});
})();
