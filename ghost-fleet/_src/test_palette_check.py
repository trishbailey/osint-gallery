#!/usr/bin/env python3
"""Regression tests for ghost-fleet/_src/palette_check.py.

Current app.js, story.js, and shuttle.js must pass. A missing definition, a malformed
colour, a palette under its minimum size, a grey active category, and a pair below
delta E 20 must fail with an actionable message and must not raise. Grey on an
inactive, defunct, or historical category, and grey that only appears as a comment,
must not fail this check.

Runs in CI via scripts/ci_check.py (cwd = repo root) or by hand:
  python3 ghost-fleet/_src/test_palette_check.py
"""
import io, os, shutil, subprocess, sys, tempfile
from contextlib import redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import palette_check as pc

GF = os.path.join(ROOT, "ghost-fleet")
CC = 'const CC={CHN:"#9b7be8",IND:"#e8913a",TUR:"#4fa3e0"}'
B3C = 'B3C={CHN:"#9b7be8",IND:"#e8913a",TUR:"#4fa3e0"}'
RED = 'const RED="#e8423f"'
CL_END = 'other:["Occasional or little data","#f2d16b","Too few recorded trips to fit a pattern"]}'


def load():
    out = []
    for name in ("app.js", "story.js", "shuttle.js"):
        with open(os.path.join(GF, name), encoding="utf-8") as f:
            out.append(f.read())
    return out


def swap(src, old, new):
    n = src.count(old)
    if n != 1:
        raise AssertionError(f"fixture anchor found {n} times: {old[:90]}")
    return src.replace(old, new, 1)


def problems(app, story, shuttle):
    _lines, probs = pc.check_sources(app, story, shuttle)
    return probs


def only(probs, prefix):
    return [p for p in probs if p.startswith(prefix)]


fails = []


def expect(cond, msg):
    if not cond:
        fails.append(msg)


app, story, shuttle = load()
expect("const CC=" not in story, "story.js still defines const CC=; the trade fixture is stale")
expect(CC in shuttle, "shuttle.js no longer has the expected const CC= buyer palette")
expect(B3C in story and RED in story, "story.js chapter 1 anchors moved")

base = problems(app, story, shuttle)
expect(base == [], "current Ghost Fleet sources should pass, got: " + "; ".join(base))

shifted = problems("// palette declarations can move off line 2\n" + app, story, shuttle)
expect(shifted == [], "moving app.js declarations off line 2 should still pass: " + "; ".join(shifted))

noted = problems(app + "\n/* gridline #808080 border axis #7d7d7d */\n", story, shuttle)
expect(noted == [], "a decorative grey comment is not a category colour: " + "; ".join(noted))

spaced = problems(app, story, swap(shuttle, "const CC=", "const CC = "))
expect(spaced == [], "whitespace around const CC = should still be read: " + "; ".join(spaced))
expect(pc.is_grey("#808080") and not pc.is_grey("#f5f7fa") and not pc.is_grey("#f2d16b"),
       "grey band should match active greys and not the moving-ship white or class gold")
expect(not pc.is_grey("#9aa6b8"), "muted secondary text is not in the grey band")
expect(all(pc.is_special(s) for s in ("defunct", "dissolved", "inactive", "disbanded", "retired", "historical")),
       "special-category names should be recognised")
expect(not pc.is_special("hub") and not pc.is_special("other") and not pc.is_special("moving ship"),
       "active category names should not be treated as special")

gone = problems(app, story, swap(shuttle, CC, "const CC_REMOVED=1"))
expect(only(gone, "trade:") and any("not found" in p and "const CC=" in p and "shuttle.js" in p for p in gone),
       f"missing shuttle CC should name the absent definition, got {gone}")
expect(not any(p.startswith("events:") or p.startswith("classes:") or p.startswith("chapter1:") for p in gone),
       f"missing trade palette should not fail the other palettes: {gone}")

try:
    problems(app, story, "")
except Exception as e:
    fails.append(f"empty shuttle source raised {type(e).__name__}: {e}")
else:
    empty = problems(app, story, "")
    expect(any("const CC=" in p and "not found" in p for p in empty),
           f"empty shuttle should report CC missing, not crash: {empty}")

bad_hex = problems(app, story, swap(shuttle, CC, 'const CC={CHN:"#9b7be",IND:"nope",TUR:"#4fa3e0"}'))
expect(any(p.startswith("trade:") and "malformed" in p and "#9b7be" in p and "nope" in p for p in bad_hex),
       f"malformed trade colours should be named, got {bad_hex}")

short = problems(app, story, swap(shuttle, CC, 'const CC={CHN:"#9b7be8",IND:"#e8913a"}'))
expect(any(p.startswith("trade:") and "need at least 3" in p for p in short),
       f"two-colour trade palette should fail the minimum, got {short}")
expect(not any("look-alike" in p for p in short), f"distinct short palette should not be called look-alike: {short}")

close = problems(app, story, swap(shuttle, CC, 'const CC={CHN:"#9b7be8",IND:"#e8913a",TUR:"#a888ee"}'))
expect(any(p.startswith("trade:") and "look-alike" in p and "delta E < 20" in p and "CHN" in p and "TUR" in p for p in close),
       f"too-similar trade colours should fail delta E, got {close}")
expect(not any(p.startswith("chapter1:") for p in close), f"trade look-alikes should not fail chapter 1: {close}")

