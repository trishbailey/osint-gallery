/* Flow map: where the named dead came from. Width = named dead (Mediazona/BBC list). Strands are smooth curves, 4 to 10 px wide. */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
var fmt=function(n){return Number(n).toLocaleString('en-US')};
var ph=function(){return window.matchMedia('(max-width:700px)').matches};
var F,R,G,byNe={},feat={},on={vol:true,mob:true,pri:true,'for':true},T0=null,svg,zoomB,cur,HI=null,VMAX=0;
var ORDER=['vol','mob','pri'],TXT={vol:'volunteers and contract soldiers',mob:'mobilised men',pri:'prisoners (incl. Wagner and Storm-Z)'};
var wOf=function(v){return 4+6*v/VMAX};
var pathGeo,LO={'South':[-8,20,'end'],'North Caucasus':[10,22,'start'],'Volga':[8,20,'start'],'Urals':[8,20,'start']};

function strands(){
 var out=[];
 F.districts.forEach(function(d){
  var a=feat[d.anchor];if(!a)return;var c=d3.geoCentroid(a);
  ORDER.forEach(function(k,i){if(d[k]>0&&on[k])out.push({id:d.fd+'-'+k,kind:k,fd:d.fd,v:d[k],ll:c,idx:i,
   tip:'<b>'+esc(d.fd)+' district: '+TXT[k]+'</b><br>'+fmt(d[k])+' named dead (width shows this count)<br>Drawn from '+esc(d.anchor_en)+', the district\u2019s largest source ('+fmt(d.anchor_deaths)+' named dead of '+fmt(d.regions)+' regions\u2019 total)<br>Mediazona regional pages, '+F.date})})});
 if(on['for'])F.foreign.forEach(function(c){out.push({id:c.id,kind:'for',fd:null,v:c.n,ll:c.ll,idx:1,
   tip:'<b>'+esc(c.name)+': foreign nationals killed</b><br>'+fmt(c.n)+' named dead (width shows this count)<br>BBC News Russian with Mediazona, '+F.foreign_date+(c.note?'<br>'+esc(c.note):'')})});
 return out}

