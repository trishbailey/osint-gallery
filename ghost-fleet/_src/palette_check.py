"""Exit non-zero if a Ghost Fleet category palette is missing, malformed, too small,
grey on an active category, or has any CIEDE2000 pair under 20.

Run: python3 ghost-fleet/_src/palette_check.py

Palettes (current source definitions):
  events    app.js     const T={name:{c:"#rrggbb", ...}} plus the moving-ship marker #f5f7fa
  classes   app.js     const CL={name:["label","#rrggbb", ...]}
  chapter1  story.js   B3C={CHN:"#rrggbb", ...} and const RED="#rrggbb"
  trade     shuttle.js const CC={CHN:"#rrggbb", ...}
The Comtrade chart that defined const CC= in story.js was removed. Those buyer
colours now live on the shuttle turnaround bars. Splitting story.js on const CC=
raises IndexError and is not a palette.

Grey uses the same band as scripts/ci_check.py (chroma < 6 and 22 <= L <= 92).
A category whose key or legend label is defunct, dissolved, inactive, disbanded,
retired, or historical may be grey. Decorative gridlines, borders, axes, and faint
secondary text are not in these palettes and are not scanned here. The shared SVG
check in scripts/ci_check.py stays the authority for page graphics.
"""
import itertools, math, os, re, sys

MIN_DE = 20
MIN_COUNT = {"events": 5, "classes": 3, "chapter1": 3, "trade": 3}
MOVING_SHIP = "#f5f7fa"
HEX = re.compile(r"#[0-9a-fA-F]{6}\Z")
SPECIAL = re.compile(
    r"(?:^|[^a-z])(defunct|dissolved|inactive|disbanded|retired|historical)(?:[^a-z]|$)",
    re.I,
)
EVENT_RE = re.compile(r'(\w+)\s*:\s*\{\s*c\s*:\s*(["\'])([^"\']*)\2')
CLASS_RE = re.compile(r'(\w+)\s*:\s*\[\s*(["\'])([^"\']*)\2\s*,\s*(["\'])([^"\']*)\4')
PAIR_RE = re.compile(r'(\w+)\s*:\s*(["\'])([^"\']*)\2')
RED_RE = re.compile(r'\bRED\s*=\s*(["\'])([^"\']*)\1')


def lab(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
    r, g, b = f(r), f(g), f(b)
    X = (r * .4124 + g * .3576 + b * .1805) / .95047
    Y = r * .2126 + g * .7152 + b * .0722
    Z = (r * .0193 + g * .1192 + b * .9505) / 1.08883
    t = lambda v: v ** (1 / 3) if v > 0.008856 else 7.787 * v + 16 / 116
    return 116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))


def de(a, b):
    L1, a1, b1 = lab(a)
    L2, a2, b2 = lab(b)
    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = .5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1 = math.degrees(math.atan2(b1, a1p)) % 360
    h2 = math.degrees(math.atan2(b2, a2p)) % 360
    dL = L2 - L1
    dC = C2p - C1p
    dh = h2 - h1
    if abs(dh) > 180:
        dh -= 360 * math.copysign(1, dh)
    dH = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh / 2))
    Lb = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    hb = (h1 + h2) / 2 if abs(h1 - h2) <= 180 else (h1 + h2 + 360) / 2
    T = (1 - .17 * math.cos(math.radians(hb - 30)) + .24 * math.cos(math.radians(2 * hb))
         + .32 * math.cos(math.radians(3 * hb + 6)) - .2 * math.cos(math.radians(4 * hb - 63)))
    SL = 1 + .015 * (Lb - 50) ** 2 / math.sqrt(20 + (Lb - 50) ** 2)
    SC = 1 + .045 * Cbp
    SH = 1 + .015 * Cbp * T
    RT = -2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * math.sin(math.radians(60 * math.exp(-((hb - 275) / 25) ** 2)))
    return math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH))


def is_grey(h):
    L, a, b = lab(h)
    return math.hypot(a, b) < 6 and 22 <= L <= 92


def is_special(*names):
    return any(n and SPECIAL.search(n) for n in names)


def _marker_re(marker):
    """'const T=' matches const T= with whitespace allowed around the name and '='."""
    left, _sep, _right = marker.partition("=")
    words = left.split()
    return r"\s+".join(re.escape(w) for w in words) + r"\s*="


def brace_object(src, marker):
    """Return (body, 'ok'|'missing'|'malformed')."""
    found = re.search(_marker_re(marker), src)
    if not found:
        return "", "missing"
    k = found.end()
    while k < len(src) and src[k] in " \t\r\n":
        k += 1
    if k >= len(src) or src[k] != "{":
        return "", "malformed"
    depth = 0
    quote = ""
    escape = False
    for n in range(k, len(src)):
        c = src[n]
        if quote:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == quote:
                quote = ""
            continue
        if c in "\"'":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[k + 1:n], "ok"
    return "", "malformed"


def _hex_map(pairs):
    pal, bad = {}, []
    for key, color in pairs:
        if HEX.fullmatch(color):
            pal[key] = "#" + color[1:].lower()
        else:
            bad.append(f"{key} is {color!r}, expected #rrggbb")
    return pal, bad


