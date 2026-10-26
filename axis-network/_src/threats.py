"""Houthi threat-targets section: recomputed from the raw post collection on every build.
Input: a pickle/parquet/CSV of posts with columns date,url,text,channel,group (default AXIS_POSTS env or
/workspace/threats/posts.pkl) and the coordination copies table (for Iraqi repost speed). No keys or session data.
Windows: 30 days ending at the latest Houthi post vs the baseline from May 1 to the start of that window;
7 days vs the 3 weeks before. Rates = threat posts naming a target per 10,000 deduplicated Houthi posts in the window."""
import os, re, pandas as pd
BASE_START = '2026-05-01'
THR = r'سنستهدف|سيتم استهداف|ستكون هدف|ستصبح هدف|هدفا مشروعا|هدف مشروع|أهداف مشروعة|اهدافا مشروعة|أهدافاً مشروعة|لن تكون بمنأى|لن يكون بمنأى|نحذر|تحذير|نتوعد|يتوعد|سنضرب|سنرد|ستدفع الثمن|لن نقف مكتوفي|حظر الملاحة|قرار الحظر|المرحلة .{0,10}من التصعيد|سيكون عرضة|will be targeted|legitimate target|we warn|will strike'
# chart targets: key -> (label, side, regex)
CHART = {
 'riyadh': ('Riyadh', 'sa', r'الرياض|Riyadh'),
 'aramco': ('Aramco oil company sites', 'sa', r'أرامكو|ارامكو|Aramco'),
 'south': ('Jizan, Najran and Asir (Saudi border provinces)', 'sa', r'جيزان|جازان|نجران|عسير|ابها|أبها|خميس مشيط'),
 'uae': ('United Arab Emirates', 'gulf', r'الإمارات|الامارات|إماراتي|اماراتي|UAE|Emirat'),
 'bab': ('Bab al-Mandab strait', 'sea', r'باب المندب|Bab al-Mandab'),
 'us': ('United States', 'us', r'أمريك|امريك|واشنطن|U\.S\.|America'),
 'israel': ('Israel', 'il', r'الكيان|إسرائيل|اسرائيل|الصهيوني|Israel'),
 'hormuz': ('Strait of Hormuz', 'sea', r'هرمز|Hormuz'),
 'redsea': ('Red Sea shipping', 'sea', r'البحر الأحمر|البحر الاحمر|Red Sea'),
}
# named facilities, flagged when they first appear in a Houthi threat post
FAC = {
 'King Khalid International Airport, Riyadh': r'مطار الملك خالد|مطار خالد|King Khalid',
 'Aramco headquarters, Dhahran/Dammam': r'(?:أرامكو|ارامكو|Aramco).{0,40}(?:الظهران|الدمام|Dhahran|Dammam)|(?:الظهران|الدمام).{0,40}(?:أرامكو|ارامكو)',
 'Aramco refinery, Riyadh': r'مصفاة الرياض|مصفاة أرامكو في الرياض|Riyadh refinery',
 'Rabigh refinery': r'رابغ|Rabigh',
 'Abha airport': r'مطار أبها|مطار ابها|Abha airport',
 'Khamis Mushait air base': r'خميس مشيط|Khamis Mushait',
 'Yanbu oil port': r'ينبع|Yanbu',
 'Jeddah': r'جدة|Jeddah',
 'King Fahd International Airport, Dammam': r'مطار الملك فهد|King Fahd International',
 'Saudi defence ministry': r'وزارة الدفاع السعودية|Saudi defen[cs]e ministry',
 'International airlines flying to Saudi Arabia': r'(?:شركات الطيران|[Aa]irlines).{0,80}(?:السعودي|Saudi)',
}
AIR = FAC['International airlines flying to Saudi Arabia']
CASE = dict(warn='https://t.me/army21ye/3878', claim='https://t.me/MilitaryMediaY/47040',
 sites=['Aramco headquarters (Dammam/Dhahran)', 'King Khalid International Airport, Riyadh', 'Aramco refinery, Riyadh'],
 press=[('AP', 'https://apnews.com/article/saudi-arabia-yemen-strikes-mideast-conflict-riyadh-c81a91347c00b17097c8fafde7e4eeec', 'AP, “Iran-backed Houthi rebels hit Saudi Aramco headquarters, officials say”, Oct 14, 2026'),
        ('Al Jazeera', 'https://www.aljazeera.com/news/2026/10/13/houthis-threaten-saudi-arabias-aramco-facilities-and-airports', 'Al Jazeera, “Houthis strike Aramco hours after Saudi-led coalition hits Sanaa oil site”, Oct 13, 2026 (citing the Saudi Energy Ministry via SPA)'),
        ('Reuters', 'https://www.al-monitor.com/originals/2026/10/saudi-aramco-headquarters-suffered-extensive-damage-houthi-attack-sources-say', 'Reuters via Al-Monitor, “Saudi Aramco headquarters suffered extensive damage in Houthi attack, sources say”, Oct 14, 2026')])
