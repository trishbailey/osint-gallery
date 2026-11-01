(function(){
'use strict';
var RAMP=['#fdedeb','#fea498','#e43d3c','#8a0114'];
var $=function(s,r){return (r||document).querySelector(s)};
var fmt=function(x,d){d=d||0;return x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
var NAVY='#12203a';
var METRICS={deaths:{name:'All named dead',what:'named dead',legend:'Named dead per 100,000',unit:'named dead per 100,000',sfx:''},
 vol:{name:'Volunteers',what:'named dead who joined as volunteers',legend:'Named dead who joined as volunteers, by home region, per 100,000 residents',unit:'named dead who joined as volunteers, by home region, per 100,000 residents',sfx:''},
 mob:{name:'Mobilized',what:'named dead who were mobilized',legend:'Named dead who were mobilized, by home region, per 100,000 residents',unit:'named dead who were mobilized, by home region, per 100,000 residents',sfx:''},
 pri:{name:'Prisoners',what:'named dead recruited from prison',legend:'Named dead recruited from prison, by home region, per 100,000 residents',unit:'named dead recruited from prison, by home region, per 100,000 residents',sfx:''},
 dist:{name:'Distance from Moscow',legend:'Distance from Moscow, straight line, km',unit:'km from Moscow in a straight line',sfx:' km'},
 pov:{name:'Poverty rate',legend:'Residents below the poverty line, 2025, %',unit:'of residents below the poverty line (2025)',sfx:'%'},
 ru:{name:'Russian share',legend:'Ethnic Russians, share of residents, 2020 census, %',unit:'of residents ethnic Russian (2020 census)',sfx:'%'},
 bonus:{name:'Bonus in months',legend:'Signing bonus in months of local average wage',unit:'months of local average wage',sfx:''}};
function valOf(r,m){return m==='dist'?r.dist_km:m==='pov'?r.pov:m==='ru'?r.ru_share:m==='bonus'?(r.bonus&&r.bonus.months!=null?r.bonus.months:null):r[m+'_rate']}
var STATUS={range:'The card gives a regional range of 1.5 to 3 million rubles. The upper end is charted.',ok:'Firm: the regional card says the amount is confirmed.',ends_oct31:'The program runs only to 31 Oct 2026.',stale:'The card data (or, for Kaliningrad, Nizhny Novgorod and Kirov, a Jan 2026 aggregator table) is more than 30 days old, or the program is marked expired.',unpublished:'The amount comes from media reports or an unpublished act.'};
var R,S,G,byNe={},byIso={},metric='deaths',selected=null,tipEl,bonusAll=false,firmOnly=false;
var phone=function(){return window.matchMedia('(max-width:700px)').matches};

function cls(v,m){var b=S.breaks[m];return v<b[0]?0:v<b[1]?1:v<b[2]?2:3}
function fillOf(r,m){if(!r)return NAVY;var v=valOf(r,m);return v==null?NAVY:RAMP[cls(v,m)]}
function legendHTML(m){var b=S.breaks[m],s=METRICS[m].sfx,f=function(x){return fmt(x,x<10?1:0)+s};
 var t=['Under '+f(b[0]),f(b[0])+' up to '+f(b[1]),f(b[1])+' up to '+f(b[2]),f(b[2])+' and over'];
 var h=t.map(function(x,i){return '<li><span class="sw" style="background:'+RAMP[i]+'"></span>'+x+'</li>'}).join('');
 if(m==='bonus')h+='<li><span class="sw nodata"></span>No figure</li>';return h}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function rank(r,key){var a=R.slice().sort(function(x,y){return y[key]-x[key]});return a.indexOf(r)+1}

/* tooltips */
function showTip(html,x,y){tipEl.innerHTML=html;tipEl.hidden=false;var w=tipEl.offsetWidth,h=tipEl.offsetHeight;
 var nx=Math.min(x+14,window.innerWidth-w-8),ny=y+16;if(ny+h>window.innerHeight-8)ny=y-h-12;tipEl.style.left=Math.max(8,nx)+'px';tipEl.style.top=Math.max(8,ny)+'px'}
function hideTip(){tipEl.hidden=true}
function bindTips(){
 document.addEventListener('mouseover',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t.getAttribute('data-tip'),e.clientX,e.clientY)});
 document.addEventListener('mousemove',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t.getAttribute('data-tip'),e.clientX,e.clientY);else hideTip()});
 document.addEventListener('focusin',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t){var b=t.getBoundingClientRect();showTip(t.getAttribute('data-tip'),b.left+20,b.bottom-10)}});
 document.addEventListener('focusout',hideTip);
 document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t&&t.classList&&t.classList.contains('reg')&&t.closest('#map')){hideTip();return}if(t)showTip(t.getAttribute('data-tip'),e.clientX,e.clientY);else hideTip()});
 window.addEventListener('scroll',hideTip,{passive:true});
}
function regionTip(r,m){var v=valOf(r,m);
 if(m==='pov')return '<b>'+esc(r.en)+'</b><br>'+fmt(v,1)+'% '+METRICS[m].unit+(r.pov_kind==='derived'?'<br>Derived from the poor headcount and population':'');
 if(m==='dist')return '<b>'+esc(r.en)+'</b><br>'+fmt(v)+' km from Moscow in a straight line<br>'+fmt(r.deaths_rate,1)+' named dead per 100,000 (rank '+rank(r,'deaths_rate')+' of 85)';
 if(m==='ru')return '<b>'+esc(r.en)+'</b><br>'+fmt(v,1)+'% '+METRICS[m].unit;
 if(m==='bonus'){var b=r.bonus;return v==null?'<b>'+esc(r.en)+'</b><br>No signing-bonus figure: '+esc(b.excluded):'<b>'+esc(r.en)+'</b><br>'+fmt(v,1)+' '+METRICS[m].unit+'<br>'+fmt(b.total)+' rubles in total'}
 var c=r[m];return '<b>'+esc(r.en)+'</b><br>'+fmt(v,1)+' '+METRICS[m].unit+'<br>'+fmt(c)+' '+METRICS[m].what+' among '+fmt(r.pop)+' residents'+(m==='deaths'?'<br>Rank '+rank(r,'deaths_rate')+' of 85 by named dead per 100,000':'')}
