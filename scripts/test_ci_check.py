#!/usr/bin/env python3
"""Self-test for scripts/ci_check.py: the browser checks must fail a page with look-alike
category colours (two greens, two blues, 16 colours), numbered-key circles, short text and a
dead button, and pass a clean page (incl. a 16-step single-hue intensity ramp)."""
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
# click-every-target check (1280px and 390px): dead and throwing shapes/buttons fail, working ones pass
srv2 = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=FIX))
threading.Thread(target=srv2.serve_forever, daemon=True).start()
ck_bad = c.click_checks(srv2.server_address[1], ["clickbad"])
ck_good = c.click_checks(srv2.server_address[1], ["clickgood"])
srv2.shutdown()
for k in ("shape 'Dead basin' shows nothing", "shape 'Broken basin' raised a JS/console error", "button 'Broken layer' raised a JS/console error"):
    for vp in ("[click 1280px]", "[click 390px]"):
        if not any(k in e and vp in e for e in ck_bad):
            fails.append(f"click check missed at {vp}: {k}")
fails += [f"click check flagged a working page: {e}" for e in ck_good]
for f in fails: print("FAIL:", f)
print("ci_check self-test:", "OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
