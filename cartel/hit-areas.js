/* Added by scripts/sync_dashboards.py to the synced Cartel dashboard (it is built from another repo, so the fix lives here).
   Problem: a long or curved map region (Manabi, Veracruz) or a route line or network-link curve has its middle outside its own outline,
   so a click or tap in the middle of it lands on the bare map and nothing opens. Fix: under each such shape put an
   invisible convex-hull click area that passes the click to the shape's own handler. Shapes whose middle is already
   inside them are left alone. Adds no visible element and no colour. */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var x = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, h = [], i, p;
    for (i = 0; i < pts.length; i++) { p = pts[i]; while (h.length > 1 && x(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }
    var n = h.length + 1;
    for (i = pts.length - 2; i >= 0; i--) { p = pts[i]; while (h.length >= n && x(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }
    h.pop(); return h;
  }
  function sample(el) {
    var len = el.getTotalLength(), n = Math.min(400, Math.max(24, Math.round(len / 4))), out = [], i, p;
    for (i = 0; i <= n; i++) { p = el.getPointAtLength(len * i / n); out.push([p.x, p.y]); }
    return out;
  }
  function needsHalo(el, stroked) {
    var b = el.getBBox(), svg = el.ownerSVGElement, pt = svg.createSVGPoint();
    pt.x = b.x + b.width / 2; pt.y = b.y + b.height / 2;
    if (b.width < 3 || b.height < 3) return false;
    return !(stroked ? el.isPointInStroke(pt) : el.isPointInFill(pt));
  }
  function halo(el, target, stroked) {
    if (!el.getClientRects().length) return;  /* layer switched off: try again when it is shown */
    el.setAttribute("data-halo", "1");
    var h;
    try { if (!needsHalo(el, stroked)) return; h = hull(sample(el)); } catch (e) { return; }
    if (h.length < 3) return;
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M" + h.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join("L") + "Z");
    p.setAttribute("class", "hitarea");
    p.setAttribute("fill", "transparent"); p.setAttribute("stroke", "none");
    p.style.cursor = "pointer";
    var t = el.querySelector("title") || (target && target.querySelector("title"));
    if (t) p.appendChild(t.cloneNode(true));
    p.addEventListener("click", function () { target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); });
    el.parentNode.insertBefore(p, el);  /* underneath: the shape itself still wins wherever it is under the pointer */
  }
  function scan() {
    document.querySelectorAll("#mapsvg path.adm:not([data-halo])").forEach(function (el) {
      if (el.style.cursor === "pointer") halo(el, el, false); else el.setAttribute("data-halo", "0");
    });
    document.querySelectorAll("#mapsvg path.ovl:not([data-halo])").forEach(function (el) {  /* route lines */
      if (el.style.cursor === "pointer") halo(el, el, true);
    });
    document.querySelectorAll("#netsvg g.ne").forEach(function (g) {
      var el = g.querySelectorAll("path")[1];
      if (el && !el.hasAttribute("data-halo")) halo(el, g, true);
    });
  }
  var timer;
  function later() { clearTimeout(timer); timer = setTimeout(scan, 250); }
  function start() {
    scan();
    var mo = new MutationObserver(later);
    ["mapsvg", "netsvg"].forEach(function (id) { var s = document.getElementById(id); if (s) mo.observe(s, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] }); });
  }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
