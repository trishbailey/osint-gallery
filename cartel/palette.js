/* Distinct cartel colours for groups without a territory.json map colour (no greys). */
window.CARTEL_FALL={guadalajara:"#8e71bd",zetas:"#5c6bff",chapitos:"#ffffff",mayiza:"#00f62c",unidos:"#fd7db7",viagras:"#bb8f32",soles:"#af34b2",segmar:"#faff5d",chone_killers:"#5894f2",los_tiguerones:"#cf50ff",viv_ansanm:"#19f4e6",gran_grif:"#665522",cmln:"#ff377e",haiti:"#19f4e6"};
/* Mid-tone area-fill palette for group presence on the dark map (Trish 2026-10-26: not dull, not neon; CIELAB L* 45-65, HSL sat 0.4-0.7, never grey).
   Pairwise CIEDE2000 >= 14 (largest reachable for 17 fills under these limits; 20 is the target) and >= 25 from every route colour at every presence level,
   which rules out pinks/purples next to the magenta and hot-pink routes. Lines, routes, dots and labels keep the bright group colours. Checked by pipeline/palette_check.py. */
window.TERR_FILL={sinaloa:"#78961e",cjng:"#36a8ba",gulf:"#d88a2a",cdn:"#187e18",lnfm:"#2472b4",juarez:"#1e7e90",clan:"#489cde",eln:"#5a5ade",exfarc:"#9096d2",tda:"#1ea854",choneros:"#de784e",lobos:"#966c1e",pcc:"#247860",cv:"#9c5a42",ms13:"#b49c30",b18:"#6c7230",haiti:"#30ae96"};
