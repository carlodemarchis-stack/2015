import json,time,urllib.request,urllib.parse,re
d=json.load(open('site.json'))
addrs={}
for g,v in d.items():
    for t in v['t']:
        if t['c']:
            city=t['c'].split(' · ')[-1]
            addrs[(t['a'],city)]=t['c']
def q(s):
    u="https://nominatim.openstreetmap.org/search?"+urllib.parse.urlencode(dict(q=s,format='json',limit=1,countrycodes='it'))
    r=urllib.request.Request(u,headers={'User-Agent':'carlo-esordienti-calendar/1.0'})
    time.sleep(1.1)
    j=json.load(urllib.request.urlopen(r,timeout=20))
    return (float(j[0]['lat']),float(j[0]['lon']),j[0]['display_name']) if j else None
fix={'Moncalieri - Loc. Testona':'Moncalieri','Garino - Vinovo':'Vinovo','Riva Presso Chieri':'Riva presso Chieri','Caselle T.Se':'Caselle Torinese','Borgaro Torinese':'Borgaro Torinese'}
out={}
for (a,city),camp in addrs.items():
    c=fix.get(city,city)
    a2=re.sub(r'\bC\.\s*So\b|\bC\.(?=[A-Z])','Corso ',a,flags=re.I).replace('S.Cristina','Santa Cristina').replace('S.Marchese','San Marchese')
    a2=re.sub(r',?\s*(\d+)(/\w)?',r' \1',a2)
    r=None
    for s in [f"{a2}, {c}", f"{re.sub(r' \\d+.*','',a2)}, {c}", f"{c}, Torino"]:
        try: r=q(s)
        except Exception as e: r=None
        if r: out[f"{a}|{city}"]=dict(lat=r[0],lon=r[1],q=s,dn=r[2][:90]);break
    print(a,'|',city,'->',out.get(f"{a}|{city}",{}).get('q'),out.get(f"{a}|{city}",{}).get('dn'),flush=True)
json.dump(out,open('geo.json','w'),ensure_ascii=False,indent=0)
