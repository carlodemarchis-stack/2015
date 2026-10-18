// Map pins shared by index.html (classifica modal) and cbs.html: labelled Leaflet pins whose labels never
// overlap. pinIcon(cls, html) makes the marker icon; declutter(map, [{mk, cbs}], avoid?) moves colliding labels
// off their point (leader line + dot) after every zoom. Needs Leaflet (L) loaded first.
// pin markup: label + a leader line/dot that declutter() shows when it moves the label off its point
var pinIcon=(cls,html)=>L.divIcon({className:"",iconSize:[0,0],html:`<div class="pw"><svg class="lead"><line x1="0" y1="0" x2="0" y2="0"/><circle r="3"/></svg><span class="pin${cls}">${html}</span></div>`});
// labels never overlap: CBS first, then top to bottom; each label takes the first free slot around its point
// (up/down in label-height steps, then sideways), inside the map and clear of the zoom buttons and of "avoid"
// (extra screen boxes, e.g. the overview)
function declutter(map,list,avoid){
 const sz=map.getSize(),mr=map.getContainer().getBoundingClientRect(),zc=map.zoomControl&&map.zoomControl.getContainer().getBoundingClientRect();
 const placed=(avoid||[]).concat(zc?[{x:zc.left-mr.left,y:zc.top-mr.top,w:zc.width,h:zc.height}]:[]);
 const out=r=>r.x<4||r.y<4||r.x+r.w>sz.x-4||r.y+r.h>sz.y-4;
 const hit=(r,strict)=>(strict&&out(r))||placed.some(q=>r.x<q.x+q.w+3&&q.x<r.x+r.w+3&&r.y<q.y+q.h+3&&q.y<r.y+r.h+3);
 const items=list.map(o=>{const el=o.mk.getElement();if(!el)return null;const sp=el.querySelector(".pin"),ln=el.querySelector(".lead line");
  sp.style.transform="";el.classList.remove("off");ln.setAttribute("x2",0);ln.setAttribute("y2",0);
  return {o,el,sp,ln,p:map.latLngToContainerPoint(o.mk.getLatLng()),w:sp.offsetWidth,h:sp.offsetHeight}}).filter(Boolean)
  .filter(it=>it.p.x>-20&&it.p.y>-20&&it.p.x<sz.x+20&&it.p.y<sz.y+20)  // fields off screen take no room
  .sort((a,b)=>(b.o.cbs-a.o.cbs)||(a.p.y-b.p.y));
 for(const it of items){
  const bx=it.o.cbs?it.p.x+10:it.p.x-it.w/2,by=it.o.cbs?it.p.y-it.h/2:it.p.y-it.h;let best=null;
  // first a free slot inside the map, else any free slot
  find:for(const strict of [true,false])for(let k=0;k<16;k++)for(const sy of k?[-1,1]:[1])for(const m of [0,-.6,.6,-1.2,1.2,-1.8,1.8]){
   const r={x:bx+Math.round(m*it.w),y:by+sy*k*(it.h+4),w:it.w,h:it.h};if(!hit(r,strict)){best=r;break find}}
  best=best||{x:bx,y:by,w:it.w,h:it.h};placed.push(best);
  const dx=best.x-bx,dy=best.y-by;if(!dx&&!dy)continue;
  it.sp.style.transform=it.o.cbs?`translate(${10+dx}px,calc(-50% + ${dy}px))`:`translate(calc(-50% + ${dx}px),calc(-100% + ${dy}px))`;
  it.el.classList.add("off");
  const cx=Math.max(best.x,Math.min(it.p.x,best.x+it.w)),cy=Math.max(best.y,Math.min(it.p.y,best.y+it.h));
  it.ln.setAttribute("x2",cx-it.p.x);it.ln.setAttribute("y2",cy-it.p.y)}
}
// "Tutti" button under the zoom buttons (same look as the main site's map): back to the starting view
function resetCtl(map,fn){const C=L.Control.extend({options:{position:"topleft"},onAdd(){const b=L.DomUtil.create("button","mreset");b.type="button";
 b.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Tutti';
 b.title="Torna a tutti i campi";L.DomEvent.disableClickPropagation(b);b.onclick=fn;return b}});new C().addTo(map)}
