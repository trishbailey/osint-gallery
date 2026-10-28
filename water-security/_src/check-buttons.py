#!/usr/bin/env python3
"""Click every visible control on the water-security page.

Fails if a control is shown in a view where it reveals nothing: a weapon
filter with no matching arrow, an empty History block, a zoom button that
does not change scale, a basin chip that opens an empty panel, or a removed
layer toggle that has come back.
"""
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/water-security/"
CHROME = "/usr/local/bin/google-chrome"
# Region name -> weapon categories that name both ends of a pair.
EXPECT = {}


def click(locator):
    locator.evaluate("el => el.scrollIntoView({block:'center', inline:'nearest'})")
    locator.click(timeout=8000)


def visible(page, sel):
    return page.evaluate(
        """(sel) => [...document.querySelectorAll(sel)].filter(el => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none';
        }).length""",
        sel,
    )


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-gpu"])
        for width, height in ((1280, 900), (390, 844)):
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto(URL, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_selector("#regions svg.chart", timeout=60000)
            phone = width < 700

            gone = page.evaluate(
                """() => [...document.querySelectorAll('button')].map(b => b.textContent.replace(/\\s+/g,' ').trim())
                  .filter(t => /^(River water|Dams|Aquifers)$/.test(t))"""
            )
            if gone:
                fails.append(f"{width}: layer toggles still rendered {gone}")

            regions = page.locator("#side-regions button")
            nreg = regions.count()
            for i in range(nreg):
                name = regions.nth(i).inner_text().strip()
                if phone:
                    if page.locator("#side").evaluate("el => !el.classList.contains('open')"):
                        click(page.locator("#side-toggle"))
                        page.wait_for_timeout(80)
                click(regions.nth(i))
                page.wait_for_timeout(120)
                buttons = page.evaluate(
                    """() => [...document.querySelectorAll('#layers-weapon button')].map(b => ({
                      lay: b.dataset.lay,
                      shown: b.getBoundingClientRect().height > 2
                    }))"""
                )
                lays = {b["lay"] for b in buttons if b["shown"] or not phone}
                # On a phone the key may still be measured after opening.
                lays = {b["lay"] for b in buttons}
                if lays != EXPECT.get(name, set()):
                    fails.append(f"{width} {name}: weapon buttons {sorted(lays)} expected {sorted(EXPECT.get(name, set()))}")
                marks = page.evaluate(
                    """() => {
                      const reg = [...document.querySelectorAll('#regions .region')].find(r => getComputedStyle(r).display !== 'none');
                      if (!reg) return null;
                      const n = k => reg.querySelectorAll('.' + k).length;
                      const cut = reg.querySelector('.lay-cut');
                      const threat = reg.querySelector('.lay-threat');
                      return {cut: n('lay-cut'), threat: n('lay-threat'), neither: n('lay-neither'), lever: n('lay-lever'),
                        cutStroke: cut && cut.getAttribute('stroke'),
                        threatStroke: threat && threat.getAttribute('stroke')};
                    }"""
                )
                if not marks or marks["lever"] < 1:
                    fails.append(f"{width} {name}: no lever arrow on the map {marks}")
                for lay in lays:
                    if not marks or marks.get(lay, 0) < 1:
                        fails.append(f"{width} {name}: {lay} button has no arrow")
                if name.startswith("Nile") and marks:
                    if marks["cut"]:
                        fails.append(f"{width} Nile map still has a cut-off arrow")
                    if marks["threatStroke"] and marks["threatStroke"].lower() in ("#ef4b4b", "red"):
                        fails.append(f"{width} Nile threat stroke is red")
                # Toggle each weapon button and require the layer to hide, then show again.
                for lay in list(lays):
                    click(page.locator(f"#layers-weapon button[data-lay='{lay}']"))
                    hidden = page.evaluate(
                        """(lay) => {
                          const reg = [...document.querySelectorAll('#regions .region')].find(r => getComputedStyle(r).display !== 'none');
                          const el = reg && reg.querySelector('.' + lay);
                          return !el || getComputedStyle(el).display === 'none';
                        }""",
                        "lay-" + lay,
                    )
                    if not hidden:
                        fails.append(f"{width} {name}: turning off {lay} left it visible")
                    click(page.locator(f"#layers-weapon button[data-lay='{lay}']"))
                if phone:
                    page.evaluate(
                        """() => {
                          document.getElementById('side').classList.remove('open');
                          document.getElementById('side-toggle').setAttribute('aria-expanded','false');
                          document.getElementById('sheet-back').classList.remove('on');
                          document.body.classList.remove('sheet-open');
                        }"""
                    )
                    page.wait_for_timeout(40)

            # Every basin control opens a panel with a map. On a phone the basin
            # list is inside the sheet, so the visible control is the jump on the map.
            if phone:
                opens = page.evaluate(
                    """() => {
                      const out = [];
                      document.querySelectorAll('#regions .region').forEach((reg, ri) => {
                        reg.querySelectorAll('button.jump').forEach((b, ji) => out.push({ri, ji, label: b.textContent.trim()}));
                      });
                      return out;
                    }"""
                )
            else:
                opens = [{"label": page.locator("#chips button").nth(i).inner_text().strip(), "i": i} for i in range(page.locator("#chips button").count())]
            for spec in opens:
                label = spec["label"]
                if phone:
                    page.evaluate(
                        """() => {
                          document.getElementById('s-panel').classList.remove('sheet');
                          document.getElementById('sheet-back').classList.remove('on');
                          document.body.classList.remove('sheet-open');
                          document.getElementById('side').classList.remove('open');
                        }"""
                    )
                    page.evaluate("(ri) => document.querySelectorAll('#side-regions button')[ri].click()", spec["ri"])
                    page.wait_for_timeout(60)
                    page.evaluate(
                        """(ji) => {
                          const reg = [...document.querySelectorAll('#regions .region')].find(r => getComputedStyle(r).display !== 'none');
                          reg.querySelectorAll('button.jump')[ji].click();
                        }""",
                        spec["ji"],
                    )
                else:
                    click(page.locator("#chips button").nth(spec["i"]))
                page.wait_for_selector("#panel svg.chart", timeout=20000)
                panel = page.evaluate(
                    """() => {
                      const h = document.querySelector('#panel h3');
                      const svg = document.querySelector('#panel svg.chart');
                      const note = document.querySelector('#panel .flow-note');
                      const flow = document.querySelector('#panel path.flow-reach');
                      const weapons = [...document.querySelectorAll('#basin-weapon button')].map(b => b.dataset.lay);
                      const hist = document.querySelector('#panel details.history');
                      const more = document.querySelector('#panel [data-expect="more"]');
                      const zoom = document.querySelector('#panel [aria-label="Zoom in"]');
                      return {
                        title: h && h.textContent.trim(),
                        map: !!(svg && svg.getBoundingClientRect().width > 40),
                        note: note && note.textContent.trim(),
                        flow: !!(flow && (flow.getAttribute('d') || '').length > 20),
                        flowClass: flow && flow.getAttribute('class'),
                        weapons,
                        hist: !!hist,
                        histItems: hist ? hist.querySelectorAll('li').length : 0,
                        more: !!more,
                        zoom: !!zoom
                      };
                    }"""
                )
                if not panel["title"] or not panel["map"]:
                    fails.append(f"{width} basin {label}: empty panel {panel}")
                    continue
                for lay in panel["weapons"]:
                    n = page.evaluate(
                        "(lay) => document.querySelectorAll('#panel .' + lay).length",
                        "lay-" + lay,
                    )
                    if n < 1:
                        fails.append(f"{width} basin {label}: weapon {lay} has no mark")
                if panel["hist"] and panel["histItems"] < 1:
                    fails.append(f"{width} basin {label}: History opens with no entries")
                if label in ("Nile", "Indus"):
                    if not panel["flow"] or not panel["note"]:
                        fails.append(f"{width} basin {label}: missing downstream flow {panel['note']}")
                    elif "anim" not in (panel["flowClass"] or ""):
                        fails.append(f"{width} basin {label}: flow is not animating")
                if label == "Nile" and panel["note"] and "Sudan and Egypt" not in panel["note"]:
                    fails.append(f"{width} Nile note: {panel['note']}")
                if panel["zoom"]:
                    before = page.evaluate(
                        """() => document.querySelector('#panel g.zoom-root').getAttribute('transform')"""
                    )
                    click(page.locator("#panel [aria-label='Zoom in']"))
                    page.wait_for_timeout(280)
                    after = page.evaluate(
                        """() => document.querySelector('#panel g.zoom-root').getAttribute('transform')"""
                    )
                    if before == after:
                        fails.append(f"{width} basin {label}: zoom in did not change the scale")
                    page.evaluate(
                        """() => {
                          const btn = document.querySelector('#panel [aria-label="Reset zoom"]');
                          if (btn) btn.click();
                        }"""
                    )
                leaf = page.evaluate(
                    """() => ({
                      toggle: !!document.querySelector('#panel button[data-mode="leaf"], #panel .leaflet-container'),
                      drawn: [...document.querySelectorAll('#panel button')].some(b => /leaflet|drawn map/i.test(b.textContent))
                    })"""
                )
                if leaf["toggle"] or leaf["drawn"]:
                    fails.append(f"{width} basin {label}: leaflet toggle still present {leaf}")
            page.close()
        browser.close()
    if fails:
        print(f"FAIL {len(fails)}")
        for f in fails:
            print(" ", f)
        return 1
    print("PASS every visible control shows a matching mark, entry, or map change")
    return 0


if __name__ == "__main__":
    sys.exit(main())
