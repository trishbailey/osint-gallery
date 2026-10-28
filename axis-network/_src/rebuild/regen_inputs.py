"""Regenerate the Axis build inputs that live outside the repo, from the raw post table (posts.pkl).
Writes <work>/v3/merged/{nodes.csv, coordination_copies_v4.csv, coord_stats.json}.
Usage: python regen_inputs.py [--posts PATH] [--work DIR] [--seed-nodes CSV] [--coord-start 2026-09-20] [--coord-end YYYY-MM-DD] [--irgc-coord a,b,c]
Coordination set = every non-IRGC channel in the post table + the IRGC-labelled Arabic channels listed in --irgc-coord
(the Oct 26 live page's coordination subset; validated: reproduces live flow30 to within 5 copies of 3,263).
Approximation: forward/credit/c2 columns of the old prep.py output are not regenerated (no build step reads them)."""
import argparse, os, sys, json, re
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from coord_lib import prep, clusters_from
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--posts', default=os.environ.get('AXIS_POSTS', '/workspace/threats/posts.pkl'))
ap.add_argument('--work', default=os.environ.get('AXIS_WORK', os.path.join(HERE, 'W')))
ap.add_argument('--seed-nodes', default=os.path.join(HERE, 'seed', 'nodes_seed.csv'))
ap.add_argument('--coord-start', default='2026-09-20'); ap.add_argument('--coord-end', default=None)
ap.add_argument('--irgc-coord', default='alalamarabic,mkhamenei_ar,irna_1313,nournews_ir')
a = ap.parse_args()
GROUPS = ['houthi', 'irgc', 'hezbollah', 'hamas', 'iraqi', 'aligned', 'pij']
P = pd.read_pickle(a.posts); P['date'] = pd.to_datetime(P.date, utc=True)
M = os.path.join(a.work, 'v3', 'merged'); os.makedirs(M, exist_ok=True)
grp = P.groupby('channel').group.agg(lambda s: s.mode().iloc[0]); cnt = P.groupby('channel').size()
disp = P.assign(h=P.url.str.extract(r't\.me/(?:s/)?([^/]+)/')[0]).dropna(subset=['h']).groupby('channel').h.first()
# nodes.csv: seed (old titles etc.) with group/posts/crawled refreshed from the post table
seed = pd.read_csv(a.seed_nodes, low_memory=False, keep_default_na=False) if os.path.exists(a.seed_nodes) else pd.DataFrame(columns=['handle','handle_lc','title','subscribers','posts','forwards','first_post','last_post','bio','group','tier','crawled','crawl_wave','status','in_degree','out_degree','set'])
seed['handle_lc'] = seed.handle_lc.str.lower(); seed = seed.drop_duplicates('handle_lc')
for c in set(grp.index) - set(seed.handle_lc):
    seed.loc[len(seed)] = {k: '' for k in seed.columns}; seed.loc[len(seed) - 1, ['handle', 'handle_lc']] = [disp.get(c, c), c]
seed['handle'] = seed.apply(lambda r: r.handle or disp.get(r.handle_lc, r.handle_lc), axis=1)
seed['group'] = seed.handle_lc.map(grp).fillna('')  # only channels in the post table keep a page group
seed['posts'] = seed.handle_lc.map(cnt).fillna(0).astype(int); seed['crawled'] = seed.handle_lc.isin(grp.index)
seed.to_csv(os.path.join(M, 'nodes.csv'), index=False)
# coordination copies
irg = [c.strip() for c in a.irgc_coord.split(',') if c.strip()]
chs = [c for c in grp.index if grp[c] != 'irgc'] + [c for c in irg if c in grp.index]
S = P[(P.date >= pd.Timestamp(a.coord_start, tz='UTC')) & P.channel.isin(chs)]
if a.coord_end: S = S[S.date < pd.Timestamp(a.coord_end, tz='UTC')]
C = clusters_from(prep(S))
C['date'] = pd.to_datetime(C.date, utc=True).dt.strftime('%Y-%m-%d %H:%M:%S%z').str.replace(r'(\d\d)(\d\d)$', r'\1:\2', regex=True)
C['first_date'] = pd.to_datetime(C.first_date, utc=True).dt.strftime('%Y-%m-%d %H:%M:%S%z').str.replace(r'(\d\d)(\d\d)$', r'\1:\2', regex=True)
C.to_csv(os.path.join(M, 'coordination_copies_v4.csv'), index=False)
bg = {g: dict(ch=int(S[S.group == g].channel.nunique()), posts=int((S.group == g).sum())) for g in GROUPS}
cs = dict(channels=int(S.channel.nunique()), posts=int(len(S)), start=str(S.date.min().date()), end=str(S.date.max().date()), by_group=bg,
          note='regenerated from posts.pkl (text-bearing posts only; coordination subset = non-IRGC channels + irgc_coord list)')
json.dump(cs, open(os.path.join(M, 'coord_stats.json'), 'w'), indent=1)
print(len(seed), 'nodes;', len(C), 'copy rows;', C.cluster_id.nunique(), 'clusters;', json.dumps(cs))
