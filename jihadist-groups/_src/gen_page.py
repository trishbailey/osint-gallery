#!/usr/bin/env python3
"""Write ../index.html. The page is a static shell; app.js fills it from data.json."""
import pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "index.html"

HTML = '''<!doctype html><html lang="en"><head><script data-slash-fix>if(location.pathname==="/jihadist-groups")location.replace("/jihadist-groups/"+location.search+location.hash);</script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-Z61EKRP8QV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Z61EKRP8QV');
</script>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jihadist Groups: Who's Who | Beacon Intelligence Group</title>
<meta name="description" content="45 jihadist groups in four families: leaders, locations, links, the last 30 days and momentum.">
<meta property="og:title" content="Jihadist Groups: Who's Who"><meta property="og:image" content="og.png">
<link rel="stylesheet" href="style.css"></head><body>
<header><div><a class="brand" href="https://beaconintelligencegroup.com"><span class="mark">BEACON</span> INTELLIGENCE GROUP<span class="brand-sub">JIHADIST GROUPS</span></a><h1>Jihadist Groups: Who's Who</h1></div>
<nav aria-label="Sections"><a href="#map">Map</a><a href="#links">Links between groups</a><a href="#leaders">Leaders</a><a href="#incidents">Last 30 days</a><a href="#momentum">Momentum</a><a href="#take">Takeaway</a><a href="#sources">Sources</a></nav></header>
<p class="lead" id="lede"><span id="intro">Loading.</span> Data as of <span id="asof"></span>.</p>
<main>
<p id="err" class="tile" hidden>The data file could not be loaded. Reload the page to try again.</p>
<section class="kpis" id="kpis" aria-label="Headline numbers"></section>

<section class="tile" id="map" aria-label="Map of the groups">
<div class="mapgrid">
<aside class="side" aria-label="Map filters">
<h3>Family</h3><div class="group fam4" id="famBtns"></div>
<h3>Show</h3><div class="group">
<button class="fbtn" type="button" id="dormBtn" aria-pressed="true"></button>
<button class="fbtn" type="button" id="incBtn" aria-pressed="false" style="--c:#e6e9ef"><span class="sw sq" style="transform:rotate(45deg) scale(.8);--c:#e6e9ef"></span>Last 30 days incidents<span class="ct">21</span></button></div>
<div class="hidephone"><h3>Key</h3><div class="keyrow"><span class="sw" style="--c:#8fa3c4"></span>Group</div><div class="keyrow"><span class="sw ring"></span>Now governing</div><div class="keyrow"><span class="sw dia" style="--c:#8fa3c4"></span>Incident, in its family colour</div></div>
</aside>
<div>
<figure>
<div class="mapwrap" id="mapwrap"><svg id="mapsvg" role="img" aria-label="World map with one marker per group, coloured by family"></svg>
<div class="zoom"><button class="btn" type="button" id="zin" aria-label="Zoom in">+</button><button class="btn" type="button" id="zout" aria-label="Zoom out">−</button><button class="btn" type="button" id="zreset">Reset view</button></div></div>
<figcaption id="mapcap"></figcaption></figure>
<div class="regions" id="regions" role="group" aria-label="Zoom to a region"></div>
<p class="muted">Drag to pan, scroll or pinch to zoom. Markers sit at the centre of each group's operating area and are spread apart where they overlap. Tap a marker for the leader card.</p>
<div class="bars"><h3 id="barstitle"></h3><div id="bars"></div><p class="muted" id="barsnote"></p></div>
</div></div></section>

<section class="tile" id="links"><h2>Links between groups</h2>
<p>Groups fight, cooperate, fund and split from each other, and most links run inside one family. Solid lines are documented links and dashed lines are reported ones. Arrows point from the supplier or parent to the receiver or affiliate. Hover or tap a node or a line for the detail.</p>
<div class="mapgrid hidephone">
<aside class="side" aria-label="Link filters"><h3>Link type</h3><div class="group" id="typeBtns"></div>
<h3>Node colour</h3><div id="gkeyfam"></div>
<div class="keyrow"><span class="sw ring"></span>Now governing</div>
<div class="keyrow"><span class="sw" style="background:transparent;border:3px solid #e6e9ef"></span>Outside actor (state or non-Islamist partner)</div>
<p class="muted">Use the family buttons above the map to hide a family here too.</p></aside>
<figure><div class="graphwrap" id="graphwrap"><svg id="graphsvg" role="img" aria-label="Network of links between groups"></svg></div></figure></div>
<div class="relist" id="relist" aria-label="Links between groups, as a list"></div></section>

<section class="tile" id="leaders"><h2>Leaders and recent changes</h2>
<p>Six top leaders were replaced or removed in the last 24 months, and the cards below show who leads each group today. Open a card's More section for strength, momentum and contested facts.</p>
<h3>Leadership changes, newest first</h3><div class="changes" id="changes"></div>
<div id="families"></div></section>

<section class="tile" id="incidents"><h2>Last 30 days</h2>
<p>Most of the major incidents in the last 30 days fall in Africa, and the Sahel alone has the most. Turn on the incident layer on the map to see where each one happened.</p>
<div id="stories"></div><p class="muted" id="storynote"></p></section>

<section class="tile" id="momentum"><h2>Momentum</h2>
<p>Each group is placed by the direction of its strength and reach over the past year. Hover or tap a group to read the reason.</p>
<div class="mom" id="mom"></div></section>

<section class="tile take" id="take"><h2>Takeaway</h2><div id="takebody"></div>
<p class="muted" id="confnote"></p><p class="muted" id="gaps"></p></section>

<section class="tile" id="sources"><details id="srcdet"><summary><h2>Data Sources</h2></summary>
<ol class="fnlist" id="srclist"></ol>
<h3 style="margin-top:14px">Image credits</h3><ul class="cred" id="credlist"></ul>
<p class="muted">Full data file: <a href="data.json">data.json</a>. Group, link, incident and momentum records are in one file.</p></details></section>
</main>
<footer class="foot"><a class="brand" href="https://beaconintelligencegroup.com"><span class="mark">BEACON</span> INTELLIGENCE GROUP</a><p>Descriptive analysis only, from public sources. Basemap: Natural Earth (public domain). Source titles link to their publishers.</p></footer>
<aside id="panel" role="dialog" aria-label="Group details" aria-hidden="true"><button class="btn x" type="button" id="pclose">Close</button><div id="pbody"></div></aside>
<div id="tip" class="tip" role="tooltip" hidden></div>
<script src="vendor/d3.min.js"></script><script src="app.js"></script></body></html>
'''
OUT.write_text(HTML)
print("wrote", OUT)
