import json,torch
from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
d=json.load(open('x_raw.json'));U={u['id']:u['username'] for u in d['includes']['users']}
pick={'2114455351147872730':('horn','en',None),'2114433931269280127':('sudan','en',None),'2114431252035948859':('sudan','en',None),'2114424755864695255':('sahel','fr','Russia'),'2114409655208382942':('southern','fr','Russia'),'2114437003286597641':('sudan','en',None)}
tok=AutoTokenizer.from_pretrained('facebook/nllb-200-distilled-600M');m=AutoModelForSeq2SeqLM.from_pretrained('facebook/nllb-200-distilled-600M').eval()
out=[]
for p in d['data']:
    if p['id'] not in pick: continue
    r,l,st=pick[p['id']];txt=p['text'].split('https://t.co')[0].strip()
    en=None
    if l!='en':
        import re;parts=[q for q in re.split(r'(?<=[.!?])\s+|\n+',txt) if q.strip()];tok.src_lang='fra_Latn';res=[]
        for q in parts:
            x=tok(q,return_tensors='pt',truncation=True)
            with torch.no_grad(): y=m.generate(**x,forced_bos_token_id=tok.convert_tokens_to_ids('eng_Latn'),max_new_tokens=160,num_beams=3)
            res.append(tok.batch_decode(y,skip_special_tokens=True)[0])
        en=' '.join(res)
    out.append({'region':r,'handle':U[p['author_id']],'created_at':p['created_at'],'text':txt,'text_en':en,'lang':l,'state':st,'url':p['url']})
json.dump(out,open('x_posts.json','w'),ensure_ascii=False,indent=0);print(len(out))
for o in out: print(o['handle'],o['text'][:80],'|',(o['text_en'] or '')[:80])
