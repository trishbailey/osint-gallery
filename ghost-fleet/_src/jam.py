"""Daily GPS interference hexes (H3 res 4) from gpsjam.org (derived from ADS-B Exchange aircraft NIC/NACp). Medium (2-10%) and high (>10%) only.
Writes ../data/jam.json; skips days already cached."""
import json,os,io,csv,gzip,urllib.request,datetime as dt,h3
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","data"); F=os.path.join(D,"jam.json")
J=json.load(open(F)) if os.path.exists(F) else {"hex":{},"days":{}}
end=dt.date.today(); days=[str(end-dt.timedelta(days=i)) for i in range(1,92)]
def get(u):
    b=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"beacon-ghost-fleet","Accept-Encoding":"gzip"}),timeout=60).read()
    return gzip.decompress(b).decode() if b[:2]==b"\x1f\x8b" else b.decode()
for d in days:
    if d in J["days"]: continue
    try: txt=get(f"https://gpsjam.org/data/{d}-h3_4.csv")
    except Exception: continue
    row=[]
    for r in csv.DictReader(io.StringIO(txt)):
        g,b=int(r["count_good_aircraft"]),int(r["count_bad_aircraft"]); n=g+b
        if n<5: continue
        p=b/n
        if p<0.02: continue
        h=r["hex"]
        if h not in J["hex"]:
            lat,lon=h3.cell_to_latlng(h)
            if not (-10<=lat<=75 and -30<=lon<=160): continue
            J["hex"][h]=[[round(a,2),round(o,2)] for a,o in h3.cell_to_boundary(h)]
        row.append([h,2 if p>0.1 else 1])
    J["days"][d]=row
keep=set(days); J["days"]={k:v for k,v in J["days"].items() if k in keep}
used={h for v in J["days"].values() for h,_ in v}; J["hex"]={h:b for h,b in J["hex"].items() if h in used}
json.dump(J,open(F,"w"),separators=(",",":")); print("days",len(J["days"]),"hexes",len(J["hex"]))
