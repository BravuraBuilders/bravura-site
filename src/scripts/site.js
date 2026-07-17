/* Bravura Builders — front-end behaviors (progressive enhancement).
   Every block guards on element existence, so this one script is safe on every page. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- scroll reveals (blur-rise) ---- */
let io = null;
if (!reduceMotion && 'IntersectionObserver' in window) {
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
}
function bindReveals() {
  document.querySelectorAll('.rv:not(.in)').forEach((el) => {
    if (io) io.observe(el);
    else el.classList.add('in');
  });
}

/* ---- stat count-up, scrubbed by scroll position (starts at 0 on load) ---- */
const fmt = (n) => n.toLocaleString('en-US');
const statEls = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
function scrubCounters() {
  statEls.forEach((el) => {
    if (el.dataset.done === '1') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const vh = window.innerHeight || 800;
    const sy = window.scrollY || window.pageYOffset || 0;
    const targetScroll = r.top + sy - vh * 0.45;
    let p = sy / Math.max(targetScroll, 220);
    p = Math.max(0, Math.min(1, p));
    const eased = p * p * (3 - 2 * p);
    const target = parseInt(el.getAttribute('data-count'), 10);
    el.textContent = fmt(Math.round(target * eased));
    if (p >= 1) el.dataset.done = '1';
  });
}
if (statEls.length) {
  if (reduceMotion)
    statEls.forEach((el) => (el.textContent = fmt(parseInt(el.getAttribute('data-count'), 10))));
  else {
    window.addEventListener('scroll', scrubCounters, { passive: true });
    window.addEventListener('resize', scrubCounters, { passive: true });
    scrubCounters();
  }
}

/* ---- hero glow parallax (pointer only) ---- */
if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
  const hero = document.querySelector('.hero-dark');
  const g1 = document.querySelector('.glow.g1');
  const g2 = document.querySelector('.glow.g2');
  if (hero && g1 && g2) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      g1.style.translate = x * -34 + 'px ' + y * -22 + 'px';
      g2.style.translate = x * 26 + 'px ' + y * 18 + 'px';
    });
  }
}

/* ---- photo-group sliders ---- */
document.querySelectorAll('.card.group').forEach((card) => {
  const slides = card.querySelector('.slides');
  const imgs = slides.querySelectorAll('img');
  if (imgs.length < 2) return;

  const pill = document.createElement('div');
  pill.className = 'count-pill';
  pill.textContent = '1 / ' + imgs.length;
  card.appendChild(pill);

  const dots = document.createElement('div');
  dots.className = 'dots';
  for (let i = 0; i < imgs.length; i++) {
    const d = document.createElement('i');
    if (i === 0) d.className = 'on';
    dots.appendChild(d);
  }
  card.appendChild(dots);

  const prev = document.createElement('button');
  prev.className = 'snav prev';
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Previous photo');
  prev.innerHTML = '&lsaquo;';
  const next = document.createElement('button');
  next.className = 'snav next';
  next.type = 'button';
  next.setAttribute('aria-label', 'Next photo');
  next.innerHTML = '&rsaquo;';
  card.appendChild(prev);
  card.appendChild(next);

  const go = (dir) =>
    slides.scrollBy({ left: dir * slides.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  let t = null;
  slides.addEventListener(
    'scroll',
    () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        let idx = Math.round(slides.scrollLeft / slides.clientWidth);
        idx = Math.max(0, Math.min(imgs.length - 1, idx));
        pill.textContent = idx + 1 + ' / ' + imgs.length;
        dots.querySelectorAll('i').forEach((d, n) => (d.className = n === idx ? 'on' : ''));
      }, 90);
    },
    { passive: true },
  );
  slides.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  });
});

/* ---- project filters ---- */
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', 'true');
    const f = chip.getAttribute('data-filter');
    document.querySelectorAll('.proj-grid .card').forEach((card) => {
      const show = f === 'all' || card.getAttribute('data-cat') === f;
      card.classList.toggle('hidden', !show);
      if (show) card.classList.add('in');
    });
  });
});

