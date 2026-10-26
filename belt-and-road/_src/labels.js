()=>{const L=c=>{const v=c.match(/\d+(\.\d+)?/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 const bg=[L('rgb(11,21,38)'),L('rgb(15,27,49)'),L('rgb(27,44,74)')];const out=[];
 document.querySelectorAll('svg#map text').forEach(t=>{const b=t.getBoundingClientRect();if(!b.width)return;
  const px=parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a;const f=L(getComputedStyle(t).fill);
  const cr=Math.min(...bg.map(g=>(Math.max(f,g)+.05)/(Math.min(f,g)+.05)));out.push({t:t.textContent,px,cr});});
 return {n:out.length,minPx:out.length?Math.min(...out.map(o=>o.px)):null,minContrast:out.length?Math.min(...out.map(o=>o.cr)):null,bad:out.filter(o=>o.px<12.95||o.cr<4.5).slice(0,10)};}
