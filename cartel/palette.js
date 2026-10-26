/* Distinct cartel colours for groups without a territory.json map colour (no greys). */
window.CARTEL_FALL={guadalajara:"#8e71bd",zetas:"#5c6bff",chapitos:"#ffffff",mayiza:"#00f62c",unidos:"#8f512f",viagras:"#ffb3c1",soles:"#af34b2",segmar:"#faff5d",chone_killers:"#5894f2",los_tiguerones:"#cf50ff",viv_ansanm:"#b94f67",gran_grif:"#665522",cmln:"#ff377e",haiti:"#b94f67"};
/* Mid-tone area-fill palette for group presence on the dark map (Trish 2026-10-26: not dull, not neon; CIELAB L* 45-65, HSL sat 0.4-0.7, never grey).
   Pairwise CIEDE2000 >= 17 (largest reachable for 17 fills under these limits; 20 is the target) and >= 25 from every route colour at every presence level,
   routes are yellow (drugs), lime (human smuggling) and cyan (firearms), so mid-tone pinks/purples are allowed. Lines, routes, dots and labels keep the bright group colours. Checked by pipeline/palette_check.py. */
window.TERR_FILL={b18:"#2d7377",cdn:"#167118",choneros:"#c46b2a",cjng:"#99a1d9",clan:"#3788c2",cv:"#be224e",eln:"#166c64",exfarc:"#758a23",gulf:"#b58f39",haiti:"#b94f67",juarez:"#24b58a",lnfm:"#c12880",lobos:"#df73a5",ms13:"#5550c1",pcc:"#da7531",sinaloa:"#e38b82",tda:"#a763c7",unidos:"#8f512f"};
/* groups that share a hue family with a distant plain group carry a texture so no two fills look alike (Trish 2026-10-26) */
window.TERR_PAT={b18:"dots",choneros:"dots",cv:"dots",haiti:"grid",tda:"dots"};
