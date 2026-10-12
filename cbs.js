// CBS Scuola Calcio: one view per team (its own girone): standings with form boxes + giornate.
// 15 teams come from data/cbs.json (Sprint e Sport, read in the browser on request); the three
// Esordienti 2015 teams come from this site's own data (LND PDF + giocaacalcio/manual results).
(async()=>{
const get=u=>fetch(u,{cache:"no-cache"}).then(r=>r.json());
const [X,D,LIVE,SHORT]=await Promise.all([get("data/cbs.json"),get("data/teams_matches.json"),get("data/live.json").catch(()=>({m:{}})),get("data/short.json").catch(()=>({}))]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const WD=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"],MB=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const fmtD=d=>d?`${WD[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`:"";
const KEY="cbs_squadra",FAV="cbs_preferita";
// Favourite team: pinned first in the phone list, starred in the selector, opened by default.
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
  return {teams:v.t.map(t=>({n:t.n,sn:(SHORT[t.n.replace(" (femm.)","")]||t.n)+(t.n.includes("(femm.)")?" F":""),s:t.s})),cbs:T.i,ms};
 }
 const ms=T.m.map(([n,dt,h,a,sc,tav])=>{const [dd,tt]=dt.split(" "),[y,mo,da]=dd.split("-").map(Number),g=sc.match(/^(\d+)-(\d+)$/);
  return {n,d:new Date(y,mo-1,da),o:tt||"",h,a,sc:g?[+g[1],+g[2]]:null,nd:sc==="N.D.",tav:!!tav}});
 return {teams:T.t.map((n,i)=>({n,sn:n,s:T.s?T.s[i]||undefined:undefined})),cbs:T.cbs,ms};
}
function standings(M){
 const S=M.teams.map((t,i)=>({i,t,g:0,w:0,d:0,l:0,f:0,a:0,p:0}));
 M.ms.forEach(m=>{if(!m.sc)return;const H=S[m.h],A=S[m.a],[x,y]=m.sc;H.g++;A.g++;H.f+=x;H.a+=y;A.f+=y;A.a+=x;
  if(x>y){H.w++;A.l++;H.p+=3}else if(x<y){A.w++;H.l++;A.p+=3}else{H.d++;A.d++;H.p++;A.p++}});
 return S.sort((u,v)=>v.p-u.p||(v.f-v.a)-(u.f-u.a)||v.f-u.f||u.t.n.localeCompare(v.t.n));
}
const dot=t=>t.s?`<i class="dot s${t.s}">${t.s}</i>`:"";
const winCls=sc=>sc?(sc[0]>sc[1]?" wh":sc[0]<sc[1]?" wa":""):"";
const scHTML=m=>m.sc?`<b class="sc"><i>${m.sc[0]}</i>-<i>${m.sc[1]}</i></b>${m.tav?'<small class="tav" title="Risultato a tavolino">tav</small>':""}`:m.nd?'<em title="Non disputata">N.D.</em>':"<em>-</em>";

function formHTML(M,i,max){
 let list=M.ms.filter(m=>m.h===i||m.a===i).sort((a,b)=>a.n-b.n);
 if(max&&list.length>max){const k=list.findIndex(m=>!m.sc&&!m.nd);const end=k<0?list.length:k;list=list.slice(Math.max(0,end-max+2),Math.max(0,end-max+2)+max)}
 return `<span class="frm">${list.map(m=>{const home=m.h===i,opp=M.teams[home?m.a:m.h],r=m.sc?(home?m.sc:[m.sc[1],m.sc[0]]):null;
  const k=r?(r[0]>r[1]?"w":r[0]<r[1]?"l":"d"):"u",lab={w:"Vittoria",d:"Pareggio",l:"Sconfitta",u:m.nd?"Non disputata":"Da giocare"}[k];
  const tip=`<b>${m.n}ª giornata</b> · ${fmtD(m.d)}${m.o?" "+esc(m.o):""}<br>${home?"Casa":"Trasferta"} vs ${dot(opp)} ${esc(opp.n)}<br><span class="tt ${k}">${lab}${r?` ${r[0]}-${r[1]}`:""}</span>`;
  return `<i class="fb ${k}" data-tiph="${esc(tip)}"></i>`}).join("")}</span>`;
}
// big gironi (Promozione, Under 19-15): every match box; phone portrait moves them to a second row
function tableHTML(M,big){
 const S=standings(M);
 return `<table class="ctab${big?" full":""}"><thead><tr><th>#</th><th class="tn">Squadra</th><th>Pt</th><th>G</th><th>V</th><th>N</th><th>P</th><th class="opt">GF</th><th class="opt">GS</th><th>DR</th></tr></thead><tbody>${S.map((x,k)=>`<tr class="${x.i===M.cbs?"me":""}"><td>${k+1}</td><td class="tn"><div>${dot(x.t)}<span>${esc(x.t.n)}</span>${formHTML(M,x.i,0)}</div></td><td class="pt">${x.p}</td><td>${x.g}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td class="opt">${x.f}</td><td class="opt">${x.a}</td><td>${x.f-x.a>0?"+":""}${x.f-x.a}</td></tr>${big?`<tr class="frow${x.i===M.cbs?" me":""}"><td></td><td colspan="9">${formHTML(M,x.i,0)}</td></tr>`:""}`).join("")}</tbody></table>`;
}
function roundHTML(M,n){
 const ms=M.ms.filter(m=>m.n===n).sort((a,b)=>a.d-b.d||a.o.localeCompare(b.o,undefined,{numeric:true}));
 const playing=new Set(ms.flatMap(m=>[m.h,m.a])),rest=M.teams.map((t,i)=>i).filter(i=>!playing.has(i));
 const d0=ms[0]&&ms[0].d,nm=(t,r)=>`<span class="rt" title="${esc(t.n)}${t.s?" "+t.s:""}">${r?"":dot(t)}<span class="tn2"><span class="fn">${esc(t.n)}</span><span class="sn">${esc(t.sn)}</span></span>${r?dot(t):""}</span>`;
 return `<section class="rnd"><h4>${n}ª giornata${d0?" · "+d0.getDate()+" "+MB[d0.getMonth()]:""}</h4>${ms.map(m=>`<div class="mr${winCls(m.sc)}${m.h===M.cbs||m.a===M.cbs?" cb":""}" data-tip="${fmtD(m.d)} ${esc(m.o)} · ${esc(M.teams[m.h].n)} - ${esc(M.teams[m.a].n)}">${nm(M.teams[m.h])}${scHTML(m)}${nm(M.teams[m.a],1)}</div>`).join("")}${rest.length&&rest.length<M.teams.length?`<div class="mr"><em style="grid-column:1/-1;text-align:left">Riposa ${rest.map(i=>esc(M.teams[i].n)).join(", ")}</em></div>`:""}</section>`;
}
let CUR=null,RN=null;
// Phone portrait: first screen is a list of the 18 teams (position, last and next match); tap = detail.
let FROMLIST=false;
const MOB=matchMedia("(max-width:600px) and (orientation:portrait)");
function summary(T){
 const M=model(T),S=standings(M),k=S.findIndex(x=>x.i===M.cbs),me=S[k];
 const mine=M.ms.filter(m=>m.h===M.cbs||m.a===M.cbs).sort((a,b)=>a.d-b.d||a.n-b.n);
 const last=[...mine].reverse().find(m=>m.sc),next=mine.find(m=>!m.sc&&!m.nd&&m!==last&&(!last||m.d>=last.d));
 const side=m=>{const home=m.h===M.cbs;return {home,opp:M.teams[home?m.a:m.h],r:m.sc?(home?m.sc:[m.sc[1],m.sc[0]]):null}};
 return {pos:me.g?k+1:null,n:S.length,p:me.p,g:me.g,last:last&&{...side(last),m:last},next:next&&{...side(next),m:next}};
}
function showList(){
 document.body.classList.add("mlist");CUR=null;
 if(location.hash)history.replaceState(null,"",location.pathname+location.search);
 const L=document.getElementById("xlist");L.hidden=false;
 const grp=[...new Set(X.teams.map(t=>t.grp))];
 const fav=getFav(),card=T=>{const s=summary(T);
  const res=s.last?(s.last.r[0]>s.last.r[1]?"w":s.last.r[0]<s.last.r[1]?"l":"d"):"";
  return `<button type="button" class="xi${T.k===fav?" fav":""}" data-k="${T.k}">
   <span class="xt"><b>${T.k===fav?`<i class="xstar">${STAR}</i>`:""}${esc(T.lab)}</b><small>${esc(T.camp)} · Gir. ${esc(T.gir)}</small></span>
   <span class="xp">${s.pos?`<b>${s.pos}°</b><small>${s.p} pt</small>`:`<b>-</b><small>0 pt</small>`}</span>
   <span class="xm"><em>Ultima</em>${s.last?`<i class="res ${res}">${s.last.r[0]}-${s.last.r[1]}</i> ${s.last.home?"vs":"@"} ${esc(s.last.opp.sn||s.last.opp.n)}`:"<span class=nx>non ancora giocata</span>"}</span>
   <span class="xm"><em>Prossima</em>${s.next?`${fmtD(s.next.m.d)} ${esc(s.next.m.o)} · ${s.next.home?"vs":"@"} ${esc(s.next.opp.sn||s.next.opp.n)}`:"<span class=nx>-</span>"}</span>
  </button>`};
 const F=X.teams.find(t=>t.k===fav);
 L.innerHTML=(F?`<h3>La tua squadra</h3>${card(F)}`:"")+grp.map(g=>`<h3>${esc(g)}</h3>${X.teams.filter(t=>t.grp===g).map(card).join("")}`).join("");
 // push a history entry so the phone's back gesture returns to this list
 L.querySelectorAll(".xi").forEach(b=>b.onclick=()=>{FROMLIST=true;history.pushState(null,"","#"+b.dataset.k);show(b.dataset.k);scrollTo(0,0)});
 document.getElementById("xsrc").textContent=`Dati aggiornati il ${(([d,t])=>d.split("-").reverse().slice(0,2).join("/")+" alle "+t)(X.updated.split("T"))}. Giorno e orario sono indicativi: verifica sempre con la società.`;
}
function curRound(M){const R=[...new Set(M.ms.map(m=>m.n))].sort((a,b)=>a-b),t=new Date();t.setHours(0,0,0,0);
 for(const n of R){const ds=M.ms.filter(m=>m.n===n).map(m=>m.d);if(Math.max(...ds)>=t-864e5)return n}return R[R.length-1]}
function show(k,n){
 document.body.classList.remove("mlist");document.getElementById("xlist").hidden=true;
 const T=X.teams.find(t=>t.k===k)||X.teams[0];CUR=T.k;try{localStorage.setItem(KEY,T.k)}catch(e){}
 const M=model(T),R=[...new Set(M.ms.map(m=>m.n))].sort((a,b)=>a-b),big=R.length>10;
 document.querySelectorAll("#xsel button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===T.k));
 const pl=M.ms.filter(m=>m.sc).length;
 // phone portrait: the title is a dropdown with every team plus "Tutte le squadre" (back to the list)
 const opts=`<option value="">Tutte le squadre</option>${[...new Set(X.teams.map(t=>t.grp))].map(g=>`<optgroup label="${esc(g)}">${X.teams.filter(t=>t.grp===g).map(t=>`<option value="${t.k}"${t.k===T.k?" selected":""}>${esc(t.lab)}</option>`).join("")}</optgroup>`).join("")}`;
 document.getElementById("xhead").innerHTML=`<label class="xcombo"><span class="vh">Squadra</span><select id="xpick">${opts}</select></label><h2>${esc(T.lab)}</h2><button type="button" class="favbtn xfav" id="xfav" aria-pressed="${getFav()===T.k}">${STAR}<span>${getFav()===T.k?"La tua squadra":"Segui questa squadra"}</span></button><p>${esc(T.camp)} · Girone ${esc(T.gir)} · ${M.teams.length} squadre · Partite giocate <b>${pl}/${M.ms.length}</b></p>`;
 document.getElementById("xfav").onclick=()=>{setFav(getFav()===T.k?null:T.k);show(T.k,RN);paintSel()};
 document.getElementById("xpick").onchange=e=>{const v=e.target.value;if(!v){if(FROMLIST){FROMLIST=false;history.back()}else showList()}else show(v);scrollTo(0,0)};
 document.getElementById("xtbl").innerHTML=tableHTML(M,big);document.querySelector(".xcols").classList.toggle("full",big);
 const res=document.getElementById("xres");
 if(big){RN=R.includes(n)?n:curRound(M);
  res.innerHTML=`<div class="seg gsel xr" role="group" aria-label="Giornata">${R.map(r=>`<button type="button" data-n="${r}" aria-pressed="${r===RN}">${r}</button>`).join("")}</div>${roundHTML(M,RN)}`;
  res.querySelectorAll(".xr button").forEach(b=>b.onclick=()=>show(CUR,+b.dataset.n));
  res.classList.add("one");
 }else{RN=null;res.classList.remove("one");res.innerHTML=`<div class="rounds">${R.map(r=>roundHTML(M,r)).join("")}</div>`}
 const h=`#${T.k}${RN?"/"+RN:""}`;if(location.hash!==h)history.replaceState(null,"",h);
 document.getElementById("xsrc").textContent=T.src==="2015"
  ?"Fonte: calendario ufficiale FIGC LND. Giorno e orario sono indicativi: verifica sempre con la società."
  :`Dati aggiornati il ${(([d,t])=>d.split("-").reverse().slice(0,2).join("/")+" alle "+t)(X.updated.split("T"))}. Giorno e orario sono indicativi: verifica sempre con la società.`;
}
addEventListener("popstate",()=>{const k=location.hash.slice(1).split("/")[0];if(MOB.matches&&!X.teams.some(t=>t.k===k)){FROMLIST=false;showList()}else if(X.teams.some(t=>t.k===k))show(k)});
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
if(MOB.matches&&!X.teams.some(t=>t.k===k0))showList();
else{if(!X.teams.some(t=>t.k===k0)){k0=getFav();if(!k0){try{k0=localStorage.getItem(KEY)}catch(e){k0=null}}}show(k0||"e15b",+p[1]||null)}
})();
