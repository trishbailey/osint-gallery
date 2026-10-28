(function(){
'use strict';
var RAMP=['#fdedeb','#fea498','#e43d3c','#8a0114'];
var $=function(s,r){return (r||document).querySelector(s)};
var fmt=function(x,d){d=d||0;return x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
var METRICS={deaths:{name:'All named dead',legend:'Named dead per 100,000',unit:'named dead per 100,000'},
 vol:{name:'Volunteers',legend:'Volunteers among the named dead, per 100,000',unit:'named volunteers per 100,000'},
 mob:{name:'Mobilised',legend:'Mobilised men among the named dead, per 100,000',unit:'named mobilised men per 100,000'},
 pri:{name:'Prisoners',legend:'Prisoners among the named dead, per 100,000',unit:'named prisoners per 100,000'}};
var STATUS={range:'The card gives a regional range of 1.5 to 3 million roubles. The upper end is charted.',ok:'Firm: the regional card says the amount is confirmed.',ends_oct31:'The programme runs only to 31 Oct 2026.',stale:'The card data is more than 30 days old or the programme is marked expired.',unpublished:'The amount comes from media reports or an unpublished act.'};
var R,S,G,byNe={},byIso={},metric='deaths',selected=null,tipEl,rankAll=false,bonusAll=false,firmOnly=false;
var phone=function(){return window.matchMedia('(max-width:700px)').matches};

function cls(v,m){var b=S.breaks[m];return v<b[0]?0:v<b[1]?1:v<b[2]?2:3}
function legendHTML(m){var b=S.breaks[m],f=function(x){return fmt(x,x<10?1:0)};
 var t=['Under '+f(b[0]),f(b[0])+' up to '+f(b[1]),f(b[1])+' up to '+f(b[2]),f(b[2])+' and over'];
 return t.map(function(x,i){return '<li><span class="sw" style="background:'+RAMP[i]+'"></span>'+x+'</li>'}).join('')}
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
 document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t&&t.classList&&t.classList.contains('reg')){hideTip();return}if(t)showTip(t.getAttribute('data-tip'),e.clientX,e.clientY);else hideTip()});
 window.addEventListener('scroll',hideTip,{passive:true});
}
function regionTip(r,m){var v=r[m+'_rate'],c=r[m];
 return '<b>'+esc(r.en)+'</b><br>'+fmt(v,1)+' '+METRICS[m].unit+'<br>'+fmt(c)+' named '+(m==='deaths'?'dead':METRICS[m].name.toLowerCase())+' among '+fmt(r.pop)+' residents'}

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
  .attr('fill',function(f){var r=byNe[f.properties.name];return r?RAMP[cls(r[metric+'_rate'],metric)]:'#12203a'})
  .on('click',function(e,f){var r=byNe[f.properties.name];if(r)selectRegion(r)});
 zoom=d3.zoom().scaleExtent([1,14]).translateExtent([[0,0],[w,h]]).on('zoom',function(e){gMap.attr('transform',e.transform)});
 svgMap.call(zoom);
 if(selected)markSel();
}
function recolor(){
 gMap.selectAll('path').attr('fill',function(f){var r=byNe[f.properties.name];return r?RAMP[cls(r[metric+'_rate'],metric)]:'#12203a'})
  .attr('data-tip',function(f){var r=byNe[f.properties.name];return r?regionTip(r,metric):''});
 $('#legend').innerHTML=legendHTML(metric);$('#legtitle').textContent=METRICS[metric].legend;
 $('#mapcap').dataset.metric=metric;
 $('#map').setAttribute('aria-label','Map of Russia\'s regions shaded by '+METRICS[metric].unit);
}
function markSel(){gMap.selectAll('path').classed('sel',function(f){return selected&&f.properties.name===selected.ne})}
function selectRegion(r){selected=r;markSel();var b=r.bonus,h='<h3>'+esc(r.en)+'</h3><dl>';
 var row=function(a,v){h+='<dt>'+a+'</dt><dd>'+v+'</dd>'};
 row('Federal district',r.fd);row('Residents (1 Jan 2024)',fmt(r.pop));
 row('Named dead',fmt(r.deaths));row('Per 100,000',fmt(r.deaths_rate,1)+' (rank '+rank(r,'deaths_rate')+' of 85)');
 row('Volunteers',fmt(r.vol)+' ('+fmt(r.vol_rate,1)+' per 100,000)');row('Mobilised',fmt(r.mob)+' ('+fmt(r.mob_rate,1)+')');row('Prisoners',fmt(r.pri)+' ('+fmt(r.pri_rate,1)+')');
 row('Average wage, 2025',fmt(r.wage)+' roubles');
 row('Ethnic Russians (2020)',r.ru_share==null?'under 4.0% (no row in the table)':fmt(r.ru_share,1)+'%');
 row('Distance from Moscow',fmt(r.dist_km)+' km');h+='</dl>';
 if(b.months){h+='<p><b>Signing bonus:</b> '+fmt(b.total)+' roubles ('+fmt(b.federal)+' federal and '+fmt(b.regional)+' regional) is '+fmt(b.months,1)+' months of the local average wage. '+STATUS[b.status]+'</p>'}
 else h+='<p><b>Signing bonus:</b> not charted. '+esc(b.excluded)+'.</p>';
 hideTip();$('#panelbody').innerHTML=h;$('#panel').classList.add('open')}
