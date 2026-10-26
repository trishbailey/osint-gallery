"""Exit non-zero if any pair of map category colours has CIEDE2000 delta E < 20."""
import itertools,math,re,os,sys
src=open(os.path.join(os.path.dirname(__file__),"..","app.js")).read()
P=dict(re.findall(r'(\w+):\{c:"(#[0-9a-f]{6})"',src.split("\n")[1]))
def lab(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)];f=lambda c:((c+0.055)/1.055)**2.4 if c>0.04045 else c/12.92;r,g,b=f(r),f(g),f(b)
    X=(r*.4124+g*.3576+b*.1805)/.95047;Y=r*.2126+g*.7152+b*.0722;Z=(r*.0193+g*.1192+b*.9505)/1.08883;t=lambda v:v**(1/3) if v>0.008856 else 7.787*v+16/116
    return 116*t(Y)-16,500*(t(X)-t(Y)),200*(t(Y)-t(Z))
def de(a,b):
    L1,a1,b1=lab(a);L2,a2,b2=lab(b);C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2;G=.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)))
    a1p,a2p=(1+G)*a1,(1+G)*a2;C1p,C2p=math.hypot(a1p,b1),math.hypot(a2p,b2);h1=math.degrees(math.atan2(b1,a1p))%360;h2=math.degrees(math.atan2(b2,a2p))%360
    dL=L2-L1;dC=C2p-C1p;dh=h2-h1
    if abs(dh)>180: dh-=360*math.copysign(1,dh)
    dH=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2));Lb=(L1+L2)/2;Cbp=(C1p+C2p)/2;hb=(h1+h2)/2 if abs(h1-h2)<=180 else (h1+h2+360)/2
    T=1-.17*math.cos(math.radians(hb-30))+.24*math.cos(math.radians(2*hb))+.32*math.cos(math.radians(3*hb+6))-.2*math.cos(math.radians(4*hb-63))
    SL=1+.015*(Lb-50)**2/math.sqrt(20+(Lb-50)**2);SC=1+.045*Cbp;SH=1+.015*Cbp*T;RT=-2*math.sqrt(Cbp**7/(Cbp**7+25**7))*math.sin(math.radians(60*math.exp(-((hb-275)/25)**2)))
    return math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH))
P["moving ship"]="#f5f7fa"
bad=[(a,b,round(de(P[a],P[b]),1)) for a,b in itertools.combinations(P,2) if de(P[a],P[b])<20]
print(len(P),"colours; failures:",bad)
if bad or len(P)<5: sys.exit(1)
# behaviour classes (app.js CL) and trade chart (story.js CC)
st=open(os.path.join(os.path.dirname(__file__),"..","story.js")).read()
for name,pal in (("classes",dict(re.findall(r'(\w+):\["[^"]+","(#[0-9a-f]{6})"',src))),("chapter1",dict(list(re.findall(r'(\w+):"(#[0-9a-f]{6})"',st.split("B3C={")[1].split("}")[0]))+[("route",st.split('RED="')[1][:7])])),("trade",dict(re.findall(r'(\w+):"(#[0-9a-f]{6})"',st.split("const CC=")[1].split("}")[0])))):
    b2=[(a,b,round(de(pal[a],pal[b]),1)) for a,b in itertools.combinations(pal,2) if de(pal[a],pal[b])<20]
    print(name,len(pal),"colours; failures:",b2)
    if b2 or len(pal)<3: sys.exit(1)
