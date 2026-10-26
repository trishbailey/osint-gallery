/* Distinct cartel colours for groups without a territory.json map colour (no greys). */
window.CARTEL_FALL={guadalajara:"#8e71bd",zetas:"#5c6bff",chapitos:"#ffffff",mayiza:"#00f62c",unidos:"#fd7db7",viagras:"#a0785a",soles:"#af34b2",segmar:"#faff5d",chone_killers:"#5894f2",los_tiguerones:"#cf50ff",viv_ansanm:"#7171d0",gran_grif:"#665522",cmln:"#ff377e",haiti:"#7171d0"};
/* Mid-tone area-fill palette for group presence on the dark map (Trish 2026-10-26: not dull, not neon; CIELAB L* 45-65, HSL sat 0.4-0.7, never grey).
   Pairwise CIEDE2000 >= 17 (largest reachable for 17 fills under these limits; 20 is the target) and >= 25 from every route colour at every presence level,
   routes are yellow (drugs), lime (human smuggling) and cyan (firearms), so mid-tone pinks/purples are allowed. Lines, routes, dots and labels keep the bright group colours. Checked by pipeline/palette_check.py. */
window.TERR_FILL={b18:"#236a74",cdn:"#276d22",choneros:"#8c8c2b",cjng:"#8da2e9",clan:"#bc91e9",cv:"#805720",eln:"#228e94",exfarc:"#c02270",gulf:"#bc8a24",haiti:"#7171d0",juarez:"#50b88c",lnfm:"#a33986",lobos:"#d36135",ms13:"#9c4826",pcc:"#7b983f",sinaloa:"#dd8d8d",tda:"#d3987e"};
