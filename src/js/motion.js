/* Gibanje na prvi strani: pojavljanje ob drsenju, tekoči trak, paralaksa, nagib kartic, plavajoči gumb */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s) };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)) };

  /* --- napredek branja --- */
  var hd = $('.st-hd'), bar = null;
  if (hd) { bar = document.createElement('div'); bar.className = 'st-progress'; hd.appendChild(bar) }

  /* --- radio ekvalizator --- */
  var pill = $('.st-radio-pill'), dot = $('.st-radio-dot');
  if (pill && dot) { var eq = document.createElement('span'); eq.className = 'st-eq'; eq.setAttribute('aria-hidden', 'true'); eq.innerHTML = '<i></i><i></i><i></i><i></i>'; dot.parentNode.insertBefore(eq, dot.nextSibling) }

  /* --- pojavljanje ob drsenju --- */
  var groups = [
    ['.st-intro-logo, .st-intro-h, .st-intro-p, .st-intro-btns, .st-wall-row', .12],
    ['.st-sv-head, .st-sv-item', .1],
    ['.st-pt-k, .st-pt-list li', .04],
    ['.st-qt', .1],
    ['.st-cta-h, .st-cta-side', .15],
    ['.st-kicker, .st-hero-p', 0],
    ['.st-art-card', .15],
    ['.st-vid-head, .st-vg-item', .12],
    ['.st-dos-head, .st-shop-item', .1],
    ['.st-bp-col, .st-tm-row', .08],
    ['.st-footer-wrap > *', .08]
  ];
  var targets = [];
  if (!reduce) {
    groups.forEach(function (gr) {
      var els = $$(gr[0]), rowTop = null, i = 0;
      els.forEach(function (el) {
        if (el.closest('.st-np, .st-menu')) return;
        var top = el.getBoundingClientRect().top;
        if (rowTop === null || Math.abs(top - rowTop) > 40) { rowTop = top; i = 0 }
        el.classList.add('st-rv'); el.style.setProperty('--d', (i++ * gr[1]).toFixed(2) + 's'); targets.push(el);
      });
    });
    var h = $('.st-hero-h'); if (h) { h.classList.add('st-rv'); targets.push(h) }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var el = e.target; el.classList.add('st-in'); io.unobserve(el); setTimeout(function () { el.classList.add('st-done') }, 1700 + (parseFloat(el.style.getPropertyValue('--d')) || 0) * 1000) } }) }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });
      targets.forEach(function (el) { io.observe(el) });
    } else targets.forEach(function (el) { el.classList.add('st-in') });
  }

  /* --- tekoči trak: hitrost sledi drsenju --- */
  var mq = $('.st-mq-track'), x = 0, vel = 0, dir = 1, lastY = window.scrollY, half = 0;
  if (mq) { mq.innerHTML += mq.innerHTML; half = mq.scrollWidth / 2 }

  /* --- paralaksa dosežkov --- */
  var imgs = $$('.st-pl-img');

  var ticking = false;
  function onScroll() {
    var y = window.scrollY, dy = y - lastY; lastY = y;
    if (dy) { dir = dy > 0 ? 1 : -1; vel = Math.min(40, vel + Math.abs(dy) * .25) }
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; paint() }) }
  }
  function paint() {
    var H = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--p', H > 0 ? Math.min(1, scrollY / H) : 0);
    if (reduce) return;
    var vh = innerHeight;
    imgs.forEach(function (im) {
      var r = im.parentNode.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var k = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      im.style.setProperty('--py', (k * -7).toFixed(2) + '%');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { if (mq) half = mq.scrollWidth / 2; paint() });
  paint();

  if (mq && !reduce) {
    var last = performance.now();
    (function loop(t) {
      var dt = Math.min(64, t - last) / 16.67; last = t;
      vel *= Math.pow(.92, dt);
      x -= (1.1 + vel) * dir * dt;
      if (half) { if (x <= -half) x += half; if (x > 0) x -= half }
      mq.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      requestAnimationFrame(loop);
    })(last);
  }

  /* --- izvajalci: nagib + odsev --- */
  if (fine && !reduce) {
    $$('.st-art-card').forEach(function (card) {
      var ph = $('.st-art-photo', card);
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('st-tilt');
        card.style.transform = 'perspective(900px) scale(1.05) rotateX(' + ((.5 - py) * 9).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 11).toFixed(2) + 'deg)';
        if (ph) { ph.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); ph.style.setProperty('--gy', (py * 100).toFixed(1) + '%') }
      });
      card.addEventListener('mouseleave', function () { card.classList.remove('st-tilt'); card.style.transform = '' });
    });

    /* --- gumbi z »magnetom« --- */
    $$('.st-buy, .st-pl-more, .st-link-more, .st-btn').forEach(function (b) {
      b.classList.add('st-mag');
      b.addEventListener('mousemove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px)' });
      b.addEventListener('mouseleave', function () { b.style.transform = '' });
    });
  }

  /* --- plavajoči gumb »Pišite nam«: skrit na vrhu in ob kontaktih --- */
  var fab = $('.st-fab');
  if (fab && 'IntersectionObserver' in window) {
    var vis = {};
    var upd = function () { fab.classList.toggle('st-hide', Object.keys(vis).some(function (k) { return vis[k] })) };
    var fo = new IntersectionObserver(function (es) { es.forEach(function (e) { vis[e.target.className] = e.isIntersecting }); upd() });
    ['.st-intro-btns', '#pisite', '.st-bp-sec', '.st-footer'].forEach(function (q) { var el = $(q); if (el) fo.observe(el) });
  }
});
