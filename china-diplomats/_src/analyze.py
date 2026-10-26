"""China Diplomats on X - analysis. Reads collector state (CD_STATE) + accounts.csv, writes ../data/*.json and posts.csv.
Usage: CD_STATE=... python3 analyze.py [--start 2026-10-17T00:00:00Z] [--out ../data]"""
import json,csv,re,os,sys,collections,datetime as dt,math
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from langdetect import detect,DetectorFactory
DetectorFactory.seed=0
H=os.path.dirname(os.path.abspath(__file__))
ST=os.environ.get('CD_STATE',os.path.join(H,'..','..','state'))
A=sys.argv
START=A[A.index('--start')+1] if '--start' in A else '2026-10-17T00:00:00Z'
OUT=A[A.index('--out')+1] if '--out' in A else os.path.join(H,'..','data')
os.makedirs(OUT,exist_ok=True)
NAMES=json.load(open(os.path.join(H,'cluster_names.json'))) if os.path.exists(os.path.join(H,'cluster_names.json')) else {}
CENT=json.load(open(os.path.join(H,'centroids.json')))
acc={r['handle'].lower():r for r in csv.DictReader(open(os.path.join(H,'accounts.csv')))}
users=json.load(open(os.path.join(ST,'users.json')));refs=json.load(open(os.path.join(ST,'refs.json')))
def T(s):return dt.datetime.fromisoformat(s.replace('Z','+00:00'))
posts=[json.loads(l) for l in open(os.path.join(ST,'posts.jsonl'))]
posts=[p for p in posts if p['created_at']>=START]
END=max(p['created_at'] for p in posts)
posts.sort(key=lambda p:p['created_at'])
def kind(p):
    t=[r['type'] for r in p.get('referenced_tweets',[])]
    return 'repost' if 'retweeted' in t else 'quote' if 'quoted' in t else 'reply' if 'replied_to' in t else 'post'
def ref(p,typ):
    for r in p.get('referenced_tweets',[]):
        if r['type']==typ:return r['id']
U=lambda i:users.get(i,{}).get('username','?')
def clean(s):
    s=re.sub(r'^RT @\w+:\s*','',s or '');s=re.sub(r'https?://\S+','',s);s=re.sub(r'@\w+','',s);s=re.sub(r'#','',s)
    return re.sub(r'\s+',' ',s).strip()
def typ(a):
    if not a:return 'Outside account'
    t=a['type'];return {'embassy':'Embassy','consulate':'Consulate','ambassador':'Diplomat','other':'Diplomat','mfa':'Foreign ministry'}[t]
rows=[]
for p in posts:
    h=U(p['author_id']);a=acc.get(h.lower());k=kind(p)
    oid=ref(p,'retweeted') or ref(p,'quoted')
    if k=='repost' and oid in refs: content=refs[oid]['text']
    else: content=p['text']
    if k=='quote' and oid in refs: content=content+' '+(refs[oid].get('text') or '')
    c=clean(content)
    try: lang=detect(c) if len(c)>15 else 'und'
    except Exception: lang='und'
    if re.search(r'[\u4e00-\u9fff]',c) and lang not in('zh-cn','zh-tw','ja','ko'):lang='zh-cn'
    rows.append(dict(id=p['id'],t=p['created_at'][:19]+'Z',h=h,k=k,oid=oid,oa=U(refs[oid]['author_id']) if oid in refs else None,
        ot=(refs[oid]['created_at'][:19]+'Z') if oid in refs and refs[oid].get('created_at') else None,
        text=p['text'],c=c,lang=lang[:2],country=a['country_posted'] if a else '?',region=(re.search(r'region=([^;]+)',a['notes']).group(1).strip() if a and 'region=' in a['notes'] else '?'),
        type=typ(a),likes=p['public_metrics']['like_count'],rts=p['public_metrics']['retweet_count'],views=p['public_metrics'].get('impression_count',0)))
N=len(rows);print('posts',N,'window',START,END)
# ---------- near-duplicate clustering ----------
par=list(range(N))
def f(i):
    while par[i]!=i: par[i]=par[par[i]];i=par[i]
    return i
