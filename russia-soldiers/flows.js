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
 var cnl=gL.append('g').selectAll('text').data(F._nb.features.filter(function(f){return{'China':1,'Mongolia':1,'Belarus':1}[f.properties.name]})).enter().append('text').attr('class','cname').text(function(f){return f.properties.name});
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
  /* origin markers: one hub for the three Russian arrows, one dot per foreign arrow; each carries the arrow's tooltip */
  var orig=[],hubTip=F.arrows.filter(function(a){return a.hub}).map(function(a){return a.tip}).join('<hr>');
  if(S.some(function(s){return s.hub}))orig.push({id:'hub',ll:hubLL,tip:'<b>'+esc(F.hub.name)+'</b><br>The three Russian arrows start here. Recruitment totals are national: no outlet publishes them by region, so no region is singled out.'});
  S.filter(function(s){return !s.hub}).forEach(function(s){orig.push({id:s.id,ll:s.ll,tip:s.tip})});
  var od=dotG.selectAll('circle').data(orig,function(o){return o.id});od.exit().remove();od.enter().append('circle').attr('r',5).attr('class','dot0');
  dotG.selectAll('circle').attr('cx',function(o){return proj(o.ll)[0]}).attr('cy',function(o){return proj(o.ll)[1]}).attr('data-tip',function(o){return o.tip});
  lblG.selectAll('*').remove();
  var hp=proj(hubLL);
  if(S.some(function(s){return s.hub}))lblG.append('text').attr('class','dlab rus').attr('x',hp[0]-4).attr('y',Math.min.apply(null,S.filter(function(s){return s.hub}).map(function(s){return s.A[1]-s.wh/2}))-10).attr('text-anchor','start').text(ph()?'Russia':'Russia, all regions');
  /* every label names its own origin (country or group) and sits at the origin end of its arrow: foreign labels touch their origin dot,
     the three Russian labels sit in a column beside the hub bar with a short leader line from each arrow's start */
  function two(t,x,y1,l1,l2,anchor,gap){t.attr('text-anchor',anchor);t.append('tspan').attr('x',x).attr('y',y1).text(l1);t.append('tspan').attr('x',x).attr('y',y1+gap).attr('class','vnum').text(l2)}
  var LN={vol:'Contract soldiers',mob:'Mobilised men',pri:'Prisoners',ca:'Central Asia: 5 of 151 source countries',prk:'North Korea'},gap=15;
  S.filter(function(s){return !s.hub}).forEach(function(s){
   var t=lblG.append('text').attr('class','dlab vlab');
   if(s.id==='prk')two(t,s.p[0],s.p[1]-12-gap,LN[s.id],s.label,'middle',gap);
   else two(t,s.p[0],s.p[1]+20,LN[s.id],s.label,'middle',gap);
  });
  var hl=S.filter(function(s){return s.hub}).sort(function(a,b){return a.A[1]-b.A[1]}),lg=ph()?36:21,lx=(hp[0]+(ph()?16:20)),ly=[];
  hl.forEach(function(s,i){var y=s.A[1];if(i&&y<ly[i-1]+lg)y=ly[i-1]+lg;ly.push(y)});
  var shift=(hl.reduce(function(a,s){return a+s.A[1]},0)-ly.reduce(function(a,y){return a+y},0))/Math.max(1,hl.length);
  hl.forEach(function(s,i){
   var y=ly[i]+shift;
   lblG.append('path').attr('class','leader').attr('d','M'+s.A[0]+','+s.A[1]+'L'+(lx-4)+','+(y-(ph()?8:4)));
   var t=lblG.append('text').attr('class','dlab vlab');
   if(ph())two(t,lx,y-10,LN[s.id],s.label,'start',gap);
   else{t.attr('x',lx).attr('y',y).attr('text-anchor','start').text(LN[s.id]+' ');t.append('tspan').attr('class','vnum').text(s.label)}
  });
  if(hl.length){var ru=lblG.select('text.rus');if(!ru.empty()){var top=ly[0]+shift-(ph()?10+16:21),cy=+ru.attr('y');if(top<cy)ru.attr('y',top)}}

  /* country names never sit on the front line, its label, an arrow or another label: each is nudged to the nearest free spot inside its own country */
  (function(){
   var ob=[],pad=4,pts=[];
   function bbx(n,x0,y0){var b=n.getBBox();return {x:b.x+(x0||0)-pad,y:b.y+(y0||0)-pad,r:b.x+b.width+(x0||0)+pad,b:b.y+b.height+(y0||0)+pad}}
   front.selectAll('path.bracket,text.flab').each(function(){ob.push(bbx(this))});
   lblG.selectAll('text,path.leader').each(function(){ob.push(bbx(this))});
   strandG.selectAll('path.stg,path.stp').each(function(){var L=this.getTotalLength(),sw=(+this.getAttribute('stroke-width')||3)/2+pad;for(var k=0;k<=L;k+=6){var q=this.getPointAtLength(k);pts.push([q.x,q.y,sw])}});
   function hits(r){for(var a=0;a<ob.length;a++){var o=ob[a];if(r.x<o.r&&o.x<r.r&&r.y<o.b&&o.y<r.b)return true}
    for(var k=0;k<pts.length;k++){var q=pts[k];if(q[0]>r.x-q[2]&&q[0]<r.r+q[2]&&q[1]>r.y-q[2]&&q[1]<r.b+q[2])return true}return false}
   cnl.each(function(f){
    var c=pathGeo.centroid(f),bb=this.getBBox(),bd=pathGeo.bounds(f),best=null,bc=1e9,dx,dy;
    for(dx=-120;dx<=120;dx+=6)for(dy=-120;dy<=120;dy+=6){
     var r={x:c[0]+bb.x+dx-pad,y:c[1]+bb.y+dy-pad,r:c[0]+bb.x+bb.width+dx+pad,b:c[1]+bb.y+bb.height+dy+pad};
     if(hits(r))continue;var cx=(r.x+r.r)/2,cy=(r.y+r.b)/2,out=cx<bd[0][0]||cx>bd[1][0]||cy<bd[0][1]||cy>bd[1][1];var cost=dx*dx+dy*dy+(out?40000:0);if(cost<bc){bc=cost;best=[dx,dy]}}
    if(best)d3.select(this).attr('transform','translate('+(c[0]+best[0])+','+(c[1]+best[1])+')');
    var fr=d3.select(this).node().getBBox();var tr=this.getCTM&&null;
    ob.push({x:c[0]+(best?best[0]:0)+fr.x-pad,y:c[1]+(best?best[1]:0)+fr.y-pad,r:c[0]+(best?best[0]:0)+fr.x+fr.width+pad,b:c[1]+(best?best[1]:0)+fr.y+fr.height+pad});
   });
  })(); }
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

