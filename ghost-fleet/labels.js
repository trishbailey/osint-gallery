// Place-name label layout shared by the Leaflet maps (story.js) and the Pacific shuttle map (shuttle.js).
// Plain light text, no box. Each label is tried in the open sea next to its place (then with a leader line),
// and is dropped when it would touch a route, a dot, a callout, another label, or land that is not its own country.
window.GFL=(function(){
const S=.5; // raster scale: 1 raster pixel = 2 css pixels
function mk(w,h){const c=document.createElement("canvas");c.width=Math.max(1,Math.ceil(w*S));c.height=Math.max(1,Math.ceil(h*S));const x=c.getContext("2d",{willReadFrequently:true});x.scale(S,S);return[c,x]}
// summed-area table: hit(l,t,r,b) is true when any 'bad' raster pixel lies in the css-pixel rectangle (or the rectangle leaves the map)
function sat(w,h,bad){const W=w+1,T=new Uint32Array(W*(h+1));
 for(let y=1;y<=h;y++){let row=0;for(let x=1;x<=w;x++){row+=bad((y-1)*w+(x-1))?1:0;T[y*W+x]=T[(y-1)*W+x]+row}}
 return{hit(l,t,r,b){const x0=Math.floor(l*S),x1=Math.ceil(r*S),y0=Math.floor(t*S),y1=Math.ceil(b*S);
  if(x0<0||y0<0||x1>w||y1>h)return true;if(x1<=x0||y1<=y0)return false;
  return T[y1*W+x1]-T[y0*W+x1]-T[y1*W+x0]+T[y0*W+x0]>0}}}
const DIRS=[[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1],[-1,-1],[-1,1]];
const segX=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};
// o: {w,h,pad,land(ctx,fill),obst(ctx,pad),items:[{kind:"nation"|"city",key,ax,ay,w,h}]}; items are in priority order and their w,h must be measured.
// Returns the same items with .at={l,t,lead:[x1,y1,x2,y2]|null,dot:bool} set on those that fit.
function layout(o){
 const w=o.w,h=o.h,pad=o.pad==null?4:o.pad,keys=[],kid=k=>{let i=keys.indexOf(k);if(i<0){keys.push(k);i=keys.length-1}return i+1};
 const[lc,lx]=mk(w,h);o.land(lx,k=>{const i=kid(k);return`rgb(${i&255},${i>>8},0)`});
 const RW=lc.width,RH=lc.height,ld=lx.getImageData(0,0,RW,RH).data,idAt=i=>ld[i*4]+(ld[i*4+1]<<8);
 const landSat=sat(RW,RH,i=>ld[i*4+3]>0),own={},inside={};
 const ownSat=k=>own[k]||(own[k]=sat(RW,RH,i=>!(ld[i*4+3]===0||(ld[i*4+3]===255&&idAt(i)===kid(k)))));
 const inSat=k=>inside[k]||(inside[k]=sat(RW,RH,i=>!(ld[i*4+3]===255&&idAt(i)===kid(k))));
 const[oc,ox]=mk(w,h);ox.fillStyle=ox.strokeStyle="#000";o.obst(ox,pad);const od=ox.getImageData(0,0,oc.width,oc.height).data,obSat=sat(oc.width,oc.height,i=>od[i*4+3]>0);
 const placed=[],leads=[];
 const free=(r,lead)=>{if(obSat.hit(r.l,r.t,r.r,r.b))return false;
  for(const p of placed)if(r.l<p.r+pad&&r.r>p.l-pad&&r.t<p.b+pad&&r.b>p.t-pad)return false;
  const ln=lead?[lead.slice(0,2),lead.slice(2)]:null;
  if(lead){const L=Math.hypot(lead[2]-lead[0],lead[3]-lead[1]);
   for(let d=10;d<L;d+=3){const x=lead[0]+(lead[2]-lead[0])*d/L,y=lead[1]+(lead[3]-lead[1])*d/L;if(obSat.hit(x-1,y-1,x+1,y+1))return false;
    if(placed.some(p=>x>p.l-2&&x<p.r+2&&y>p.t-2&&y<p.b+2))return false}
   if(leads.some(q=>segX(ln[0],ln[1],q[0],q[1])))return false}
  for(const q of leads){const a=[q[0][0],q[0][1]],b=[q[1][0],q[1][1]];for(let t=0;t<=1;t+=.05){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;if(x>r.l-2&&x<r.r+2&&y>r.t-2&&y<r.b+2)return false}}
  return true};
 const rectAt=(it,dx,dy,g)=>{const l=dx>0?it.ax+g:dx<0?it.ax-g-it.w:it.ax-it.w/2,t=dy>0?it.ay+g:dy<0?it.ay-g-it.h:it.ay-it.h/2;return{l,t,r:l+it.w,b:t+it.h}};
 const leadOf=(it,r,g)=>{if(g<=14)return null;const cx=Math.max(r.l,Math.min(it.ax,r.r)),cy=Math.max(r.t,Math.min(it.ay,r.b)),L=Math.hypot(cx-it.ax,cy-it.ay)||1,s=5;
  return[it.ax+(cx-it.ax)*s/L,it.ay+(cy-it.ay)*s/L,cx,cy]};
 const put=(it,r,g)=>{const lead=leadOf(it,r,g);it.at={l:r.l,t:r.t,lead,dot:!!lead&&!obSat.hit(it.ax-3,it.ay-3,it.ax+3,it.ay+3)};placed.push(r);if(lead)leads.push([lead.slice(0,2),lead.slice(2)])};
 // sea (or, as a second pass, the place's own country) next to an anchor, nearest first
 const around=(it,gaps,okLand)=>{for(const g of gaps)for(const[dx,dy]of DIRS){const r=rectAt(it,dx,dy,g),lead=leadOf(it,r,g);
   if(okLand(r)||!free(r,lead))continue;put(it,r,g);return true}return false};
 const GAPS=[10,22,38,56,80],FAR=[26,46,70,100,140];
 o.items.forEach(it=>{
  if(it.ax<0||it.ay<0||it.ax>w||it.ay>h)return;
  if(it.kind==="city"){
   if(around(it,GAPS,r=>landSat.hit(r.l,r.t,r.r,r.b)))return;
   if(it.key)around(it,GAPS,r=>ownSat(it.key).hit(r.l,r.t,r.r,r.b));return}
  // nation: inside its own outline if the whole name fits there, else out at sea with a leader
  const id=kid(it.key),pts=[];let sx=0,sy=0;
  for(let y=0;y<RH;y+=4)for(let x=0;x<RW;x+=4){const i=y*RW+x;if(ld[i*4+3]===255&&idAt(i)===id){pts.push([x/S,y/S]);sx+=x/S;sy+=y/S}}
  if(!pts.length)return;
  const px=it.px!=null?it.px:sx/pts.length,py=it.py!=null?it.py:sy/pts.length,ns=inSat(it.key);
  pts.sort((a,b)=>Math.hypot(a[0]-px,a[1]-py)-Math.hypot(b[0]-px,b[1]-py));
  for(const p of pts){const r={l:p[0]-it.w/2,t:p[1]-it.h/2,r:p[0]+it.w/2,b:p[1]+it.h/2};if(ns.hit(r.l,r.t,r.r,r.b)||!free(r,null))continue;put(it,r,0);return}
  const a=pts[0];const it2={ax:a[0],ay:a[1],w:it.w,h:it.h};it2.at=null;
  if(around(it2,FAR,r=>landSat.hit(r.l,r.t,r.r,r.b))){it.at=it2.at}})
 return o.items}
return{layout}})();