def un(i,j):par[f(i)]=f(j)
byo=collections.defaultdict(list)
for i,r in enumerate(rows):
    if r['oid']:byo[r['oid']].append(i)
    byo[r['id']].append(i)   # a post and reposts of it
for v in byo.values():
    for j in v[1:]:un(v[0],j)
txt=[r['c'] for r in rows];ok=[i for i in range(N) if len(txt[i])>=40]
V=TfidfVectorizer(analyzer='char_wb',ngram_range=(3,5),min_df=2,sublinear_tf=True).fit_transform([txt[i] for i in ok])
nn=NearestNeighbors(n_neighbors=8,metric='cosine').fit(V);dist,ind=nn.kneighbors(V)
SIM=0.55
for a_,(d,ix) in enumerate(zip(dist,ind)):
    for dd,b_ in zip(d,ix):
        if b_!=a_ and 1-dd>=SIM: un(ok[a_],ok[b_])
cl=collections.defaultdict(list)
for i in range(N):cl[f(i)].append(i)
clusters=[]
for root,m in cl.items():
    hs={rows[i]['h'] for i in m}
    if len(hs)<3:continue
    m.sort(key=lambda i:rows[i]['t'])
    clusters.append(m)
clusters.sort(key=lambda m:(-len({rows[i]['h'] for i in m}),-len(m)))
def rep(m):
    # representative text: most common original text among members (longest content of earliest original post)
    c=collections.Counter(rows[i]['c'][:280] for i in m);return c.most_common(1)[0][0]
CL=[]
for n,m in enumerate(clusters[:40]):
    key=rows[m[0]]['id']
    hs=[];seen=set()
    for i in m:
        if rows[i]['h'] not in seen:seen.add(rows[i]['h']);hs.append(i)
    nm=NAMES.get(key,{})
    CL.append(dict(key=key,n=len(m),accounts=len(seen),countries=len({rows[i]['country'] for i in m}),first=rows[m[0]]['t'],last=rows[m[-1]]['t'],
        langs=dict(collections.Counter(rows[i]['lang'] for i in m).most_common(4)),sample=rep(m),name=nm.get('name'),desc=nm.get('desc'),
        spread=[dict(h=rows[i]['h'],t=rows[i]['t'],k=rows[i]['k'],country=rows[i]['country'],id=rows[i]['id']) for i in hs]))
    for i in m: rows[i].setdefault('cl',n)
json.dump(CL,open(os.path.join(H,'clusters_review.json'),'w'),ensure_ascii=False,indent=1)
# merge named clusters that share a human-written name into one talking point
grp=collections.OrderedDict()
for n,c in enumerate(CL):
    if c['name']: grp.setdefault(c['name'],[]).append(n)
named=[]
for nm_,ixs in grp.items():
    m=sorted({i for n in ixs for i in clusters[n]},key=lambda i:rows[i]['t']);seen=set();hs=[]
    for i in m:
        if rows[i]['h'] not in seen:seen.add(rows[i]['h']);hs.append(i)
        rows[i]['tp']=nm_
    named.append(dict(key=CL[ixs[0]]['key'],name=nm_,desc=CL[ixs[0]]['desc'],n=len(m),accounts=len(seen),countries=len({rows[i]['country'] for i in m}),first=rows[m[0]]['t'],last=rows[m[-1]]['t'],
        langs=dict(collections.Counter(rows[i]['lang'] for i in m).most_common(4)),spread=[dict(h=rows[i]['h'],t=rows[i]['t'],k=rows[i]['k'],country=rows[i]['country'],id=rows[i]['id']) for i in hs],ids=[rows[i]['id'] for i in m]))
