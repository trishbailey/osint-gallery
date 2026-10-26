#!/usr/bin/env python3
"""Connect to aisstream.io for N seconds and append fleet PositionReports to
<out_dir>/aisstream-YYYY-MM.csv (imo,mmsi,timestamp,lat,lon,sog,cog,source).
aisstream caps FiltersShipMMSI at 200 per subscription and ~3 connections per key, so the
tracked MMSIs are split into chunks of 200; up to MAX_CONN chunks stream in parallel and the
window is divided into rounds when there are more chunks than connections.
Keeps 1 point per vessel per 10 min. Needs env AISSTREAM_API_KEY; exits 0 if missing.
Usage: python3 fetch_aisstream.py <vessels.json> <out_dir> [seconds=300]"""
import asyncio,json,sys,os,datetime as dt
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ais_common import mmsi_map,append_rows
KEY=os.environ.get("AISSTREAM_API_KEY","")
if not KEY: print("AISSTREAM_API_KEY not set; skipping"); sys.exit(0)
import websockets
vj,out=sys.argv[1],sys.argv[2]; SECS=int(sys.argv[3]) if len(sys.argv)>3 else 300
MAX_CONN=int(os.environ.get("AISSTREAM_MAX_CONN","3")); CH=200
m=mmsi_map(vj); ids=sorted(m)
chunks=[ids[i:i+CH] for i in range(0,len(ids),CH)]
rounds=[chunks[i:i+MAX_CONN] for i in range(0,len(chunks),MAX_CONN)]
last={}; rows=[]
def utc(): return dt.datetime.now(dt.timezone.utc)
async def stream(chunk,secs):
    for attempt in range(3):
        try:
            async with websockets.connect("wss://stream.aisstream.io/v0/stream",max_size=2**22) as ws:
                await ws.send(json.dumps({"APIKey":KEY,"BoundingBoxes":[[[-90,-180],[90,180]]],
                    "FiltersShipMMSI":chunk,"FilterMessageTypes":["PositionReport"]}))
                end=asyncio.get_running_loop().time()+secs
                while (t:=end-asyncio.get_running_loop().time())>0:
                    try: msg=json.loads(await asyncio.wait_for(ws.recv(),t))
                    except asyncio.TimeoutError: return
                    if msg.get("MessageType")!="PositionReport": continue
                    md=msg["MetaData"]; s=str(md["MMSI"])
                    if s not in m: continue
                    now=utc()
                    if s in last and (now-last[s]).total_seconds()<600: continue
                    p=msg["Message"]["PositionReport"]; last[s]=now
                    tu=md.get("time_utc")
                    ts=(tu[:19].replace(" ","T")+"Z") if tu else now.strftime("%Y-%m-%dT%H:%M:%SZ")
                    rows.append([m[s],s,ts,p["Latitude"],p["Longitude"],p.get("Sog"),p.get("Cog"),"aisstream"])
            return
        except Exception as e: print("retry",type(e).__name__); await asyncio.sleep(5)
async def main():
    per=max(60,SECS//len(rounds))
    for rd in rounds: await asyncio.gather(*(stream(c,per) for c in rd))
asyncio.run(main())
fn=os.path.join(out,f"aisstream-{utc():%Y-%m}.csv")
print(f"{len(ids)} MMSIs in {len(chunks)} subscriptions/{len(rounds)} rounds; {append_rows(fn,rows)} new rows ({len(last)} vessels) -> {fn}")
