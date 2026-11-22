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

  /* ---------- Networks: a globe linking Sydney to the cities of my co-authors ---------- */
  if (page === 'networks') {
    var fig = document.getElementById('collab-map');
    if (!fig) { return; }
    function load(src) {
      return new Promise(function (ok, bad) { var sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
    }
    /* d3-geo draws the orthographic globe and the great circle routes, topojson-client decodes the coastlines */
    load('https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js')
      .then(function () { return load('https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js'); })
      .then(function () { return load('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'); })
      .then(function () {
        return Promise.all([
          fetch('assets/collaborations.json').then(function (r) { return r.json(); }),
          fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(function (r) { return r.json(); })
        ]);
      })
      .then(function (res) { globe(res[0], res[1]); })
      .catch(function () {});

    function globe(data, topo) {
      var d3 = window.d3, S = 600, R = 282;
      var cities = {};
      data.institutions.forEach(function (i) {
        if (i.lat == null) { return; }
        var c = cities[i.city] || (cities[i.city] = { city: i.city, country: i.country, lat: i.lat, lon: i.lon, papers: 0, names: [] });
        c.papers = Math.max(c.papers, i.papers);
        c.names.push(i.name + ' (' + i.papers + (i.papers === 1 ? ' paper' : ' papers') + ')');
      });
      var list = Object.keys(cities).map(function (k) { return cities[k]; }).sort(function (a, b) { return b.papers - a.papers; });
      var home = cities['Sydney'];
      /* labels that would sit on top of a neighbour go on the left of their dot */
      var LEFT = { 'São Paulo': 1, 'Kiel': 1 };
      var proj = d3.geoOrthographic().scale(R).translate([S / 2, S / 2]).clipAngle(90).precision(0.5);
      var path = d3.geoPath(proj);
      var land = window.topojson.feature(topo, topo.objects.land);
      var grat = d3.geoGraticule10();
      var g = '<defs><radialGradient id="ocean" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f4f9fa"/><stop offset="1" stop-color="#cfe1e6"/></radialGradient>' +
        '<radialGradient id="shade" cx="50%" cy="50%" r="50%"><stop offset="0.75" stop-color="#0b2f3a" stop-opacity="0"/><stop offset="1" stop-color="#0b2f3a" stop-opacity="0.18"/></radialGradient></defs>' +
        '<clipPath id="disc"><circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + R + '"/></clipPath>' +
        '<g clip-path="url(#disc)"><path class="sphere"/><path class="grat"/><path class="land"/><g class="routes"></g><g class="pins"></g></g><circle class="rim" cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + R + '"/>';
      fig.innerHTML = '<svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="Globe linking Sydney to the cities where my co-authors are based: ' +
        list.filter(function (c) { return c !== home; }).map(function (c) { return c.city; }).join(', ') + '">' + g + '</svg>';
      var svg = fig.querySelector('svg'), NSs = 'http://www.w3.org/2000/svg';
      var sphereP = svg.querySelector('.sphere'), gratP = svg.querySelector('.grat'), landP = svg.querySelector('.land');
      var routes = [], pins = [];
      list.forEach(function (c, i) {
        if (c !== home) {
          var r = document.createElementNS(NSs, 'path');
          r.setAttribute('class', 'route'); r.setAttribute('pathLength', '1'); r.style.setProperty('--d', (i * 140) + 'ms');
          svg.querySelector('.routes').appendChild(r);
          routes.push([r, { type: 'LineString', coordinates: [[home.lon, home.lat], [c.lon, c.lat]] }]);
        }
        var pg = document.createElementNS(NSs, 'g');
        pg.setAttribute('class', 'pin' + (c === home ? ' home' : ''));
        pg.style.setProperty('--d', (c === home ? 0 : 500 + i * 140) + 'ms');
        var rad = 4 + 3 * Math.sqrt(c.papers);
        pg.innerHTML = '<title>' + c.city + ': ' + c.names.join(', ') + '</title><circle class="ring" r="' + rad.toFixed(1) + '"/><circle class="dot" r="' + rad.toFixed(1) + '"/><text class="pin-label" x="' + (LEFT[c.city] ? -(rad + 5) : rad + 5).toFixed(1) + '" y="5" text-anchor="' + (LEFT[c.city] ? 'end' : 'start') + '">' + c.city + ' <tspan class="cc">' + (c.country || '') + '</tspan></text>';
        svg.querySelector('.pins').appendChild(pg);
        pins.push([pg, c]);
      });
      var rot = [0, 0], zoom = 1;
      function render() {
        proj.rotate(rot).scale(R * zoom);
        var centre = [-rot[0], -rot[1]];
        sphereP.setAttribute('d', path({ type: 'Sphere' }));
        gratP.setAttribute('d', path(grat));
        landP.setAttribute('d', path(land));
        routes.forEach(function (r) { r[0].setAttribute('d', path(r[1]) || ''); });
        pins.forEach(function (p) {
          var c = p[1], vis = d3.geoDistance([c.lon, c.lat], centre) < Math.min(Math.PI / 2 - 0.05, Math.asin(Math.min(1, 1 / zoom)) - 0.02);
          p[0].style.display = vis ? '' : 'none';
          if (vis) { var xy = proj([c.lon, c.lat]); p[0].setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ',' + xy[1].toFixed(1) + ')'); }
        });
      }
      function centreOf(names) {
        var pts = names.map(function (n) { return cities[n]; }).filter(Boolean);
        var lon = d3.mean(pts, function (c) { return c.lon; }), lat = d3.mean(pts, function (c) { return c.lat; });
        return [-lon, -Math.max(-60, Math.min(60, lat)) * 0.8];
      }
      var REGIONS = [['Lisbon', 'Perpignan'], ['Konstanz', 'Kiel', 'Kongens Lyngby', 'Umeå'], ['Thuwal'], ['Rio de Janeiro', 'São Paulo'], ['Sydney', 'Brisbane']];
      var ZOOM = [2.6, 2.2, 1.7, 2.4, 2.4];
      rot = reduce ? centreOf(['Thuwal']) : centreOf(REGIONS[0]);
      zoom = reduce ? 1 : ZOOM[0];
      render();
      if (reduce) { fig.classList.add('in'); } else { onView(fig, function () { fig.classList.add('in'); }, 0.3); }

      /* the tour turns the globe to each region every 5 s; dragging the globe stops it and spins it by hand */
      var tourOn = !reduce, step = 1, timer = null, anim = null, onScreen = false;
      function turnTo(target, z1, ms) {
        var from = rot.slice(), z0 = zoom, dl = ((target[0] - from[0] + 540) % 360) - 180, t0 = performance.now();
        if (anim) { cancelAnimationFrame(anim); }
        function frame(t) {
          var f = Math.min(1, (t - t0) / ms), e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
          rot = [from[0] + dl * e, from[1] + (target[1] - from[1]) * e];
          /* pull back to the whole globe half way through long turns, then close in on the next region */
          var dip = Math.abs(dl) > 40 ? Math.sin(Math.PI * e) * (Math.min(z0, z1) - 1) : 0;
          zoom = z0 + (z1 - z0) * e - dip;
          render();
          anim = f < 1 ? requestAnimationFrame(frame) : null;
        }
        anim = requestAnimationFrame(frame);
      }
      function tick() {
        timer = null;
        if (!tourOn || !onScreen) { return; }
        turnTo(centreOf(REGIONS[step % REGIONS.length]), ZOOM[step % REGIONS.length], 2200);
        step++;
        timer = setTimeout(tick, 5000);
      }
      function stopTour() { tourOn = false; if (timer) { clearTimeout(timer); timer = null; } if (anim) { cancelAnimationFrame(anim); anim = null; } }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          onScreen = es[0].isIntersecting;
          if (onScreen && tourOn && !timer) { timer = setTimeout(tick, 5000); }
          if (!onScreen && timer) { clearTimeout(timer); timer = null; }
        }, { threshold: 0.4 }).observe(fig);
      }
      var drag = null;
      svg.addEventListener('pointerdown', function (e) {
        stopTour();
        drag = { x: e.clientX, y: e.clientY, r: rot.slice() };
        if (zoom !== 1) { zoom = 1; render(); }
        svg.setPointerCapture(e.pointerId);
      });
      svg.addEventListener('pointermove', function (e) {
        if (!drag) { return; }
        var k = 180 / svg.getBoundingClientRect().width;
        rot = [drag.r[0] + (e.clientX - drag.x) * k, Math.max(-75, Math.min(75, drag.r[1] - (e.clientY - drag.y) * k))];
        render();
      });
      function up() { drag = null; }
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
    }
  }
})();