named.sort(key=lambda c:-c['accounts'])
# ---------- days ----------
d0=T(START).date();d1=T(END).date();days=[(d0+dt.timedelta(d)).isoformat() for d in range((d1-d0).days+1)]
# ---------- streamgraph (top named talking points, daily) ----------
TOP=named[:5]
_NI={v['name']:v for v in NAMES.values()}
stream=dict(days=days,series=[dict(name=c['name'],line=_NI.get(c['name'],{}).get('line',''),says=_NI.get(c['name'],{}).get('says',''),sample=_NI.get(c['name'],{}).get('sample'),vals=[0]*len(days)) for c in TOP])
ki={c['key']:j for j,c in enumerate(TOP)}
kn={c['name']:j for j,c in enumerate(TOP)}
for r in rows:
    if r.get('tp') in kn: stream['series'][kn[r['tp']]]['vals'][days.index(r['t'][:10])]+=1
# ---------- matrix: which embassies push which talking points ----------
mx=collections.defaultdict(lambda:collections.Counter())
for r in rows:
    if r.get('tp'): mx[r['h']][r['tp']]+=1
matrix=dict(points=[c['name'] for c in named],rows=sorted([dict(h=h,country=acc.get(h.lower(),{}).get('country_posted','?'),cells=dict(v)) for h,v in mx.items()],key=lambda x:-sum(x['cells'].values()))[:40])
# ---------- synchronized bursts ----------
WIN=dt.timedelta(hours=6);bursts=[]
for n,m in enumerate(clusters[:40]):
    ts=[(T(rows[i]['t']),i) for i in m];j=0;used=set()
    for a_ in range(len(ts)):
        if ts[a_][1] in used:continue
        grp=[x for x in ts if ts[a_][0]<=x[0]<=ts[a_][0]+WIN and x[1] not in used]
        hs={rows[i]['h'] for _,i in grp}
        if len(hs)>=4:
            for _,i in grp:used.add(i)
            mem=[i for _,i in grp];en=[rows[i]['c'] for i in mem if rows[i]['lang']=='en' and len(rows[i]['c'])>20]
            q=collections.Counter(en).most_common(1)[0][0] if en else rows[mem[0]]['c']
            bursts.append(dict(cl=n,name=CL[n]['name'] or CL[n]['sample'][:90],named=bool(CL[n]['name']),start=rows[grp[0][1]]['t'],end=rows[grp[-1][1]]['t'],accounts=len(hs),
              countries=len({rows[i]['country'] for i in mem}),quote=q[:220]+('…' if len(q)>220 else ''),quote_en=bool(en),langs=dict(collections.Counter(rows[i]['lang'] for i in mem)),ids=[rows[i]['id'] for i in mem]))
burst_ids={i for b in bursts for i in b['ids']}
cal={}
for r in rows:
    d=r['t'][:10];hh=int(r['t'][11:13]);c=cal.setdefault(d,dict(all=[0]*24,burst=[0]*24))
    c['all'][hh]+=1
    if r['id'] in burst_ids:c['burst'][hh]+=1
# ---------- amplifiers ----------
E=collections.Counter();fast=collections.Counter();delays=[]
for r in rows:
    if r['k'] in('repost','quote') and r['oa'] and r['ot'] and r['oa']!=r['h']:
        dm=(T(r['t'])-T(r['ot'])).total_seconds()/60
        E[(r['h'],r['oa'])]+=1;delays.append(dm)
        if dm<=60:fast[(r['h'],r['oa'])]+=1
LBL_OVR={'MFA_China':'Foreign Ministry spokesperson','SpoxCHN_MaoNing':'Spokesperson Mao Ning','SpoxCHN_LinJian':'Spokesperson Lin Jian','DGAfrica_MFA':'MFA Africa dept (Du Xiaohui)',
 'Ambassador_Liu':'Liu Yuxi (MFA)','ChnConsul_osaka':'Consulate in Osaka','ChnEmbassy_jp':'Embassy in Japan','XisMoments':"Xi's Moments (state media)",'CgtnJapanese':'CGTN Japanese','XHNews':'Xinhua News',
 'CGTNOfficial':'CGTN','PDChina':"People's Daily",'globaltimesnews':'Global Times','ChinaDaily':'China Daily','peopledailyJP':"People's Daily Japan",
 'ChnConsulateFuk':'Consulate in Fukuoka','CG_GuoShaochun':'Consul General in New York','ChinaConsAlmaty':'Consulate in Almaty','ConsulChinaRJ':'Consulate in Rio de Janeiro','CGPRCinDubai':'Consulate in Dubai',
 'ChnConsulateNgt':'Consulate in Niigata','chinaconsulist':'Consulate in Istanbul','ChinaConsulate':'Consulate in Chicago','ChnConsulateNag':'Consulate in Nagasaki','ChnConsulateSpk':'Consulate in Sapporo',
 'CG_ZhangJianmin':'Consul General in Los Angeles','CGChinaSP':'Consulate in São Paulo','TheGoldenMean2':'The Golden Mean (blog)','work_worth':'Worth Work Words (blog)','sakuranohana_cj':'Sakura no Hana (blog)'}
