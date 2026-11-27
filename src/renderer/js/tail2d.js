/* Hand-drawn SVG tail behind the Three.js canvas.
   The centreline is sampled into a tapered ribbon and closed with a real
   half-circle cap, so the tip is round without looking like a separate ball. */
(function () {
  'use strict';

  var svg = document.getElementById('tail2d');
  var path = document.getElementById('tail2dPath');
  var group = document.getElementById('tail2dGroup');
  if (!path || !group) return;

  var P0 = [258, 286], P1 = [296, 280], P2 = [324, 252], P3 = [326, 226];
  var AWAKE = [P0, P1, P2, P3], SLEEP = [[258, 286], [286, 300], [316, 304], [344, 300]];
  var sleeping = false, sleepMix = 0;
  var N = 24, CAP = 10;
  var color = '#101010';
  var t0 = 0, rafId = 0, hidden = false;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function point(t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0],
            a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]];
  }

  function tangent(t) {
    var u = 1 - t;
    var dx = 3 * u * u * (P1[0] - P0[0]) + 6 * u * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]);
    var dy = 3 * u * u * (P1[1] - P0[1]) + 6 * u * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]);
    var len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  }

  function build(t) {
    var left = [], right = [], i, p, tg, nx, ny, half;
    for (i = 0; i <= N; i++) {
      var s = i / N;
      p = point(s);
      tg = tangent(s);
      nx = -tg[1]; ny = tg[0];
      half = lerp(10, 5, smooth(s));
      left.push([p[0] + nx * half, p[1] + ny * half]);
      right.push([p[0] - nx * half, p[1] - ny * half]);
    }

    var d = 'M' + left[0][0].toFixed(2) + ' ' + left[0][1].toFixed(2);
    for (i = 1; i <= N; i++) d += 'L' + left[i][0].toFixed(2) + ' ' + left[i][1].toFixed(2);

    // round cap: sweep from left tip to right tip along the forward half
    var tip = point(1), dir = tangent(1), ang = Math.atan2(dir[1], dir[0]);
    var r = 5;
    for (i = 1; i <= CAP; i++) {
      var a = ang + Math.PI / 2 - (i / CAP) * Math.PI;
      d += 'L' + (tip[0] + Math.cos(a) * r).toFixed(2) + ' ' + (tip[1] + Math.sin(a) * r).toFixed(2);
    }
    for (i = N - 1; i >= 0; i--) d += 'L' + right[i][0].toFixed(2) + ' ' + right[i][1].toFixed(2);
    return d + 'Z';
  }

  function setColor(c) {
    if (!c) return;
    color = c;
    path.setAttribute('fill', color);
  }

  function isVisible() {
    if (hidden || document.hidden || !svg) return false;
    return getComputedStyle(svg).display !== 'none';
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    t0 = 0;
  }

  function start() {
    if (rafId || !isVisible()) return;
    rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    if (!isVisible()) { stop(); return; }
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    sleepMix += ((sleeping ? 1 : 0) - sleepMix) * 0.08;
    var i, m = sleepMix;
    P0 = [lerp(AWAKE[0][0], SLEEP[0][0], m), lerp(AWAKE[0][1], SLEEP[0][1], m)];
    P1 = [lerp(AWAKE[1][0], SLEEP[1][0], m), lerp(AWAKE[1][1], SLEEP[1][1], m)];
    P2 = [lerp(AWAKE[2][0], SLEEP[2][0], m), lerp(AWAKE[2][1], SLEEP[2][1], m)];
    P3 = [lerp(AWAKE[3][0], SLEEP[3][0], m), lerp(AWAKE[3][1], SLEEP[3][1], m)];
    var angle = Math.sin(t * 1.25) * 2.8 + Math.sin(t * 0.51 + 1.3) * 0.9;
    var flick = Math.sin(t * 1.65 + 0.7) * 3.2;
    P2[0] += flick * 0.55 * (1 - m);
    P2[1] -= flick * 0.2 * (1 - m);
    P3[0] += flick * (1 - m);
    P3[1] += flick * 0.35 * (1 - m);
    if (m > 0) {
      var sway = Math.sin(t * 0.9) * 3.0 * m;
      P2[0] += sway * 0.55; P2[1] += Math.sin(t * 1.8) * 0.8 * m;
      P3[0] += sway; P3[1] += Math.sin(t * 1.8) * 1.2 * m;
      angle = angle * (1 - m) + Math.sin(t * 0.9) * 0.8 * m;
    }
    group.setAttribute('transform', 'rotate(' + angle.toFixed(2) + ' 258 286)');
    path.setAttribute('d', build(t));
    if (isVisible()) rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
  window.tail2d = {
    setColor: setColor,
    setSleeping: function (v) { sleeping = !!v; },
    setHidden: function (v) { hidden = !!v; if (hidden) stop(); else start(); }
  };
  setColor(color);
  start();
})();