/* Recruits per year as a RIDGELINE of small multiples: one filled-curve row per recruit type, a shared year axis, and EACH ROW ON ITS OWN LINEAR SCALE
   from zero. A smooth filled curve (curveMonotoneX) joins only consecutive years that both have a sourced value; a lone year is a glowing dot with
   its label; part-year points (2026) are never joined; a year with no source is left empty with a faint "no data". Official or single published
   figures are the solid line and fill; an independent estimate is a dashed curve with a lighter band (a hollow ring when it is one year). The curves
   draw in once as the chart scrolls into view (no Play button). Hover or tap a year column for exact values and sources. */
function shortN(v){return v>=1e5?Math.round(v/1000)+'k':v>=1e4?(Math.round(v/100)/10).toString().replace(/\.0$/,'')+'k':fmt(v)}
var RIDGE_PLAYED=false,RIDGE_IO=null;
function series(){ridge('#ridge')}
function ridge(sel){
 var el=$(sel);if(!el||!F.ridge)return;var S=F.ridge,w=el.clientWidth;if(!w)return;
 var n=S.years.length,N=w<520,padX=N?36:46,topR=N?58:42,rowH=N?136:124,axh=28,H=S.rows.length*rowH+axh+4,cw=(w-2*padX)/(n-1);
 var cx=function(i){return padX+cw*i};
 el.innerHTML='';var leg=document.createElement('ul');leg.className='tslegend';
 [['<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 12 C8 12 10 3 25 3 L25 13 L1 13Z" fill="#8fa0bf" fill-opacity=".35"/><path d="M1 12 C8 12 10 3 25 3" fill="none" stroke="#cfd8ea" stroke-width="2"/></svg>','Filled curve: consecutive years with sourced values'],
  ['<svg viewBox="0 0 26 14" aria-hidden="true"><circle cx="13" cy="7" r="6" fill="#cfd8ea" opacity=".3"/><circle cx="13" cy="7" r="3.5" fill="#cfd8ea"/></svg>','Glowing dot: one year, not joined'],
  ['<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 11 C8 11 10 6 25 6" fill="none" stroke="#cfd8ea" stroke-width="2" stroke-dasharray="4 3"/></svg>','Dashed curve and band: independent estimate'],
  ['<span class="nodk" aria-hidden="true">no data</span>','Faint text: no source for that year']
 ].forEach(function(a){var li=document.createElement('li');li.innerHTML=a[0]+a[1];leg.appendChild(li)});el.appendChild(leg);
 var svg=d3.select(el).append('svg').attr('viewBox','0 0 '+w+' '+H).attr('width','100%').attr('role','img')
  .attr('aria-label','Recruits per year by type, one row per type, each row on its own scale. Hover or tap a year for exact values and sources.');
 var defs=svg.append('defs');
 var glow=defs.append('filter').attr('id','rglow').attr('x','-100%').attr('y','-100%').attr('width','300%').attr('height','300%');
 glow.append('feGaussianBlur').attr('stdDeviation',4).attr('result','b');var mg=glow.append('feMerge');mg.append('feMergeNode').attr('in','b');mg.append('feMergeNode').attr('in','SourceGraphic');
 svg.append('g').selectAll('line').data(S.years).enter().append('line').attr('x1',function(d,i){return cx(i)}).attr('x2',function(d,i){return cx(i)}).attr('y1',2).attr('y2',H-axh).attr('stroke','#22335a').attr('stroke-dasharray','2 4');
 var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,anim=[],fades=[];
 S.rows.forEach(function(r,ri){
  var y0=ri*rowH,base=y0+rowH-8,tp=y0+topR,mx=d3.max(r.vals.concat(r.indep.map(function(q){return q.high})).filter(function(v){return v!=null}));
  var y=d3.scaleLinear().domain([0,mx]).nice().range([base,tp]),dm=y.domain()[1],id='rg'+ri;
  var g=svg.append('g').attr('class','ridgerow');
  var gr=defs.append('linearGradient').attr('id',id+'g').attr('x1',0).attr('x2',0).attr('y1',0).attr('y2',1);
  gr.append('stop').attr('offset','0%').attr('stop-color',r.color).attr('stop-opacity',.62);gr.append('stop').attr('offset','100%').attr('stop-color',r.color).attr('stop-opacity',.04);
  var cp=defs.append('clipPath').attr('id',id+'c').append('rect').attr('x',0).attr('y',y0).attr('height',rowH).attr('width',0);
  g.append('line').attr('x1',padX-14).attr('x2',w-padX+14).attr('y1',base).attr('y2',base).attr('stroke','#2a3b5e');
  g.append('text').attr('x',2).attr('y',y0+16).attr('class','rtitle').text(r.title);
  var sc=N?g.append('text').attr('class','rscale').attr('x',2).attr('y',y0+32).text('scale: 0 to '+shortN(dm)):g.select('.rtitle').append('tspan').attr('class','rscale').attr('dx',10).text('scale: 0 to '+shortN(dm));
  var run=[],runs=[];r.vals.forEach(function(v,i){if(v!=null&&!r.part[i])run.push(i);else{if(run.length)runs.push(run);run=[]}});if(run.length)runs.push(run);
  var ca=g.append('g').attr('clip-path','url(#'+id+'c)');
  // independent estimate: lighter band between low and high, dashed curve through the low values (only between consecutive years)
  var ii=r.indep.filter(function(q){return !r.part[q.year-S.years[0]]}),iruns=[],ir=[];
  ii.forEach(function(q,k){if(ir.length&&q.year===ir[ir.length-1].year+1)ir.push(q);else{if(ir.length)iruns.push(ir);ir=[q]}});if(ir.length)iruns.push(ir);
  iruns.forEach(function(q){if(q.length<2)return;
   ca.append('path').attr('d',d3.area().curve(d3.curveMonotoneX).x(function(d){return cx(d.year-S.years[0])}).y0(function(d){return y(d.low)}).y1(function(d){return y(d.high)})(q)).attr('fill',r.color).attr('fill-opacity',.22);
   ca.append('path').attr('d',d3.line().curve(d3.curveMonotoneX).x(function(d){return cx(d.year-S.years[0])}).y(function(d){return y(d.low)})(q)).attr('fill','none').attr('stroke','#cfd8ea').attr('stroke-width',2).attr('stroke-dasharray','6 4').attr('opacity',.9)});
  runs.forEach(function(rn){if(rn.length<2)return;var pts=rn.map(function(i){return [i,r.vals[i]]});
   ca.append('path').attr('d',d3.area().curve(d3.curveMonotoneX).x(function(d){return cx(d[0])}).y0(base).y1(function(d){return y(d[1])})(pts)).attr('fill','url(#'+id+'g)');
   ca.append('path').attr('d',d3.line().curve(d3.curveMonotoneX).x(function(d){return cx(d[0])}).y(function(d){return y(d[1])})(pts)).attr('fill','none').attr('stroke',r.color).attr('stroke-width',2.6).attr('stroke-linejoin','round')});
  anim.push({cp:cp,d:ri*160});
  var dots=g.append('g').attr('class','ridgedots');fades.push({g:dots,d:ri*160+700});
  var lone=function(i){return !(runs.some(function(rn){return rn.length>1&&rn.indexOf(i)>=0}))};
  r.vals.forEach(function(v,i){
   if(v==null){dots.append('text').attr('x',cx(i)).attr('y',y0+topR+(base-tp)/2+4).attr('text-anchor','middle').attr('class','nod').text('no data');return}
   var q=r.indep.filter(function(z){return z.year===S.years[i]})[0],up=!(q&&q.low>v),py=y(v);
   if(r.part[i]){dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',5).attr('fill','#0b1526').attr('stroke',r.color).attr('stroke-width',2).attr('stroke-dasharray','3 2')}
   else if(lone(i)){dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',8).attr('fill',r.color).attr('opacity',.55).attr('filter','url(#rglow)');dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',4.5).attr('fill',r.color).attr('stroke','#fff').attr('stroke-width',1.5)}
   else dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',4).attr('fill',r.color).attr('stroke','#0b1526').attr('stroke-width',1.5);
   dots.append('text').attr('x',cx(i)).attr('y',up?py-12:py+20).attr('text-anchor','middle').attr('class','rlab').text((r.alloc[i]?'~':'')+shortN(v));
   if(r.part[i])dots.append('text').attr('x',cx(i)).attr('y',py+(up?20:34)).attr('text-anchor','middle').attr('class','rlab sub').text(r.part[i]);
  });
  r.indep.forEach(function(q){var i=q.year-S.years[0],single=q.low===q.high,pv=r.vals[i],above=pv!=null&&q.low>pv,py=y(single?q.low:(above?q.high:q.low));
   if(single&&iruns.every(function(z){return z.indexOf(q)<0||z.length<2})){dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',5.5).attr('fill','#0b1526').attr('stroke','#cfd8ea').attr('stroke-width',2).attr('stroke-dasharray','3 2')}
   else if(!single)dots.append('circle').attr('cx',cx(i)).attr('cy',y(q.low)).attr('r',3.2).attr('fill','#cfd8ea');
   if(single&&iruns.some(function(z){return z.indexOf(q)>=0&&z.length>1}))dots.append('circle').attr('cx',cx(i)).attr('cy',py).attr('r',3.2).attr('fill','#cfd8ea');
   dots.append('text').attr('x',cx(i)).attr('y',above?py-10:py+20).attr('text-anchor','middle').attr('class','rlab ind').text(single?shortN(q.low):shortN(q.low)+' to '+shortN(q.high))});
 });
 var ay=H-axh+18;svg.append('g').selectAll('text').data(S.years).enter().append('text').attr('x',function(d,i){return cx(i)}).attr('y',ay).attr('text-anchor','middle').attr('class','tick').text(function(d){return d});
 /* compact hover: year plus one short line per type, beside the hovered column on desktop (moved to the clearest gap) and in a slot above the chart on phones */
 var colHi=svg.insert('rect',':first-child').attr('class','rcol').attr('y',2).attr('height',H-axh-2).attr('width',cw).style('display','none');
 var tipE=document.createElement('div');tipE.className='rtip'+(N?' rtip-top':'');tipE.setAttribute('aria-hidden','true');
 var hint='<div class="rt-h">Tap a year for values</div>';
 if(N){tipE.innerHTML=hint;tipE.classList.add('idle');el.insertBefore(tipE,svg.node())}else{tipE.hidden=true;el.appendChild(tipE)}
 var curves=null;
 function obstacles(){if(curves)return curves;var pts=[],bx=[];
  svg.selectAll('g.ridgerow path[stroke]').each(function(){var L=this.getTotalLength();for(var k=0;k<=L;k+=5){var q=this.getPointAtLength(k);pts.push([q.x,q.y])}});
  svg.selectAll('g.ridgerow path[fill]').each(function(){var b=this.getBBox();if(b.width>0)bx.push([b.x,b.y-2,b.x+b.width,b.y+b.height+2])});
  svg.selectAll('g.ridgerow text').each(function(){var b=this.getBBox();bx.push([b.x-3,b.y-2,b.x+b.width+3,b.y+b.height+2])});
  return curves={pts:pts,bx:bx}}
 function tipHtml(i){var yr=S.years[i],h='<div class="rt-h">'+yr+(S.rows.some(function(r){return r.part[i]})?' <span class="rt-m">(part year)</span>':'')+'</div>';
  S.rows.forEach(function(r,ri){var e=S.ctips[i][ri];
   h+='<div class="rt-r"><i style="background:'+r.color+'"></i><span class="rt-n">'+esc(r.short)+'</span>'+
    (e.v==null?'<span class="rt-nd">no data</span>':'<b>'+(e.alloc?'~':'')+e.v.toLocaleString('en-US')+'</b>'+(e.part?'<span class="rt-m"> '+esc(e.part)+'</span>':'')+'<span class="rt-c">'+e.c.map(function(n){return '['+n+']'}).join('')+'</span>')+'</div>'});
  return h}
 function placeTip(i){var tw=tipE.offsetWidth,th=tipE.offsetHeight,ob=obstacles(),top0=svg.node().getBoundingClientRect().top-el.getBoundingClientRect().top,best=null,bc=1e12;
  var xs=[];for(var xo=cx(i)+12;xo<=cx(i)+cw;xo+=8)xs.push(xo);for(xo=cx(i)-12-tw;xo>=cx(i)-cw-tw;xo-=8)xs.push(xo);
  xs.forEach(function(x0){if(x0<0||x0+tw>w)return;var dxp=Math.abs(x0-cx(i)+(x0<cx(i)?tw:0))*0.04;
   for(var y0=2;y0+th<=H-axh+2;y0+=8){var c=y0*0.02+dxp,r={x:x0,y:y0,r:x0+tw,b:y0+th};
    for(var k=0;k<ob.pts.length;k++){var q=ob.pts[k];if(q[0]>r.x&&q[0]<r.r&&q[1]>r.y&&q[1]<r.b)c++}
    for(k=0;k<ob.bx.length;k++){var o=ob.bx[k];if(r.x<o[2]&&o[0]<r.r&&r.y<o[3]&&o[1]<r.b)c+=60}
    if(c<bc){bc=c;best=[x0,y0]}}});
  if(!best)best=[Math.min(w-tw,cx(i)+10),2];
  tipE.style.left=best[0]+'px';tipE.style.top=(top0+best[1])+'px'}
 function showCol(i){colHi.attr('x',cx(i)-cw/2).style('display',null);tipE.innerHTML=tipHtml(i);tipE.classList.remove('idle');
  if(!N){tipE.hidden=false;placeTip(i)}}
 function hideCol(){colHi.style('display','none');if(N){tipE.innerHTML=hint;tipE.classList.add('idle')}else tipE.hidden=true}
 svg.append('g').selectAll('rect').data(S.years).enter().append('rect').attr('class','tshit').attr('x',function(d,i){return cx(i)-cw/2}).attr('y',0).attr('width',cw).attr('height',H).attr('fill','transparent')
  .attr('tabindex',0).attr('aria-label',function(d,i){return S.tips[i].replace(/<[^>]+>/g,' ')})
  .on('mouseenter focus',function(ev,d){showCol(S.years.indexOf(d))}).on('mouseleave blur',function(){if(!N)hideCol()});
 if(N)document.addEventListener('click',function(e){if(!el.contains(e.target)||e.target.closest&&!e.target.closest('.tshit'))hideCol()});
 var show=function(){anim.forEach(function(a){a.cp.attr('width',w)});fades.forEach(function(f){f.g.style('opacity',1)})};
 var play=function(){RIDGE_PLAYED=true;
  anim.forEach(function(a){a.cp.transition().delay(a.d).duration(1500).ease(d3.easeCubicOut).attr('width',w)});
  fades.forEach(function(f){f.g.transition().delay(f.d).duration(700).style('opacity',1)})};
 if(RIDGE_PLAYED||reduce){show();return}
 fades.forEach(function(f){f.g.style('opacity',0)});
 if(!('IntersectionObserver' in window)){play();return}
 if(RIDGE_IO)RIDGE_IO.disconnect();
 RIDGE_IO=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){RIDGE_IO.disconnect();RIDGE_IO=null;play()}},{threshold:.2});RIDGE_IO.observe(el);
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
