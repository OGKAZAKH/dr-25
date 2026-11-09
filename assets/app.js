(() => {
  'use strict';

  const DATA = window.INVITE;
  const PARTY = DATA.party;
  const GUEST = DATA.guest; // null on the generic page
  const ROOT = DATA.root;
  const START = new Date(PARTY.start);
  const END = new Date(PARTY.end);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCRAMBLE_CHARS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%&';

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const fmt = (opts) => new Intl.DateTimeFormat('ru-RU', { timeZone: PARTY.tz, ...opts }).format(START);

  const WHEN = {
    weekday: fmt({ weekday: 'long' }),
    weekdayShort: fmt({ weekday: 'short' }).toUpperCase(),
    day: fmt({ day: 'numeric', month: 'long' }),
    dayShort: fmt({ day: '2-digit', month: '2-digit' }),
    time: fmt({ hour: '2-digit', minute: '2-digit' }),
  };

  const photoUrl = (g) => (g && g.photo ? `${ROOT}p/${g.slug}.jpg` : null);
  const initial = (g) => (g ? g.name.slice(0, 1).toUpperCase() : '★');

  /* ---------------- templates ---------------- */

  function gateHtml() {
    const name = GUEST ? GUEST.name : 'Гость';
    return `
      <section class="gate" id="gate">
        <p class="mono gate-kicker">Личное приглашение · № ${esc(DATA.no)}</p>
        <h1 class="gate-name" id="gate-name" aria-label="${esc(name)}">${esc(name)}</h1>
        <p class="gate-sub">на тебя оформлен пропуск</p>
        <button class="lanyard" id="open" type="button" aria-label="Открыть приглашение">
          <span class="strap"></span>
          <span class="badge-wrap">
            <span class="tap-ring"></span><span class="tap-ring r2"></span>
            <span class="badge"><b>ALL<br>ACCESS</b><i>${esc(PARTY.age)}</i></span>
            <span class="tap-finger" aria-hidden="true">👆</span>
          </span>
        </button>
        <button class="gate-hint" type="button" id="open-hint">Тапни по пропуску</button>
      </section>`;
  }

  function heroHtml() {
    const who = GUEST ? `${esc(GUEST.name)}, мне` : 'Мне';
    return `
      <header class="hero reveal">
        <p class="mono kicker">${esc(PARTY.host)} · Live · один вечер</p>
        <div class="age" aria-label="${esc(PARTY.age)}">${esc(PARTY.age)}</div>
        <p class="hero-line">${who} исполнилось ${esc(PARTY.age)}.<br>Отмечаем — и <em>без тебя никак.</em></p>
        <div class="when mono">
          <span class="chip">${esc(WHEN.weekdayShort)} · ${esc(WHEN.dayShort)}</span>
          <span class="chip">${esc(WHEN.time)}</span>
          <span class="chip">Лукашино</span>
        </div>
        <p class="mono scroll-cue"><span></span>листай вниз</p>
      </header>`;
  }

  function passHtml() {
    const g = GUEST || { name: 'Гость', full: 'Гость', title: 'Почётный гость', sub: '' };
    const src = photoUrl(GUEST);
    const photo = src
      ? `<img src="${src}" alt="${esc(g.full)}" style="object-position:${esc(g.pos || '50% 50%')}">`
      : `<span class="monogram">${esc(initial(GUEST))}</span>`;
    return `
      <section class="pass-wrap reveal">
        <article class="pass" id="pass">
          <div class="pass-head mono"><b>${esc(PARTY.host)} ${esc(PARTY.age)} · Live</b><span>${esc(WHEN.dayShort)}</span></div>
          <div class="pass-photo">${photo}<span class="aaa">ALL ACCESS</span><span class="pass-no">№${esc(DATA.no)}</span></div>
          <div class="pass-body">
            <div class="pass-name">${esc(g.full)}</div>
            <div class="pass-title">${esc(g.title)}</div>
            ${g.sub ? `<div class="pass-sub">${esc(g.sub)}</div>` : ''}
            <div class="pass-grid">
              <div><small>Дата</small><span>${esc(WHEN.weekday)}, ${esc(WHEN.day)}</span></div>
              <div><small>Начало</small><span>${esc(WHEN.time)}</span></div>
              <div class="wide"><small>Площадка</small><span>${esc(PARTY.place)}${PARTY.address ? ` · ${esc(PARTY.address)}` : ''}</span></div>
              <div class="wide"><small>Дресс-код</small><span>${esc(PARTY.dressCode)}</span></div>
            </div>
          </div>
          <div class="pass-foot"><canvas class="barcode" id="barcode"></canvas><span class="mono">Backstage<br>Bar · Stage</span></div>
          <div class="holo"></div>
        </article>
      </section>`;
  }

  function noteHtml() {
    if (!GUEST) return '';
    return `
      <section class="reveal">
        <p class="mono label">Лично тебе</p>
        <div class="note"><p>${esc(GUEST.note)}</p><p class="mono sign">— ${esc(PARTY.host)}</p></div>
      </section>`;
  }

  function countdownHtml() {
    return `
      <section class="reveal">
        <p class="mono label">До начала</p>
        <div id="count"></div>
      </section>`;
  }

  function setlistHtml() {
    const items = PARTY.plan.map(([n, t, d]) => `<li><span>${esc(n)}</span><b>${esc(t)}</b><p>${esc(d)}</p></li>`).join('');
    return `
      <section class="reveal">
        <p class="mono label">Сетлист вечера</p>
        <ol class="setlist">${items}</ol>
      </section>`;
  }

  function actHtml(g) {
    const isMe = GUEST && g.slug === GUEST.slug;
    const src = photoUrl(g);
    const pic = src ? `<img src="${src}" alt="" loading="lazy" style="object-position:${esc(g.pos || '50% 50%')}">` : esc(initial(g));
    return `
      <li class="act${isMe ? ' me' : ''}">
        <span class="act-pic">${pic}</span>
        <span><b>${esc(g.full)}${isMe ? '<span class="you">ЭТО ТЫ</span>' : ''}</b><small>${esc(g.title)}</small></span>
      </li>`;
  }

  function lineupHtml() {
    return `
      <section class="reveal">
        <p class="mono label">Лайнап</p>
        <div class="headliner${PARTY.hostPhoto ? ' has-photo' : ''}">
          ${PARTY.hostPhoto ? `<img src="${ROOT}p/host.jpg" alt="${esc(PARTY.host)}" style="object-position:${esc(PARTY.hostPos || '50% 50%')}">` : ''}
          <div class="headliner-text"><small class="mono">Хедлайнер · ${esc(PARTY.age)} лет</small><b>${esc(PARTY.host)}</b><span>Величайший художник по свету</span></div>
        </div>
        <p class="lineup-head">Величайшие люди <em>вечера</em></p>
        <p class="lineup-sub">${DATA.guests.length} имён. Ни одного случайного.</p>
        <ul class="lineup">${DATA.guests.map(actHtml).join('')}</ul>
      </section>`;
  }

  function actionsHtml() {
    return `
      <section class="reveal">
        <p class="mono label">Подтверди</p>
        <div class="actions">
          <a class="btn primary" id="rsvp" href="#">Я в деле 🤘</a>
          <div class="btn-row">
            <a class="btn" href="${esc(PARTY.mapUrl)}" target="_blank" rel="noopener">Маршрут</a>
            <a class="btn" id="cal" href="${ROOT}party.ics">В календарь</a>
          </div>
        </div>
      </section>
      <footer class="foot reveal"><b>${esc(WHEN.weekdayShort)} · ${esc(WHEN.dayShort)}</b><span class="mono">${esc(PARTY.place)} · ${esc(WHEN.time)}</span></footer>`;
  }

  function showHtml() {
    return `<main class="show" id="show" hidden>${[
      heroHtml(), passHtml(), noteHtml(), countdownHtml(), setlistHtml(), lineupHtml(), actionsHtml(),
    ].join('')}</main><div class="toast" id="toast" role="status"></div>`;
  }

  /* ---------------- stage lights ---------------- */

  function createStage(canvas) {
    const ctx = canvas.getContext('2d');
    const COLORS = [[255, 181, 71], [255, 61, 110], [79, 227, 255], [255, 240, 220], [167, 123, 255]];
    const BEAM_COUNT = 6;
    const beams = Array.from({ length: BEAM_COUNT }, (_, i) => ({
      x: (i + 0.5) / BEAM_COUNT,
      phase: i * 0.9,
      color: COLORS[i % COLORS.length],
      dir: i % 2 ? 1 : -1,
    }));
    const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, v: Math.random() * 0.02 + 0.005 }));
    const state = { w: 0, h: 0, level: 0.22, target: 0.22, strobe: 0 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      state.w = innerWidth;
      state.h = innerHeight;
      canvas.width = state.w * dpr;
      canvas.height = state.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBeam(b, t) {
      const { w, h, level } = state;
      const ox = b.x * w;
      const oy = -30;
      const angle = Math.sin(t * 0.45 + b.phase) * 0.55 * b.dir;
      const len = h * 1.4;
      const spread = 0.11;
      const [r, g, bl] = b.color;
      const a = 0.32 * level;
      const ex1 = ox + Math.sin(angle - spread) * len;
      const ex2 = ox + Math.sin(angle + spread) * len;
      const ey = oy + Math.cos(angle) * len;
      const grad = ctx.createLinearGradient(ox, oy, (ex1 + ex2) / 2, ey);
      grad.addColorStop(0, `rgba(${r},${g},${bl},${a})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${bl},${a * 0.25})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ox - 4, oy);
      ctx.lineTo(ex1, ey);
      ctx.lineTo(ex2, ey);
      ctx.lineTo(ox + 4, oy);
      ctx.fill();
    }

    function frame(ms) {
      const t = REDUCED ? 0 : ms / 1000;
      const { w, h } = state;
      state.level += (state.target - state.level) * 0.04;
      state.strobe *= 0.86;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      beams.forEach((b) => drawBeam(b, t));
      ctx.fillStyle = `rgba(255,235,210,${0.35 * state.level + 0.1})`;
      motes.forEach((m) => {
        m.y -= REDUCED ? 0 : m.v * 0.05;
        if (m.y < 0) m.y = 1;
        ctx.beginPath();
        ctx.arc(m.x * w + Math.sin(t + m.r * 9) * 6, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (state.strobe > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${state.strobe * 0.25})`;
        ctx.fillRect(0, 0, w, h);
      }
      requestAnimationFrame(frame);
    }

    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(frame);
    return {
      full() { state.target = 1; },
      strobe() { state.strobe = 1; },
    };
  }

  /* ---------------- interactions ---------------- */

  function scramble(el, text, duration = 1100) {
    if (REDUCED) { el.textContent = text; return; }
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const fixed = Math.floor(p * text.length);
      el.textContent = text.split('').map((ch, i) => {
        if (i < fixed || ch === ' ') return ch;
        return SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }).join('');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function hashCode(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  function drawBarcode(canvas, seed) {
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = 'rgba(244,239,231,.85)';
    let x = 0;
    let s = seed;
    while (x < w) {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
      const bar = 1 + (s % 3);
      const gap = 1 + ((s >>> 8) % 3);
      ctx.fillRect(x, 0, bar, h);
      x += bar + gap;
    }
  }

  function bindTilt(card) {
    const MAX = 12;
    let touching = false;
    const apply = (px, py) => {
      card.style.setProperty('--ry', `${(px - 0.5) * MAX}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * MAX}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    };
    card.addEventListener('pointermove', (e) => {
      touching = true;
      const r = card.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    card.addEventListener('pointerleave', () => { touching = false; apply(0.5, 0.5); });
    if (REDUCED) return;
    let t = 0;
    const idle = () => {
      if (!touching) apply(0.5 + Math.sin(t) * 0.3, 0.5 + Math.cos(t * 0.8) * 0.25);
      t += 0.012;
      requestAnimationFrame(idle);
    };
    requestAnimationFrame(idle);
  }

  function startCountdown(box) {
    const pad = (n) => String(n).padStart(2, '0');
    const render = () => {
      const now = Date.now();
      if (now >= END.getTime()) {
        box.innerHTML = '<p class="count-msg">Это было легендарно.</p>';
        return;
      }
      if (now >= START.getTime()) {
        box.innerHTML = '<p class="count-msg">Уже идёт. Ты где?!</p>';
        return;
      }
      const diff = Math.floor((START.getTime() - now) / 1000);
      const parts = [[Math.floor(diff / 86400), 'дн'], [Math.floor(diff / 3600) % 24, 'час'], [Math.floor(diff / 60) % 60, 'мин'], [diff % 60, 'сек']];
      box.innerHTML = `<div class="count">${parts.map(([v, l]) => `<div><b>${pad(v)}</b><small class="mono">${l}</small></div>`).join('')}</div>`;
    };
    render();
    setInterval(render, 1000);
  }

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('on'), 4200);
  }

  function flash() {
    const el = $('.flash');
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  }

  function bindRsvp(link, stage) {
    const who = GUEST ? GUEST.full : 'Я';
    if (PARTY.telegram) {
      const text = `${PARTY.host}, я в деле! ${who} будет в Лукашино 🤘`;
      link.href = `https://t.me/${encodeURIComponent(PARTY.telegram)}?text=${encodeURIComponent(text)}`;
      link.target = '_blank';
      link.rel = 'noopener';
    }
    link.addEventListener('click', (e) => {
      stage.strobe();
      flash();
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      if (!PARTY.telegram) {
        e.preventDefault();
        toast(`Засчитано! Кинь «я в деле» в беседу 🤘`);
      }
    });
  }

  const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document
    || /iPhone|iPad|iPod/.test(navigator.userAgent);

  function googleCalendarUrl() {
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${PARTY.host} ${PARTY.age} · Live`,
      dates: `${stamp(START)}/${stamp(END)}`,
      location: [PARTY.place, PARTY.address].filter(Boolean).join(', '),
      details: `Пропуск: ${location.href}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  // iOS opens a served text/calendar file as an "Add to Calendar" sheet;
  // everyone else gets a prefilled Google Calendar event.
  function bindCalendar(link) {
    if (IS_APPLE) return;
    link.href = googleCalendarUrl();
    link.target = '_blank';
    link.rel = 'noopener';
  }

  function revealOnScroll() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  }

  function openShow(stage) {
    flash();
    stage.full();
    stage.strobe();
    if (navigator.vibrate) navigator.vibrate([30, 50, 80]);
    $('#gate').classList.add('out');
    $('#show').hidden = false;
    document.body.classList.remove('is-gate');
    scrollTo(0, 0);
    drawBarcode($('#barcode'), hashCode(GUEST ? GUEST.slug : 'guest'));
    bindTilt($('#pass'));
    startCountdown($('#count'));
    bindRsvp($('#rsvp'), stage);
    bindCalendar($('#cal'));
    setTimeout(revealOnScroll, 250);
    setTimeout(() => $('#gate').remove(), 1000);
  }

  function init() {
    $('#app').innerHTML = gateHtml() + showHtml();
    const stage = createStage($('#stage'));
    const nameEl = $('#gate-name');
    scramble(nameEl, nameEl.textContent);
    let opened = false;
    const open = () => { if (opened) return; opened = true; openShow(stage); };
    $('#open').addEventListener('click', open);
    $('#open-hint').addEventListener('click', open);
  }

  init();
})();
