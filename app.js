/* A Band of One · 小红书参赛版（T02-c：自由弹奏 + 跟随模式）
 * 语义真相源：母项目 prototype.js（红蓝判定/严格判定/状态机逐条移植）。
 * 音频 = 51 个预渲染原音（零变调）；短音/长音 = 按拍长/按住抬手 + 增益淡出。
 * 容器合规：无内联脚本、无行内事件、无网络请求、全离线。
 */
(function () {
  'use strict';

  /* 全局错误可见化：手机上任何脚本错误直接显示在状态行 */
  window.addEventListener('error', function (e) {
    try {
      var el = document.getElementById('status');
      if (el) el.textContent = '⚠️ 脚本错误: ' + (e.message || 'unknown');
    } catch (x) {}
  });

  /* ---------- 常量 ---------- */
  var NOTE_NAMES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
  var SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var INST = [
    { key: 'piano',    name: '钢琴',   emoji: '🎹', release: 0.30 },
    { key: 'violin',   name: '弦乐',   emoji: '🎻', release: 0.40 },
    { key: 'clarinet', name: '单簧管', emoji: '🎼', release: 0.25 }
  ];
  var REGISTERS = {
    piano:    [{ base: 'C3', label: '低' }, { base: 'C4', label: '中' }, { base: 'C5', label: '高' }],
    violin:   [{ base: 'G3', label: '低' }, { base: 'D4', label: '中' }, { base: 'A4', label: '高' }],
    clarinet: [{ base: 'G3', label: '低' }, { base: 'D4', label: '中' }, { base: 'A4', label: '高' }]
  };
  /* 曲目：n = 唱名索引 0-6，b = 拍数（四分音符 = 1）；难度与 BPM 递增 */
  var SONGS = [
    {
      id: 'twinkle', title: '小星星', bpm: 90, stars: 1, notes: [
        [0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2],
        [3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2],
        [4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2],
        [4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2],
        [0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2],
        [3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2]
      ]
    },
    {
      id: 'ode', title: '欢乐颂', bpm: 100, stars: 1, notes: [
        [2, 1], [2, 1], [3, 1], [4, 1],
        [4, 1], [3, 1], [2, 1], [1, 1],
        [0, 1], [0, 1], [1, 1], [2, 1],
        [2, 1.5], [1, 0.5], [1, 2],
        [2, 1], [2, 1], [3, 1], [4, 1],
        [4, 1], [3, 1], [2, 1], [1, 1],
        [0, 1], [0, 1], [1, 1], [2, 1],
        [1, 1.5], [0, 0.5], [0, 2]
      ]
    },
    {
      /* 《新年好》（公版民歌 Clementine 曲调，3/4 拍，全程 do–sol 零折音） */
      id: 'newyear', title: '新年好', bpm: 100, stars: 1, notes: [
        [0, 1], [0, 1], [0, 1], [4, 3],
        [2, 1], [2, 1], [2, 1], [0, 3],
        [0, 1], [2, 1], [4, 1], [4, 1],
        [3, 1], [2, 1], [1, 3],
        [1, 1], [1, 1], [1, 1], [3, 3],
        [2, 1], [2, 1], [2, 1], [0, 3],
        [4, 1], [4, 1], [5, 1], [4, 1],
        [3, 1], [2, 1], [0, 4]
      ]
    },
    {
      id: 'jingle', title: '铃儿响叮当', bpm: 115, stars: 2, notes: [
        [2, 1], [2, 1], [2, 2],
        [2, 1], [2, 1], [2, 2],
        [2, 1], [4, 1], [0, 1], [1, 1], [2, 3],
        [3, 1], [3, 1], [3, 1], [3, 1],
        [3, 1], [2, 1], [2, 1], [2, 1],
        [2, 1], [1, 1], [1, 1], [2, 1],
        [1, 2], [4, 2]
      ]
    },
    {
      id: 'tigers', title: '两只老虎', bpm: 130, stars: 3, notes: [
        [0, 1], [1, 1], [2, 1], [0, 1],
        [0, 1], [1, 1], [2, 1], [0, 1],
        [2, 1], [3, 1], [4, 2],
        [2, 1], [3, 1], [4, 2],
        [4, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 1], [0, 1],
        [4, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 1], [0, 1],
        [0, 0.5], [4, 0.5], [0, 2],
        [0, 0.5], [4, 0.5], [0, 2]
      ]
    },
    {
      id: 'mary', title: '玛丽的小羊', bpm: 145, stars: 4, notes: [
        [2, 1], [1, 1], [0, 1], [1, 1],
        [2, 1], [2, 1], [2, 2],
        [1, 1], [1, 1], [1, 2],
        [2, 1], [4, 1], [4, 2],
        [2, 1], [1, 1], [0, 1], [1, 1],
        [2, 1], [2, 1], [2, 1], [2, 1],
        [1, 1], [1, 1], [2, 1], [1, 1],
        [0, 4]
      ]
    },
    {
      /* 莫扎特《单簧管协奏曲》K622 第二乐章·完整主题白键改编（原曲含半音，低音区音已八度升入窗） */
      id: 'mozart_k622', title: '单簧管协奏曲·慢板(莫扎特)（节选）', bpm: 96, stars: 0, notes: [
        [2, 3], [3, 1], [1, 1], [0, 1], [6, 1], [5, 1], [6, 1], [0, 2],
        [2, 1], [3, 1], [4, 2],
        [5, 1], [4, 1], [3, 1], [2, 1],
        [1, 1], [2, 1], [0, 2]
      ]
    },
    {
      /* 帕赫贝尔卡农·完整主题线（C 调上移小二度；开篇两句模进 + 高潮上行 + 回落收束） */
      id: 'canon', title: '卡农（节选）', bpm: 100, stars: 0, notes: [
        [0, 3], [6, 1],
        [5, 1], [4, 1], [3, 0.5], [2, 0.5],
        [3, 1], [4, 1], [5, 1], [4, 1],
        [3, 1], [2, 1], [3, 1], [4, 1],
        [0, 1], [1, 1], [2, 1], [0, 1],
        [1, 1], [2, 1], [3, 1], [4, 1],
        [2, 1], [3, 1], [4, 1], [2, 1],
        [3, 1], [4, 1], [5, 1], [6, 1],
        [0, 1], [6, 1], [5, 1], [4, 1],
        [3, 1], [2, 1], [1, 1], [2, 1],
        [0, 2]
      ]
    },
    {
      /* 贝多芬《D大调小提琴协奏曲》开篇主题完整句（含主题高弧段，高音按单排琴八度回落） */
      id: 'beethoven_vc', title: 'D大调小提琴协奏曲(贝多芬)（节选）', bpm: 110, stars: 0, notes: [
        [0, 1], [0, 0.5], [2, 0.5], [3, 0.5], [4, 0.5],
        [5, 1], [4, 0.5], [3, 0.5],
        [2, 1], [3, 0.5], [1, 0.5], [0, 2],
        [4, 1], [5, 1], [6, 1], [0, 1],
        [1, 1], [6, 1], [5, 1], [4, 1],
        [3, 1], [2, 1], [3, 1], [1, 1],
        [0, 2]
      ]
    },
  
  ];
  var BEST_KEY = 'abo-follow-best-v1';

  function absNote(base, step) {
    var bi = SCALE.indexOf(base[0]);
    var bo = parseInt(base.slice(1), 10);
    return SCALE[(bi + step) % 7] + (bo + Math.floor((bi + step) / 7));
  }

  /* ---------- 状态 ---------- */
  var S = { inst: 0, reg: 1 };
  /* 跟随模式状态（语义移植 prototype.js：严格判定、拍长蓝光、时间轴暂停） */
  var F = {
    on: false, songIdx: 0, i: 0, errors: 0,
    elapsed: 0, since: 0, holdTimer: null, holdKey: -1, voice: null, tick: null
  };

  function $ (id) { return document.getElementById(id); }
  function inst () { return INST[S.inst]; }
  function reg () { return REGISTERS[inst().key][S.reg]; }
  function song () { return SONGS[F.songIdx]; }
  function beatMs(beats) { return 60 / song().bpm * beats * 1000; }

  var elStatus = $('status'), elNow = $('nowNote'),
      elInstName = $('instName'), elRegName = $('regName'),
      elKeysRow = $('keysRow'),
      elBtnFollow = $('btnFollow'), elBtnOctUp = $('btnOctUp'), elBtnOctDown = $('btnOctDown'),
      elHud = $('hud'), elHudSong = $('hudSong'), elHudProg = $('hudProg'),
      elHudErr = $('hudErr'), elHudTime = $('hudTime'), elBtnStop = $('btnStop'),
      elSheetWrap = $('sheetWrap'), elSheet = $('sheet'),
      elFollowSheet = $('followSheet'), elSongList = $('songList'), elBtnFsCancel = $('btnFsCancel'),
      elFinOverlay = $('finOverlay'), elFinStats = $('finStats'), elFinBest = $('finBest'),
      elBtnAgain = $('btnAgain'), elBtnBack = $('btnBack');
  var keys = [], blocks = [];
  var voices = {}; // 自由模式按住音

  /* ---------- 音频引擎（双模式） ----------
   * 主路径：Web Audio decodeAudioData（低延迟、可淡出、多声部）
   * 兜底：容器官方能力 <audio> 标签 + 包内音频文件 ./audios/*.mp3（data: 媒体被 CSP 禁）
   * 自动降级：Web Audio 缺失 / 解码全失败 / resume 后仍非 running → 切标签模式 */
  var AE = {
    ctx: null, master: null,
    buffers: {}, ready: false, mode: 'webaudio', decoding: false,
    decoded: 0, decodeFail: 0, total: 0, unlockTries: 0,
    init: function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !window.atob) { this.downgrade('环境无WebAudio'); return; }
      try { this.ctx = new AC(); } catch (e) { this.downgrade('创建失败'); return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.decodeAll();
    },
    unlock: function () {
      if (typeof AB_AUDIO === 'undefined') { setStatus('⚠️ 音频数据未加载 (audio-data.js)'); this.mode = 'data'; return; }
      if (this.mode !== 'webaudio') return;
      if (!this.ctx) this.init();
      if (this.mode !== 'webaudio' || !this.ctx) return;
      this.unlockTries++;
      var self = this;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(function () {
          if (self.ctx.state !== 'running' && self.unlockTries >= 2) self.downgrade('resume后' + self.ctx.state);
        }, function () {
          if (self.unlockTries >= 2) self.downgrade('resume被拒');
        });
      }
      try {
        var b = this.ctx.createBuffer(1, 256, this.ctx.sampleRate);
        var s = this.ctx.createBufferSource();
        s.buffer = b;
        s.connect(this.ctx.destination);
        s.start(0);
      } catch (e) {}
      if (!this.ready && !this.decoding) this.decodeAll();
    },
    downgrade: function (why) {
      this.mode = 'data';
      setStatus('音频降级(' + why + ') · 已切data播放模式');
    },
    playData: function (instKey, note) {
      if (typeof AB_AUDIO === 'undefined') { setStatus('⚠️ 音频数据未加载 (audio-data.js)'); return null; }
      var b64 = AB_AUDIO[instKey] && AB_AUDIO[instKey][note];
      if (!b64) return null;
      var a = new Audio('data:audio/mp3;base64,' + b64);
      a.volume = 0.9;
      var p = a.play();
      if (p && p.catch) p.catch(function () { setStatus('data音频被拦截 · 请截图反馈'); });
      if (!this.readyNotice) { this.readyNotice = true; setStatus('data播放模式 · 点琴键即弹'); }
      var done = false;
      return {
        release: function (sec) {
          if (done) return; done = true;
          var steps = 6, i = 0;
          var timer = setInterval(function () {
            i++;
            a.volume = Math.max(0, 0.9 - 0.9 * i / steps);
            if (i >= steps) { clearInterval(timer); a.pause(); }
          }, (sec * 1000) / steps);
        },
        stopNow: function () { this.release(0.06); }
      };
    },
    decodeAll: function () {
      var self = this, pending = 0;
      if (typeof AB_AUDIO === 'undefined') { this.decoding = false; setStatus('⚠️ 音频数据未加载 (audio-data.js)'); return; }
      this.decoding = true;
      Object.keys(AB_AUDIO).forEach(function (ik) {
        self.buffers[ik] = self.buffers[ik] || {};
        Object.keys(AB_AUDIO[ik]).forEach(function (n) {
          self.total++;
          var raw = atob(AB_AUDIO[ik][n]);
          var buf = new Uint8Array(raw.length);
          for (var i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
          pending++;
          self.ctx.decodeAudioData(buf.buffer, function (audio) {
            self.buffers[ik][n] = audio;
            self.decoded++;
            pending--;
            if (pending === 0) {
              self.decoding = false;
              self.ready = true;
              if (self.decoded === 0) self.downgrade('解码全失败');
              else if (!self.readyNotice) setStatus('音色就绪 · 点琴键即弹（首次解码完成）');
            }
          }, function () {
            self.decodeFail++;
            pending--;
            if (pending === 0) {
              self.decoding = false;
              self.ready = self.decoded > 0;
              if (!self.ready) self.downgrade('解码全失败');
            }
          });
        });
      });
      if (this.total === 0) this.downgrade('无音频数据');
    },
    play: function (instKey, note) {
      if (this.mode === 'data') return this.playData(instKey, note);
      if (this.mode === 'none') { setStatus(this.diag || '音频不可用'); return null; }
      var ctx = this.ctx;
      if (!this.readyNotice) {
        setStatus('音频诊断 state=' + (ctx ? ctx.state : '无ctx') +
                  ' 解码=' + this.decoded + '/' + this.total +
                  ' 失败=' + this.decodeFail + (this.decoding ? ' 解码中' : ''));
      }
      if (ctx.state === 'suspended') ctx.resume();
      var buf = this.buffers[instKey] && this.buffers[instKey][note];
      if (!buf) {
        if (this.decodeFail > 0 && this.decoded === 0) setStatus('音频解码失败 ' + this.decodeFail + ' · 请反馈');
        else setStatus('音色解码中 ' + this.decoded + '/' + this.total + ' · 再按一次');
        return null;
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g);
      g.connect(this.master);
      src.start();
      if (!this.readyNotice) { this.readyNotice = true; setStatus('音色就绪 · 点琴键即弹'); }
      var done = false;
      return {
        release: function (sec) {
          if (done) return; done = true;
          var t = ctx.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.setTargetAtTime(0, t, sec / 3);
          try { src.stop(t + sec + 0.15); } catch (e) {}
        },
        stopNow: function () { this.release(0.06); }
      };
    }
  };

  window.__AE = AE; // 诊断出口（提审前移除）
  /* ---------- 最佳纪录 ---------- */
  function loadBest(songId) {
    try {
      var all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      return all[songId] || null;
    } catch (e) { return null; }
  }
  function saveBest(songId, errors, time) {
    try {
      var all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      var old = all[songId];
      if (!old || errors < old.errors || (errors === old.errors && time < old.time)) {
        all[songId] = { errors: errors, time: time };
        localStorage.setItem(BEST_KEY, JSON.stringify(all));
      }
    } catch (e) {}
  }

  /* ---------- UI ---------- */
  function setStatus(t) { elStatus.textContent = t; }

  function updateMeta() {
    var i = inst(), r = reg();
    elInstName.textContent = i.emoji + ' ' + i.name;
    elRegName.textContent = r.label + ' · do=' + r.base;
  }

  function showFreeNote(n) {
    elNow.className = 'played';
    elNow.textContent = n;
  }

  function showFollowNote(state) {
    /* state: 'hint' | 'hit' | 'off' */
    elNow.className = state === 'hint' ? 'nowHint' : (state === 'hit' ? 'nowHit' : '');
    if (state === 'off') { elNow.textContent = '♪'; return; }
    var n = song().notes;
    elNow.textContent = state === 'hint'
      ? NOTE_NAMES[n[F.i][0]]
      : NOTE_NAMES[n[Math.max(0, F.i - 1)][0]];
  }

  function buildKeys() {
    for (var i = 0; i < 8; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pk' + (i === 7 ? ' s8' : '');
      if (i === 7) b.innerHTML = '<b>🎹 钢琴</b><span>S8 · 乐器</span>';
      else b.innerHTML = '<b>' + NOTE_NAMES[i] + '</b><span>S' + (i + 1) + '</span>';
      (function (idx, btn) {
        btn.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          try { btn.setPointerCapture(e.pointerId); } catch (err) {}
          keyDown(idx);
        });
        btn.addEventListener('pointerup', function () { keyUp(idx); });
        btn.addEventListener('pointercancel', function () { keyUp(idx); });
      })(i, b);
      elKeysRow.appendChild(b);
      keys.push(b);
    }
  }

  function refreshS8Label() {
    keys[7].innerHTML = '<b>' + inst().emoji + ' ' + inst().name + '</b><span>S8 · 乐器</span>';
  }

  /* ---------- 跟随模式 ---------- */
  function buildSheet() {
    elSheet.innerHTML = '';
    blocks = [];
    song().notes.forEach(function (nt) {
      var d = document.createElement('div');
      d.className = 'sb';
      d.style.width = (30 + nt[1] * 22) + 'px';
      d.textContent = NOTE_NAMES[nt[0]];
      elSheet.appendChild(d);
      blocks.push(d);
    });
  }

  function centerCur() {
    var b = blocks[F.i];
    if (!b) return;
    var target = b.offsetLeft - (elSheetWrap.clientWidth - b.offsetWidth) / 2;
    try { elSheet.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); }
    catch (e) { elSheet.scrollLeft = Math.max(0, target); }
  }

  function updateSheet() {
    blocks.forEach(function (el, i) {
      el.classList.toggle('done', i < F.i);
      var cur = i === F.i;
      el.classList.toggle('cur', cur);
      el.classList.toggle('sounding', cur && F.holdKey >= 0);
    });
    centerCur();
  }

  function updateHud() {
    elHudSong.textContent = song().title;
    elHudProg.textContent = F.i + '/' + song().notes.length;
    elHudErr.textContent = F.errors;
    elHudTime.textContent = currentElapsed() / 1000 >= 0 ? (currentElapsed() / 1000).toFixed(1) + 's' : '0.0s';
  }

  function currentElapsed() {
    if (!F.on) return F.elapsed;
    return F.elapsed + (performance.now() - F.since);
  }

  function startTick() {
    if (F.tick) return;
    F.tick = setInterval(function () {
      if (F.on) elHudTime.textContent = (currentElapsed() / 1000).toFixed(1) + 's';
    }, 100);
  }
  function stopTick() { if (F.tick) { clearInterval(F.tick); F.tick = null; } }

  function applyHint() {
    clearKeyJudge();
    keys[song().notes[F.i][0]].classList.add('hint');
    showFollowNote('hint');
  }

  function clearKeyJudge() {
    keys.forEach(function (k) { k.classList.remove('hint', 'hit', 'err'); });
  }

  function startFollow(songIdx) {
    if (F.on) stopFollow(true);
    F.on = true;
    F.songIdx = songIdx;
    F.i = 0; F.errors = 0; F.elapsed = 0;
    F.since = performance.now();
    buildSheet();
    elHud.classList.remove('hide');
    elSheetWrap.classList.remove('hide');
    elFollowSheet.classList.add('hide');
    elFinOverlay.classList.add('hide');
    applyHint();
    updateSheet();
    updateHud();
    startTick();
    setStatus('跟随「' + song().title + '」· 弹红光的键，弹错不出声');
  }

  function judge(idx) {
    if (F.holdTimer) { setStatus('当前音还在响 · 等蓝色结束再按下一个'); return; }
    var notes = song().notes;
    var target = notes[F.i][0];
    if (idx === target) {
      var beats = notes[F.i][1];
      keys[idx].classList.remove('hint');
      keys[idx].classList.add('hit');
      showFollowNote('hit');
      var v = AE.play(inst().key, absNote(reg().base, idx));
      if (F.voice) F.voice.release(0.1);
      F.voice = v;
      F.holdKey = idx;
      FX.burst(idx, S.reg);
      updateSheet();
      F.holdTimer = setTimeout(function () {
        keys[idx].classList.remove('hit');
        F.holdTimer = null; F.holdKey = -1;
        if (v) v.release(inst().release);
        F.i++;
        if (F.i >= notes.length) { finishFollow(); return; }
        applyHint();
        updateSheet();
        updateHud();
        setStatus('第 ' + (F.i + 1) + ' / ' + notes.length + ' 音 · 待按 ' + NOTE_NAMES[notes[F.i][0]]);
      }, beatMs(beats));
    } else {
      F.errors++;
      keys[idx].classList.add('err');
      setTimeout(function () { keys[idx].classList.remove('err'); }, 320);
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
      updateHud();
      setStatus('弹错 · 时间轴暂停 · 待按 ' + NOTE_NAMES[target]);
    }
  }

  function finishFollow() {
    F.on = false;
    F.elapsed += performance.now() - F.since;
    stopTick();
    clearKeyJudge();
    saveBest(song().id, F.errors, F.elapsed);
    elFinStats.textContent = '弹错 ' + F.errors + ' 次 · 用时 ' + (F.elapsed / 1000).toFixed(1) + ' 秒';
    var best = loadBest(song().id);
    elFinBest.textContent = best ? ('本曲最佳：弹错 ' + best.errors + ' 次 · ' + (best.time / 1000).toFixed(1) + ' 秒') : '';
    elFinOverlay.classList.remove('hide');
    FX.celebrate();
    arpeggio();
    setStatus('「' + song().title + '」完成 · 弹错 ' + F.errors + ' 次 · 用时 ' + (F.elapsed / 1000).toFixed(1) + ' 秒');
  }

  function stopFollow(silent) {
    F.on = false;
    if (F.holdTimer) { clearTimeout(F.holdTimer); F.holdTimer = null; }
    F.holdKey = -1;
    if (F.voice) { F.voice.release(0.1); F.voice = null; }
    clearKeyJudge();
    stopTick();
    elHud.classList.add('hide');
    elSheetWrap.classList.add('hide');
    elFollowSheet.classList.add('hide');
    elFinOverlay.classList.add('hide');
    showFreeNote('♪');
    if (!silent) setStatus('已退出跟随 · 自由弹奏');
  }

  function arpeggio() {
    var base = reg().base;
    var bi = SCALE.indexOf(base[0]);
    var bo = parseInt(base.slice(1), 10);
    [0, 2, 4].forEach(function (step, i) {
      setTimeout(function () {
        var n = SCALE[(bi + step) % 7] + (bo + Math.floor((bi + step) / 7));
        var v = AE.play(inst().key, n);
        if (v) setTimeout(function () { v.release(0.4); }, 480);
      }, i * 110);
    });
    setTimeout(function () {
      var v = AE.play(inst().key, SCALE[bi] + (bo + 1));
      if (v) setTimeout(function () { v.release(0.5); }, 520);
    }, 330);
  }

  /* ---------- 弹奏输入 ---------- */
  function keyDown(idx) {
    AE.unlock();          // 用户手势内创建/恢复 AudioContext（移动端解锁关键）
    if (idx === 7) { cycleInst(); return; }
    if (F.on) { judge(idx); return; }
    var i = inst();
    var note = absNote(reg().base, idx);
    if (voices[idx]) voices[idx].release(i.release);
    voices[idx] = AE.play(i.key, note);
    keys[idx].classList.add('pressed');
    showFreeNote(note);
    FX.burst(idx, S.reg);
    FX.holdOn(idx, idx, S.reg);
  }

  function keyUp(idx) {
    if (idx === 7) return;
    keys[idx].classList.remove('pressed');
    FX.holdOff(idx);
    if (!F.on && voices[idx]) { voices[idx].release(inst().release); delete voices[idx]; }
  }

  function cycleInst() {
    S.inst = (S.inst + 1) % INST.length;
    S.reg = Math.min(S.reg, REGISTERS[inst().key].length - 1);
    refreshS8Label();
    updateMeta();
    FX.setFamily(S.inst);
    setStatus('音色 → ' + inst().name + '（下一次按键生效）');
  }

  function shiftOct(dir) {
    var regs = REGISTERS[inst().key];
    S.reg = (S.reg + dir + regs.length) % regs.length;
    updateMeta();
    setStatus('音区 → ' + reg().label + '（下一次按键生效）');
  }

  /* ---------- 选谱面板 ---------- */
  function buildSongList() {
    elSongList.innerHTML = '';
    SONGS.forEach(function (sg, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'songBtn';
      b.innerHTML = sg.title + ' ' + '★'.repeat(sg.stars) +
        '<span>' + sg.notes.length + ' 音 · ' + sg.bpm + ' BPM</span>';
      b.addEventListener('click', function () { startFollow(i); });
      elSongList.appendChild(b);
    });
  }

  /* ---------- 事件 ---------- */
  elBtnFollow.addEventListener('click', function () {
    elFinOverlay.classList.add('hide');
    elFollowSheet.classList.remove('hide');
  });
  elBtnFsCancel.addEventListener('click', function () {
    elFollowSheet.classList.add('hide');
  });
  elBtnStop.addEventListener('click', function () { stopFollow(false); });
  elBtnAgain.addEventListener('click', function () { startFollow(F.songIdx); });
  elBtnBack.addEventListener('click', function () { stopFollow(false); });
  elBtnOctUp.addEventListener('click', function () { shiftOct(1); });
  elBtnOctDown.addEventListener('click', function () { shiftOct(-1); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------- 启动 ---------- */
  buildKeys();
  refreshS8Label();
  updateMeta();
  buildSongList();
  if (typeof AB_AUDIO === 'undefined') setStatus('⚠️ 音频数据未加载 (audio-data.js)');
  FX.init(document.getElementById('fx'));
  FX.setFamily(0);
  /* AudioContext 不在加载期创建：首次按键手势内经 AE.unlock() 创建，避免容器锁死 */
})();
