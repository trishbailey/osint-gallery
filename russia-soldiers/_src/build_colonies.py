"""Prison colonies that sent Wagner recruits (Jul 2022 to Feb 2023): data/prison-recruitment-wagner-all-colonies.csv -> data/colonies.json.
Source: Mediazona with BBC News Russian, 10 Jun 2024 (CC BY-SA 4.0). One row per dog-tag series; 'min_recruited' is the highest tag number found
among that colony's dead, so the true count is at least that. 160 rows have no colony name and one (IK24 Ukhta) has contradicting labels and a
location that does not match its name: neither is drawn. Their recruits stay in the total."""
import csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
CSV = os.path.join(ROOT, "data", "prison-recruitment-wagner-all-colonies.csv")
AMBIGUOUS = {"IK24 Ukhta"}            # English label says Ukhta, Komi (flagged RE-CHECK); Russian label and coordinates say Fornosovo, St Petersburg region
TOTAL_RECRUITS, TOTAL_ROWS = 48366, 501

def build():
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    cols, undrawn = [], dict(n=0, recruits=0, killed=0)
    for r in rows:
        mn, k = int(r["min_recruited"]), int(r["killed"])
        if not r["lon"] or r["institution"] in AMBIGUOUS:
            undrawn["n"] += 1; undrawn["recruits"] += mn; undrawn["killed"] += k; continue
        cols.append(dict(rank=int(r["rank"]), name=r["institution"], region=r["region"], n=mn, killed=k, lon=round(float(r["lon"]), 4), lat=round(float(r["lat"]), 4),
                         note="Mediazona's label adds \u201cand several other colonies\u201d." if "several other" in r["note"] else ""))
    assert len(rows) == TOTAL_ROWS and sum(int(r["min_recruited"]) for r in rows) == TOTAL_RECRUITS
    out = dict(total_recruits=TOTAL_RECRUITS, total_killed=sum(int(r["killed"]) for r in rows), rows=len(rows), drawn=len(cols),
               drawn_recruits=sum(c["n"] for c in cols), undrawn=undrawn, colonies=cols)
    json.dump(out, open(os.path.join(ROOT, "data", "colonies.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return out

if __name__ == "__main__":
    o = build(); print({k: v for k, v in o.items() if k != "colonies"})