function draw(){
 var el=$('#flowmap');if(!el)return;var w=el.clientWidth;if(!w)return;var h=ph()?460:520;
 el.innerHTML='';
 svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img')
  .attr('aria-label','Map of Russia and neighbouring countries with curved arrows from Russian regions and other countries to the front in Ukraine. Arrow width shows named dead; colour shows how the men joined.');
 var proj=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]);
 var pts=[];for(var lo=20;lo<=135;lo+=5){pts.push([lo,35.5]);pts.push([lo,67.5])}for(var la=35.5;la<=67.5;la+=4){pts.push([20,la]);pts.push([135,la])}
 proj.fitExtent([[6,6],[w-6,h-6]],{type:'MultiPoint',coordinates:pts});
 var base={k:proj.scale(),t:proj.translate()};
 var fp=proj([F.front.ll[0],F.front.ll[1]]);
 var k0=ph()?1.9:1;
 if(!cur||cur.w!==w)cur={w:w,t:ph()?d3.zoomIdentity.translate(Math.min(150,w*0.4)-k0*fp[0],h*0.5-k0*fp[1]).scale(k0):d3.zoomIdentity};
 T0=ph()?d3.zoomIdentity.translate(Math.min(150,w*0.4)-k0*fp[0],h*0.5-k0*fp[1]).scale(k0):d3.zoomIdentity;
 var gLand=svg.append('g'),gF=svg.append('g'),gL=svg.append('g');
 var cn=gLand.append('g').selectAll('path').data(F._nb.features).enter().append('path').attr('class','cn');
 var rg=gLand.append('g').selectAll('path').data(G.features).enter().append('path').attr('class','rg')
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?'<b>'+esc(r.en)+'</b> ('+esc(r.fd)+' district)<br>'+fmt(r.deaths)+' named dead: '+fmt(r.vol)+' volunteers, '+fmt(r.mob)+' mobilised, '+fmt(r.pri)+' prisoners<br>Mediazona regional pages, '+F.date:''});
 var cnl=gL.append('g').selectAll('text').data(F._nb.features.filter(function(f){return{'Kazakhstan':1,'Ukraine':1,'China':1,'Mongolia':1,'Belarus':1}[f.properties.name]})).enter().append('text').attr('class','cname').text(function(f){return f.properties.name});
 var front=gL.append('g');var S=strands();VMAX=Math.max(1,d3.max(F.districts,function(d){return d3.max(ORDER,function(k){return d[k]})}),d3.max(F.foreign,function(c){return c.n}));
 var strandG=gF.append('g'),dotG=gL.append('g'),lblG=gL.append('g');
 function render(t){
  proj.scale(base.k*t.k).translate([t.x+base.t[0]*t.k,t.y+base.t[1]*t.k]);
  pathGeo=d3.geoPath(proj);cn.attr('d',pathGeo);rg.attr('d',pathGeo);
  cnl.attr('transform',function(f){var c=pathGeo.centroid(f);return 'translate('+c[0]+','+c[1]+')'}).attr('text-anchor','middle');
  var fpt=proj(F.front.ll),nn=proj([F.front.ll[0],F.front.ll[1]+1]),ux=0,uy=-1;var ex=1,ey=0;
  S.forEach(function(s){var p=proj(s.ll),rx=p[0]-fpt[0],ry=p[1]-fpt[1];s.p=p;s.w=wOf(s.v);var de=rx*ex+ry*ey,dn=rx*ux+ry*uy;s.sd=de<4?-1:1;s.ang=Math.atan2(-dn,de)});
  S.sort(function(a,b){return a.ang-b.ang||a.idx-b.idx});
  var tot=0;S.forEach(function(s){s.sp=s.w*1.2+4.5;tot+=s.sp});var pos=tot/2;
  S.forEach(function(s){s.lp=[fpt[0]+ux*(pos-s.sp/2),fpt[1]+uy*(pos-s.sp/2)];pos-=s.sp});
  var sel=strandG.selectAll('g.st').data(S,function(s){return s.id});sel.exit().remove();
  var en=sel.enter().append('g').attr('class','st').attr('tabindex',0);en.append('path').attr('class','stp');en.append('polygon').attr('class','sth');
  var all=strandG.selectAll('g.st').data(S,function(s){return s.id});
  all.attr('data-tip',function(s){return s.tip}).attr('aria-label',function(s){return s.tip.replace(/<[^>]+>/g,' ')}).classed('dim',function(s){return !!HI&&s.fd!==HI});
  all.each(function(s){
   var sd=s.sd,hl=Math.max(11,s.w*1.5),hw=s.w*0.62+2.2,L=[s.lp[0]+sd*ex*7,s.lp[1]+sd*ey*7],B=[L[0]+sd*ex*hl,L[1]+sd*ey*hl],A=s.p.slice(),dx=B[0]-A[0],dy=B[1]-A[1],dist=Math.hypot(dx,dy);
   var d2=Math.min(0.5*dist,170),P2=[B[0]+sd*ex*d2,B[1]+sd*ey*d2];
   var nx=-dy/dist,ny=dx/dist,off=(s.idx-1)*(s.w*0.5+1);A=[A[0]+nx*off,A[1]+ny*off];
   var P1=[A[0]+(P2[0]-A[0])*0.38,A[1]+(P2[1]-A[1])*0.38];
   var col=F.types[s.kind].color,g=d3.select(this);
   g.select('path').attr('d','M'+A+'C'+P1+' '+P2+' '+B).attr('stroke',col).attr('stroke-width',s.w);
   g.select('polygon').attr('points',[L,[B[0]+ux*hw,B[1]+uy*hw],[B[0]-ux*hw,B[1]-uy*hw]].join(' ')).attr('fill',col);
  });
  front.selectAll('*').remove();
  var T=[fpt[0]+ux*(tot/2+5),fpt[1]+uy*(tot/2+5)],Bo=[fpt[0]-ux*(tot/2+5),fpt[1]-uy*(tot/2+5)];
  front.append('path').attr('class','bracket').attr('d','M'+[T[0]-ex*5,T[1]-ey*5]+'L'+T+'L'+Bo+'L'+[Bo[0]-ex*5,Bo[1]-ey*5]);
  front.append('text').attr('class','flab').attr('x',T[0]-12).attr('y',T[1]-6).attr('text-anchor','end').text(ph()?'Front (schematic)':'Front in Ukraine (schematic)');
  var dd=dotG.selectAll('circle').data(F.districts.filter(function(d){return feat[d.anchor]}),function(d){return d.fd});dd.exit().remove();
  dd.enter().append('circle').attr('r',5).attr('class','dot0');
  dotG.selectAll('circle').attr('cx',function(d){return proj(d3.geoCentroid(feat[d.anchor]))[0]}).attr('cy',function(d){return proj(d3.geoCentroid(feat[d.anchor]))[1]})
   .attr('data-tip',function(d){return '<b>'+esc(d.fd)+' district</b><br>Strands start in '+esc(d.anchor_en)+', the district\u2019s largest source of named dead; the whole district is counted: '+fmt(d.vol)+' volunteers, '+fmt(d.mob)+' mobilised, '+fmt(d.pri)+' prisoners'})
   .on('mouseenter',function(e,d){HI=d.fd;rg.classed('hl',function(f){var r=byNe[f.properties.name];return r&&r.fd===HI});strandG.selectAll('g.st').classed('dim',function(s){return s.fd!==HI})})
   .on('mouseleave',function(){HI=null;rg.classed('hl',false);strandG.selectAll('g.st').classed('dim',false)});
  var ld=lblG.selectAll('text').data(F.districts.filter(function(d){return feat[d.anchor]}),function(d){return d.fd});ld.exit().remove();ld.enter().append('text').attr('class','dlab');
  lblG.selectAll('text').attr('x',function(d){return proj(d3.geoCentroid(feat[d.anchor]))[0]+(LO[d.fd]||[8,-9])[0]}).attr('y',function(d){return proj(d3.geoCentroid(feat[d.anchor]))[1]+(LO[d.fd]||[8,-9])[1]}).attr('text-anchor',function(d){return (LO[d.fd]||[8,-9,'start'])[2]||'start'}).text(function(d){return d.fd});
  var fc=gL.selectAll('text.cn2').data(F.foreign,function(c){return c.id});fc.exit().remove();fc.enter().append('text').attr('class','dlab cn2');
  gL.selectAll('text.cn2').attr('x',function(c){return proj(c.ll)[0]}).attr('y',function(c){return proj(c.ll)[1]+(c.id==='PRK'?-10:c.id==='UZB'?-9:c.id==='TJK'?18:c.id==='GEO'?4:16)}).attr('x',function(c){return proj(c.ll)[0]+(c.id==='GEO'?-9:c.id==='AZE'?8:0)}).attr('text-anchor',function(c){return c.id==='GEO'?'end':c.id==='AZE'?'start':'middle'}).text(function(c){return c.name}).style('display',function(c){return on['for']?null:'none'});
  var fdot=gL.selectAll('circle.fd').data(F.foreign,function(c){return c.id});fdot.exit().remove();fdot.enter().append('circle').attr('class','dot0 fd').attr('r',5);
  gL.selectAll('circle.fd').attr('cx',function(c){return proj(c.ll)[0]}).attr('cy',function(c){return proj(c.ll)[1]}).style('display',function(){return on['for']?null:'none'});
 }
 zoomB=d3.zoom().scaleExtent([1,8]).filter(function(e){if(e.type==='wheel')return e.ctrlKey;if(e.touches)return e.touches.length>1;return !e.button})
  .on('zoom',function(e){cur.t=e.transform;render(e.transform)});
 svg.call(zoomB).on('dblclick.zoom',null);
 svg.call(zoomB.transform,cur.t);
 el.setAttribute('data-ready','1');
}
function pick(k){on[k]=!on[k];var b=document.querySelector('.fchip[data-k="'+k+'"]');b.setAttribute('aria-pressed',on[k]?'true':'false');draw()}
function legend(){
 var tot={vol:0,mob:0,pri:0,'for':0};F.districts.forEach(function(d){ORDER.forEach(function(k){tot[k]+=d[k]})});F.foreign.forEach(function(c){tot['for']+=c.n});
 var h='<h3 class="sideh">Colour: how they joined</h3><div class="seg">';
 ['vol','mob','pri','for'].forEach(function(k){h+='<button type="button" class="chipb fchip" data-k="'+k+'" aria-pressed="true"><span class="sw" style="background:'+F.types[k].color+'"></span><span class="fl">'+esc(F.types[k].name)+'<small>'+fmt(tot[k])+' named dead shown</small></span></button>'});
 h+='</div><h3 class="sideh">Width: named dead</h3><ul class="legend">';
 [[548,'smallest district strand'],[13000,'about 13,000'],[27370,'largest, Volga volunteers']].forEach(function(x){var v=x[0];h+='<li><svg width="46" height="12" aria-hidden="true"><line x1="2" x2="44" y1="6" y2="6" stroke="#e6e9ef" stroke-width="'+(4+6*v/27370).toFixed(1)+'" stroke-linecap="butt"/></svg>'+fmt(v)+'</li>'});
 h+='</ul><p class="note">Width grows from 4 px with the count (10 px at 27,370). Counts are people on the named list, not all who served.</p>';
 h+='<div class="seg"><button type="button" class="chipb" id="fz-in">Zoom in</button><button type="button" class="chipb" id="fz-out">Zoom out</button><button type="button" class="chipb" id="fz-reset">Reset view</button></div>';
 $('#flowkey').innerHTML=h;
 document.querySelectorAll('.fchip').forEach(function(b){b.addEventListener('click',function(){pick(b.dataset.k)})});
 var z=function(f){return function(){svg.transition().duration(250).call(zoomB.scaleBy,f)}};
 $('#fz-in').addEventListener('click',z(1.6));$('#fz-out').addEventListener('click',z(1/1.6));
 $('#fz-reset').addEventListener('click',function(){cur.t=T0;svg.transition().duration(300).call(zoomB.transform,T0)});
}
function init(res){
 R=res[0].regions;G=res[1];F=res[2];F._nb=res[3];
 R.forEach(function(r){byNe[r.ne]=r});G.features.forEach(function(f){feat[f.properties.name]=f});
 legend();draw();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)draw()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(draw,150)});
}
Promise.all(['data/regions.json','vendor/ru_admin1.geojson','data/flows.json','vendor/ne_neighbours.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(init)
 .catch(function(e){console.error(e);var el=$('#flowmap');if(el)el.innerHTML='<p class="notice">The flow map failed to load.</p>'});
})();
