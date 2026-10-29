"""Download each group's Wikimedia Commons image as a small local file (img/<group>.jpg|png). Needs network; the page itself loads no remote images."""
import json, pathlib, subprocess, time, io, sys
from PIL import Image
root = pathlib.Path(__file__).parent
out = root.parent / "img"; out.mkdir(exist_ok=True)
J = json.load(open(root / "data_in/images.json"))
UA = "OSINT-gallery-jihadist-groups/1.0 (https://github.com/trishbailey/osint-gallery; image fetch)"
for im in J["images"]:
    g = im["group"]
    if list(out.glob(g + ".*")): continue
    url = im["thumb_640_url"]
    for attempt in range(4):
        b = subprocess.run(["curl", "-sL", "-A", UA, url, "-w", "\n%{http_code}"], capture_output=True).stdout
        body, code = b.rsplit(b"\n", 1)
        if code == b"200": break
        time.sleep(4 * (attempt + 1))
    else:
        print("FAILED", g, code, url); continue
    im2 = Image.open(io.BytesIO(body)); im2.load()
    if im2.width > 360: im2 = im2.resize((360, round(im2.height * 360 / im2.width)))
    if im2.mode in ("RGBA", "LA", "P"):
        im2 = im2.convert("RGBA"); bg = Image.new("RGBA", im2.size, (255, 255, 255, 255)); bg.alpha_composite(im2); im2 = bg
    im2.convert("RGB").save(out / f"{g}.jpg", quality=82)
    print("ok", g, im2.size); time.sleep(2.5)