def check_sources(app, story, shuttle):
    """Return (summary lines, problem strings). No problems means every palette passed."""
    lines, problems = [], []

    def fail(msg):
        problems.append(msg)

    def assess(name, pal, labels=None):
        labels = labels or {}
        bad = []
        for a, b in itertools.combinations(pal, 2):
            d = de(pal[a], pal[b])
            if d < MIN_DE:
                bad.append((a, b, round(d, 1)))
        greys = [f"{k} {pal[k]}" for k in pal if is_grey(pal[k]) and not is_special(k, labels.get(k, ""))]
        need = MIN_COUNT[name]
        shown = list(bad)
        if greys:
            shown.append(("grey", ", ".join(greys)))
            fail(f"{name}: {', '.join(greys)} {'is' if len(greys) == 1 else 'are'} grey. "
                 "Grey is allowed for decorative gridlines, borders, axes, faint secondary text, "
                 "and inactive, defunct, or historical items, not for an active main category.")
        if bad:
            detail = ", ".join(f"{a} {pal[a]} vs {b} {pal[b]} (dE {d})" for a, b, d in bad)
            fail(f"{name}: {len(bad)} look-alike pair(s) (delta E < {MIN_DE}): {detail}")
        if len(pal) < need:
            listed = ", ".join(f"{k} {pal[k]}" for k in pal) or "none"
            shown.append(("count", len(pal), need))
            fail(f"{name}: {len(pal)} colours ({listed}); need at least {need}")
        lines.append(f"{name} {len(pal)} colours; failures: {shown}")

    def take_object(name, src, marker, filename, expect, parse):
        body, status = brace_object(src, marker)
        if status == "missing":
            fail(f"{name}: definition {marker!r} not found in {filename}. {expect}")
            return None
        if status == "malformed":
            fail(f"{name}: malformed palette in {filename} ({marker} is not a {{...}} object).")
            return None
        pal, labels, bad = parse(body)
        if bad:
            fail(f"{name}: malformed palette in {filename} ({'; '.join(bad)}).")
        if not pal:
            if not bad:
                fail(f"{name}: malformed palette in {filename} ({marker} has no {expect})")
            return None
        return pal, labels

    ev = take_object(
        "events", app, "const T=", "app.js",
        'Expected const T={name:{c:"#rrggbb", ...}} (map event categories).',
        _parse_events,
    )
    if ev:
        pal, _labels = ev
        pal = dict(pal)
        pal["moving ship"] = MOVING_SHIP
        assess("events", pal)

    cl = take_object(
        "classes", app, "const CL=", "app.js",
        'Expected const CL={name:["label","#rrggbb", ...]} (behaviour classes).',
        _parse_classes,
    )
    if cl:
        assess("classes", cl[0], cl[1])

    ch_pal = _chapter1(story, fail)
    if ch_pal is not None:
        assess("chapter1", ch_pal)

    tr = take_object(
        "trade", shuttle, "const CC=", "shuttle.js",
        'Expected const CC={CHN:"#rrggbb", ...} (shuttle buyer colours). '
        "The Comtrade chart that used to define const CC= in story.js was removed.",
        _parse_pairs,
    )
    if tr:
        assess("trade", tr[0])

    return lines, problems


def _parse_events(body):
    pal, bad = _hex_map((k, c) for k, _q, c in EVENT_RE.findall(body))
    return pal, {}, bad


def _parse_pairs(body):
    pal, bad = _hex_map((k, c) for k, _q, c in PAIR_RE.findall(body))
    return pal, {}, bad


def _parse_classes(body):
    pal, labels, bad = {}, {}, []
    for key, _q1, label, _q2, color in CLASS_RE.findall(body):
        if HEX.fullmatch(color):
            pal[key] = "#" + color[1:].lower()
            labels[key] = label
        else:
            bad.append(f"{key} is {color!r}, expected #rrggbb")
    return pal, labels, bad


def _chapter1(story, fail):
    body, status = brace_object(story, "B3C=")
    red_here = re.search(r"\bRED\s*=", story) is not None
    red = RED_RE.search(story)
    ok = True
    if status == "missing":
        fail("chapter1: definition 'B3C=' not found in story.js. "
             'Expected B3C={CHN:"#rrggbb", ...} (chapter 1 buyer countries).')
        ok = False
    elif status == "malformed":
        fail("chapter1: malformed palette in story.js (B3C= is not a {...} object).")
        ok = False
    pal, bad = ({}, [])
    if status == "ok":
        pal, bad = _hex_map((k, c) for k, _q, c in PAIR_RE.findall(body))
        if bad:
            fail(f"chapter1: malformed palette in story.js ({'; '.join(bad)}).")
            ok = False
        elif not pal:
            fail('chapter1: malformed palette in story.js (B3C= has no "key":"#rrggbb" colours).')
            ok = False
    if not red_here:
        fail('chapter1: definition \'RED=\' not found in story.js. Expected const RED="#rrggbb" (chapter 1 sea-lane arrows).')
        ok = False
    elif not red or not HEX.fullmatch(red.group(2)):
        got = red.group(2) if red else "unquoted"
        fail(f"chapter1: malformed palette in story.js (RED is {got!r}, expected #rrggbb).")
        ok = False
    if not ok:
        return None
    pal = dict(pal)
    pal["route"] = "#" + red.group(2)[1:].lower()
    return pal


def _read(path, filename, problems):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError as e:
        problems.append(f"{filename}: cannot read palette source ({e.strerror or e}).")
        return ""


def main(app_path=None, story_path=None, shuttle_path=None):
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(here, "..")
    paths = {
        "app.js": app_path or os.path.join(root, "app.js"),
        "story.js": story_path or os.path.join(root, "story.js"),
        "shuttle.js": shuttle_path or os.path.join(root, "shuttle.js"),
    }
    problems = []
    texts = {name: _read(path, name, problems) for name, path in paths.items()}
    lines, found = check_sources(texts["app.js"], texts["story.js"], texts["shuttle.js"])
    problems.extend(found)
    for line in lines:
        print(line)
    for p in problems:
        print("FAIL:", p)
    if not problems:
        print("palette check passed")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