def latin(n):
    m=re.findall(r"[A-Za-z][A-Za-z.'\- ]+[A-Za-z]",n or '');return max(m,key=len).strip() if m else ''
def label(h):
    if h in LBL_OVR:return LBL_OVR[h]
    a=acc.get(h.lower())
    if not a:
        n=next((u['name'] for u in users.values() if u.get('username')==h),h);return latin(n) or n
    t,c,n=a['type'],a['country_posted'],a['name']
    if t=='embassy':return f'Embassy in {c}'
    if t=='consulate':
        m=re.search(r'(?:in|at|en|à|em|in) ([A-Z][a-zé]+(?: [A-Z][a-z]+)?)',n)
        city=m.group(1) if m and m.group(1) not in('US','UK') else None
        return f'Consulate in {city}' if city else f'Consulate ({c})'
    if t=='ambassador':return f'Ambassador to {c}' if 'Amb' in h or 'amb' in n.lower() else f'{latin(n) or h} ({c})'
    return f'{latin(n) or h} ({c})'
def region(h):
    a=acc.get(h.lower())
    if not a:return 'State media and other'
    m=re.search(r'region=([^;]+)',a['notes']);return m.group(1).strip() if m else '?'
inn=collections.Counter();outc=collections.Counter()
for (a_,b_),w in E.items():outc[a_]+=w;inn[b_]+=w
allh={x for e in E for x in e}
nodes=[dict(id=h,label=label(h),type=typ(acc.get(h.lower())),country=acc.get(h.lower(),{}).get('country_posted','Outside account'),region=region(h),out=outc[h],inn=inn[h]) for h in allh]
links=[dict(s=a_,t=b_,w=w,fast=fast[(a_,b_)]) for (a_,b_),w in E.items()]
net=dict(nodes=nodes,links=links,total_edges=sum(E.values()),fast_share=round(sum(fast.values())/max(1,sum(E.values())),3),median_delay_min=round(float(np.median(delays)),1) if delays else None)
# ---------- ripples: most amplified original posts ----------
byo2=collections.defaultdict(list)
for r in rows:
    if r['k'] in('repost','quote') and r['oid'] and r['ot'] and r['oa']!=r['h']: byo2[r['oid']].append(r)
tpid={r['id']:r.get('tp') for r in rows}
ripples=[]
for oid,rs in sorted(byo2.items(),key=lambda x:-len({r['h'] for r in x[1]}))[:40]:
    seen=set();am=[]
    for r in sorted(rs,key=lambda r:r['t']):
        if r['h'] in seen:continue
        seen.add(r['h']);am.append(dict(h=r['h'],label=label(r['h']),type=typ(acc.get(r['h'].lower())),country=r['country'],t=r['t'],k=r['k'],id=r['id'],delay=round((T(r['t'])-T(r['ot'])).total_seconds()/60,1)))
    theme=collections.Counter(x.get('tp') for x in rows if x.get('oid')==oid and x.get('tp')).most_common(1)
    oa=rs[0]['oa'];ripples.append(dict(oid=oid,h=oa,label=label(oa),type=typ(acc.get(oa.lower())),t=rs[0]['ot'],text=clean(refs[oid]['text'])[:260],theme=theme[0][0] if theme else None,amps=am))
