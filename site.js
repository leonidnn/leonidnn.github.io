// Shared page logic. Each page defines STEPS_DATA, CL_DATA, SLOT_DATA, EV_DATA, MODES_DATA, PET_MEDIA and UI.
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const root = document.documentElement;
  const cssv = v => getComputedStyle(root).getPropertyValue(v).trim();

  try { localStorage.removeItem('theme'); } catch(e) {}
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { drawCL(); drawSlot(); });

  const links = $$('.nav a'), secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  function onScroll(){
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < 120) cur = s.id;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  const vio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.play().catch(()=>{}); else e.target.pause(); }), {threshold:.25});
  $$('video').forEach(v => vio.observe(v));

  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.cap', lb);
  const openLB = (src, cap) => { lbImg.src = src; lbCap.textContent = cap || ''; lb.classList.add('open'); };
  document.addEventListener('click', e => {
    const z = e.target.closest('img.zoom, .step-panel .media-row img');
    if (z) { const fc = z.closest('figure')?.querySelector('figcaption'); openLB(z.src, fc ? fc.textContent : z.alt); return; }
    const d = e.target.closest('.doc'); if (d) openLB(d.dataset.full, d.dataset.cap);
  });
  lb.addEventListener('click', () => lb.classList.remove('open'));
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('open'); });

  // grasp steps
  const stepsEl = $('#stepper .steps'), panel = $('#stepper .step-panel');
  if (stepsEl) STEPS_DATA.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab'); b.innerHTML = `<i>${String(i+1).padStart(2,'0')}</i>${esc(s[0])}`;
    b.addEventListener('click', () => showStep(i));
    stepsEl.appendChild(b);
  });
  function showStep(i){
    const s = STEPS_DATA[i], n = STEPS_DATA.length;
    $$('button', stepsEl).forEach((b, j) => b.setAttribute('aria-selected', i === j));
    panel.innerHTML = `<span class="tag">${UI.step(i+1, n)}</span><h4>${esc(s[0])}</h4><p>${s[1]}</p>` +
      (s[2].length ? `<div class="media-row">${s[2].map(f => `<img src="media/grasp/${f}" alt="${esc(s[0])}" loading="lazy" style="background:#fff">`).join('')}</div>` : '') +
      `<div class="step-nav"><button class="btn" ${i===0?'disabled':''} data-go="${i-1}">${UI.back}</button><button class="btn" ${i===n-1?'disabled':''} data-go="${i+1}">${UI.next}</button></div>`;
    $$('[data-go]', panel).forEach(b => b.addEventListener('click', () => showStep(+b.dataset.go)));
  }
  if (stepsEl) showStep(0);
  if (stepsEl) stepsEl.addEventListener('keydown', e => {
    const bs = $$('button', stepsEl), cur = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const d = ['ArrowDown','ArrowRight'].includes(e.key) ? 1 : ['ArrowUp','ArrowLeft'].includes(e.key) ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const k = Math.min(Math.max(cur + d, 0), bs.length - 1); showStep(k); bs[k].focus();
  });

  // continual-learning chart
  const tip = $('#tip'), COL = ['--c3', '--c1', '--c2'];
  let clSort = 'none';
  function drawCL(){
    const el = $('#clchart'); if (!el) return;
    const data = CL_DATA.slice();
    if (clSort === 'chips') data.sort((a, b) => b[1][0][0] - a[1][0][0]);
    if (clSort === 'old') data.sort((a, b) => (b[1][1][0] + b[1][2][0]) - (a[1][1][0] + a[1][2][0]));
    const narrow = el.clientWidth < 620;
    const W = narrow ? Math.max(300, el.clientWidth) : 960, L = narrow ? 0 : 230, R = 16, rowH = narrow ? 88 : 58, top = 24, H = top + rowH * data.length + 6;
    const x = v => L + (W - L - R) * v / 100, bh = narrow ? 13 : 11;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for (const g of [0, 25, 50, 75, 100]) s += `<line class="grid" x1="${x(g)}" x2="${x(g)}" y1="${top-6}" y2="${H}"/><text x="${x(g)}" y="${top-10}" text-anchor="middle">${g}%</text>`;
    data.forEach((d, i) => {
      const y0 = top + i * rowH + (narrow ? 24 : 6);
      s += narrow ? `<text class="lbl" x="0" y="${y0-7}">${esc(d[0])}</text>` : `<text class="lbl" x="${L-14}" y="${y0+bh*1.5+4}" text-anchor="end">${esc(d[0])}</text>`;
      d[1].forEach((v, j) => {
        const y = y0 + j * (bh + 3);
        s += `<rect x="${x(0)}" y="${y}" width="${x(v[0]) - x(0)}" height="${bh}" fill="${cssv(COL[j])}" data-t="${esc(d[0])} — ${UI.objs[j]}: ${v[0]}% [${v[1]}–${v[2]}]${j === 0 ? ' · ' + UI.toEighty + ': ' + d[2] + ' ' + UI.attempts : ''}"/>`;
        s += `<line x1="${x(v[1])}" x2="${x(v[2])}" y1="${y+bh/2}" y2="${y+bh/2}" stroke="${cssv('--ink')}" stroke-opacity=".5"/>`;
        s += `<text x="${x(v[0]) + 6}" y="${y+bh-1}" style="font-size:11px">${v[0]}</text>`;
      });
    });
    el.innerHTML = s + '</svg>';
    $$('rect[data-t]', el).forEach(r => {
      r.addEventListener('mousemove', e => { tip.textContent = r.dataset.t; tip.style.opacity = 1; tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY + 12) + 'px'; });
      r.addEventListener('mouseleave', () => tip.style.opacity = 0);
    });
  }
  $$('[data-sort]').forEach(b => b.addEventListener('click', () => {
    clSort = b.dataset.sort; $$('[data-sort]').forEach(x => x.setAttribute('aria-pressed', x === b)); drawCL();
  }));

  function drawSlot(){
    const el = $('#slotchart'); if (!el) return;
    const W = 500, L = 170, R = 44, H = 26 + SLOT_DATA.length * 40;
    const x = v => L + (W - L - R) * v / 100;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for (const g of [0, 50, 100]) s += `<line class="grid" x1="${x(g)}" x2="${x(g)}" y1="12" y2="${H}"/><text x="${x(g)}" y="9" text-anchor="middle">${g}%</text>`;
    SLOT_DATA.forEach((d, i) => {
      const y = 22 + i * 40;
      s += `<text class="lbl" x="${L-12}" y="${y+14}" text-anchor="end" style="font-size:12.5px">${esc(d[0])}</text>`;
      s += `<rect x="${x(0)}" y="${y}" width="${x(d[1]) - x(0)}" height="18" fill="${cssv(d[4])}"/>`;
      s += `<line x1="${x(d[2])}" x2="${x(d[3])}" y1="${y+9}" y2="${y+9}" stroke="${cssv('--ink')}" stroke-opacity=".5"/>`;
      s += `<text x="${Math.min(x(d[3]) + 6, W - 40)}" y="${y+14}" style="fill:${cssv('--ink')}">${d[1]}%</text>`;
    });
    el.innerHTML = s + '</svg>';
  }
  addEventListener('resize', drawCL, {passive:true});
  drawCL(); drawSlot();

  // contact events
  function showEv(i){
    $$('.ev').forEach((b, j) => b.setAttribute('aria-pressed', i === j));
    const e = EV_DATA[i];
    $('#evdetail').innerHTML = `<p><b>${UI.crit}:</b> ${e[2]}</p><p class="muted small" style="margin:0"><b>${UI.ex}:</b> ${e[3]}</p>`;
  }
  $$('.ev').forEach(b => b.addEventListener('click', () => showEv(+b.dataset.e)));
  if ($('#evdetail')) showEv(0);

  // pet modes
  const tabs = $('#modetabs'), mv = $('#modevideo'), mt = $('#modetext');
  if (tabs) MODES_DATA.forEach((m, i) => {
    const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.textContent = m[0];
    b.addEventListener('click', () => showMode(i)); tabs.appendChild(b);
  });
  function showMode(i){
    const m = MODES_DATA[i];
    $$('button', tabs).forEach((b, j) => b.setAttribute('aria-selected', i === j));
    mv.poster = PET_MEDIA + m[1] + '.jpg'; mv.src = PET_MEDIA + m[1] + '_loop.mp4'; mv.setAttribute('aria-label', m[0]);
    mv.play().catch(()=>{});
    mt.innerHTML = `<span class="tag">${m[2]}</span><h4 style="margin:6px 0 8px">${m[0]}</h4><p class="muted">${m[3]}</p>`;
  }
  if (tabs) showMode(0);
})();
