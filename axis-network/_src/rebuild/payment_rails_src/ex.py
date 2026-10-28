import csv,glob,os,re,json,hashlib,collections,sys
csv.field_size_limit(10**9)
W=os.environ.get('PAY_W','/workspace/axis_work_2026-10-26')  # folder holding dashboard/data.json, new_groups, hamas_handles, candidate_channels.csv, origin_sources, backfill/data
G={}
d=json.load(open(W+'/dashboard/data.json'))
for n in d['N']: G[n[1].lower()]=n[2]; G[n[0].lower()]=n[2]
gm={'iraq_militias':'iraqi','amplifiers':'english','hacktivists':'cyber'}
for r in csv.DictReader(open(W+'/new_groups/handles.csv')):
    if r['HANDLE']: G.setdefault(r['HANDLE'].lower(),gm.get(r['GROUP'],r['GROUP']))
for f in ['crawl_cyber_persona.txt','crawl_english_amplifier.txt','crawl_iraqi_militia.txt']:
    g={'crawl_cyber_persona.txt':'cyber','crawl_english_amplifier.txt':'english','crawl_iraqi_militia.txt':'iraqi'}[f]
    for l in open(W+'/new_groups/'+f):
        h=l.strip().lstrip('@').split('/')[-1].lower()
        if h and not h.startswith('#'): G.setdefault(h,g)
for f in glob.glob(W+'/hamas_handles/*.csv'):
    for r in csv.DictReader(open(f)):
        h=(r.get('HANDLE') or '').lower()
        if h: G.setdefault(h,'pij' if 'PIJ' in (r.get('SOURCE','')+r.get('ROLE','')) or 'jihad' in r.get('SOURCE','').lower() or 'saraya' in r.get('SOURCE','').lower() else 'hamas')
for r in csv.DictReader(open(W+'/candidate_channels.csv')): G.setdefault(r['HANDLE'].lower(),'irgc' if 'IRGC' in r['AFFILIATION_BASIS'] else 'aligned')
for r in csv.DictReader(open(W+'/origin_sources/origin_handles.csv')):
    if r['HANDLE']: G.setdefault(r['HANDLE'].lower(),'irgc')
OV={'arabic_farsnews':'irgc','nournews_ir':'irgc','afsaran_ir':'irgc','sarbazane_g':'irgc','mahdaviatsiasi':'irgc','serfan_jahate_ettela':'irgc','bisimchimedia':'irgc','kataebabuali':'iraqi','alnujaba':'iraqi','mmirleb':'hezbollah','alakhbar_news':'hezbollah','abdulsalamsalah':'houthi','militarymediayvideos1':'houthi','mmy1444':'houthi','alhaqiqalaghayr':'houthi','marqadalsayedpr':'houthi','torathsayid':'houthi'}
def grp(h,folder):
    h2=h.lower()
    if h2 in OV: return OV[h2]
    if h2 in G and G[h2] not in('platform','other'): return G[h2]
    for k,g in [('masirah','houthi'),('saba','houthi'),('ansar','houthi'),('army21','houthi'),('yemen','houthi'),('houthi','houthi'),('manar','hezbollah'),('ahed','hezbollah'),('mmirl','hezbollah'),('hezb','hezbollah'),('sepah','irgc'),('saberin','irgc'),('khamenei','irgc'),('fars','irgc'),('tasnim','irgc'),('qassam','hamas'),('hamas','hamas'),('saraya','pij'),('quds','hamas')]:
        if k in h2: return g
    f=folder.lower()
    for k,g in [('hamas','hamas'),('houthi','houthi'),('hezbollah','hezbollah'),('iraq','iraqi'),('cyber','cyber'),('english','english'),('amplif','english'),('hack','cyber')]:
        if k in f: return g
    return 'aligned'
TR=str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789')
def luhn(s):
    t=0
    for i,c in enumerate(reversed(s)):
        x=int(c)
        if i%2: x=x*2-9 if x>4 else x*2
        t+=x
    return t%10==0
IRBIN=('603799','589210','627648','627961','603770','628023','627760','502908','627412','622106','502229','627488','621986','639346','639607','502806','603769','610433','589463','627353','585983','627381','505785','636214','636795','606373','504706','505416','639370','585947','502938','505801','628157','507677','606256','991975','639217','639599','636949','504172')
B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def b58ok(s):
    n=0
    for c in s: n=n*58+B58.index(c)
    b=n.to_bytes(25,'big')
    return hashlib.sha256(hashlib.sha256(b[:21]).digest()).digest()[:4]==b[21:]
def ibanok(s):
    r=s[4:]+s[:4]; r=''.join(str(int(c,36)) for c in r); return int(r)%97==1
