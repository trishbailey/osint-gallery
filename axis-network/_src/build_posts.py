"""Build the raw post table threats.py reads (AXIS_POSTS, default /workspace/threats/posts.pkl)
from the weekly collection export: per-channel Telethon/Eitaa CSVs in <crawl dir>/posts/<handle>.csv
(columns post_id,date,url,text,views,...), the same export the IRGC bot's 01_graph.py consumes.
Group comes from v3/merged/nodes.csv (handle_lc -> group), the table build_data.py already uses.
Output columns: date (UTC), url, text, views, channel, group. Deduplicated on url. No keys or session data.
Usage: python build_posts.py [--work W] [--since 2026-05-01] [--out PATH] [CRAWL_DIR ...]
  With no CRAWL_DIR, every */posts/ folder under W is scanned (venv excluded)."""
import argparse, glob, os, pandas as pd
DEF_W=os.environ.get('AXIS_WORK','/workspace/axis_inputs/W/')
GROUPS=['houthi','irgc','hezbollah','hamas','iraqi','aligned','pij']
ap=argparse.ArgumentParser(); ap.add_argument('--work',default=DEF_W); ap.add_argument('--since',default='2026-05-01')
ap.add_argument('--out',default=os.environ.get('AXIS_POSTS','/workspace/threats/posts.pkl')); ap.add_argument('--merge',default=None,help='existing posts.pkl to keep (history); new CSV rows are added and deduped on url')
ap.add_argument('dirs',nargs='*')
a=ap.parse_args(); W=os.path.join(a.work,'')
dirs=a.dirs or sorted({os.path.dirname(p) for p in glob.glob(W+'**/posts/',recursive=True) if '/venv/' not in p})
dirs=[d[:-6] if d.rstrip('/').endswith('posts') else d for d in (x.rstrip('/') for x in dirs)]
n=pd.read_csv(W+'v3/merged/nodes.csv',low_memory=False); GRP=dict(zip(n.handle_lc.str.lower(),n.group))
rows=[]
for d in dirs:
    for f in glob.glob(os.path.join(d,'posts','*.csv')):
        df=pd.read_csv(f,dtype=str,keep_default_na=False,usecols=lambda c:c in {'date','url','text','views'})
        df['channel']=os.path.basename(f)[:-4].strip().lstrip('@').lower(); rows.append(df)
if not rows: raise SystemExit('no posts/*.csv found in: '+', '.join(dirs))
P=pd.concat(rows,ignore_index=True); P['group']=P.channel.map(GRP)
P['date']=pd.to_datetime(P.date,utc=True,errors='coerce')
P=P[P.group.isin(GROUPS)&P.date.notna()&(P.date>=pd.Timestamp(a.since,tz='UTC'))&P.text.ne('')]
if a.merge and os.path.exists(a.merge):
    old=pd.read_pickle(a.merge); old['date']=pd.to_datetime(old.date,utc=True); P=pd.concat([old.assign(views=old.views.astype(str)),P],ignore_index=True); P=P[P.date>=pd.Timestamp(a.since,tz='UTC')]
P=P.sort_values('date').drop_duplicates('url',keep='first').reset_index(drop=True)[['date','url','text','views','channel','group']]
tmp=a.out+'.tmp'; os.makedirs(os.path.dirname(os.path.abspath(a.out)),exist_ok=True); P.to_pickle(tmp); os.replace(tmp,a.out)
print(f'{len(P)} posts, {P.channel.nunique()} channels, {P.date.min()} .. {P.date.max()} -> {a.out}')
print(P.group.value_counts().to_string())
