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

  /* ---------- Networks: where co-authors on the published papers are based ---------- */
  if (page === 'networks') {
    var fig = document.getElementById('collab-map');
    if (!fig) { return; }
    fetch('assets/collaborations.json').then(function (r) { return r.json(); }).then(function (data) {
      /* the map runs from 170 W to 190 E so that Sydney, Europe, Brazil and French Polynesia all sit on one sheet */
      var LON0 = -170, LON1 = 190, LAT0 = 72, LAT1 = -52, W = 960;
      var k = W / (LON1 - LON0), H = Math.round((LAT0 - LAT1) * k);
      function wrapLon(lon) { return lon < LON0 ? lon + 360 : lon > LON1 ? lon - 360 : lon; }
      function P(lon, lat) { return [(lon - LON0) * k, (LAT0 - lat) * k]; }
      var cities = {};
      data.institutions.forEach(function (i) {
        if (i.lat == null) { return; }
        var city = i.city;
        var c = cities[city] || (cities[city] = { city: city, lat: i.lat, lon: i.lon, papers: 0, names: [] });
        c.papers = Math.max(c.papers, i.papers);
        c.names.push(i.name + ' (' + i.papers + (i.papers === 1 ? ' paper' : ' papers') + ')');
      });
      var list = Object.keys(cities).map(function (k2) { return cities[k2]; });
      var home = cities['Sydney'];
      var hp = P(home.lon, home.lat);
      var arcs = '', dots = '', labels = '';
      var LABEL = { 'Sydney': [-10, 30, 'end'], 'Thuwal': [10, 5, 'start'], 'Rio de Janeiro': [12, 14, 'start'], 'São Paulo': [-12, 18, 'end'],
                    'Umeå': [10, 4, 'start'], 'Lisbon': [-10, 4, 'end'], 'Kiel': [-10, -4, 'end'], 'Brisbane': [10, -6, 'start'],
                    'Konstanz': [10, 12, 'start', 1], 'Kongens Lyngby': [10, -6, 'start', 1], 'Perpignan': [10, 12, 'start', 1] };
      var XY = {};
      list.sort(function (a, b) { return b.papers - a.papers; });
      list.forEach(function (c, i) {
        var lon = wrapLon(c.lon), p = P(lon, c.lat), r = 3 + 2.2 * Math.sqrt(c.papers);
        XY[c.city] = p;
        if (c !== home) {
          /* go the short way round: Papetoai is reached eastwards across the Pacific */
          var east = c.lon - home.lon < -180, tx = east ? P(c.lon + 360, c.lat)[0] : p[0], dx = tx - hp[0];
          var mx = (hp[0] + tx) / 2, my = Math.max(12, Math.min(hp[1], p[1]) - Math.min(140, Math.abs(dx) * 0.28 + 20));
          var dd = 'M' + hp[0].toFixed(1) + ',' + hp[1].toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + tx.toFixed(1) + ',' + p[1].toFixed(1);
          arcs += '<path class="route" style="--d:' + (i * 140) + 'ms" pathLength="1" d="' + dd + '"/>';
          /* an arc that leaves the right edge comes back in on the left */
          if (east) { arcs += '<path class="route" style="--d:' + (i * 140) + 'ms" pathLength="1" transform="translate(' + (-W) + ',0)" d="' + dd + '"/>'; }
        }
        dots += '<g class="pin' + (c === home ? ' home' : '') + '" style="--d:' + (c === home ? 0 : 500 + i * 140) + 'ms"><title>' + c.city + ': ' + c.names.join(', ') + '</title>' +
          '<circle class="ring" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/>' +
          '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/></g>';
        var L = LABEL[c.city];
        if (L) {
          labels += '<text class="pin-label' + (L[3] ? ' minor' : '') + '" data-p="' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ',' + L[0] + ',' + L[1] + '" style="--d:' + (c === home ? 0 : 500 + i * 140) + 'ms" x="' + (p[0] + L[0]).toFixed(1) + '" y="' + (p[1] + L[1]).toFixed(1) + '" text-anchor="' + L[2] + '">' + c.city + '</text>';
        }
      });
      var grat = '';
      for (var lon2 = -150; lon2 <= 180; lon2 += 30) { var x = P(lon2, 0)[0]; grat += '<line x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="' + H + '"/>'; }
      for (var lat = 60; lat >= -45; lat -= 15) { var y = P(0, lat)[1]; grat += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) + '"' + (lat === 0 ? ' class="eq"' : '') + '/>'; }
      var n = list.length - 1;
      fig.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="World map of co-author institutions, linked to Sydney: ' +
        list.filter(function (c) { return c !== home; }).map(function (c) { return c.city; }).join(', ') + '">' +
        '<defs><clipPath id="mapclip"><rect width="' + W + '" height="' + H + '" rx="10"/></clipPath></defs><g clip-path="url(#mapclip)">' +
        '<rect width="' + W + '" height="' + H + '" class="sea"/><g class="land"></g><g class="grat">' + grat + '</g>' + arcs + dots + labels + '</g></svg>';
      if (reduce) { fig.classList.add('in'); } else { onView(fig, function () { fig.classList.add('in'); }, 0.3); }

      /* zoom and pan: buttons, double click, trackpad pinch (ctrl + wheel), drag, and two finger pinch on touch screens.
         Dots, rings and labels keep their size on screen while the map grows. */
      var svg = fig.querySelector('svg'), view = { x: 0, y: 0, w: W, h: H }, MAXZ = 8;
      var base = [];
      svg.querySelectorAll('.pin circle').forEach(function (c) { base.push([c, +c.getAttribute('r')]); });
      var labels0 = [];
      svg.querySelectorAll('.pin-label').forEach(function (t) { labels0.push([t].concat(t.getAttribute('data-p').split(',').map(Number))); });
      function apply() {
        var z = W / view.w;
        svg.setAttribute('viewBox', view.x.toFixed(1) + ' ' + view.y.toFixed(1) + ' ' + view.w.toFixed(1) + ' ' + view.h.toFixed(1));
        base.forEach(function (b) { b[0].setAttribute('r', (b[1] / Math.sqrt(z)).toFixed(2)); });
        labels0.forEach(function (l) { l[0].setAttribute('x', (l[1] + l[3] / z).toFixed(1)); l[0].setAttribute('y', (l[2] + l[4] / z).toFixed(1)); });
        svg.style.setProperty('--z', z);
        fig.classList.toggle('zoomed', z > 1.01);
      }
      function zoomAt(f, cx, cy) {
        var nw = Math.min(W, Math.max(W / MAXZ, view.w / f)), nh = nw * H / W;
        var rx = (cx - view.x) / view.w, ry = (cy - view.y) / view.h;
        view.x = cx - rx * nw; view.y = cy - ry * nh; view.w = nw; view.h = nh;
        clamp(); apply();
      }
      function clamp() {
        view.x = Math.min(W - view.w, Math.max(0, view.x));
        view.y = Math.min(H - view.h, Math.max(0, view.y));
      }
      function toMap(ev) {
        var r = svg.getBoundingClientRect();
        return [view.x + (ev.clientX - r.left) / r.width * view.w, view.y + (ev.clientY - r.top) / r.height * view.h];
      }
      svg.addEventListener('dblclick', function (e) { var p = toMap(e); zoomAt(e.shiftKey ? 1 / 1.8 : 1.8, p[0], p[1]); });
      svg.addEventListener('wheel', function (e) {
        if (!e.ctrlKey) { return; }
        e.preventDefault();
        var p = toMap(e); zoomAt(Math.exp(-e.deltaY * 0.01), p[0], p[1]);
      }, { passive: false });
      var pts = {}, drag = null, pinch = null;
      svg.addEventListener('pointerdown', function (e) {
        pts[e.pointerId] = [e.clientX, e.clientY];
        var ids = Object.keys(pts);
        if (ids.length === 1 && W / view.w > 1.01) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; svg.setPointerCapture(e.pointerId); }
        if (ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]];
          pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: view.w }; drag = null;
        }
      });
      svg.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) { return; }
        pts[e.pointerId] = [e.clientX, e.clientY];
        var r = svg.getBoundingClientRect(), ids = Object.keys(pts);
        if (pinch && ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          var mid = toMap({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 });
          zoomAt(view.w / (pinch.w * pinch.d / d), mid[0], mid[1]);
        } else if (drag) {
          view.x = drag.vx - (e.clientX - drag.x) / r.width * view.w;
          view.y = drag.vy - (e.clientY - drag.y) / r.height * view.h;
          clamp(); apply();
        }
      });
      function up(e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) { pinch = null; } if (!Object.keys(pts).length) { drag = null; } }
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
      apply();

      /* the tour: zoom into one region, back out to the whole map, then the next region, a change every 5 s.
         It stops for good as soon as the reader zooms or drags, and only runs while the map is on screen. */
      var REGIONS = [['Lisbon', 'Perpignan'], ['Konstanz', 'Kiel', 'Kongens Lyngby', 'Umeå'], ['Thuwal'], ['Rio de Janeiro', 'São Paulo'], ['Sydney', 'Brisbane']];
      function boxFor(names) {
        var xs = [], ys = [];
        names.forEach(function (nm) { if (XY[nm]) { xs.push(XY[nm][0]); ys.push(XY[nm][1]); } });
        if (!xs.length) { return null; }
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var w = Math.max((x1 - x0) * 1.9, (y1 - y0) * 1.9 * W / H, W / 7), h = w * H / W;
        var b = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
        b.x = Math.min(W - b.w, Math.max(0, b.x)); b.y = Math.min(H - b.h, Math.max(0, b.y));
        return b;
      }
      var tourOn = !reduce, tourStep = 0, tourTimer = null, anim = null, onScreen = false;
      function glide(to, ms) {
        var from = { x: view.x, y: view.y, w: view.w, h: view.h }, t0 = performance.now();
        if (anim) { cancelAnimationFrame(anim); }
        function step(t) {
          var f = Math.min(1, (t - t0) / ms), e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
          view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
          apply();
          anim = f < 1 ? requestAnimationFrame(step) : null;
        }
        anim = requestAnimationFrame(step);
      }
      var WHOLE = { x: 0, y: 0, w: W, h: H };
      function tick() {
        tourTimer = null;
        if (!tourOn || !onScreen) { return; }
        var region = tourStep % REGIONS.length, names = REGIONS[region].filter(function (nm) { return XY[nm]; });
        glide(boxFor(names) || WHOLE, 2000);
        tourStep++;
        tourTimer = setTimeout(tick, 5000);
      }
      function stopTour() {
        if (!tourOn) { return; }
        tourOn = false;
        if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
        if (anim) { cancelAnimationFrame(anim); anim = null; }
      }
      ['pointerdown', 'dblclick', 'wheel'].forEach(function (ev) { svg.addEventListener(ev, stopTour, { capture: true, passive: true }); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          onScreen = es[0].isIntersecting;
          if (onScreen && tourOn && !tourTimer) { tourTimer = setTimeout(tick, tourStep ? 1200 : 2500); }
          if (!onScreen && tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
        }, { threshold: 0.4 }).observe(fig);
      }

      /* coastlines: Natural Earth land at 1:110m from the world-atlas package, decoded with topojson-client */
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
      sc.onload = function () {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(function (r) { return r.json(); }).then(function (topo) {
          var land = window.topojson.feature(topo, topo.objects.land), d = '';
          land.features.forEach(function (f) {
            var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
            polys.forEach(function (poly) {
              poly.forEach(function (ring) {
                var prev = null;
                ring.forEach(function (pt, j) {
                  var lonw = wrapLon(pt[0]), q = P(lonw, pt[1]);
                  var jump = prev !== null && Math.abs(lonw - prev) > 180;
                  d += (j === 0 || jump ? 'M' : 'L') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
                  prev = lonw;
                });
              });
            });
          });
          var path = document.createElementNS(NS, 'path');
          path.setAttribute('d', d);
          fig.querySelector('.land').appendChild(path);
        }).catch(function () {});
      };
      document.head.appendChild(sc);
    });
  }
})();