/* ---- lightbox: click any portfolio image to enlarge ---- */
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('.lb-cap');
  const lbPrev = lb.querySelector('.lb-nav.prev');
  const lbNext = lb.querySelector('.lb-nav.next');
  const lbClose = lb.querySelector('.lb-close');
  let lbGroup = [];
  let lbIdx = 0;
  let lbReturnFocus = null;

  function lbShow() {
    const item = lbGroup[lbIdx];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbCap.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = item.title || '';
    lbCap.appendChild(b);
    lbCap.appendChild(
      document.createTextNode(
        lbGroup.length > 1 ? lbIdx + 1 + ' / ' + lbGroup.length : item.alt || '',
      ),
    );
    const single = lbGroup.length < 2;
    [lbPrev, lbNext].forEach((btn) =>
      single ? btn.setAttribute('disabled', '') : btn.removeAttribute('disabled'),
    );
  }
  function lbOpen(group, idx, focusEl) {
    lbGroup = group;
    lbIdx = idx;
    lbReturnFocus = focusEl || null;
    lbShow();
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function lbHide() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lbReturnFocus && lbReturnFocus.focus) lbReturnFocus.focus();
  }
  function lbStep(d) {
    lbIdx = (lbIdx + d + lbGroup.length) % lbGroup.length;
    lbShow();
  }
  lbClose.addEventListener('click', lbHide);
  lbPrev.addEventListener('click', () => lbStep(-1));
  lbNext.addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb) lbHide();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') {
      lbHide();
      return;
    }
    if (e.key === 'ArrowLeft' && lbGroup.length > 1) lbStep(-1);
    if (e.key === 'ArrowRight' && lbGroup.length > 1) lbStep(1);
    if (e.key === 'Tab') {
      const f = [lbClose, lbPrev, lbNext].filter((el) => !el.disabled);
      const first = f[0];
      const last = f[f.length - 1];
      if (f.indexOf(document.activeElement) === -1) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document
    .querySelectorAll(
      '.proj-grid .card, .render-grid .card, .model-grid .m, .pair-grid .card, .banner',
    )
    .forEach((box) => {
      box.classList.add('zoomable');
      const capB = box.querySelector('.cap b, figcaption');
      const title = capB ? capB.textContent : '';
      const imgs = Array.prototype.slice.call(box.querySelectorAll('img'));
      const group = imgs.map((im) => ({
        el: im,
        title,
        alt: im.alt,
        get src() {
          return im.currentSrc || im.src;
        },
      }));
      imgs.forEach((im, i) => im.addEventListener('click', () => lbOpen(group, i, im)));
    });
}

/* ---- contact form (Web3Forms; falls back to a clear notice until a key is set) ---- */
const inquiry = document.getElementById('inquiry');
if (inquiry) {
  inquiry.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('sent-msg');
    const keyField = inquiry.querySelector('input[name="access_key"]');
    const key = keyField ? keyField.value : '';
    const btn = inquiry.querySelector('button[type="submit"]');
    if (!key || key.indexOf('REPLACE') === 0) {
      msg.textContent =
        'This form isn’t connected yet. Call or email us and we’ll get right back to you.';
      msg.style.display = 'block';
      return;
    }
    btn.disabled = true;
    msg.style.display = 'block';
    msg.textContent = 'Sending…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(inquiry),
      });
      const data = await res.json();
      if (data.success) {
        inquiry.reset();
        msg.textContent = 'Thanks — we’ll call you back within one business day.';
      } else {
        msg.textContent = 'Something went wrong. Please call us at (470) 504-3420.';
      }
    } catch {
      msg.textContent = 'Something went wrong. Please call us at (470) 504-3420.';
    } finally {
      btn.disabled = false;
    }
  });
}

bindReveals();
