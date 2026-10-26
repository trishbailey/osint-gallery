import json,csv,re,torch
from langdetect import detect_langs,DetectorFactory;DetectorFactory.seed=0
from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
O={o['id']:o for o in csv.DictReader(open('../media/outlets.csv'))}
P=json.load(open('picked.json'))
import os
CACHE={}
try:
    for v in json.load(open('news.json')).values():
        for it in v:
            if it.get('title_en'): CACHE[it['title']]=it['title_en']
except Exception: pass
DO_MT=os.environ.get('TRANSLATE','1')!='0'
NAME={'English':'en','French':'fr','Portuguese':'pt','Swahili':'sw','Hausa':'ha','Arabic':'ar','Russian':'ru','Somali':'so','Tigrinya':'ti','Amharic':'am','Kinyarwanda':'rw','Kirundi':'rn','Afaan Oromo':'om','Lingala':'ln','Sango':'sg'}
NL={'fr':'fra_Latn','pt':'por_Latn','sw':'swh_Latn','ha':'hau_Latn','ar':'arb_Arab','ru':'rus_Cyrl','so':'som_Latn','ti':'tir_Ethi','am':'amh_Ethi','rw':'kin_Latn','rn':'run_Latn','om':'gaz_Latn','ln':'lin_Latn','es':'spa_Latn'}
def lang(t,o):
    langs=[NAME.get(x.split('(')[0].strip(),'en') for x in o['languages'].split(',')]
    if re.search('[\u1200-\u137F]',t): return 'ti' if 'ti' in langs and 'am' not in langs else 'am'
    if re.search('[\u0600-\u06FF]',t): return 'ar'
    if re.search('[\u0400-\u04FF]',t): return 'ru'
    try: d=detect_langs(t)[0]
    except: d=None
    if d and d.lang in ('en','fr','pt','ar','ru','so','sw','es') and (d.prob>0.9 or d.lang in langs): return d.lang
    return langs[0]
_M={}
def _load():
    if not _M: _M['tok']=AutoTokenizer.from_pretrained('facebook/nllb-200-distilled-600M');_M['m']=AutoModelForSeq2SeqLM.from_pretrained('facebook/nllb-200-distilled-600M').eval()
    return _M['tok'],_M['m']
def tr(t,l):
    if t in CACHE: return CACHE[t]
    if not DO_MT: return None
    tok,m=_load()
    tok.src_lang=NL[l];x=tok(t,return_tensors='pt',truncation=True)
    with torch.no_grad(): y=m.generate(**x,forced_bos_token_id=tok.convert_tokens_to_ids('eng_Latn'),max_new_tokens=120,num_beams=3)
    return tok.batch_decode(y,skip_special_tokens=True)[0]
for rid,items in P.items():
    for it in items:
        o=O[it['outlet']];l=lang(it['title'],o);it['lang']=l
        it['outlet_name']=o['name'];it['state']=o['state_media'];it['owner']=o['owner']
        it['title_en']=tr(it['title'],l) if l!='en' and l in NL else None
        it.pop('summary',None)
        print(rid,l,it['title'][:60],'=>',(it['title_en'] or '')[:70])
json.dump(P,open('news.json','w'),ensure_ascii=False,indent=0)