# keep the most amplified post per theme first, then the rest; at most 8
pick=[];th=set()
for r in ripples:
    if r['theme'] and r['theme'] not in th: th.add(r['theme']);pick.append(r)
for r in ripples:
    if len(pick)>=8:break
    if r not in pick and len(r['amps'])>=6: pick.append(r)
pick=sorted(pick,key=lambda r:-len(r['amps']))[:8]
# ---------- tone ----------
CONF=r"hegemon|bully|bullying|smear|slander|lies\b|\blie\b|interfer|provocat|cold war mentality|zero-sum|so-called|hypocri|double standard|condemn|firmly oppose|strongly oppose|resolutely oppose|playing with fire|separatis|independence forces|containment|bloc confrontation|unilateral sanction|coerc|groundless|fabricat|politiciz|militaris|militariz|right-wing|aggress|threat|warn|protectionis|stop .{0,20}immediately|霸权|霸凌|抹黑|干涉|挑衅|谴责|坚决反对|强烈不满|冷战思维|双重标准|所谓|污蔑|造谣|台独|军国主义|hegemonía|injerencia|calumnia|condena|hégémonie|ingérence|calomnie|condamn|覇権|中傷|内政干渉|挑発|非難|断固反対|強い不満|軍国主義|台湾独立|右翼|抗議|гегемон|вмешательств|клевет|провокац|هيمنة|تدخل"
COOP=r"cooperat|win-win|friendship|friendly|partnership|mutual benefit|mutually beneficial|shared future|exchange|development|together|congratulat|welcome|joint|dialogue|peace|people-to-people|culture|cultural|festival|celebrat|thank|grateful|signing|agreement|harmon|合作|共赢|友谊|友好|交流|发展|携手|共同体|祝贺|欢迎|和平|cooperación|amistad|desarrollo|coopération|amitié|développement|cooperação|amizade|協力|友好|交流|発展|平和|歓迎|祝賀|ウィンウィン|сотрудничеств|дружб|развити|تعاون|صداقة|تنمية"
def tone(c):
    c=c.lower();return len(re.findall(CONF,c)),len(re.findall(COOP,c))
for r in rows:r['cf'],r['cp']=tone(r['c'])
def wk(d):x=dt.date.fromisoformat(d);return (x-dt.timedelta(days=x.weekday())).isoformat()
weeks=sorted({wk(d) for d in days})
per='week' if len(weeks)>=3 else 'day'
periods=weeks if per=='week' else days
tc=collections.defaultdict(lambda:[0,0,0])
for r in rows:
    key=(r['country'],wk(r['t'][:10]) if per=='week' else r['t'][:10]);x=tc[key];x[0]+=r['cf'];x[1]+=r['cp'];x[2]+=1
