import json,collections,csv,re,itertools,os,pandas as pd
OUT=os.environ.get('PAY_OUT','/workspace/axis_inputs/payment_rails_out')
d=json.load(open(OUT+'/raw.json'))
chan=d['chan']; R=[]
for h,t,s,v in d['recs']:
    if t=='campaign':
        s=re.sub(r'[*«»]','',s.split('\n')[0]).strip()
        if 'فشار' in s or len(s)<6: continue
    R.append((h,t,s,v))
# merge after cleanup
M={}
for h,t,s,v in R:
    k=(h,t,s)
    if k in M:
        m=M[k];m['n']+=v['n'];m['first']=min(m['first'],v['first']);m['last']=max(m['last'],v['last']);m['posts']=(m['posts']+v['posts'])[:5]
    else: M[k]=dict(v)
sel=collections.defaultdict(lambda:{'chs':set(),'n':0,'first':'9','last':'0'})
for (h,t,s),v in M.items():
    S=sel[(t,s)];S['chs'].add(h);S['n']+=v['n'];S['first']=min(S['first'],v['first']);S['last']=max(S['last'],v['last'])
def mask(t,s):
    if t=='card': return s[:6]+'******'+s[-4:]
    if t=='iban': return s[:6]+'*'*14+s[-6:]
    if t=='donation_phone': return s[:-4]+'****'
    return s
GL={'irgc':'IRGC','hezbollah':'Hezbollah','houthi':'Houthi','hamas':'Hamas','pij':'PIJ','iraqi':'Iraqi militias','cyber':'Cyber personas','english':'English amplifiers','aligned':'Aligned media'}
nodes=[];idx={}
used=set(k[0] for k in M)
for h,c in chan.items():
    if h in used:
        idx['c:'+h]=len(nodes);nodes.append(dict(id='c:'+h,kind='channel',label='@'+c['handle'],group=c['group'],group_label=GL[c['group']],type='',posts_crawled=c['posts']))
for (t,s),S in sel.items():
    gs=sorted({chan[h]['group'] for h in S['chs']})
    idx[f's:{t}:{s}']=len(nodes);nodes.append(dict(id=f's:{t}:{s}',kind='selector',label=s,masked=mask(t,s),type=t,group='',n_channels=len(S['chs']),groups=';'.join(gs),n_groups=len(gs),mentions=S['n'],first_seen=S['first'],last_seen=S['last']))
edges=[]
for (h,t,s),v in M.items():
    edges.append(dict(source='c:'+h,target=f's:{t}:{s}',type=t,weight=v['n'],first_seen=v['first'],last_seen=v['last'],sample_posts=' | '.join(p[0] for p in v['posts']),_posts=v['posts']))
proj=collections.defaultdict(list)
for (t,s),S in sel.items():
    for a,b in itertools.combinations(sorted(S['chs']),2): proj[(a,b)].append(f'{t}:{s}')
pe=[dict(source='@'+chan[a]['handle'],target='@'+chan[b]['handle'],group_a=chan[a]['group'],group_b=chan[b]['group'],shared_selectors=len(v),cross_group=chan[a]['group']!=chan[b]['group'],selectors=' ; '.join(v)) for (a,b),v in proj.items()]
O=OUT+'/'
pd.DataFrame(nodes).to_csv(O+'nodes.csv',index=False)
pd.DataFrame([{k:v for k,v in e.items() if k!='_posts'} for e in edges]).to_csv(O+'edges.csv',index=False)
pd.DataFrame(pe).sort_values('shared_selectors',ascending=False).to_csv(O+'channel_projection.csv',index=False)
sdf=pd.DataFrame([n for n in nodes if n['kind']=='selector']).drop(columns=['kind','group','id']).sort_values(['n_channels','mentions'],ascending=False)
with pd.ExcelWriter(O+'selectors.xlsx') as w:
    sdf.to_excel(w,sheet_name='selectors',index=False)
    pd.DataFrame([{k:v for k,v in e.items() if k!='_posts'} for e in edges]).to_excel(w,sheet_name='channel_selector_edges',index=False)
    pd.DataFrame(pe).sort_values('shared_selectors',ascending=False).to_excel(w,sheet_name='channel_projection',index=False)
    pd.DataFrame([n for n in nodes if n['kind']=='channel']).drop(columns=['kind','type']).to_excel(w,sheet_name='channels',index=False)
    pd.DataFrame([['Posts scanned',d['nposts']],['Channels scanned',len(chan)],['Method','Regex extraction; Luhn check for 16-digit cards (Iranian BIN prefix or donation-context text); IBAN mod-97; Base58Check for BTC legacy/TRON; EVM 0x40-hex; phones and campaign names only in donation-context posts'],['Note','Full card/IBAN/phone values are unmasked in this internal file; column masked gives redacted form for public use']],columns=['field','value']).to_excel(w,sheet_name='readme',index=False)
J=dict(nodes=nodes,edges=[[idx[e['source']],idx[e['target']],e['weight'],e['first_seen'],e['last_seen'],e['_posts']] for e in edges],proj=pe,stats=dict(posts=d['nposts'],channels_scanned=len(chan)))
pass  # (HTML viewer data.js not needed for the Axis page)
tc=collections.Counter(n['type'] for n in nodes if n['kind']=='selector')
print(tc,len(used),collections.Counter(n['group'] for n in nodes if n['kind']=='channel'))
for n in sorted([n for n in nodes if n['kind']=='selector'],key=lambda n:(-n['n_groups'],-n['n_channels'],-n['mentions']))[:20]: print(n['type'],n['label'],n['n_channels'],n['groups'],n['mentions'],n['first_seen'],n['last_seen'])
x=[p for p in pe if p['cross_group']]; print('cross pairs',len(x)); [print(p['source'],p['target'],p['group_a'],p['group_b'],p['shared_selectors']) for p in sorted(x,key=lambda p:-p['shared_selectors'])[:15]]
