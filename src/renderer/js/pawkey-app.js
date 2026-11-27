/* PawKey · 爪键猫 — 100% Original Pet Runtime Controller */
window.addEventListener('error', function (ev) {
  window.__pawErr = String(ev.message || ev.error || 'error') + ' @' + (ev.filename || '') + ':' + (ev.lineno || 0);
});
window.addEventListener('unhandledrejection', function (ev) {
  window.__pawErr = 'promise ' + String(ev.reason && ev.reason.stack || ev.reason);
});

(function () {
  'use strict';

  var DEFAULTS = {
    catSkin: 'cow',
    keyboardSkin: 'cream',
    eyeColor: 'auto',
    collar: true,
    scale: 0.85,
    opacity: 1,
    keyboardVisible: true,
    sound: true,
    volume: 0.45,
    switchSound: 's2',
    keyUpSound: true,
    staminaFun: true,
    idleFun: true,
    dndMode: false,
    sleepMinutes: 3,
    privacy: false,
    leftMouse: false,
    lowPower: false,
    alwaysOnTop: true,
    launchAtStartup: false,
    bgMode: 'transparent'
  };

  var COAT = {
    cow: 'tuxedo', tuxedo: 'tuxedo', hachi: 'tuxedo',
    orange: 'orange', ginger: 'orange',
    tabby: 'tabby', calico: 'calico',
    white: 'white', ivory: 'white',
    blue: 'blue', british: 'blue',
    ragdoll: 'ragdoll', siamese: 'siamese', maine: 'maine'
  };
  var SKIN_ALIAS = { tuxedo: 'cow', ginger: 'orange', ivory: 'white', british: 'blue', hachi: 'cow' };
  var KB_ALIAS = { studio: 'cream', space: 'charcoal', retro: 'peach', matcha: 'mint', mist: 'sky', blossom: 'lilac' };
  function normalizeCatId(id) { return SKIN_ALIAS[id] || id || 'cow'; }
  function normalizeKbId(id) { return KB_ALIAS[id] || id || 'cream'; }
  function coatFor(id) { return COAT[id] || 'tuxedo'; }

  var REM_DEFAULT = {
    workStart: '08:00',
    workEnd: '18:00',
    weekdaysOnly: false,
    standEnabled: true,
    standIntervalMin: 60,
    standRestMin: 10,
    waterEnabled: true,
    waterIntervalMin: 60,
    dailyItems: [
      { id: 'med-1', enabled: true, time: '09:00', icon: '💊', title: '按时吃药提醒', note: '记得配温水服药哦~' }
    ]
  };

  var NOOP = function () {};
  var api = window.pawkeyAPI || {
    getConfig: function () { return Promise.resolve(DEFAULTS); },
    setConfig: NOOP,
    onConfig: function () { return NOOP; },
    onKey: function () { return NOOP; },
    onCursor: function () { return NOOP; },
    onMouse: function () { return NOOP; },
    onMouseButton: function () { return NOOP; },
    onGaze: function () { return NOOP; },
    onPlayAction: function () { return NOOP; },
    onStats: function () { return NOOP; },
    onHookStatus: function () { return NOOP; },
    onDragEnd: function () { return NOOP; },
    dragStart: NOOP, dragEnd: NOOP, setInteractive: NOOP, openSettings: NOOP, ready: NOOP
  };

  var stage = document.getElementById('stage');
  var hint = document.getElementById('hint');
  var audio = new window.PawKeyAudio();
  var config = Object.assign({}, DEFAULTS);
  var pet = null;

  var pressed = new Set(), mouseButtons = new Set(), pressedAt = new Map();
  var lastPointer = { x: -9999, y: -9999 };
  var interactive = false, lastHitAt = 0;
  var petting = false, headDown = null, isDraggingPet = false, dragFreezeTimer = 0;
  var hintHidden = false;
  var heartTimer = 0, lastHeadClickAt = 0;

  function localDateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    if (hint) hint.classList.add('gone');
  }
  setTimeout(hideHint, 4500);

  function updateHintText() {
    if (!hint) return;
    hint.textContent = window.innerWidth < 250 ? '拖猫挪位 · 点头摸摸' : '拖住猫头或身体移动位置 · 点按猫头摸摸';
  }
  function forwardInput() {
    if (pet) try { pet.setInput(pressed, mouseButtons); } catch (_) {}
  }

  function spawnHeart(x, y) {
    var old = document.querySelectorAll('.pk-heart');
    if (old.length >= 8) old[0].remove();
    var el = document.createElement('div');
    el.className = 'pk-heart';
    el.textContent = Math.random() > 0.25 ? '♥' : '✦';
    el.style.left = (x + (Math.random() * 28 - 14)) + 'px';
    el.style.top = (y - 8 + (Math.random() * 10 - 5)) + 'px';
    el.style.setProperty('--dx', ((Math.random() * 34 - 17).toFixed(1)) + 'px');
    el.style.setProperty('--rot', ((Math.random() * 26 - 13).toFixed(1)) + 'deg');
    if (el.textContent === '✦') el.style.color = '#f7c948';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1200);
  }

  function spawnBubble(text, x, y) {
    var old = document.querySelectorAll('.pk-bubble');
    if (old.length >= 2) old[0].remove();
    var el = document.createElement('div');
    el.className = 'pk-bubble';
    el.textContent = text;
    var rawX = window.innerWidth < 260 ? window.innerWidth * 0.5 : (x || window.innerWidth * 0.5);
    var safeX = Math.max(46, Math.min(window.innerWidth - 46, rawX));
    var safeY = Math.max(22, Math.min(window.innerHeight - 28, y || window.innerHeight * 0.16));
    el.style.left = safeX + 'px';
    el.style.top = safeY + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1600);
  }

  var meowPhrases = ['喵~ ♪', '呼噜呼噜~', '贴贴 ♥', '在认真工作喵!', '摸摸头~', '干巴爹!'];
  var meowIdx = 0;
  function triggerMeow(x, y) {
    audio.ensure(); audio.lastMeow = 0; audio.meow();
    if (pet) { pet.perk(); pet.tap(Math.random() > 0.5 ? 'Left' : 'Right'); }
    spawnBubble(meowPhrases[meowIdx++ % meowPhrases.length], x || window.innerWidth * 0.5, y || window.innerHeight * 0.12);
    for (var i = 0; i < 3; i++) {
      (function (d) { setTimeout(function () { spawnHeart(x || window.innerWidth * 0.5, y || window.innerHeight * 0.25); }, d); })(i * 110);
    }
  }

  function applyConfig(next) {
    config = Object.assign({}, DEFAULTS, next || {});
    var catId = normalizeCatId(config.catSkin);
    var kbId = normalizeKbId(config.keyboardSkin);
    config.catSkin = catId;
    config.keyboardSkin = kbId;
    if (config.dndMode && activeRemDismiss) activeRemDismiss();
    if (!pet) return;
    pet.setOptions({
      coat: coatFor(catId),
      showKeyboard: config.keyboardVisible !== false,
      showMouse: true,
      followKeys: true,
      privacy: !!config.privacy,
      leftMouse: !!config.leftMouse,
      eyeColor: config.eyeColor || 'auto',
      collar: config.collar !== false,
      lowPower: !!config.lowPower,
      sleepMinutes: config.sleepMinutes || 3
    });
    if (window.getKeyboardSkin) pet.setKeyboardSkin(window.getKeyboardSkin(kbId));
    var catSkin = window.getCatSkin && window.getCatSkin(catId);
    if (window.tail2d && catSkin) window.tail2d.setColor(catSkin.tail || catSkin.base || '#101010');
    audio.setEnabled(!!config.sound && !config.dndMode);
    audio.setVolume(config.volume);
    audio.setSwitchPack(config.switchSound || 's2');
    audio.setKeyUpEnabled(config.keyUpSound !== false);
    audio.ensure();
  }

  // === Drag-by-Head (>=5px) & Petting Controller ===
  function beginPetDrag() {
    isDraggingPet = true;
    window.__catDragFreeze = true;
    if (dragFreezeTimer) clearTimeout(dragFreezeTimer);
    dragFreezeTimer = setTimeout(function () { window.__catDragFreeze = false; dragFreezeTimer = 0; }, 12000);
    document.body.style.cursor = 'grabbing';
    api.dragStart();
    hideHint();
  }
  function finishPetDragUI() {
    if (dragFreezeTimer) { clearTimeout(dragFreezeTimer); dragFreezeTimer = 0; }
    window.__catDragFreeze = false;
    document.body.style.cursor = 'default';
    headDown = null;
    if (pet) pet.cancelPet();
  }
  function stopHearts() {
    if (heartTimer) { clearInterval(heartTimer); heartTimer = 0; }
    lastHeadClickAt = 0;
  }

  // === Stamina, Sweat, Meltdown & Idle Coffee/Doze System ===
  var sessionTyped = 0, statsDirty = 0;
  var fatigue = 0, heat = 0, recentStamps = [];
  var moodState = 'normal';
  var meltdownUntil = 0, meltdownTimer = 0, idleSkitUntil = 0;
  var lastKeyAt = performance.now(), nextIdleSkitAt = performance.now() + 50000;
  var lastIdleSkit = '', lastWakeMsgAt = 0, idleTimers = [];
  var activeRemDismiss = null;
  var lastSweatAt = 0, lastTiredQuoteAt = 0, lastHeatQuoteAt = 0;

  function flushStats(extraFocusDelta) {
    var fDelta = Number(extraFocusDelta) || 0;
    if (statsDirty <= 0 && fDelta <= 0) return;
    var delta = statsDirty;
    statsDirty = 0;
    var td = localDateKey();
    var st = Object.assign({ date: td, todayKeys: 0, totalKeys: 0, focusDone: 0 }, config.stats || {});
    if (st.date !== td) { st.date = td; st.todayKeys = 0; st.focusDone = 0; }
    st.todayKeys = (Number(st.todayKeys) || 0) + delta;
    st.totalKeys = (Number(st.totalKeys) || 0) + delta;
    st.focusDone = (Number(st.focusDone) || 0) + fDelta;
    config.stats = st;
    if (typeof api.saveStats === 'function') {
      api.saveStats({ flush: true, focusDelta: fDelta });
    } else {
      api.setConfig({ stats: st });
    }
  }
  var tiredQuotes = ['好累喵… 爪子酸了 💦', '打工人小猫申请喘口气 💦', '汗流浃背了喵…', '摸摸猫头可以回血哦 ♥'];
  var meltdownQuotes = ['啊啊啊我不干了！彻底崩溃喵 🤯', '猫爪冒烟了… 已原地升天 👻', '罢工 7 秒！除非摸头哄哄我 💢', '老板我要小鱼干精神损失费！！'];
  var heatQuotes = ['手速起飞啦！猫爪冒烟中 🔥', '慢点慢点，要跟不上啦 🔥'];
  var coffeeQuotes = ['摸鱼喝口冰美式喵 ☕', '续命咖啡时间到~ 吨吨吨 ☕', '主人不打字，我先喝杯拿铁 ☕', '手冲咖啡提提神，满血待命 ✨'];
  var dozeQuotes = ['有点困了… 就眯一秒 😪', '没睡没睡！我在闭目想方案！', '眼皮在打架了喵… zZ', '唔… 刚才绝对没有点头打盹！'];
  var qTi = 0, qMi = 0, qHi = 0, qCi = 0, qDi = 0;

  function clearIdleTimers() { while (idleTimers.length) clearTimeout(idleTimers.pop()); }
  function clearMeltdownFX() { var fx = document.querySelector('.pk-meltdown-fx'); if (fx) fx.remove(); }
  function spawnSweat(side) {
    var old = document.querySelectorAll('.pk-sweat');
    if (old.length >= 4) old[0].remove();
    var el = document.createElement('div');
    el.className = 'pk-sweat';
    el.style.left = (window.innerWidth * (side ? 0.62 : 0.38) + (Math.random() * 14 - 7)) + 'px';
    el.style.top = (window.innerHeight * 0.25 + (Math.random() * 12 - 6)) + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }
  function spawnSpark(ch) {
    var old = document.querySelectorAll('.pk-spark');
    if (old.length >= 4) old[0].remove();
    var el = document.createElement('div');
    el.className = 'pk-spark';
    el.textContent = ch || '🔥';
    el.style.left = (window.innerWidth * (0.38 + Math.random() * 0.24)) + 'px';
    el.style.top = (window.innerHeight * 0.56) + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }
  function recoverFromMood(msg) {
    clearMeltdownFX(); clearIdleTimers();
    if (meltdownTimer) { clearTimeout(meltdownTimer); meltdownTimer = 0; }
    moodState = 'normal'; meltdownUntil = 0; idleSkitUntil = 0; fatigue = 0; heat = 0;
    if (pet) { pet.setMood('normal', 0); pet.perk(); }
    if (msg) spawnBubble(msg, window.innerWidth * 0.5, window.innerHeight * 0.14);
  }
  function triggerTiredMode(isDemo) {
    moodState = 'tired'; fatigue = Math.max(fatigue, 62);
    if (pet) pet.setMood('tired', isDemo ? 7000 : 12000);
    spawnSweat(true);
    setTimeout(function () { spawnSweat(false); }, 420);
    setTimeout(function () { spawnSweat(true); }, 900);
    var now = performance.now();
    if (isDemo || now - lastTiredQuoteAt > 16000) {
      lastTiredQuoteAt = now;
      spawnBubble(tiredQuotes[qTi++ % tiredQuotes.length], window.innerWidth * 0.5, window.innerHeight * 0.12);
    }
  }
  function triggerMeltdown(isDemo) {
    var now = performance.now();
    clearIdleTimers();
    moodState = 'meltdown'; meltdownUntil = now + 7500; fatigue = 100; heat = 100;
    if (pet) pet.setMood('meltdown', 7500);
    audio.meltdownSound();
    clearMeltdownFX();
    var fx = document.createElement('div');
    fx.className = 'pk-meltdown-fx';
    fx.innerHTML = '<div class="pk-gloom">☁ ⚡ ☁</div><div class="pk-vein">💢</div><div class="pk-soul">👻</div>';
    document.body.appendChild(fx);
    spawnSweat(true);
    setTimeout(function () { if (moodState === 'meltdown') spawnSweat(false); }, 550);
    spawnBubble(meltdownQuotes[qMi++ % meltdownQuotes.length], window.innerWidth * 0.5, window.innerHeight * 0.08);
    if (meltdownTimer) { clearTimeout(meltdownTimer); meltdownTimer = 0; }
    meltdownTimer = setTimeout(function () {
      meltdownTimer = 0;
      if (moodState === 'meltdown' && performance.now() >= meltdownUntil - 100) recoverFromMood('呼… 重启成功，继续陪你搬砖 🐾');
    }, 7600);
  }
  function triggerCoffeeMode(isDemo) {
    var now = performance.now();
    clearMeltdownFX(); clearIdleTimers();
    moodState = 'coffee'; lastIdleSkit = 'coffee'; fatigue = 0; heat = 0;
    var dur = 10400;
    idleSkitUntil = now + dur;
    nextIdleSkitAt = now + dur + 58000 + Math.random() * 24000;
    if (pet) pet.setMood('coffee', dur, !isDemo);
    spawnBubble(coffeeQuotes[qCi++ % coffeeQuotes.length], window.innerWidth * 0.5, window.innerHeight * 0.06);
    idleTimers.push(setTimeout(function () { if (moodState === 'coffee') audio.sipSound(); }, 950));
    idleTimers.push(setTimeout(function () { if (moodState === 'coffee') audio.sipSound(); }, 4150));
    idleTimers.push(setTimeout(function () {
      if (moodState === 'coffee' && performance.now() >= idleSkitUntil - 150) {
        moodState = 'normal'; idleSkitUntil = 0; if (pet) pet.setMood('normal', 0, true);
      }
    }, dur + 80));
  }
  function triggerDozeMode(isDemo) {
    var now = performance.now();
    clearMeltdownFX(); clearIdleTimers();
    moodState = 'doze'; lastIdleSkit = 'doze';
    var dur = 10200;
    idleSkitUntil = now + dur;
    nextIdleSkitAt = now + dur + 58000 + Math.random() * 24000;
    if (pet) pet.setMood('doze', dur, !isDemo);
    audio.dozeSound();
    spawnBubble(dozeQuotes[qDi++ % dozeQuotes.length], window.innerWidth * 0.5, window.innerHeight * 0.06);
    idleTimers.push(setTimeout(function () {
      if (moodState === 'doze') spawnBubble('唔！没睡没睡，在想事情！', window.innerWidth * 0.5, window.innerHeight * 0.06);
    }, 2800));
    idleTimers.push(setTimeout(function () {
      if (moodState === 'doze' && performance.now() >= idleSkitUntil - 150) {
        moodState = 'normal'; idleSkitUntil = 0; if (pet) pet.setMood('normal', 0, true);
      }
    }, dur + 80));
  }

  // === Smart Health Reminders + Pomodoro Focus Timer ===
  function getRemConfig() {
    var r = config.reminders || {};
    return {
      workStart: r.workStart || REM_DEFAULT.workStart,
      workEnd: r.workEnd || REM_DEFAULT.workEnd,
      weekdaysOnly: !!r.weekdaysOnly,
      standEnabled: r.standEnabled !== false,
      standIntervalMin: Number(r.standIntervalMin) || 60,
      standRestMin: Number(r.standRestMin) || 10,
      waterEnabled: r.waterEnabled !== false,
      waterIntervalMin: Number(r.waterIntervalMin) || 60,
      dailyItems: Array.isArray(r.dailyItems) ? r.dailyItems : REM_DEFAULT.dailyItems
    };
  }
  function parseHHMM(s) {
    var p = String(s || '08:00').split(':');
    return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
  }
  var remState = {
    lastStandAt: Date.now(), lastWaterAt: Date.now() - 30 * 60000,
    firedDaily: {}, snoozed: [], restTimer: 0, focusTimer: 0
  };
  function stopFocusTimer(silent) {
    var wasActive = !!remState.focusTimer;
    if (remState.focusTimer) { clearInterval(remState.focusTimer); remState.focusTimer = 0; }
    var old = document.querySelector('.pk-focus-pill');
    if (old) old.remove();
    if (wasActive && api.reportFocusState) api.reportFocusState({ active: false, minutes: 0, endAt: 0 });
    if (!silent && wasActive) spawnBubble('已结束番茄专注 🐾', window.innerWidth * 0.5, window.innerHeight * 0.14);
  }
  function startFocusTimer(minutes) {
    stopFocusTimer(true);
    if (remState.restTimer) { clearInterval(remState.restTimer); remState.restTimer = 0; var rp = document.querySelector('.pk-rest-pill'); if (rp) rp.remove(); }
    if (moodState === 'coffee' || moodState === 'doze') recoverFromMood('');
    var mins = minutes || 25;
    var endAt = Date.now() + mins * 60000;
    if (api.reportFocusState) api.reportFocusState({ active: true, minutes: mins, endAt: endAt });
    var pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'pk-focus-pill'; pill.title = '点击提前结束番茄专注';
    document.body.appendChild(pill);
    if (pet) pet.perk();
    spawnBubble('专注 ' + (minutes || 25) + ' 分钟开始', window.innerWidth * 0.5, window.innerHeight * 0.28);
    function update() {
      var left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      var mm = String(Math.floor(left / 60)).padStart(2, '0');
      var ss = String(left % 60).padStart(2, '0');
      pill.textContent = window.innerWidth < 240 ? ('🍅 ' + mm + ':' + ss) : ('🍅 专注 ' + mm + ':' + ss + ' · 点此结束');
      if (left <= 0) {
        stopFocusTimer(true);
        audio.chime();
        if (pet) pet.perk();
        for (var i = 0; i < 4; i++) setTimeout(function () { spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25); }, i * 100);
        spawnBubble('🍅 番茄专注达成！快起来喝口水 ✨', window.innerWidth * 0.5, window.innerHeight * 0.14);
        flushStats(1);
      }
    }
    pill.onclick = function () { stopFocusTimer(false); };
    update();
    remState.focusTimer = setInterval(update, 1000);
  }
  function startRestCountdown(minutes) {
    if (remState.restTimer) clearInterval(remState.restTimer);
    var old = document.querySelector('.pk-rest-pill');
    if (old) old.remove();
    var endAt = Date.now() + (minutes || 10) * 60000;
    var pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'pk-rest-pill'; pill.title = '点击提前结束休息';
    document.body.appendChild(pill);
    if (pet) pet.fastForwardToSleep();
    function update() {
      var left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      var mm = String(Math.floor(left / 60)).padStart(2, '0');
      var ss = String(left % 60).padStart(2, '0');
      pill.textContent = window.innerWidth < 240 ? ('🌿 休息 ' + mm + ':' + ss) : ('🌿 休息中 ' + mm + ':' + ss + ' · 点此结束');
      if (left <= 0) {
        clearInterval(remState.restTimer); remState.restTimer = 0; pill.remove();
        audio.chime();
        spawnBubble('休息结束，元气满满继续加油！✨', window.innerWidth * 0.5, window.innerHeight * 0.14);
        remState.lastStandAt = Date.now();
      }
    }
    pill.onclick = function () {
      clearInterval(remState.restTimer); remState.restTimer = 0; pill.remove();
      remState.lastStandAt = Date.now();
      spawnBubble('欢迎回来喵~ 🐾', window.innerWidth * 0.5, window.innerHeight * 0.14);
    };
    update();
    remState.restTimer = setInterval(update, 1000);
  }
  function showReminderCard(opts) {
    if (activeRemDismiss) activeRemDismiss();
    var old = document.querySelector('.pk-reminder');
    if (old) old.remove();
    audio.chime();
    if (pet) { pet.perk(); pet.tap('Right'); }
    interactive = true;
    api.setInteractive(true);
    var card = document.createElement('div');
    card.className = 'pk-reminder';
    card.innerHTML =
      '<button class="pk-rem-close" type="button" aria-label="关闭" title="关闭">×</button>' +
      '<div class="pk-rem-head"><div class="pk-rem-icon"></div>' +
      '<div class="pk-rem-copy"><div class="pk-rem-title"></div><div class="pk-rem-sub"></div></div></div>' +
      '<div class="pk-rem-actions"></div>';
    card.querySelector('.pk-rem-icon').textContent = opts.icon || '⏰';
    card.querySelector('.pk-rem-title').textContent = opts.title || '提醒';
    card.querySelector('.pk-rem-sub').textContent = opts.sub || '';
    var actions = card.querySelector('.pk-rem-actions');
    function dismiss() {
      if (activeRemDismiss === dismiss) activeRemDismiss = null;
      card.remove();
      window.removeEventListener('keydown', onEsc);
      if (!headDown && !isDraggingPet && !document.querySelector('.pk-reminder, .pk-rest-pill, .pk-focus-pill')) {
        var hit = '';
        try { if (pet && lastPointer.x >= 0) hit = pet.hitTest(lastPointer.x, lastPointer.y); } catch (_) {}
        if (!hit && interactive) { interactive = false; api.setInteractive(false); }
      }
    }
    activeRemDismiss = dismiss;
    function onEsc(e) { if (e.key === 'Escape') dismiss(); }
    window.addEventListener('keydown', onEsc);
    card.querySelector('.pk-rem-close').onclick = function () {
      dismiss();
      if (opts.kind === 'stand') remState.lastStandAt = Date.now();
      else if (opts.kind === 'water') remState.lastWaterAt = Date.now();
    };
    if (opts.kind === 'stand') {
      var b1 = document.createElement('button'); b1.className = 'pk-rem-btn primary'; b1.textContent = '休息 ' + (opts.restMin || 10) + 'm';
      b1.onclick = function () { dismiss(); startRestCountdown(opts.restMin || 10); };
      var b2 = document.createElement('button'); b2.className = 'pk-rem-btn'; b2.textContent = '稍后 5m';
      b2.onclick = function () { dismiss(); remState.snoozed.push({ at: Date.now() + 5 * 60000, opts: opts }); spawnBubble('5 分钟后再叫你喵~', window.innerWidth * 0.5, window.innerHeight * 0.14); };
      actions.append(b1, b2);
    } else if (opts.kind === 'water') {
      var w1 = document.createElement('button'); w1.className = 'pk-rem-btn primary'; w1.textContent = '喝完啦 ✓';
      w1.onclick = function () {
        dismiss(); remState.lastWaterAt = Date.now();
        var today = localDateKey();
        var count = (config.waterDate === today ? (Number(config.waterCount) || 0) : 0) + 1;
        config.waterDate = today;
        config.waterCount = count;
        if (typeof api.saveStats === 'function') {
          api.saveStats({ waterDate: today, waterCount: count });
        } else {
          api.setConfig({ waterDate: today, waterCount: count });
        }
        spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.28);
        spawnBubble('今日第 ' + count + ' 杯水达成！💧', window.innerWidth * 0.5, window.innerHeight * 0.14);
      };
      var w2 = document.createElement('button'); w2.className = 'pk-rem-btn'; w2.textContent = '稍后 10m';
      w2.onclick = function () { dismiss(); remState.snoozed.push({ at: Date.now() + 10 * 60000, opts: opts }); };
      actions.append(w1, w2);
    } else {
      var d1 = document.createElement('button'); d1.className = 'pk-rem-btn primary'; d1.textContent = '已完成 ✓';
      d1.onclick = function () { dismiss(); spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.28); spawnBubble('棒棒哒！已打卡 ✓', window.innerWidth * 0.5, window.innerHeight * 0.14); };
      var d2 = document.createElement('button'); d2.className = 'pk-rem-btn'; d2.textContent = '稍后 10m';
      d2.onclick = function () { dismiss(); remState.snoozed.push({ at: Date.now() + 10 * 60000, opts: opts }); spawnBubble('10 分钟后再提醒你喵~', window.innerWidth * 0.5, window.innerHeight * 0.14); };
      actions.append(d1, d2);
    }
    document.body.appendChild(card);
  }

  function onKey(p) {
    if (!p || !p.code) return;
    var code = p.code;
    if (p.down) {
      if (pressed.has(code)) return;
      pressed.add(code); pressedAt.set(code, performance.now());
      forwardInput(); audio.key(code); hideHint();
      if (p.repeat) return;
      if (!p.isDemo) { sessionTyped += 1; statsDirty += 1; }
      var now = performance.now();
      lastKeyAt = now;
      var sleepSec = Math.max(60, (Number(config.sleepMinutes) || 3) * 60);
      nextIdleSkitAt = now + Math.min(50, Math.max(25, sleepSec * 0.45)) * 1000;
      if (moodState === 'coffee' || moodState === 'doze') {
        var prev = moodState;
        clearIdleTimers(); moodState = 'normal'; idleSkitUntil = 0;
        if (pet) pet.setMood('normal', 0);
        if (now - lastWakeMsgAt > 12000) {
          lastWakeMsgAt = now;
          spawnBubble(prev === 'coffee' ? '放下咖啡！立刻开工喵 ⌨️' : '收到！瞬间清醒搬砖喵 ⚡', window.innerWidth * 0.5, window.innerHeight * 0.14);
        }
      }
      recentStamps.push(now);
      while (recentStamps.length && now - recentStamps[0] > 3000) recentStamps.shift();
      var kps = recentStamps.length / 3.0;
      if (config.staminaFun !== false && moodState !== 'meltdown') {
        var mult = kps > 6.5 ? 2.4 : kps > 4.2 ? 1.5 : 1.0;
        fatigue = Math.min(100, fatigue + 0.55 * mult);
        if (kps > 4.8) {
          heat = Math.min(100, heat + (kps - 3.8) * 1.9);
          if (heat > 58 && Math.random() < 0.25) spawnSpark('🔥');
          if (heat > 68 && now - lastHeatQuoteAt > 18000 && moodState === 'normal') {
            lastHeatQuoteAt = now;
            spawnBubble(heatQuotes[qHi++ % heatQuotes.length], window.innerWidth * 0.5, window.innerHeight * 0.14);
          }
        }
        if (fatigue >= 48 && moodState === 'normal') triggerTiredMode(false);
        else if (moodState === 'tired' && now - lastSweatAt > 1500) { lastSweatAt = now; spawnSweat(Math.random() > 0.5); }
        if ((fatigue >= 96 && heat >= 55) || fatigue >= 100) { triggerMeltdown(false); return; }
      }
      if (!config.privacy && !p.isDemo && moodState !== 'meltdown' && (sessionTyped === 100 || sessionTyped === 300 || sessionTyped === 500 || (sessionTyped >= 1000 && sessionTyped % 500 === 0))) {
        if (pet) pet.perk();
        spawnBubble('已敲 ' + sessionTyped + ' 下，手感火热！✦', window.innerWidth * 0.5, window.innerHeight * 0.14);
        spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25);
      }
    } else {
      var was = pressed.has(code);
      pressed.delete(code); pressedAt.delete(code);
      forwardInput();
      if (was) audio.keyUp(code);
    }
  }

  function triggerDemoTyping() {
    ['KeyP','KeyA','KeyW','KeyK','KeyE','KeyY','Space','KeyM','KeyE','KeyO','KeyW','Enter'].forEach(function (c, i) {
      setTimeout(function () { onKey({ code: c, down: true, repeat: false, isDemo: true }); }, i * 95);
      setTimeout(function () { onKey({ code: c, down: false, repeat: false, isDemo: true }); }, i * 95 + 68);
    });
  }

  function start() {
    if (!window.THREE || !window.createCat) {
      var fb = document.getElementById('fallback');
      if (fb) { fb.hidden = false; fb.textContent = '3D 渲染初始化失败'; }
      return;
    }
    pet = window.createCat(stage, {
      coat: coatFor(normalizeCatId(config.catSkin)),
      keyboardSkin: normalizeKbId(config.keyboardSkin),
      sleepMinutes: config.sleepMinutes
    });
    if (!pet) {
      var fb2 = document.getElementById('fallback');
      if (fb2) { fb2.hidden = false; fb2.textContent = 'WebGL 渲染上下文不可用'; }
      return;
    }
    window.__paw = { pet: pet, key: onKey, config: function () { return config; } };
    function syncHiddenState(h) {
      var hidden = !!h;
      window.__pkPetHidden = hidden;
      if (hidden) {
        flushStats(0);
        if (petting) { petting = false; audio.purrStop(); stopHearts(); }
        pressed.clear();
        pressedAt.clear();
        forwardInput();
      }
      if (pet && pet.setHidden) pet.setHidden(hidden);
      if (window.tail2d && window.tail2d.setHidden) window.tail2d.setHidden(hidden);
    }
    window.__pawkeySetPetHidden = syncHiddenState;
    window.__pawkeySleep = function (sleeping) {
      if (sleeping) {
        flushStats(0);
        if (petting) { petting = false; audio.purrStop(); stopHearts(); }
        audio.suspend();
        pressed.clear();
        pressedAt.clear();
        forwardInput();
      } else {
        audio.ensure();
      }
    };
    window.addEventListener('pawkey:hidden', function (ev) {
      syncHiddenState(ev && ev.detail && ev.detail.hidden);
    });
    if (window.__pkPetHidden) syncHiddenState(true);
    updateHintText();
    window.addEventListener('resize', updateHintText, { passive: true });

    // Pointer gestures: head-drag (>=5px) vs head-pet/double-click meow, body/keyboard drag
    window.addEventListener('pointerdown', function (ev) {
      if (ev.button === 2) return;
      if (ev.target && ev.target.closest && ev.target.closest('.pk-reminder, .pk-rest-pill, .pk-focus-pill')) return;
      var hit = '';
      try { hit = pet.hitTest(ev.clientX, ev.clientY); } catch (_) {}
      if (hit === 'head') {
        headDown = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, dragging: false };
        try { stage.setPointerCapture(ev.pointerId); } catch (_) {}
        petting = true;
        audio.ensure(); audio.purrStart(); hideHint();
        var now = performance.now();
        if (moodState === 'meltdown') {
          recoverFromMood('好吧好吧，看在摸头的份上原谅你了 ♥');
          for (var i = 0; i < 4; i++) setTimeout(function () { spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25); }, i * 95);
        } else if (moodState === 'coffee') {
          recoverFromMood('嘿嘿，你也想喝一口拿铁嘛~ ♥');
          spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25);
        } else if (moodState === 'doze') {
          recoverFromMood('唔… 被主人摸醒啦 ♥');
          spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25);
        } else if (moodState === 'tired' || fatigue > 35) {
          recoverFromMood('摸摸回满血啦！元气恢复 ✨');
          spawnHeart(window.innerWidth * 0.5, window.innerHeight * 0.25);
        } else if (now - lastHeadClickAt < 340) {
          triggerMeow(ev.clientX, ev.clientY - 18);
          lastHeadClickAt = 0;
        } else {
          lastHeadClickAt = now;
          spawnHeart(ev.clientX, ev.clientY - 12);
        }
        if (heartTimer) clearInterval(heartTimer);
        heartTimer = setInterval(function () {
          if (!petting) { clearInterval(heartTimer); heartTimer = 0; return; }
          spawnHeart(lastPointer.x > 0 ? lastPointer.x : window.innerWidth * 0.5, lastPointer.y > 0 ? lastPointer.y - 12 : window.innerHeight * 0.28);
        }, 280);
        return;
      }
      if (hit === 'body' || hit === 'keyboard') beginPetDrag();
    }, true);

    function stopPetting(keepSmile) {
      if (headDown) {
        try { stage.releasePointerCapture(headDown.id); } catch (_) {}
        headDown = null;
      }
      if (petting) {
        petting = false;
        audio.purrStop();
      } else {
        audio.purrStop();
      }
      stopHearts();
      if (pet) {
        if (keepSmile && pet.endPet) pet.endPet();
        else if (!keepSmile) pet.cancelPet();
      }
    }

    window.addEventListener('pointermove', function (ev) {
      if (ev.isTrusted && petting && (ev.buttons & 1) === 0) {
        stopPetting(true);
      }
      if (!headDown || headDown.dragging) return;
      if (ev.isTrusted === false && ev.buttons === 0) return;
      if ((ev.buttons & 1) === 0) { stopPetting(true); return; }
      if (Math.hypot(ev.clientX - headDown.x, ev.clientY - headDown.y) >= 5) {
        headDown.dragging = true;
        if (petting) { petting = false; audio.purrStop(); }
        stopHearts();
        pet.cancelPet();
        try { stage.releasePointerCapture(headDown.id); } catch (_) {}
        beginPetDrag();
      }
    }, true);

    window.addEventListener('pointerup', function () {
      stopPetting(true);
      if (isDraggingPet) api.dragEnd();
      else { window.__catDragFreeze = false; document.body.style.cursor = 'default'; }
    }, true);

    window.addEventListener('pointercancel', function () {
      stopPetting(false);
      if (isDraggingPet) api.dragEnd();
      finishPetDragUI();
    }, true);

    window.addEventListener('contextmenu', function (ev) { ev.preventDefault(); api.openSettings(); });
    window.addEventListener('blur', function () { if (petting || headDown) stopPetting(true); });
    window.addEventListener('pagehide', function () { flushStats(0); stopPetting(false); });
    window.addEventListener('beforeunload', function () { flushStats(0); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        flushStats(0);
        if (petting || headDown) stopPetting(false);
      }
    });

    // Host bridge subscriptions
    api.getConfig().then(applyConfig).catch(function () { applyConfig(DEFAULTS); });
    api.onConfig(applyConfig);
    if (typeof api.onStats === 'function') {
      api.onStats(function (st) {
        if (!st) return;
        if (st.waterDate != null) {
          config.waterDate = st.waterDate;
          config.waterCount = Number(st.waterCount) || 0;
        }
      });
    }
    api.onKey(onKey);
    api.onMouseButton(function (p) {
      if (!p) return;
      if (p.down) mouseButtons.add(p.button);
      else {
        mouseButtons.delete(p.button);
        if (p.button === 0 && (petting || headDown)) stopPetting(true);
      }
      forwardInput();
    });
    api.onGaze(function (p) { if (p && typeof p.nx === 'number') pet.setGaze(p.nx, p.ny); });
    api.onCursor(function (p) {
      if (p && p.leftDown === false && (petting || headDown)) {
        stopPetting(true);
      }
      if (!p || p.inside === false || typeof p.x !== 'number') {
        if (interactive && !headDown && !isDraggingPet) { interactive = false; api.setInteractive(false); }
        return;
      }
      var moved = Math.abs(p.x - lastPointer.x) + Math.abs(p.y - lastPointer.y) > 2;
      if (moved) {
        lastPointer.x = p.x; lastPointer.y = p.y;
        try { window.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, pointerType: 'mouse', bubbles: true })); } catch (_) {}
        hideHint();
      }
      var hit = '';
      try { hit = pet.hitTest(p.x, p.y); } catch (_) {}
      var now = performance.now();
      var overCard = !!document.querySelector('.pk-reminder, .pk-rest-pill, .pk-focus-pill');
      if (hit || overCard || headDown || isDraggingPet) {
        lastHitAt = now;
        if (!interactive) { interactive = true; api.setInteractive(true); }
      } else if (interactive && now - lastHitAt > 160) {
        interactive = false; api.setInteractive(false);
      }
    });

    // Shake-to-hunt & dizzy stars
    var shakeEnergy = 0, lastShakeAt = 0, lastDizzyAt = 0, lastHuntBubbleAt = 0;
    function triggerHunting(fromDemo) {
      pet.setHunting(3200);
      var now = performance.now();
      if (fromDemo || now - lastHuntBubbleAt > 6000) {
        lastHuntBubbleAt = now;
        spawnBubble('盯紧猎物! 🎯', window.innerWidth * 0.5, window.innerHeight * 0.12);
      }
    }
    function triggerDizzy() {
      var now = performance.now();
      if (now - lastDizzyAt < 3200) return;
      lastDizzyAt = now;
      var old = document.querySelector('.pk-dizzy'); if (old) old.remove();
      var dz = document.createElement('div'); dz.className = 'pk-dizzy';
      dz.innerHTML = '<span>★</span><span>✦</span><span>★</span>';
      document.body.appendChild(dz); setTimeout(function () { dz.remove(); }, 2700);
      spawnBubble('转晕了喵~ 💫', window.innerWidth * 0.5, window.innerHeight * 0.12);
      audio.ensure(); audio.lastMeow = 0; audio.meow();
    }
    api.onMouse(function (p) {
      var dx = p.dx || 0, dy = p.dy || 0;
      pet.mouseMoved(dx, dy);
      var speed = Math.hypot(dx, dy), now = performance.now();
      if (now - lastShakeAt > 450) shakeEnergy *= 0.35;
      lastShakeAt = now;
      if (speed > 42) {
        shakeEnergy = Math.min(2400, shakeEnergy + speed);
        if (shakeEnergy > 650) pet.setHunting(2200);
        if (shakeEnergy > 1950) { shakeEnergy = 0; triggerDizzy(); }
      } else shakeEnergy = Math.max(0, shakeEnergy - 28);
    });

    api.onDragEnd(function () {
      var was = isDraggingPet;
      isDraggingPet = false;
      finishPetDragUI();
      if (was) { pet.perk(); spawnBubble('已固定在这里啦 🐾', window.innerWidth * 0.5, window.innerHeight * 0.06); }
    });

    api.onPlayAction(function (p) {
      if (!p || !p.action) return;
      var a = p.action;
      if (a === 'meow') triggerMeow();
      else if (a === 'burst') triggerDemoTyping();
      else if (a === 'hunt') triggerHunting(true);
      else if (a === 'dizzy') triggerDizzy();
      else if (a === 'tired') triggerTiredMode(true);
      else if (a === 'meltdown') triggerMeltdown(true);
      else if (a === 'coffee') triggerCoffeeMode(true);
      else if (a === 'doze') triggerDozeMode(true);
      else if (a === 'focus-25') startFocusTimer(25);
      else if (a === 'focus-45') startFocusTimer(45);
      else if (a === 'focus-60') startFocusTimer(60);
      else if (a === 'focus-stop') stopFocusTimer(false);
      else if (a === 'test-stand') {
        var r = getRemConfig();
        showReminderCard({ kind: 'stand', icon: '🚶', restMin: r.standRestMin, title: '该起来走动休息啦！', sub: '已专注 ' + r.standIntervalMin + ' 分钟，起来活动 ' + r.standRestMin + ' 分钟吧' });
      } else if (a === 'test-water') {
        showReminderCard({ kind: 'water', icon: '💧', title: '咕噜咕噜 · 喝水时间到', sub: '来喝一杯温水润润喉，保持专注和好状态~' });
      } else if (a === 'test-daily') {
        var r2 = getRemConfig();
        var f = (r2.dailyItems && r2.dailyItems[0]) || { icon: '💊', title: '按时吃药提醒', note: '记得配温水服药哦~', time: '09:00' };
        showReminderCard({ kind: 'daily', icon: f.icon || '💊', title: f.title || '每日定时提醒', sub: (f.note || '时间到了，别忘记哦~') + ' (' + (f.time || '09:00') + ')' });
      } else if (a === 'nap') {
        pet.fastForwardToSleep();
        spawnBubble('晚安喵 Zzz...', window.innerWidth * 0.5, window.innerHeight * 0.14);
      } else if (a === 'tap') {
        pet.tap(Math.random() > 0.5 ? 'Left' : 'Right');
      }
    });

    // Periodic 1s tick: stamina cooldown + idle coffee/doze scheduler
    setInterval(function () {
      var now = performance.now();
      if (moodState === 'meltdown') { if (now >= meltdownUntil) recoverFromMood('呼… 重启成功，继续陪你搬砖 🐾'); return; }
      if (moodState === 'coffee' || moodState === 'doze') {
        if (now >= idleSkitUntil) { clearIdleTimers(); moodState = 'normal'; idleSkitUntil = 0; pet.setMood('normal', 0, true); }
        return;
      }
      var lastTap = recentStamps.length ? recentStamps[recentStamps.length - 1] : 0;
      var idleSec = (now - lastTap) / 1000;
      heat = Math.max(0, heat - (idleSec > 1.5 ? 10 : 3.5));
      if (idleSec > 4) {
        fatigue = Math.max(0, fatigue - 3.5);
        if (moodState === 'tired' && fatigue < 22) { moodState = 'normal'; pet.setMood('normal', 0, true); }
      }
      if (moodState === 'tired' && idleSec < 5 && now - lastSweatAt > 1800) { lastSweatAt = now; spawnSweat(Math.random() > 0.5); }
      if (config.idleFun !== false && !remState.focusTimer && moodState === 'normal' && !petting && !document.querySelector('.pk-reminder, .pk-rest-pill, .pk-focus-pill')) {
        var st = pet.state();
        var sleepSec = Math.max(60, (Number(config.sleepMinutes) || 3) * 60);
        var thresh = Math.min(50, Math.max(25, sleepSec * 0.45));
        if (st !== 'sleeping' && st !== 'petting' && (now - lastKeyAt) / 1000 >= thresh && now >= nextIdleSkitAt) {
          var pickCoffee = lastIdleSkit === 'coffee' ? Math.random() < 0.25 : lastIdleSkit === 'doze' ? Math.random() < 0.75 : Math.random() < 0.52;
          if (pickCoffee) triggerCoffeeMode(false); else triggerDozeMode(false);
        }
      }
    }, 1000);

    // Periodic 10s stats persist + 15s Health Reminders
    setInterval(function () { flushStats(0); }, 10000);
    var _lastRemDate = localDateKey();
    setInterval(function () {
      var now = new Date(), nowMs = now.getTime(), todayStr = localDateKey(now);
      if (todayStr !== _lastRemDate) { _lastRemDate = todayStr; remState.firedDaily = {}; }
      if (config.dndMode || remState.focusTimer) return;
      if (remState.snoozed.length) {
        var due = [];
        remState.snoozed = remState.snoozed.filter(function (x) { if (nowMs >= x.at) { due.push(x.opts); return false; } return true; });
        if (due.length) { showReminderCard(due[0]); return; }
      }
      var r = getRemConfig();
      var hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      for (var i = 0; i < r.dailyItems.length; i++) {
        var d = r.dailyItems[i];
        if (!d || !d.enabled || !d.time) continue;
        var key = todayStr + '|' + (d.id || i) + '|' + d.time;
        if (d.time === hhmm && !remState.firedDaily[key]) {
          remState.firedDaily[key] = true;
          showReminderCard({ kind: 'daily', icon: d.icon || '💊', title: d.title || '每日定时提醒', sub: (d.note || '时间到了，别忘记哦~') + ' (' + d.time + ')' });
          return;
        }
      }
      var day = now.getDay();
      if (r.weekdaysOnly && (day === 0 || day === 6)) return;
      var curMin = now.getHours() * 60 + now.getMinutes();
      var sMin = parseHHMM(r.workStart), eMin = parseHHMM(r.workEnd);
      var inWork = sMin <= eMin ? (curMin >= sMin && curMin <= eMin) : (curMin >= sMin || curMin <= eMin);
      if (!inWork || remState.restTimer) return;
      if (r.standEnabled && nowMs - remState.lastStandAt >= r.standIntervalMin * 60000) {
        remState.lastStandAt = nowMs;
        showReminderCard({ kind: 'stand', icon: '🚶', restMin: r.standRestMin, title: '该起来走动休息啦！', sub: '已专注 ' + r.standIntervalMin + ' 分钟，起来活动 ' + r.standRestMin + ' 分钟吧' });
        return;
      }
      if (r.waterEnabled && nowMs - remState.lastWaterAt >= r.waterIntervalMin * 60000) {
        remState.lastWaterAt = nowMs;
        showReminderCard({ kind: 'water', icon: '💧', title: '咕噜咕噜 · 喝水时间到', sub: '来喝一杯温水润润喉，保持专注和好状态~' });
      }
    }, 15000);

    // Stuck key guard
    setInterval(function () {
      var now = performance.now(), changed = false;
      pressedAt.forEach(function (at, code) { if (now - at > 2200) { pressed.delete(code); pressedAt.delete(code); changed = true; } });
      if (changed) forwardInput();
    }, 500);

    api.ready();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