countries=sorted({r['country'] for r in rows})
def score(cf,cp):return round((cf-cp)/(cf+cp),3) if cf+cp>=2 else None
GEO={'Antigua and Barbuda':'Antigua and Barb.','Congo (Rep.)':'Congo','DR Congo':'Dem. Rep. Congo','Equatorial Guinea':'Eq. Guinea','North Macedonia':'Macedonia','South Sudan':'S. Sudan','UAE':'United Arab Emirates','United States':'United States of America','China (HQ)':'China'}
ENT={'ASEAN','African Union','EU','OPCW','UN/Intl orgs Geneva','UN/Intl orgs Vienna','United Nations (NY)'}
# ---------- aggression (v2): per-post lexicon scoring in main languages ----------
AGG=[r"hegemon",r"bull(y|ying|ies)",r"smear",r"slander",r"\blies\b",r"\blie\b",r"interfer",r"provocat",r"cold[- ]war mentality",r"zero-sum",r"so-called",r"hypocri",r"double standard",r"condemn",r"(firmly|strongly|resolutely) oppose",r"playing with fire",r"separatis",r"independence forces",r"containment",r"bloc confrontation",r"unilateral sanction",r"coerc",r"groundless",r"fabricat",r"politici[sz]",r"militari[sz]",r"right-wing",r"aggress",r"\bthreat",r"\bwarn",r"protectionis",r"immediately stop",r"stop .{0,20}immediately",r"disinformation",r"\bdesperate",r"\bshameless",r"irresponsible",r"strong dissatisfaction",r"stern representations",r"crush",r"\bvicious",r"\bmalicious",r"\bblackmail",r"\bhysteri",
 r"霸权",r"霸凌",r"抹黑",r"干涉",r"挑衅",r"谴责",r"坚决反对",r"强烈不满",r"冷战思维",r"双重标准",r"所谓",r"污蔑",r"造谣",r"台独",r"军国主义",r"严正交涉",r"玩火",r"无耻",r"恶意",
 r"hegemon[ií]a",r"injerencia",r"calumni",r"condena",r"provocaci[oó]n",r"amenaza",r"rechaz",r"hégémon",r"ingérence",r"calomni",r"condamn",r"provocation",r"menace",r"hegemonia",r"ingerência",r"calúnia",r"ameaça",r"Hegemon",r"Einmischung",r"Verleumdung",r"Provokation",r"verurteil",
 r"覇権",r"中傷",r"内政干渉",r"挑発",r"非難",r"断固反対",r"強い不満",r"軍国主義",r"台湾独立",r"右翼",r"抗議",r"패권",r"내정간섭",r"도발",
 r"гегемон",r"вмешательств",r"клевет",r"провокац",r"осужда",r"угроз",r"هيمنة",r"تدخل",r"افتراء",r"استفزاز",r"تهديد",r"إدانة"]
FRI=[r"cooperat",r"win-win",r"friendship",r"friendly",r"partnership",r"mutual(ly)? benefi",r"shared future",r"exchange",r"together",r"congratulat",r"welcome",r"dialogue",r"\bpeace",r"people-to-people",r"cultur",r"festival",r"celebrat",r"\bthank",r"grateful",r"agreement",r"harmon",r"warm",r"beautiful",r"happy",r"brotherly",r"solidarity",r"\bjoin hands",
 r"合作",r"共赢",r"友谊",r"友好",r"交流",r"携手",r"共同体",r"祝贺",r"欢迎",r"和平",r"感谢",r"美好",
 r"cooperaci[oó]n",r"amistad",r"hermand",r"felicit",r"gracias",r"coopération",r"amitié",r"félicit",r"merci",r"cooperação",r"amizade",r"parabéns",r"obrigad",r"Zusammenarbeit",r"Freundschaft",r"Glückwunsch",
 r"協力",r"友好",r"交流",r"平和",r"歓迎",r"祝賀",r"ウィンウィン",r"感謝",r"협력",r"우호",r"친선",
 r"сотрудничеств",r"дружб",r"поздравл",r"спасибо",r"تعاون",r"صداقة",r"تهنئة",r"شكر"]
AGR=re.compile("|".join(AGG),re.I);FRR=re.compile("|".join(FRI),re.I)
for r in rows:
    a=len(AGR.findall(r['text']));f=len(FRR.findall(r['text']));r['ag'],r['fr']=a,f
    r['tl']='a' if a>f else 'f' if f>a else 'n'
MINP=5
GEO={'Antigua and Barbuda':'Antigua and Barb.','Congo (Rep.)':'Congo','DR Congo':'Dem. Rep. Congo','Equatorial Guinea':'Eq. Guinea','North Macedonia':'Macedonia','South Sudan':'S. Sudan','UAE':'United Arab Emirates','United States':'United States of America','China (HQ)':'China'}
ENT={'ASEAN','African Union','EU','OPCW','UN/Intl orgs Geneva','UN/Intl orgs Vienna','United Nations (NY)'}
tonemap=dict(min_posts=MINP,countries=[])
byc=collections.defaultdict(list)
for r in rows:byc[r['country']].append(r)
snip=lambda r:dict(id=r['id'],h=r['h'],t=r['t'],text=r['text'][:220])
for c,rs in sorted(byc.items()):
    n=len(rs);na=sum(r['tl']=='a' for r in rs);nf=sum(r['tl']=='f' for r in rs)
    harsh=sorted([r for r in rs if r['ag']>0],key=lambda r:-(r['ag']-r['fr']))[:3]
    fri=sorted([r for r in rs if r['fr']>r['ag']],key=lambda r:-(r['fr']-r['ag']))[:3]
    tonemap['countries'].append(dict(country=c,ll=CENT.get(c),geo=None if c in ENT else GEO.get(c,c),posts=n,agg=round(na/n,3),fri=round(nf/n,3),idx=round((nf-na)/n,3),harsh=[snip(r) for r in harsh],friendly=[snip(r) for r in fri]))