function closePanel(){$('#panel').classList.remove('open');selected=null;if(gMap)markSel()}

/* bar helpers */
function barRow(label,val,max,col,valtxt,tip,dash){
 return '<div class="brow" tabindex="0" data-tip="'+esc(tip)+'"><span class="bl">'+esc(label)+'</span><span class="bt"><span class="bf'+(dash?' dash':'')+'" style="width:'+(val/max*100).toFixed(2)+'%;background:'+col+'"></span></span><span class="bv">'+valtxt+'</span></div>'}
function drawRank(){
 var a=R.slice().sort(function(x,y){return y.deaths_rate-x.deaths_rate});if(!rankAll)a=a.slice(0,15);
 var max=R.reduce(function(m,r){return Math.max(m,r.deaths_rate)},0);
 $('#rankbars').innerHTML=a.map(function(r){return barRow(r.en,r.deaths_rate,max,RAMP[cls(r.deaths_rate,'deaths')],fmt(r.deaths_rate,1),regionTip(r,'deaths'))}).join('');
 $('#rankmore').textContent=rankAll?'Show top 15 only':'Show all 85 regions'}
function drawGroupBars(){
 var fd=Object.keys(S.fd).map(function(k){return [k,S.fd[k]]}).sort(function(a,b){return b[1].rate-a[1].rate});
 var mx=fd[0][1].rate;
 var tipg=function(n,g,extra){return '<b>'+esc(n)+'</b><br>'+fmt(g.rate,1)+' named dead per 100,000<br>'+fmt(g.deaths)+' named dead among '+fmt(g.pop)+' residents ('+g.n+' regions)'+(extra||'')};
 $('#bars-fd').innerHTML=fd.map(function(x){return barRow(x[0]+' ('+x[1].n+')',x[1].rate,mx,RAMP[cls(x[1].rate,'deaths')],fmt(x[1].rate,0),tipg(x[0],x[1]))}).join('');
 var q=S.wage_quartiles,names=['Lowest-paid quarter','Second quarter','Third quarter','Highest-paid quarter'];
 var mq=Math.max.apply(null,q.map(function(g){return g.rate}));
 $('#bars-q').innerHTML=q.map(function(g,i){var rng=fmt(g.wage_min)+' to '+fmt(g.wage_max)+' roubles a month';
  return barRow(names[i],g.rate,mq,RAMP[cls(g.rate,'deaths')],fmt(g.rate,0),tipg(names[i],g,'<br>Wages '+rng))}).join('');
 var gs=[['Ethnic republics',S.groups.republics],['All other regions',S.groups.non_republics],['Under 50% Russian',S.groups.ru_lt50],['50% Russian or more',S.groups.ru_ge50]];
 var mg=Math.max.apply(null,gs.map(function(x){return x[1].rate}));
 $('#bars-g').innerHTML=gs.map(function(x){return barRow(x[0]+' ('+x[1].n+')',x[1].rate,mg,RAMP[cls(x[1].rate,'deaths')],fmt(x[1].rate,0),tipg(x[0],x[1]))}).join('');
}
function drawBonus(){
 var a=R.filter(function(r){return r.bonus.months&&(!firmOnly||r.bonus.status==='ok')}).sort(function(x,y){return y.bonus.months-x.bonus.months});
 var all=a.length;if(!bonusAll)a=a.slice(0,15);
 var max=R.reduce(function(m,r){return r.bonus.months?Math.max(m,r.bonus.months):m},0);
 $('#bonusbars').innerHTML=a.map(function(r){var b=r.bonus;
  return barRow(r.en,b.months,max,RAMP[2],fmt(b.months,1)+' months',
   '<b>'+esc(r.en)+'</b><br>'+fmt(b.total)+' roubles ('+fmt(b.federal)+' federal and '+fmt(b.regional)+' regional)<br>'+fmt(b.months,1)+' months of the average wage of '+fmt(r.wage)+' roubles<br>'+STATUS[b.status],b.status!=='ok')}).join('');
 $('#bonusmore').textContent=bonusAll?'Show top 15 only':'Show all '+all+' regions'}
