import json,urllib.request,time
d=json.load(open('site2.json'))
cache={}
try: cache=json.load(open('osrm.json'))
except: pass
def road(a,b):
    k=f"{a[0]},{a[1]};{b[0]},{b[1]}"
    if k in cache: return cache[k]
    u=f"https://router.project-osrm.org/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}?overview=false"
    for _ in range(3):
        try:
            j=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'carlo-esordienti/1.0'}),timeout=20))
            r=j['routes'][0];cache[k]=[round(r['distance']/1000,1),round(r['duration']/60)];time.sleep(0.4);return cache[k]
        except Exception as e: time.sleep(2)
    return None
n=0
for g,v in d.items():
    for m in v['m']:
        _,_,h,a=m
        if h==-1:continue
        H,A=v['t'][h],v['t'][a]
        if H.get('y') is None or A.get('y') is None: continue
        if (H['y'],H['x'])==(A['y'],A['x']): cache[f"{A['y']},{A['x']};{H['y']},{H['x']}"]=[0,0];continue
        road((A['y'],A['x']),(H['y'],H['x']));n+=1
    json.dump(cache,open('osrm.json','w'))
    print(g,n,flush=True)
