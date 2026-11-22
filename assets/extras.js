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

  /* ---------- Networks: the cities of my co-authors, on a globe and on a flat map ---------- */
  if (page === 'networks') {
    var figG = document.getElementById('collab-map'), figF = document.getElementById('collab-flat');
    if (!figG && !figF) { return; }
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
        if (figG) { tour(figG, globe(figG, shared)); }
        if (figF) { tour(figF, flat(figF, shared)); }
      })
      .catch(function () {});

    var S = 600, NSs = 'http://www.w3.org/2000/svg';
    var REGIONS = [['Lisbon', 'Perpignan'], ['Konstanz', 'Kiel', 'Kongens Lyngby', 'Umeå'], ['Thuwal'], ['Rio de Janeiro', 'São Paulo'], ['Sydney', 'Brisbane']];
    var LEFT = { 'São Paulo': 1, 'Kiel': 1 };
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
      return { cities: cities, list: list, home: cities['Sydney'], land: window.topojson.feature(topo, topo.objects.land), grat: window.d3.geoGraticule10() };
    }

    /* shared drawing: routes from Sydney, dots with names and country codes */
    function scaffold(fig, sh, label, extraDefs, under) {
      fig.innerHTML = '<svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' + label + ': ' +
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
          '<text class="pin-label" x="' + (L ? -(rad + 5) : rad + 5).toFixed(1) + '" y="5" text-anchor="' + (L ? 'end' : 'start') + '">' + c.city + ' <tspan class="cc">' + (c.country || '') + '</tspan></text>';
        svg.querySelector('.pins').appendChild(pg);
        pins.push([pg, c]);
      });
      return { svg: svg, routes: routes, pins: pins };
    }

    function globe(fig, sh) {
      var d3 = window.d3, R = 282;
      var proj = d3.geoOrthographic().translate([S / 2, S / 2]).clipAngle(90).precision(0.5), path = d3.geoPath(proj);
      var k = scaffold(fig, sh, 'Globe linking Sydney to the cities where my co-authors are based',
        '<radialGradient id="ocean" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f4f9fa"/><stop offset="1" stop-color="#cfe1e6"/></radialGradient>' +
        '<radialGradient id="shade" cx="50%" cy="50%" r="50%"><stop offset="0.75" stop-color="#0b2f3a" stop-opacity="0"/><stop offset="1" stop-color="#0b2f3a" stop-opacity="0.18"/></radialGradient>' +
        '<clipPath id="disc"><circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + R + '"/></clipPath>',
        '<g clip-path="url(#disc)"><path class="sphere" fill="url(#ocean)"/><path class="grat"/><path class="land"/><g class="routes"></g><g class="pins"></g></g><circle class="rim" cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + R + '"/>');
      var sphereP = k.svg.querySelector('.sphere'), gratP = k.svg.querySelector('.grat'), landP = k.svg.querySelector('.land');
      var st = { rot: [0, 0], z: 1 };
      function render() {
        proj.rotate(st.rot).scale(R * st.z);
        var centre = [-st.rot[0], -st.rot[1]], lim = Math.min(Math.PI / 2 - 0.05, Math.asin(Math.min(1, 1 / st.z)) - 0.02);
        sphereP.setAttribute('d', path({ type: 'Sphere' }));
        gratP.setAttribute('d', path(sh.grat));
        landP.setAttribute('d', path(sh.land));
        k.routes.forEach(function (r) { r[0].setAttribute('d', path(r[1]) || ''); });
        k.pins.forEach(function (p) {
          var c = p[1], vis = d3.geoDistance([c.lon, c.lat], centre) < lim;
          p[0].style.display = vis ? '' : 'none';
          if (vis) { var xy = proj([c.lon, c.lat]); p[0].setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ',' + xy[1].toFixed(1) + ')'); }
        });
      }
      function centreOf(names) {
        var pts = names.map(function (n) { return sh.cities[n]; }).filter(Boolean);
        return [-d3.mean(pts, function (c) { return c.lon; }), -Math.max(-60, Math.min(60, d3.mean(pts, function (c) { return c.lat; }))) * 0.8];
      }
      var ZOOM = [2.6, 2.2, 1.7, 2.4, 2.4];
      var START = { rot: centreOf(['Lisbon', 'Thuwal']), z: 1 };
      function target(i) { return i < 0 ? START : { rot: centreOf(REGIONS[i]), z: ZOOM[i] }; }
      var anim = null;
      function go(i, ms) {
        var a = { rot: st.rot.slice(), z: st.z }, b = target(i), dl = ((b.rot[0] - a.rot[0] + 540) % 360) - 180, t0 = performance.now();
        if (anim) { cancelAnimationFrame(anim); }
        if (!ms) { st = { rot: b.rot.slice(), z: b.z }; render(); return; }
        (function frame(t) {
          var e = ease(Math.min(1, (t - t0) / ms));
          var dip = Math.abs(dl) > 40 ? Math.sin(Math.PI * e) * (Math.min(a.z, b.z) - 1) : 0;
          st = { rot: [a.rot[0] + dl * e, a.rot[1] + (b.rot[1] - a.rot[1]) * e], z: a.z + (b.z - a.z) * e - dip };
          render();
          anim = e < 1 ? requestAnimationFrame(frame) : null;
        })(t0);
      }
      go(-1, 0);
      /* dragging spins the globe by hand */
      var drag = null, api = { go: go, stop: function () { if (anim) { cancelAnimationFrame(anim); anim = null; } } };
      k.svg.addEventListener('pointerdown', function (e) {
        if (api.onUser) { api.onUser(); }
        api.stop();
        drag = { x: e.clientX, y: e.clientY, r: st.rot.slice() };
        if (st.z !== 1) { st.z = 1; render(); }
        k.svg.setPointerCapture(e.pointerId);
      });
      k.svg.addEventListener('pointermove', function (e) {
        if (!drag) { return; }
        var f = 180 / k.svg.getBoundingClientRect().width;
        st.rot = [drag.r[0] + (e.clientX - drag.x) * f, Math.max(-75, Math.min(75, drag.r[1] - (e.clientY - drag.y) * f))];
        render();
      });
      k.svg.addEventListener('pointerup', function () { drag = null; });
      k.svg.addEventListener('pointercancel', function () { drag = null; });
      return api;
    }

    function flat(fig, sh) {
      var d3 = window.d3;
      var proj = d3.geoEquirectangular().translate([S / 2, S / 2]).precision(0.5), path = d3.geoPath(proj);
      var k = scaffold(fig, sh, 'Flat map linking Sydney to the cities where my co-authors are based', '',
        '<rect class="sea" width="' + S + '" height="' + S + '" rx="12"/><path class="grat"/><path class="land"/><g class="routes"></g><g class="pins"></g>');
      var gratP = k.svg.querySelector('.grat'), landP = k.svg.querySelector('.land');
      var st = { k: 1, c: [0, 0] };
      function render() {
        proj.scale(st.k).center(st.c);
        gratP.setAttribute('d', path(sh.grat));
        landP.setAttribute('d', path(sh.land));
        k.routes.forEach(function (r) { r[0].setAttribute('d', path(r[1]) || ''); });
        k.pins.forEach(function (p) { var xy = proj([p[1].lon, p[1].lat]); p[0].setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ',' + xy[1].toFixed(1) + ')'); });
      }
      function fitTo(obj, pad) {
        var t = d3.geoEquirectangular().fitExtent([[pad, pad], [S - pad, S - pad]], obj);
        return { k: t.scale(), c: t.invert([S / 2, S / 2]) };
      }
      function region(i) {
        var pts = [];
        REGIONS[i].forEach(function (n) { var c = sh.cities[n]; if (c) { pts.push([c.lon - 5, c.lat - 4], [c.lon + 5, c.lat + 4]); } });
        return fitTo({ type: 'MultiPoint', coordinates: pts }, 70);
      }
      var START = fitTo({ type: 'Sphere' }, 6);
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
      return { go: go, stop: function () { if (anim) { cancelAnimationFrame(anim); anim = null; } } };
    }

    /* the tour: the whole view for 5 s, then Portugal and France, the rest of Europe, Thuwal, Brazil and Australia,
       each move taking 1.6 s and each stop held for 2 s. It runs only while on screen and stops for good on a drag. */
    function tour(fig, view) {
      if (reduce) { fig.classList.add('in'); return; }
      onView(fig, function () { fig.classList.add('in'); }, 0.3);
      var on = true, i = 0, timer = null, visible = false, started = false;
      function next() {
        timer = null;
        if (!on || !visible) { return; }
        view.go(i % REGIONS.length, 1600);
        i++;
        timer = setTimeout(next, 1600 + 2000);
      }
      view.onUser = function () { on = false; if (timer) { clearTimeout(timer); timer = null; } };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (visible && on && !timer) { timer = setTimeout(next, started ? 1000 : 5000); started = true; }
          if (!visible && timer) { clearTimeout(timer); timer = null; }
        }, { threshold: 0.4 }).observe(fig);
      }
    }
  }
})();
