/* FX · 自由弹奏音符可视化引擎（Patatap 式爆发 + 何同学式上升光点）
 * Canvas 2D，零图片零外部库；粒子池 ≤120，空闲自动休眠。容器合规。
 * 映射（2026-09-07 用户修订）：音级=形状，音区=大小（高音更小更轻快），乐器=色系；
 * 形状从琴键位弹射而出，可飞到演奏区任意位置；背景脉动弱化；时长加长。
 */
window.FX = (function () {
  'use strict';

  var BASE_BG = [13, 15, 23];
  var FAMILIES = [
    { main: '#4da3ff', alt: '#67e0c8', pulse: [20, 48, 84] },   // 钢琴 蓝青
    { main: '#ff6b9d', alt: '#8b7bff', pulse: [44, 30, 66] },   // 弦乐 粉紫
    { main: '#ffd257', alt: '#ff9a5c', pulse: [52, 40, 26] }    // 单簧管 金橙
  ];
  var SIZE_BAND = [[34, 52], [20, 30], [10, 18]]; // 低/中/高 尺寸带（互不重叠，带内随机）
  var SPEED_F = [0.85, 1.0, 1.35];   // 高音更轻快
  var RISE_R = [4.5, 3.2, 2.2];      // 长按光点基础半径随音区递减
  var POOL_CAP = 120;

  var canvas, ctx, dpr = 1, W = 0, H = 0;
  var pool = [];
  var family = 0;
  var holds = {};          // id -> {x, reg, next}
  var bgAmt = 0, bgT0 = 0;
  var running = false, lastActivity = 0, prevT = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensure() {
    lastActivity = performance.now();
    if (!running) { running = true; prevT = lastActivity; requestAnimationFrame(tick); }
  }

  function add(p) {
    if (pool.length >= POOL_CAP) pool.shift();
    pool.push(p);
  }

  /* 发射速度：从琴键位（底边）向演奏区任意位置飞，整体向上偏置 */
  function launchV(regIdx, ttlMs) {
    var sp = rand(H * 0.45, H * 0.95) * SPEED_F[regIdx];
    var a, up = Math.random() < 0.8;
    if (up) a = rand(-Math.PI * 0.88, -Math.PI * 0.12);
    else a = rand(0, Math.PI * 2);
    return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: ttlMs };
  }

  /* ---------- 各形状生成（x = 琴键位，y = 画布底边） ---------- */
  function spawnMain(step, x, y, size, regIdx) {
    var f = FAMILIES[family];
    var v;
    if (step === 0) {
      /* 涟漪环：留在原地扩散（更大更久） */
      add({ kind: 'ring', x: x, y: Math.min(y, H - 8), r0: size * 0.3, r1: size * 3.2,
            ttl: 950, color: f.main, lw: 3, born: performance.now() });
    } else if (step === 1) {
      v = launchV(regIdx, 1150);
      add({ kind: 'square', x: x, y: y, vx: v.vx, vy: v.vy, size: size * 1.25,
            rot: rand(-0.5, 0.5), vr: rand(-3, 3), ttl: v.ttl, color: f.main, born: performance.now() });
    } else if (step === 2) {
      v = launchV(regIdx, 1000);
      add({ kind: 'tri', x: x, y: y, vx: v.vx, vy: v.vy, size: size * 1.5,
            ttl: v.ttl, color: f.main, born: performance.now() });
    } else if (step === 3) {
      for (var i = 0; i < 9; i++) {
        var a = rand(-Math.PI * 0.9, -Math.PI * 0.1), sp = rand(H * 0.3, H * 0.8) * SPEED_F[regIdx];
        add({ kind: 'dot', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              r: rand(2.5, 6), born: performance.now(), ttl: rand(750, 1100),
              color: i % 2 ? f.main : f.alt });
      }
    } else if (step === 4) {
      /* 长条：短促快扫 */
      var dir = Math.random() < 0.5 ? -1 : 1;
      add({ kind: 'bar', x: x, y: y - size, w: Math.max(W * 0.26, 95), h: rand(9, 14),
            vx: dir * W * 2.1, ttl: 800, color: f.main, born: performance.now() });
    } else if (step === 5) {
      v = launchV(regIdx, 1250);
      add({ kind: 'diamond', x: x, y: y, vx: v.vx, vy: v.vy, size: size * 1.05,
            rot: Math.PI / 4, vr: rand(1.5, 2.5), ttl: v.ttl, color: f.main, born: performance.now() });
    } else {
      v = launchV(regIdx, 950);
      add({ kind: 'star', x: x, y: y, vx: v.vx, vy: v.vy, size: size * 1.15,
            rot: rand(-0.3, 0.3), ttl: v.ttl, color: f.main, alt: f.alt, splitDone: false,
            born: performance.now() });
    }
    for (var d = 0; d < 6; d++) {   // 碎屑
      var aa = rand(-Math.PI * 0.95, -Math.PI * 0.05), sp2 = rand(H * 0.25, H * 0.7) * SPEED_F[regIdx];
      add({ kind: 'dot', x: x, y: y, vx: Math.cos(aa) * sp2, vy: Math.sin(aa) * sp2,
            r: rand(1.5, 3.2), born: performance.now(), ttl: rand(650, 1000), color: f.alt });
    }
  }

  function burst(step, regIdx) {
    resizeGuard();
    /* 出现任意位置（画布内留边距），不绑定键位 */
    var x = rand(W * 0.08, W * 0.92);
    var y = rand(H * 0.18, H * 0.82);
    var band = SIZE_BAND[regIdx];
    spawnMain(step, x, y, rand(band[0], band[1]), regIdx);
    bgAmt = 1; bgT0 = performance.now();
    ensure();
  }

  function holdOn(id, step, regIdx) {
    resizeGuard();
    holds[id] = { x: (step + 0.5) / 7, reg: regIdx, next: 0 };
    ensure();
  }
  function holdOff(id) { delete holds[id]; }

  function celebrate() {
    resizeGuard();
    var f = FAMILIES[family];
    var cols = [f.main, f.alt, '#ffffff', FAMILIES[(family + 1) % 3].main];
    for (var i = 0; i < 60; i++) {
      add({ kind: 'confetti', x: rand(0, W), y: rand(-40, -4),
            vx: rand(-30, 30), vy: rand(60, 160), rot: rand(0, 6.3), vr: rand(-6, 6),
            r: rand(3, 6), born: performance.now(), ttl: rand(1400, 2400),
            color: cols[i % cols.length] });
    }
    bgAmt = 1; bgT0 = performance.now();
    ensure();
  }

  function resizeGuard() { if (!W || !H) resize(); }

  /* ---------- 绘制 ---------- */
  function mix(c1, c2, t) {
    return 'rgb(' + Math.round(c1[0] + (c2[0] - c1[0]) * t) + ',' +
      Math.round(c1[1] + (c2[1] - c1[1]) * t) + ',' +
      Math.round(c1[2] + (c2[2] - c1[2]) * t) + ')';
  }
  function ease(t) { return 1 - (1 - t) * (1 - t); }

  function fly(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; }

  function drawShape(p, now, dt) {
    var t = (now - p.born) / p.ttl;
    if (t >= 1) return false;
    var alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
    if (p.kind === 'ring') {
      var r = p.r0 + (p.r1 - p.r0) * ease(t);
      ctx.lineWidth = p.lw * (1 - t * 0.6);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.stroke();
    } else if (p.kind === 'square' || p.kind === 'diamond') {
      fly(p, dt);
      var s = p.size * (0.3 + 0.7 * ease(Math.min(1, t * 1.8)));
      ctx.save(); ctx.translate(p.x, p.y);
      p.rot += (p.vr || 0) * dt;
      ctx.rotate(p.rot);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else if (p.kind === 'tri') {
      fly(p, dt);
      var s2 = p.size * (t < 0.25 ? 0.6 + ease(t / 0.25) * 0.55 : 1.15 - (t - 0.25) * 0.2);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.beginPath(); ctx.moveTo(0, -s2 / 2); ctx.lineTo(s2 / 2, s2 / 2); ctx.lineTo(-s2 / 2, s2 / 2);
      ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (p.kind === 'dot' || p.kind === 'confetti') {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'confetti') { p.vy += 60 * dt; p.rot += p.vr * dt; }
      else p.vy += 50 * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      if (p.kind === 'confetti') ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.2832); ctx.fill(); }
      ctx.restore();
    } else if (p.kind === 'bar') {
      p.x += p.vx * dt;
      var m = 30 + p.w / 2;
      var edge = Math.min(1, Math.min((p.x + m) / (m * 2), (W + m - p.x) / (m * 2)));
      ctx.globalAlpha = alpha * Math.max(0, edge);
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    } else if (p.kind === 'star') {
      fly(p, dt);
      var s3 = p.size * (0.4 + 0.6 * ease(Math.min(1, t * 2))) * (0.9 + 0.1 * Math.sin(now / 40));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-s3, -s3 * 0.09, s3 * 2, s3 * 0.18);
      ctx.fillRect(-s3 * 0.09, -s3, s3 * 0.18, s3 * 2);
      var d = s3 * 0.55;
      ctx.fillRect(-d, -d * 0.06, d * 2, d * 0.12); ctx.rotate(Math.PI / 2);
      ctx.fillRect(-d, -d * 0.06, d * 2, d * 0.12);
      ctx.restore();
      if (!p.splitDone && t > 0.5) {
        p.splitDone = true;
        for (var i = 0; i < 6; i++) {
          var a2 = rand(0, 6.2832), sp3 = rand(40, 140);
          add({ kind: 'dot', x: p.x, y: p.y, vx: Math.cos(a2) * sp3, vy: Math.sin(a2) * sp3,
                r: rand(1.5, 3), born: now, ttl: rand(450, 750), color: p.alt });
        }
      }
    }
    ctx.globalAlpha = 1;
    return true;
  }

  function tick(now) {
    var dt = Math.min(0.05, (now - prevT) / 1000); prevT = now;
    /* 背景脉动（弱化版，作用于演奏区） */
    bgAmt = Math.max(0, 1 - (now - bgT0) / 900);
    ctx.fillStyle = mix(BASE_BG, FAMILIES[family].pulse, bgAmt * 0.3);
    ctx.fillRect(0, 0, W, H);
    /* 长按上升光点 */
    var f = FAMILIES[family];
    Object.keys(holds).forEach(function (id) {
      var h = holds[id];
      if (now >= h.next) {
        h.next = now + 55;
        add({ kind: 'rise', x: h.x * W + rand(-16, 16), y: H + 6, vx: rand(-10, 10),
              vy: -rand(80, 160) * (1 + h.reg * 0.3),
              r: RISE_R[h.reg] * rand(0.8, 1.2),
              born: now, ttl: 1800, color: h.reg === 2 ? f.alt : f.main });
      }
    });
    for (var i = pool.length - 1; i >= 0; i--) {
      var p = pool[i];
      if (p.kind === 'rise') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        var lt = (now - p.born) / p.ttl;
        if (lt >= 1 || p.y < -10) { pool.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, (1 - lt) * 1.4);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (!drawShape(p, now, dt)) {
        pool.splice(i, 1);
      }
    }
    if (now - lastActivity > 800 && pool.length === 0 && !Object.keys(holds).length) {
      running = false;
      ctx.fillStyle = mix(BASE_BG, FAMILIES[family].pulse, 0);
      ctx.fillRect(0, 0, W, H);
      return;
    }
    requestAnimationFrame(tick);
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    ctx.fillStyle = 'rgb(13,15,23)';
    ctx.fillRect(0, 0, W, H);
  }

  return {
    init: init,
    setFamily: function (i) { family = i; ensure(); },
    burst: burst,
    holdOn: holdOn,
    holdOff: holdOff,
    celebrate: celebrate,
    stats: function () { return { pool: pool.length, running: running, W: W, H: H }; }
  };
})();
