"""CIEDE2000 check: every pair within each categorical palette (and vs the panel background) must have dE>=20."""
import math,itertools,sys
def lab(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in(1,3,5)];f=lambda c:((c+.055)/1.055)**2.4 if c>.04045 else c/12.92;r,g,b=f(r),f(g),f(b)
    x=(r*.4124+g*.3576+b*.1805)/.95047;y=r*.2126+g*.7152+b*.0722;z=(r*.0193+g*.1192+b*.9505)/1.08883
    F=lambda t:t**(1/3) if t>.008856 else 7.787*t+16/116;return 116*F(y)-16,500*(F(x)-F(y)),200*(F(y)-F(z))
def de(c1,c2):
    L1,a1,b1=lab(c1);L2,a2,b2=lab(c2);C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2;G=.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)))
    a1p,a2p=a1*(1+G),a2*(1+G);C1p,C2p=math.hypot(a1p,b1),math.hypot(a2p,b2);h1=math.degrees(math.atan2(b1,a1p))%360;h2=math.degrees(math.atan2(b2,a2p))%360
    dL=L2-L1;dC=C2p-C1p;dh=h2-h1
    if C1p*C2p==0:dh=0
    elif dh>180:dh-=360
    elif dh<-180:dh+=360
    dH=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2));Lb=(L1+L2)/2;Cbp=(C1p+C2p)/2
    hb=(h1+h2)/2 if abs(h1-h2)<=180 else (h1+h2+360)/2 if h1+h2<360 else (h1+h2-360)/2
    if C1p*C2p==0:hb=h1+h2
    T=1-.17*math.cos(math.radians(hb-30))+.24*math.cos(math.radians(2*hb))+.32*math.cos(math.radians(3*hb+6))-.2*math.cos(math.radians(4*hb-63))
    SL=1+.015*(Lb-50)**2/math.sqrt(20+(Lb-50)**2);SC=1+.045*Cbp;SH=1+.015*Cbp*T
    RT=-2*math.sqrt(Cbp**7/(Cbp**7+25**7))*math.sin(math.radians(60*math.exp(-((hb-275)/25)**2)))
    return math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH))
P={'kind':['#4fc3b0','#e8a33d','#c46ad6','#5d8fe6'],'talking points':['#4e9fe0','#e0703c','#5cbf7a','#b36bd6','#e6c34a'],
   'account types':['#d4145a','#ffffff','#3d2bff','#ffaabb','#8b0000'],'account types vs themes and dot kinds':None,'aggression':['#ffffff','#f7b3c2','#e0526f','#8e0c22'],'matrix ramp':['#fde4ea','#f08aa2','#c8304d','#640514']}
ok=True
XU=['#4e9fe0','#e0703c','#5cbf7a','#b36bd6','#e6c34a','#4fc6c2','#9a9cf0','#c98a5a','#a8d65a','#4fc3b0','#e8a33d','#c46ad6','#5d8fe6']
for n,cs in P.items():
    if cs is None:
        m=min((de(a,b),a,b) for a in P['account types'] for b in XU);print(f'{n}: min cross dE {m[0]:.1f} ({m[1]} vs {m[2]})');ok&=m[0]>=20;continue
    m=min((de(a,b),a,b) for a,b in itertools.combinations(cs,2));bg=min(de(c,'#12203a') for c in cs)
    print(f"{n}: min pair dE {m[0]:.1f} ({m[1]} vs {m[2]}), min vs panel {bg:.1f}");ok&=m[0]>=20 and bg>=20
print('PASS' if ok else 'FAIL');sys.exit(0 if ok else 1)
