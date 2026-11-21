{
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;

  /* --- Marquee: duplicate track content for a seamless infinite loop --- */
  document.querySelectorAll('[data-marquee] .marquee__track').forEach(t => {
    t.innerHTML += t.innerHTML;
    [...t.children].slice(t.children.length / 2).forEach(c => c.setAttribute('aria-hidden', 'true'));
  });

  /* --- Credit-card composition: card warped to the Figma angle (homography) + icons orbiting their rings on scroll --- */
  const dash = document.querySelector('.dash');
  if (dash) {
    const card = dash.querySelector('.dp--card img');
    const SRC = [[.0661, .1725], [.9471, .0373], [.9696, .9301], [.0317, .8951]]; // card corners in the image (TL TR BR BL)
    const DST = [[.3005, .3720], [.6721, .3112], [.6749, .6999], [.2814, .6898]]; // where they sit in the Figma composition
    const solve = (A, b) => { // gaussian elimination
      const n = b.length; A = A.map((r, i) => [...r, b[i]]);
      for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k; [A[i], A[m]] = [A[m], A[i]];
        for (let k = i + 1; k < n; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j <= n; j++) A[k][j] -= f * A[i][j]; } }
      const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = A[i][n]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x;
    };
    const warp = () => {
      const W = dash.clientWidth, H = dash.clientHeight, iw = W, ih = W * 429 / 756;
      const A = [], b = [];
      for (let i = 0; i < 4; i++) {
        const [x, y] = [SRC[i][0] * iw, SRC[i][1] * ih], [u, v] = [DST[i][0] * W, DST[i][1] * H];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
      }
      const [a, bb, c, d, e, f, g, h] = solve(A, b);
      card.style.transform = `matrix3d(${a},${d},0,${g},${bb},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
    };
    new ResizeObserver(warp).observe(dash);
    const orbits = [...dash.querySelectorAll('.orbit')];
    // time-based loop: each icon travels a third of its ring (120°) and back, in opposite directions
    const PERIOD = 7000;
    const setPos = (o, deg) => {
      const a = deg * Math.PI / 180, R = +o.dataset.r;
      o.style.left = (344 + R * Math.cos(a)) / 732 * 100 + '%';
      o.style.top = (250 + R * Math.sin(a)) / 494 * 100 + '%';
    };
    const RUNS = 3; let t0 = null;
    const tick = t => {
      if (t0 === null) t0 = t;
      const el = t - t0;
      if (el >= RUNS * PERIOD) { place(); return; }           // 3 rounds, then rest at the start position
      const ph = (el % PERIOD) / PERIOD;                       // 0..1
      const e = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI);        // 0 → 1 → 0, eased
      orbits.forEach(o => setPos(o, +o.dataset.a + (+o.dataset.dir) * 120 * e));
      requestAnimationFrame(tick);
    };
    const place = () => orbits.forEach(o => setPos(o, +o.dataset.a));
    // everything in this composition plays 3 times, starting when it first comes into view
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { io.disconnect(); dash.classList.add('is-run'); requestAnimationFrame(tick); }
      }, { threshold: 0.35 });
      io.observe(dash);
    }
    place();
  }

  /* --- Mobile: hero button as wide as the heading's text column --- */
  const heroH1 = document.querySelector('.hero .h1'), heroCta = document.querySelector('.hero .cta');
  const fitCta = () => {
    if (!heroH1 || !heroCta) return;
    if (!matchMedia('(max-width: 900px)').matches) { heroCta.style.width = ''; return; }
    const r = document.createRange(); r.selectNodeContents(heroH1);
    const rs = [...r.getClientRects()];
    const w = Math.max(...rs.map(x => x.right)) - Math.min(...rs.map(x => x.left));
    heroCta.style.width = Math.max(250, Math.round(w * 0.9)) + 'px';
  };
  addEventListener('resize', fitCta); addEventListener('load', fitCta);
  if (document.fonts) document.fonts.ready.then(fitCta);

  /* --- Mobile: shrink every heading (except the hero) until it fits in 2 lines, not below 20px --- */
  const HEADS = '.h2,.wins__title,.approach__title,.method__intro h2,.step h3,.fit-card h3';
  const fitHeads = () => {
    const mobile = matchMedia('(max-width: 900px)').matches;
    document.querySelectorAll(HEADS).forEach(h => {
      h.style.fontSize = '';
      if (!mobile) return;
      let fs = parseFloat(getComputedStyle(h).fontSize);
      const lines = () => {
        const r = document.createRange(); r.selectNodeContents(h);
        const tops = new Set([...r.getClientRects()].map(x => Math.round(x.top)));
        return tops.size;
      };
      while (lines() > 2 && fs > 20) { fs -= 0.5; h.style.fontSize = fs + 'px'; }
      h.dataset.fit = lines();
    });
    fitCta();
  };
  addEventListener('resize', fitHeads); addEventListener('load', fitHeads);
  if (document.fonts) document.fonts.ready.then(fitHeads);

  /* --- Hero traffic light: starts dark, each lamp lights once in turn --- */
  const traffic = document.querySelector('.traffic');
  if (traffic) setTimeout(() => traffic.classList.add('is-on'), reduce ? 0 : 500);

  /* --- Dots grid that lights up around the cursor (hero, approach, method, FAQ) --- */
  const PALETTE = {
    hero:  { base: [150, 150, 150], hot: [40, 210, 30],  a0: 0.05, edge: 0.18, aHot: 0.75 },
    green: { base: [70, 200, 60],   hot: [20, 170, 10],  a0: 0.10, edge: 0,    aHot: 0.8 },
    gray:  { base: [170, 170, 170], hot: [150, 150, 150], a0: 0.10, edge: 0,   aHot: 0.6 },
    white: { base: [255, 255, 255], hot: [255, 255, 255], a0: 0.08, edge: 0.25, aHot: 0.85 }
  };
  document.querySelectorAll('canvas[data-dots]').forEach(cv => {
    if (!cv.getContext) return;
    const P = PALETTE[cv.dataset.dots] || PALETTE.hero;
    const ctx = cv.getContext('2d');
    const host = cv.parentElement;
    let W = 0, H = 0, dpr = 1, mx = -999, my = -999, tx = -999, ty = -999, raf = 0, zones = [];
    const GAP = 22, R = 150, FEATHER = 70, MIN = 0.2;
    // text areas: dots fade smoothly to 20% under them so they don't hurt readability
    const TEXT_SEL = '.hero__text,.approach__box,.method__intro,.step__text,.method__end,.faq__side,.faq__list';
    const measure = () => {
      const hr = host.getBoundingClientRect();
      zones = [...host.querySelectorAll(TEXT_SEL)].map(el => {
        const r = el.getBoundingClientRect();
        return [r.left - hr.left - 12, r.top - hr.top - 12, r.right - hr.left + 12, r.bottom - hr.top + 12];
      });
    };
    const dim = (x, y) => {
      let d = Infinity;
      for (const [l, t, r, b] of zones) {
        const dx = Math.max(l - x, 0, x - r), dy = Math.max(t - y, 0, y - b);
        d = Math.min(d, Math.hypot(dx, dy));
      }
      if (d >= FEATHER) return 1;
      const s = d / FEATHER, e = s * s * (3 - 2 * s); // smoothstep
      return MIN + (1 - MIN) * e;
    };
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (let y = GAP / 2; y < H; y += GAP) {
        for (let x = GAP / 2; x < W; x += GAP) {
          const d = Math.hypot(x - mx, y - my);
          const k = d < R ? 1 - d / R : 0;
          const edge = P.edge ? Math.max(0, 1 - Math.min(x, W - x) / (W * 0.28)) * P.edge : 0;
          const a = (P.a0 + edge + k * P.aHot) * dim(x, y);
          const c = k > 0 ? P.base.map((v, i) => Math.round(v + (P.hot[i] - v) * k)) : P.base;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
          ctx.beginPath(); ctx.arc(x, y, 1.2 + k * 2.2, 0, 6.283); ctx.fill();
        }
      }
    };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      measure();
      draw();
    };
    const loop = () => {
      const sp = canHover ? 0.18 : 0.04; mx += (tx - mx) * sp; my += (ty - my) * sp;
      draw();
      raf = (Math.abs(tx - mx) + Math.abs(ty - my) > 0.5) ? requestAnimationFrame(loop) : 0;
    };
    if (!reduce && canHover) {
      host.addEventListener('pointermove', e => {
        const r = host.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (mx < -900) { mx = tx; my = ty; }
        if (!raf) raf = requestAnimationFrame(loop);
      });
      host.addEventListener('pointerleave', () => { tx = ty = mx = my = -999; draw(); });
    } else if (!reduce) {
      // touch devices: while scrolling, a soft glow drifts to random spots in the visible part, away from text
      let last = 0;
      const free = (x, y) => zones.every(([l, t, r, b]) => x < l - 30 || x > r + 30 || y < t - 30 || y > b + 30);
      addEventListener('scroll', () => {
        const now = performance.now(); if (now - last < 1400) return;
        const r = host.getBoundingClientRect();
        const top = Math.max(0, -r.top), bot = Math.min(H, innerHeight - r.top);
        if (bot - top < 80) return;
        last = now;
        for (let i = 0; i < 25; i++) {
          const x = 20 + Math.random() * (W - 40), y = top + 20 + Math.random() * (bot - top - 40);
          if (free(x, y)) {
            if (mx < -900) { mx = x; my = y; }
            tx = x; ty = y; if (!raf) raf = requestAnimationFrame(loop); return;
          }
        }
      }, { passive: true });
    }
    new ResizeObserver(size).observe(host);
    addEventListener('load', size);
    if (document.fonts) document.fonts.ready.then(size);
  });

  /* --- Replays: add .is-on when in view, remove when it leaves (so it runs every time) --- */
  const replay = (el, target, threshold, rootMargin = '0px') => {
    if (!el) return;
    if (reduce || !('IntersectionObserver' in window)) { target.classList.add('is-on'); return; }
    new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= threshold - 0.01) target.classList.add('is-on');
      else if (e.intersectionRatio === 0) target.classList.remove('is-on');
    }, { threshold: [0, threshold], rootMargin }).observe(el);
  };
  // Marker on "זה יקרה." — all at once, once the box is fully inside the upper 70% of the screen
  replay(document.querySelector('.approach__box'), document.querySelector('.marker'), 1, '0px 0px -30% 0px');

  // Wins: colour reveal word by word, in reading order
  const wins = document.querySelector('.wins__body');
  if (wins) {
    let i = 0;
    wins.querySelectorAll('.wave').forEach(el => {
      el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w" style="--i:${i++}">${w}</span>`).join(' ');
    });
    replay(wins, wins, 0.6);
  }

  /* --- Method: lights start fully off; each time one scrolls into view it blinks 3 times and stays lit --- */
  const lightsEls = document.querySelectorAll('.light');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const l = e.target;
      if (e.isIntersecting) { l.classList.remove('is-lit', 'blink'); void l.offsetWidth; l.classList.add('blink'); }
      else { l.classList.remove('is-lit', 'blink'); }
    }), { threshold: 0.6 });
    lightsEls.forEach(l => {
      io.observe(l);
      l.querySelector('.light__glow').addEventListener('animationend', () => { l.classList.add('is-lit'); l.classList.remove('blink'); });
    });
  } else lightsEls.forEach(l => l.classList.add('is-lit'));

  /* --- Method: curved dotted path from the bottom of each light to the top of the next, drawn by scroll --- */
  const steps = document.querySelector('.steps');
  const svg = steps && steps.querySelector('.path');
  const NS = 'http://www.w3.org/2000/svg';
  let segs = [];
  const buildPath = () => {
    if (!svg) return;
    const box = steps.getBoundingClientRect();
    const lights = [...steps.querySelectorAll('.light')];
    const cols = ['#fe2727', '#ffa20b', '#0fb600'];
    svg.innerHTML = '<defs></defs>';
    const defs = svg.firstChild;
    segs = [];
    for (let i = 0; i < lights.length - 1; i++) {
      const a = lights[i].querySelector('.light__off').getBoundingClientRect();
      const b = lights[i + 1].querySelector('.light__off').getBoundingClientRect();
      const single = matchMedia('(max-width: 900px)').matches;           // phone: light above its text
      const stacked = Math.abs((b.left + b.width / 2) - (a.left + a.width / 2)) < 40;
      const from = single ? lights[i].closest('.step').getBoundingClientRect() : a; // on phone start below the step text
      const x1 = a.left + a.width / 2 - box.left, y1 = from.bottom - box.top + (single ? 10 : -6);
      const x2 = b.left + b.width / 2 - box.left, y2 = b.top - box.top + 6;
      let d;
      if (stacked) {           // stacked (mobile): gentle half-turn to the side
        const off = Math.min(90, (y2 - y1) * 0.6);
        const side = i % 2 === 0 ? -1 : 1;          // red→orange curves one way, orange→green the other
        d = `M${x1},${y1} C${x1 + side * off},${y1 + (y2 - y1) * 0.35} ${x2 + side * off},${y2 - (y2 - y1) * 0.35} ${x2},${y2}`;
      } else {                                  // zigzag (desktop): leave downward, swing across, arrive from above
        const dy = y2 - y1;
        d = `M${x1},${y1} C${x1},${y1 + dy * 0.95} ${x2},${y2 - dy * 0.95} ${x2},${y2}`;
      }
      const gid = 'pg' + i;
      defs.insertAdjacentHTML('beforeend', `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${cols[i]}"/><stop offset="1" stop-color="${cols[i + 1]}"/></linearGradient><mask id="pm${i}" maskUnits="userSpaceOnUse"><path class="pm" d="${d}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask>`);
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = `<path d="${d}" fill="none" stroke="#d6d6d6" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 11"/><path d="${d}" fill="none" stroke="url(#${gid})" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 11" mask="url(#pm${i})"/>`;
      svg.appendChild(g);
      const m = defs.querySelector(`#pm${i} .pm`);
      const len = m.getTotalLength();
      m.style.strokeDasharray = len; m.style.strokeDashoffset = len;
      segs.push({ m, len, top: y1 + box.top + scrollY, bottom: y2 + box.top + scrollY });
    }
    progress();
  };
  const progress = () => {
    const vh = innerHeight;
    segs.forEach(s => {
      // starts when the segment start passes 75% of the viewport, completes when its end reaches 55%
      const startY = s.top - scrollY, endY = s.bottom - scrollY;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.75 - startY) / Math.max(1, (endY - startY) + vh * 0.2)));
      s.m.style.strokeDashoffset = s.len * (1 - p);
    });
  };
  if (svg) {
    addEventListener('scroll', progress, { passive: true });
    new ResizeObserver(buildPath).observe(steps);
    addEventListener('load', buildPath);
  }

  /* --- FAQ: one open at a time, smooth open/close --- */
  const items = [...document.querySelectorAll('.faq details')];
  const anim = (d, open) => {
    const a = d.querySelector('.faq__a');
    if (reduce) { d.open = open; return; }
    if (d._anim) d._anim.cancel();
    if (open) d.open = true;
    const h = a.scrollHeight;
    d._anim = a.animate(
      [{ height: open ? '0px' : h + 'px', opacity: open ? 0 : 1 }, { height: open ? h + 'px' : '0px', opacity: open ? 1 : 0 }],
      { duration: 450, easing: 'cubic-bezier(.4,0,.2,1)' }
    );
    d._anim.onfinish = () => { if (!open) d.open = false; d._anim = null; };
    d.classList.toggle('is-open', open);
  };
  items.forEach(d => {
    d.classList.toggle('is-open', d.open);
    d.querySelector('summary').addEventListener('click', e => {
      e.preventDefault();
      const willOpen = !d.classList.contains('is-open');
      if (willOpen) items.forEach(o => { if (o !== d && o.classList.contains('is-open')) anim(o, false); });
      anim(d, willOpen);
    });
  });

  /* --- Contact form: sends leads by email via Web3Forms --- */
  const form = document.querySelector('.form');
  if (form) {
    const msg = form.querySelector('.form__msg');
    const btn = form.querySelector('button[type="submit"]');
    const params = new URLSearchParams(location.search);
    const source = ['utm_source', 'utm_medium', 'utm_campaign'].map(k => params.get(k)).filter(Boolean).join(' / ')
      || (document.referrer ? new URL(document.referrer).hostname : 'כניסה ישירה');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (btn.disabled) return;
      const name = form.elements.name, phone = form.elements.phone, ok = form.elements.privacy;
      const phoneOk = /^0\d{1,2}-?\d{7}$/.test(phone.value.replace(/[\s()]/g, ''));
      name.setAttribute('aria-invalid', !name.value.trim());
      phone.setAttribute('aria-invalid', !phoneOk);
      msg.className = 'form__msg';
      if (!name.value.trim()) { msg.textContent = 'נא למלא שם מלא'; msg.classList.add('err'); name.focus(); return; }
      if (!phoneOk) { msg.textContent = 'נא למלא מספר טלפון תקין'; msg.classList.add('err'); phone.focus(); return; }
      if (!ok.checked) { msg.textContent = 'נא לאשר את מדיניות הפרטיות'; msg.classList.add('err'); ok.focus(); return; }
      if (form.elements.botcheck.checked) return;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      msg.textContent = 'שולח...';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: 'f38f1627-8340-4dba-a991-b2c5162aa495',
            subject: `ליד חדש מהאתר: ${name.value.trim()}`,
            from_name: 'אתר אהרון פרקש',
            'שם מלא': name.value.trim(),
            'טלפון': phone.value.trim(),
            'מקור': source,
            'אישור מדיניות פרטיות': 'כן',
            botcheck: false
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || res.status);
        msg.textContent = 'תודה! הפרטים התקבלו ונחזור אליכם בהקדם.';
        msg.classList.add('ok');
        form.reset();
      } catch (err) {
        msg.textContent = 'משהו השתבש בשליחה. אפשר לנסות שוב או לכתוב לנו בוואטסאפ.';
        msg.classList.add('err');
      } finally {
        btn.disabled = false; btn.removeAttribute('aria-busy');
      }
    });
  }
}
