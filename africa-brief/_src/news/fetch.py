import csv,json,re,feedparser,concurrent.futures as cf,time,urllib.request,calendar
O=[o for o in csv.DictReader(open('../media/outlets.csv')) if o['rss_feed'].startswith('http') and o['rss_status']=='OK']
O=[o for o in O if not re.search(r'\.cn(/|$|:)',o['rss_feed']+' '+o['url'])]
def get(o):
    try:
        req=urllib.request.Request(o['rss_feed'],headers={'User-Agent':'Mozilla/5.0 (AfricaBrief research)'})
        raw=urllib.request.urlopen(req,timeout=20).read()
        f=feedparser.parse(raw); out=[]
        for e in f.entries[:40]:
            t=e.get('published_parsed') or e.get('updated_parsed')
            if not t or not e.get('link') or not e.get('title'): continue
            out.append({'outlet':o['id'],'title':re.sub(r'\s+',' ',e.title).strip(),'link':e.link,'ts':calendar.timegm(t),'summary':re.sub('<[^>]+>','',e.get('summary',''))[:400]})
        return o['id'],out,None
    except Exception as ex: return o['id'],[],str(ex)[:80]
R={};err={}
with cf.ThreadPoolExecutor(16) as ex:
    for oid,items,e in ex.map(get,O):
        R[oid]=items
        if e or not items: err[oid]=e or 'no dated items'
json.dump({'fetched':time.strftime('%Y-%m-%d %H:%M %Z'),'items':R,'errors':err},open('raw.json','w'),ensure_ascii=False)
print('feeds',len(O),'ok',sum(1 for v in R.values() if v),'items',sum(map(len,R.values())),'fail',len(err))