function drawTypeBars(){
 var t=S.type_totals,tot=S.named_85,oth=tot-t.vol-t.mob-t.pri;
 var rows=[['Volunteers (contract)',t.vol],['Prisoners',t.pri],['Mobilised men',t.mob],['Other labels or no data',oth]];
 var mx=Math.max.apply(null,rows.map(function(x){return x[1]}));
 $('#typebars').innerHTML=rows.map(function(x){return barRow(x[0],x[1],mx,RAMP[2],fmt(x[1]),'<b>'+x[0]+'</b><br>'+fmt(x[1])+' of '+fmt(tot)+' named dead in the 85 regions ('+fmt(x[1]/tot*100,1)+'%)')}).join('')}

/* scatter */
function scatter(sel,xf,xlab,xfmt,labels,filter){
 var el=$(sel);var w=el.clientWidth;if(!w)return;var h=phone()?300:360;
 var d=R.filter(function(r){return xf(r)!=null&&(!filter||filter(r))});
 var m={l:50,r:14,t:30,b:48};
 var x=d3.scaleLinear().domain([0,d3.max(d,xf)*1.04]).nice().range([m.l,w-m.r]);
 var y=d3.scaleLinear().domain([0,d3.max(d,function(r){return r.deaths_rate})*1.05]).nice().range([h-m.b,m.t]);
 el.innerHTML='';var svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('role','img').attr('aria-label','Scatter plot: '+xlab+' against named dead per 100,000');
 var xt=x.ticks(phone()?4:6),yt=y.ticks(5);
 svg.append('g').selectAll('line').data(yt).enter().append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y).attr('y2',y).attr('stroke','#24365a');
 svg.append('g').selectAll('text').data(yt).enter().append('text').attr('x',m.l-6).attr('y',function(v){return y(v)+4}).attr('text-anchor','end').attr('class','muted').text(function(v){return fmt(v)});
 svg.append('g').selectAll('text').data(xt).enter().append('text').attr('x',x).attr('y',h-m.b+20).attr('text-anchor','middle').attr('class','muted').text(function(v){return xfmt(v)});
 svg.append('text').attr('x',m.l).attr('y',16).text('Named dead per 100,000 residents');
 svg.append('text').attr('x',w-m.r).attr('y',h-6).attr('text-anchor','end').text(xlab);
 // fit line (ordinary least squares, drawn for the eye)
 var n=d.length,mx=d3.mean(d,xf),my=d3.mean(d,function(r){return r.deaths_rate}),sxy=0,sxx=0;
 d.forEach(function(r){sxy+=(xf(r)-mx)*(r.deaths_rate-my);sxx+=(xf(r)-mx)*(xf(r)-mx)});
 var k=sxy/sxx,c=my-k*mx,x0=x.domain()[0],x1=x.domain()[1];
 svg.append('line').attr('x1',x(x0)).attr('x2',x(x1)).attr('y1',y(c+k*x0)).attr('y2',y(c+k*x1)).attr('stroke','#c8a24a').attr('stroke-width',2).attr('stroke-dasharray','6 4');
 svg.append('g').selectAll('circle').data(d).enter().append('circle').attr('cx',function(r){return x(xf(r))}).attr('cy',function(r){return y(r.deaths_rate)})
  .attr('r',function(r){return r.kind==='republic'?6:5}).attr('fill',function(r){return r.kind==='republic'?'none':RAMP[2]})
  .attr('stroke',function(r){return r.kind==='republic'?RAMP[1]:'#0b1526'}).attr('stroke-width',function(r){return r.kind==='republic'?2.5:.8})
  .attr('data-tip',function(r){return '<b>'+esc(r.en)+'</b><br>'+esc(xlab)+': '+xfmt(xf(r))+'<br>'+fmt(r.deaths_rate,1)+' named dead per 100,000'+(r.kind==='republic'?'<br>Ethnic republic':'')});
 var placed=[];(labels||[]).forEach(function(iso){var r=byIso[iso];if(!r||xf(r)==null)return;var px=x(xf(r)),py=y(r.deaths_rate),right=px<w*0.6;
  var nm=r.en.replace('Republic of ','').replace(' Republic','').replace(' (city)','').replace(' Autonomous Okrug','');if(nm==='Chechen')nm='Chechnya';var lw=nm.length*7.6,x0=right?px+9:px-9-lw,box=[x0,py-8-15,x0+lw,py-8+4];
  if(placed.some(function(b){return box[0]<b[2]+4&&box[2]>b[0]-4&&box[1]<b[3]+2&&box[3]>b[1]-2}))return;placed.push(box);
  svg.append('text').attr('x',right?px+9:px-9).attr('y',py-8).attr('text-anchor',right?'start':'end').text(nm)})
}
var LEG='<li><span class="dot"></span>Region</li><li><span class="ring"></span>Ethnic republic</li><li><span class="ln"></span>Straight-line fit</li>';
function drawScatters(){
 scatter('#sc-dist',function(r){return r.dist_km},'Distance from Moscow, km',function(v){return fmt(v)},['RU-TY','RU-CHU','RU-MOW','RU-CE','RU-ZAB']);
 scatter('#sc-wage',function(r){return r.wage},'Average monthly wage 2025, roubles',function(v){return fmt(v/1000)+'k'},['RU-CHU','RU-MOW','RU-TY','RU-CE','RU-MAG']);
 scatter('#sc-eth',function(r){return r.ru_share},'Ethnic Russian share of residents, %',function(v){return fmt(v)},['RU-TY','RU-CE','RU-BU','RU-MOW']);
}
function drawAll(){drawMap();recolor();drawScatters()}

