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
    ['.st-ptx-in', 0],
    ['.st-kicker, .st-hero-p', 0],
    ['.st-art-card', .15],
    ['.st-vid-head, .st-dos-head', 0],
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
  /* videospoti in trgovina: gibanje, vezano neposredno na drsenje (brez zamika) */
  var vids = $$('.st-vg-item'), shop = $$('.st-shop-item'), wide = window.matchMedia('(min-width: 768px)');
  var hx = $('.st-hx'), hxBg = $('.st-hx-bg'), hxIn = $('.st-hx-in');
  var cards = $$('.st-sx-card');

  /* gladko drsenje paralakse: učinki sledijo »mehkemu« položaju sy, ki se z inercijo približuje dejanskemu */
  var sy = window.scrollY, running = false, lastT = 0;
  function loop(t) {
    var dt = lastT ? Math.min(3, (t - lastT) / 16.67) : 1; lastT = t;
    var d = window.scrollY - sy;
    sy = Math.abs(d) < .2 ? window.scrollY : sy + d * (1 - Math.pow(.88, dt));
    paint();
    if (sy !== window.scrollY) requestAnimationFrame(loop); else { running = false; lastT = 0 }
  }
  function onScroll() {
    var y = window.scrollY, dy = y - lastY; lastY = y;
    if (dy) { dir = dy > 0 ? 1 : -1; vel = Math.min(40, vel + Math.abs(dy) * .25) }
    if (!running) { running = true; requestAnimationFrame(loop) }
  }
  function paint() {
    var lag = window.scrollY - sy; /* + ko drsiš navzdol: elementi so »še nižje« kot v resnici */
    var H = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--p', H > 0 ? Math.min(1, scrollY / H) : 0);
    if (reduce) return;
    var vh = innerHeight;
    /* uvod: ozadje počasneje, besedilo hitreje in zbledi */
    if (hx) {
      var hh = hx.offsetHeight, y0 = Math.min(Math.max(sy, 0), hh);
      hxBg.style.setProperty('--hy', (y0 * .45).toFixed(1) + 'px');
      hxBg.style.setProperty('--hs', (1.08 + y0 / hh * .12).toFixed(4));
      if (hxIn) { hxIn.style.setProperty('--ty', (y0 * -.25).toFixed(1) + 'px'); hxIn.style.setProperty('--to', Math.max(0, 1 - y0 / (hh * .6)).toFixed(3)) }
    }
    /* kaj delamo: naslednja kartica prekrije prejšnjo, ta se pomanjša in potemni */
    cards.forEach(function (c, i) {
      var r = c.getBoundingClientRect(), H = r.height, top = 64;
      var inner = c.firstElementChild, img = inner.querySelector('.st-sx-img');
      var nx = cards[i + 1], cov = 0;
      if (nx) { var nr = nx.getBoundingClientRect(); cov = Math.min(1, Math.max(0, (top + H - nr.top) / H)) }
      inner.style.setProperty('--cs', (1 - cov * .08).toFixed(4));
      inner.style.setProperty('--cb', (1 - cov * .6).toFixed(3));
      inner.style.setProperty('--cr', (cov * 24).toFixed(1));
      /* vstop besedila: ko kartica pripelje od spodaj */
      var rt = r.top + lag;
      var enter = Math.min(1, Math.max(0, (rt - top) / (vh * .6)));
      inner.style.setProperty('--cin', enter.toFixed(3));
      if (img && r.bottom > 0 && r.top < vh) img.style.setProperty('--iy', ((rt - top) * -.25).toFixed(1) + 'px');
    });
    /* videospoti: izplavajo iz globine – levi stolpec z leve, desni z desne */
    vids.forEach(function (v) {
      var r = v.getBoundingClientRect();
      if (r.top > vh + 150 || r.bottom < -150) return;
      var p = Math.min(1, Math.max(0, (vh - (r.top + lag)) / (vh * .45))), q = 1 - p;
      var side = (r.left + r.width / 2) < innerWidth / 2 ? -1 : 1;
      v.style.translate = (side * q * 60).toFixed(1) + 'px ' + (q * 30).toFixed(1) + 'px';
      v.style.scale = (.9 + p * .1).toFixed(4);
      v.style.opacity = (.15 + p * .85).toFixed(3);
    });
    /* trgovina: stolpci drsijo z različno hitrostjo (paralaksa po stolpcih) */
    if (shop.length) {
      var speeds = [.06, -.05, .09, -.03], xs = [];
      shop.forEach(function (it) { var x = Math.round(it.offsetLeft); if (xs.indexOf(x) < 0) xs.push(x) });
      xs.sort(function (a, b) { return a - b });
      shop.forEach(function (it) {
        var r = it.getBoundingClientRect();
        if (r.top > vh + 200 || r.bottom < -200) return;
        var col = xs.indexOf(Math.round(it.offsetLeft));
        var k = wide.matches ? speeds[col % speeds.length] : 0;
        var c = (r.top + lag + r.height / 2 - vh / 2);
        it.style.translate = '0 ' + (c * k).toFixed(1) + 'px';
        var p = Math.min(1, Math.max(0, (vh - (r.top + lag)) / (vh * .3)));
        it.style.opacity = (.2 + p * .8).toFixed(3);
      });
    }
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
    ['.st-hx-btns', '.st-bp-sec', '.st-footer'].forEach(function (q) { var el = $(q); if (el) fo.observe(el) });
  }
});
