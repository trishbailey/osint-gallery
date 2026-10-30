#!/usr/bin/env python3
"""Self-test for scripts/ci_check.py: the browser checks must fail a page with look-alike
category colours (two greens, two blues, 16 colours), numbered-key circles, short text and a
dead button, and pass a clean page (incl. a 16-step single-hue intensity ramp).
Grey exception: grey passes only on a named data-status="defunct" marker inside the svg; every other grey fails."""
import os, sys, functools, threading, http.server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ci_check as c
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ci_fixtures")
http.server.SimpleHTTPRequestHandler.log_message = lambda *x: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=FIX))
threading.Thread(target=srv.serve_forever, daemon=True).start()
c.ROOT = "/tmp/ci-selftest"  # screenshots go here, not into the repo
bad = c.browser_checks(srv.server_address[1], ["bad"])
bad2 = c.browser_checks(srv.server_address[1], ["bad2"])  # pill keys, narrow text in a card, hover-only button
good = c.browser_checks(srv.server_address[1], ["good"])
defunct_ok = c.browser_checks(srv.server_address[1], ["defunct_ok"])  # greys on defunct markers only
defunct_bad = c.browser_checks(srv.server_address[1], ["defunct_bad"])  # every one of these greys must still fail
srv.shutdown()
want = {"look-alike colour": False, "numbered circles": False, "stop well short": False, "shows nothing": False}
for e in bad:
    for k in want:
        if k in e: want[k] = True
want2 = {"numbered circles": False, "stop well short": False, "shows nothing": False}
for e in bad2:
    for k in want2:
        if k in e: want2[k] = True
fails = [f"bad2 page not caught: {k}" for k, v in want2.items() if not v] + [f"bad page not caught: {k}" for k, v in want.items() if not v] + [f"clean page flagged: {e}" for e in good]
fails += [f"defunct-marked grey wrongly flagged: {e}" for e in defunct_ok]
for svg_id in ["bad-plain-grey", "bad-class-only", "bad-wrong-value", "bad-unnamed", "bad-svg-root", "bad-grey-beside-marker"]:
    if not any(f"svg '{svg_id}'" in e and "grey data fill" in e for e in defunct_bad):
        fails.append(f"grey not caught on {svg_id}")
if not any("svg 'bad-unnamed'" in e and "not valid" in e for e in defunct_bad): fails.append("unnamed defunct marker not reported")
if not any("svg 'bad-svg-root'" in e and "not valid" in e for e in defunct_bad): fails.append("defunct marker on svg root not reported")
if not any("svg 'bad-too-many'" in e and "limit: half" in e for e in defunct_bad): fails.append("over-use of the defunct exemption not caught")
for f in fails: print("FAIL:", f)
print("ci_check self-test:", "OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