/* map */
var proj,pathGen,zoom,gMap,svgMap;
function drawMap(){
 var wrap=$('#mapwrap'),w=wrap.clientWidth,h=phone()?380:560;if(!w)return;
 svgMap=d3.select('#map');svgMap.selectAll('*').remove();svgMap.attr('width',w).attr('height',h);
 var fc={type:'FeatureCollection',features:G.features};
 proj=d3.geoConicConformal().rotate([-100,0]).parallels([52,64]).fitExtent([[8,8],[w-8,h-8]],fc);
 pathGen=d3.geoPath(proj);gMap=svgMap.append('g');
 gMap.selectAll('path').data(G.features).enter().append('path').attr('class','reg').attr('d',pathGen)
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?regionTip(r,metric):''})
  .attr('fill',function(f){return fillOf(byNe[f.properties.name],metric)})
  .on('click',function(e,f){var r=byNe[f.properties.name];if(r)selectRegion(r)});
 /* Invisible hit target for a region whose bounding-box center lies outside its own shape (a coast or a bay: Yamalo-Nenets, Arkhangelsk). A click or tap at that center,
    where automated and assistive pointers aim, selects the region like a click on its land does. Transparent, so nothing changes visually. */
 var gPin=gMap.append('g').attr('class','regpins').attr('aria-hidden','true');
 gMap.selectAll('path.reg').each(function(f){var b=this.getBBox(),pt=svgMap.node().createSVGPoint();pt.x=b.x+b.width/2;pt.y=b.y+b.height/2;
  if(this.isPointInFill(pt))return;var own=this,hit=false;gMap.selectAll('path.reg').each(function(){if(this!==own&&this.isPointInFill(pt))hit=true});if(hit)return; /* center lies in another region: that region owns the click */
  gPin.append('circle').datum(f).attr('class','regpin').attr('cx',pt.x).attr('cy',pt.y).attr('r',6).attr('fill','#000').attr('fill-opacity',0)
   .attr('data-tip',function(){var r=byNe[f.properties.name];return r?regionTip(r,metric):''}).on('click',function(e,d){var r=byNe[d.properties.name];if(r)selectRegion(r)})});
 /* city markers: Moscow and St Petersburg, drawn above the regions on every layer; white dot and label with a dark halo, kept the same size when zooming, and never catching a click */
 var gCity=gMap.append('g').attr('class','cities').attr('aria-hidden','true').style('pointer-events','none');
 [['St Petersburg',30.32,59.94,8,-9],['Moscow',37.62,55.75,8,19]].forEach(function(c){var p=proj([c[1],c[2]]);
  var g=gCity.append('g').attr('class','city').attr('data-xy',p[0]+','+p[1]).attr('transform','translate('+p+')');
  g.append('circle').attr('class','citydot').attr('r',4.5);g.append('text').attr('class','citylab').attr('x',c[3]).attr('y',c[4]).text(c[0])});
 zoom=d3.zoom().scaleExtent([1,14]).translateExtent([[0,0],[w,h]]).on('zoom',function(e){gMap.attr('transform',e.transform);
  gCity.selectAll('g.city').attr('transform',function(){var p=this.getAttribute('data-xy');return 'translate('+p+') scale('+(1/e.transform.k)+')'})});
 svgMap.call(zoom);
 if(selected)markSel();
}
function recolor(){
 gMap.selectAll('path').attr('fill',function(f){return fillOf(byNe[f.properties.name],metric)})
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?regionTip(r,metric):''});
 gMap.selectAll('circle.regpin').attr('data-tip',function(f){var r=byNe[f.properties.name];return r?regionTip(r,metric):''});
 $('#legend').innerHTML=legendHTML(metric);$('#legtitle').textContent=METRICS[metric].legend;
  $('#map').setAttribute('aria-label','Map of Russia\'s regions shaded by '+METRICS[metric].legend);
}
function markSel(){gMap.selectAll('path').classed('sel',function(f){return selected&&f.properties.name===selected.ne})}
function selectRegion(r){selected=r;markSel();var b=r.bonus,h='<h3>'+esc(r.en)+'</h3><dl>';
 var row=function(a,v){h+='<dt>'+a+'</dt><dd>'+v+'</dd>'};
 row('Federal district',r.fd);row('Residents (1 Jan 2024)',fmt(r.pop));
 row('Named dead',fmt(r.deaths));row('Per 100,000',fmt(r.deaths_rate,1)+' (rank '+rank(r,'deaths_rate')+' of 85)');
 row('Volunteers',fmt(r.vol)+' ('+fmt(r.vol_rate,1)+' per 100,000)');row('Mobilized',fmt(r.mob)+' ('+fmt(r.mob_rate,1)+')');row('Prisoners',fmt(r.pri)+' ('+fmt(r.pri_rate,1)+')');
 row('Average wage, 2025',fmt(r.wage)+' rubles');
 row('Poverty rate, 2025',fmt(r.pov,1)+'%'+(r.pov_kind==='derived'?' (derived)':''));row('Ethnic Russians (2020)',fmt(r.ru_share,1)+'%');
 row('Distance from Moscow',fmt(r.dist_km)+' km');h+='</dl>';
 if(b.months){h+='<p><b>Signing bonus:</b> '+fmt(b.total)+' rubles ('+fmt(b.federal)+' federal and '+fmt(b.regional)+' regional) is '+fmt(b.months,1)+' months of the local average wage. '+STATUS[b.status]+'</p>'}
 else h+='<p><b>Signing bonus:</b> not charted. '+esc(b.excluded)+'.</p>';
 hideTip();$('#panelbody').innerHTML=h;$('#panel').classList.add('open')}