DON=re.compile(r'تبرع|تبرّع|التبرع|دعم المقاومة|ادعم|حملة|حساب|واریز|کمک|اهدا|پویش|کارت|شماره حساب|نذر|donat|support|fund|campaign|paypal|wallet|zakat|زكاة|صدقة|جهاد بالمال|جهّزوا|تجهيز',re.I)
rx={
'card':re.compile(r'(?<!\d)(\d{4})[\s\-–]?(\d{4})[\s\-–]?(\d{4})[\s\-–]?(\d{4})(?!\d)'),
'iban':re.compile(r'\b(IR)\s?(\d{2})[\s]?((?:\d[\s]?){22})',re.I),
'btc':re.compile(r'\b(bc1[ac-hj-np-z02-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b'),
'eth':re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
'tron':re.compile(r'\bT[1-9A-HJ-NP-Za-km-z]{33}\b'),
'url':re.compile(r'(?:https?://)?(?:www\.)?((?:paypal\.me|paypal\.com/(?:donate|paypalme)|gofundme\.com|patreon\.com|buymeacoffee\.com|ko-fi\.com|launchgood\.com|idpay\.ir|zarinp\.al|zarinpal\.com|payping\.ir|reymit\.ir|hamibash\.com|nextpay\.org)/[^\s\)\]\"\'<>،]+)',re.I),
'phone':re.compile(r'(?<![\d+])(\+?(?:98|961|967|964|970|972|963)[\s\-]?\d[\d\s\-]{7,12}\d|09\d{9}|07[3-9]\d{8})(?!\d)'),
'campaign':re.compile(r'((?:حملة\s+(?:التبرع|تبرع|دعم|لدعم|إغاثة|لإغاثة|لنصرة|تجهيز|جمع|الوفاء)|پویش|کمپین|[Dd]onation [Cc]ampaign|[Ff]undraising)\s+[^\s،,.:!؟\n#]{2,20}(?:\s+[^\s،,.:!؟\n#]{2,20}){0,2})'),
}
STOPC={'campaign'}
os.makedirs(os.environ.get('PAY_OUT','/workspace/axis_inputs/payment_rails_out'),exist_ok=True)
recs=collections.defaultdict(lambda:{'n':0,'first':'9','last':'0','posts':[]})
chan={};seen=set();nposts=0
PAY_DIRS=[d for d in os.environ.get('PAY_POSTS_DIRS','/workspace/pz:/workspace/uploads/axis_collection_2026-10-26:/workspace/uploads/axis_collection_2026-10-27').split(':') if d]
files=[f for d in PAY_DIRS for f in glob.glob(d+'/**/posts/*.csv',recursive=True)]+glob.glob(W+'/backfill/data/posts/*.csv')
files=sorted(files,key=lambda f:(0 if '/pz/' in f or '/backfill/data/' in f else 1,f))  # older exports first, so first-seen url wins as before
for f in files:
    h=os.path.basename(f)[:-4]; g=grp(h,f)
    ci=chan.setdefault(h.lower(),{'handle':h,'group':g,'posts':0})
    for r in csv.DictReader(open(f,encoding='utf-8',errors='ignore')):
        u=r.get('url') or ''
        if u in seen: continue
        seen.add(u); nposts+=1; ci['posts']+=1
        t=(r.get('text') or '').translate(TR); dt=(r.get('date') or '')[:10]
        don=bool(DON.search(t)); hits=set()
        for m in rx['card'].finditer(t):
            s=''.join(m.groups())
            if luhn(s) and (s.startswith(IRBIN) or don) and len(set(s))>3: hits.add(('card',s))
        for m in rx['iban'].finditer(t):
            s='IR'+m.group(2)+re.sub(r'\s','',m.group(3))
            if len(s)==26 and ibanok(s): hits.add(('iban',s))
        for m in rx['btc'].finditer(t):
            s=m.group(1)
            if s.startswith('bc1') or b58ok(s): hits.add(('btc',s))
        for m in rx['eth'].finditer(t): hits.add(('eth_evm',m.group(0).lower()))
        for m in rx['tron'].finditer(t):
            if b58ok(m.group(0)): hits.add(('tron_usdt',m.group(0)))
        for m in rx['url'].finditer(t): hits.add(('payment_url',m.group(1).rstrip('.').lower()))
        if don:
            for m in rx['phone'].finditer(t):
                s=re.sub(r'[\s\-]','',m.group(1))
                if 10<=len(s.lstrip('+'))<=13: hits.add(('donation_phone',s))
            STRONG=re.search(r'تبرع|واریز|کمک|مشارکت|اهدا|donat|IBAN|حساب|کارت',t,re.I) or hits
            for m in (rx['campaign'].finditer(t) if STRONG else []):
                hits.add(('campaign',m.group(1).strip()))
        for k in (r.get('crypto_wallets') or '').split(';'):
            k=k.strip()
            if k.startswith('0x') and len(k)==42: hits.add(('eth_evm',k.lower()))
        for typ,s in hits:
            R=recs[(h.lower(),typ,s)]; R['n']+=1; R['first']=min(R['first'],dt); R['last']=max(R['last'],dt)
            if len(R['posts'])<5: R['posts'].append([u,dt,t[:220].replace('\n',' ')])
# campaigns: keep only those seen >=2 posts or >=2 channels
cc=collections.Counter(); cn=collections.Counter()
for (h,typ,s),R in recs.items():
    if typ=='campaign': cc[s]+=1; cn[s]+=R['n']
recs={k:v for k,v in recs.items() if k[1]!='campaign' or cc[k[2]]>=2 or cn[k[2]]>=3}
json.dump({'nposts':nposts,'chan':chan,'recs':[[k[0],k[1],k[2],v] for k,v in recs.items()]},open(os.environ.get('PAY_OUT','/workspace/axis_inputs/payment_rails_out')+'/raw.json','w'),ensure_ascii=False)
print(nposts,len(chan),collections.Counter(c['group'] for c in chan.values()),collections.Counter(k[1] for k in recs))
