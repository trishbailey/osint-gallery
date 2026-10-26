"""Static reference layers: Marine Regions EEZ boundaries (CC BY 4.0) and NGA World Port Index (public domain). Keeps old files on failure."""
import json,os,csv,io,urllib.request
from shapely.geometry import shape,mapping
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","data")
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"beacon-ghost-fleet"}),timeout=300).read()
try:
    g=json.loads(get("https://geo.vliz.be/geoserver/MarineRegions/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=MarineRegions:eez_boundaries&outputFormat=application/json"))
    out=[]
    for f in g["features"]:
        s=shape(f["geometry"]).simplify(0.05)
        for l in (s.geoms if s.geom_type.startswith("Multi") else [s]):
            out.append([[round(x,2),round(y,2)] for x,y in l.coords])
    json.dump(out,open(os.path.join(D,"eez.json"),"w"),separators=(",",":")); print("eez lines",len(out))
except Exception as e: print("EEZ failed, keeping old:",type(e).__name__)
try:
    r=csv.DictReader(io.StringIO(get("https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv").decode("utf-8-sig")))
    P=[[x["Main Port Name"],x["Country Code"],round(float(x["Latitude"]),3),round(float(x["Longitude"]),3),x.get("Harbor Size","")[:1]] for x in r if x.get("Latitude")]
    json.dump(P,open(os.path.join(D,"wpi.json"),"w"),separators=(",",":"),ensure_ascii=False); print("ports",len(P))
except Exception as e: print("WPI failed, keeping old:",type(e).__name__,e)