function closePanel(){$('#panel').classList.remove('open');selected=null;if(gMap)markSel()}

/* bar helpers */
function barRow(label,val,max,col,valtxt,tip,dash){
 return '<div class="brow" tabindex="0" data-tip="'+esc(tip)+'"><span class="bl">'+esc(label)+'</span><span class="bt"><span class="bf'+(dash?' dash':'')+'" style="width:'+(val/max*100).toFixed(2)+'%;background:'+col+'"></span></span><span class="bv">'+valtxt+'</span></div>'}
function drawBonus(){
 var a=R.filter(function(r){return r.bonus.months&&(!firmOnly||r.bonus.status==='ok')}).sort(function(x,y){return y.bonus.months-x.bonus.months});
 var all=a.length;if(!bonusAll)a=a.slice(0,15);
 var max=R.reduce(function(m,r){return r.bonus.months?Math.max(m,r.bonus.months):m},0);
 $('#bonusbars').innerHTML=a.map(function(r){var b=r.bonus;
  return barRow(r.en,b.months,max,RAMP[2],fmt(b.months,1)+' months',
   '<b>'+esc(r.en)+'</b><br>'+fmt(b.total)+' rubles ('+fmt(b.federal)+' federal and '+fmt(b.regional)+' regional)<br>'+fmt(b.months,1)+' months of the average wage of '+fmt(r.wage)+' rubles<br>'+STATUS[b.status],b.status!=='ok')}).join('');
 $('#bonusmore').textContent=bonusAll?'Show top 15 only':'Show all '+all+' regions'}
