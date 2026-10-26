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
    # warning -> strike case (times from the posts themselves)
    byu = d.drop_duplicates('url').set_index('url')
    tm = lambda u: byu.date[u].strftime('%b %-d, %H:%M UTC') if u in byu.index else None
    case = dict(CASE, warn_t=tm(CASE['warn']), claim_t=tm(CASE['claim']), ok=CASE['warn'] in byu.index and CASE['claim'] in byu.index)
    # airlines warnings
    a = th[th.text.str.contains(AIR, regex=True) & (th.date >= pd.Timestamp('2026-09-01', tz='UTC'))]
    air = dict(n=int(len(a)), first=str(a.date.min().date()) if len(a) else None, first_url=a.url.iloc[0] if len(a) else None,
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
                rows=rows, flag=flag, case=case, air=air, iraqi=iq)

if __name__ == '__main__':
    import json, sys; print(json.dumps(build(sys.argv[1] if len(sys.argv) > 1 else '/workspace/threats/posts.pkl'), ensure_ascii=False, indent=1)[:3000])
