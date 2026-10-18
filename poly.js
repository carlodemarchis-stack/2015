// "Tutti contro tutti": a girone as a polygon. Teams sit on the vertices in standings order (1st at the top,
// clockwise), each drawn as a win/draw/loss pie sized by points. Every played match is a line split in half,
// each half coloured by the result for the team it starts from, thicker for bigger margins; matches still to
// play are dashed. Double round robins get two parallel lines per pair. Hover/tap a team to keep only its
// lines, hover a line for the score. Used by index.html (standings modal) and cbs.html (team detail).
//   polyChart(el, {teams: [{n, pts, me}], ms: [[i, j, gi, gj] | [i, j]]})   i, j = indexes into teams
(function () {
  const C = { w: "#2f9a4f", d: "#d8b03a", l: "#c0453b" }, NS = "http://www.w3.org/2000/svg";
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e };
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function pie(g, x, y, r, rec) {
    const tot = rec.w + rec.d + rec.l;
    if (!tot) { g.append(el("circle", { cx: x, cy: y, r, fill: "var(--surface)", stroke: "var(--muted)", "stroke-width": 1.5, "stroke-dasharray": "2 2" })); return }
    let a0 = -Math.PI / 2;
    for (const k of ["w", "d", "l"]) {
      const v = rec[k]; if (!v) continue;
      const a1 = a0 + 2 * Math.PI * v / tot;
      if (v === tot) g.append(el("circle", { cx: x, cy: y, r, fill: C[k] }));
      else g.append(el("path", { d: `M${x},${y}L${x + r * Math.cos(a0)},${y + r * Math.sin(a0)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x + r * Math.cos(a1)},${y + r * Math.sin(a1)}Z`, fill: C[k], stroke: "var(--surface)", "stroke-width": 1 }));
      a0 = a1;
    }
  }
  // redraw on resize when a chart switches between the phone (rank numbers) and wide (names) layout
  const ro = new ResizeObserver(es => { for (const e of es) { const b = e.target; if (b.clientWidth && (b.clientWidth < 600) !== b._polyNarrow) window.polyChart(b, b._poly) } });
  window.polyChart = function (box, data) {
    // not laid out yet (e.g. inside a dialog that opens right after): draw on the next frames
    if (!box.clientWidth) { box._polyTry = (box._polyTry || 0) + 1; if (box._polyTry < 40) setTimeout(() => window.polyChart(box, data), 50); return }
    box._polyTry = 0;
    const T = data.teams, N = T.length, narrow = box.clientWidth < 600;
    box._poly = data; box._polyNarrow = narrow; ro.observe(box);
    const W = 760, H = narrow ? 660 : 620, cx = W / 2, cy = H / 2 - 2, R = narrow ? 280 : 230;
    const fs = Math.max(12, Math.round(11 * W / box.clientWidth));
    const hint = narrow ? "Tocca una squadra per vedere solo le sue partite." : "Passa sopra una squadra per vedere solo le sue partite, sopra una linea per il risultato.";
    box.innerHTML = `<div class="poly-leg"><span><i style="background:${C.w}"></i>vittoria</span><span><i style="background:${C.d}"></i>pareggio</span><span><i style="background:${C.l}"></i>sconfitta</span><span><i class="dash"></i>da giocare</span></div><div class="poly-wrap"><div class="poly-tip" hidden></div></div><p class="poly-info"></p>`;
    const wrap = box.querySelector(".poly-wrap"), tip = box.querySelector(".poly-tip"), info = box.querySelector(".poly-info");
    info.textContent = hint;
    const sv = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": "Partite del girone: ogni squadra è un vertice, ogni partita una linea" });
    wrap.prepend(sv);
    const P = T.map((t, i) => { const a = -Math.PI / 2 + 2 * Math.PI * i / N; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a } });
    const REC = T.map(() => ({ w: 0, d: 0, l: 0 }));
    for (const m of data.ms) if (m.length > 2) { const [i, j, x, y] = m; if (x > y) { REC[i].w++; REC[j].l++ } else if (x < y) { REC[i].l++; REC[j].w++ } else { REC[i].d++; REC[j].d++ } }
    const gL = el("g", {}), gN = el("g", {}); sv.append(gL, gN);
    const pairs = {}; for (const m of data.ms) { const k = Math.min(m[0], m[1]) + "-" + Math.max(m[0], m[1]); (pairs[k] = pairs[k] || []).push(m) }
    const lines = [];
    const showTip = (e, h) => { const r = wrap.getBoundingClientRect(); tip.innerHTML = h; tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 4) + "px"; tip.style.top = (e.clientY - r.top + 12) + "px" };
    for (const ms of Object.values(pairs)) {
      const played = ms.filter(m => m.length > 2), show = played.length ? played : [ms[0]];
      show.forEach((m, k) => {
        const A = P[m[0]], B = P[m[1]], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, off = show.length > 1 ? (k ? 2.2 : -2.2) : 0;
        const ox = -dy / len * off, oy = dx / len * off, a = { x: A.x + ox, y: A.y + oy }, b = { x: B.x + ox, y: B.y + oy }, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (m.length < 3) { const ln = el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "3 4", "stroke-opacity": .4 }); gL.append(ln); lines.push({ ln: [ln], t: [m[0], m[1]] }); return }
        const [x, y] = [m[2], m[3]], kA = x > y ? "w" : x < y ? "l" : "d", kB = x > y ? "l" : x < y ? "w" : "d", w = 1.6 + Math.min(Math.abs(x - y), 6) * .55;
        const l1 = el("line", { x1: a.x, y1: a.y, x2: mid.x, y2: mid.y, stroke: C[kA], "stroke-width": w, "stroke-linecap": "round", "stroke-opacity": .85 });
        const l2 = el("line", { x1: mid.x, y1: mid.y, x2: b.x, y2: b.y, stroke: C[kB], "stroke-width": w, "stroke-linecap": "round", "stroke-opacity": .85 });
        gL.append(l1, l2); lines.push({ ln: [l1, l2], t: [m[0], m[1]] });
        for (const l of [l1, l2]) { l.addEventListener("mousemove", e => showTip(e, `${esc(T[m[0]].n)} <b>${x}-${y}</b> ${esc(T[m[1]].n)}`)); l.addEventListener("mouseleave", () => tip.hidden = true) }
      });
    }
    let sel = null;
    const focus = i => {
      sel = i; for (const o of lines) { const on = i == null || o.t.includes(i); for (const x of o.ln) x.setAttribute("opacity", on ? 1 : .06) }
      info.textContent = i == null ? hint : `${i + 1}. ${T[i].n}: ${T[i].pts} ${T[i].pts === 1 ? "punto" : "punti"} · ${pl(REC[i].w, "vittoria", "vittorie")}, ${pl(REC[i].d, "pareggio", "pareggi")}, ${pl(REC[i].l, "sconfitta", "sconfitte")}`;
    };
    T.forEach((t, i) => {
      const p = P[i], r = 9 + Math.sqrt(t.pts) * 2.4, g = el("g", { class: "poly-team" });
      g.append(el("circle", { cx: p.x, cy: p.y, r: r + (t.me ? 4 : 2), fill: "var(--surface)", stroke: t.me ? "#e5484d" : "none", "stroke-width": t.me ? 2.5 : 0 }));
      pie(g, p.x, p.y, r, REC[i]);
      const lr = R + r + 10, c = Math.cos(p.a);
      const tx = el("text", { x: cx + lr * Math.cos(p.a), y: cy + lr * Math.sin(p.a), "text-anchor": narrow || Math.abs(c) < .25 ? "middle" : c > 0 ? "start" : "end", "dominant-baseline": "central", "font-size": fs, fill: "var(--fg)", "font-weight": t.me ? 700 : 400 });
      tx.textContent = narrow ? `${i + 1}` : `${i + 1}. ${t.n} · ${t.pts}`;
      g.append(tx);
      g.addEventListener("mouseenter", () => focus(i));
      g.addEventListener("mouseleave", () => focus(null));
      g.addEventListener("click", () => focus(sel === i ? null : i));
      gN.append(g);
    });
    // long names on the sides: shrink the labels until none leaves the drawing
    const texts = [...sv.querySelectorAll("text")];
    for (let f = fs; f > 9 && texts.some(t => { const b = t.getBBox(); return b.x < 2 || b.x + b.width > W - 2 }); ) { f--; for (const t of texts) t.setAttribute("font-size", f) }
  };
})();
