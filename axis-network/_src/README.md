# Axis dashboard generator

1. `python build_data.py` recomputes every number from the latest collection (30-day window ending at the newest post; 7-day "new this week" vs the 3 weeks before) and writes `../data.json`. It reads aggregate CSVs from the IRGC bot working folder on the box and holds no keys or session data.
2. `python gen_page.py` turns `data.json` into `../index.html` (static, one GA tag G-Z61EKRP8QV, Cartel dark theme). No numbers are hard-coded in the page template.
3. The Houthi threat-targets section is computed by `threats.py` (called from `build_data.py`) from the raw post collection (path in `AXIS_POSTS`, default `/workspace/threats/posts.pkl`; columns date,url,text,channel,group) plus the coordination copies table. If the posts file is missing, the previous result in `data.json` is kept.
