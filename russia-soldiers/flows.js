/* Flow map: where the soldiers came from. Width = people recruited (LINEAR scale: 56 px at the largest high figure, 34 px on phones, never under 3 px); a pale band shows the range up to the higher published figure. Named dead is a secondary measure (hover and the bars below). */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
var fmt=function(n){return Number(n).toLocaleString('en-US')};
var ph=function(){return window.matchMedia('(max-width:700px)').matches};
var F,R,G,byNe={},feat={},on={vol:true,mob:true,pri:true,'for':true},T0=null,svg,zoomB,cur,VMAX=1;
var IDX={vol:0,mob:1,pri:2,ca:1,prk:1},LBL={vol:'Contract and volunteers',mob:'Mobilised',pri:'Prisoners','for':'Foreign nationals',ca:'Central Asia',prk:'North Korea'};
var wOf=function(v){return Math.max(F.wmin,(ph()?F.wmax_ph:F.wmax)*v/VMAX)};
var pathGeo;

function strands(){return F.arrows.filter(function(a){return on[a.kind]}).map(function(a){return {id:a.id,kind:a.kind,ll:a.ll,hub:a.hub,idx:IDX[a.id],lo:a.low,hi:a.high,label:a.label,tip:a.tip,name:a.name}})}

function draw(){
 var el=$('#flowmap');if(!el)return;var w=el.clientWidth;if(!w)return;var h=ph()?460:520;
 el.innerHTML='';
 svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img')
  .attr('aria-label','Map of Russia and neighbouring countries with curved arrows from Russia, Central Asia and North Korea to the front in Ukraine. Arrow width shows the number of people recruited; colour shows how they joined.');
 var proj=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]);
 var pts=[];for(var lo=20;lo<=135;lo+=5){pts.push([lo,35.5]);pts.push([lo,67.5])}for(var la=35.5;la<=67.5;la+=4){pts.push([20,la]);pts.push([135,la])}
 proj.fitExtent([[6,6],[w-6,h-6]],{type:'MultiPoint',coordinates:pts});
 var base={k:proj.scale(),t:proj.translate()};
 var fp=proj([F.front.ll[0],F.front.ll[1]]);
 var k0=ph()?1.6:1;
 if(!cur||cur.w!==w)cur={w:w,t:ph()?d3.zoomIdentity.translate(Math.min(142,w*0.37)-k0*fp[0],h*0.5-k0*fp[1]).scale(k0):d3.zoomIdentity};
 T0=ph()?d3.zoomIdentity.translate(Math.min(142,w*0.37)-k0*fp[0],h*0.5-k0*fp[1]).scale(k0):d3.zoomIdentity;
 var gLand=svg.append('g'),gF=svg.append('g'),gL=svg.append('g');
 var cn=gLand.append('g').selectAll('path').data(F._nb.features).enter().append('path').attr('class','cn');
 var rg=gLand.append('g').selectAll('path').data(G.features).enter().append('path').attr('class','rg')
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?'<b>'+esc(r.en)+'</b> ('+esc(r.fd)+' district)<br>'+fmt(r.deaths)+' named dead (secondary measure): '+fmt(r.vol)+' volunteers, '+fmt(r.mob)+' mobilised, '+fmt(r.pri)+' prisoners<br>No recruitment count is published for this region<br>Mediazona regional pages, '+F.named_dead_date:''});
 var cnl=gL.append('g').selectAll('text').data(F._nb.features.filter(function(f){return{'Kazakhstan':1,'China':1,'Mongolia':1,'Belarus':1}[f.properties.name]})).enter().append('text').attr('class','cname').text(function(f){return f.properties.name});
 var front=gL.append('g');VMAX=F.vmax;var S=strands();
 var strandG=gF.append('g'),dotG=gL.append('g'),lblG=gL.append('g');
 var hubLL=F.hub.ll;
 function render(t){
  proj.scale(base.k*t.k).translate([t.x+base.t[0]*t.k,t.y+base.t[1]*t.k]);
  pathGeo=d3.geoPath(proj);cn.attr('d',pathGeo);rg.attr('d',pathGeo);
  cnl.attr('transform',function(f){var c=pathGeo.centroid(f);return 'translate('+c[0]+','+c[1]+')'}).attr('text-anchor','middle');
  var fpt=proj(F.front.ll),ux=0,uy=-1,ex=1,ey=0;
  S.forEach(function(s){var p=proj(s.ll),rx=p[0]-fpt[0],ry=p[1]-fpt[1];s.p=p;s.w=wOf(s.lo);s.wh=wOf(s.hi);var de=rx*ex+ry*ey,dn=rx*ux+ry*uy;s.sd=de<4?-1:1;s.ang=Math.atan2(-dn,de)});
  S.sort(function(a,b){return a.ang-b.ang||a.idx-b.idx});
  var hs=S.filter(function(s){return s.hub}).sort(function(a,b){return a.idx-b.idx}),ht=0;hs.forEach(function(s){ht+=s.wh+6});var hp0=ht/2;hs.forEach(function(s){s.off=hp0-(s.wh+6)/2;hp0-=s.wh+6});
  var tot=0;S.forEach(function(s){s.sp=s.wh*1.2+4.5;tot+=s.sp});var pos=tot/2;
  S.forEach(function(s){s.lp=[fpt[0]+ux*(pos-s.sp/2),fpt[1]+uy*(pos-s.sp/2)];pos-=s.sp});
  var sel=strandG.selectAll('g.st').data(S,function(s){return s.id});sel.exit().remove();
  var en=sel.enter().append('g').attr('class','st').attr('tabindex',0);en.append('path').attr('class','stg');en.append('path').attr('class','stp');en.append('polygon').attr('class','sth');
  var all=strandG.selectAll('g.st').data(S,function(s){return s.id});
  all.attr('data-tip',function(s){return s.tip}).attr('aria-label',function(s){return s.tip.replace(/<br>/g,'. ').replace(/<[^>]+>/g,'')});
  all.each(function(s){
   var sd=s.sd,hl=Math.max(11,Math.min(s.wh*0.8,ph()?22:34)),hw=s.wh*0.62+2.2,L=[s.lp[0]+sd*ex*7,s.lp[1]+sd*ey*7],B=[L[0]+sd*ex*hl,L[1]+sd*ey*hl],A=s.p.slice(),dx=B[0]-A[0],dy=B[1]-A[1],dist=Math.hypot(dx,dy);
   var d2=Math.min(0.5*dist,170),P2=[B[0]+sd*ex*d2,B[1]+sd*ey*d2];
   var nx=-dy/dist,ny=dx/dist,off=s.hub?s.off:0;A=[A[0]+nx*off,A[1]+ny*off];s.A=A;
   var P1=[A[0]+(P2[0]-A[0])*0.38,A[1]+(P2[1]-A[1])*0.38];
   var col=F.types[s.kind].color,g=d3.select(this),dd='M'+A+'C'+P1+' '+P2+' '+B;
   g.select('path.stp').attr('d',dd).attr('stroke',col).attr('stroke-width',s.w);
   g.select('path.stg').attr('d',dd).attr('stroke',col).attr('stroke-width',s.wh).style('display',s.hi>s.lo?null:'none');
   g.select('polygon').attr('points',[L,[B[0]+ux*hw,B[1]+uy*hw],[B[0]-ux*hw,B[1]-uy*hw]].join(' ')).attr('fill',col);
  });
  front.selectAll('*').remove();
  var T=[fpt[0]+ux*(tot/2+5),fpt[1]+uy*(tot/2+5)],Bo=[fpt[0]-ux*(tot/2+5),fpt[1]-uy*(tot/2+5)];
  front.append('path').attr('class','bracket').attr('d','M'+[T[0]-ex*5,T[1]-ey*5]+'L'+T+'L'+Bo+'L'+[Bo[0]-ex*5,Bo[1]-ey*5]);
  front.append('text').attr('class','flab').attr('x',T[0]-12).attr('y',T[1]-6).attr('text-anchor','end').text(ph()?'Front':'Front in Ukraine (schematic)');
  var hb=S.filter(function(s){return s.hub}).map(function(s){return s.A}).sort(function(p,q){return p[1]-q[1]});
  if(hb.length>1)front.append('path').attr('class','bracket hubbar').attr('d','M'+hb.map(function(p){return p.join(',')}).join('L'));
  /* origin markers: one hub for the three Russian arrows, one dot per foreign arrow; each carries the arrow's tooltip */
  var orig=[],hubTip=F.arrows.filter(function(a){return a.hub}).map(function(a){return a.tip}).join('<hr>');
  if(S.some(function(s){return s.hub}))orig.push({id:'hub',ll:hubLL,tip:'<b>'+esc(F.hub.name)+'</b><br>The three Russian arrows start here. Recruitment totals are national: no outlet publishes them by region, so no region is singled out.'});
  S.filter(function(s){return !s.hub}).forEach(function(s){orig.push({id:s.id,ll:s.ll,tip:s.tip})});
  var od=dotG.selectAll('circle').data(orig,function(o){return o.id});od.exit().remove();od.enter().append('circle').attr('r',5).attr('class','dot0');
  dotG.selectAll('circle').attr('cx',function(o){return proj(o.ll)[0]}).attr('cy',function(o){return proj(o.ll)[1]}).attr('data-tip',function(o){return o.tip});
  lblG.selectAll('*').remove();
  var hp=proj(hubLL);
  if(S.some(function(s){return s.hub}))lblG.append('text').attr('class','dlab').attr('x',hp[0]-4).attr('y',Math.min.apply(null,S.filter(function(s){return s.hub}).map(function(s){return s.A[1]-s.wh/2}))-10).attr('text-anchor','start').text(ph()?'Russia':'Russia, all regions');
  S.forEach(function(s){
   var t=lblG.append('text').attr('class','dlab vlab').text((ph()?'':LBL[s.id]+' ')+s.label);
   if(s.hub){t.attr('x',s.A[0]+(ph()?9:12)).attr('y',s.A[1]+5).attr('text-anchor','start')}
   else{t.attr('x',s.p[0]).attr('y',s.p[1]+(s.id==='prk'?-12:20)).attr('text-anchor','middle')}
  });
 }
 zoomB=d3.zoom().scaleExtent([1,8]).translateExtent([[0,0],[w,h]]).filter(function(e){if(e.type==='wheel')return e.ctrlKey;if(e.touches)return e.touches.length>1;return !e.button})
  .on('zoom',function(e){cur.t=e.transform;render(e.transform)});
 svg.call(zoomB).on('dblclick.zoom',null);
 svg.call(zoomB.transform,cur.t);
 svg.node().addEventListener('zoomreset',function(){cur.t=T0;svg.call(zoomB.transform,T0)});/* used by the page checks to look at the whole map */
 el.setAttribute('data-ready','1');
}
function pick(k){on[k]=!on[k];var b=document.querySelector('.fchip[data-k="'+k+'"]');b.setAttribute('aria-pressed',on[k]?'true':'false');draw()}
function legend(){
 var by={};F.arrows.forEach(function(a){by[a.id]=a});
 var sub={vol:fmt(by.vol.low)+' to '+fmt(by.vol.high),mob:fmt(by.mob.low)+' to '+fmt(by.mob.high),pri:fmt(by.pri.low)+' to '+fmt(by.pri.high),'for':'North Korea '+fmt(by.prk.low)+' to '+fmt(by.prk.high)+'; Central Asia '+fmt(by.ca.low)};
 var h='<div class="fk-col"><h3 class="sideh">Colour: how they joined</h3><div class="seg">';
 ['vol','mob','pri','for'].forEach(function(k){h+='<button type="button" class="chipb fchip" data-k="'+k+'" aria-pressed="true"><span class="sw" style="background:'+F.types[k].color+'"></span><span class="fl">'+esc(F.types[k].name)+'<small>'+sub[k]+' recruited</small></span></button>'});
 h+='</div></div>';
 $('#flowkey').innerHTML=h;
 document.querySelectorAll('.fchip').forEach(function(b){b.addEventListener('click',function(){pick(b.dataset.k)})});
}

