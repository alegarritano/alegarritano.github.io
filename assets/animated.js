/* Animated preview layer (not on the live site). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. the banner: the loops draw in once per visit, then C, N and P run around them ---------- */
  var strip = document.querySelector('.strip');
  if (strip) {
    var root = document.documentElement;
    var cv = document.createElement('canvas');
    cv.className = 'cycle';
    cv.setAttribute('aria-hidden', 'true');
    strip.appendChild(cv);
    var hintL = document.createElement('span'); hintL.className = 'cycle-hint left'; hintL.textContent = 'Soils';
    var hintR = document.createElement('span'); hintR.className = 'cycle-hint right'; hintR.textContent = 'Marine hosts';
    strip.appendChild(hintL); strip.appendChild(hintR);

    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = strip.clientWidth; H = strip.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    size();
    window.addEventListener('resize', size);
    function reset() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; }

    /* phones show their own narrower art, so they keep the plain particles */
    function phone() { return W <= 560; }
    /* positions are fractions of the wide art, placed the way the stylesheet covers the banner with it */
    var IW = 4000, IH = 444;
    function box() { var k = Math.max(W / IW, H / IH), w = IW * k, h = IH * k; return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h }; }
    function at(fx, fy) { if (phone()) { return [fx * W, fy * H]; } var b = box(); return [b.x + fx * b.w, b.y + fy * b.h]; }

    /* three loops in the banner's own colours: carbon orange, nitrogen blue, phosphorus red */
    var loops = [
      { el: 'C', col: [232,160,60], cx: 0.458, cy: 0.52, rx: 0.375, ry: 0.30, tilt: -0.025, speed: 0.020, n: 16 },
      { el: 'N', col: [96,150,230], cx: 0.460, cy: 0.50, rx: 0.385, ry: 0.36, tilt: 0.020,  speed: 0.016, n: 14 },
      { el: 'P', col: [232,84,96],  cx: 0.455, cy: 0.53, rx: 0.39,  ry: 0.33, tilt: 0.000,  speed: 0.012, n: 12 }
    ];
    var parts = [];
    loops.forEach(function (L) {
      for (var i = 0; i < L.n; i++) { parts.push({ L: L, t: i / L.n + Math.random() * 0.03, r: 1.6 + Math.random() * 1.6, label: i % 5 === 0 }); }
    });
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function clamp(v) { return Math.max(0, Math.min(1, v)); }
    function ease(f) { return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; }
    function smooth(a, b, x) { return clamp((x - a) / (b - a)); }
    function pos(L, t) {
      var a = t * Math.PI * 2, x = L.rx * Math.cos(a), y = L.ry * Math.sin(a), c = Math.cos(L.tilt), s = Math.sin(L.tilt);
      return at(L.cx + x * c - y * s, L.cy + x * s + y * c);
    }
    function dot(x, y, r, col, a) {
      var glow = r * (phone() ? 1.3 : 3);
      var g = ctx.createRadialGradient(x, y, 0, x, y, glow * 2);
      g.addColorStop(0, rgba(col, 0.95 * a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, glow * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
    }

    /* the draw in: the stylesheet first shows the art without the loops, and the full art is uncovered
       from the soil to the sponge, each loop led by a glowing head. It plays once per visit. */
    var DRAW = 4.2, X0 = 0.03, X1 = 0.865;
    var ART = new Image(), artOK = false;
    var done = reduce || root.classList.contains('banner-drawn') || phone(), doneAt = 0, drawStart = null;
    function finish() {
      root.classList.add('banner-drawn');
      try { sessionStorage.setItem('bannerDrawn', '1'); } catch (e) {}
    }
    if (done) { finish(); }
    else {
      ART.onload = function () { artOK = true; };
      ART.onerror = function () { done = true; finish(); };
      ART.src = (document.querySelector('link[href*="assets/style.css"]') || { getAttribute: function () { return 'assets/'; } }).getAttribute('href').split('assets/')[0] + 'assets/img/banner.webp';
      /* if the art is slow, show it whole rather than keep the loops away */
      setTimeout(function () { if (!artOK && !done) { done = true; finish(); } }, 5000);
    }
    function heads(xr) {
      var out = [];
      loops.forEach(function (L) {
        var prev = null;
        for (var s = 0; s <= 400; s++) {
          var q = pos(L, s / 400);
          if (prev && (prev[0] - xr) * (q[0] - xr) <= 0) { out.push([xr, prev[1] + (q[1] - prev[1]) * ((xr - prev[0]) / ((q[0] - prev[0]) || 1)), L.col]); }
          prev = q;
        }
      });
      return out;
    }

    /* the weather over the soil: sun or rain, picked at random, switching after 2 s and then every 5 s */
    var firstRain = Math.random() < 0.5 ? 1 : 0, drops = [], splashes = [], sparks = [], nextDrop = 0;
    /* the sponge pumps water out of its openings, and bubbles rise around it */
    var OSC = [[0.899, 0.47], [0.926, 0.46]], BODY = { x: 0.918, y: 0.64, rx: 0.044, ry: 0.19 }, jets = [], bubbles = [], nextBubble = 0;

    var t = 0, last = 0, visible = true, looping = false;
    function draw(dt) {
      reset(); ctx.clearRect(0, 0, W, H);
      var b = box(), wide = !phone();

      if (!done && wide && artOK) {
        if (drawStart === null) { drawStart = t; }
        var f = ease(clamp((t - drawStart) / DRAW)), xr = b.x + (X0 + (X1 - X0) * f) * b.w, edge = 30;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, xr - edge), H); ctx.clip(); ctx.drawImage(ART, b.x, b.y, b.w, b.h); ctx.restore();
        for (var k = 0; k < 6; k++) {
          ctx.save(); ctx.globalAlpha = 1 - (k + 0.5) / 6; ctx.beginPath(); ctx.rect(Math.max(0, xr - edge + k * edge / 6), 0, edge / 6 + 0.5, H); ctx.clip();
          ctx.drawImage(ART, b.x, b.y, b.w, b.h); ctx.restore();
        }
        if (f > 0 && f < 1) { heads(xr - edge * 0.5).forEach(function (h) { dot(h[0], h[1], 2.4, h[2], 1); }); }
        if (f >= 1) { done = true; doneAt = t; finish(); }
      } else if (!done && wide) {
        return;
      }

      if (wide && !reduce) {
        var flips = t < 2 ? 0 : 1 + Math.floor((t - 2) / 5), since = t < 2 ? t : (t - 2) % 5;
        var rainy = (firstRain + flips) % 2 === 1, fade = flips ? smooth(0, 0.8, since) : 1;
        var sun = rainy ? 1 - fade : fade, rain = 1 - sun, sp = at(0.049, 0.13), sx = sp[0], sy = sp[1];
        if (sun > 0) {
          ctx.globalCompositeOperation = 'screen';
          for (var i = 0; i < 10; i++) {
            var ang = t * 0.15 + i * Math.PI / 5, len = b.h * (0.55 + 0.15 * Math.sin(t * 1.3 + i * 2));
            var g = ctx.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
            g.addColorStop(0, 'rgba(255,190,80,' + 0.45 * sun + ')'); g.addColorStop(1, 'rgba(255,190,80,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang - 0.07) * len, sy + Math.sin(ang - 0.07) * len); ctx.lineTo(sx + Math.cos(ang + 0.07) * len, sy + Math.sin(ang + 0.07) * len); ctx.closePath(); ctx.fill();
          }
          [0.105, 0.14, 0.175].forEach(function (px, j) {
            var fl = 0.5 + 0.5 * Math.sin(t * 1.7 + j * 2.1), q = at(px, 0.3), g2 = ctx.createLinearGradient(sx, sy, q[0], q[1]);
            g2.addColorStop(0, 'rgba(255,210,120,' + 0.35 * fl * sun + ')'); g2.addColorStop(1, 'rgba(255,210,120,0)');
            ctx.strokeStyle = g2; ctx.lineWidth = b.h * 0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(q[0], q[1]); ctx.stroke();
          });
          reset();
        }
        if (rain > 0) {
          var dim = ctx.createRadialGradient(sx, sy, 0, sx, sy, b.w * 0.16);
          dim.addColorStop(0, 'rgba(1,10,24,' + 0.5 * rain + ')'); dim.addColorStop(1, 'rgba(1,10,24,0)');
          ctx.fillStyle = dim; ctx.fillRect(0, 0, sx + b.w * 0.2, sy + b.h * 0.4);
          if (t > nextDrop) { drops.push({ x: 0.065 + Math.random() * 0.135, y: -0.1, v: 0.9 + Math.random() * 0.4 }); nextDrop = t + 0.12 + Math.random() * 0.2; }
        }
        drops = drops.filter(function (d) {
          d.y += d.v * dt;
          if (d.y > 0.34) { splashes.push({ x: d.x, t: t }); if (Math.random() < 0.25 && done) { sparks.push({ x: d.x, L: loops[Math.floor(Math.random() * 3)], t: t }); } return false; }
          var q = at(d.x, d.y);
          ctx.strokeStyle = 'rgba(170,210,240,0.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - 1, q[1] - b.h * 0.07); ctx.stroke();
          return true;
        });
        splashes = splashes.filter(function (s) {
          var k = (t - s.t) / 0.5; if (k > 1) { return false; }
          var q = at(s.x, 0.34);
          ctx.strokeStyle = 'rgba(170,210,240,' + 0.8 * (1 - k) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(q[0], q[1], 2 + 9 * k, 1 + 2.5 * k, 0, 0, Math.PI * 2); ctx.stroke();
          return true;
        });
      }

      /* once drawn, the three loops glow and the particles run */
      var on = reduce ? 1 : clamp((t - doneAt) / 0.8);
      if (wide) {
        loops.forEach(function (L) {
          ctx.save(); ctx.shadowColor = rgba(L.col, 0.9); ctx.shadowBlur = 14; ctx.strokeStyle = rgba(L.col, 0.55 * on); ctx.lineWidth = 3; ctx.beginPath();
          for (var s = 0; s <= 200; s++) { var q = pos(L, s / 200); if (s) { ctx.lineTo(q[0], q[1]); } else { ctx.moveTo(q[0], q[1]); } }
          ctx.stroke(); ctx.restore();
        });
      }
      parts.forEach(function (p, i) {
        if (!wide && i % 2) { return; }
        var q = pos(p.L, p.t);
        dot(q[0], q[1], p.r, p.L.col, on);
        if (p.label && W >= 600) { ctx.font = '700 11px Inter, sans-serif'; ctx.fillStyle = rgba(p.L.col, on); ctx.fillText(p.L.el, q[0] + 6, q[1] - 6); }
      });
      sparks = sparks.filter(function (s) {
        var k = (t - s.t) / 1.4; if (k > 1) { return false; }
        var a = at(s.x, 0.34), tg = pos(s.L, 0.5), e = ease(k);
        dot(a[0] + (tg[0] - a[0]) * e, a[1] + (tg[1] - a[1]) * e - Math.sin(k * Math.PI) * b.h * 0.2, 1.2, s.L.col, 1 - k * 0.3);
        return true;
      });

      if (wide && !reduce) {
        if (Math.random() < dt * 16) { var o = OSC[Math.floor(Math.random() * 2)]; jets.push({ x: o[0], y: o[1], vx: (Math.random() - 0.5) * 0.004, t: t }); }
        jets = jets.filter(function (j) {
          var k = (t - j.t) / 2.4; if (k > 1) { return false; }
          var q = at(j.x + j.vx * k * 6, j.y - 0.5 * Math.sqrt(k));
          ctx.fillStyle = 'rgba(210,240,255,' + 0.85 * (1 - k) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], 1.3, 0, Math.PI * 2); ctx.fill();
          return true;
        });
        if (t > nextBubble) {
          var src = Math.random() < 0.5 ? { x: 0.855 + Math.random() * 0.13, y: 0.9 } : { x: BODY.x + (Math.random() < 0.5 ? -1 : 1) * BODY.rx * (0.9 + Math.random() * 0.3), y: BODY.y + (Math.random() - 0.3) * BODY.ry };
          bubbles.push({ x: src.x, y: src.y, r: 0.8 + Math.random() * 1.4, v: 0.14 + Math.random() * 0.12, ph: Math.random() * 6 });
          nextBubble = t + 0.12 + Math.random() * 0.25;
        }
        bubbles = bubbles.filter(function (u) {
          u.y -= u.v * dt; u.r += dt * 0.4; if (u.y < 0.03) { return false; }
          var q = at(u.x, u.y), x = q[0] + Math.sin(t * 4 + u.ph) * 2;
          ctx.strokeStyle = 'rgba(190,230,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, q[1], u.r, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - u.r * 0.35, q[1] - u.r * 0.35, u.r * 0.3, 0, Math.PI * 2); ctx.fill();
          return true;
        });
      }
    }
    function frame(ts) {
      if (!visible) { looping = false; last = 0; return; }
      var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; last = ts; t += dt;
      parts.forEach(function (p) { p.t = (p.t + p.L.speed * dt) % 1; });
      draw(dt);
      requestAnimationFrame(frame);
    }
    function go() { if (!looping) { looping = true; requestAnimationFrame(frame); } }
    if (reduce) {
      draw(0);
      window.addEventListener('resize', function () { draw(0); });
    } else {
      go();
      /* rest while the banner is scrolled out of view */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { go(); } }).observe(strip);
      }
    }

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
    ['soil', 0], ['tools', 220], ['phd', 930], ['symbiosis', 1000], ['identity', 1000],
    ['hosts', 1000], ['carbon-fixation', 1000], ['masters', 1000]
  ].map(function (s) { return { el: document.getElementById(s[0]), d: s[1] }; }).filter(function (s) { return s.el; });

  var line = document.createElement('div'); line.className = 'depth-line'; line.setAttribute('aria-hidden', 'true');
  document.body.appendChild(line);

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
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
