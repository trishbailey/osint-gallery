"""Raw-file loaders shared by build_data.py and audit.py (so the audit re-derives from the same raw files)."""
import csv, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "data", "raw")
from regions_master import REGIONS

def num_ru(s):
    return float(s.replace("\u00a0", "").replace(" ", "").replace(",", "."))

def load_wages():
    out = {}
    for line in open(os.path.join(RAW, "wages_rosstat_tab9_2025.txt"), encoding="utf-8"):
        if line.startswith("#") or not line.strip():
            continue
        parts = [p.strip() for p in line.split("|")]
        out[parts[0]] = {"2024": num_ru(parts[-2]), "2025": num_ru(parts[-1])}
    return out

def load_pop():
    out = {}
    with open(os.path.join(RAW, "rosstat_population_2024_nsedc.csv"), encoding="utf-8") as f:
        rd = csv.reader(f, delimiter=";")
        hdr = next(rd)
        for r in rd:
            if r[5] != "человек" or r[7] != "2024" or r[6] != "на_1_января":
                continue
            key = (r[0], r[1])
            out.setdefault(key, {})[r[4]] = int(float(r[8]))
    return out

def pop_for(reg, pop):
    cands = [(k, v) for k, v in pop.items() if k[0] == reg["pop"] and (reg["pop_okato"] is None or k[1] == reg["pop_okato"])]
    if reg["pop_okato"] is None and len(cands) != 1:
        raise ValueError("ambiguous pop " + reg["pop"] + str(len(cands)))
    return cands[0][1] if len(cands) == 1 else None

def load_census():
    out = {}
    with open(os.path.join(RAW, "census_ethnic_realstats.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            out.setdefault((r["Регион"], r["Перепись"]), {})[r["Народ"]] = float(r["Доля %"])
    return out

def load_mz():
    return json.load(open(os.path.join(RAW, "mz_regions_200zona_2026-10-28.json"), encoding="utf-8"))

POV_ALIAS_RATE = {"RU-MOW": "Москва", "RU-SEV": "Севастополь", "RU-SA": "Республика Саха", "RU-YAN": "Ямало-Ненецкий автономный округ"}
POV_ALIAS_COUNT = {"RU-MOW": "г. Москва", "RU-SPE": "г. Санкт-Петербург", "RU-SEV": "г. Севастополь", "RU-KEM": "Кемеровская область-Кузбасс",
                   "RU-KHM": "Ханты-Мансийский АО", "RU-YAN": "Ямало-Ненецкий АО", "RU-SA": "Республика Саха (Якутия)"}

def _pipe(fn):
    d = {}
    for line in open(os.path.join(RAW, fn), encoding="utf-8"):
        if line.startswith("#") or "|" not in line:
            continue
        a = [x.strip() for x in line.split("|")]
        d[a[0]] = float(a[1])
    return d

def load_poverty():
    """Returns (rates, counts): name -> value, from the two saved Rosstat tabulations."""
    return _pipe("poverty_rate_2025_roschart.txt"), _pipe("poverty_count_2025_statbase.txt")

def _find(d, names):
    for n in names:
        if n in d: return d[n]
    return None

def poverty_for(reg, rates, counts, pop_total):
    """Published 2025 rate if present; else headcount / population (flagged 'derived')."""
    iso = reg["iso"]
    rn = [POV_ALIAS_RATE.get(iso)] if iso in POV_ALIAS_RATE else [reg["wage"], reg["mz"], reg["pop"], reg["ne"]]
    r = _find(rates, [n for n in rn if n])
    if r is not None: return r, "published"
    cn = [POV_ALIAS_COUNT[iso]] if iso in POV_ALIAS_COUNT else [reg["wage"], reg["mz"], reg["pop"], reg["ne"]]
    c = _find(counts, [n for n in cn if n])
    if c is None: return None, "none"
    return c / pop_total * 100, "derived"

def load_dagestan_ru():
    """Russian share of Dagestan's total population, census 2020/21: 102,243 Russians of 3,182,054 residents."""
    t = open(os.path.join(RAW, "quotes", "census_dagestan.txt"), encoding="utf-8").read()
    tot = int(re.search(r"^(\d[\d ]+\d) всё население", t, re.M).group(1).replace(" ", ""))
    ru = int(re.search(r"^Русские \| (\d[\d ]+\d) \|", t, re.M).group(1).replace(" ", ""))
    return ru / tot * 100, ru, tot
