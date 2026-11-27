/* PawKey · 爪键猫 — 100% Original WebAudio Sound Engine
 * Plays MIT-licensed real 104-key mechanical switch recordings (s1-s8) + procedural kitten vocal/SFX.
 */
(function () {
  'use strict';

  class PawKeyAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.comp = null;
      this.noise = null;
      this.enabled = true;
      this.volume = 0.45;
      this.switchPack = 's2';
      this.keyUpEnabled = true;
      this.active = 0;
      this.lastKey = 0;
      this.lastKeyPerf = -100;
      this.lastMeow = -1000;
      this.purr = null;
      this._fadingPurrs = new Set();
      this._purrWanted = false;
      this._resuming = null;
      this._suspendTimer = 0;
      this._destroyed = false;
      this._unlockHandler = null;
      this._gestureHooked = false;
      this.buffers = {};
      this.bufferOrder = [];
      this.defs = {};
      this.loading = {};
      this.idleTimer = 0;
      this.fallbackKeys = ['KeyA','KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL','KeyE','KeyR','KeyT'];
      this._hookGestureUnlock();
    }

    _hookGestureUnlock() {
      if (this._gestureHooked || this._destroyed || typeof window === 'undefined') return;
      this._gestureHooked = true;
      const unlock = () => {
        this._removeGestureUnlock();
        if (!this._destroyed && this.ctx && this.enabled && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
          this._resume();
        }
      };
      this._unlockHandler = unlock;
      window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
      window.addEventListener('keydown', unlock, { capture: true, passive: true });
    }

    _removeGestureUnlock() {
      if (!this._unlockHandler || typeof window === 'undefined') return;
      window.removeEventListener('pointerdown', this._unlockHandler, true);
      window.removeEventListener('keydown', this._unlockHandler, true);
      this._unlockHandler = null;
      this._gestureHooked = false;
    }

    _targetGain() {
      if (!this.enabled || this.volume <= 0.001) return 0;
      return Math.pow(this.volume, 1.35) * 1.28;
    }

    _touchActivity() {
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = 0; }
      this.idleTimer = setTimeout(() => {
        this.idleTimer = 0;
        if (this.ctx && this.ctx.state === 'running' && !this.purr && this.active === 0) {
          this.ctx.suspend().catch(function () {});
        }
      }, 20000);
    }

    _resume() {
      if (this._destroyed) return Promise.resolve(null);
      if (this._suspendTimer) { clearTimeout(this._suspendTimer); this._suspendTimer = 0; }
      if (!this.ctx) return Promise.resolve(null);
      if (this.master && this.enabled) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this._targetGain(), now, 0.015);
      }
      if (this.ctx.state === 'running') return Promise.resolve(this.ctx);
      if (this._resuming) return this._resuming;
      const p = this.ctx.resume().catch(function () {}).then(() => {
        if (this._resuming === p) this._resuming = null;
        return this.ctx;
      });
      this._resuming = p;
      return p;
    }

    _whenReady(fn) {
      if (this._destroyed) return;
      const ctx = this.ensure();
      if (!ctx) return;
      if (ctx.state === 'running' && !this._resuming) {
        if (!this._destroyed) fn(ctx);
        return;
      }
      this._resume().then((c) => {
        if (!this._destroyed && c && c.state === 'running') fn(c);
      });
    }

    ensure() {
      if (this._destroyed) return null;
      if (this.ctx) {
        if (this.enabled && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
          this._resume();
        }
        return this.ctx;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { this.ctx = new Ctx(); } catch (_) { return null; }

      this.master = this.ctx.createGain();
      this.master.gain.value = this._targetGain();

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -10;
      this.comp.knee.value = 14;
      this.comp.ratio.value = 3.5;
      this.comp.attack.value = 0.002;
      this.comp.release.value = 0.07;

      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
      this.noise = this._buildPinkNoise(2);
      if (!this.enabled && this.ctx.state === 'running') {
        this.ctx.suspend().catch(function () {});
      }
      this.loadPack(this.switchPack);
      return this.ctx;
    }

    _buildPinkNoise(seconds) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const out = buf.getChannelData(0);
      let acc = 0;
      for (let i = 0; i < len; i++) {
        acc = (acc + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        out[i] = acc * 3.2;
      }
      return buf;
    }

    normalizePack(id) {
      return /^s[1-8]$/.test(String(id || '')) ? id : 's2';
    }

    setEnabled(val) {
      const next = !!val;
      if (next === this.enabled && !this._suspendTimer) return;
      this.enabled = next;
      if (this._suspendTimer) { clearTimeout(this._suspendTimer); this._suspendTimer = 0; }
      if (this.enabled) {
        if (this.ctx) {
          if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
            this._resume().then((c) => {
              if (c && this.enabled && this.master) {
                const now = c.currentTime;
                this.master.gain.cancelScheduledValues(now);
                this.master.gain.setTargetAtTime(this._targetGain(), now, 0.025);
              }
            });
          } else if (this.master) {
            const now = this.ctx.currentTime;
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setTargetAtTime(this._targetGain(), now, 0.025);
          }
        }
      } else {
        this.purrStop();
        if (this.master && this.ctx) {
          const now = this.ctx.currentTime;
          this.master.gain.cancelScheduledValues(now);
          this.master.gain.setTargetAtTime(0, now, 0.025);
        }
        if (this.ctx && this.ctx.state === 'running') {
          this._suspendTimer = setTimeout(() => {
            this._suspendTimer = 0;
            if (!this.enabled && !this.purr && this.ctx && this.ctx.state === 'running') {
              this.ctx.suspend().catch(function () {});
            }
          }, 140);
        }
      }
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, Number(val) || 0));
      if (this.master && this.ctx && this.enabled) {
        this.master.gain.setTargetAtTime(this._targetGain(), this.ctx.currentTime, 0.03);
      }
    }

    setSwitchPack(id) {
      const pid = this.normalizePack(id);
      this.switchPack = pid;
      this.loadPack(pid);
    }

    setKeyUpEnabled(v) {
      this.keyUpEnabled = v !== false;
    }

    _markPackUsed(pid) {
      this.bufferOrder = this.bufferOrder.filter((x) => x !== pid);
      this.bufferOrder.push(pid);
      while (this.bufferOrder.length > 3) {
        const idx = this.bufferOrder.findIndex((x) => x !== this.switchPack && x !== pid);
        if (idx < 0) break;
        const evict = this.bufferOrder.splice(idx, 1)[0];
        if (evict) {
          delete this.buffers[evict];
          if (window.__PAWKEY_SOUNDS) delete window.__PAWKEY_SOUNDS[evict];
          const oldScript = document.querySelector('script[data-pk-sound="' + evict + '"]');
          if (oldScript) oldScript.remove();
        }
      }
    }

    loadPack(id) {
      if (this._destroyed) return Promise.resolve(null);
      const pid = this.normalizePack(id);
      if (this.buffers[pid]) {
        this._markPackUsed(pid);
        return Promise.resolve(this.buffers[pid]);
      }
      if (this.loading[pid]) return this.loading[pid];
      this.loading[pid] = new Promise((resolve) => {
        const decode = (pack) => {
          if (this._destroyed || !pack || !pack.b64) { delete this.loading[pid]; resolve(null); return; }
          this.defs[pid] = pack.defs || {};
          const ctx = this.ensure();
          if (!ctx) { delete this.loading[pid]; resolve(null); return; }
          try {
            const bin = atob(pack.b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            ctx.decodeAudioData(arr.buffer.slice(0), (audioBuf) => {
              if (this._destroyed) { delete this.loading[pid]; resolve(null); return; }
              this.buffers[pid] = audioBuf;
              this._markPackUsed(pid);
              delete this.loading[pid];
              try { delete pack.b64; } catch (_) {}
              if (!this.enabled && !this.purr && this.active === 0 && Object.keys(this.loading).length === 0 && ctx.state === 'running') {
                ctx.suspend().catch(function () {});
              }
              resolve(audioBuf);
            }, () => { delete this.loading[pid]; resolve(null); });
          } catch (_) {
            delete this.loading[pid];
            resolve(null);
          }
        };
        if (window.__PAWKEY_SOUNDS && window.__PAWKEY_SOUNDS[pid] && window.__PAWKEY_SOUNDS[pid].b64) {
          decode(window.__PAWKEY_SOUNDS[pid]);
          return;
        }
        const stale = document.querySelector('script[data-pk-sound="' + pid + '"]');
        if (stale) stale.remove();
        const s = document.createElement('script');
        s.dataset.pkSound = pid;
        s.src = '../assets/sounds/' + pid + '.js';
        s.onload = () => decode(window.__PAWKEY_SOUNDS && window.__PAWKEY_SOUNDS[pid]);
        s.onerror = () => { delete this.loading[pid]; resolve(null); };
        document.head.appendChild(s);
      });
      return this.loading[pid];
    }

    _sliceFor(pid, code, isUp) {
      const map = this.defs[pid];
      if (!map) return null;
      let t = map[code];
      if (!t) {
        const fb = this.fallbackKeys[Math.floor(Math.random() * this.fallbackKeys.length)];
        t = map[fb] || Object.values(map)[0];
      }
      if (!t || t.length < 2) return null;
      if (isUp) return t.length >= 4 ? [t[2], t[3]] : null;
      return [t[0], t[1]];
    }

    _playSample(code, isUp) {
      let pid = this.switchPack || 's2';
      let buf = this.buffers[pid];
      if (!buf) {
        this.loadPack(pid);
        for (let i = this.bufferOrder.length - 1; i >= 0; i--) {
          const cand = this.bufferOrder[i];
          if (this.buffers[cand]) { pid = cand; buf = this.buffers[cand]; break; }
        }
        if (!buf) return;
      }
      const sl = this._sliceFor(pid, code, isUp);
      if (!sl) return;
      const start = Math.max(0, Math.min(buf.duration - 0.02, sl[0]));
      const dur = Math.max(0.02, Math.min(buf.duration - start, sl[1] + 0.015));

      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001 || this.active > 24) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = isUp ? (0.985 + Math.random() * 0.03) : (0.98 + Math.random() * 0.04);

        const g = ctx.createGain();
        const now = ctx.currentTime;
        const amp = isUp ? 0.62 : 1.0;
        g.gain.setValueAtTime(amp, now);
        if (dur > 0.014) {
          g.gain.setValueAtTime(amp, now + dur - 0.008);
          g.gain.linearRampToValueAtTime(0.0001, now + dur);
        }
        src.connect(g);
        g.connect(this.master);
        this.active += 1;
        let ended = false;
        const done = () => { if (!ended) { ended = true; this.active = Math.max(0, this.active - 1); } };
        src.onended = done;
        try {
          src.start(now, start, dur);
          this._touchActivity();
        } catch (_) {
          done();
        }
      });
    }

    key(code) {
      if (!this.enabled || this.volume <= 0.001 || this.active > 24) return;
      const nowPerf = performance.now();
      if (nowPerf - this.lastKeyPerf < 10) return;
      this.lastKeyPerf = nowPerf;
      this._playSample(code, false);
    }

    keyUp(code) {
      if (!this.enabled || !this.keyUpEnabled || this.volume <= 0.001 || this.active > 24) return;
      this._playSample(code, true);
    }

    chime() {
      if (!this.enabled || this.volume <= 0.001) return;
      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001) return;
        this._touchActivity();
        const now = ctx.currentTime;
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const t0 = now + idx * 0.11;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
          osc.connect(g); g.connect(this.master);
          osc.start(t0); osc.stop(t0 + 0.45);
        });
      });
    }

    _killPurrNode(p) {
      if (!p) return;
      if (p.timer) { clearTimeout(p.timer); p.timer = 0; }
      this._fadingPurrs.delete(p);
      try { p.src.stop(); } catch (_) {}
      try { p.lfo.stop(); } catch (_) {}
      try { p.src.disconnect(); } catch (_) {}
      try { p.lp.disconnect(); } catch (_) {}
      try { p.gain.disconnect(); } catch (_) {}
      try { p.lfo.disconnect(); } catch (_) {}
      try { p.lfoG.disconnect(); } catch (_) {}
    }

    _killAllPurrs() {
      if (this.purr) {
        const cur = this.purr;
        this.purr = null;
        this._killPurrNode(cur);
      }
      if (this._fadingPurrs.size) {
        Array.from(this._fadingPurrs).forEach((p) => this._killPurrNode(p));
        this._fadingPurrs.clear();
      }
    }

    purrStart() {
      if (this._destroyed || !this.enabled || this.purr) return;
      this._purrWanted = true;
      this._whenReady((ctx) => {
        if (this._destroyed || !this._purrWanted || !this.enabled || this.purr || !this.noise) return;
        if (this._fadingPurrs.size) {
          Array.from(this._fadingPurrs).forEach((p) => this._killPurrNode(p));
        }
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 250; lp.Q.value = 1.2;
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        gain.gain.setTargetAtTime(0.11, ctx.currentTime, 0.18);
        src.connect(lp); lp.connect(gain); gain.connect(this.master);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine'; lfo.frequency.value = 23;
        const lfoG = ctx.createGain(); lfoG.gain.value = 0.035;
        lfo.connect(lfoG); lfoG.connect(gain.gain);
        src.start(); lfo.start();
        this.purr = { src, lp, gain, lfo, lfoG, timer: 0 };
      });
    }

    purrStop() {
      this._purrWanted = false;
      if (!this.purr) return;
      const p = this.purr;
      this.purr = null;
      if (!this.ctx || this.ctx.state !== 'running') {
        this._killPurrNode(p);
        return;
      }
      this._fadingPurrs.add(p);
      const now = this.ctx.currentTime;
      try {
        p.lfoG.gain.cancelScheduledValues(now);
        p.lfoG.gain.setTargetAtTime(0, now, 0.045);
        p.gain.gain.cancelScheduledValues(now);
        p.gain.gain.setTargetAtTime(0.0001, now, 0.075);
      } catch (_) {}
      p.timer = setTimeout(() => {
        this._killPurrNode(p);
        if (!this._destroyed) this._touchActivity();
      }, 320);
    }

    suspend() {
      if (this._destroyed) return;
      this._purrWanted = false;
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = 0; }
      if (this._suspendTimer) { clearTimeout(this._suspendTimer); this._suspendTimer = 0; }
      this._killAllPurrs();
      if (this.master && this.ctx) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0, now, 0.01);
      }
      if (this.ctx && this.ctx.state === 'running') {
        this._suspendTimer = setTimeout(() => {
          this._suspendTimer = 0;
          if (!this._destroyed && !this.purr && this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(function () {});
          }
        }, 40);
      }
    }

    destroy() {
      this._destroyed = true;
      this._purrWanted = false;
      this._removeGestureUnlock();
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = 0; }
      if (this._suspendTimer) { clearTimeout(this._suspendTimer); this._suspendTimer = 0; }
      this._killAllPurrs();
      if (typeof document !== 'undefined') {
        document.querySelectorAll('script[data-pk-sound]').forEach((el) => el.remove());
      }
      this.buffers = {};
      this.bufferOrder = [];
      this.defs = {};
      this.loading = {};
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(function () {});
      }
      this.ctx = null;
      this.master = null;
      this.comp = null;
      this.noise = null;
    }

    meow() {
      if (!this.enabled || this.volume <= 0.001) return;
      const nowPerf = performance.now();
      if (nowPerf - this.lastMeow < 700) return;
      this.lastMeow = nowPerf;
      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001) return;
        this._touchActivity();
        const now = ctx.currentTime;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = 'triangle'; o2.type = 'sine';
        const f0 = 515 + Math.random() * 50;
        o1.frequency.setValueAtTime(f0 * 0.88, now);
        o1.frequency.exponentialRampToValueAtTime(f0 * 1.38, now + 0.11);
        o1.frequency.exponentialRampToValueAtTime(f0 * 0.92, now + 0.34);
        o2.frequency.setValueAtTime(f0 * 1.76, now);
        o2.frequency.exponentialRampToValueAtTime(f0 * 2.74, now + 0.11);
        o2.frequency.exponentialRampToValueAtTime(f0 * 1.82, now + 0.34);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 1.6;
        bp.frequency.setValueAtTime(860, now);
        bp.frequency.exponentialRampToValueAtTime(1480, now + 0.12);
        bp.frequency.exponentialRampToValueAtTime(760, now + 0.35);

        const g1 = ctx.createGain(), g2 = ctx.createGain();
        g1.gain.setValueAtTime(0.0001, now);
        g1.gain.linearRampToValueAtTime(0.14, now + 0.04);
        g1.gain.setValueAtTime(0.12, now + 0.14);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        g2.gain.setValueAtTime(0.0001, now);
        g2.gain.linearRampToValueAtTime(0.045, now + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

        o1.connect(bp); bp.connect(g1); g1.connect(this.master);
        o2.connect(g2); g2.connect(this.master);
        o1.start(now); o2.start(now);
        o1.stop(now + 0.42); o2.stop(now + 0.42);
      });
    }

    meltdownSound() {
      if (!this.enabled || this.volume <= 0.001) return;
      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001) return;
        this._touchActivity();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.58);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1200, now);
        lp.frequency.exponentialRampToValueAtTime(340, now + 0.58);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
        osc.connect(lp); lp.connect(g); g.connect(this.master);
        osc.start(now); osc.stop(now + 0.66);
      });
    }

    sipSound() {
      if (!this.enabled || this.volume <= 0.001) return;
      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001) return;
        this._touchActivity();
        const now = ctx.currentTime;
        if (this.noise) {
          const src = ctx.createBufferSource();
          src.buffer = this.noise;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.Q.value = 3.2;
          bp.frequency.setValueAtTime(680, now);
          bp.frequency.exponentialRampToValueAtTime(1450, now + 0.22);
          bp.frequency.exponentialRampToValueAtTime(820, now + 0.36);
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(0.0001, now);
          ng.gain.linearRampToValueAtTime(0.075, now + 0.08);
          ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
          src.connect(bp); bp.connect(ng); ng.connect(this.master);
          src.start(now); src.stop(now + 0.4);
        }
        const clink = ctx.createOscillator();
        clink.type = 'sine';
        clink.frequency.setValueAtTime(1580 + Math.random() * 120, now + 0.34);
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.0001, now + 0.34);
        cg.gain.linearRampToValueAtTime(0.035, now + 0.35);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
        clink.connect(cg); cg.connect(this.master);
        clink.start(now + 0.34); clink.stop(now + 0.5);
      });
    }

    dozeSound() {
      if (!this.enabled || this.volume <= 0.001) return;
      this._whenReady((ctx) => {
        if (!this.enabled || this.volume <= 0.001) return;
        this._touchActivity();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(490, now + 0.16);
        osc.frequency.exponentialRampToValueAtTime(290, now + 0.46);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.065, now + 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
        osc.connect(g); g.connect(this.master);
        osc.start(now); osc.stop(now + 0.5);
      });
    }
  }

  window.PawKeyAudio = PawKeyAudio;
})();