/* Recruits per year as a STREAMGRAPH, same recipe as the first chart on the China diplomats page: d3.stack with the wiggle offset and inside-out
   order, basis curve, 0.9 fill, dark outline, a bottom year axis and no y axis. Because a streamgraph has no y axis, each chart draws a scale bar
   (LINEAR, from zero) and a strip under it that prints every yearly value. A year with no source is a gap: the layer has zero height, the strip cell is
   hatched "no data", and the hover says why. Nothing is interpolated or carried over. The main chart is true to scale; the companion chart shows
   only the three small groups on its own, finer scale. */
function shortN(v){return v>=1e5?Math.round(v/1000)+'k':v>=1e4?(Math.round(v/100)/10).toString().replace(/\.0$/,'')+'k':fmt(v)}
function series(){stream('#streamMain','main');stream('#streamNiche','niche')}
function stream(sel,which){
 var el=$(sel);if(!el||!F.stream)return;var S=F.stream,w=el.clientWidth;if(!w)return;
 var L=S.layers.filter(function(l){return which==='main'||l.niche}),n=S.years.length,N=w<520,lw=N?90:130,rr=8,top=8,axh=26,rowh=N?38:32;
 var plotH=which==='main'?(N?210:290):(N?170:210),H=top+plotH+axh+L.length*rowh+4,cw=(w-lw-rr)/n;
 var cx=function(i){return lw+cw*(i+.5)};
 var rows=S.years.map(function(y,i){var o={i:i};L.forEach(function(l){o[l.id]=l.vals[i]==null?0:l.vals[i]});return o});
 var stk=d3.stack().keys(L.map(function(l){return l.id})).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(rows);
 var lo=d3.min(stk,function(s){return d3.min(s,function(d){return d[0]})}),hi=d3.max(stk,function(s){return d3.max(s,function(d){return d[1]})});
 var y=d3.scaleLinear().domain([lo,hi]).range([top+plotH,top]),x=d3.scaleLinear().domain([0,n-1]).range([cx(0),cx(n-1)]);
 var col={};L.forEach(function(l){col[l.id]=l.color});
 el.innerHTML='';var leg=document.createElement('ul');leg.className='tslegend';
 if(which==='main'){L.forEach(function(l){var li=document.createElement('li');li.innerHTML='<svg width="14" height="14" aria-hidden="true"><rect width="14" height="14" rx="3" fill="'+l.color+'"/></svg>'+esc(l.name);leg.appendChild(li)});
  var g=document.createElement('li');g.innerHTML='<svg width="14" height="14" aria-hidden="true"><rect x=".5" y=".5" width="13" height="13" rx="3" fill="url(#hatch'+which+')" stroke="#8fa0bf" stroke-dasharray="3 2"/></svg>no data: nothing is drawn';leg.appendChild(g);
  var a=document.createElement('li');a.innerHTML='<b>~</b> an allocation of one total across two years';leg.appendChild(a);el.appendChild(leg)}
 var svg=d3.select(el).append('svg').attr('viewBox','0 0 '+w+' '+H).attr('width','100%').attr('role','img')
  .attr('aria-label',(which==='main'?'Streamgraph of recruits per year by type, true scale. ':'Streamgraph of the three smaller groups per year, on a finer scale. ')+'Hover or tap a year for exact values.');
 svg.append('defs').append('pattern').attr('id','hatch'+which).attr('width',6).attr('height',6).attr('patternUnits','userSpaceOnUse').attr('patternTransform','rotate(45)')
  .append('line').attr('x1',0).attr('y1',0).attr('x2',0).attr('y2',6).attr('stroke','#8fa0bf').attr('stroke-width',2).attr('opacity',.55);
 var area=d3.area().curve(d3.curveBasis).x(function(d,i){return x(i)}).y0(function(d){return y(d[0])}).y1(function(d){return y(d[1])});
 svg.append('g').selectAll('path').data(stk).enter().append('path').attr('class','stl').attr('d',area).attr('fill',function(s){return col[s.key]}).attr('fill-opacity',.9).attr('stroke','#0b1526').attr('stroke-width',.6);
 var bar=which==='main'?S.main_bar:S.niche_bar,bl=bar*plotH/(hi-lo),g=svg.append('g').attr('class','sbar');
 g.append('line').attr('x1',8).attr('x2',8).attr('y1',top).attr('y2',top+bl).attr('stroke','#e9eef7').attr('stroke-width',2);
 g.append('line').attr('x1',4).attr('x2',12).attr('y1',top).attr('y2',top).attr('stroke','#e9eef7').attr('stroke-width',2);g.append('line').attr('x1',4).attr('x2',12).attr('y1',top+bl).attr('y2',top+bl).attr('stroke','#e9eef7').attr('stroke-width',2);
 g.append('text').attr('x',17).attr('y',top+Math.max(14,bl/2-2)).text(fmt(bar));g.append('text').attr('x',17).attr('y',top+Math.max(14,bl/2-2)+15).attr('class','muted').text('people');
 var ay=top+plotH+axh-9;svg.append('g').selectAll('text').data(S.years).enter().append('text').attr('x',function(d,i){return cx(i)}).attr('y',ay).attr('text-anchor','middle').attr('class','tick').text(function(d){return d});
 svg.append('line').attr('x1',lw).attr('x2',w-rr).attr('y1',top+plotH+4).attr('y2',top+plotH+4).attr('stroke','#2a3b5e');
 var sy=top+plotH+axh;
 L.forEach(function(l,r){var yy=sy+r*rowh;
  svg.append('rect').attr('x',2).attr('y',yy+9).attr('width',12).attr('height',12).attr('rx',3).attr('fill',l.color);
  svg.append('text').attr('x',20).attr('y',yy+20).attr('class','tslab').text(l.short);
  S.years.forEach(function(yr,i){var v=l.vals[i],gx=lw+cw*i+2,gw=cw-4;
   if(v==null){svg.append('rect').attr('x',gx).attr('y',yy+3).attr('width',gw).attr('height',rowh-6).attr('rx',4).attr('fill','url(#hatch'+which+')').attr('stroke','#8fa0bf').attr('stroke-dasharray','3 2');
    var nt=svg.append('text').attr('x',gx+gw/2).attr('text-anchor','middle').attr('class','muted nod');
    if(N){nt.attr('y',yy+rowh/2-1).text('no');nt.append('tspan').attr('x',gx+gw/2).attr('dy',14).text('data')}else nt.attr('y',yy+rowh/2+4).text('no data')}
   else{svg.append('rect').attr('x',gx).attr('y',yy+3).attr('width',gw).attr('height',rowh-6).attr('rx',4).attr('fill',l.color).attr('fill-opacity',.22).attr('stroke',l.color);
    svg.append('text').attr('x',gx+gw/2).attr('y',yy+rowh/2+4).attr('text-anchor','middle').attr('class','cellv').text((l.alloc&&l.alloc[i]?'~':'')+shortN(v))}})});
 var cur=svg.append('line').attr('class','scur').attr('y1',top).attr('y2',H).attr('stroke','#e9eef7').attr('stroke-width',1).attr('stroke-dasharray','3 3').style('display','none');
 svg.append('g').selectAll('rect').data(S.years).enter().append('rect').attr('class','tshit').attr('x',function(d,i){return lw+cw*i}).attr('y',0).attr('width',cw).attr('height',H).attr('fill','transparent')
  .attr('tabindex',0).attr('data-tip',function(d,i){return S.tips[which][i]}).attr('aria-label',function(d,i){return S.tips[which][i].replace(/<[^>]+>/g,' ')})
  .on('mouseenter focus',function(d,i){cur.attr('x1',cx(i)).attr('x2',cx(i)).style('display',null)}).on('mouseleave blur',function(){cur.style('display','none')});
}
function bars(){
 var el=$('#flowbars');if(!el)return;var mx=d3.max(F.bars,function(b){return b.n});
 el.innerHTML=F.bars.map(function(b){return '<div class="brow" tabindex="0" data-tip="'+esc(b.tip)+'"><span class="bl">'+esc(b.name)+'</span><span class="bt"><span class="bf" style="width:'+(b.n/mx*100).toFixed(2)+'%;background:'+F.types[b.kind].color+'"></span></span><span class="bv">'+fmt(b.n)+'</span></div>'}).join('');
}
function init(res){
 R=res[0].regions;G=res[1];F=res[2];F._nb=res[3];VMAX=F.vmax;
 R.forEach(function(r){byNe[r.ne]=r});G.features.forEach(function(f){feat[f.properties.name]=f});
 legend();bars();draw();series();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)draw()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){draw();series()},150)});
}
Promise.all(['data/regions.json','vendor/ru_admin1.geojson','data/flows.json','vendor/ne_neighbours.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(init)
 .catch(function(e){console.error(e);var el=$('#flowmap');if(el)el.innerHTML='<p class="notice">The flow map failed to load.</p>'});
})();
