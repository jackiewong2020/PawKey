/* PawKey — Native macOS Minimalist Settings Controller */
(function () {
  'use strict';

  var DEFAULTS = {
    catSkin: 'cow', keyboardSkin: 'cream', eyeColor: 'auto', collar: true,
    scale: 0.85, opacity: 1, keyboardVisible: true, sound: true, volume: 0.45,
    switchSound: 's2', keyUpSound: true, staminaFun: true, idleFun: true, dndMode: false,
    sleepMinutes: 3, privacy: false, leftMouse: false, clickThrough: false,
    hideInFullscreen: false, lowPower: false, alwaysOnTop: true, launchAtStartup: false,
    bgMode: 'transparent',
    reminders: {
      workStart: '08:00', workEnd: '18:00', weekdaysOnly: false,
      standEnabled: true, standIntervalMin: 60, standRestMin: 10,
      waterEnabled: true, waterIntervalMin: 60,
      dailyItems: [{ id: 'med-1', enabled: true, time: '09:00', icon: '💊', title: '按时吃药提醒', note: '记得配温水服药哦~' }]
    }
  };

  var CAT_META = {
    cow:     { tag: '呆毛', toast: '奶牛猫 · 呆毛小二货报道' },
    orange:  { tag: '胖橘', toast: '橘猫 · 圆滚滚吃货登场' },
    tabby:   { tag: '酷眉', toast: '狸花 · 拽酷大哥上线' },
    calico:  { tag: '蝴蝶结', toast: '三花 · 丝带蝴蝶结闪亮登场' },
    white:   { tag: '皇冠', toast: '白猫 · 戴上迷你金皇冠啦' },
    blue:    { tag: '打工', toast: '蓝灰 · 眼镜领带准时打卡' },
    ragdoll: { tag: '樱花', toast: '布偶 · 樱花发饰仙女驾到' },
    siamese: { tag: '戏精', toast: '暹罗 · 挖煤戏精斗鸡眼就位' },
    maine:   { tag: '摇滚', toast: '缅因 · 炸毛叼草潇洒登场' }
  };
  var SKIN_ALIAS = { tuxedo: 'cow', ginger: 'orange', ivory: 'white', british: 'blue', hachi: 'cow' };
  var KB_ALIAS = { studio: 'cream', space: 'charcoal', retro: 'peach', matcha: 'mint', mist: 'sky', blossom: 'lilac' };

  var api = window.pawkeyAPI || {
    getConfig: function () { return Promise.resolve(DEFAULTS); },
    setConfig: function (p) { return Promise.resolve(Object.assign({}, state, p)); },
    onConfig: function () {}, onStats: function () {}, getStats: function () {},
    onFocusState: function () {}, getFocusState: function () {},
    playAction: function () {}, closeSettings: function () {}, hidePet: function () {},
    quit: function () {}, dragWindow: function () {}, minimizeSettings: function () {},
    requestPermission: function () {}, relaunch: function () {}, resetPosition: function () {}
  };

  var $ = function (id) { return document.getElementById(id); };
  var toast = $('toast'), toastTimer = 0;
  var state = null, inFlight = false, queuedPatch = null, queuedWaiters = [];

  var PACK_META = {
    s1: { name: 'Frost Click · 清脆青轴', desc: '整个系列里最锐利的一款，每次按下都是一记干脆的机械 Click（Cherry MX Blue PBT 实录）。' },
    s2: { name: 'Ruby Thock · 麻将石子', desc: '顺滑线性、圆润饱满的麻将 Thock，完全不刺耳，最适合长时间码字（EG Oreo 实录）。' },
    s3: { name: 'Chestnut Bump · 柔段茶轴', desc: '柔和段落感，敲击有分量又不打扰周围，办公全能折中之选（Cherry MX Brown PBT 实录）。' },
    s4: { name: 'Midnight Thock · 静电容闷响', desc: '低沉温柔的厚重低频，接近阻尼极佳的静电容手感（Topre PBT 实录）。' },
    s5: { name: 'Alpine Pop · 晶紫脆响', desc: '轻盈通透带跳跃高音的活泼噼啪声，高速打字依然清澈（EG Crystal Purple 实录）。' },
    s6: { name: 'Onyx Glide · 沉稳黑轴', desc: '磨圆棱角的低沉线性音，按下去像柔和沉稳的鼓点（Cherry MX Black PBT 实录）。' },
    s7: { name: 'Glacier Glide · 轻盈红轴', desc: '明亮干净但不 clicky，清冷通透的轻快线性手感（Cherry MX Red ABS 实录）。' },
    s8: { name: 'Cream Clack · 奶油脆底', desc: '饱满厚软、触底带清脆 Clack，既有深沉底音又有脆劲（客制奶油脆响）。' }
  };

  function localDateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function updateRangeFill(i) {
    if (!i) return;
    var a = Number(i.min || 0), b = Number(i.max || 1), v = Number(i.value || 0);
    i.style.setProperty('--pct', Math.max(0, Math.min(100, ((v - a) / Math.max(1e-6, b - a)) * 100)).toFixed(1) + '%');
  }
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  var studioAudio = window.PawKeyAudio ? new window.PawKeyAudio() : null;

  function keyboardSVG(skin) {
    var art = '<svg viewBox="0 0 80 44" aria-hidden="true">' +
      '<rect x="3" y="6" width="74" height="33" rx="6" fill="' + (skin.shellDark || skin.shell) + '"/>' +
      '<rect x="3" y="4" width="74" height="32" rx="6" fill="' + skin.shell + '" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>' +
      '<rect x="6.5" y="7.5" width="67" height="25" rx="3.5" fill="' + skin.plate + '"/>';
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 6; c++) {
        var fill = ((r === 0 && c === 0) || (r === 2 && c === 5)) ? skin.accent : (c === 0 || c === 5 ? skin.mod : skin.key);
        art += '<rect x="' + (8.2 + c * 10.7).toFixed(1) + '" y="' + (9.2 + r * 7.6).toFixed(1) + '" width="9.2" height="6.2" rx="1.6" fill="' + fill + '" stroke="rgba(0,0,0,0.07)" stroke-width="0.5"/>';
      }
    }
    return art + '</svg>';
  }

  function updateHeroPortrait(catId) {
    var cat = (window.getCatSkin && window.getCatSkin(catId)) || { id: 'cow', name: '奶牛' };
    var meta = CAT_META[cat.id] || { tag: '原创' };
    var img = $('heroAvatarImg');
    if (img) img.src = '../assets/cats/' + cat.id + '.png';
    if ($('heroCatName')) $('heroCatName').textContent = cat.name;
    if ($('heroCatTag')) $('heroCatTag').textContent = meta.tag;
  }

  function buildSkins() {
    var catGrid = $('catGrid'), kbGrid = $('keyboardGrid');
    (window.CAT_SKINS || []).forEach(function (c) {
      var metaInfo = CAT_META[c.id] || { tag: '' };
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'skin-card'; btn.dataset.cat = c.id;
      var img = document.createElement('img');
      img.className = 'cat-thumb';
      img.alt = c.name;
      img.src = '../assets/cats/' + c.id + '.png';
      var meta = document.createElement('span');
      meta.className = 'skin-meta';
      meta.innerHTML = '<span class="skin-name"></span><span class="skin-tag"></span>';
      meta.querySelector('.skin-name').textContent = c.name;
      meta.querySelector('.skin-tag').textContent = metaInfo.tag;
      btn.append(img, meta);
      catGrid.appendChild(btn);
    });
    (window.KEYBOARD_SKINS || []).forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'skin-card'; btn.dataset.keyboard = k.id;
      btn.innerHTML = '<span class="kb-swatch">' + keyboardSVG(k) + '</span><span class="skin-name"></span>';
      btn.querySelector('.skin-name').textContent = k.name;
      kbGrid.appendChild(btn);
    });
    catGrid.addEventListener('click', function (ev) {
      var card = ev.target.closest('[data-cat]'); if (!card) return;
      var id = card.dataset.cat;
      sync(Object.assign({}, state, { catSkin: id }));
      commit({ catSkin: id });
      var info = CAT_META[id];
      showToast((info && info.toast) || '已切换角色');
      api.playAction('tap');
    });
    kbGrid.addEventListener('click', function (ev) {
      var card = ev.target.closest('[data-keyboard]'); if (!card) return;
      sync(Object.assign({}, state, { keyboardSkin: card.dataset.keyboard }));
      commit({ keyboardSkin: card.dataset.keyboard });
    });
  }

  function commit(patch) {
    queuedPatch = Object.assign(queuedPatch || {}, patch);
    var p = new Promise(function (resolve) { queuedWaiters.push(resolve); });
    if (!inFlight) flushCommitQueue();
    return p;
  }

  async function flushCommitQueue() {
    inFlight = true;
    try {
      while (queuedPatch) {
        var cur = queuedPatch; queuedPatch = null;
        var waiters = queuedWaiters; queuedWaiters = [];
        var next = null;
        try { next = await api.setConfig(cur); } catch (_) {}
        if (next && next.catSkin != null && !queuedPatch) sync(next);
        for (var i = 0; i < waiters.length; i++) waiters[i](next);
      }
    } finally {
      inFlight = false;
      if (queuedPatch) flushCommitQueue();
    }
  }

  function getRem() {
    var base = DEFAULTS.reminders;
    var r = (state && state.reminders) || {};
    return Object.assign({}, base, r, { dailyItems: Array.isArray(r.dailyItems) ? r.dailyItems.slice() : base.dailyItems.slice() });
  }
  function commitRem(patch) {
    var next = Object.assign(getRem(), patch);
    state = Object.assign({}, state || DEFAULTS, { reminders: next });
    commit({ reminders: next });
  }

  function renderDailyList(items) {
    var list = $('dailyList'); if (!list) return;
    list.innerHTML = '';
    if (!items || !items.length) {
      list.innerHTML = '<div class="daily-empty">暂无每日定时事项，可在下方快速添加</div>';
      return;
    }
    items.forEach(function (item) {
      var row = document.createElement('div'); row.className = 'daily-item';
      row.innerHTML = '<div class="daily-item-left"><span class="daily-icon"></span><span class="daily-time"></span><span class="daily-title"></span></div>' +
        '<div class="daily-item-right"><label class="switch"><input type="checkbox"><span class="track"></span></label><button class="daily-del" type="button" title="删除">×</button></div>';
      row.querySelector('.daily-icon').textContent = item.icon || '💊';
      row.querySelector('.daily-time').textContent = item.time || '09:00';
      row.querySelector('.daily-title').textContent = item.title || '每日提醒';
      var chk = row.querySelector('input'); chk.checked = item.enabled !== false;
      chk.onchange = function () {
        var arr = getRem().dailyItems.map(function (x) { return x.id === item.id ? Object.assign({}, x, { enabled: chk.checked }) : x; });
        commitRem({ dailyItems: arr });
      };
      row.querySelector('.daily-del').onclick = function () {
        var arr = getRem().dailyItems.filter(function (x) { return x.id !== item.id; });
        renderDailyList(arr); commitRem({ dailyItems: arr }); showToast('已删除提醒');
      };
      list.appendChild(row);
    });
  }

  function sync(cfg) {
    state = Object.assign({}, DEFAULTS, cfg || {});
    var catId = SKIN_ALIAS[state.catSkin] || state.catSkin || 'cow';
    var kbId = KB_ALIAS[state.keyboardSkin] || state.keyboardSkin || 'cream';
    var catObj = (window.getCatSkin && window.getCatSkin(catId)) || { id: 'cow' };
    var kbObj = (window.getKeyboardSkin && window.getKeyboardSkin(kbId)) || { id: 'cream' };
    state.catSkin = catObj.id;
    state.keyboardSkin = kbObj.id;

    updateHeroPortrait(state.catSkin);

    document.querySelectorAll('[data-cat]').forEach(function (b) { b.classList.toggle('active', b.dataset.cat === state.catSkin); });
    document.querySelectorAll('[data-keyboard]').forEach(function (b) { b.classList.toggle('active', b.dataset.keyboard === state.keyboardSkin); });
    var curEye = state.eyeColor || 'auto';
    document.querySelectorAll('[data-eye]').forEach(function (b) { b.classList.toggle('active', b.dataset.eye === curEye); });
    $('collarToggle').checked = state.collar !== false;

    var sw = /^s[1-8]$/.test(String(state.switchSound || '')) ? state.switchSound : 's2';
    document.querySelectorAll('[data-switch]').forEach(function (b) { b.classList.toggle('active', b.dataset.switch === sw); });
    if (PACK_META[sw]) {
      $('packDescCard').textContent = PACK_META[sw].desc;
      $('kstActiveTag').textContent = PACK_META[sw].name.split(' · ')[0];
    }
    if (studioAudio) {
      studioAudio.setEnabled(state.sound !== false);
      studioAudio.setVolume(state.volume != null ? state.volume : 0.45);
      studioAudio.setKeyUpEnabled(state.keyUpSound !== false);
      studioAudio.setSwitchPack(sw);
      studioAudio.ensure();
    }

    $('sound').checked = state.sound !== false;
    $('keyUpSound').checked = state.keyUpSound !== false;
    $('volume').value = String(state.volume != null ? state.volume : 0.45);
    $('volume').disabled = !state.sound;
    $('volumeValue').textContent = Math.round((state.volume != null ? state.volume : 0.45) * 100) + '%';
    $('volumeValue').style.opacity = state.sound ? '1' : '0.45';
    updateRangeFill($('volume'));

    $('keyboardVisible').checked = state.keyboardVisible !== false;
    $('leftMouse').checked = !!state.leftMouse;
    $('staminaFun').checked = state.staminaFun !== false;
    $('idleFun').checked = state.idleFun !== false;
    $('dndMode').checked = !!state.dndMode;
    $('privacy').checked = !!state.privacy;
    $('sleepMinutes').value = String(state.sleepMinutes || 3);

    var sc = state.scale || 0.85;
    $('scale').value = String(sc);
    $('scaleValue').textContent = Math.round(sc * 100) + '%';
    updateRangeFill($('scale'));
    document.querySelectorAll('[data-scale-preset]').forEach(function (b) {
      b.classList.toggle('active', Math.abs(Number(b.dataset.scalePreset) - sc) < 0.03);
    });
    var op = Math.max(0.3, Math.min(1, Number(state.opacity != null ? state.opacity : 1)));
    $('opacity').value = String(op);
    $('opacityValue').textContent = Math.round(op * 100) + '%';
    updateRangeFill($('opacity'));

    var bgm = state.bgMode || 'transparent';
    document.querySelectorAll('[data-bg-mode]').forEach(function (b) { b.classList.toggle('active', b.dataset.bgMode === bgm); });
    $('clickThrough').checked = !!state.clickThrough;
    $('hideInFullscreen').checked = !!state.hideInFullscreen;
    $('lowPower').checked = !!state.lowPower;
    $('alwaysOnTop').checked = state.alwaysOnTop !== false;
    $('launchAtStartup').checked = !!state.launchAtStartup;

    var r = getRem();
    $('remWorkStart').value = r.workStart || '08:00';
    $('remWorkEnd').value = r.workEnd || '18:00';
    $('remWeekdaysOnly').checked = !!r.weekdaysOnly;
    var standOn = r.standEnabled !== false;
    $('remStandEnabled').checked = standOn;
    $('remStandInterval').value = String(r.standIntervalMin || 60);
    $('remStandRest').value = String(r.standRestMin || 10);
    $('remStandInterval').disabled = !standOn;
    $('remStandRest').disabled = !standOn;
    var standRow = $('remStandInterval').closest('.inline-row');
    if (standRow) standRow.classList.toggle('disabled', !standOn);
    var waterOn = r.waterEnabled !== false;
    $('remWaterEnabled').checked = waterOn;
    $('remWaterInterval').value = String(r.waterIntervalMin || 60);
    $('remWaterInterval').disabled = !waterOn;
    var waterRow = $('remWaterInterval').closest('.inline-row');
    if (waterRow) waterRow.classList.toggle('disabled', !waterOn);
    renderDailyList(r.dailyItems);

    var today = localDateKey();
    var wc = (state.waterDate === today) ? (Number(state.waterCount) || 0) : 0;
    $('waterBadge').textContent = '今日 ' + wc + ' 杯 +';
    $('statWater').textContent = wc + ' 杯';

    var st = state.stats || {};
    var savedToday = (st.date === today) ? (Number(st.todayKeys) || 0) : 0;
    var savedTotal = Number(st.totalKeys) || savedToday;
    var focusDone = (st.date === today) ? (Number(st.focusDone) || 0) : 0;
    window.__pkSavedToday = savedToday;
    window.__pkSavedTotal = savedTotal;
    var dispKeys;
    if (window.__pkAuthDate === today && window.__pkAuthToday != null) {
      dispKeys = Math.max(savedToday, window.__pkAuthToday);
    } else if (window.__pkAuthDate && window.__pkAuthDate !== today) {
      dispKeys = savedToday;
      window.__pkAuthDate = today;
      window.__pkAuthToday = savedToday;
      window.__pkAuthTotal = savedTotal;
    } else {
      dispKeys = (!st.date || st.date === today)
        ? Math.max(savedToday, window.__pkLiveKeys || 0)
        : savedToday;
    }
    var dispTotal = (window.__pkAuthTotal != null)
      ? Math.max(savedTotal, window.__pkAuthTotal)
      : Math.max(savedTotal, dispKeys);
    $('statKeys').textContent = String(dispKeys);
    $('statKeysWrap').title = '今日敲击 ' + dispKeys + ' 次 · 历史累计 ' + dispTotal + ' 次';
    $('focusDoneHint').textContent = '今日已完成 ' + focusDone + ' 个番茄';

    var remTab = document.querySelector('[data-tab="reminders"]');
    if (remTab) remTab.classList.toggle('has-active-rem', !!(r.standEnabled || r.waterEnabled || (r.dailyItems || []).some(function (x) { return x.enabled !== false; })));
  }

  var focusState = { active: false, minutes: 0, endAt: 0 }, focusTick = 0;
  var kstMap = {}, previewSeq = 0, previewTimers = [], _liveTimer = 0, _resetArmed = 0;
  function flashKey(c, dn) { if (kstMap[c]) kstMap[c].classList.toggle('down', !!dn); }
  function clearPreviewTimers() { while (previewTimers.length) clearTimeout(previewTimers.pop()); }
  function clearKstDown() { Object.keys(kstMap).forEach(function (c) { flashKey(c, false); }); }

  function cleanupRuntime(destroyAudio) {
    previewSeq++;
    clearPreviewTimers();
    clearKstDown();
    if (focusTick) { clearInterval(focusTick); focusTick = 0; }
    if (_liveTimer) { clearTimeout(_liveTimer); _liveTimer = 0; }
    if (_resetArmed) {
      clearTimeout(_resetArmed);
      _resetArmed = 0;
      if ($('resetBtn')) $('resetBtn').textContent = '恢复默认';
    }
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = 0; }
    if (studioAudio) {
      if (destroyAudio) studioAudio.destroy();
      else studioAudio.suspend();
    }
  }

  function updateVersionLabel(ver) {
    var v = ver || (window.__PAWKEY_ENV__ && window.__PAWKEY_ENV__.version) || '1.1.0';
    if ($('appVersion')) $('appVersion').textContent = 'PawKey ' + v;
  }

  function updatePermBanner() {
    var activeTab = document.querySelector('.tab-btn.active');
    var tid = activeTab ? activeTab.dataset.tab : 'skins';
    var banner = $('permBanner');
    if (!banner) return;
    banner.hidden = !!window.__pkHookOk || (tid !== 'skins' && tid !== 'interact');
    var needRel = !!window.__pkNeedsRelaunch;
    if ($('permTitle')) $('permTitle').textContent = needRel ? '权限已开启，重启即可生效' : '开启全局打字同步';
    if ($('permDesc')) {
      $('permDesc').innerHTML = needRel
        ? 'macOS 已授予 <b>PawKey</b> 输入权限，点击「立即重启生效」即可激活全局监听与 104 键音效。'
        : '前往「系统设置 → 隐私与安全性 → 输入监控」打开 <b>PawKey</b> 开关（若列表中已有 PawKey，请先<b>关闭再重新打开</b>或点 <b>-</b> 移除后重新添加），再点「立即重启」即可生效。';
    }
    if ($('bannerOpenPermBtn')) $('bannerOpenPermBtn').classList.toggle('primary', !needRel);
    if ($('bannerRelaunchBtn')) {
      $('bannerRelaunchBtn').classList.toggle('primary', needRel);
      $('bannerRelaunchBtn').textContent = needRel ? '立即重启生效' : '已开启，立即重启';
    }
  }

  function renderFocusUI() {
    var now = Date.now();
    var running = !!(focusState.active && focusState.endAt > now);
    document.querySelectorAll('[data-focus-min]').forEach(function (b) {
      b.classList.toggle('active', running && Number(b.dataset.focusMin) === Number(focusState.minutes));
    });
    if ($('focusStopBtn')) $('focusStopBtn').disabled = !running;
    if ($('focusStatus')) $('focusStatus').hidden = !running;
    if (running && $('focusCountdown')) {
      var left = Math.max(0, Math.ceil((focusState.endAt - now) / 1000));
      var mm = String(Math.floor(left / 60)).padStart(2, '0');
      var ss = String(left % 60).padStart(2, '0');
      $('focusCountdown').textContent = '专注中 · ' + mm + ':' + ss;
    } else if (!running && focusTick) {
      clearInterval(focusTick);
      focusTick = 0;
    }
  }

  function applyFocusState(st) {
    focusState = st && st.active && st.endAt > Date.now()
      ? { active: true, minutes: Number(st.minutes) || 25, endAt: Number(st.endAt) }
      : { active: false, minutes: 0, endAt: 0 };
    if (focusTick) { clearInterval(focusTick); focusTick = 0; }
    if (focusState.active) focusTick = setInterval(renderFocusUI, 1000);
    renderFocusUI();
  }

  function switchTab(id) {
    if (id !== 'interact') {
      previewSeq++;
      clearPreviewTimers();
      clearKstDown();
    }
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      var on = b.dataset.tab === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.toggle('active', p.dataset.pane === id); });
    document.querySelector('.scroll').scrollTop = 0;
    updatePermBanner();
    if (id === 'interact' && studioAudio) studioAudio.loadPack((state && state.switchSound) || 's2');
  }

  function bindAll() {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.onclick = function () { switchTab(b.dataset.tab); }; });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (ev.isComposing || ev.keyCode === 229) return;
        var ae = document.activeElement;
        if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) {
          ev.preventDefault();
          ae.blur();
          return;
        }
        api.closeSettings();
        return;
      }
      if ((ev.metaKey || ev.ctrlKey) && /^[1-4]$/.test(ev.key)) {
        ev.preventDefault();
        switchTab(['skins', 'interact', 'reminders', 'window'][Number(ev.key) - 1]);
      }
    });

    // Companion avatar & quick actions
    $('heroStickerBtn').onclick = function () {
      var b = $('heroStickerBtn');
      b.classList.remove('boop'); void b.offsetWidth; b.classList.add('boop');
      api.playAction('meow');
      setTimeout(function () { b.classList.remove('boop'); }, 220);
    };
    var acts = {
      playMeowBtn: ['meow', '喵了一声'], playTypeBtn: ['burst', '开始连敲演示'],
      playHuntBtn: ['hunt', '进入捕猎模式'], playCoffeeBtn: ['coffee', '抱起拿铁喝咖啡'],
      playDozeBtn: ['doze', '冒着鼻涕泡打盹'], playNapBtn: ['nap', '变成猫饼睡着啦'],
      playTiredBtn: ['tired', '打字累到流汗啦'], playMeltBtn: ['meltdown', '狂敲崩溃！摸头可哄好']
    };
    Object.keys(acts).forEach(function (id) {
      $(id).onclick = function () { api.playAction(acts[id][0]); showToast(acts[id][1]); };
    });

    document.querySelectorAll('[data-eye]').forEach(function (b) {
      b.onclick = function () { sync(Object.assign({}, state, { eyeColor: b.dataset.eye })); commit({ eyeColor: b.dataset.eye }); };
    });
    $('collarToggle').onchange = function (e) { commit({ collar: e.target.checked }); };

    // Focus & Reminders
    document.querySelectorAll('[data-focus-min]').forEach(function (b) {
      b.onclick = function () {
        var mins = Number(b.dataset.focusMin) || 25;
        api.playAction('focus-' + mins);
        applyFocusState({ active: true, minutes: mins, endAt: Date.now() + mins * 60000 });
        showToast('已开启 ' + mins + ' 分钟专注');
      };
    });
    $('focusStopBtn').onclick = function () {
      if (!focusState.active || focusState.endAt <= Date.now()) { renderFocusUI(); return; }
      api.playAction('focus-stop');
      applyFocusState({ active: false, minutes: 0, endAt: 0 });
      showToast('已结束专注');
    };
    $('dndMode').onchange = function (e) { commit({ dndMode: e.target.checked }); showToast(e.target.checked ? '已开启会议勿扰' : '已关闭会议勿扰'); };

    $('remWorkStart').onchange = function (e) { commitRem({ workStart: e.target.value || '08:00' }); };
    $('remWorkEnd').onchange = function (e) { commitRem({ workEnd: e.target.value || '18:00' }); };
    $('remWeekdaysOnly').onchange = function (e) { commitRem({ weekdaysOnly: e.target.checked }); };
    $('remStandEnabled').onchange = function (e) { commitRem({ standEnabled: e.target.checked }); sync(state); };
    $('remStandInterval').onchange = function (e) { commitRem({ standIntervalMin: Number(e.target.value) }); };
    $('remStandRest').onchange = function (e) { commitRem({ standRestMin: Number(e.target.value) }); };
    $('remWaterEnabled').onchange = function (e) { commitRem({ waterEnabled: e.target.checked }); sync(state); };
    $('remWaterInterval').onchange = function (e) { commitRem({ waterIntervalMin: Number(e.target.value) }); };
    $('testStandBtn').onclick = function () { api.playAction('test-stand'); showToast('已在桌面预览久坐提醒'); };
    $('testWaterBtn').onclick = function () { api.playAction('test-water'); showToast('已在桌面预览喝水提醒'); };
    $('testDailyBtn').onclick = function () { api.playAction('test-daily'); showToast('已在桌面预览定时提醒'); };
    $('waterBadge').onclick = function () {
      var td = localDateKey();
      var next = ((state && state.waterDate === td) ? (Number(state.waterCount) || 0) : 0) + 1;
      if (state) { state.waterDate = td; state.waterCount = next; }
      $('waterBadge').textContent = '今日 ' + next + ' 杯 +';
      $('statWater').textContent = next + ' 杯';
      if (typeof api.saveStats === 'function') {
        api.saveStats({ waterDate: td, waterCount: next });
      } else {
        commit({ waterDate: td, waterCount: next });
      }
      showToast('喝水打卡第 ' + next + ' 杯');
    };
    document.querySelectorAll('[data-qrem]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.qrem.split('|');
        var arr = getRem().dailyItems;
        if (arr.some(function (x) { return x.time === p[1] && x.title === p[2]; })) { showToast('已有相同提醒'); return; }
        arr.push({ id: 'daily-' + Date.now(), enabled: true, icon: p[0], time: p[1], title: p[2], note: '记得按时完成哦~' });
        arr.sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
        renderDailyList(arr); commitRem({ dailyItems: arr }); showToast('已添加 ' + p[1] + ' ' + p[2]);
      };
    });
    $('addDailyBtn').onclick = function () {
      var title = ($('newDailyTitle').value || '').trim();
      var time = $('newDailyTime').value || '20:00';
      var icon = $('newDailyIcon').value || '💊';
      if (!title) { showToast('请先输入提醒标题'); $('newDailyTitle').focus(); return; }
      var arr = getRem().dailyItems;
      arr.push({ id: 'daily-' + Date.now(), enabled: true, time: time, icon: icon, title: title, note: '记得按时完成哦~' });
      arr.sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
      $('newDailyTitle').value = '';
      renderDailyList(arr); commitRem({ dailyItems: arr }); showToast('已添加 ' + time + ' ' + title);
    };
    $('newDailyTitle').addEventListener('keydown', function (ev) {
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === 'Enter') { ev.preventDefault(); $('addDailyBtn').click(); }
    });

    // Acoustic Test Keyboard
    [
      [['Tab','tab',1.5,1],['KeyQ','Q',1],['KeyW','W',1],['KeyE','E',1],['KeyR','R',1],['KeyT','T',1],['KeyY','Y',1],['KeyU','U',1],['KeyI','I',1],['KeyO','O',1],['KeyP','P',1],['Backspace','⌫',1.5,1,1]],
      [['CapsLock','caps',1.75,1],['KeyA','A',1],['KeyS','S',1],['KeyD','D',1],['KeyF','F',1],['KeyG','G',1],['KeyH','H',1],['KeyJ','J',1],['KeyK','K',1],['KeyL','L',1],['Enter','return',2.25,2]],
      [['ShiftLeft','⇧',2.0,1,1],['KeyZ','Z',1],['KeyX','X',1],['KeyC','C',1],['KeyV','V',1],['KeyB','B',1],['KeyN','N',1],['KeyM','M',1],['Comma',',',1],['Period','.',1],['ShiftRight','⇧',2.0,1,1]],
      [['ControlLeft','ctrl',1.25,1],['AltLeft','opt',1.25,1],['MetaLeft','⌘',1.5,1,1],['Space','space',6.25,0],['MetaRight','⌘',1.5,1,1],['AltRight','opt',1.25,1]]
    ].forEach(function (row) {
      var rEl = document.createElement('div'); rEl.className = 'kst-row';
      row.forEach(function (d) {
        var btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'kst-key' + (d[3] === 1 ? ' mod' : d[3] === 2 ? ' accent' : '') + (d[4] ? ' sym' : '');
        btn.style.setProperty('--u', String(d[2])); btn.textContent = d[1];
        btn.onpointerdown = function () { btn.classList.add('down'); if (studioAudio) { studioAudio.ensure(); studioAudio.key(d[0]); } };
        btn.onpointerup = function () { btn.classList.remove('down'); if (studioAudio) studioAudio.keyUp(d[0]); };
        btn.onpointerleave = function () { btn.classList.remove('down'); };
        kstMap[d[0]] = btn; rEl.appendChild(btn);
      });
      $('kstBoard').appendChild(rEl);
    });
    document.addEventListener('keydown', function (ev) {
      var p = document.querySelector('[data-pane="interact"]');
      if (!p || !p.classList.contains('active')) return;
      if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      flashKey(ev.code, true);
      if ((!window.pawkeyAPI || !!window.__pkPetHidden) && !ev.repeat && studioAudio) {
        studioAudio.ensure();
        studioAudio.key(ev.code);
      }
    });
    document.addEventListener('keyup', function (ev) {
      flashKey(ev.code, false);
      var p = document.querySelector('[data-pane="interact"]');
      if ((!window.pawkeyAPI || !!window.__pkPetHidden) && p && p.classList.contains('active') && studioAudio) {
        if (!(document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName))) {
          studioAudio.keyUp(ev.code);
        }
      }
    });

    document.querySelectorAll('[data-switch]').forEach(function (b) {
      b.onclick = function () {
        var sw = b.dataset.switch;
        var seq = ++previewSeq;
        clearPreviewTimers();
        Object.keys(kstMap).forEach(function (c) { flashKey(c, false); });
        sync(Object.assign({}, state, { switchSound: sw, sound: true }));
        if (studioAudio) {
          studioAudio.setEnabled(true);
          studioAudio.setSwitchPack(sw);
        }
        commit({ switchSound: sw, sound: true }).then(function () {
          if (seq !== previewSeq || !studioAudio) return;
          studioAudio.setEnabled(true); studioAudio.setSwitchPack(sw);
          studioAudio.loadPack(sw).then(function () {
            if (seq !== previewSeq) return;
            ['KeyA','KeyS','KeyD','Space'].forEach(function (c, i) {
              previewTimers.push(setTimeout(function () {
                if (seq !== previewSeq) return;
                studioAudio.key(c); flashKey(c, true);
              }, i * 115));
              previewTimers.push(setTimeout(function () {
                if (seq !== previewSeq) return;
                studioAudio.keyUp(c); flashKey(c, false);
              }, i * 115 + 58));
            });
          });
        });
        var label = (PACK_META[sw] && PACK_META[sw].name) || sw;
        showToast(state && state.dndMode ? ('已切换为 ' + label + '（会议勿扰中）') : ('已切换为 ' + label));
      };
    });

    $('sound').onchange = function (e) {
      $('volume').disabled = !e.target.checked;
      $('volumeValue').style.opacity = e.target.checked ? '1' : '0.45';
      commit({ sound: e.target.checked });
    };
    $('keyUpSound').onchange = function (e) { commit({ keyUpSound: e.target.checked }); if (studioAudio) studioAudio.setKeyUpEnabled(e.target.checked); };
    $('volume').oninput = function (e) { var v = Number(e.target.value); $('volumeValue').textContent = Math.round(v * 100) + '%'; updateRangeFill(e.target); if (studioAudio) studioAudio.setVolume(v); };
    $('volume').onchange = function (e) { commit({ volume: Number(e.target.value) }); };

    // Behavior & Window toggles
    $('keyboardVisible').onchange = function (e) { commit({ keyboardVisible: e.target.checked }); };
    $('leftMouse').onchange = function (e) { commit({ leftMouse: e.target.checked }); };
    $('staminaFun').onchange = function (e) { commit({ staminaFun: e.target.checked }); };
    $('idleFun').onchange = function (e) { commit({ idleFun: e.target.checked }); };
    $('privacy').onchange = function (e) { commit({ privacy: e.target.checked }); };
    $('sleepMinutes').onchange = function (e) { commit({ sleepMinutes: Number(e.target.value) }); };
    $('clickThrough').onchange = function (e) { commit({ clickThrough: e.target.checked }); showToast(e.target.checked ? '已开启穿透（按住 Option 可拖动）' : '已关闭穿透'); };
    $('hideInFullscreen').onchange = function (e) { commit({ hideInFullscreen: e.target.checked }); };
    $('lowPower').onchange = function (e) { commit({ lowPower: e.target.checked }); };
    $('alwaysOnTop').onchange = function (e) { commit({ alwaysOnTop: e.target.checked }); };
    $('launchAtStartup').onchange = function (e) { commit({ launchAtStartup: e.target.checked }); };

    document.querySelectorAll('[data-bg-mode]').forEach(function (b) {
      b.onclick = function () { sync(Object.assign({}, state, { bgMode: b.dataset.bgMode })); commit({ bgMode: b.dataset.bgMode }); };
    });
    function commitThrottled(p) { if (_liveTimer) clearTimeout(_liveTimer); _liveTimer = setTimeout(function () { _liveTimer = 0; commit(p); }, 40); }
    $('scale').oninput = function (e) { var v = Number(e.target.value); $('scaleValue').textContent = Math.round(v * 100) + '%'; updateRangeFill(e.target); commitThrottled({ scale: v }); };
    $('scale').onchange = function (e) { commit({ scale: Number(e.target.value) }); };
    document.querySelectorAll('[data-scale-preset]').forEach(function (b) {
      b.onclick = function () { var s = Number(b.dataset.scalePreset); $('scale').value = String(s); $('scaleValue').textContent = Math.round(s * 100) + '%'; updateRangeFill($('scale')); commit({ scale: s }); };
    });
    $('opacity').oninput = function (e) { var v = Number(e.target.value); $('opacityValue').textContent = Math.round(v * 100) + '%'; updateRangeFill(e.target); commitThrottled({ opacity: v }); };
    $('opacity').onchange = function (e) { commit({ opacity: Number(e.target.value) }); };

    // System actions
    $('bannerOpenPermBtn').onclick = function () { api.requestPermission(); showToast('请在输入监控中勾选 PawKey'); };
    $('bannerRelaunchBtn').onclick = function () { api.relaunch(); };
    $('permPill').onclick = function () {
      if ($('permPill').classList.contains('ok')) return;
      if (window.__pkNeedsRelaunch) { api.relaunch(); return; }
      api.requestPermission();
      showToast('请在输入监控中勾选 PawKey 后重启');
    };
    $('resetPosBtn').onclick = function () { api.resetPosition(); showToast('已召回屏幕右下角'); };
    $('relaunchBtn').onclick = function () { api.relaunch(); };
    $('resetBtn').onclick = function () {
      var b = $('resetBtn');
      if (!_resetArmed) { _resetArmed = setTimeout(function () { _resetArmed = 0; b.textContent = '恢复默认'; }, 3000); b.textContent = '再次点击确认'; showToast('再次点击将重置偏好设置'); return; }
      clearTimeout(_resetArmed); _resetArmed = 0; b.textContent = '恢复默认';
      commit(Object.assign({}, DEFAULTS));
      showToast('已恢复默认设置');
    };

    $('closeBtn').onclick = $('doneBtn').onclick = function () { api.closeSettings(); };
    $('hideBtn').onclick = function () { api.hidePet(); api.closeSettings(); };
    $('quitBtn').onclick = function () { api.quit(); };
    document.querySelector('.titlebar').addEventListener('pointerdown', function (ev) {
      if (ev.button === 0 && !ev.target.closest('button')) api.dragWindow();
    });

    window.addEventListener('blur', function () {
      previewSeq++;
      clearPreviewTimers();
      clearKstDown();
      if (studioAudio) studioAudio.purrStop();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cleanupRuntime(false);
      } else {
        if (typeof api.getFocusState === 'function') api.getFocusState();
        if (typeof api.getStats === 'function') api.getStats();
      }
    });
    window.addEventListener('pagehide', function () { cleanupRuntime(true); });
    window.__pawkeySettingsWillHide = function (destroy) { cleanupRuntime(!!destroy); };
    window.__pawkeySettingsDidShow = function () {
      if (typeof api.getStats === 'function') api.getStats();
      if (typeof api.getFocusState === 'function') api.getFocusState();
    };

    // Live 2-way config, stats & focus state sync
    updateVersionLabel();
    if (typeof api.onConfig === 'function') api.onConfig(function (cfg) { if (cfg && !inFlight && !queuedPatch) sync(cfg); });
    if (typeof api.onFocusState === 'function') {
      api.onFocusState(applyFocusState);
      if (typeof api.getFocusState === 'function') api.getFocusState();
    }
    if (typeof api.onStats === 'function') {
      api.onStats(function (st) {
        if (!st) return;
        window.__pkHookOk = !!st.hookOk;
        window.__pkNeedsRelaunch = !!st.needsRelaunch;
        window.__pkHookMode = st.hookMode || '';
        window.__pkPetHidden = !!st.petHidden;
        window.__pkLiveKeys = Number(st.keys) || 0;
        if (st.version) updateVersionLabel(st.version);
        $('statKpm').textContent = String(st.kpm || 0) + ' KPM';
        var today = st.date || localDateKey();
        var disp = (st.todayKeys != null) ? Number(st.todayKeys) : Math.max(window.__pkSavedToday || 0, window.__pkLiveKeys);
        var dispTotal = (st.totalKeys != null) ? Number(st.totalKeys) : Math.max(window.__pkSavedTotal || 0, disp);
        window.__pkAuthDate = today;
        window.__pkAuthToday = disp;
        window.__pkAuthTotal = dispTotal;
        window.__pkSavedToday = disp;
        window.__pkSavedTotal = dispTotal;
        $('statKeys').textContent = String(disp);
        $('statKeysWrap').title = '今日敲击 ' + disp + ' 次 · 历史累计 ' + dispTotal + ' 次';
        if (st.focusDone != null) {
          $('focusDoneHint').textContent = '今日已完成 ' + Number(st.focusDone) + ' 个番茄';
        }
        if (state) {
          state.stats = {
            date: today,
            todayKeys: disp,
            totalKeys: dispTotal,
            focusDone: st.focusDone != null ? Number(st.focusDone) : ((state.stats && state.stats.focusDone) || 0)
          };
        }
        if (st.waterDate != null) {
          var wc = (st.waterDate === today) ? (Number(st.waterCount) || 0) : 0;
          if (state) {
            state.waterDate = st.waterDate;
            state.waterCount = wc;
          }
          $('waterBadge').textContent = '今日 ' + wc + ' 杯 +';
          $('statWater').textContent = wc + ' 杯';
        }
        $('permPill').classList.toggle('ok', !!st.hookOk);
        $('permText').textContent = st.hookOk ? '监听已开启' : (st.needsRelaunch ? '需重启生效' : '未开启监控');
        $('permPill').title = st.hookOk ? ('全局打字监听已开启 (' + (st.hookMode || 'Active') + ')') : (st.needsRelaunch ? '系统权限已授权，点击重启 PawKey 生效' : '点击开启输入监控权限');
        updatePermBanner();
      });
      api.getStats();
    }
  }

  buildSkins();
  bindAll();
  api.getConfig().then(sync).catch(function () { sync(DEFAULTS); });
})();
