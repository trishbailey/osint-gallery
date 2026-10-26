#!/usr/bin/env python3
"""China Diplomats on X - incremental collector (free built-in X namespace 'x' only).

The X reads are made by the agent through the MCP tool x.search_posts_all, because the
free reads are only reachable through that tool. This script does all the bookkeeping:

  python3 collector.py plan [--backfill-start ISO] [--windows N]
      -> writes slot files under STATE/slots/<slot>/{query,start,end,token}
         Daily mode (default): one slot per account batch, start = last seen time (since_id kept too).
  python3 collector.py calls
      -> prints the pending slots and the exact tool arguments to send (inline values; the tool rejects $file: args)
  python3 collector.py ingest <slot>=<result_file> [...]
      -> merges posts into STATE/posts.jsonl, stores next_token or marks slot done
  python3 collector.py status
Every call = 1 read. Limits: 30/min, 1000/day (reset 00:00 UTC).
"""
import csv, json, os, sys, re, glob, datetime as dt
HERE=os.path.dirname(os.path.abspath(__file__))
STATE=os.environ.get('CD_STATE', os.path.join(HERE,'..','..','china-diplomats-state'))
ACC=os.environ.get('CD_ACCOUNTS', os.path.join(HERE,'accounts.csv'))
BATCHES=9
FIELDS={"max_results":25,"sort_order":"recency",
 "post.fields":"created_at,public_metrics,author_id,conversation_id,referenced_tweets",
 "expansions":"author_id,referenced_tweets.id,referenced_tweets.id.author_id",
 "user.fields":"username,name"}
def P(*a): return os.path.join(STATE,*a)
def load_state():
    try: return json.load(open(P('state.json')))
    except Exception: return {"newest_id":None,"newest_time":None,"oldest_time":None,"calls":[]}
def save_state(s): json.dump(s,open(P('state.json'),'w'),indent=1)
def batches():
    r=sorted(csv.DictReader(open(ACC)),key=lambda x:x['handle'].lower())
    return ['('+' OR '.join('from:'+x['handle'] for x in r[i::BATCHES])+')' for i in range(BATCHES)]
def iso(t): return t.strftime('%Y-%m-%dT%H:%M:%SZ')
def plan(args):
    os.makedirs(P('slots'),exist_ok=True)
    for d in glob.glob(P('slots','*')):
        for f in glob.glob(d+'/*'): os.remove(f)
        os.rmdir(d)
    s=load_state(); now=dt.datetime.utcnow().replace(microsecond=0)-dt.timedelta(seconds=30)
    if '--backfill-start' in args:
        st=dt.datetime.fromisoformat(args[args.index('--backfill-start')+1].replace('Z',''))
        en=dt.datetime.fromisoformat(s['oldest_time'].replace('Z','').replace('.000','')) if s.get('oldest_time') else now
    else:
        st=dt.datetime.fromisoformat(s['newest_time'].replace('Z','').replace('.000',''))+dt.timedelta(seconds=1) if s.get('newest_time') else now-dt.timedelta(days=1)
        en=now
    W=int(args[args.index('--windows')+1]) if '--windows' in args else 1
    step=(en-st)/W
    for bi,q in enumerate(batches()):
        for w in range(W):
            d=P('slots',f'b{bi}w{w}'); os.makedirs(d)
            open(d+'/query','w').write(q)
            open(d+'/start','w').write(iso(st+step*w)); open(d+'/end','w').write(iso(st+step*(w+1)))
    print('planned',BATCHES*W,'slots',iso(st),'->',iso(en))
def pending():
    return sorted(os.path.basename(d) for d in glob.glob(P('slots','*')) if not os.path.exists(d+'/done'))
def calls(args):
    out=[]
    for sl in pending():
        d=os.path.abspath(P('slots',sl)); a=dict(FIELDS)
        rd=lambda f:open(d+'/'+f).read().strip()
        a.update(query=rd('query'),start_time=rd('start'),end_time=rd('end'))
        if os.path.exists(d+'/token'): a['pagination_token']=rd('token')
        out.append({"slot":sl,"arguments":a})
    print(json.dumps(out,indent=1)); print(len(out),'pending',file=sys.stderr)
def parse_result(path):
    t=open(path).read()
    i=t.find('{'); j=t.rfind('}')
    return json.loads(t[i:j+1]), t
def ingest(args):
    s=load_state(); seen=set()
    pf=P('posts.jsonl'); uf=P('users.json'); rf=P('refs.json')
    if os.path.exists(pf):
        for l in open(pf): seen.add(json.loads(l)['id'])
    users=json.load(open(uf)) if os.path.exists(uf) else {}
    refs=json.load(open(rf)) if os.path.exists(rf) else {}
    n=0
    with open(pf,'a') as fo:
        for a in args:
            sl,path=a.split('=',1); d=P('slots',sl)
            j,raw=parse_result(path)
            if 'errors' in j and 'data' not in j and 'meta' not in j: print(sl,'ERROR',str(j)[:300]); continue
            inc=j.get('includes',{})
            for u in inc.get('users',[]): users[u['id']]={'username':u.get('username'),'name':u.get('name')}
            for t in inc.get('tweets',[]): refs[t['id']]={k:t.get(k) for k in ('author_id','created_at','text','lang')}
            for p in j.get('data',[]):
                if p['id'] in seen: continue
                seen.add(p['id']); fo.write(json.dumps(p,ensure_ascii=False)+'\n'); n+=1
                ct=p.get('created_at')
                if not s.get('newest_time') or ct>s['newest_time']: s['newest_time']=ct; s['newest_id']=p['id']
                if not s.get('oldest_time') or ct<s['oldest_time']: s['oldest_time']=ct
            nt=j.get('meta',{}).get('next_token')
            if nt: open(d+'/token','w').write(nt)
            else: open(d+'/done','w').write('1')
            s['calls'].append(dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M'))
    json.dump(users,open(uf,'w')); json.dump(refs,open(rf,'w')); save_state(s)
    print('new posts',n,'total',len(seen),'pending',len(pending()),'calls logged',len(s['calls']))
def status(args):
    s=load_state(); print(json.dumps({k:v for k,v in s.items() if k!='calls'}),'calls',len(s['calls']),'pending',pending())
if __name__=='__main__':
    os.makedirs(STATE,exist_ok=True)
    {'plan':plan,'calls':calls,'ingest':ingest,'status':status}[sys.argv[1]](sys.argv[2:])
