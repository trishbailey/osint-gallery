/* Cartel colour system (Trish 2026-10-27: every colour clearly distinct, no greys, no two shades of one hue family).
   14 plain hue families, one per map group that needs its own: the 7 Mexican groups first, then Clan del Golfo, ELN, FARC dissidents, PCC, Los Lobos, MS-13 and Comando Vermelho (periwinkle #b2ade1).
   Small, distant groups reuse the hex of a plain group in another country and carry a texture (dots/grid/stripes) instead of a new hue.
   Pairwise CIEDE2000 between the 14 plain colours >= 23, >= 25 from every route line colour. Checked by pipeline/palette_check.py. */
window.TERR_FILL={b18:"#0c9d8b",cdn:"#8c9e4b",choneros:"#f14510",cjng:"#265499",clan:"#289ddc",cv:"#b2ade1",eln:"#0c9d8b",exfarc:"#6f5f10",gulf:"#e4921d",haiti:"#e4175e",juarez:"#126736",lnfm:"#e743f5",lobos:"#e4175e",ms13:"#831dce",pcc:"#f14510",sinaloa:"#f6a696",tda:"#831dce",unidos:"#844332"};
/* map groups that share a hex with a distant plain group carry a texture; no two share both hex and texture (Mexican groups always plain) */
window.TERR_PAT={b18:"dots",choneros:"dots",haiti:"grid",tda:"dots"};
/* Groups that only appear in the network graph and the timeline: they take the hex of the plain group they descend from, plus a texture that is unique within that hex. */
window.CARTEL_FALL={guadalajara:"#f6a696",tijuana:"#126736",chapitos:"#f6a696",mayiza:"#f6a696",zetas:"#e4921d",familia:"#e743f5",viagras:"#844332",soles:"#831dce",auc:"#289ddc",farc:"#6f5f10",segmar:"#6f5f10",chone_killers:"#f14510",los_tiguerones:"#f14510",gran_grif:"#e4175e",cmln:"#0c9d8b"};
window.CARTEL_TEX={guadalajara:"dots",tijuana:"dots",chapitos:"stripes",mayiza:"grid",zetas:"dots",familia:"dots",viagras:"dots",soles:"stripes",auc:"dots",farc:"dots",segmar:"stripes",chone_killers:"stripes",los_tiguerones:"grid",gran_grif:"stripes",cmln:"grid"};
window.CARTEL_ALIAS={viv_ansanm:"haiti"};
/* id -> hex / texture for the network graph, timeline and legends (map groups use TERR_FILL and TERR_PAT; viv_ansanm is the haiti map group) */
window.cartelColor=id=>{const k=window.CARTEL_ALIAS[id]||id;return window.TERR_FILL[k]||window.CARTEL_FALL[id]||"#ff9f1c"};
window.cartelTex=id=>{const k=window.CARTEL_ALIAS[id]||id;return window.TERR_PAT[k]||window.CARTEL_TEX[id]||null};
/* SVG pattern for a hex + texture inside <defs> (d3 selection); returns a paint value. Dark ink on light fills, light ink on dark fills. */
window.cartelPaint=(defs,hex,kind,ns)=>{if(!kind)return hex;const id=(ns||"cp")+"-"+kind+"-"+hex.slice(1);
  if(defs.select("#"+id).empty()){const L=d3.lab(hex).l,ink=L<48?"#ffffff":"#0b1526",op=L<48?.5:.6,p=defs.append("pattern").attr("id",id).attr("patternUnits","userSpaceOnUse").attr("width",6).attr("height",6);
    p.append("rect").attr("width",6).attr("height",6).attr("fill",hex);
    if(kind==="grid")p.append("path").attr("d","M0 .5H6M.5 0V6").attr("stroke",ink).attr("stroke-opacity",op).attr("stroke-width",1).attr("fill","none");
    else if(kind==="stripes"){p.attr("patternTransform","rotate(45)");p.append("rect").attr("width",6).attr("height",2).attr("fill",ink).attr("fill-opacity",op)}
    else p.append("circle").attr("cx",3).attr("cy",3).attr("r",1.3).attr("fill",ink).attr("fill-opacity",op)}
  return `url(#${id})`};
/* CSS background (hex + texture) for legend dots and chips */
window.cartelBg=id=>{const c=window.cartelColor(id),k=window.cartelTex(id),L=d3.lab(c).l,d=L<48?"rgba(255,255,255,.5)":"rgba(11,21,38,.6)";
  return k==="grid"?`linear-gradient(${d} 1px,transparent 1px) 0 0/6px 6px,linear-gradient(90deg,${d} 1px,transparent 1px) 0 0/6px 6px,${c}`:k==="stripes"?`repeating-linear-gradient(45deg,${d} 0 2px,transparent 2px 6px),${c}`:k?`radial-gradient(${d} 1.3px,transparent 1.7px) 0 0/6px 6px,${c}`:c};