AIR_EX = 'https://t.me/MilitaryMediaY/47023'  # Oct 12 statement renewing the warning to airlines
MIL = ['militarymediay', 'army21ye']
# map sites: label -> (short map label, type, lat, lon, regex). Only named, locatable places.
SITES = {
 'kkia': ('King Khalid Airport', 'airport', 24.958, 46.699, FAC['King Khalid International Airport, Riyadh']),
 'ryref': ('Riyadh refinery', 'energy', 24.519, 46.868, FAC['Aramco refinery, Riyadh']),
 'aramhq': ('Aramco HQ (Dhahran)', 'energy', 26.312, 50.147, FAC['Aramco headquarters, Dhahran/Dammam']),
 'rabigh': ('Rabigh refinery', 'energy', 22.722, 39.022, FAC['Rabigh refinery']),
 'abha': ('Abha airport', 'airport', 18.240, 42.657, FAC['Abha airport']),
 'khamis': ('Khamis Mushait air base', 'military', 18.297, 42.804, FAC['Khamis Mushait air base']),
 'jizanap': ('Jizan airport', 'airport', 16.901, 42.586, r'مطار (?:الملك عبدالله|جيزان|جازان)|Jizan airport'),
 'najranap': ('Najran airport', 'airport', 17.611, 44.419, r'مطار نجران|Najran airport'),
 'jedap': ('Jeddah airport', 'airport', 21.680, 39.157, r'مطار (?:الملك عبد ?العزيز|جدة)|Jeddah airport'),
 'yanbu': ('Yanbu oil port', 'energy', 23.960, 38.240, FAC['Yanbu oil port']),
 'shaybah': ('Shaybah oil field', 'energy', 22.510, 53.960, r'الشيبة|Shaybah'),
 'dmmap': ('King Fahd Airport (Dammam)', 'airport', 26.471, 49.798, FAC['King Fahd International Airport, Dammam']),
 'mod': ('Saudi defence ministry', 'government', 24.669, 46.716, FAC['Saudi defence ministry']),
}
SITE_MIN = 5  # a site gets its own bubble when named in this many threat posts in the last 30 days
GEN = [('airport (unnamed)', r'مطار|مطارات|airport'), ('energy (unnamed)', r'أرامكو|ارامكو|مصفا|منشآت نفطية|نفط|Aramco|refiner|oil'),
       ('military (unnamed)', r'قاعدة|قواعد|معسكر|base'), ('government', r'وزارة|قصر|الديوان|ministry|palace')]
WARN = r'تهيب|نهيب|الإخلاء|بالإخلاء|إخلاء|evacuat|نحذر|we warn|will be targeted|سيتم استهداف|سنستهدف'

def load(path):
    if path.endswith('.pkl'): d = pd.read_pickle(path)
    elif path.endswith('.parquet'): d = pd.read_parquet(path)
    else: d = pd.read_csv(path)
    d['date'] = pd.to_datetime(d.date, utc=True); d['text'] = d.text.fillna('').astype(str)
    return d