no_b3 = problems(app, swap(story, B3C, "B3C_GONE=1"), shuttle)
expect(any(p.startswith("chapter1:") and "B3C=" in p and "not found" in p for p in no_b3),
       f"missing B3C should fail chapter 1, got {no_b3}")
expect(not any(p.startswith("trade:") for p in no_b3), f"missing B3C should not fail trade: {no_b3}")

no_red = problems(app, swap(story, RED, "const RED_GONE=1"), shuttle)
expect(any(p.startswith("chapter1:") and "RED=" in p and "not found" in p for p in no_red),
       f"missing RED should fail even though B3C still has 3 colours, got {no_red}")

bad_red = problems(app, swap(story, RED, 'const RED="red"'), shuttle)
expect(any(p.startswith("chapter1:") and "malformed" in p and "red" in p for p in bad_red),
       f"non-hex RED should be malformed, got {bad_red}")

same = problems(swap(app, 'gap:{c:"#e05a6a"', 'gap:{c:"#e8913a"'), story, shuttle)
expect(any(p.startswith("events:") and "look-alike" in p and "delta E < 20" in p for p in same),
       f"identical event colours should fail delta E, got {same}")

grey = problems(swap(app, 'hub:["Transfer hub ships","#e8913a"', 'hub:["Transfer hub ships","#808080"'), story, shuttle)
expect(any(p.startswith("classes:") and "grey" in p and "hub #808080" in p and "active main category" in p for p in grey),
       f"grey behaviour class should fail, got {grey}")

hist_key = swap(app, CL_END, CL_END[:-1] + ',historical:["Past","#808080","no longer trading"]}')
expect(problems(hist_key, story, shuttle) == [],
       "grey on a historical category should pass: " + "; ".join(problems(hist_key, story, shuttle)))

hist_label = swap(app, CL_END, CL_END[:-1] + ',fleet:["historical","#808080","no longer trading"]}')
expect(problems(hist_label, story, shuttle) == [],
       "grey on a category labelled historical should pass: " + "; ".join(problems(hist_label, story, shuttle)))

no_t = problems(swap(app, "const T=", "const T_GONE="), story, shuttle)
expect(any(p.startswith("events:") and "const T=" in p and "not found" in p for p in no_t),
       f"missing event palette should fail, got {no_t}")

no_cl = problems(swap(app, "const CL=", "const CL_GONE="), story, shuttle)
expect(any(p.startswith("classes:") and "const CL=" in p and "not found" in p for p in no_cl),
       f"missing class palette should fail, got {no_cl}")

try:
    blank = problems("", "", "")
except Exception as e:
    fails.append(f"blank sources raised {type(e).__name__}: {e}")
else:
    for name in ("events:", "classes:", "chapter1:", "trade:"):
        expect(any(p.startswith(name) and "not found" in p for p in blank),
               f"blank sources should report {name} missing, got {blank}")

# Script exit codes: real assets pass; a missing buyer palette fails without a traceback.
script = os.path.join(HERE, "palette_check.py")
ran = subprocess.run([sys.executable, script], cwd=ROOT, capture_output=True, text=True)
expect(ran.returncode == 0, f"palette_check.py on current assets exited {ran.returncode}\n{ran.stdout}\n{ran.stderr}")
expect("events 6 colours; failures: []" in ran.stdout, f"events summary missing:\n{ran.stdout}")
expect("classes 5 colours; failures: []" in ran.stdout, f"classes summary missing:\n{ran.stdout}")
expect("chapter1 4 colours; failures: []" in ran.stdout, f"chapter1 summary missing:\n{ran.stdout}")
expect("trade 3 colours; failures: []" in ran.stdout, f"trade summary missing:\n{ran.stdout}")
expect("palette check passed" in ran.stdout and "FAIL:" not in ran.stdout, f"unexpected script output:\n{ran.stdout}")
expect(ran.stderr == "", f"checker wrote stderr:\n{ran.stderr}")

with tempfile.TemporaryDirectory() as tmp:
    for name in ("app.js", "story.js", "shuttle.js"):
        shutil.copy(os.path.join(GF, name), os.path.join(tmp, name))
    sh_path = os.path.join(tmp, "shuttle.js")
    with open(sh_path, encoding="utf-8") as f:
        text = f.read()
    with open(sh_path, "w", encoding="utf-8") as f:
        f.write(swap(text, CC, "const CC_REMOVED=1"))
    buf = io.StringIO()
    with redirect_stdout(buf):
        rc = pc.main(os.path.join(tmp, "app.js"), os.path.join(tmp, "story.js"), sh_path)
    gone_out = buf.getvalue()
    expect(rc == 1, f"main() should exit 1 when CC is gone, got {rc}")
    expect("FAIL:" in gone_out and "const CC=" in gone_out and "not found" in gone_out and "Traceback" not in gone_out,
           f"main() should print an actionable miss, got:\n{gone_out}")

missing = os.path.join(tempfile.gettempdir(), "gf-palette-no-such-app.js")
buf = io.StringIO()
with redirect_stdout(buf):
    rc_missing = pc.main(missing, os.path.join(GF, "story.js"), os.path.join(GF, "shuttle.js"))
miss_out = buf.getvalue()
expect(rc_missing == 1, f"main() should exit 1 when app.js is absent, got {rc_missing}")
expect("cannot read" in miss_out and "Traceback" not in miss_out,
       f"missing file should be reported, not raised:\n{miss_out}")

for f in fails:
    print("FAIL:", f)
print("palette_check tests:", "OK" if not fails else f"{len(fails)} problem(s)")
sys.exit(1 if fails else 0)
