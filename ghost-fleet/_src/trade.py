"""UN Comtrade public preview API (no key): annual imports from Russia (partner 643) of crude oil
(HS 2709) and refined products (HS 2710) by China (156), India (699) and Turkey (792).
Writes data/trade.json; on any failure keeps the previous file. Preview allows one period per call."""
import json,os,time,urllib.request,datetime as dt
H=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(H,"..","data","trade.json")
REP={"156":"China","699":"India","792":"Turkey"}
def get(y):
    u=f"https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=156,699,792&partnerCode=643&cmdCode=2709,2710&flowCode=M&period={y}"
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"osint-gallery"}),timeout=60))
    if d.get("error"): raise RuntimeError(d["error"])
    return [r for r in d.get("data",[]) if r.get("partner2Code")==0 and r.get("customsCode")=="C00" and r.get("motCode")==0]
def run():
    rows=[]; yr=dt.date.today().year
    for y in range(yr-4,yr):
        try: r=get(y)
        except Exception as e: print("comtrade",y,"failed:",type(e).__name__); r=None
        if r: rows+=[{"y":y,"c":REP[str(x["reporterCode"])],"hs":x["cmdCode"],"usd":round(x["primaryValue"]),"kg":x.get("netWgt")} for x in r]
        time.sleep(2)
    yrs=sorted({r["y"] for r in rows})[-3:]
    rows=[r for r in rows if r["y"] in yrs]
    if len(yrs)<2: print("comtrade: too little data, keeping previous trade.json"); return
    json.dump({"fetched":dt.date.today().isoformat(),"years":yrs,"rows":rows},open(OUT,"w"),separators=(",",":"))
    print("comtrade ok",yrs,len(rows))
if __name__=="__main__": run()
