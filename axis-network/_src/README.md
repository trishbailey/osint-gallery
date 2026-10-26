# Axis dashboard generator

`gen_html.py` rebuilds `axis-network/index.html`. Its HTML template puts the GA4 tag (G-Z61EKRP8QV, the main Beacon property) first in `<head>`, so every regeneration keeps tracking. It reads its data from the IRGC bot working folder on the box (`W`), and holds no keys.
