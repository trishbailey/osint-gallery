# Axis dashboard generator

`gen_html.py` rebuilds `axis-network/index.html`. Its HTML template puts the GA4 tag (G-FE6CZGWX0J, the same ID as the rest of Beacon Tools) first in `<head>`, so every regeneration keeps tracking. It reads its data from the IRGC bot working folder on the box (`W`), and holds no keys.
