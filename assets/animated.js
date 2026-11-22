/* Animated preview layer (not on the live site). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. particles of C, N and P running around the banner's loops ---------- */
  var strip = document.querySelector('.strip');
  if (strip) {
    var cv = document.createElement('canvas');
    cv.className = 'cycle';
    cv.setAttribute('aria-hidden', 'true');
    strip.appendChild(cv);
    var hintL = document.createElement('span'); hintL.className = 'cycle-hint left'; hintL.textContent = 'Soils';
    var hintR = document.createElement('span'); hintR.className = 'cycle-hint right'; hintR.textContent = 'Marine hosts';
    strip.appendChild(hintL); strip.appendChild(hintR);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cycle-pause';
    strip.appendChild(btn);

    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = strip.clientWidth; H = strip.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    /* three loops in the banner's own colours: carbon orange, nitrogen blue, phosphorus red.
       Each is an ellipse in strip coordinates (0 to 1), slightly tilted, run at its own speed. */
    var loops = [
      { el: 'C', col: '232,160,60',  cx: 0.458, cy: 0.52, rx: 0.375, ry: 0.30, tilt: -0.025, speed: 0.020, n: 16 },
      { el: 'N', col: '96,150,230',  cx: 0.460, cy: 0.50, rx: 0.385, ry: 0.36, tilt: 0.020,  speed: 0.016, n: 14 },
      { el: 'P', col: '232,84,96',   cx: 0.455, cy: 0.53, rx: 0.39, ry: 0.33, tilt: 0.000,  speed: 0.012, n: 12 }
    ];
    var parts = [];
    loops.forEach(function (L) {
      for (var i = 0; i < L.n; i++) {
        parts.push({ L: L, t: i / L.n + Math.random() * 0.03, r: 1.6 + Math.random() * 1.6, label: i % 5 === 0 });
      }
    });
    function pos(L, t) {
      var a = t * Math.PI * 2, x = L.rx * Math.cos(a), y = L.ry * Math.sin(a);
      var c = Math.cos(L.tilt), s = Math.sin(L.tilt);
      return [(L.cx + x * c - y * s) * W, (L.cy + x * s + y * c) * H];
    }
    var running = !reduce, last = 0;
    function label() { btn.textContent = running ? '❚❚' : '▶'; btn.setAttribute('aria-label', running ? 'Pause the animation' : 'Play the animation'); }
    label();
    btn.addEventListener('click', function () { running = !running; label(); if (running) { last = 0; requestAnimationFrame(frame); } });

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var small = W < 600;
      parts.forEach(function (p, i) {
        if (small && i % 2) { return; }
        var xy = pos(p.L, p.t), glow = p.r * (small ? 1.3 : 3);
        var g = ctx.createRadialGradient(xy[0], xy[1], 0, xy[0], xy[1], glow * 2);
        g.addColorStop(0, 'rgba(' + p.L.col + ',0.95)');
        g.addColorStop(1, 'rgba(' + p.L.col + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], glow * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(xy[0], xy[1], p.r * 0.7, 0, Math.PI * 2); ctx.fill();
        if (p.label && !small) {
          ctx.font = '700 11px Inter, sans-serif';
          ctx.fillStyle = 'rgba(' + p.L.col + ',1)';
          ctx.fillText(p.L.el, xy[0] + 6, xy[1] - 6);
        }
      });
    }
    function frame(ts) {
      if (!running) { return; }
      var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; last = ts;
      parts.forEach(function (p) { p.t = (p.t + p.L.speed * dt) % 1; });
      draw();
      requestAnimationFrame(frame);
    }
    draw();
    if (running) { requestAnimationFrame(frame); }

    /* hovering the soil end or the sponge end lights up the matching themes on the home page */
    var groups = {
      soil: ['theme-soil', 'theme-tools'],
      sea: ['theme-symbiosis', 'theme-identity', 'theme-carbon-fixation']
    };
    function light(which) {
      strip.classList.toggle('hover-soil', which === 'soil');
      strip.classList.toggle('hover-sea', which === 'sea');
      document.querySelectorAll('.items .item').forEach(function (it) {
        var img = it.querySelector('img.thumb'), src = img ? img.getAttribute('src') : '';
        var on = which && groups[which].some(function (k) { return src.indexOf(k) !== -1; });
        it.classList.toggle('lit', !!on);
      });
    }
    strip.addEventListener('mousemove', function (e) {
      var f = (e.clientX - strip.getBoundingClientRect().left) / W;
      light(f < 0.3 ? 'soil' : f > 0.7 ? 'sea' : null);
    });
    strip.addEventListener('mouseleave', function () { light(null); });
  }

  /* ---------- 2. research page: a dive from the sunlit surface to the midnight zone ---------- */
  if (document.body.dataset.page !== 'research') { return; }
  document.body.classList.add('depth');
  /* depth in metres for each section, as a scale for the story, not sampling depths */
  var stops = [
    ['soil', 0], ['tools', 0], ['phd', 150], ['symbiosis', 1000], ['identity', 1000],
    ['hosts', 600], ['carbon-fixation', 1000], ['masters', 0]
  ].map(function (s) { return { el: document.getElementById(s[0]), d: s[1] }; }).filter(function (s) { return s.el; });

  var gauge = document.createElement('div');
  gauge.className = 'gauge'; gauge.setAttribute('aria-hidden', 'true');
  gauge.innerHTML = '<span class="depth">0 m</span><div class="tube"><span class="bead"></span></div><span class="zone">Sunlit zone</span>';
  document.body.appendChild(gauge);
  var line = document.createElement('div'); line.className = 'depth-line'; line.setAttribute('aria-hidden', 'true');
  document.body.appendChild(line);
  var dEl = gauge.querySelector('.depth'), zEl = gauge.querySelector('.zone'), bead = gauge.querySelector('.bead');

  function mix(a, b, f) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * f); }); }
  var SURF = [246, 240, 228], TWI = [143, 182, 196], DEEP = [4, 22, 40];
  function colour(d) {
    return d <= 200 ? mix(SURF, TWI, d / 200) : mix(TWI, DEEP, Math.min((d - 200) / 800, 1));
  }
  function depthNow() {
    var mid = window.innerHeight * 0.45, prev = null, next = null;
    for (var i = 0; i < stops.length; i++) {
      var top = stops[i].el.getBoundingClientRect().top;
      if (top <= mid) { prev = { y: top, d: stops[i].d }; } else { next = { y: top, d: stops[i].d }; break; }
    }
    if (!prev) { return 0; }
    if (!next) { return prev.d; }
    var f = (mid - prev.y) / (next.y - prev.y);
    return prev.d + (next.d - prev.d) * Math.max(0, Math.min(1, f));
  }
  var ticking = false;
  function update() {
    ticking = false;
    var d = depthNow(), c = colour(d), css = 'rgb(' + c.join(',') + ')';
    document.body.style.setProperty('--depth-bg', css);
    document.body.style.setProperty('--gauge-ink', d > 450 ? '#e8f1f4' : '#1f4e5f');
    dEl.textContent = Math.round(d / 10) * 10 + ' m';
    zEl.textContent = d < 200 ? 'Sunlit zone' : d < 1000 ? 'Twilight zone' : 'Midnight zone';
    bead.style.top = (Math.min(d, 1000) / 1000 * 100) + '%';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