def build(posts_path, copies_csv=None):
    d = load(posts_path); h = d[d.group == 'houthi'].copy(); h['k'] = h.text.str[:120]
    h = h.sort_values('date').drop_duplicates('k')  # one row per message text
    th = h[h.text.str.contains(THR, regex=True)]
    end = h.date.max().normalize() + pd.Timedelta(days=1); D = pd.Timedelta(days=1)
    W = {'base': (pd.Timestamp(BASE_START, tz='UTC'), end - 30 * D), 'last30': (end - 30 * D, end),
         'prior21': (end - 28 * D, end - 7 * D), 'last7': (end - 7 * D, end)}
    tot = {w: int(((h.date >= a) & (h.date < b)).sum()) for w, (a, b) in W.items()}
    def cnt(pat, w):
        a, b = W[w]; x = th[(th.date >= a) & (th.date < b)]; return x[x.text.str.contains(pat, regex=True)]
    rate = lambda n, w: round(n / tot[w] * 1e4, 1) if tot[w] else 0.0
    rows = []
    for k, (lab, side, pat) in CHART.items():
        r = dict(k=k, l=lab, side=side)
        for w in W: n = len(cnt(pat, w)); r[w] = [n, rate(n, w)]
        x = cnt(pat, 'last30').sort_values('date', ascending=False)
        r['ex'] = [[u, str(t.date())] for u, t in zip(x.url.head(3), x.date.head(3))]
        rows.append(r)
    # new or surging this week
    flag = []
    def surge(lab, pat):
        n7 = len(cnt(pat, 'last7')); np_ = len(cnt(pat, 'prior21'))
        r7, rp = rate(n7, 'last7'), rate(np_, 'prior21')
        if n7 >= 5 and r7 >= 2 * max(rp, 0.5):
            return dict(l=lab, why='surging', n7=n7, r7=r7, rp=rp)
    alltgt = {v[0]: v[2] for v in CHART.values()}; alltgt.update(FAC)
    for lab, pat in alltgt.items():
        s = surge(lab, pat)
        if s: flag.append(s)
    for lab, pat in FAC.items():
        m = th[th.text.str.contains(pat, regex=True)]
        if len(m) and m.date.min() >= W['last7'][0] and not any(f['l'] == lab for f in flag):
            flag.append(dict(l=lab, why='first', n7=int(len(m)), first=str(m.date.min().date()), url=m.sort_values('date').url.iloc[0]))
    # named sites (own bubbles) and what the general city/province bubbles actually name
    sites = []
    for k, (lab, ty, la, lo, pat) in SITES.items():
        r = dict(k=k, l=lab, t=ty, la=la, lo=lo)
        for w in ('base', 'last30', 'last7', 'prior21'): n = len(cnt(pat, w)); r[w] = [n, rate(n, w)]
        x = cnt(pat, 'last30').sort_values('date', ascending=False)
        r['ex'] = [[u, str(t.date())] for u, t in zip(x.url.head(3), x.date.head(3))]
        r['minor'] = r['last30'][0] < SITE_MIN
        if r['last30'][0] >= 1: sites.append(r)
    allsite = '|'.join(f'(?:{v[4]})' for v in SITES.values())
    def kinds(pat):
        x = cnt(pat, 'last30'); out = {}
        for k, (lab, ty, *_ , sp) in SITES.items():
            n = int(x.text.str.contains(sp, regex=True).sum())
            if n: out[lab] = n
        rest = x[~x.text.str.contains(allsite, regex=True)]; gen = {}
        for _, t in rest.text.items():
            g = next((g for g, gp in GEN if re.search(gp, t, re.I)), 'place named generally')
            gen[g] = gen.get(g, 0) + 1
        ex = rest.sort_values('date', ascending=False)
        return dict(n=int(len(x)), named=out, general=gen, ngen=int(len(rest)), ex=[[u, str(t.date())] for u, t in zip(ex.url.head(2), ex.date.head(2))])
    kind = {k: kinds(CHART[k][2]) for k in ('riyadh', 'aramco', 'south')}
    # this week (threats only): newest warnings and claimed strikes following them
    CL = r'بيان القوات المسلحة|عملية عسكرية|عمليات عسكرية|استهدفت|استهدفنا|targeted'
    def tg(t):
        n = [v[0] for v in SITES.values() if re.search(v[4], t)]
        return n or [CHART[k][0].split(' (')[0] for k in CHART if re.search(CHART[k][2], t)][:2]
    a7 = W['last7'][0]
    wk = th[(th.date >= a7) & th.channel.str.lower().isin(MIL) & th.text.str.contains(WARN, regex=True) & ~th.text.str.contains(CL, regex=True)].sort_values('date', ascending=False)
    warns = []
    for _, r in wk.iterrows():
        t = tg(r.text)
        if t and len(warns) < 3 and not any(w['t'] == t[:3] and w['d'] == r.date.strftime('%b %-d') for w in warns): warns.append(dict(d=r.date.strftime('%b %-d'), t=t[:3], u=r.url))
    cl = h[(h.date >= a7) & h.channel.str.lower().isin(MIL) & h.text.str.contains(CL, regex=True)].sort_values('date', ascending=False)
    claims = []
    for _, r in cl.iterrows():
        t = tg(r.text); dd = r.date.strftime('%b %-d')
        if not t: continue
        c = next((c for c in claims if c['d'] == dd), None)
        if c: c['t'] += [x for x in t if x not in c['t']]
        elif len(claims) < 3: claims.append(dict(d=dd, t=list(t), u=r.url))
    week = dict(start=str(a7.date()), warns=warns, claims=claims)
    # warning -> strike case (times from the posts themselves)
    byu = d.drop_duplicates('url').set_index('url')
    tm = lambda u: byu.date[u].strftime('%b %-d, %H:%M UTC') if u in byu.index else None
    case = dict(CASE, warn_t=tm(CASE['warn']), claim_t=tm(CASE['claim']), ok=CASE['warn'] in byu.index and CASE['claim'] in byu.index)
    # airlines warnings
    a = th[th.text.str.contains(AIR, regex=True) & (th.date >= pd.Timestamp('2026-09-01', tz='UTC'))]
    airlink = {v[0]: int(a.text.str.contains(v[4], regex=True).sum()) for v in SITES.values() if v[1] == 'airport'}
    air = dict(link={k: v for k, v in airlink.items() if v}, n=int(len(a)), first=str(a.date.min().date()) if len(a) else None, first_url=a.url.iloc[0] if len(a) else None,
               ex=AIR_EX if AIR_EX in byu.index else (a.url.iloc[-1] if len(a) else None))
    # Iraqi militia repost speed for Houthi military statements (last 30 days)
    iq = None
    if copies_csv and os.path.exists(copies_csv):
        C = pd.read_csv(copies_csv)
        for c in ['date', 'first_date']: C[c] = pd.to_datetime(C[c], utc=True)
        X = C[(C.first_group == 'houthi') & (C.group == 'iraqi') & ~C.is_first & C.first_channel.str.lower().isin(MIL) & (C.date >= W['last30'][0])].copy()
        if len(X):
            X['lag'] = (X.date - X.first_date).dt.total_seconds()
            c = X[X.first_post_url == CASE['claim']].sort_values('lag')
            iq = dict(n=int(len(X)), med=int(X.lag.median()), u2=int((X.lag <= 120).sum()), ch=int(X.channel.nunique()),
                      claim=[c.channel.iloc[0], int(c.lag.iloc[0]), c.post_url.iloc[0]] if len(c) else None)
    return dict(end=str((end - D).date()), base_start=BASE_START, w30_start=str((end - 30 * D).date()), w7_start=str((end - 7 * D).date()),
                p21_start=str((end - 28 * D).date()), tot=tot, nthreat=int(len(th)), nch=int(h.channel.nunique()), nposts=int(len(d[d.group == 'houthi'])),
                rows=rows, sites=sites, kind=kind, week=week, flag=flag, case=case, air=air, iraqi=iq)

if __name__ == '__main__':
    import json, sys; print(json.dumps(build(sys.argv[1] if len(sys.argv) > 1 else '/workspace/threats/posts.pkl'), ensure_ascii=False, indent=1)[:3000])
