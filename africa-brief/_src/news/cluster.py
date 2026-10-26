"""Group news.json items into same-event stories, then hang stories on standing storylines (pipeline/storylines.py).
Free, local: token Jaccard on English titles. Output ../data/stories.json (SITE_DIR)."""
import json,re,os,sys,time
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','pipeline'))
from storylines import S
N=json.load(open(os.path.join(os.path.dirname(__file__),'news.json')))
STOP=set("the a an of in on to for and or with by at from as is are was were be after over says say said amid into new its his her their this that than more de la le les des du et en au aux un une pour par sur dans avec".split())
def toks(t): return {w for w in re.findall(r"[a-zà-ÿ0-9']{3,}",t.lower()) if w not in STOP}
ORDER=['sahel','lake-chad','sudan','great-lakes','car','horn','coastal-wa','southern','north','continent']
now=time.time();out={'generated':time.strftime('%Y-%m-%d',time.gmtime()),'regions':[],'storylines':[{k:v for k,v in s.items() if k not in ('kw','req','not')} for s in S]}
for rid in ORDER:
    items=[i for i in N.get(rid,[]) if i.get('ts',now)>=now-14*86400]
    for i in items: i['_en']=i.get('title_en') or i['title']; i['_t']=toks(i['_en'])
    items.sort(key=lambda i:-i['ts']);clusters=[]
    for i in items:
        best=None;bs=0
        for c in clusters:
            s=max(len(i['_t']&j['_t'])/max(1,len(i['_t']|j['_t'])) for j in c)
            if s>bs: bs,best=s,c
        if best is not None and bs>=0.34: best.append(i)
        else: clusters.append([i])
    SL=[s for s in S if s['region']==rid];groups={s['id']:[] for s in SL};other=[]
    for c in clusters:
        head=max(c,key=lambda i:(len(i['_t']),-i['ts'])) if False else c[0]
        srcs=[]; seen=set()
        for i in c:
            if i['outlet'] in seen: continue
            seen.add(i['outlet']);srcs.append({'outlet':i.get('outlet_name',i['outlet']),'link':i['link'],'lang':i.get('lang'),'state':i.get('state',''),'title':i['title'],'title_en':i.get('title_en'),'ts':i['ts']})
        st={'headline':head['_en'],'first':min(i['ts'] for i in c),'last':max(i['ts'] for i in c),'n':len(srcs),'sources':srcs}
        txt=' '.join(i['_en'] for i in c)
        ok=lambda s:(not s.get('req') or re.search(s['req'],txt,re.I)) and not (s.get('not') and re.search(s['not'],txt,re.I))
        scored=[(len(set(m.group(0).lower() for m in re.finditer(s['kw'],txt,re.I))),s) for s in SL if ok(s)]
        scored=[x for x in scored if x[0]>0]
        if scored:
            k,s=max(scored,key=lambda x:x[0])
            terms=sorted(set(m.group(0) for m in re.finditer(s['kw'],txt,re.I)),key=str.lower)[:4]
            st['link_line']=f"Connects to “{s['title']}” through: {', '.join(terms)}."
            groups[s['id']].append(st)
        else: other.append(st)
    key=lambda st:(-(st['last']//86400),-st['n'])
    out['regions'].append({'id':rid,'count':sum(len(c) for c in clusters),'latest':max([i['ts'] for i in items],default=None),
        'storylines':[{'id':k,'stories':sorted(v,key=key)} for k,v in groups.items()],'other':sorted(other,key=key)})
    print(rid,len(items),'items',len(clusters),'stories',{k:len(v) for k,v in groups.items()},'other',len(other))
json.dump(out,open(os.path.join(os.environ.get('SITE_DIR','..'),'data/stories.json'),'w'),ensure_ascii=False)
