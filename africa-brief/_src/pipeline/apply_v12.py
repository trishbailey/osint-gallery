"""Apply v1.2 content to data/brief.json: analytic explainers, places, group profiles, Russia matrix, sentence-split text fields.
Usage: python apply_v12.py ../../data/brief.json  (idempotent)"""
import json,re,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from v12_content import SRC,PLACES,EXPL,SUMMARY,GROUPS,RUSSIA
p=sys.argv[1] if len(sys.argv)>1 else '../../data/brief.json'
B=json.load(open(p))
ids={s['id'] for s in B['sources']}
for i,t,pub,d,u in SRC:
    if i not in ids: B['sources'].append(dict(id=i,title=t,publisher=pub,date=d,url=u))
CIT=re.compile(r'\[\[([^\]]+)\]\]')
def cites(t): return [c.strip() for m in CIT.findall(t) for c in m.split(',')]
B['explainers']={r:{'bottom':e['bottom'],'paras':[{'t':t,'c':cites(t)} for t in e['paras']],'c':cites(e['bottom'])} for r,e in EXPL.items()}
for r in B['regions']:
    if r['id'] in SUMMARY: r['summary']=SUMMARY[r['id']]; r['cites']=sorted(set(cites(EXPL[r['id']]['bottom'])))
SHORT={'liptako':'Liptako-Gourma','g-issp':'IS Sahel','g-iswap':'ISWAP','fr-ndj':'Ex-French base','ru-portsudan':'Russian base plan','g-m23':'M23/AFC','katanga':'Kolwezi copper-cobalt','ru-car':'Russian forces','g-shabaab':'al-Shabaab','g-issom':'IS Somalia','nbenin':'Benin border parks','g-jnim-cw':'JNIM (Benin)','rw-moz':'Rwandan forces','g-ism':'IS Mozambique','khadim':'al-Khadim airbase'}
for L in PLACES.values():
    for q in L:
        if q['k'] in SHORT: q['s']=SHORT[q['k']]
B['places']=PLACES;B['groups']=GROUPS;B['russia']=RUSSIA
def fix(v):
    # never join facts with semicolons: split into sentences
    return re.sub(r';\s+(\w)',lambda m:'. '+m.group(1).upper(),v) if isinstance(v,str) else v
for k in ('resources','links','bri','regions'):
    for x in B[k]:
        for f in list(x):
            if f not in ('id','url') and isinstance(x[f],str): x[f]=fix(x[f])
json.dump(B,open(p,'w'),ensure_ascii=False,indent=1);print('ok',len(B['sources']),'sources')
