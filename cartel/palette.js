/* Distinct cartel colours for groups without a territory.json map colour (no greys). */
window.CARTEL_FALL={guadalajara:"#8e71bd",zetas:"#5c6bff",chapitos:"#ffffff",mayiza:"#00f62c",unidos:"#fd7db7",viagras:"#bb8f32",soles:"#af34b2",segmar:"#faff5d",chone_killers:"#5894f2",los_tiguerones:"#cf50ff",viv_ansanm:"#19f4e6",gran_grif:"#665522",cmln:"#ff377e",haiti:"#19f4e6"};
/* Mid-tone area-fill palette for group presence on the dark map (Trish 2026-10-26: not dull, not neon; CIELAB L* 45-65, HSL sat 0.4-0.7, never grey).
   Pairwise CIEDE2000 >= 17 (largest reachable for 17 fills under these limits; 20 is the target) and >= 25 from every route colour at every presence level,
   routes are yellow (drugs), lime (human smuggling) and cyan (firearms), so mid-tone pinks/purples are allowed. Lines, routes, dots and labels keep the bright group colours. Checked by pipeline/palette_check.py. */
window.TERR_FILL={b18:"#e47e90",cdn:"#1e7e18",choneros:"#d88460",cjng:"#489cde",clan:"#9690d8",cv:"#d82a30",eln:"#9048c6",exfarc:"#e466d8",gulf:"#cc902a",haiti:"#1e7890",juarez:"#1e7866",lnfm:"#3666d2",lobos:"#90603c",ms13:"#8a9c42",pcc:"#c03078",sinaloa:"#786c24",tda:"#36ae7e"};
