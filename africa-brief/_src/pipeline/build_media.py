import csv,json,re,os
r=list(csv.DictReader(open('media/outlets.csv')))
FS=re.compile(r'rt_|sputnik|cgtn|startimes|rfi|france24|trt|aljazeera|africainitiative',re.I)
rows=[]
for x in r:
    v=x['ownership_verified'].lower().startswith('yes')
    if v or FS.search(x['id']):
        rows.append({k:x[k] for k in ('id','name','country','languages','owner','ownership_type','political_ties','ownership_source','state_media')}|{'verified':v,'foreign_state':bool(FS.search(x['id'])),'note':x['ownership_verified']})
n=json.load(open('news/news.json'));xp=json.load(open('news/x_posts.json'));raw=json.load(open('news/raw.json'))
json.dump({'ownership':rows,'news':n,'x':xp,'fetched':raw['fetched'],'feeds_ok':sum(1 for v in raw['items'].values() if v),'feeds_total':len(raw['items'])},open(os.path.join(os.environ.get('SITE_DIR','site'),'data/media.json'),'w'),ensure_ascii=False)
print(len(rows),sum(r['verified'] for r in rows))
