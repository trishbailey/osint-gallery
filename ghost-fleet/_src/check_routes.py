"""QA: report route points that fall on land (land_50m), ignoring 25 km around each end port."""
import json,os,math,sys
from shapely.geometry import shape,Point
from shapely.strtree import STRtree
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","data")
G=[shape(f["geometry"]).buffer(-0.03) for f in json.load(open(os.path.join(D,"land_50m.geojson")))["features"]];T=STRtree(G)
R=json.load(open(os.path.join(D,"routes.json")));bad={}
km=lambda a,b:math.hypot((a[0]-b[0])*111,(a[1]-b[1])*111*math.cos(math.radians(a[0])))
for k,r in R.items():
    L=r["line"];n=0
    for (a,b) in zip(L,L[1:]):
        for t in [i/10 for i in range(11)]:
            p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
            if km(p,L[0])<25 or km(p,L[-1])<25: continue
            if (29.8<=p[0]<=31.4 and 32.1<=p[1]<=32.7) or (39.9<=p[0]<=41.3 and 26.0<=p[1]<=29.3): continue  # Suez Canal, Dardanelles-Bosphorus (real shipping lanes, closed at 1:50m)
            q=Point(p[1],p[0])
            if any(G[i].contains(q) for i in T.query(q)): n+=1
    if n: bad[k]=n
print("routes",len(R),"on-land samples:",bad); sys.exit(1 if bad else 0)
