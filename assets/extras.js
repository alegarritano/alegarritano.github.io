/* Animated extras: figure reveal and the Networks co-author map. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function onView(el, fn, threshold) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: threshold || 0.2 });
    io.observe(el);
    /* already on screen when the page opens: start without waiting for a scroll */
    requestAnimationFrame(function () {
      var b = el.getBoundingClientRect();
      if (b.top < window.innerHeight * 0.9 && b.bottom > 0) { io.disconnect(); fn(); }
    });
  }

  /* ---------- illustrations settle in the first time they come into view ---------- */
  if (!reduce) {
    document.querySelectorAll('figure.ill').forEach(function (f) {
      if (f.getBoundingClientRect().top < window.innerHeight) { return; }
      f.classList.add('reveal');
      onView(f, function () { f.classList.add('in'); }, 0.1);
    });
  }

  var page = document.body.dataset.page;

  /* ---------- Research: wave dividers in the element colours, and a career line beside the text ---------- */
  if (page === 'research') {
    var COLS = ['#e8a03c', '#5f93e0', '#e2565f'];   /* carbon, nitrogen, phosphorus, as in the banner */
    function wave(phase, amp) {
      var d = 'M0,' + (9 + amp * Math.sin(phase)).toFixed(2);
      for (var x = 6; x <= 600; x += 6) { d += ' L' + x + ',' + (9 + amp * Math.sin(phase + x / 38)).toFixed(2); }
      return d;
    }
    var targets = [].slice.call(document.querySelectorAll('.content .theme, .content .stage')).filter(function (el) {
      if (el.classList.contains('theme')) {
        var prev = el.previousElementSibling;
        if (!prev || prev.classList.contains('stage')) { return false; }
        if (el === document.querySelector('.content .theme')) { return false; }
      }
      return true;
    });
    targets.forEach(function (el) {
      var div = document.createElement('div');
      div.className = 'divider';
      div.setAttribute('aria-hidden', 'true');
      div.innerHTML = '<svg viewBox="0 0 600 18" preserveAspectRatio="none">' + COLS.map(function (c, i) {
        return '<path d="' + wave(i * 2.1, 4 - i * 0.6) + '" stroke="' + c + '" pathLength="1" style="--d:' + (i * 180) + 'ms"/>';
      }).join('') + '</svg>';
      el.parentNode.insertBefore(div, el);
      if (reduce) { div.classList.add('in'); } else { onView(div, function () { div.classList.add('in'); }, 0.6); }
    });
    document.body.classList.add('has-dividers');

    /* career line: from the current work down through the PhD to the master's, filling in as the page scrolls */
    var content = document.querySelector('.content');
    var stops = [['soil', '2025'], ['phd', '2020'], ['masters', '2015']]
      .map(function (s) { return { el: document.getElementById(s[0]), year: s[1] }; })
      .filter(function (s) { return s.el; });
    var last = content.querySelector('.theme:last-of-type') || content.lastElementChild;
    if (stops.length && window.matchMedia('(min-width: 880px)').matches !== undefined) {
      var rail = document.createElement('div');
      rail.className = 'career';
      rail.setAttribute('aria-hidden', 'true');
      rail.innerHTML = '<span class="track"></span><span class="fill"></span>' +
        stops.map(function (s) { return '<span class="stop"><b>' + s.year + '</b></span>'; }).join('');
      content.appendChild(rail);
      var track = rail.querySelector('.track'), fill = rail.querySelector('.fill'), marks = rail.querySelectorAll('.stop');
      function top(el) { return el.getBoundingClientRect().top - content.getBoundingClientRect().top; }
      function place() {
        var t0 = top(stops[0].el), t1 = last.getBoundingClientRect().bottom - content.getBoundingClientRect().top;
        rail.style.top = t0 + 'px';
        rail.style.height = (t1 - t0) + 'px';
        stops.forEach(function (s, i) { marks[i].style.top = (top(s.el) - t0) + 'px'; });
        progress();
      }
      function progress() {
        var r = rail.getBoundingClientRect(), mid = window.innerHeight * 0.5;
        var f = Math.max(0, Math.min(1, (mid - r.top) / r.height));
        fill.style.height = (f * 100).toFixed(2) + '%';
        marks.forEach(function (m) { m.classList.toggle('passed', m.getBoundingClientRect().top < mid); });
      }
      place();
      window.addEventListener('scroll', function () { requestAnimationFrame(progress); }, { passive: true });
      window.addEventListener('resize', place);
      window.addEventListener('load', place);
      if ('ResizeObserver' in window) { new ResizeObserver(place).observe(content); }
    }
  }

  /* ---------- Networks: a map linking Sydney to the cities of my co-authors ---------- */
  if (page === 'networks') {
    var figF = document.getElementById('collab-flat');
    if (!figF) { return; }
    function load(src) {
      return new Promise(function (ok, bad) { var sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
    }
    /* d3-geo draws the projections and great circle routes, topojson-client decodes the coastlines */
    load('https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js')
      .then(function () { return load('https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js'); })
      .then(function () { return load('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'); })
      .then(function () {
        return Promise.all([
          fetch('assets/collaborations.json').then(function (r) { return r.json(); }),
          fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(function (r) { return r.json(); })
        ]);
      })
      .then(function (res) {
        var shared = prepare(res[0], res[1]);
        tour(figF, flat(figF, shared));
      })
      .catch(function () {});

    var S = 600, W = 960, H = 420, NSs = 'http://www.w3.org/2000/svg';
    var REGIONS = [['Lisbon', 'Perpignan'], ['Konstanz', 'Kiel', 'Kongens Lyngby', 'Umeå'], ['Thuwal'], ['Rio de Janeiro', 'São Paulo'], ['Sydney', 'Brisbane']];
    var LEFT = { 'São Paulo': 1, 'Kiel': 1, 'Sydney': 1 };
    /* names that crowd their neighbours on the whole world view appear only once the map zooms in */
    var MINOR = { 'Konstanz': 1, 'Kongens Lyngby': 1, 'Perpignan': 1, 'Brisbane': 1 };
    /* on phones the labels are drawn larger, so these also wait for the zoom to avoid overlapping */
    var MINOR_PHONE = { 'Kiel': 1, 'Lisbon': 1, 'São Paulo': 1 };
    function ease(f) { return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; }

    function prepare(data, topo) {
      var cities = {};
      data.institutions.forEach(function (i) {
        if (i.lat == null) { return; }
        var c = cities[i.city] || (cities[i.city] = { city: i.city, country: i.country, lat: i.lat, lon: i.lon, papers: 0, names: [] });
        c.papers = Math.max(c.papers, i.papers);
        c.names.push(i.name + ' (' + i.papers + (i.papers === 1 ? ' paper' : ' papers') + ')');
      });
      var list = Object.keys(cities).map(function (k) { return cities[k]; }).sort(function (a, b) { return b.papers - a.papers; });
      return { cities: cities, list: list, home: cities['Sydney'], land: window.topojson.feature(topo, topo.objects.land), grat: window.d3.geoGraticule().extent([[-180, -90], [180, 90.0001]]).step([10, 10])() };
    }

    /* shared drawing: routes from Sydney, dots with names and country codes */
    function scaffold(fig, sh, label, extraDefs, under) {
      fig.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + ': ' +
        sh.list.filter(function (c) { return c !== sh.home; }).map(function (c) { return c.city; }).join(', ') + '">' +
        '<defs>' + extraDefs + '</defs>' + under + '</svg>';
      var svg = fig.querySelector('svg'), routes = [], pins = [];
      sh.list.forEach(function (c, i) {
        if (c !== sh.home) {
          var r = document.createElementNS(NSs, 'path');
          r.setAttribute('class', 'route'); r.setAttribute('pathLength', '1'); r.style.setProperty('--d', (i * 140) + 'ms');
          svg.querySelector('.routes').appendChild(r);
          routes.push([r, { type: 'LineString', coordinates: [[sh.home.lon, sh.home.lat], [c.lon, c.lat]] }]);
        }
        var pg = document.createElementNS(NSs, 'g'), rad = 4 + 3 * Math.sqrt(c.papers), L = LEFT[c.city];
        pg.setAttribute('class', 'pin' + (c === sh.home ? ' home' : ''));
        pg.style.setProperty('--d', (c === sh.home ? 0 : 500 + i * 140) + 'ms');
        pg.innerHTML = '<title>' + c.city + ': ' + c.names.join(', ') + '</title><circle class="ring" r="' + rad.toFixed(1) + '"/><circle class="dot" r="' + rad.toFixed(1) + '"/>' +
          '<text class="pin-label' + (MINOR[c.city] ? ' minor' : '') + (MINOR_PHONE[c.city] ? ' minor-phone' : '') + '" x="' + (L ? -(rad + 5) : rad + 5).toFixed(1) + '" y="5" text-anchor="' + (L ? 'end' : 'start') + '">' + c.city + ' <tspan class="cc">' + (c.country || '') + '</tspan></text>';
        svg.querySelector('.pins').appendChild(pg);
        pins.push([pg, c]);
      });
      return { svg: svg, routes: routes, pins: pins };
    }

    function flat(fig, sh) {
      var d3 = window.d3;
      var proj = d3.geoEquirectangular().translate([W / 2, H / 2]).precision(0.5), path = d3.geoPath(proj);
      var k = scaffold(fig, sh, 'Flat map linking Sydney to the cities where my co-authors are based', '',
        '<rect class="sea" width="' + W + '" height="' + H + '" rx="12"/><g id="flatworld"><path class="grat"/><path class="land"/><g class="routes"></g><g class="pins"></g></g>' +
        '<g class="wcopy"></g><g class="wcopy"></g>');
      /* the world repeats to the left and right, so a sideways drag never runs off the edge */
      var copies = k.svg.querySelectorAll('.wcopy'), world = k.svg.querySelector('#flatworld'), needCopies = false;
      var gratP = k.svg.querySelector('.grat'), landP = k.svg.querySelector('.land');
      var st = { k: 1, c: [0, 0] };
      function clampLat(c, kk) {
        /* keep the poles at or beyond the top and bottom edges */
        var half = (H / 2) / kk * 180 / Math.PI, lim = Math.max(0, 90 - half);
        return [((c[0] + 540) % 360) - 180, Math.max(-lim, Math.min(lim, c[1]))];
      }
      function render() {
        st.c = clampLat(st.c, st.k);
        proj.scale(st.k).center(st.c);
        var span = 2 * Math.PI * st.k;
        copies[0].setAttribute('transform', 'translate(' + (-span).toFixed(1) + ',0)');
        copies[1].setAttribute('transform', 'translate(' + span.toFixed(1) + ',0)');
        needCopies = Math.abs(st.c[0]) + (W / 2) / st.k * 180 / Math.PI > 179;
        gratP.setAttribute('d', path(sh.grat));
        landP.setAttribute('d', path(sh.land));
        k.routes.forEach(function (r) { r[0].setAttribute('d', path(r[1]) || ''); });
        k.pins.forEach(function (p) { var xy = proj([p[1].lon, p[1].lat]); p[0].setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ',' + xy[1].toFixed(1) + ')'); });
        /* copies are plain duplicates of the drawn world, made only while an edge of the world is in view */
        var html = needCopies ? world.innerHTML : '';
        if (copies[0].innerHTML !== html) { copies[0].innerHTML = html; copies[1].innerHTML = html; }
        /* city names appear only once the map has zoomed in */
        fig.classList.toggle('zoomed', st.k > START.k * 1.6);
      }
      function fitTo(obj, pad, right) {
        var t = d3.geoEquirectangular().fitExtent([[pad, pad], [W - (right || pad), H - pad]], obj);
        return { k: t.scale(), c: t.invert([W / 2, H / 2]) };
      }
      function region(i) {
        var pts = [];
        REGIONS[i].forEach(function (n) { var c = sh.cities[n]; if (c) { pts.push([c.lon - 5, c.lat - 4], [c.lon + 5, c.lat + 4]); } });
        return fitTo({ type: 'MultiPoint', coordinates: pts }, 50, 170);
      }
      /* the whole world from about 74 N to 84 S, so the Sydney to Brazil routes, which pass near 77 S, stay in view */
      var START = { k: W / (2 * Math.PI), c: [10, -5] };
      var anim = null;
      function go(i, ms) {
        var a = { k: st.k, c: st.c.slice() }, b = i < 0 ? START : region(i), t0 = performance.now();
        if (anim) { cancelAnimationFrame(anim); }
        if (!ms) { st = b; render(); return; }
        (function frame(t) {
          var e = ease(Math.min(1, (t - t0) / ms));
          st = { k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * e), c: [a.c[0] + (b.c[0] - a.c[0]) * e, a.c[1] + (b.c[1] - a.c[1]) * e] };
          render();
          anim = e < 1 ? requestAnimationFrame(frame) : null;
        })(t0);
      }
      go(-1, 0);
      /* dragging pans the map and stops the tour for good */
      var api = { go: go, stop: function () { if (anim) { cancelAnimationFrame(anim); anim = null; } } }, drag = null;
      /* zoom with no controls: trackpad or touch pinch, double click in, shift or alt double click out.
         The point under the pointer stays put while the scale changes. */
      var KMIN = START.k, KMAX = START.k * 14, pts = {}, pinch = null;
      function user() { if (api.onUser) { api.onUser(); } api.stop(); }
      function zoomAt(factor, clientX, clientY) {
        var r = k.svg.getBoundingClientRect(), vx = (clientX - r.left) / r.width * W, vy = (clientY - r.top) / r.height * H;
        var geo = proj.invert([vx, vy]), nk = Math.max(KMIN, Math.min(KMAX, st.k * factor)), d = 180 / Math.PI;
        st = { k: nk, c: [geo[0] - (vx - W / 2) / nk * d, geo[1] + (vy - H / 2) / nk * d] };
        render();
      }
      k.svg.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && !e.metaKey) { return; }
        e.preventDefault(); user();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      }, { passive: false });
      k.svg.addEventListener('dblclick', function (e) {
        e.preventDefault(); user();
        zoomAt(e.shiftKey || e.altKey ? 1 / 1.8 : 1.8, e.clientX, e.clientY);
      });
      k.svg.addEventListener('pointerdown', function (e) {
        user();
        pts[e.pointerId] = [e.clientX, e.clientY];
        var ids = Object.keys(pts);
        if (ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]];
          pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: st.k }; drag = null;
        } else {
          drag = { x: e.clientX, y: e.clientY, c: st.c.slice() };
        }
        k.svg.setPointerCapture(e.pointerId);
      });
      k.svg.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) { return; }
        pts[e.pointerId] = [e.clientX, e.clientY];
        var ids = Object.keys(pts);
        if (pinch && ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          zoomAt(pinch.k * d / pinch.d / st.k, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          return;
        }
        if (!drag) { return; }
        var f = W / k.svg.getBoundingClientRect().width * 180 / Math.PI / st.k;
        st = { k: st.k, c: [drag.c[0] - (e.clientX - drag.x) * f, drag.c[1] + (e.clientY - drag.y) * f] };
        render();
      });
      function up(e) {
        delete pts[e.pointerId];
        if (Object.keys(pts).length < 2) { pinch = null; }
        if (!Object.keys(pts).length) { drag = null; }
      }
      k.svg.addEventListener('pointerup', up);
      k.svg.addEventListener('pointercancel', up);
      return api;
    }

    /* the tour: the whole view for 7 s, then Portugal and France, the rest of Europe, Thuwal, Brazil and Australia,
       each move taking 1.6 s and each stop held for 2 s. It runs only while on screen and stops for good on a drag. */
    function tour(fig, view) {
      if (reduce) { fig.classList.add('in'); return; }
      onView(fig, function () { fig.classList.add('in'); }, 0.3);
      var on = true, i = 0, timer = null, visible = false, started = false;
      function next() {
        timer = null;
        if (!on || !visible) { return; }
        if (i === REGIONS.length) {
          /* after the last region, back out to the whole world and rest for 7 s before the next round */
          view.go(-1, 1600);
          i = 0;
          timer = setTimeout(next, 1600 + 7000);
          return;
        }
        view.go(i, 1600);
        i++;
        timer = setTimeout(next, 1600 + 2000);
      }
      view.onUser = function () { on = false; if (timer) { clearTimeout(timer); timer = null; } };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (visible && on && !timer) { timer = setTimeout(next, started ? 1000 : 7000); started = true; }
          if (!visible && timer) { clearTimeout(timer); timer = null; }
        }, { threshold: 0.4 }).observe(fig);
      }
    }
  }
})();
