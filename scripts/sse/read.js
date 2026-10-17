// Run in the browser pane ON www.sprintesport.it (Carlo's request only; robots.txt disallows /webservices/ for
// scripts and the Action). Reads the 11 Esordienti 2015 gironi + the 15 CBS gironi, keeps giornata, date/time,
// teams and score (the feed also carries submitters' emails: never kept), and stores the JSON in window.name.
// Then navigate the same tab to the local preview's /_recv.html (scripts/sse/recv.html) with recv.py running.
const get=(com,cat,g)=>fetch(`/webservices/sprintsport/getResults.jsp?idsport=1&idcomitato=${com}&idcategoria=${cat}&idgirone=${g}`).then(r=>r.json()).then(d=>(d.risultati||[]).map(r=>[r.giornata,r.dataorap,r.squadraH,r.squadraV,r.risultato]));
const out={e15:{},cbs:{}};
for(const [g,i] of Object.entries({A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,L:12,M:13})){out.e15[g]=await get(4,242,i);await new Promise(r=>setTimeout(r,400))}
for(const [k,com,cat,g] of [["pro",2,2,4],["u19",4,195,2],["u17",2,232,1],["u16",2,344,1],["u15",2,233,1],["u14",92,174,56],["u15f",2,182,2],["e14a",4,241,8],["e14b",4,241,7],["p16a",4,249,8],["p16b",4,249,12],["p16c",4,249,14],["p17a",4,250,9],["p17b",4,250,12],["p17c",4,250,13]]){out.cbs[k]=await get(com,cat,g);await new Promise(r=>setTimeout(r,400))}
window.name=JSON.stringify(out);[window.name.length,Object.values(out.e15).flat().filter(r=>/\d/.test(r[4])).length,Object.values(out.cbs).flat().filter(r=>/\d/.test(r[4])).length]
