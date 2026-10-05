import json,time,urllib.request,urllib.parse
def q(**k):
    k.update(format='json',limit=1,countrycodes='it')
    u="https://nominatim.openstreetmap.org/search?"+urllib.parse.urlencode(k)
    time.sleep(1.1)
    j=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'carlo-esordienti-calendar/1.0'}),timeout=20))
    return (float(j[0]['lat']),float(j[0]['lon']),j[0]['display_name'][:100]) if j else None
tests={
'caselle':[dict(street='127 Via alle Fabbriche',city='Caselle Torinese'),dict(q='Via alle Fabbriche, Caselle Torinese')],
'allamano':[dict(street='125 Corso Allamano',city='Grugliasco'),dict(q='Corso Allamano, Grugliasco')],
'gozzano':[dict(street='11 Via Gozzano',city='Orbassano'),dict(q='Via Guido Gozzano, Orbassano')],
'allegri':[dict(street='15 Via Sergio Allegri',city='Collegno'),dict(q='Via Allegri, Collegno')],
'valdellatorre':[dict(street='169 Via Valdellatorre',city='Torino'),dict(q='Via Val della Torre 169, Torino'),dict(q='Via Val della Torre, Torino')],
'ferrari':[dict(street='3 Via Ferrari',city='Pianezza'),dict(q='Via Enzo Ferrari, Pianezza'),dict(q='Via Ferrari, Pianezza')],
'confalonieri':[dict(street='9 Via Confalonieri',city='Moncalieri'),dict(q='Via Federico Confalonieri, Moncalieri'),dict(q='Testona, Moncalieri')],
'ragazzoni':[dict(street='2 Via Ragazzoni',city='Torino'),dict(q='Via Enrico Ragazzoni, Torino'),dict(q='Via Ragazzoni, Torino')],
'geymonat':[dict(street='11 Via Ludovico Geymonat',city='Torino',postalcode='10137'),dict(q='Via Ludovico Geymonat, 10137 Torino'),dict(q='Via Geymonat, Torino, Mirafiori')],
'andezeno':[dict(street='76 Strada Andezeno',city='Chieri'),dict(q='Strada Andezeno, Chieri')],
}
res={}
for k,opts in tests.items():
    for o in opts:
        try:r=q(**o)
        except Exception as e:r=None
        if r: res[k]=r;print(k,o,r);break
    else: print(k,'FAIL')
json.dump(res,open('geo2.json','w'))
