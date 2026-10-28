"""Section-by-section diff of two Axis data.json files. Usage: compare_data.py live.json new.json"""
import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
def walk(x,y,p,out):
    if isinstance(x,dict) and isinstance(y,dict):
        for k in sorted(set(x)|set(y)):
            if k not in x: out.append((p+'/'+k,'<missing>',short(y[k])))
            elif k not in y: out.append((p+'/'+k,short(x[k]),'<missing>'))
            else: walk(x[k],y[k],p+'/'+k,out)
    elif isinstance(x,list) and isinstance(y,list) and len(x)==len(y) and len(json.dumps(x))<3000:
        for i,(u,v) in enumerate(zip(x,y)): walk(u,v,p+f'[{i}]',out)
    elif x!=y: out.append((p,short(x),short(y)))
def short(v): s=json.dumps(v,ensure_ascii=False); return s if len(s)<110 else s[:107]+'...'
for k in a:
    out=[]; walk(a[k],b.get(k),k,out)
    print(f'== {k}: {"IDENTICAL" if not out else str(len(out))+" differences"}')
    for p,x,y in out[:14]: print(f'   {p}: live={x}  new={y}')
    if len(out)>14: print('   ...')