/* undercount */
function drawUc(){var p=S.probate,mx=p.total;
 $('#ucbars').innerHTML=barRow('Named list, 9 May 2026',p.named_at_date,mx,RAMP[2],fmt(p.named_at_date),'<b>Named list</b><br>'+fmt(p.named_at_date)+' verified names when the estimate was made')+
  barRow('Estimated dead to end-2025',p.total,mx,RAMP[3],fmt(p.total),'<b>Probate-registry estimate</b><br>'+fmt(p.total)+' male Russian citizens aged 18 to 59, '+fmt(p.mult,1)+' times the names on the list then')+
  barRow('Named list, 23 Oct 2026',S.named_total,mx,RAMP[2],fmt(S.named_total),'<b>Named list on 23 Oct 2026</b><br>'+fmt(S.named_total)+' names, which includes deaths in 2026')}

/* minimaps */
function drawMini(sel,m,legsel){
 var el=$(sel);if(!el)return;var w=el.clientWidth;if(!w)return;var h=Math.round(w*(phone()?0.62:0.58));
 el.innerHTML='';var svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Map of Russia\'s regions shaded by '+METRICS[m].legend);
 var p=d3.geoPath(d3.geoConicConformal().rotate([-100,0]).parallels([52,64]).fitExtent([[2,2],[w-2,h-2]],{type:'FeatureCollection',features:G.features}));
 svg.append('g').selectAll('path').data(G.features).enter().append('path').attr('class','reg').attr('d',p)
  .attr('fill',function(f){return fillOf(byNe[f.properties.name],m)})
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?regionTip(r,m):''});
 $(legsel).innerHTML=legendHTML(m)}
function drawMinis(){drawMini('#mm-bonus','bonus','#leg-mm-bonus')}
function drawAll(){drawMap();recolor();drawMinis()}

function init(res){
 R=res[0].regions;S=res[1];G=res[2];tipEl=$('#tip');
 R.forEach(function(r){byNe[r.ne]=r;byIso[r.iso]=r});
 // desktop: everything open; phone: only the map, flow, prisoners and North Korea sections open, map options behind one button
 var ph=phone();document.querySelectorAll('details.sec').forEach(function(d){d.open=(!ph||d.id==='nk-sec'||d.id==='flow-sec'||d.id==='pris-sec'||d.id==='dead-sec')});
 $('#mapside').open=!ph;
 $('#legend').innerHTML=legendHTML('deaths');
 $('#legend3').innerHTML='<li><span class="sw" style="background:var(--r3)"></span>Firm amount</li><li><span class="sw dash"></span>Ends 31 Oct 2026, card over 30 days old, a range, or a media report</li>';
 document.querySelectorAll('.chipb[data-metric]').forEach(function(b){b.addEventListener('click',function(){
  metric=b.dataset.metric;document.querySelectorAll('.chipb[data-metric]').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});recolor()})});
 $('#reset').addEventListener('click',function(){if(svgMap)svgMap.transition().duration(350).call(zoom.transform,d3.zoomIdentity)});
 $('#closepanel').addEventListener('click',closePanel);
 $('#bonusmore').addEventListener('click',function(){bonusAll=!bonusAll;drawBonus()});
 $('#firmonly').addEventListener('click',function(){firmOnly=!firmOnly;this.setAttribute('aria-pressed',firmOnly?'true':'false');drawBonus()});
 bindTips();drawAll();drawBonus();drawUc();
 document.querySelectorAll('details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)drawAll()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(drawAll,150)});
 document.documentElement.setAttribute('data-ready','1');
}
Promise.all(['data/regions.json','data/stats.json','vendor/ru_admin1.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(init)
 .catch(function(e){console.error(e);document.querySelector('main').insertAdjacentHTML('afterbegin','<p class="notice">The data failed to load.</p>')});
})();
