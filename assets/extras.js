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
    var title = document.querySelector('.content .page-title');
    var intro = title && title.parentNode.querySelector('p.intro');
    var anchor = intro || title;
    if (!anchor) { return; }
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
                    'Umeå': [10, 4, 'start'], 'Lisbon': [-10, 4, 'end'], 'Kiel': [10, -4, 'start'], 'Brisbane': [10, -6, 'start'] };
      list.sort(function (a, b) { return b.papers - a.papers; });
      list.forEach(function (c, i) {
        var lon = wrapLon(c.lon), p = P(lon, c.lat), r = 3 + 2.2 * Math.sqrt(c.papers);
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
          labels += '<text class="pin-label" style="--d:' + (c === home ? 0 : 500 + i * 140) + 'ms" x="' + (p[0] + L[0]).toFixed(1) + '" y="' + (p[1] + L[1]).toFixed(1) + '" text-anchor="' + L[2] + '">' + c.city + '</text>';
        }
      });
      var grat = '';
      for (var lon2 = -150; lon2 <= 180; lon2 += 30) { var x = P(lon2, 0)[0]; grat += '<line x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="' + H + '"/>'; }
      for (var lat = 60; lat >= -45; lat -= 15) { var y = P(0, lat)[1]; grat += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) + '"' + (lat === 0 ? ' class="eq"' : '') + '/>'; }
      var n = list.length - 1;
      var fig = document.createElement('figure');
      fig.className = 'netmap';
      fig.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="World map of co-author institutions, linked to Sydney: ' +
        list.filter(function (c) { return c !== home; }).map(function (c) { return c.city; }).join(', ') + '">' +
        '<defs><clipPath id="mapclip"><rect width="' + W + '" height="' + H + '" rx="10"/></clipPath></defs><g clip-path="url(#mapclip)">' +
        '<rect width="' + W + '" height="' + H + '" class="sea"/><g class="land"></g><g class="grat">' + grat + '</g>' + arcs + dots + labels + '</g></svg>' +
        '<figcaption>Where co-authors on my papers are based, ' + data.institutions.length + ' institutions in ' + n + ' other cities. Point at a dot for the institutions. Source: OpenAlex affiliations for the papers with a DOI on the Publications page.</figcaption>';
      anchor.parentNode.insertBefore(fig, anchor.nextSibling);
      if (reduce) { fig.classList.add('in'); } else { onView(fig, function () { fig.classList.add('in'); }, 0.3); }

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
