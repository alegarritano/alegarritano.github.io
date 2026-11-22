/* Animated overlays for the research illustrations (preview only).
   Each overlay is an SVG in the illustration's own pixel space (1448 x 1086), laid over the image.
   Animations use SMIL so a whole figure can be paused with svg.pauseAnimations(). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function fixed(n) { return Math.round(n * 10) / 10; }

  /* a dot moving along a path, fading in and out */
  function mover(path, r, fill, dur, begin, glow) {
    return '<g opacity="0">' +
      (glow ? '<circle r="' + (r * 2.6) + '" fill="' + fill + '" opacity="0.28"/>' : '') +
      '<circle r="' + r + '" fill="' + fill + '"/>' +
      '<animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" path="' + path + '"/>' +
      '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/>' +
      '</g>';
  }
  /* a soft ring that breathes around a point */
  function pulse(cx, cy, r, col, dur, begin, grow) {
    grow = grow || 1.35;
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="4" opacity="0">' +
      '<animate attributeName="r" values="' + r + ';' + fixed(r * grow) + '" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0;0.8;0" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/>' +
      '</circle>';
  }
  /* marine snow, slow flakes drifting down through a box */
  function snow(n, x0, x1, y0, y1, col) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = rnd(x0, x1), d = rnd(9, 16), r = rnd(2, 4.5), sway = rnd(-25, 25);
      s += mover('M' + fixed(x) + ',' + y0 + ' q' + fixed(sway) + ',' + fixed((y1 - y0) / 2) + ' 0,' + (y1 - y0), r, col, fixed(d), fixed(-rnd(0, d)), false);
    }
    return s;
  }
  /* rising bubbles */
  function bubbles(n, x, y0, y1, spread, col, dmin, dmax, rmin, rmax) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var d = rnd(dmin, dmax), xx = x + rnd(-spread, spread);
      s += '<circle cx="' + fixed(xx) + '" cy="' + y0 + '" r="' + fixed(rnd(rmin, rmax)) + '" fill="none" stroke="' + col + '" stroke-width="3" opacity="0">' +
        '<animate attributeName="cy" values="' + y0 + ';' + y1 + '" dur="' + fixed(d) + 's" begin="' + fixed(-rnd(0, d)) + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.15;0.8;1" dur="' + fixed(d) + 's" begin="' + fixed(-rnd(0, d)) + 's" repeatCount="indefinite"/>' +
        '</circle>';
    }
    return s;
  }
  /* a puff rising from an opening and fading */
  function puffs(n, x, y, rise, col, dur) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var b = -i * dur / n, dx = rnd(-30, 30);
      s += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + col + '" opacity="0">' +
        '<animate attributeName="cy" values="' + y + ';' + (y - rise) + '" dur="' + dur + 's" begin="' + fixed(b) + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="cx" values="' + x + ';' + fixed(x + dx) + '" dur="' + dur + 's" begin="' + fixed(b) + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="r" values="8;22" dur="' + dur + 's" begin="' + fixed(b) + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;0.75;0" dur="' + dur + 's" begin="' + fixed(b) + 's" repeatCount="indefinite"/>' +
        '</circle>';
    }
    return s;
  }

  /* a microbe cut out of the illustration and moved in place: the painted original is covered with the
     background colour, then a clipped copy of the same pixels rocks, spins or bobs on top of it */
  var uid = 0, SRC = '';
  function wiggle(o) {
    var id = 'w' + (uid++), cx = o.cx, cy = o.cy, rot = o.rot || 0;
    var shape = o.r ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + o.r + '"/>'
                    : '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + o.rx + '" ry="' + o.ry + '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"/>';
    var cover = o.cover ? (o.r ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + (o.r + 4) + '" fill="' + o.cover + '"/>'
      : '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (o.rx + 6) + '" ry="' + (o.ry + 6) + '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + o.cover + '" filter="url(#soft)"/>') : '';
    var dur = o.dur || rnd(1.6, 2.6), b = fixed(-rnd(0, dur)), anim;
    if (o.spin) {
      anim = '<animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' ' + cy + '" to="' + (o.spin > 0 ? 360 : -360) + ' ' + cx + ' ' + cy + '" dur="' + Math.abs(o.spin) + 's" repeatCount="indefinite"/>';
    } else if (o.bob) {
      anim = '<animateTransform attributeName="transform" type="translate" values="0 0;' + fixed(o.bob / 3) + ' ' + (-o.bob) + ';0 0" dur="' + dur + 's" begin="' + b + 's" repeatCount="indefinite"/>';
    } else {
      var a = o.angle || 7;
      anim = '<animateTransform attributeName="transform" type="rotate" values="' + (-a) + ' ' + cx + ' ' + cy + ';' + a + ' ' + cx + ' ' + cy + ';' + (-a) + ' ' + cx + ' ' + cy + '" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="' + dur + 's" begin="' + b + 's" repeatCount="indefinite"/>';
    }
    return cover + '<clipPath id="' + id + '">' + shape + '</clipPath>' +
      '<g>' + anim + '<image href="' + SRC + '" width="1448" height="1086" clip-path="url(#' + id + ')"/></g>';
  }
  var DEFS = '<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter></defs>';

  function drop(x, y, s) {
    return '<path transform="translate(' + x + ',' + y + ') scale(' + s + ')" d="M0,-22 C6,-10 16,2 16,12 A16,16 0 0 1 -16,12 C-16,2 -6,-10 0,-22Z" fill="#f98278"/>';
  }

  var BUILD = {
    /* soil: big pulses of labelled carbon into the left jar, a steady trickle into the right,
       storage granules in the pulsed jar swell after each pulse, CO2 bubbles leave both */
    illustration_soil: function () {
      var s = DEFS + [[311,798],[498,820],[306,924],[487,938]].map(function (c) { return wiggle({ cx: c[0], cy: c[1], rx: 78, ry: 47, rot: -20, cover: '#674634', angle: 4, dur: rnd(2.6, 3.4) }); }).join('') +
        [[940,787,-16,51],[1136,789,-15,57],[991,860,-15,56],[1146,879,-16,65],[946,946,3,63],[1128,955,-16,61]].map(function (r) { return wiggle({ cx: r[0], cy: r[1], rx: r[3] + 12, ry: 22, rot: r[2], cover: '#6a4835', angle: 9 }); }).join('') + '<rect x="380" y="185" width="50" height="225" fill="#0b1220"/>' +
              '<rect x="1028" y="182" width="36" height="236" fill="#0b1220"/>';
      for (var i = 0; i < 3; i++) {
        s += '<g opacity="0">' + drop(0, 0, 1.15) +
          '<animateMotion dur="6s" begin="' + (i * 0.32) + 's" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.0001;0.22;1" calcMode="linear" path="M403,190 L403,410"/>' +
          '<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.02;0.2;0.23;1" dur="6s" begin="' + (i * 0.32) + 's" repeatCount="indefinite"/>' +
          '</g>';
      }
      for (var j = 0; j < 9; j++) {
        s += '<g opacity="0"><circle r="7" fill="#f98e8b"/>' +
          '<animateMotion dur="1.8s" begin="' + fixed(-j * 0.2) + 's" repeatCount="indefinite" path="M1045,190 L1045,418"/>' +
          '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.9;1" dur="1.8s" begin="' + fixed(-j * 0.2) + 's" repeatCount="indefinite"/>' +
          '</g>';
      }
      var cells = [[313, 800, -14], [498, 818, -14], [306, 922, -14], [486, 942, -14]];
      cells.forEach(function (c, k) {
        s += '<ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="92" ry="50" transform="rotate(' + c[2] + ' ' + c[0] + ' ' + c[1] + ')" fill="#ffd25a" opacity="0">' +
          '<animate attributeName="opacity" values="0;0;0.32;0" keyTimes="0;0.24;0.36;0.7" dur="6s" begin="' + (k * 0.12) + 's" repeatCount="indefinite"/>' +
          '</ellipse>';
      });
      s += bubbles(5, 405, 720, 520, 30, '#c9cdd3', 3.5, 5.5, 7, 13) + bubbles(5, 1045, 720, 520, 30, '#c9cdd3', 3.5, 5.5, 7, 13);
      return s;
    },

    /* pipelines: reads stream across the screen, the tree tips light in turn, the bar chart rebuilds */
    illustration_tools: function () {
      var s = '<defs><linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
      var rows = [[565, 365, 230], [558, 414, 230], [553, 462, 230], [546, 511, 232], [541, 559, 232]];
      rows.forEach(function (r, i) {
        s += '<svg x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="24" overflow="hidden"><rect y="0" width="60" height="24" fill="url(#scan)">' +
          '<animate attributeName="x" values="-60;' + r[2] + '" dur="2.4s" begin="' + fixed(i * 0.35) + 's" repeatCount="indefinite"/></rect></svg>';
      });
      [[973, 353], [970, 410], [968, 462]].forEach(function (t, i) { s += pulse(t[0], t[1], 16, '#ffffff', 3, i * 1); });
      s += '<rect x="812" y="495" width="172" height="122" fill="#aac8d4"/>';
      var bars = [[817, 566, 31, '#698fa2'], [859, 537, 31, '#e59384'], [902, 510, 32, '#d7aa51'], [945, 546, 32, '#efe4d1']];
      bars.forEach(function (b, i) {
        var h = 611 - b[1];
        s += '<rect x="' + b[0] + '" y="611" width="' + b[2] + '" height="0" rx="3" fill="' + b[3] + '" stroke="#111" stroke-width="3">' +
          '<animate attributeName="height" values="0;0;' + h + ';' + h + ';0" keyTimes="0;' + fixed(0.05 + i * 0.07) + ';' + fixed(0.25 + i * 0.07) + ';0.9;1" dur="7s" repeatCount="indefinite"/>' +
          '<animate attributeName="y" values="611;611;' + b[1] + ';' + b[1] + ';611" keyTimes="0;' + fixed(0.05 + i * 0.07) + ';' + fixed(0.25 + i * 0.07) + ';0.9;1" dur="7s" repeatCount="indefinite"/></rect>';
      });
      s += '<rect x="805" y="606" width="185" height="5" fill="#111" opacity="0.9"/>';
      s += bubbles(3, 1257, 640, 610, 8, '#ffffff', 2.5, 4, 3, 5);
      return s;
    },

    /* PhD: marine snow falls, the sponge breathes out, and molecules move round the arrows in the lens */
    illustration_symbiosis: function () {
      var s = DEFS + [[840,250],[719,448],[868,681]].map(function (c, i) { return wiggle({ cx: c[0], cy: c[1], r: 64, spin: i % 2 ? -26 : 30 }); }).join('') +
        wiggle({ cx: 1197, cy: 311, rx: 108, ry: 58, rot: -20, cover: '#091425', angle: 6 }) + wiggle({ cx: 1216, cy: 608, rx: 108, ry: 58, rot: -15, cover: '#091425', angle: 6 }) + snow(16, 110, 300, -20, 480, '#9aa3ad') + puffs(4, 387, 335, 180, '#e9dcc3', 5);
      s += pulse(455, 563, 16, '#f4ead7', 2.6, 0, 1.9);
      s += '<circle cx="983" cy="460" r="375" fill="none" stroke="#f4ead7" stroke-width="10" opacity="0"><animate attributeName="opacity" values="0;0.35;0" dur="5s" repeatCount="indefinite"/></circle>';
      var paths = [
        ['M730,370 L775,295', '#f4ead7'], ['M915,238 L970,250', '#f2c14e'], ['M1040,262 L1110,308', '#f2c14e'],
        ['M1243,365 L1243,438', '#f2c14e'], ['M1080,470 L1175,470', '#e8857a'], ['M1245,500 L1215,560', '#f2c14e'],
        ['M945,675 L995,655', '#9fc79a'], ['M795,640 L760,615', '#f2c14e'], ['M702,585 L702,520', '#f2c14e'], ['M795,420 L860,385', '#9fc79a']
      ];
      paths.forEach(function (p, i) { s += mover(p[0], 7, p[1], 2.2, fixed(i * 0.45), true); });
      s += pulse(1000, 460, 52, '#e8857a', 3.2, 0.5);
      return s;
    },

    /* hosts and their symbionts: snow, the sponge breathes, each host is traced down to its circle of microbes */
    illustration_identity: function () {
      var s = DEFS + [267,717,1173].map(function (x, i) { return wiggle({ cx: x, cy: 850, r: 112, angle: 10, dur: 6 + i }); }).join('') + snow(18, 40, 1400, -20, 700, '#8f98a3') + puffs(3, 1205, 235, 150, '#e9dcc3', 5) + puffs(3, 1047, 345, 120, '#e9dcc3', 5.6);
      var links = [[300, 570, 267, 720], [717, 575, 717, 720], [1150, 600, 1173, 720]];
      links.forEach(function (l, i) {
        var len = Math.hypot(l[2] - l[0], l[3] - l[1]);
        s += '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="#f4ead7" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + fixed(len) + '" stroke-dashoffset="' + fixed(len) + '" opacity="0.9">' +
          '<animate attributeName="stroke-dashoffset" values="' + fixed(len) + ';0;0;' + fixed(len) + '" keyTimes="0;0.2;0.85;1" dur="7.5s" begin="' + (i * 2.5) + 's" repeatCount="indefinite"/></line>';
        var cx = [267, 717, 1173][i];
        s += '<circle cx="' + cx + '" cy="850" r="128" fill="none" stroke="#f4ead7" stroke-width="5" opacity="0">' +
          '<animate attributeName="opacity" values="0;0;0.9;0" keyTimes="0;0.18;0.3;0.85" dur="7.5s" begin="' + (i * 2.5) + 's" repeatCount="indefinite"/></circle>';
        s += '<circle cx="' + cx + '" cy="850" r="140" fill="none" stroke="#f4ead7" stroke-width="3" stroke-dasharray="10 14" opacity="0.45">' +
          '<animateTransform attributeName="transform" type="rotate" from="0 ' + cx + ' 850" to="' + (i % 2 ? -360 : 360) + ' ' + cx + ' 850" dur="40s" repeatCount="indefinite"/></circle>';
      });
      return s;
    },

    /* hosts and places: drifting particles, the magnified patches inside each host glow in turn */
    hosts_microbiomes: function () {
      var s = DEFS + wiggle({ cx: 580, cy: 735, rx: 72, ry: 98, cover: '#06101a', bob: 10, dur: 4 }) + wiggle({ cx: 752, cy: 700, rx: 74, ry: 128, cover: '#06101a', bob: 12, dur: 5 }) + snow(14, 40, 1400, -20, 800, '#8f98a3');
      var patches = [[385, 555, 85, 80], [592, 590, 70, 60], [950, 630, 85, 70], [1262, 655, 82, 75], [222, 885, 75, 72], [382, 885, 75, 72]];
      patches.forEach(function (p, i) {
        s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] + '" ry="' + p[3] + '" fill="none" stroke="#fff3d6" stroke-width="5" opacity="0">' +
          '<animate attributeName="opacity" values="0;0.95;0;0" keyTimes="0;0.15;0.3;1" dur="6.6s" begin="' + fixed(i * 1.1) + 's" repeatCount="indefinite"/></ellipse>';
      });
      /* algae and diatom bob gently: a faint halo that drifts up and down with them */
      [[570, 775, 55], [755, 760, 70], [990, 840, 75]].forEach(function (a, i) {
        s += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '" fill="#d6e8a0" opacity="0.12">' +
          '<animate attributeName="cy" values="' + a[1] + ';' + (a[1] - 12) + ';' + a[1] + '" dur="' + (4 + i) + 's" repeatCount="indefinite"/></circle>';
      });
      s += bubbles(6, 760, 980, 520, 300, '#b9c4cf', 6, 10, 4, 8);
      return s;
    },

    /* carbon fixation: CO2 rises from light and from rock into the tree, the pathways at its centre light in turn,
       and a slow sweep passes over the branches */
    cfp_illustration: function () {
      var s = '<defs><radialGradient id="sweep" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="#bfe1f0" stop-opacity="0"/><stop offset="0.95" stop-color="#bfe1f0" stop-opacity="0.35"/><stop offset="1" stop-color="#bfe1f0" stop-opacity="0"/></radialGradient></defs>';
      s += DEFS + wiggle({ cx: 1036, cy: 885, rx: 100, ry: 44, rot: -29, cover: '#030b17', angle: 6 }) + wiggle({ cx: 1179, cy: 891, rx: 95, ry: 44, rot: -29, cover: '#030b17', angle: 7 }) +
        wiggle({ cx: 185, cy: 896, rx: 152, ry: 42, rot: -13, cover: '#030b17', angle: 3, dur: 3.2 }) + wiggle({ cx: 370, cy: 909, rx: 88, ry: 54, rot: -24, cover: '#030b17', angle: 5 });
      s += '<path d="M720,460 L720,0 A460,460 0 0 1 1045,135 Z" fill="url(#sweep)" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 720 460" to="360 720 460" dur="24s" repeatCount="indefinite"/></path>';
      var mols = [[573, 330, 80], [723, 285, 70], [870, 330, 90], [540, 450, 75], [720, 445, 55], [897, 467, 65], [627, 580, 55], [810, 580, 70]];
      mols.forEach(function (m, i) {
        s += '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="' + m[2] + '" fill="#fff6d8" opacity="0"><animate attributeName="opacity" values="0;0.22;0;0" keyTimes="0;0.12;0.25;1" dur="9.6s" begin="' + fixed(i * 1.2) + 's" repeatCount="indefinite"/></circle>';
      });
      function co2(path, dur, begin) {
        return '<g opacity="0"><circle cx="-16" r="9" fill="#e8706a"/><circle r="10" fill="#6b6b6b"/><circle cx="16" r="9" fill="#e8706a"/>' +
          '<animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" path="' + path + '"/>' +
          '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.75;1" dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite"/></g>';
      }
      s += co2('M150,983 C220,860 420,700 690,470', 6, 0) + co2('M150,983 C260,900 460,720 690,470', 6, -3) +
           co2('M950,983 C900,860 820,700 740,470', 6, -1.5) + co2('M950,983 C980,880 860,690 740,470', 6, -4.5);
      s += pulse(150, 775, 85, '#ffd36b', 3.5, 0, 1.4);
      return s;
    },

    /* master's: the palm waste ferments, hydrogen leaves the first jar, the effluent moves on, methane leaves the second */
    illustration_bioenergy: function () {
      var s = DEFS + [[593,690,-29],[690,733,-33],[742,676,34],[632,798,31],[740,816,-26]].map(function (r) { return wiggle({ cx: r[0], cy: r[1], rx: 40, ry: 15, rot: r[2], cover: '#b06c23', angle: 12 }); }).join('') +
        [[1160,671,-35],[1317,683,40],[1229,724,-35],[1184,828,-30],[1293,804,-30]].map(function (r) { return wiggle({ cx: r[0], cy: r[1], rx: 40, ry: 15, rot: r[2], cover: '#7e7a31', angle: 12 }); }).join('');
      s += bubbles(7, 650, 870, 600, 90, '#f6d8a6', 3, 5, 5, 10) + bubbles(7, 1218, 870, 600, 90, '#e7e2a2', 3.5, 5.5, 5, 10);
      var pipe = 'M830,725 L880,725 Q928,725 930,680 L934,650 Q938,622 975,622 L1040,622';
      for (var i = 0; i < 4; i++) { s += mover(pipe, 7, '#d6a04a', 3.2, fixed(-i * 0.8), false); }
      function gas(x, label, col, beginOff) {
        var g = '';
        for (var k = 0; k < 3; k++) {
          var b = fixed(beginOff - k * 1.3);
          g += '<g opacity="0"><circle r="15" fill="none" stroke="' + col + '" stroke-width="4"/>' +
            '<animateMotion dur="3.9s" begin="' + b + 's" repeatCount="indefinite" path="M' + x + ',305 q' + (k % 2 ? 18 : -18) + ',-70 0,-170"/>' +
            '<animate attributeName="opacity" values="0;1;0" dur="3.9s" begin="' + b + 's" repeatCount="indefinite"/></g>';
        }
        g += '<text x="' + (x + 38) + '" y="200" fill="' + col + '" font-family="Inter, sans-serif" font-weight="700" font-size="44" opacity="0">' + label +
          '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="3.9s" begin="' + beginOff + 's" repeatCount="indefinite"/></text>';
        return g;
      }
      s += gas(653, 'H₂', '#e8eef2', 0) + gas(1222, 'CH₄', '#e8eef2', -1.9);
      return s;
    }
  };

  function attach(img) {
    var key = (img.getAttribute('src') || '').replace(/^.*\//, '').replace(/\.webp$/, '');
    if (!BUILD[key]) { return; }
    var fig = img.closest('figure');
    var wrap = document.createElement('div');
    wrap.className = 'fig-anim';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1448 1086');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    SRC = img.currentSrc || img.src;
    svg.innerHTML = BUILD[key]();
    wrap.appendChild(svg);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fig-pause';
    wrap.appendChild(btn);
    var user = reduce ? 'paused' : 'auto';
    function set(run) { if (run) { svg.unpauseAnimations(); } else { svg.pauseAnimations(); } }
    function label() { var p = user === 'paused'; btn.textContent = p ? '▶' : '❚❚'; btn.setAttribute('aria-label', p ? 'Play this animation' : 'Pause this animation'); }
    label();
    set(false);
    var visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        set(visible && user !== 'paused');
      }, { threshold: 0.15 }).observe(wrap);
    }
    btn.addEventListener('click', function () { user = user === 'paused' ? 'auto' : 'paused'; label(); set(visible && user !== 'paused'); });
    if (fig) { fig.classList.add('has-anim'); }
  }

  document.querySelectorAll('figure.ill img').forEach(attach);
})();
