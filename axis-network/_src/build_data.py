"""Recompute every number on the Axis page from the latest collection (no hard-coded figures).
Window = 30 days ending at the latest post date in the data; 'new this week' = last 7 days vs the 3 weeks before.
Reads aggregate CSVs from the IRGC bot working folder on the box (W). Holds no keys or session data.
Usage: python build_data.py [W]   -> writes ../data.json"""
import pandas as pd, json, sys, os
W=sys.argv[1] if len(sys.argv)>1 else '/home/box/agent-data/agents/39ef6fec-7081-4cce-b3bf-015c6d31f16f/irgc_work/'
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data.json')
GROUPS=['houthi','irgc','hezbollah','hamas','iraqi','aligned','pij']
C=pd.read_csv(W+'v3/merged/coordination_copies_v4.csv'); C['date']=pd.to_datetime(C.date,utc=True)
nodes=pd.read_csv(W+'v3/merged/nodes.csv',low_memory=False); cr=nodes[(nodes.crawled==True)&(nodes.posts>0)&nodes.group.isin(GROUPS)]
last=C.date.max(); end=last.normalize()+pd.Timedelta(days=1)
def win(d,off=0): return C[(C.date>=end-pd.Timedelta(days=d+off))&(C.date<end-pd.Timedelta(days=off))]
def flows(D):
    K=D[~D.is_first]; X=K[(K.group!=K.first_group)&K.group.isin(GROUPS)&K.first_group.isin(GROUPS)]
    pairs=X.groupby(['first_group','group']).size().sort_values(ascending=False)
    return X,[[a,b,int(n)] for (a,b),n in pairs.items()]
X30,P30=flows(win(30)); X7,P7=flows(win(7)); Xp,_=flows(win(21,7))
orig=X30.first_group.value_counts()
# all copies (same group too) by origin group: who starts the messages that get copied at all
K30=win(30); K30=K30[~K30.is_first]; allorig=K30.first_group.value_counts()
topch=X30.first_channel.value_counts().head(5)
GRPCH=dict(zip(nodes.handle_lc,nodes.group)); disp=dict(zip(nodes.handle_lc,nodes.handle))
d=dict(
 data_through=str((end-pd.Timedelta(days=1)).date()), window_start=str((end-pd.Timedelta(days=30)).date()),
 collection=dict(channels=int(len(cr)),posts=int(cr.posts.sum()),start=str(C.date.min().date()),end=str(last.date())),
 by_group={g:dict(ch=int((cr.group==g).sum()),posts=int(cr[cr.group==g].posts.sum())) for g in GROUPS},
 flow30=P30, flow7=P7, xcopies30=int(len(X30)), xstories30=int(X30.cluster_id.nunique()),
 origin30={g:int(orig.get(g,0)) for g in GROUPS}, allcopies30=int(len(K30)), allorigin30={g:int(allorig.get(g,0)) for g in GROUPS},
 topsrc30=[[disp.get(h,h),GRPCH.get(h),int(n)] for h,n in topch.items()],
 week=dict(xcopies=int(len(X7)),prev_weekly=round(len(Xp)/3,1),origin={g:int(v) for g,v in X7.first_group.value_counts().items()},
   prev_origin={g:round(v/3,1) for g,v in Xp.first_group.value_counts().items()},top_pairs=P7[:3]))
# payments (selectors posted by channels; dates from the payment crawl)
n=pd.read_csv(W+'payment_rails/nodes.csv'); e=pd.read_csv(W+'payment_rails/edges.csv')
s=n[n.kind!='channel'].copy(); TY={'card':'Bank card','iban':'Bank account (IBAN)','campaign':'Named donation campaign','donation_phone':'Donation phone number','eth_evm':'Crypto wallet','btc':'Crypto wallet','tron_usdt':'Crypto wallet'}
s['tl']=s.type.map(TY).fillna('Other')
d['pay']=dict(selectors=int(len(s)),channels=int((n.kind=='channel').sum()),cross_group=int((s.n_groups>1).sum()),
  shared=int((s.n_channels>=2).sum()), max_channels=int(s.n_channels.max()),
  by_type=[[t,int(len(g)),int((g.n_channels>=2).sum())] for t,g in sorted(s.groupby('tl'),key=lambda x:-len(x[1]))],
  by_group={g:int(c) for g,c in n[n.kind=='channel'].group.value_counts().items()},
  first=str(e.first_seen.min()),last=str(e.last_seen.max()),in_window=int((e.last_seen>=d['window_start']).sum()),edges=int(len(e)),
  top=[[r.label,r.tl,int(r.n_channels)] for r in s.sort_values('n_channels',ascending=False).head(5).itertuples()])
# payment drill-down list (full selectors, for research reference)
CH=dict(zip(n.id,n.label)); TD={'card':'Bank card','iban':'Bank account (IBAN)','campaign':'Named campaign','donation_phone':'Phone number','eth_evm':'Crypto wallet (ETH / EVM)','btc':'Crypto wallet (BTC)','tron_usdt':'Crypto wallet (USDT-TRC20)'}
pl=[]
for r in s.itertuples():
    E=e[e.target==r.id]
    pl.append(dict(v=str(r.label),t=TD.get(r.type,'Other'),k='crypto' if r.type in('btc','eth_evm','tron_usdt') else 'bank' if r.type in('card','iban') else 'other',g=r.groups,
     ch=[[CH.get(x.source,x.source),int(x.weight),[u.strip() for u in str(x.sample_posts).split('|') if u.strip().startswith('https://t.me/')]] for x in E.itertuples()],
     m=int(E.weight.sum()),f=str(E.first_seen.min()),l=str(E.last_seen.max())))
d['paylist']=sorted(pl,key=lambda x:(-len(x['ch']),-x['m']))
# themes (AI-coded codebook tables; recomputed when the codebook run is refreshed)
t=pd.read_pickle('/workspace/codebook/tabs.pkl'); th=t['th']
TH={'Yemen–Saudi war':['YEMEN_SAUDI_WAR'],'Palestine':['PALESTINE'],'Iran–Israel–US standoff':['IRAN_STANDOFF_AND_DIPLOMACY','ISRAELI_STRIKES_OUTSIDE_PALESTINE'],'Martyrs and faith':['MARTYRS_FAITH_MOBILISATION'],'Home and world news':['DOMESTIC_GOVERNANCE_SECURITY','WORLD_AND_OTHER']}
d['themes']=dict(cats=list(TH),coded=int(t['n'].sum()),by_group={g.lower():[round(float(sum(th.loc[k,g] for k in ks)),1) for ks in TH.values()] for g in ['HOUTHI','IRGC','HEZBOLLAH','HAMAS','IRAQI','ALIGNED','PIJ']},n={k.lower():int(v) for k,v in t['n'].items()})
# shared web infrastructure (More section)
I=json.load(open(W+'v3/infra.json')); d['infra']=dict(nodes=len(I['N']),shared=[x['l'] for x in I['N'] if x['g']=='shared' and x['t']=='domain'],sites=sum(1 for x in I['N'] if x['t']=='domain'))
json.dump(d,open(OUT,'w'),ensure_ascii=False,indent=1); print(json.dumps({k:d[k] for k in ['data_through','window_start','collection','xcopies30','origin30','allorigin30','week']},indent=0))
print(d['pay'])
