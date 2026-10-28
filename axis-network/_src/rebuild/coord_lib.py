"""Near-identical-text coordination clustering, regenerated from the post table.
Logic follows irgc_work/scripts_b/02_selectors_coord.py (Oct 21 2026): normalise text, keep texts >=60 chars,
a cluster = same normalised text posted by >1 distinct channel; first poster = earliest; one row per (cluster, channel)."""
import re, unicodedata, hashlib
import pandas as pd
RM=re.compile(r'https?://\S+|t\.me/\S+|@\w+|[\U00010000-\U0010ffff]|[^\w\s]|\d|_',re.U)
DIAC=re.compile('[\u064B-\u065F\u0670\u200c\u200d\u200e\u200f]')
def normtxt(t):
    t=unicodedata.normalize('NFKC',t); t=DIAC.sub('',t)
    t=t.replace('ي','ی').replace('ك','ک').replace('ى','ی').replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ة','ه')
    t=RM.sub(' ',t.lower()); return ' '.join(t.split())
def prep(P, min_len=60):
    """Normalise once; returns one row per (normalised text, channel), earliest copy kept."""
    Q=P[['date','url','text','channel','group']].copy()
    Q['norm']=Q.text.map(normtxt); Q=Q[Q.norm.str.len()>=min_len]
    Q['key']=Q.norm.map(lambda s:hashlib.md5(s.encode()).hexdigest())
    Q=Q.sort_values(['date','channel','url'],ascending=[True,False,True],kind='stable').drop_duplicates(['key','channel'],keep='first')  # ties on identical timestamp: channel name descending (reproduces the live page's top-source table)
    return Q.drop(columns=['norm'])
def clusters_from(Q, channels=None):
    if channels is not None: Q=Q[Q.channel.isin(set(channels))]
    multi=Q.groupby('key').channel.nunique(); Q=Q[Q.key.isin(multi[multi>1].index)].copy()
    Q['is_first']=~Q.duplicated('key',keep='first')
    Q['cluster_id']=Q.groupby('key',sort=False).ngroup()+1
    F=Q[Q.is_first].set_index('key')
    Q['first_channel']=Q.key.map(F.channel); Q['first_group']=Q.key.map(F.group); Q['first_date']=Q.key.map(F.date); Q['first_post_url']=Q.key.map(F.url)
    Q=Q.rename(columns={'url':'post_url'}); Q['text_snippet']=Q.text.str[:160].str.replace('\n',' ')
    return Q[['cluster_id','channel','group','date','post_url','is_first','first_channel','first_group','first_date','first_post_url','text_snippet']].reset_index(drop=True)
def clusters(P, min_len=60, channels=None):
    return clusters_from(prep(P,min_len),channels)
