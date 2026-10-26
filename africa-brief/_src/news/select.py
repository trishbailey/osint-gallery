import json,re,csv,time
raw=json.load(open('raw.json'));O={o['id']:o for o in csv.DictReader(open('../media/outlets.csv'))}
K={
'sahel':r'\b(mali|malian|bamako|burkina|ouagadougou|niger|nigérien|nigerien|niamey|sahel|jnim|azawad|maliens?|burkinabè)\b|مالي|بوركينا|النيجر|الساحل|Мали|Буркина|Нигер|Сахел',
'lake-chad':r'\b(chad|tchad|n\'djamena|ndjamena|borno|boko haram|iswap|lake chad|lac tchad|maiduguri|cameroon|cameroun|extrême-nord|yobe)\b|تشاد|بوكو حرام|Чад|Камерун|Borno',
'sudan':r'\b(sudan|soudan|sudão|khartoum|cartum|darfur|el fasher|al-fashir|el-fasher|rsf|kordofan|port sudan|burhan|hemedti|dagalo)\b|السودان|الفاشر|الدعم السريع|دارفور|Судан|Sudani\b',
'great-lakes':r'\b(congo|rdc|drc|kinshasa|goma|bukavu|kivu|m23|rwanda|kigali|burundi|bujumbura|uganda|kampala|ituri|adf|wazalendo|fardc)\b|الكونغو|رواندا|Конго|Руанд',
'car':r'\b(centrafrique|centrafricain|central african republic|bangui|touadéra|touadera|minusca|car\'s)\b|أفريقيا الوسطى|ЦАР|Центральноафрикан',
'horn':r'\b(ethiopia|éthiopie|etiópia|addis ababa|tigray|amhara|fano|eritrea|érythrée|asmara|somalia|somalie|mogadishu|muqdisho|soomaaliya|al-shabaab|shabaab|djibouti|south sudan|soudan du sud|juba|puntland|somaliland|ityoophiya|itoophiya|ኢትዮጵያ|ኤርትራ)\b|إثيوبيا|إريتريا|الصومال|جيبوتي|Эфиоп|Сомали|Эритре|ኢትዮጵያ|ኤርትራ|ትግራይ|Soomaali',
'coastal-wa':r'\b(ghana|accra|benin|bénin|cotonou|togo|lomé|lome|côte d\'ivoire|cote d\'ivoire|ivory coast|ivoirien|abidjan|galamsey)\b|غانا|بنين|توغو|Гана|Бенин|Того',
'southern':r'\b(mozambique|moçambique|cabo delgado|maputo|zimbabwe|harare|zambia|zâmbia|lusaka|frelimo|chapo|mnangagwa|hichilema)\b|موزمبيق|زيمبابوي|Мозамбик|Зимбабв|Замби',
'north':r'\b(libya|libye|líbia|tripoli|benghazi|haftar|dbeibah|algeria|algérie|alger|egypt|égypte|egito|cairo|le caire|tunisia|tunisie|tunis|morocco|maroc|rabat)\b|ليبيا|الجزائر|مصر|تونس|المغرب|Ливи|Алжир|Египет|Тунис|Марокко|Misri\b|Libya\b'}
now=time.time();out={}
LANG1=lambda o:o['languages'].split(',')[0].split('(')[0].strip()
for rid,pat in K.items():
    rx=re.compile(r'(?<!\w)(?:'+pat.replace('\\b','')+r')(?!\w)',re.I)
    NEG=re.compile(r'PMU|football|ligue|champions|CAF |festival|décès|faire-part|obsèques|messe|loto|match|coupe|cup\b|Formula|F1|concert|exposição|miss |fashion|Ballon|Яшин|футбол|كرة|مباراة|Digital',re.I);cand=[]
    for oid,items in raw['items'].items():
        for it in items:
            if it['ts']>now+3600: continue
            if rx.search(it['title']) and not NEG.search(it['title']): cand.append(it)
    cand.sort(key=lambda x:-x['ts']);pick=[];cnt={};seen=set()
    for it in cand:
        st=O[it['outlet']]['state_media'].lower().startswith(('yes','de facto'))
        if cnt.get(it['outlet'],0)>=1 or it['title'].lower() in seen or (st and sum(1 for p in pick if O[p['outlet']]['state_media'].lower().startswith(('yes','de facto')))>=2): continue
        cnt[it['outlet']]=cnt.get(it['outlet'],0)+1;seen.add(it['title'].lower());pick.append(it)
        if len(pick)==5: break
    out[rid]=pick
    print(rid,len(cand),[ (p['outlet'],time.strftime('%m-%d',time.gmtime(p['ts']))) for p in pick])
json.dump(out,open('picked.json','w'),ensure_ascii=False,indent=0)