function init(res){
 R=res[0].regions;S=res[1];G=res[2];tipEl=$('#tip');
 R.forEach(function(r){byNe[r.ne]=r;byIso[r.iso]=r});
 // desktop: everything open; phone: only the map section open, map options behind one button
 var ph=phone();document.querySelectorAll('details.sec').forEach(function(d){d.open=!ph||d.id==='remote-sec'||d.id==='map-sec'});
 $('#mapside').open=!ph;
 $('#legend').innerHTML=legendHTML('deaths');$('#legend2').innerHTML=legendHTML('deaths');
 ['#leg-s1','#leg-s2','#leg-s3'].forEach(function(s){$(s).innerHTML=LEG});
 $('#legend3').innerHTML='<li><span class="sw" style="background:var(--r3)"></span>Firm amount</li><li><span class="sw dash"></span>Ends 31 Oct 2026, card over 30 days old, a range, or a media report</li>';
 document.querySelectorAll('.chipb[data-metric]').forEach(function(b){b.addEventListener('click',function(){
  metric=b.dataset.metric;document.querySelectorAll('.chipb[data-metric]').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});recolor()})});
 $('#reset').addEventListener('click',function(){if(svgMap)svgMap.transition().duration(350).call(zoom.transform,d3.zoomIdentity)});
 $('#closepanel').addEventListener('click',closePanel);
 $('#rankmore').addEventListener('click',function(){rankAll=!rankAll;drawRank()});
 $('#bonusmore').addEventListener('click',function(){bonusAll=!bonusAll;drawBonus()});
 $('#firmonly').addEventListener('click',function(){firmOnly=!firmOnly;this.setAttribute('aria-pressed',firmOnly?'true':'false');drawBonus()});
 bindTips();drawAll();drawRank();drawGroupBars();drawBonus();drawTypeBars();
 document.querySelectorAll('details.sec').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)drawAll()})});
 var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(drawAll,150)});
 document.documentElement.setAttribute('data-ready','1');
}
Promise.all(['data/regions.json','data/stats.json','vendor/ru_admin1.geojson'].map(function(u){return fetch(u).then(function(r){return r.json()})})).then(init)
 .catch(function(e){console.error(e);document.querySelector('main').insertAdjacentHTML('afterbegin','<p class="notice">The data failed to load.</p>')});
})();
