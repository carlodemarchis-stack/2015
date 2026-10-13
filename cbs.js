// CBS Scuola Calcio: one view per team (its own girone): standings with form boxes + giornate.
// 15 teams come from data/cbs.json (Sprint e Sport, read in the browser on request); the three
// Esordienti 2015 teams come from this site's own data (LND PDF + giocaacalcio/manual results).
(async()=>{
const get=u=>fetch(u,{cache:"no-cache"}).then(r=>r.json());
const [X,D,LIVE,SHORT,FLD,REL]=await Promise.all([get("data/cbs.json"),get("data/teams_matches.json"),get("data/live.json").catch(()=>({m:{}})),get("data/short.json").catch(()=>({})),get("data/cbs_fields.json").catch(()=>({teams:{},dist:{}})),get("data/releases_cbs.json").catch(()=>[])]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const WD=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"],MB=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const fmtD=d=>d?`${WD[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`:"";
const FAV="cbs_preferita";
// Favourite team: pinned first in the team list, starred in the selector.
const getFav=()=>{try{return localStorage.getItem(FAV)}catch(e){return null}};
const setFav=k=>{try{k?localStorage.setItem(FAV,k):localStorage.removeItem(FAV)}catch(e){}};
const STAR='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor"/></svg>';

// Common model: {teams:[{n,sn,s}], cbs, ms:[{n,d,o,h,a,sc,nd,tav}]}
function model(T){
 if(T.src==="2015"){
  const v=D[T.gir],live=new Map((LIVE.m[T.gir]||[]).map(r=>[`${Math.min(r[1],r[2])}|${Math.max(r[1],r[2])}`,r]));
  const ms=v.m.filter(m=>m[2]!==-1).map(m=>{const r=live.get(`${Math.min(m[2],m[3])}|${Math.max(m[2],m[3])}`);
   let d,o,h=m[2],a=m[3],sc=null;
   if(r){h=r[1];a=r[2];if(r[3]){const [dd,tt]=r[3].split("T"),[y,mo,da]=dd.split("-").map(Number);d=new Date(y,mo-1,da);o=(tt||"").replace(/^0/,"")}
    const g=r[4]&&r[4].match(/(\d+)\s*[-:]\s*(\d+)/);if(g)sc=[+g[1],+g[2]]}
   if(!d){const [dd,mo,y]=m[1].split("/").map(Number),ht=v.t[m[2]];d=new Date(2000+y,mo-1,dd+(ht.dom?1:0));o=ht.o||""}
   return {n:m[0],d,o,h,a,sc,nd:false,tav:false}});
  return {teams:v.t.map(t=>({n:t.n,sn:(SHORT[t.n.replace(" (femm.)","")]||t.n)+(t.n.includes("(femm.)")?" F":""),s:t.s,f:t.c?t:null})),cbs:T.i,ms};
 }
 const ms=T.m.map(([n,dt,h,a,sc,tav])=>{const [dd,tt]=dt.split(" "),[y,mo,da]=dd.split("-").map(Number),g=sc.match(/^(\d+)-(\d+)$/);
  return {n,d:new Date(y,mo-1,da),o:tt||"",h,a,sc:g?[+g[1],+g[2]]:null,nd:sc==="N.D.",tav:!!tav}});
 const F=(FLD.teams||{})[T.k]||[];
 return {teams:T.t.map((n,i)=>({n,sn:n,s:T.s?T.s[i]||undefined:undefined,f:F[i]||null})),cbs:T.cbs,ms};
}
function standings(M){
 const S=M.teams.map((t,i)=>({i,t,g:0,w:0,d:0,l:0,f:0,a:0,p:0}));
 M.ms.forEach(m=>{if(!m.sc)return;const H=S[m.h],A=S[m.a],[x,y]=m.sc;H.g++;A.g++;H.f+=x;H.a+=y;A.f+=y;A.a+=x;
  if(x>y){H.w++;A.l++;H.p+=3}else if(x<y){A.w++;H.l++;A.p+=3}else{H.d++;A.d++;H.p++;A.p++}});
 return S.sort((u,v)=>v.p-u.p||(v.f-v.a)-(u.f-u.a)||v.f-u.f||u.t.n.localeCompare(v.t.n));
}
const dot=t=>t.s?`<i class="dot s${t.s}">${t.s}</i>`:"";
// Fields (LND PDFs, data/cbs_fields.json): name, town, Google Maps link, car km/min from Corso Sicilia 58
const fName=f=>f.c.split(" · ")[0],fTown=f=>f.c.split(" · ").pop(),fKey=f=>`${f.y},${f.x}`;
const gmaps=f=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${f.a}, ${fTown(f)}, Piemonte`);
const fDist=f=>(FLD.dist||{})[fKey(f)];
// home day: "day" from cbs_fields.json ("" when the regional PDF leaves it to the championship), "dom" on the 2015 site
const fDay=f=>f.day!==undefined?f.day:(f.dom?"Dom":"Sab");
const homeTxt=f=>fDay(f)||f.o?` · in casa ${fDay(f)} ${esc(f.o)}`.trimEnd():"";
// one map setup for both maps: all of Piemonte and Valle d'Aosta (Promozione and Elite opponents travel far)
function newMap(id){const m=L.map(id,{minZoom:7,maxZoom:16,zoomSnap:.25,maxBounds:[[43.7,6.4],[46.5,9.5]]});m.attributionControl.setPrefix(false);
 L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(m);return m}
const winCls=sc=>sc?(sc[0]>sc[1]?" wh":sc[0]<sc[1]?" wa":""):"";
const scHTML=m=>m.sc?`<b class="sc"><i>${m.sc[0]}</i>-<i>${m.sc[1]}</i></b>${m.tav?'<small class="tav" title="Risultato a tavolino">tav</small>':""}`:m.nd?'<em title="Non disputata">N.D.</em>':"<em>-</em>";

// data-e = index of the first unplayed match: fitTable() keeps the boxes up to it plus the next 2
function formHTML(M,i){
 const list=M.ms.filter(m=>m.h===i||m.a===i).sort((a,b)=>a.n-b.n),k=list.findIndex(m=>!m.sc&&!m.nd);
 return `<span class="frm" data-e="${k<0?list.length:k}">${list.map(m=>{const home=m.h===i,opp=M.teams[home?m.a:m.h],r=m.sc?(home?m.sc:[m.sc[1],m.sc[0]]):null;
  const k=r?(r[0]>r[1]?"w":r[0]<r[1]?"l":"d"):"u",lab={w:"Vittoria",d:"Pareggio",l:"Sconfitta",u:m.nd?"Non disputata":"Da giocare"}[k];
  const tip=`<b>${m.n}ª giornata</b> · ${fmtD(m.d)}${m.o?" "+esc(m.o):""}<br>${home?"Casa":"Trasferta"} vs ${dot(opp)} ${esc(opp.n)}<br><span class="tt ${k}">${lab}${r?` ${r[0]}-${r[1]}`:""}</span>`;
  return `<i class="fb ${k}" data-tiph="${esc(tip)}"></i>`}).join("")}</span>`;
}
// big gironi (Promozione, Under 19-15): every match box that fits; mid-size screens put them on a second row
function tableHTML(M,big){
 const S=standings(M);
 return `<table class="ctab${big?" full":""}"><thead><tr><th>#</th><th class="tn">Squadra</th><th>Pt</th><th>G</th><th>V</th><th>N</th><th>P</th><th class="opt">GF</th><th class="opt">GS</th><th>DR</th></tr></thead><tbody>${S.map((x,k)=>`<tr class="${x.i===M.cbs?"me":""}"><td>${k+1}</td><td class="tn"><div>${dot(x.t)}<span class="tn2"><span class="fn">${esc(x.t.n)}</span><span class="sn">${esc(x.t.sn||x.t.n)}</span></span>${formHTML(M,x.i)}</div></td><td class="pt">${x.p}</td><td>${x.g}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td class="opt">${x.f}</td><td class="opt">${x.a}</td><td>${x.f-x.a>0?"+":""}${x.f-x.a}</td></tr>${big?`<tr class="frow${x.i===M.cbs?" me":""}"><td></td><td colspan="9">${formHTML(M,x.i)}</td></tr>`:""}`).join("")}</tbody></table>`;
}
function roundHTML(M,n){
 const ms=M.ms.filter(m=>m.n===n).sort((a,b)=>a.d-b.d||a.o.localeCompare(b.o,undefined,{numeric:true}));
 const playing=new Set(ms.flatMap(m=>[m.h,m.a])),rest=M.teams.map((t,i)=>i).filter(i=>!playing.has(i));
 const d0=ms[0]&&ms[0].d,nm=(t,r)=>`<span class="rt" title="${esc(t.n)}${t.s?" "+t.s:""}">${r?"":dot(t)}<span class="tn2"><span class="fn">${esc(t.n)}</span><span class="sn">${esc(t.sn)}</span></span>${r?dot(t):""}</span>`;
 return `<section class="rnd"><h4>${n}ª giornata${d0?" · "+d0.getDate()+" "+MB[d0.getMonth()]:""}</h4>${ms.map(m=>{const f=M.teams[m.h].f,cb=m.h===M.cbs||m.a===M.cbs;
  return `<div class="mr${winCls(m.sc)}${cb?" cb":""}"${cb&&f&&f.y!=null?` data-fk="${fKey(f)}"`:""} data-tip="${fmtD(m.d)} ${esc(m.o)} · ${esc(M.teams[m.h].n)} - ${esc(M.teams[m.a].n)}${f?` · ${esc(fName(f))}, ${esc(fTown(f))}`:""}">${nm(M.teams[m.h])}${scHTML(m)}${nm(M.teams[m.a],1)}</div>`}).join("")}${rest.length&&rest.length<M.teams.length?`<div class="mr"><em style="grid-column:1/-1;text-align:left">Riposa ${rest.map(i=>esc(M.teams[i].n)).join(", ")}</em></div>`:""}</section>`;
}
// big screens, long gironi: every CBS match in two columns beside the standings; click = its giornata
function mineHTML(M){
 const ms=M.ms.filter(m=>m.h===M.cbs||m.a===M.cbs).sort((a,b)=>a.n-b.n);
 return `<h3>Partite CBS</h3><div class="kl" style="grid-template-rows:repeat(${Math.ceil(ms.length/2)},auto)">${ms.map(m=>{const home=m.h===M.cbs,opp=M.teams[home?m.a:m.h],r=m.sc?(home?m.sc:[m.sc[1],m.sc[0]]):null;
  const k=r?(r[0]>r[1]?"w":r[0]<r[1]?"l":"d"):"u";
  return `<button type="button" class="km ${k}${m.n===RN?" on":""}" data-n="${m.n}"><b>${m.n}ª</b><span class="kd"><i>${WD[m.d.getDay()]} </i>${m.d.getDate()}/${m.d.getMonth()+1} ${esc(m.o)}</span><span class="ko">${home?"vs":"@"} ${dot(opp)}${esc(opp.n)}</span><i class="kr">${r?`${r[0]}-${r[1]}`:m.nd?"N.D.":"-"}</i></button>`}).join("")}</div>`;
}
// standings: every team name gets the width of the longest one (boxes then line up); when the
// boxes would be narrower than 5px, the oldest ones are hidden (last played + next 2 stay)
function fitTable(){const t=document.querySelector("#xtbl .ctab");if(!t)return;
 const w=Math.max(0,...[...t.querySelectorAll("td.tn div>span:not(.frm)")].map(e=>e.scrollWidth));if(w)t.style.setProperty("--nw",w+"px");
 t.querySelectorAll("td.tn .frm").forEach(f=>{const bs=[...f.children];bs.forEach(b=>b.classList.remove("ox"));
  const W=f.clientWidth-parseFloat(getComputedStyle(f).paddingLeft);if(W<=0)return;
  const n=Math.max(1,Math.floor((W+1)/6));if(n>=bs.length)return;
  const a=Math.max(0,Math.min(+f.dataset.e-n+2,bs.length-n));bs.forEach((b,j)=>b.classList.toggle("ox",j<a||j>=a+n))})}
addEventListener("resize",fitTable);
// laptops, long gironi: giornate 5 at a time under tabs "1-5", "6-10"...; the current one is marked
function pageHTML(M,R){
 const pages=[];for(let i=0;i<R.length;i+=5)pages.push(R.slice(i,i+5));
 const cur=pages.find(p=>p.includes(RN))||pages[0];
 return `<div class="xpg"><div class="seg xtabs" role="group" aria-label="Giornate">${pages.map(p=>`<button type="button" data-n="${p.includes(RN)?RN:p[0]}" aria-pressed="${p===cur}">${p[0]}-${p[p.length-1]}</button>`).join("")}</div><div class="xpr">${cur.map(n=>roundHTML(M,n).replace('<section class="rnd">',`<section class="rnd${n===RN?" cur":""}">`)).join("")}</div></div>`;
}
let CUR=null,RN=null;
// "Campi del girone": one pin per field (teams sharing a field share the pin), CBS in red; list beside
let MAP=null,LAY=null;const MK=new Map();
function drawMap(M){
 const W=document.getElementById("xmapw"),has=M.teams.some(t=>t.f&&t.f.y!=null);W.hidden=!has||!window.L;if(W.hidden)return;
 if(!MAP){MAP=newMap("xmap");LAY=L.layerGroup().addTo(MAP)}
 LAY.clearLayers();MK.clear();
 const by=new Map();M.teams.forEach((t,i)=>{if(!t.f||t.f.y==null)return;const k=fKey(t.f);if(!by.has(k))by.set(k,{f:t.f,ix:[]});by.get(k).ix.push(i)});
 const pts=[];
 by.forEach((v,k)=>{const f=v.f,cb=v.ix.includes(M.cbs),d=fDist(f);
  const games=M.ms.filter(m=>(m.h===M.cbs||m.a===M.cbs)&&v.ix.includes(m.h)).sort((a,b)=>a.n-b.n);
  const rows=games.map(m=>{const opp=M.teams[m.h===M.cbs?m.a:m.h];return `<div class="pr"><b>${m.n}ª</b><span>${fmtD(m.d)} ${esc(m.o)}</span><span>${m.h===M.cbs?"vs":"@"} ${esc(opp.sn||opp.n)}</span>${m.sc?`<b>${m.sc[0]}-${m.sc[1]}</b>`:""}</div>`}).join("");
  const html=`<div class="pp"><b>${esc(fName(f))}</b><div class="pa">${esc(f.a)}, ${esc(fTown(f))}</div><div class="pa">Campo di ${v.ix.map(i=>esc(M.teams[i].n)+(M.teams[i].s?" "+M.teams[i].s:"")).join(", ")}</div>${d&&d[0]?`<div class="pa">${d[0]} km · ${d[1]} min da Corso Sicilia 58</div>`:""}${rows?`<div class="pg">${rows}</div>`:""}<a href="${gmaps(f)}" target="_blank" rel="noopener">Indicazioni in Google Maps ↗</a></div>`;
  const lab=cb?"CBS":v.ix.map(i=>esc(M.teams[i].sn||M.teams[i].n)).join(" · ");
  MK.set(k,L.marker([f.y,f.x],{icon:L.divIcon({className:"",html:`<span class="pin${cb?" cbs":""}">${lab}</span>`,iconSize:[0,0]}),zIndexOffset:cb?1000:0}).bindPopup(html).addTo(LAY));
  pts.push([f.y,f.x])});
 MAP.invalidateSize();if(pts.length)MAP.fitBounds(pts,{paddingTopLeft:[50,46],paddingBottomRight:[50,16],maxZoom:13});
 const order=M.teams.map((t,i)=>i).filter(i=>M.teams[i].f).sort((a,b)=>(b===M.cbs)-(a===M.cbs)||((fDist(M.teams[a].f)||[99])[0]-(fDist(M.teams[b].f)||[99])[0]));
 document.getElementById("xvl").innerHTML=order.map(i=>{const t=M.teams[i],f=t.f,d=fDist(f);
  return `<li${i===M.cbs?' class="me"':""}${f.y!=null?` data-fk="${fKey(f)}"`:""}><div class="vt">${dot(t)}<b>${esc(t.n)}</b>${d&&d[0]?`<small>${d[0]} km · ${d[1]} min</small>`:""}</div><div class="vf">${esc(fName(f))} · ${esc(fTown(f))}</div><div class="va">${esc(f.a)}${homeTxt(f)} · <a href="${gmaps(f)}" target="_blank" rel="noopener">Indicazioni ↗</a></div></li>`}).join("");
}
function focusField(k){const mk=MK.get(k);if(!mk)return;document.getElementById("xmapw").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>{MAP.flyTo(mk.getLatLng(),14,{duration:.6});mk.openPopup()},250)}
// "Questo weekend": where every CBS team plays on the coming (or current) Saturday and Sunday
function weekend(){const t=new Date();t.setHours(0,0,0,0);const d=t.getDay();
 const sat=new Date(t);sat.setDate(t.getDate()+(d===0?-1:6-d));
 for(let w=0;w<8;w++){const a=new Date(sat);a.setDate(sat.getDate()+7*w);const b=new Date(a);b.setDate(a.getDate()+1);
  const items=[];X.teams.forEach(T=>{const M=model(T);M.ms.forEach(m=>{if((m.h===M.cbs||m.a===M.cbs)&&m.d>=a&&m.d<=b&&!m.nd){const home=m.h===M.cbs;
   items.push({T,M,m,home,opp:M.teams[home?m.a:m.h],f:M.teams[m.h].f})}})});
  if(items.length)return {a,b,items:items.sort((x,y)=>x.m.d-y.m.d||(x.m.o||"99").localeCompare(y.m.o||"99",undefined,{numeric:true}))}}
 return {a:sat,b:sat,items:[]}}
const GN=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"],MN=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
let WMAP=null,WLAY=null;const WMK=new Map();
function showWeekend(){
 const W=weekend(),sec=document.getElementById("xwk");
 const day=d=>`${GN[d.getDay()][0].toUpperCase()+GN[d.getDay()].slice(1)} ${d.getDate()} ${MN[d.getMonth()]}`;
 const code=T=>T.k.toUpperCase();
 const days=[...new Set(W.items.map(x=>x.m.d.getTime()))].map(t=>new Date(t));
 document.getElementById("wl").innerHTML=W.items.length?`<p class="wh">${W.items.length} partite · ${day(W.a)} e ${day(W.b).toLowerCase()}</p>`+days.map(d=>`<h3>${day(d)}</h3>${W.items.filter(x=>x.m.d.getTime()===d.getTime()).map(x=>{const f=x.f;
  return `<div class="wr${x.home?" h":""}"${f&&f.y!=null?` data-wk="${fKey(f)}"`:""}><b class="wt">${esc(x.m.o||"-")}</b><span class="wm"><a class="wteam" href="#${x.T.k}" data-k="${x.T.k}">${esc(x.T.lab)}</a> ${x.home?"vs":"@"} ${dot(x.opp)}${esc(x.opp.sn||x.opp.n)}</span><small class="wf">${f?`${x.home?"In casa · ":""}${esc(fName(f))} · ${esc(fTown(f))}`:"Campo non indicato"}</small></div>`}).join("")}`).join(""):`<p class="wh">Nessuna partita CBS nelle prossime settimane.</p>`;
 sec.querySelectorAll(".wteam").forEach(a=>a.onclick=e=>{e.preventDefault();e.stopPropagation();FROMLIST=true;history.pushState(null,"","#"+a.dataset.k);show(a.dataset.k);scrollTo(0,0)});
 if(!window.L)return;
 if(!WMAP){WMAP=newMap("wmap");WLAY=L.layerGroup().addTo(WMAP)}
 WLAY.clearLayers();WMK.clear();
 const by=new Map();W.items.forEach(x=>{if(!x.f||x.f.y==null)return;const k=fKey(x.f);if(!by.has(k))by.set(k,{f:x.f,items:[]});by.get(k).items.push(x)});
 const pts=[],home=FLD.from?FLD.from.join(","):"";
 by.forEach((v,k)=>{const f=v.f,cb=k===home,d=fDist(f);
  const rows=v.items.map(x=>`<div class="pr"><b>${code(x.T)}</b><span>${fmtD(x.m.d)} ${esc(x.m.o)}</span><span>${x.home?"vs":"@"} ${esc(x.opp.sn||x.opp.n)}</span></div>`).join("");
  const html=`<div class="pp"><b>${esc(fName(f))}</b><div class="pa">${esc(f.a)}, ${esc(fTown(f))}</div>${d&&d[0]?`<div class="pa">${d[0]} km · ${d[1]} min da Corso Sicilia 58</div>`:""}<div class="pg">${rows}</div><a href="${gmaps(f)}" target="_blank" rel="noopener">Indicazioni in Google Maps ↗</a></div>`;
  const lab=cb?`CBS · ${v.items.length}`:v.items.map(x=>code(x.T)).join(" · ");
  WMK.set(k,L.marker([f.y,f.x],{icon:L.divIcon({className:"",html:`<span class="pin${cb?" cbs":""}">${lab}</span>`,iconSize:[0,0]}),zIndexOffset:cb?1000:0}).bindPopup(html).addTo(WLAY));
  pts.push([f.y,f.x])});
 WMAP.invalidateSize();if(pts.length)WMAP.fitBounds(pts,{paddingTopLeft:[50,46],paddingBottomRight:[50,16],maxZoom:12});
}
document.addEventListener("click",e=>{if(e.target.closest("a"))return;const r=e.target.closest("#wl .wr[data-wk]");if(!r)return;const mk=WMK.get(r.dataset.wk);if(!mk)return;
 document.getElementById("wmap").scrollIntoView({behavior:"smooth",block:"nearest"});WMAP.flyTo(mk.getLatLng(),13,{duration:.6});mk.openPopup()});
// list screen tabs: "Squadre" (team list) / "Questo weekend" (map); #weekend opens the second
function setView(v){const wk=v==="weekend";
 document.getElementById("xlist").hidden=wk;document.getElementById("xwk").hidden=!wk;
 document.querySelectorAll("#xtab button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===v));
 const h=wk?"#weekend":"";if(location.hash!==h)history.replaceState(null,"",location.pathname+location.search+h);
 if(wk)showWeekend()}
document.querySelectorAll("#xtab button").forEach(b=>b.onclick=()=>setView(b.dataset.v));
// Every screen: first screen is a list of the 18 teams (position, last and next match); tap = detail.
let FROMLIST=false;
function summary(T){
 const M=model(T),S=standings(M),k=S.findIndex(x=>x.i===M.cbs),me=S[k];
 const mine=M.ms.filter(m=>m.h===M.cbs||m.a===M.cbs).sort((a,b)=>a.d-b.d||a.n-b.n);
 const last=[...mine].reverse().find(m=>m.sc),next=mine.find(m=>!m.sc&&!m.nd&&m!==last&&(!last||m.d>=last.d));
 const side=m=>{const home=m.h===M.cbs;return {home,opp:M.teams[home?m.a:m.h],r:m.sc?(home?m.sc:[m.sc[1],m.sc[0]]):null}};
 return {pos:me.g?k+1:null,n:S.length,p:me.p,g:me.g,last:last&&{...side(last),m:last},next:next&&{...side(next),m:next,f:M.teams[next.h].f}};
}
function showList(view){
 document.body.classList.add("mlist");CUR=null;
 const L=document.getElementById("xlist");
 const grp=[...new Set(X.teams.map(t=>t.grp))];
 const fav=getFav(),card=T=>{const s=summary(T);
  const res=s.last?(s.last.r[0]>s.last.r[1]?"w":s.last.r[0]<s.last.r[1]?"l":"d"):"";
  return `<button type="button" class="xi${T.k===fav?" fav":""}" data-k="${T.k}">
   <span class="xt"><b>${T.k===fav?`<i class="xstar">${STAR}</i>`:""}${esc(T.lab)}</b><small>${esc(T.camp)} · Gir. ${esc(T.gir)}</small></span>
   <span class="xp">${s.pos?`<b>${s.pos}°</b><small>${s.p} pt</small>`:`<b>-</b><small>0 pt</small>`}</span>
   <span class="xm"><em>Ultima</em>${s.last?`<i class="res ${res}">${s.last.r[0]}-${s.last.r[1]}</i> ${s.last.home?"vs":"@"} ${esc(s.last.opp.sn||s.last.opp.n)}`:"<span class=nx>non ancora giocata</span>"}</span>
   <span class="xm"><em>Prossima</em>${s.next?`${fmtD(s.next.m.d)} ${esc(s.next.m.o)} · ${s.next.home?"vs":"@"} ${esc(s.next.opp.sn||s.next.opp.n)}`:"<span class=nx>-</span>"}</span>
   ${s.next&&s.next.f?`<span class="xm"><em>Dove</em>${esc(fName(s.next.f))} · ${esc(fTown(s.next.f))}</span>`:""}
  </button>`};
 const F=X.teams.find(t=>t.k===fav);
 // one section per group; big screens lay them out as columns (see cbs.css)
 const slug=g=>g.toLowerCase().replace(/\W+/g,"-");
 L.innerHTML=(F?`<section class="xgrp g-fav"><h3>La tua squadra</h3>${card(F)}</section>`:"")+grp.map(g=>`<section class="xgrp g-${slug(g)}"><h3>${esc(g)}</h3>${X.teams.filter(t=>t.grp===g).map(card).join("")}</section>`).join("");
 // push a history entry so the phone's back gesture returns to this list
 L.querySelectorAll(".xi").forEach(b=>b.onclick=()=>{FROMLIST=true;history.pushState(null,"","#"+b.dataset.k);show(b.dataset.k);scrollTo(0,0)});
 document.getElementById("xsrc").textContent=`Dati aggiornati il ${(([d,t])=>d.split("-").reverse().slice(0,2).join("/")+" alle "+t)(X.updated.split("T"))}. Giorno e orario sono indicativi: verifica sempre con la società.`;
 setView(view||"squadre");
}
// back to the team list (dropdown "Tutte le squadre" or the page title)
function toList(){if(!CUR)return;if(FROMLIST){FROMLIST=false;history.back()}else showList()}
document.getElementById("xhome").onclick=e=>{e.preventDefault();toList();scrollTo(0,0)};
function curRound(M){const R=[...new Set(M.ms.map(m=>m.n))].sort((a,b)=>a-b),t=new Date();t.setHours(0,0,0,0);
 for(const n of R){const ds=M.ms.filter(m=>m.n===n).map(m=>m.d);if(Math.max(...ds)>=t-864e5)return n}return R[R.length-1]}
function show(k,n){
 document.body.classList.remove("mlist");document.getElementById("xlist").hidden=true;document.getElementById("xwk").hidden=true;
 const T=X.teams.find(t=>t.k===k)||X.teams[0];CUR=T.k;
 const M=model(T),R=[...new Set(M.ms.map(m=>m.n))].sort((a,b)=>a-b),big=R.length>10;
 document.querySelectorAll("#xsel button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===T.k));
 const pl=M.ms.filter(m=>m.sc).length;
 // phone portrait: the title is a dropdown with every team plus "Tutte le squadre" (back to the list)
 const opts=`<option value="">Tutte le squadre</option>${[...new Set(X.teams.map(t=>t.grp))].map(g=>`<optgroup label="${esc(g)}">${X.teams.filter(t=>t.grp===g).map(t=>`<option value="${t.k}"${t.k===T.k?" selected":""}>${esc(t.lab)}</option>`).join("")}</optgroup>`).join("")}`;
 document.getElementById("xhead").innerHTML=`<label class="xcombo"><span class="vh">Squadra</span><select id="xpick">${opts}</select></label><h2>${esc(T.lab)}</h2><button type="button" class="favbtn xfav" id="xfav" aria-pressed="${getFav()===T.k}">${STAR}<span>${getFav()===T.k?"La tua squadra":"Segui questa squadra"}</span></button><p>${esc(T.camp)} · Girone ${esc(T.gir)} · ${M.teams.length} squadre · Partite giocate <b>${pl}/${M.ms.length}</b></p>`;
 document.getElementById("xfav").onclick=()=>{setFav(getFav()===T.k?null:T.k);show(T.k,RN);paintSel()};
 document.getElementById("xpick").onchange=e=>{const v=e.target.value;if(!v)toList();else show(v);scrollTo(0,0)};
 drawMap(M);document.getElementById("xtbl").innerHTML=tableHTML(M,big);fitTable();document.querySelector(".xcols").classList.toggle("full",big);
 const res=document.getElementById("xres");
 if(big){RN=R.includes(n)?n:curRound(M);
  // phone portrait: a dropdown with prev/next arrows replaces the grid of giornata buttons
  const d0=r=>{const d=M.ms.filter(m=>m.n===r).map(m=>m.d).sort((a,b)=>a-b)[0];return d?` · ${d.getDate()} ${MB[d.getMonth()]}`:""},k=R.indexOf(RN);
  res.innerHTML=`<div class="seg gsel xr" role="group" aria-label="Giornata">${R.map(r=>`<button type="button" data-n="${r}" aria-pressed="${r===RN}">${r}</button>`).join("")}</div><div class="xrsel"><button type="button" data-n="${R[k-1]||""}"${k>0?"":" disabled"} aria-label="Giornata precedente">‹</button><label><span class="vh">Giornata</span><select>${R.map(r=>`<option value="${r}"${r===RN?" selected":""}>${r}ª giornata${d0(r)}</option>`).join("")}</select></label><button type="button" data-n="${R[k+1]||""}"${k<R.length-1?"":" disabled"} aria-label="Giornata successiva">›</button></div>${roundHTML(M,RN)}${pageHTML(M,R)}`;
  res.querySelectorAll(".xr button,.xrsel button,.xpg .xtabs button").forEach(b=>b.onclick=()=>show(CUR,+b.dataset.n));
  res.querySelector(".xrsel select").onchange=e=>show(CUR,+e.target.value);
  res.classList.add("one");
  const mine=document.getElementById("xmine");mine.innerHTML=mineHTML(M);mine.querySelectorAll(".km").forEach(b=>b.onclick=()=>{show(CUR,+b.dataset.n);document.querySelector("#xres .rnd").scrollIntoView({behavior:"smooth",block:"nearest"})});
 }else{RN=null;res.classList.remove("one");document.getElementById("xmine").innerHTML="";res.innerHTML=`<div class="rounds">${R.map(r=>roundHTML(M,r)).join("")}</div>`}
 const h=`#${T.k}${RN?"/"+RN:""}`;if(location.hash!==h)history.replaceState(null,"",h);
 document.getElementById("xsrc").textContent=T.src==="2015"
  ?"Fonte: calendario ufficiale FIGC LND. Giorno e orario sono indicativi: verifica sempre con la società."
  :`Dati aggiornati il ${(([d,t])=>d.split("-").reverse().slice(0,2).join("/")+" alle "+t)(X.updated.split("T"))}. Giorno e orario sono indicativi: verifica sempre con la società.`;
}
// a CBS match row or a list entry opens its field on the map
document.addEventListener("click",e=>{if(e.target.closest("a"))return;const r=e.target.closest("#xres .mr[data-fk],#xvl li[data-fk]");if(r)focusField(r.dataset.fk)});
// version + release notes of this page (data/releases_cbs.json, newest first)
(()=>{const b=document.getElementById("verBtn"),vd=document.getElementById("vdlg");if(!REL.length){b.hidden=true;return}
 b.textContent=`v${REL[0].v} · Novità`;
 b.onclick=()=>{document.getElementById("vBody").innerHTML=REL.map(r=>`<section class="rel"><h4>Versione ${r.v}${r.date?` <small>${r.date}</small>`:""}</h4><ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></section>`).join("");if(vd.showModal)vd.showModal();else vd.setAttribute("open","")};
 document.getElementById("vX").onclick=()=>vd.close();vd.addEventListener("click",e=>{if(e.target===vd)vd.close()})})();
addEventListener("popstate",()=>{const k=location.hash.slice(1).split("/")[0];if(!X.teams.some(t=>t.k===k)){FROMLIST=false;showList(k)}else show(k)});
const grp=[...new Set(X.teams.map(t=>t.grp))];
document.getElementById("xsel").innerHTML=grp.map(g=>`<div class="xg"><span>${esc(g)}</span>${X.teams.filter(t=>t.grp===g).map(t=>`<button type="button" data-k="${t.k}" aria-pressed="false">${esc(t.lab)}</button>`).join("")}</div>`).join("");
document.querySelectorAll("#xsel button").forEach(b=>b.onclick=()=>show(b.dataset.k));
function paintSel(){const f=getFav();document.querySelectorAll("#xsel button").forEach(b=>b.classList.toggle("isfav",b.dataset.k===f))}
paintSel();
// left/right arrows: previous/next team; in big gironi up/down change giornata
document.addEventListener("keydown",e=>{if(!CUR)return;const K=X.teams.map(t=>t.k),i=K.indexOf(CUR);
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();show(K[(i+(e.key==="ArrowRight"?1:-1)+K.length)%K.length])}});
// tooltip (same look as the main site)
(()=>{const tip=document.getElementById("ctip");
 document.addEventListener("mousemove",e=>{const t=e.target.closest&&e.target.closest("[data-tip],[data-tiph]");if(!t){tip.hidden=true;return}
  if(t.dataset.tiph)tip.innerHTML=t.dataset.tiph;else tip.textContent=t.dataset.tip;tip.hidden=false;
  const w=tip.offsetWidth;tip.style.left=Math.min(e.clientX+14,innerWidth-w-8)+"px";tip.style.top=(e.clientY+16)+"px"})})();
const p=decodeURIComponent(location.hash.slice(1)).split("/");
let k0=p[0];
if(X.teams.some(t=>t.k===k0))show(k0,+p[1]||null);else showList(k0);
})();