# ---------- map spread: per named cluster ----------
mapd=[dict(key=c['key'],name=c['name'],desc=c['desc'],n=c['n'],langs=c['langs'],ids=c['ids'][:60],first=c['first'],last=c['last'],accounts=c['accounts'],countries=c['countries'],
    spread=[dict(s,ll=CENT.get(s['country'])) for s in c['spread']]) for c in named]
# ---------- accounts ----------
pc=collections.Counter(r['h'] for r in rows)
accts=[dict(h=r['handle'],name=r['name'],type=typ(r),country=r['country_posted'],followers=int(r['followers'] or 0),posts=pc.get(r['handle'],0),ll=CENT.get(r['country_posted'])) for r in acc.values()]
# ---------- headline ----------
_bt=collections.defaultdict(set)
for b in bursts:
    for i in b['ids']:_bt[b['name']].add(next(r['h'] for r in rows if r['id']==i))
_tb=max(_bt,key=lambda k:len(_bt[k])) if _bt else ''
head=dict(accounts=len(acc),topburst=_tb,topburst_acc=len(_bt.get(_tb,())),active=len({r['h'] for r in rows if r['h'].lower() in acc}),posts=N,reposts=sum(r['k']=='repost' for r in rows),
    countries=len({r['country'] for r in rows if r['country']!='?'}),clusters=len(clusters),bursts=len(bursts),start=START,end=END,days=len(days),
    langs=dict(collections.Counter(r['lang'] for r in rows).most_common(8)))
# ---------- posts for panels ----------
pp={r['id']:dict(h=r['h'],t=r['t'],k=r['k'],text=r['text'][:400],country=r['country'],oa=r['oa']) for r in rows if r['id'] in burst_ids or r.get('tp')}
_tpn=sorted({r['tp'] for r in rows if r.get('tp')})
archive=dict(narratives=_tpn,kinds=['post','repost','quote','reply'],rows=[[r['id'],r['h'],r['t'][:16],['post','repost','quote','reply'].index(r['k']) if r['k'] in ('post','repost','quote','reply') else 0,r['country'],_tpn.index(r['tp']) if r.get('tp') else -1,r['text']] for r in rows])
head['list_checked']=dt.datetime.fromtimestamp(os.path.getmtime(os.path.join(H,'accounts.csv'))).strftime('%-d %b %Y')
for nm_,obj in [('archive',archive),('headline',head),('stream',stream),('matrix',matrix),('bursts',dict(bursts=bursts,cal=cal,days=days)),('network',net),('ripples',pick),('tone',tonemap),('spread',mapd),('accounts',accts),('posts',pp)]:
    json.dump(obj,open(os.path.join(OUT,nm_+'.json'),'w'),ensure_ascii=False,separators=(',',':'))
with open(os.path.join(H,'..','posts_export.csv'),'w',newline='') as fo:
    w=csv.writer(fo);w.writerow(['id','created_at_utc','handle','country','account_type','kind','lang','text','referenced_author','likes','reposts','views','cluster','url'])
    for r in rows:w.writerow([r['id'],r['t'],r['h'],r['country'],r['type'],r['k'],r['lang'],r['text'],r['oa'] or '',r['likes'],r['rts'],r['views'],r.get('tp',''),f"https://x.com/{r['h']}/status/{r['id']}"])
print(json.dumps(head));print('clusters>=3 accts',len(clusters),'named',len(named),'bursts',len(bursts),'net',net['total_edges'],net['fast_share'],net['median_delay_min'],'period',per)
