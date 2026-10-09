// Esordienti 2015 Torino. Data: data/teams_matches.json (calendar), data/road_distances.json
// (OSRM km/min), data/live.json (real date/time + scores from giocaacalcio.it, refreshed by the Action).
var FAVK="esordienti2015_mia_squadra";
(async()=>{
const get=u=>fetch(u,{cache:"no-cache"}).then(r=>r.json());
const [D,ROAD,LIVE,REL,LOGO]=await Promise.all([get("data/teams_matches.json"),get("data/road_distances.json"),get("data/live.json").catch(()=>({m:{}})),get("data/releases.json").catch(()=>[]),get("data/logos.json").catch(()=>({}))]);
// Logos are kept apart from the LND PDF data; attach them as t.l for rendering.
Object.entries(LOGO).forEach(([g,m])=>Object.entries(m).forEach(([i,p])=>{if(D[g]&&D[g].t[+i])D[g].t[+i].l=p}));
const WD=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function myClub(){const f=getFav();if(!f)return null;const [g,i]=f.split("|");const t=D[g]&&D[g].t[+i];return t?clubKey(t):null}
const isCBS=t=>{const c=myClub();return !!c&&clubKey(t)===c};
const label=t=>t.n;
// Team order of a girone card: calendar order until the first result, then standings.
function cardOrder(g,st){st=st||standings(g);return st.some(x=>x.g)?st.map(x=>x.i):D[g].t.map((t,i)=>i)}
function grid(){
 const g=document.getElementById("grid");
 g.innerHTML=Object.entries(D).map(([k,v])=>{
  const has=v.t.some((t,i)=>isFav(k,i));
  // Points per team; calendar order until the first result, then standings order.
  const st=standings(k),pts=new Map(st.map(x=>[x.i,x.p])),order=cardOrder(k,st);
  return `<section class="card${has?" has-cbs":""}"><header data-cg="${k}" tabindex="0" role="button" title="Classifica girone ${k}"><h2>${k}</h2><span class="gp" title="Partite giocate / totale">${(()=>{const ms=v.m.filter(m=>m[2]!==-1);return `${ms.filter(m=>goals(liveOf(k,m[2],m[3]))).length}/${ms.length}`})()}</span><span class="mix">${["A","B","C","D"].map(L=>{const c=v.t.filter(t=>t.s===L).length;return c?`<span class="mc"><i class="dot s${L}">${L}</i>${c}</span>`:""}).join("")}</span><span class="n">${v.t.length} squadre</span></header><ul>${order.map(i=>[v.t[i],i]).map(([t,i])=>`<li tabindex="0" role="button" data-g="${k}" data-i="${i}" class="${isCBS(t)?"cbs":""}${isFav(k,i)?" fav":""}"><i class="dot s${t.s}">${t.s}</i><span class="nm t${t.s}" title="${esc(t.n)}">${esc(t.n)}</span>${isFav(k,i)?'<span class="fstar" aria-label="La tua squadra"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor"/></svg></span>':""}<b class="pts">${pts.get(i)}</b></li>`).join("")}</ul></section>`;
 }).join("");
}
function maps(t){const city=t.c.split(" · ").pop();return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${t.a}, ${city}, Piemonte`);}
function surf(t){const c=(t.c||"").toLowerCase();if(c.includes("sintetico"))return{k:"syn",l:"Sintetico"};if(c.includes("erba"))return{k:"grass",l:"Erba"};return{k:"nd",l:t.c?"n.d.":""}}
function fieldName(t){let n=t.c.replace(/Sintetico\s*/i,"").replace(/Erba Naturale\s*/i,"").replace(/^\s*-\s*/,"").replace(/\s+-\s+·/,' ·').replace(/^\s*·\s*/,"").trim();return n||t.c}
function tiles(map){
 map.attributionControl.setPrefix(false);
 L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
}
// Real date/time and score from giocaacalcio.it (data/live.json), keyed by the pair of teams:
// each pair meets once per girone. Falls back to the computed day/time when a match is missing.
const LV=new Map();
Object.entries(LIVE.m||{}).forEach(([g,rows])=>rows.forEach(([n,h,a,dt,sc,id])=>LV.set(`${g}|${Math.min(h,a)}|${Math.max(h,a)}`,{h,a,dt,sc,id})));
const liveOf=(g,h,a)=>LV.get(`${g}|${Math.min(h,a)}|${Math.max(h,a)}`);
const ha=(g,m)=>{const lv=m[2]===-1?null:liveOf(g,m[2],m[3]);return lv?[lv.h,lv.a]:[m[2],m[3]]};
// Score "3 - 1" -> [3,1] as goals of the giocaacalcio home team; null when not entered.
function goals(lv){const m=lv&&lv.sc&&lv.sc.match(/(\d+)\s*[-:]\s*(\d+)/);return m?[+m[1],+m[2]]:null}
// Goals for/against from team i's side, or null.
function resFor(g,m,i){const lv=liveOf(g,m[2],m[3]),gl=goals(lv);if(!gl)return null;return lv.h===i?gl:[gl[1],gl[0]]}
function dayOf(g,m){
 const lv=liveOf(g,m[2],m[3]);
 if(lv&&lv.dt){const [d,t]=lv.dt.split("T"),[y,mo,da]=d.split("-").map(Number);return {x:new Date(y,mo-1,da),o:(t||"").replace(/^0/,""),real:true}}
 const [d,mo,y]=m[1].split("/").map(Number),x=new Date(2000+y,mo-1,d),ht=D[g].t[m[2]];
 if(ht.dom)x.setDate(x.getDate()+1);
 return {x,o:ht.o||"",real:false};
}
// Giornata weekend from the round's Saturday (dd/mm/yy): "10/11 Ott", or "31 Ott/1 Nov" across months.
const MB=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
function weekend(dt){const [d,m,y]=dt.split("/").map(Number),sa=new Date(2000+y,m-1,d),su=new Date(2000+y,m-1,d+1);
 return sa.getMonth()===su.getMonth()?`${sa.getDate()}/${su.getDate()} ${MB[sa.getMonth()]}`:`${sa.getDate()} ${MB[sa.getMonth()]}/${su.getDate()} ${MB[su.getMonth()]}`}
function when(dt,home,g,mt){
 if(mt){const r=dayOf(g,mt);return {ds:`${WD[r.x.getDay()]} ${r.x.getDate()}/${r.x.getMonth()+1}`,o:r.o||"orario n.d."}}
 const [d,m,y]=dt.split("/").map(Number);
 const x=new Date(2000+y,m-1,d);
 if(home&&home.dom)x.setDate(x.getDate()+1);
 const ds=`${WD[x.getDay()]} ${x.getDate()}/${x.getMonth()+1}`;
 return {ds,o:home&&home.o?home.o:"orario n.d."};
}
function open(g,i){
 const v=D[g],t=v.t[i];
 const ms=v.m.filter(m=>m[2]===i||m[3]===i).sort((a,b)=>a[0]-b[0]);
 document.getElementById("dlgT").innerHTML=`${t.l?`<img class="tlogo" src="${t.l}" alt="">`:""}<i class="dot s${t.s}" style="width:24px;height:24px;font-size:16px">${t.s}</i><span class="t${t.s}">${esc(label(t))}</span>`;
 document.getElementById("dlgS").innerHTML=`Girone ${g} · ${ms.filter(m=>m[2]!==-1).length} partite`+(t.c?` · Campo di casa: <a class="map" href="${maps(t)}" target="_blank" rel="noopener">${esc(t.c)} · ${esc(t.a)} <span aria-hidden="true">↗</span></a>`:"");
 document.getElementById("dlgL").innerHTML=ms.map(m=>{
  const [n,dt]=m,[h,a]=ha(g,m);
  if(h===-1)return `<li class="rest"><div class="gn">${n}</div><div class="when"><b>${weekend(dt)}</b></div><div class="opp">Riposo</div></li>`;
  const home=h===i,opp=v.t[home?a:h],ht=v.t[h],w=when(dt,ht,g,m),r=resFor(g,m,i);
  const sf=surf(ht),where=ht.c?`<a class="map" href="${maps(ht)}" target="_blank" rel="noopener">${esc(fieldName(ht))} · ${esc(ht.a)} <span aria-hidden="true">↗</span></a>`:"Campo non indicato nel calendario";
  return `<li class="${home?"home":"away"}"><div class="gn">${n}</div><div class="when"><b>${w.ds}</b><span>${esc(w.o)}</span></div><div class="opp">${opp.l?`<img class="ologo" src="${opp.l}" alt="" loading="lazy">`:""}<i class="dot s${opp.s}">${opp.s}</i><span>${esc(label(opp))}</span>${r?`<span class="res ${r[0]>r[1]?"w":r[0]<r[1]?"l":"d"}">${r[0]}-${r[1]}</span>`:""}</div><div class="ha"><span class="tag ${home?"h":"a"}">${home?"Casa":"Trasferta"}</span></div><div class="surf ${sf.k}">${sf.l}</div><div class="where">${where}</div></li>`;
 }).join("");
 const C=document.getElementById("dlgC");
 C.innerHTML=`<h4>Classifica girone ${g}</h4>`+tableHTML(g,standings(g),i);
 C.querySelectorAll("tr[data-i]").forEach(r=>{if(+r.dataset.i!==i)r.onclick=()=>open(g,+r.dataset.i)});
 CUR=[g,i];tab("cal");syncFav();
 const dl=document.getElementById("dlg");
 if(dl.open)dl.scrollTop=0;else if(dl.showModal)dl.showModal();else dl.setAttribute("open","");
}
grid();
setTimeout(()=>{grid();syncFav()},0);
document.getElementById("grid").addEventListener("click",e=>{const hd=e.target.closest("header[data-cg]");if(hd){openTable(hd.dataset.cg);setHash();return}const li=e.target.closest("li[data-g]");if(li)open(li.dataset.g,+li.dataset.i)});
document.getElementById("grid").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const hd=e.target.closest("header[data-cg]");if(hd){e.preventDefault();openTable(hd.dataset.cg);setHash();return}const li=e.target.closest("li[data-g]");if(li){e.preventDefault();open(li.dataset.g,+li.dataset.i)}}});
const dl=document.getElementById("dlg");
document.getElementById("dlgX").onclick=()=>dl.close();
// Left/right arrows: previous/next team of the same girone, in the card's order (wrapping).
// Skipped while the map has focus, where the arrows pan.
document.addEventListener("keydown",e=>{if((e.key!=="ArrowLeft"&&e.key!=="ArrowRight")||!dl.open||!CUR||e.target.closest&&e.target.closest("#map,input"))return;e.preventDefault();
 const [g,i]=CUR,o=cardOrder(g),k=o.indexOf(i),t0=CTAB;open(g,o[(k+(e.key==="ArrowRight"?1:-1)+o.length)%o.length]);if(t0!=="cal")tab(t0)});
dl.addEventListener("click",e=>{if(e.target===dl)dl.close()});

let MAP=null,LAYER=null,CUR=null;
function initMap(){
 if(MAP||!window.L)return;
 MAP=L.map("map",{minZoom:9,maxZoom:16,zoomSnap:.25,attributionControl:true,maxBounds:[[44.6,6.9],[45.45,8.2]]});
 tiles(MAP);
 LAYER=L.layerGroup().addTo(MAP);
}
function venues(g,i){
 const v=D[g],res=new Map();
 v.m.filter(m=>m[2]===i||m[3]===i).sort((a,b)=>a[0]-b[0]).forEach(m=>{
  const [n,dt]=m,[h,a]=ha(g,m); if(h===-1)return;
  const ht=v.t[h]; if(!res.has(h))res.set(h,{ht,home:h===i,games:[]});
  res.get(h).games.push({n,w:when(dt,ht,g,m),opp:v.t[h===i?a:h],home:h===i});
 });
 return [...res.values()];
}
function drawMap(){
 if(!CUR)return; initMap(); if(!MAP){document.getElementById("mapNote").textContent="La mappa non si è caricata. Usa i link Google Maps nel calendario.";return;}
 const [g,i]=CUR,vs=venues(g,i);LAYER.clearLayers();
 const pts=[],missing=[],approx=[];
 const vl=document.getElementById("vlist");
 vl.innerHTML="";
 vs.forEach((vn,k)=>{
  const ht=vn.ht,gs=vn.games.map(x=>x.n).join(" · ");
  if(ht.y==null){missing.push(gs);}
  const rows=vn.games.map(x=>`<div class="r"><b style="margin:0">${x.n}</b><span>${x.w.ds} ${esc(x.w.o)}</span><em>vs</em><span class="t${x.opp.s}">${esc(x.opp.n)}</span></div>`).join("");
  const name=ht.c?esc(ht.c):"Campo non indicato";
  const link=ht.c?`<a href="${maps(ht)}" target="_blank" rel="noopener">Apri in Google Maps ↗</a>`:"";
  const html=`<div class="pp"><b>${vn.home?"Casa · ":""}${name}</b>${ht.a?`<div style="color:var(--muted);font-size:12px;margin-bottom:4px">${esc(ht.a)}</div>`:""}${rows}<div style="margin-top:6px">${link}</div></div>`;
  let mk=null;
  if(ht.y!=null){
   if(ht.ap)approx.push(gs);
   mk=L.marker([ht.y,ht.x],{icon:L.divIcon({className:"",html:`<span class="pin${vn.home?" home":""}">${vn.home?'<span class="h">⌂</span>':""}${gs}</span>`,iconSize:[0,0]}),zIndexOffset:vn.home?1000:0}).bindPopup(html).addTo(LAYER);
   pts.push([ht.y,ht.x]);
  }
  const li=document.createElement("li");
  const rr=vn.home?null:roadOf(D[g].t[i],ht);
  li.innerHTML=`<span class="gs">${gs}</span><span class="vn">${vn.home?"Casa":esc(vn.games.map(x=>x.opp.n)[0])}<small>${name}${ht.a?" · "+esc(ht.a):""}</small></span><span class="km">${rr?`${fk(rr[0])} km · ${rr[1]} min`:""}</span>${link.replace("Apri in Google Maps ↗","Maps ↗")}`;
  li.addEventListener("click",e=>{if(e.target.closest("a"))return;if(mk){MAP.flyTo(mk.getLatLng(),14,{duration:.6});mk.openPopup();}});
  vl.appendChild(li);
 });
 const ts=tripStats(g,i),tr=document.getElementById("trip");
 tr.innerHTML=ts?`<span>Trasferte <b>${ts.n}</b></span><span>Media in auto <b>${fk(ts.km)} km</b> · ~${Math.round(ts.mn)} min</span><span>Più lunga <b>${esc(ts.far.ht.n)}</b> ${fk(ts.far.r[0])} km</span>`:(D[g].t[i].y==null?"Campo di casa non indicato: distanze non disponibili.":"");
 MAP.invalidateSize();
 if(pts.length===1)MAP.setView(pts[0],13);else if(pts.length)MAP.fitBounds(pts,{padding:[28,28],maxZoom:14});
 const notes=[];
 if(missing.length)notes.push(`Giornata ${missing.join(", ")}: campo non indicato nel calendario.`);
 if(approx.length)notes.push(`Giornata ${approx.join(", ")}: posizione approssimativa, verifica con Google Maps.`);
 notes.push("I numeri sono le giornate. Il segnaposto verde è il campo di casa.");
 document.getElementById("mapNote").textContent=notes.join(" ");
}
const fk=n=>n.toFixed(1).replace(".",",");
function roadOf(from,to){if(from.y==null||to.y==null)return null;if(from.y===to.y&&from.x===to.x)return [0,0];return ROAD[`${from.y},${from.x};${to.y},${to.x}`]||null}
function tripStats(g,i){
 const v=D[g],t=v.t[i];
 const aw=v.m.filter(m=>m[3]===i&&m[2]!==-1).map(m=>({ht:v.t[m[2]],r:roadOf(t,v.t[m[2]])})).filter(x=>x.r);
 if(!aw.length)return null;
 const km=aw.reduce((a,x)=>a+x.r[0],0)/aw.length,mn=aw.reduce((a,x)=>a+x.r[1],0)/aw.length;
 const far=aw.reduce((a,x)=>x.r[0]>a.r[0]?x:a);
 return {n:aw.length,km,mn,far};
}
function clubKey(t){return t.n.replace(" (femm.)","")}
function stats(){
 const clubs=new Map();let teams=0;const bySq={A:0,B:0,C:0,D:0};
 Object.entries(D).forEach(([g,v])=>v.t.forEach(t=>{teams++;bySq[t.s]++;const k=clubKey(t);if(!clubs.has(k))clubs.set(k,[]);clubs.get(k).push({g,s:t.s})}));
 const groups={};clubs.forEach((arr,k)=>{(groups[arr.length]=groups[arr.length]||[]).push([k,arr.sort((a,b)=>a.s.localeCompare(b.s))])});
 const sizes=Object.keys(groups).map(Number).sort((a,b)=>b-a);
 const kp=`<div class="kpis"><div class="kpi"><b>${Object.keys(D).length}</b><span>Gironi</span></div><div class="kpi"><b>${teams}</b><span>Squadre</span><div class="mixrow">${["A","B","C","D"].filter(L=>bySq[L]).map(L=>`<span class="mc"><i class="dot s${L}">${L}</i>${bySq[L]}</span>`).join("")}</div></div><div class="kpi"><b>${clubs.size}</b><span>Società</span></div>${sizes.map(n=>`<div class="kpi"><b>${groups[n].length}</b><span>Società con ${n} squadr${n===1?"a":"e"}</span></div>`).join("")}</div>`;
 const lists=sizes.map(n=>`<section class="sgrp"><h4>${n} squadr${n===1?"a":"e"} <small>${groups[n].length} società</small></h4><ul class="clubs">${groups[n].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,arr])=>`<li${k===myClub()?' class="cbs"':""}><span class="cn">${esc(k)}</span></li>`).join("")}</ul></section>`).join("");
 document.getElementById("sBody").innerHTML=kp+lists+`<p class="mapnote" style="margin:0">Le squadre con lo stesso nome sono contate come una sola società. Torino FC femminile è inclusa in Torino FC; Juventus Women è contata a parte, come nel calendario.</p>`;
 stab(STAB);const sd=document.getElementById("sdlg");if(!sd.open){if(sd.showModal)sd.showModal();else sd.setAttribute("open","")}
}
document.getElementById("statsBtn").onclick=()=>{STAB="soc";stats();setHash()};
// Statistiche, tab Risultati: outcome mix of all played games + goals for/against per team.
let STAB="soc",SG="";
function stab(t){STAB=t;document.getElementById("sTabC").setAttribute("aria-selected",t==="soc");document.getElementById("sTabR").setAttribute("aria-selected",t==="res");
 document.getElementById("sBody").hidden=t!=="soc";document.getElementById("sRes").hidden=t!=="res";if(t==="res")drawRes();setTimeout(setHash,0)}
document.getElementById("sTabC").onclick=()=>stab("soc");document.getElementById("sTabR").onclick=()=>stab("res");
const pct=(a,b)=>b?Math.round(a*100/b)+"%":"";
function drawRes(){
 let tot=0,pl=0,big=0,one=0,dr=0,nil=0,gl=0;
 Object.entries(D).forEach(([g,v])=>v.m.forEach(m=>{if(m[2]===-1)return;tot++;const x=goals(liveOf(g,m[2],m[3]));if(!x)return;pl++;gl+=x[0]+x[1];
  const d=Math.abs(x[0]-x[1]);if(d>=2)big++;else if(d===1)one++;else{dr++;if(!x[0])nil++}}));
 const kp=`<div class="kpis"><div class="kpi"><b>${pl}<small>/${tot}</small></b><span>Partite giocate</span></div><div class="kpi"><b>${big}</b><span>Vittorie con 2+ gol di scarto</span></div><div class="kpi"><b>${one}</b><span>Vittorie di 1 gol</span></div><div class="kpi"><b>${dr}</b><span>Pareggi</span></div><div class="kpi"><b>${nil}</b><span>di cui 0-0</span></div><div class="kpi"><b>${pl?(gl/pl).toFixed(1).replace(".",","):"0"}</b><span>Gol per partita</span></div></div>`;
 const mix=[["Vittorie con 2+ gol di scarto",big],["Vittorie di 1 gol",one],["Pareggi con gol",dr-nil],["Pareggi 0-0",nil]],mx=Math.max(1,...mix.map(x=>x[1]));
 const mixc=`<section class="sgrp"><h4>Come finiscono le partite</h4><div class="hbars">${mix.map(([l,n])=>`<div class="hb" data-tip="${l}: ${n} partite${pl?" · "+pct(n,pl):""}"><span class="hl">${l}</span><span class="ht"><i style="width:${n/mx*100}%"></i></span><b>${n}<small>${pl?" "+pct(n,pl):""}</small></b></div>`).join("")}</div></section>`;
 const K=Object.keys(D);
 const rows=(SG?[SG]:K).flatMap(g=>standings(g).map(x=>({...x,gr:g}))).filter(x=>x.g||!pl).sort((a,b)=>(b.f-b.a)-(a.f-a.a)||b.f-a.f||a.t.n.localeCompare(b.t.n));
 const M=Math.max(1,...rows.map(x=>Math.max(x.f,x.a)));
 const sel=`<div class="seg gsel" id="rSel" role="group" aria-label="Girone"><button type="button" data-g="" aria-pressed="${!SG}">Tutti</button>${K.map(k=>`<button type="button" data-g="${k}" aria-pressed="${SG===k}">${k}</button>`).join("")}</div>`;
 const chart=`<section class="sgrp"><h4>Gol fatti e subiti per squadra <small>ordinate per differenza reti</small></h4>${sel}<div class="gleg"><span><i class="sw gf"></i>Gol fatti</span><span><i class="sw ga"></i>Gol subiti</span></div>${pl?"":`<p class="mapnote">Ancora nessun risultato: il grafico si riempie con le prime partite.</p>`}<div class="gfa">${rows.map(x=>{const d=x.f-x.a;return `<div class="gr${isFav(x.gr,x.i)?" fav":""}" data-g="${x.gr}" data-i="${x.i}" data-tip="${esc(x.t.n)} ${x.t.s} · Girone ${x.gr}: ${x.g} partite, ${x.f} fatti, ${x.a} subiti, differenza ${d>0?"+":""}${d}"><span class="gn2"><i class="dot s${x.t.s}">${x.t.s}</i><span>${esc(x.t.n)}</span>${SG?"":`<em>${x.gr}</em>`}</span><span class="ga2"><b>${x.a}</b><i style="width:${x.a/M*100}%"></i></span><span class="gf2"><i style="width:${x.f/M*100}%"></i><b>${x.f}</b></span><span class="gd ${d>0?"p":d<0?"n":""}">${d>0?"+":""}${d}</span></div>`}).join("")}</div></section>`;
 const R=document.getElementById("sRes");R.innerHTML=kp+mixc+chart;
 R.querySelectorAll("#rSel button").forEach(b=>b.onclick=()=>{SG=b.dataset.g;drawRes()});
 R.querySelectorAll(".gr").forEach(r=>r.onclick=()=>{document.getElementById("sdlg").close();open(r.dataset.g,+r.dataset.i)});
}
// One shared tooltip for chart rows (data-tip).
(()=>{const tip=document.getElementById("ctip");
 document.addEventListener("mousemove",e=>{const t=e.target.closest&&e.target.closest("[data-tip]");if(!t){tip.hidden=true;return}
  tip.textContent=t.dataset.tip;tip.hidden=false;const w=tip.offsetWidth;tip.style.left=Math.min(e.clientX+14,innerWidth-w-8)+"px";tip.style.top=(e.clientY+16)+"px"});})();
(()=>{const sd=document.getElementById("sdlg");document.getElementById("sX").onclick=()=>sd.close();sd.addEventListener("click",e=>{if(e.target===sd)sd.close()});})();

let AMAP=null,AMK={},AALL=[];
function resetAllMap(){if(!AMAP)return;AMAP.closePopup();AMAP.flyToBounds(AALL,{padding:[30,30],duration:.6});document.querySelectorAll("#alist li.on").forEach(x=>x.classList.remove("on"));const q=document.getElementById("mq");if(q.value){q.value="";q.dispatchEvent(new Event("input"))}}
function allVenues(){
 const V=new Map();
 Object.entries(D).forEach(([g,v])=>v.t.forEach(t=>{
  if(t.y==null)return;const k=`${t.y},${t.x}`;
  if(!V.has(k))V.set(k,{t,clubs:new Map()});
  const ck=clubKey(t),c=V.get(k).clubs;if(!c.has(ck))c.set(ck,[]);c.get(ck).push({g,s:t.s});
 }));
 return V;
}
function openAllMap(){
 const md=document.getElementById("mdlg");if(md.showModal)md.showModal();else md.setAttribute("open","");
 const V=allVenues();
 const clubs=new Map();
 V.forEach((vv,k)=>vv.clubs.forEach((arr,ck)=>{if(!clubs.has(ck))clubs.set(ck,{teams:[],venues:[]});const c=clubs.get(ck);c.teams.push(...arr);c.venues.push(k)}));
 Object.entries(D).forEach(([g,v])=>v.t.forEach(t=>{const ck=clubKey(t);if(t.y==null){if(!clubs.has(ck))clubs.set(ck,{teams:[],venues:[]});clubs.get(ck).teams.push({g,s:t.s})}}));
 document.getElementById("mS").textContent=`${clubs.size} società · ${V.size} campi`;
 requestAnimationFrame(()=>{
  if(!AMAP&&window.L){
   AMAP=L.map("amap",{minZoom:9,maxZoom:16,zoomSnap:.25,maxBounds:[[44.6,6.9],[45.45,8.2]]});
   tiles(AMAP);
   const pts=[];
   V.forEach((vv,k)=>{
    const t=vv.t,names=[...vv.clubs.keys()],isC=names.some(n=>n===myClub());
    const lines=[...vv.clubs.entries()].map(([n,arr])=>`<div class="r"><span>${esc(n)}</span>${arr.sort((a,b)=>a.s.localeCompare(b.s)).map(x=>`<i class="dot s${x.s}" title="Girone ${x.g}">${x.s}</i>`).join("")}<em>${[...new Set(arr.map(x=>x.g))].map(x=>"Gir. "+x).join(", ")}</em></div>`).join("");
    const html=`<div class="pp"><b>${esc(t.c)}</b><div style="color:var(--muted);font-size:12px;margin-bottom:4px">${esc(t.a)}${t.ap?" · posizione approssimativa":""}</div>${lines}<div style="margin-top:6px"><a href="${maps(t)}" target="_blank" rel="noopener">Apri in Google Maps ↗</a></div></div>`;
    const lab=isC?"★":(names.length>1?names.length:"");
    const mk=L.marker([t.y,t.x],{icon:L.divIcon({className:"",html:`<span class="cpin${isC?" cbs":""}">${lab}</span>`,iconSize:[0,0]}),zIndexOffset:isC?1000:0}).bindPopup(html).bindTooltip(names.map(esc).join(" · "),{direction:"top",offset:[0,-12]}).addTo(AMAP);
    AMK[k]=mk;pts.push([t.y,t.x]);
   });
   AMAP.fitBounds(pts,{padding:[30,30]});AALL=pts;
   const R=L.Control.extend({options:{position:"topleft"},onAdd(){const b=L.DomUtil.create("button","mreset");b.type="button";b.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Tutte';b.title="Mostra tutte le società";L.DomEvent.disableClickPropagation(b);b.onclick=resetAllMap;return b}});
   new R().addTo(AMAP);
  } else if(AMAP){AMAP.invalidateSize();AMAP.closePopup();AMAP.fitBounds(AALL,{padding:[30,30]});}
 });
 const L2=[...clubs.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 const ul=document.getElementById("alist");
 const render=q=>{q=(q||"").toLowerCase();ul.innerHTML="";L2.forEach(([n,c])=>{
  const town=[...new Set(c.venues.map(k=>{const t=V.get(k).t;return t.c.split(" · ").pop()}))].join(", ");
  if(q&&!(n.toLowerCase().includes(q)||town.toLowerCase().includes(q)))return;
  const li=document.createElement("li");if(n===myClub())li.className="cbs";
  const ts=[...c.teams].sort((a,b)=>a.s.localeCompare(b.s));
  li.innerHTML=`<span class="an">${esc(n)}</span><span class="ls">${ts.map(x=>`<i class="dot s${x.s}" title="Girone ${x.g}">${x.s}</i>`).join("")}</span><small>${town?esc(town)+" · ":""}${c.venues.length>1?c.venues.length+" campi":c.venues.length?"1 campo":"campo non indicato"}</small>`;
  li.onclick=()=>{if(!AMAP||!c.venues.length)return;ul.querySelectorAll("li.on").forEach(x=>x.classList.remove("on"));li.classList.add("on");
   if(c.venues.length===1){const mk=AMK[c.venues[0]];AMAP.flyTo(mk.getLatLng(),14,{duration:.6});mk.openPopup();}
   else{AMAP.flyToBounds(c.venues.map(k=>AMK[k].getLatLng()),{padding:[60,60],maxZoom:14,duration:.6});AMK[c.venues[0]].openPopup();}
   if(window.matchMedia("(max-width:760px)").matches)document.getElementById("amap").scrollIntoView({behavior:"smooth"});};
  ul.appendChild(li);});};
 render("");const q=document.getElementById("mq");q.value="";q.oninput=()=>render(q.value);
}
document.getElementById("mapBtn").onclick=()=>{openAllMap();setHash()};
(()=>{const md=document.getElementById("mdlg");document.getElementById("mX").onclick=()=>md.close();md.addEventListener("click",e=>{if(e.target===md)md.close()});})();

function getFav(){try{return localStorage.getItem(FAVK)}catch(e){return null}}
function isFav(g,i){return getFav()===`${g}|${i}`}
function setFav(v){try{v?localStorage.setItem(FAVK,v):localStorage.removeItem(FAVK)}catch(e){}}
function syncFav(){
 const f=getFav(),chip=document.getElementById("myChip");
 if(f){const [g,i]=f.split("|");const t=D[g]&&D[g].t[+i];if(t){chip.hidden=false;document.getElementById("myChipTxt").innerHTML=`La tua squadra: <b>${esc(t.n)}</b> · Girone ${g}`;chip.onclick=()=>open(g,+i);}else chip.hidden=true;}else chip.hidden=true;
 if(CUR){const on=isFav(CUR[0],CUR[1]),b=document.getElementById("favBtn");b.setAttribute("aria-pressed",on);document.getElementById("favTxt").textContent=on?"La tua squadra":"Segui questa squadra";}
}
document.getElementById("favBtn").onclick=()=>{if(!CUR)return;const k=`${CUR[0]}|${CUR[1]}`;setFav(getFav()===k?null:k);grid();syncFav();if(AMAP){AMAP.remove();AMAP=null;AMK={};}};

function tab(t){
 CTAB=t;setTimeout(setHash,0);
 [["cal","tCal","dlgL"],["grid","tGrid","gridWrap"],["map","tMap","mapWrap"]].forEach(([k,b,p])=>{document.getElementById(b).setAttribute("aria-selected",k===t);document.getElementById(p).hidden=k!==t});
 if(t==="map")requestAnimationFrame(drawMap);
 if(t==="grid")drawGrid();
}
const MESI=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
function drawGrid(){
 if(!CUR)return;const [g,i]=CUR,v=D[g];
 const ev={};
 v.m.filter(m=>m[2]===i||m[3]===i).forEach(m=>{
  const [n,dt]=m,[h,a]=ha(g,m),[dd,mm,yy]=dt.split("/").map(Number);
  if(h===-1){const k=`${mm}-${dd}`;ev[k]={rest:1,n};const d2=new Date(2000+yy,mm-1,dd+1);ev[`${d2.getMonth()+1}-${d2.getDate()}`]={rest:1,n};return;}
  const ht=v.t[h],{x,o}=dayOf(g,m);
  ev[`${x.getMonth()+1}-${x.getDate()}`]={n,home:h===i,opp:v.t[h===i?a:h],o,ht,r:resFor(g,m,i)};
 });
 const TRAIN=g==="I"&&v.t[i].n.startsWith("CBS")&&v.t[i].s==="B";
 const today=new Date();
 let html='<div class="months">';
 [9,10,11].forEach(mi=>{
  const first=new Date(2026,mi,1),days=new Date(2026,mi+1,0).getDate(),off=(first.getDay()+6)%7;
  html+=`<section class="month"><h4>${MESI[mi]} 2026</h4><div class="mgrid"><span class="wd">L</span><span class="wd">M</span><span class="wd">M</span><span class="wd">G</span><span class="wd">V</span><span class="wd we">S</span><span class="wd we">D</span>`;
  for(let k=0;k<off;k++)html+='<span class="day empty"></span>';
  for(let d=1;d<=days;d++){
   const e=ev[`${mi+1}-${d}`],dow=(off+d-1)%7,we=dow>=5?" we":"",td=(today.getFullYear()===2026&&today.getMonth()===mi&&today.getDate()===d)?" today":"";
   if(e&&!e.rest){
    html+=`<button type="button" class="day ev ${e.home?"home":"away"}${td}" title="Giornata ${e.n} · ${e.home?"Casa":"Trasferta"} vs ${esc(e.opp.n)} · ${esc(e.o)}" data-n="${e.n}"><span class="dn">${d}</span><span class="eg">${e.n}</span><span class="eo">${e.r?`<b class="res ${e.r[0]>e.r[1]?"w":e.r[0]<e.r[1]?"l":"d"}">${e.r[0]}-${e.r[1]}</b>`:esc(e.o)}</span><span class="eopp">${esc(e.opp.n)}</span></button>`;
   }else if(e&&e.rest){html+=`<span class="day rest${we}${td}" title="Giornata ${e.n} · Riposo"><span class="dn">${d}</span><span class="rs">Riposo</span></span>`;}
   else if(TRAIN&&[0,2,4].includes(dow))html+=`<span class="day train${we}${td}" title="Allenamento 17:30"><span class="dn">${d}</span><span class="tr">Allen.</span><span class="eo">17:30</span></span>`;
   else html+=`<span class="day${we}${td}"><span class="dn">${d}</span></span>`;
  }
  html+='</div></section>';
 });
 html+='</div><div class="glegend"><span>Tocca una partita per vederne i dettagli.</span><span><i class="gsw home"></i>Casa</span><span><i class="gsw away"></i>Trasferta</span><span><i class="gsw rest"></i>Riposo</span>'+(TRAIN?'<span><i class="gsw train"></i>Allenamento lun · mer · ven 17:30</span>':'')+'</div>';
 const w=document.getElementById("gridWrap");w.innerHTML=html;
 w.querySelectorAll(".day.ev").forEach(b=>b.onclick=()=>{tab("cal");const li=document.querySelectorAll("#dlgL > li")[+b.dataset.n-1];if(li){li.scrollIntoView({block:"center"});li.classList.add("flash");setTimeout(()=>li.classList.remove("flash"),1200)}});
}
document.getElementById("tCal").onclick=()=>tab("cal");
document.getElementById("tGrid").onclick=()=>tab("grid");
document.getElementById("tMap").onclick=()=>tab("map");

// Classifica + risultati per girone, from the scores in live.json.
let CG=null;
function standings(g){
 const v=D[g],T=v.t.map((t,i)=>({i,t,g:0,w:0,d:0,l:0,f:0,a:0,p:0}));
 v.m.forEach(m=>{if(m[2]===-1)return;const lv=liveOf(g,m[2],m[3]),gl=goals(lv);if(!gl)return;
  const H=T[lv.h],A=T[lv.a];H.g++;A.g++;H.f+=gl[0];H.a+=gl[1];A.f+=gl[1];A.a+=gl[0];
  if(gl[0]>gl[1]){H.w++;A.l++;H.p+=3}else if(gl[0]<gl[1]){A.w++;H.l++;A.p+=3}else{H.d++;A.d++;H.p++;A.p++}});
 return T.sort((x,y)=>y.p-x.p||(y.f-y.a)-(x.f-x.a)||y.f-x.f||x.t.n.localeCompare(y.t.n));
}
function tableHTML(g,T,me){
 return `<table class="ctab"><thead><tr><th>#</th><th class="tn">Squadra</th><th>Pt</th><th>G</th><th>V</th><th>N</th><th>P</th><th class="opt">GF</th><th class="opt">GS</th><th>DR</th></tr></thead><tbody>${T.map((x,k)=>`<tr data-i="${x.i}" class="${isFav(g,x.i)?"fav":""}${x.i===me?" me":""}"><td>${k+1}</td><td class="tn"><div>${x.t.l?`<img class="ologo" src="${x.t.l}" alt="" loading="lazy">`:""}<i class="dot s${x.t.s}">${x.t.s}</i><span>${esc(x.t.n)}</span></div></td><td class="pt">${x.p}</td><td>${x.g}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td class="opt">${x.f}</td><td class="opt">${x.a}</td><td>${x.f-x.a>0?"+":""}${x.f-x.a}</td></tr>`).join("")}</tbody></table>`;
}
function drawTable(g){
 CG=g;const v=D[g],T=standings(g);
 document.querySelectorAll("#cSel button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.g===g));
 const tbl=tableHTML(g,T);
 const byR={};v.m.forEach(m=>{(byR[m[0]]=byR[m[0]]||[]).push(m)});
 const rounds=Object.keys(byR).map(Number).sort((a,b)=>a-b).map(n=>{
  const ms=byR[n].filter(m=>m[2]!==-1),rest=byR[n].find(m=>m[2]===-1);
  return `<section class="rnd"><h4>${n}ª giornata · ${weekend(byR[n][0][1])}</h4>${ms.map(m=>{const [h,a]=ha(g,m),gl=goals(liveOf(g,h,a));const nm=t=>esc(t.n)+(t.s!=="A"?" "+t.s:"");return `<div class="mr"><span title="${nm(v.t[h])}">${nm(v.t[h])}</span>${gl?`<b>${gl[0]}-${gl[1]}</b>`:"<em>-</em>"}<span title="${nm(v.t[a])}">${nm(v.t[a])}</span></div>`}).join("")}${rest?`<div class="mr"><em style="grid-column:1/-1;text-align:left">Riposa ${esc(v.t[rest[3]].n)}</em></div>`:""}</section>`;
 }).join("");
 document.getElementById("cBody").innerHTML=`<div class="ccols"><div class="cres"><div class="rounds">${rounds}</div></div><div class="ctbl">${tbl}</div></div>`;
 document.querySelectorAll("#cBody tr[data-i]").forEach(r=>r.onclick=()=>{document.getElementById("cdlg").close();open(g,+r.dataset.i)});
}
function openTable(g){
 const f=getFav();g=g||CG||(f?f.split("|")[0]:"A");
 document.getElementById("cSel").innerHTML=Object.keys(D).map(k=>`<button type="button" data-g="${k}" aria-pressed="false">${k}</button>`).join("");
 document.querySelectorAll("#cSel button").forEach(b=>b.onclick=()=>{drawTable(b.dataset.g);setHash()});
 drawTable(g);
 const cd=document.getElementById("cdlg");if(!cd.open){if(cd.showModal)cd.showModal();else cd.setAttribute("open","")}
}
document.getElementById("tabBtn").onclick=()=>{openTable();setHash()};
(()=>{const cd=document.getElementById("cdlg");
 // Left/right arrows step through the gironi (wrapping).
 document.addEventListener("keydown",e=>{if((e.key!=="ArrowLeft"&&e.key!=="ArrowRight")||!cd.open)return;const K=Object.keys(D),k=K.indexOf(CG);if(k<0)return;e.preventDefault();
  const n=K[(k+(e.key==="ArrowRight"?1:-1)+K.length)%K.length];drawTable(n);setHash();const b=document.querySelector(`#cSel button[data-g="${n}"]`);if(b)b.focus()});
 document.getElementById("cX").onclick=()=>cd.close();cd.addEventListener("click",e=>{if(e.target===cd)cd.close()});})();

if(LIVE.updated){const u=new Date(LIVE.updated);document.getElementById("upd").textContent=`Dati aggiornati il ${u.getDate()}/${u.getMonth()+1} alle ${String(u.getHours()).padStart(2,"0")}:${String(u.getMinutes()).padStart(2,"0")}.`}

// Header: matches played / total across all gironi.
(()=>{let p=0,n=0;Object.entries(D).forEach(([g,v])=>v.m.forEach(m=>{if(m[2]===-1)return;n++;if(goals(liveOf(g,m[2],m[3])))p++}));document.getElementById("mPlayed").textContent=`${p}/${n}`})();

// Calendario: one tab per giornata, that round's matches grouped by girone.
let GN=null;
function curRound(){const t=new Date();t.setHours(0,0,0,0);const R=[...new Set(D.A.m.map(m=>m[0]))].sort((a,b)=>a-b);
 for(const n of R){const dt=D.A.m.find(m=>m[0]===n)[1],[d,mo,y]=dt.split("/").map(Number);if(new Date(2000+y,mo-1,d+1)>=t)return n}return R[R.length-1]}
function drawRound(n){
 GN=n;document.querySelectorAll("#gTabs button").forEach(b=>b.setAttribute("aria-selected",+b.dataset.n===n));
 // Letters sit next to the score: the home team carries its letter on the right.
 const nm=(g,i,r)=>{const t=D[g].t[i],dot=`<i class="dot s${t.s}">${t.s}</i>`;return `<span class="tk" data-g="${g}" data-i="${i}" title="${esc(t.n)} ${t.s}">${r?"":dot}<span class="tn2">${esc(t.n)}</span>${r?dot:""}</span>`};
 const secs=Object.entries(D).map(([g,v])=>{const ms=v.m.filter(m=>m[0]===n),rest=ms.find(m=>m[2]===-1);
  const rows=ms.filter(m=>m[2]!==-1).map(m=>({m,d:dayOf(g,m)})).sort((a,b)=>a.d.x-b.d.x||a.d.o.localeCompare(b.d.o,undefined,{numeric:true}));
  return `<section class="gsec"><h4>Girone ${g}</h4>${rows.map(({m,d})=>{const [h,a]=ha(g,m),gl=goals(liveOf(g,h,a));
   const w=`<span class="gw">${WD[d.x.getDay()]} <small>${esc(d.o)}</small></span>`;
   return `<div class="gm1">${w}${nm(g,h,1)}${gl?`<b>${gl[0]}-${gl[1]}</b>`:"<em>-</em>"}${nm(g,a)}</div>`}).join("")}${rest?`<div class="grest">Riposa ${esc(v.t[rest[3]].n)}</div>`:""}</section>`}).join("");
 document.getElementById("gWk").textContent=`${n}ª giornata · ${weekend(D.A.m.find(m=>m[0]===n)[1])}`;
 document.getElementById("gBody").innerHTML=`<div class="gsecs g3">${secs}</div>`;
 document.querySelectorAll("#gBody .tk").forEach(e=>e.onclick=()=>{document.getElementById("gdlg").close();open(e.dataset.g,+e.dataset.i)});
}
function openCal(n){
 const R=[...new Set(D.A.m.map(m=>m[0]))].sort((a,b)=>a-b);
 document.getElementById("gTabs").innerHTML=R.map(r=>`<button type="button" role="tab" data-n="${r}" aria-selected="false">${r}ª</button>`).join("");
 document.querySelectorAll("#gTabs button").forEach(b=>b.onclick=()=>{drawRound(+b.dataset.n);setHash()});
 drawRound(R.includes(n)?n:(GN||curRound()));
 const gd=document.getElementById("gdlg");if(!gd.open){if(gd.showModal)gd.showModal();else gd.setAttribute("open","")}
}
document.getElementById("calBtn").onclick=()=>{openCal();setHash()};
(()=>{const gd=document.getElementById("gdlg");document.getElementById("gX").onclick=()=>gd.close();gd.addEventListener("click",e=>{if(e.target===gd)gd.close()});
 document.addEventListener("keydown",e=>{if((e.key!=="ArrowLeft"&&e.key!=="ArrowRight")||!gd.open||GN==null)return;e.preventDefault();
  const R=[...document.querySelectorAll("#gTabs button")].map(b=>+b.dataset.n),k=R.indexOf(GN);drawRound(R[(k+(e.key==="ArrowRight"?1:-1)+R.length)%R.length]);setHash()});})();

// Release notes (data/releases.json, newest first). The footer badge shows the latest version.
if(REL.length)document.getElementById("verBtn").textContent=`v${REL[0].v} · Novità`;
function openNotes(){
 document.getElementById("vBody").innerHTML=REL.map(r=>`<section class="rel"><h4>Versione ${r.v}${r.date?` <small>${r.date}</small>`:""}</h4><ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></section>`).join("");
 const vd=document.getElementById("vdlg");if(!vd.open){if(vd.showModal)vd.showModal();else vd.setAttribute("open","")}
}
document.getElementById("verBtn").onclick=()=>{openNotes();setHash()};
(()=>{const vd=document.getElementById("vdlg");document.getElementById("vX").onclick=()=>vd.close();vd.addEventListener("click",e=>{if(e.target===vd)vd.close()});})();

// Reload in place: #squadra/I/3/map, #classifica/F, #mappa, #statistiche.
let CTAB="cal";
function setHash(){
 const on=id=>document.getElementById(id).open;
 const h=on("dlg")&&CUR?`#squadra/${CUR[0]}/${CUR[1]}/${CTAB}`:on("cdlg")?`#classifica/${CG}`:on("gdlg")?`#calendario/${GN}`:on("mdlg")?"#mappa":on("sdlg")?(STAB==="res"?"#statistiche/risultati":"#statistiche"):on("vdlg")?"#novita":"";
 if(location.hash!==h)history.replaceState(null,"",h||location.pathname+location.search);
}
["dlg","cdlg","mdlg","sdlg","vdlg","gdlg"].forEach(id=>document.getElementById(id).addEventListener("close",()=>setTimeout(setHash,0)));
(()=>{const p=decodeURIComponent(location.hash.slice(1)).split("/");
 if(p[0]==="squadra"&&D[p[1]]&&D[p[1]].t[+p[2]]){open(p[1],+p[2]);if(["cal","grid","map"].includes(p[3]))tab(p[3])}
 else if(p[0]==="classifica")openTable(D[p[1]]?p[1]:null);
 else if(p[0]==="calendario")openCal(+p[1]);else if(p[0]==="novita")openNotes();else if(p[0]==="mappa")openAllMap();else if(p[0]==="statistiche"){if(p[1]==="risultati")STAB="res";stats()}
})();

})();
