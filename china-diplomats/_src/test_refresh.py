"""Regressions for the Nov 8 catch-up: Long March membership, and burst windows per topic."""
import ast, json, os, subprocess, datetime as dt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
LM = 'Long March 90th anniversary'
WUZ = "Li Qiang's keynote at the 2026 World Internet Conference Wuzhen Summit"
# This post is the Wuzhen keynote. The previous page labeled it Canton Fair.
WUZ_FIX = '2117607506138554514'
LM_EXAMPLES = ('2113211986066690415', '2113421928853840105')

def load_burst_fns():
    src = open(os.path.join(HERE, 'analyze.py')).read()
    tree = ast.parse(src)
    keep = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ('burst_windows', 'bursts_by_topic')]
    ns = {}
    exec(compile(ast.Module(body=keep, type_ignores=[]), 'bursts', 'exec'), ns)
    return ns['burst_windows'], ns['bursts_by_topic']

def test_mixed_window_does_not_consume_the_valid_topic():
    """B at hour 0; four distinct A accounts at hours 1, 2, 3 and 6.5.
    The four A posts are one 5.5-hour burst. B must not use them up."""
    burst_windows, bursts_by_topic = load_burst_fns()
    t0 = dt.datetime(2026, 11, 1)
    h = dt.timedelta(hours=1)
    events = [(t0, 'b', 'B', 'b')]
    events += [(t0 + h * hr, acct, 'A', acct) for hr, acct in ((1, 'a1'), (2, 'a2'), (3, 'a3'), (6.5, 'a4'))]
    got = bursts_by_topic(events, dt.timedelta(hours=6))
    assert got == [('A', ['a1', 'a2', 'a3', 'a4'])], got
    # The same four A posts still form a burst when scanned on their own.
    alone = burst_windows([(t, a, i) for t, a, topic, i in events if topic == 'A'], dt.timedelta(hours=6))
    assert alone == [['a1', 'a2', 'a3', 'a4']], alone

def archive(ref):
    raw = subprocess.check_output(['git', 'show', f'{ref}:china-diplomats/data/archive.json'], cwd=ROOT)
    a = json.loads(raw)
    narr = a['narratives']
    return {r[0]: (narr[r[5]] if r[5] >= 0 else None) for r in a['rows']}, a

def test_historical_topics_and_long_march():
    old, old_a = archive('origin/main')
    cur_path = os.path.join(ROOT, 'china-diplomats', 'data', 'archive.json')
    cur_a = json.load(open(cur_path))
    narr = cur_a['narratives']
    cur = {r[0]: (narr[r[5]] if r[5] >= 0 else None) for r in cur_a['rows']}
    assert len(cur_a['rows']) == len(cur)
    missing = [i for i in old if i not in cur]
    assert not missing, missing[:5]
    changed = []
    for i, lab in old.items():
        if lab is None or i == WUZ_FIX:
            continue
        if cur[i] != lab:
            changed.append((i, lab, cur[i]))
    assert not changed, changed[:8]
    assert cur[WUZ_FIX] == WUZ
    hist_lm = [i for i, lab in old.items() if lab == LM]
    assert len(hist_lm) == 118
    assert all(cur[i] == LM for i in hist_lm)
    for i in LM_EXAMPLES:
        assert old[i] == LM and cur[i] == LM
    # The two example texts are still the anniversary wording.
    text = {r[0]: r[6] for r in cur_a['rows']}
    assert 'new Long March' in text[LM_EXAMPLES[0]]
    assert '90th anniversary' in text[LM_EXAMPLES[1]]

if __name__ == '__main__':
    test_mixed_window_does_not_consume_the_valid_topic()
    test_historical_topics_and_long_march()
    print('PASS')
