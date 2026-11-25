/* PawKey · 爪键猫 — 100% Original Native macOS Host (Swift + WKWebView + IOHIDManager)
 * Copyright (c) 2026 PawKey Authors. All rights reserved.
 */
import Cocoa
import WebKit
import CoreGraphics
import IOKit
import IOKit.hid

// MARK: - USB HID Usage (Page 0x07) to DOM KeyboardEvent.code
func domCode(forHIDUsage usage: UInt32) -> String? {
    switch usage {
    case 0x04: return "KeyA"
    case 0x05: return "KeyB"
    case 0x06: return "KeyC"
    case 0x07: return "KeyD"
    case 0x08: return "KeyE"
    case 0x09: return "KeyF"
    case 0x0A: return "KeyG"
    case 0x0B: return "KeyH"
    case 0x0C: return "KeyI"
    case 0x0D: return "KeyJ"
    case 0x0E: return "KeyK"
    case 0x0F: return "KeyL"
    case 0x10: return "KeyM"
    case 0x11: return "KeyN"
    case 0x12: return "KeyO"
    case 0x13: return "KeyP"
    case 0x14: return "KeyQ"
    case 0x15: return "KeyR"
    case 0x16: return "KeyS"
    case 0x17: return "KeyT"
    case 0x18: return "KeyU"
    case 0x19: return "KeyV"
    case 0x1A: return "KeyW"
    case 0x1B: return "KeyX"
    case 0x1C: return "KeyY"
    case 0x1D: return "KeyZ"
    case 0x1E: return "Digit1"
    case 0x1F: return "Digit2"
    case 0x20: return "Digit3"
    case 0x21: return "Digit4"
    case 0x22: return "Digit5"
    case 0x23: return "Digit6"
    case 0x24: return "Digit7"
    case 0x25: return "Digit8"
    case 0x26: return "Digit9"
    case 0x27: return "Digit0"
    case 0x28: return "Enter"
    case 0x29: return "Escape"
    case 0x2A: return "Backspace"
    case 0x2B: return "Tab"
    case 0x2C: return "Space"
    case 0x2D: return "Minus"
    case 0x2E: return "Equal"
    case 0x2F: return "BracketLeft"
    case 0x30: return "BracketRight"
    case 0x31: return "Backslash"
    case 0x33: return "Semicolon"
    case 0x34: return "Quote"
    case 0x35: return "Backquote"
    case 0x36: return "Comma"
    case 0x37: return "Period"
    case 0x38: return "Slash"
    case 0x39: return "CapsLock"
    case 0x4F: return "ArrowRight"
    case 0x50: return "ArrowLeft"
    case 0x51: return "ArrowDown"
    case 0x52: return "ArrowUp"
    case 0x58: return "Enter"
    case 0xE0: return "ControlLeft"
    case 0xE1: return "ShiftLeft"
    case 0xE2: return "AltLeft"
    case 0xE3: return "MetaLeft"
    case 0xE4: return "ControlRight"
    case 0xE5: return "ShiftRight"
    case 0xE6: return "AltRight"
    case 0xE7: return "MetaRight"
    default: return nil
    }
}

func domCode(for keyCode: UInt16) -> String? {
    switch keyCode {
    case 0: return "KeyA"; case 1: return "KeyS"; case 2: return "KeyD"; case 3: return "KeyF"
    case 4: return "KeyH"; case 5: return "KeyG"; case 6: return "KeyZ"; case 7: return "KeyX"
    case 8: return "KeyC"; case 9: return "KeyV"; case 11: return "KeyB"; case 12: return "KeyQ"
    case 13: return "KeyW"; case 14: return "KeyE"; case 15: return "KeyR"; case 16: return "KeyY"
    case 17: return "KeyT"; case 18: return "Digit1"; case 19: return "Digit2"; case 20: return "Digit3"
    case 21: return "Digit4"; case 22: return "Digit6"; case 23: return "Digit5"; case 24: return "Equal"
    case 25: return "Digit9"; case 26: return "Digit7"; case 27: return "Minus"; case 28: return "Digit8"
    case 29: return "Digit0"; case 30: return "BracketRight"; case 31: return "KeyO"; case 32: return "KeyU"
    case 33: return "BracketLeft"; case 34: return "KeyI"; case 35: return "KeyP"; case 36: return "Enter"
    case 37: return "KeyL"; case 38: return "KeyJ"; case 39: return "Quote"; case 40: return "KeyK"
    case 41: return "Semicolon"; case 42: return "Backslash"; case 43: return "Comma"; case 44: return "Slash"
    case 45: return "KeyN"; case 46: return "KeyM"; case 47: return "Period"; case 48: return "Tab"
    case 49: return "Space"; case 50: return "Backquote"; case 51: return "Backspace"; case 53: return "Escape"
    case 54: return "MetaRight"; case 55: return "MetaLeft"; case 56: return "ShiftLeft"; case 57: return "CapsLock"
    case 58: return "AltLeft"; case 59: return "ControlLeft"; case 60: return "ShiftRight"; case 61: return "AltRight"
    case 62: return "ControlRight"; case 76: return "Enter"; case 123: return "ArrowLeft"; case 124: return "ArrowRight"
    case 125: return "ArrowDown"; case 126: return "ArrowUp"
    default: return nil
    }
}

// MARK: - Injected JS Bridge (window.pawkeyAPI)
let bridgeScriptSource = """
(function () {
  'use strict';
  if (window.pawkeyAPI) return;
  var listeners = {
    config: [], key: [], cursor: [], mouse: [], mouseButton: [], gaze: [],
    hook: [], dragEnd: [], stats: [], playAction: []
  };
  var pending = new Map(), seq = 0;

  function post(type, data) {
    var msg = { type: type };
    if (data) for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) msg[k] = data[k];
    try { window.webkit.messageHandlers.pawkey.postMessage(msg); } catch (e) {}
  }
  function emit(name, val) {
    var arr = listeners[name] || [];
    for (var i = 0; i < arr.length; i++) { try { arr[i](val); } catch (e) {} }
  }
  function sub(name) {
    return function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners[name].push(fn);
      return function () { var i = listeners[name].indexOf(fn); if (i >= 0) listeners[name].splice(i, 1); };
    };
  }

  window.__pawkeySetBgMode = function (mode) {
    var id = '__pawkey_bg_style', el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style'); el.id = id;
      el.textContent = 'html.pk-bg-transparent, body.pk-bg-transparent { background: transparent !important; } html.pk-bg-greenscreen, body.pk-bg-greenscreen { background: #00ff00 !important; }';
      (document.head || document.documentElement).appendChild(el);
    }
    var m = mode || 'transparent';
    [document.documentElement, document.body].forEach(function (n) {
      if (!n) return;
      n.classList.toggle('pk-bg-transparent', m === 'transparent');
      n.classList.toggle('pk-bg-greenscreen', m === 'greenscreen');
    });
  };

  window.__pawkeyReceive = function (m) {
    if (!m || !m.type) return;
    if (m.type === 'config') {
      var h = pending.get(m.id);
      if (h) { pending.delete(m.id); h(m.config); }
      if (m.config) {
        if (m.config.bgMode) window.__pawkeySetBgMode(m.config.bgMode);
        emit('config', m.config);
      }
    } else if (m.type === 'key') emit('key', m);
    else if (m.type === 'cursor') emit('cursor', m);
    else if (m.type === 'mouse') emit('mouse', m);
    else if (m.type === 'mouse-button') emit('mouseButton', m);
    else if (m.type === 'gaze') emit('gaze', m);
    else if (m.type === 'hook-status') emit('hook', m.status);
    else if (m.type === 'drag-end') emit('dragEnd');
    else if (m.type === 'stats') emit('stats', m);
    else if (m.type === 'play-action') emit('playAction', m);
  };

  window.pawkeyAPI = {
    getConfig: function () { return new Promise(function (r) { var id = ++seq; pending.set(id, r); post('config:get', { id: id }); }); },
    setConfig: function (patch) { return new Promise(function (r) { var id = ++seq; pending.set(id, r); post('config:set', { id: id, patch: patch }); }); },
    onConfig: sub('config'), onKey: sub('key'), onCursor: sub('cursor'), onMouse: sub('mouse'),
    onMouseButton: sub('mouseButton'), onGaze: sub('gaze'), onHookStatus: sub('hook'),
    onDragEnd: sub('dragEnd'), onStats: sub('stats'), onPlayAction: sub('playAction'),
    dragStart: function () { post('drag:start'); },
    dragEnd: function () { post('drag:end'); },
    setInteractive: function (yes) { post('interactive', { value: !!yes }); },
    openSettings: function () { post('settings:open'); },
    closeSettings: function () { post('settings:close'); },
    hidePet: function () { post('pet:hide'); },
    quit: function () { post('app:quit'); },
    dragWindow: function () { post('window:drag'); },
    minimizeSettings: function () { post('settings:minimize'); },
    requestPermission: function () { post('permission:request'); },
    relaunch: function () { post('app:relaunch'); },
    resetPosition: function () { post('pet:reset-pos'); },
    playAction: function (action) { post('pet:play', { action: action }); },
    getStats: function () { post('stats:get'); },
    ready: function () { post('ready'); }
  };
})();
"""

class PetWebView: WKWebView {
    var onScrollZoom: ((CGFloat) -> Void)?
    override func scrollWheel(with event: NSEvent) {
        if abs(event.scrollingDeltaY) > 0.1 { onScrollZoom?(event.scrollingDeltaY) }
    }
}

class FloatingPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

private var sharedDelegate: PawKeyAppDelegate?

private func hidCallback(context: UnsafeMutableRawPointer?, result: IOReturn, sender: UnsafeMutableRawPointer?, value: IOHIDValue) {
    let elem = IOHIDValueGetElement(value)
    guard IOHIDElementGetUsagePage(elem) == UInt32(kHIDPage_KeyboardOrKeypad) else { return }
    let usage = IOHIDElementGetUsage(elem)
    guard usage >= 0x04 && usage <= 0xE7, let code = domCode(forHIDUsage: usage) else { return }
    let isDown = IOHIDValueGetIntegerValue(value) != 0
    DispatchQueue.main.async { sharedDelegate?.handleHIDKey(code: code, isDown: isDown) }
}

private func cgMouseCallback(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent, userInfo: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let tap = sharedDelegate?.mouseTap { CGEvent.tapEnable(tap: tap, enable: true) }
        return Unmanaged.passUnretained(event)
    }
    let btn = (type == .leftMouseDown || type == .leftMouseUp) ? 0 : 2
    let down = (type == .leftMouseDown || type == .rightMouseDown)
    DispatchQueue.main.async { sharedDelegate?.handleMouseButton(button: btn, down: down) }
    return Unmanaged.passUnretained(event)
}

private func cgKeyCallback(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent, userInfo: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let tap = sharedDelegate?.keyTap { CGEvent.tapEnable(tap: tap, enable: true) }
        return Unmanaged.passUnretained(event)
    }
    let keyCode = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
    let isRepeat = event.getIntegerValueField(.keyboardEventAutorepeat) != 0
    let flags = event.flags
    DispatchQueue.main.async { sharedDelegate?.handleCGKey(type: type, keyCode: keyCode, isRepeat: isRepeat, flags: flags) }
    return Unmanaged.passUnretained(event)
}

class PawKeyAppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler {
    let baseWidth: CGFloat = 420
    let baseHeight: CGFloat = 374
    let launchAgentLabel = "com.pawkey.app.launcher"

    var petWindow: FloatingPanel!
    var petWebView: PetWebView!
    var settingsWindow: FloatingPanel?
    var settingsWebView: WKWebView?
    var statusItem: NSStatusItem!
    var toggleMenuItem: NSMenuItem!
    var soundMenuItem: NSMenuItem!
    var dndMenuItem: NSMenuItem!
    var clickThroughMenuItem: NSMenuItem!
    var permissionMenuItem: NSMenuItem!
    var bgModeMenuItems: [String: NSMenuItem] = [:]
    var saveConfigTimer: Timer?
    var configLoaded = false
    var configDirty = false

    var config: [String: Any] = [
        "catSkin": "cow", "keyboardSkin": "cream", "eyeColor": "auto", "collar": true,
        "scale": 0.85, "opacity": 1.0, "keyboardVisible": true, "sound": true, "volume": 0.45,
        "switchSound": "s2", "keyUpSound": true, "staminaFun": true, "idleFun": true, "dndMode": false,
        "sleepMinutes": 3, "privacy": false, "leftMouse": false, "lowPower": false,
        "alwaysOnTop": true, "hideInFullscreen": false, "clickThrough": false,
        "launchAtStartup": false, "bgMode": "transparent"
    ]

    var configURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("PawKey", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("config.json")
    }
    var launchAgentURL: URL {
        let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("LaunchAgents", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("\(launchAgentLabel).plist")
    }

    var isDraggingPet = false
    var dragStartMouse: NSPoint = .zero
    var dragStartOrigin: NSPoint = .zero
    var lastScreenMouse: NSPoint = .zero
    var lastLocalMouse: NSPoint = NSPoint(x: -9999, y: -9999)
    var wasInsidePet = false
    var webWantsInteractive = false
    var cursorTimer: Timer?
    var dragTimer: Timer?
    var permissionRetryTimer: Timer?
    var hidManager: IOHIDManager?
    var hidActive = false
    var hidVerifiedByEvent = false
    var keyTap: CFMachPort?
    var keyTapSrc: CFRunLoopSource?
    var mouseTap: CFMachPort?
    var mouseTapSrc: CFRunLoopSource?
    var globalKeyMonitor: Any?
    var localKeyMonitor: Any?
    var petHidden = false

    var sessionKeyCount: Int = 0
    var recentKeyTimes: [TimeInterval] = []
    var lastStatsBroadcast: TimeInterval = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        sharedDelegate = self
        NSApp.setActivationPolicy(.accessory)

        // Single-instance guard: if another PawKey is already running (and not a relaunch), activate it & exit cleanly
        let isRelaunch = CommandLine.arguments.contains("--relaunch")
        if !isRelaunch, let bid = Bundle.main.bundleIdentifier {
            let others = NSRunningApplication.runningApplications(withBundleIdentifier: bid).filter { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }
            if !others.isEmpty {
                DistributedNotificationCenter.default().postNotificationName(NSNotification.Name("com.pawkey.app.activate"), object: nil, userInfo: nil, deliverImmediately: true)
                exit(0)
            }
        }
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(handleExternalActivate), name: NSNotification.Name("com.pawkey.app.activate"), object: nil)

        loadConfig()
        setupStatusBar()
        setupPetWindow()
        setupInputMonitors()
        startCursorTimer()
        NotificationCenter.default.addObserver(self, selector: #selector(ensurePetVisible), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        let wsnc = NSWorkspace.shared.notificationCenter
        wsnc.addObserver(self, selector: #selector(handleSystemSleep), name: NSWorkspace.screensDidSleepNotification, object: nil)
        wsnc.addObserver(self, selector: #selector(handleSystemWake), name: NSWorkspace.screensDidWakeNotification, object: nil)
        wsnc.addObserver(self, selector: #selector(handleSystemWake), name: NSWorkspace.didWakeNotification, object: nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        if configLoaded && configDirty { saveConfigNow() }
    }

    @objc func handleExternalActivate() {
        if petHidden { togglePet() }
        petWindow?.orderFrontRegardless()
        openSettings()
    }

    @objc func handleSystemSleep() {
        cursorTimer?.invalidate()
        cursorTimer = nil
    }

    @objc func handleSystemWake() {
        if let kt = keyTap { CGEvent.tapEnable(tap: kt, enable: true) }
        if let mt = mouseTap { CGEvent.tapEnable(tap: mt, enable: true) }
        if !hasGlobalKeyboardHook { tryStartGlobalInput(); updatePermissionMenuUI() }
        if !petHidden { startCursorTimer(); ensurePetVisible() }
    }

    func loadConfig() {
        if let data = try? Data(contentsOf: configURL),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for (k, v) in json { config[k] = v }
        }
        config["launchAtStartup"] = FileManager.default.fileExists(atPath: launchAgentURL.path)
        configLoaded = true
    }
    func saveConfig() {
        guard configLoaded else { return }
        configDirty = true
        saveConfigTimer?.invalidate()
        saveConfigTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: false) { [weak self] _ in
            self?.saveConfigNow()
        }
    }
    func saveConfigNow() {
        guard configLoaded else { return }
        saveConfigTimer?.invalidate()
        saveConfigTimer = nil
        configDirty = false
        if let data = try? JSONSerialization.data(withJSONObject: config, options: [.prettyPrinted]) {
            try? data.write(to: configURL, options: .atomic)
        }
    }
    func syncLaunchAtStartup(_ on: Bool) {
        if on {
            let exe = Bundle.main.executablePath ?? "/Applications/PawKey.app/Contents/MacOS/PawKey"
            let plist: [String: Any] = ["Label": launchAgentLabel, "ProgramArguments": [exe], "RunAtLoad": true, "KeepAlive": false]
            if let d = try? PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0) { try? d.write(to: launchAgentURL) }
        } else {
            try? FileManager.default.removeItem(at: launchAgentURL)
        }
    }

    func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let btn = statusItem.button {
            if let url = Bundle.main.resourceURL?.appendingPathComponent("assets/tray-icon@2x.png"),
               let img = NSImage(contentsOf: url) {
                img.size = NSSize(width: 18, height: 18)
                img.isTemplate = false
                btn.image = img
            } else {
                btn.title = "🐾"
            }
        }
        let menu = NSMenu()
        permissionMenuItem = NSMenuItem(title: "检查全局打字权限...", action: #selector(requestInputPermission), keyEquivalent: "")
        menu.addItem(permissionMenuItem)
        menu.addItem(NSMenuItem.separator())

        let bgSub = NSMenu()
        for (k, title) in [("transparent", "透明悬浮（默认）"), ("card", "暖黄卡片"), ("greenscreen", "OBS 绿幕 (#00FF00)")] {
            let it = NSMenuItem(title: title, action: #selector(selectBgMode(_:)), keyEquivalent: "")
            it.representedObject = k
            bgSub.addItem(it)
            bgModeMenuItems[k] = it
        }
        let bgParent = NSMenuItem(title: "背景模式", action: nil, keyEquivalent: "")
        bgParent.submenu = bgSub
        menu.addItem(bgParent)

        soundMenuItem = NSMenuItem(title: "按键声与呼噜声", action: #selector(toggleSound), keyEquivalent: "m")
        menu.addItem(soundMenuItem)
        dndMenuItem = NSMenuItem(title: "会议勿扰模式（静音）", action: #selector(toggleDnd), keyEquivalent: "d")
        menu.addItem(dndMenuItem)
        menu.addItem(NSMenuItem(title: "开始 25 分钟番茄专注", action: #selector(startQuickFocus), keyEquivalent: "f"))
        clickThroughMenuItem = NSMenuItem(title: "防误触穿透（按住 ⌥ 交互）", action: #selector(toggleClickThrough), keyEquivalent: "p")
        menu.addItem(clickThroughMenuItem)
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "PawKey 设置...", action: #selector(openSettings), keyEquivalent: ","))
        toggleMenuItem = NSMenuItem(title: "隐藏爪键猫", action: #selector(togglePet), keyEquivalent: "h")
        menu.addItem(toggleMenuItem)
        menu.addItem(NSMenuItem(title: "重置小猫位置", action: #selector(resetPetPosition), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "重启 PawKey", action: #selector(relaunchApp), keyEquivalent: "r"))
        menu.addItem(NSMenuItem(title: "退出 PawKey", action: #selector(quitApp), keyEquivalent: "q"))
        statusItem.menu = menu
        syncMenuStates()
    }

    func syncMenuStates() {
        let mode = (config["bgMode"] as? String) ?? "transparent"
        for (k, it) in bgModeMenuItems { it.state = (k == mode) ? .on : .off }
        soundMenuItem?.state = ((config["sound"] as? Bool) ?? true) ? .on : .off
        dndMenuItem?.state = ((config["dndMode"] as? Bool) ?? false) ? .on : .off
        clickThroughMenuItem?.state = ((config["clickThrough"] as? Bool) ?? false) ? .on : .off
    }
    var hasSystemInputPermission: Bool { CGPreflightListenEventAccess() || AXIsProcessTrusted() }
    var hasGlobalKeyboardHook: Bool { hasSystemInputPermission && (keyTap != nil || globalKeyMonitor != nil || hidVerifiedByEvent) }
    func updatePermissionMenuUI() {
        if hasGlobalKeyboardHook {
            let mode = keyTap != nil ? "EventTap" : (hidVerifiedByEvent ? "IOHID" : "AX")
            permissionMenuItem.title = "✅ 全局打字监听已开启 (\(mode))"
            permissionMenuItem.isEnabled = false
        } else {
            permissionMenuItem.title = "⚠️ 开启全局打字权限（点此授权）"
            permissionMenuItem.isEnabled = true
        }
        broadcastStats(force: true)
    }

    func logDiag(_ line: String) {
        let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("Logs", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent("PawKey.log")
        let stamp = ISO8601DateFormatter().string(from: Date())
        let msg = "[\(stamp)] \(line)\n"
        if let fh = try? FileHandle(forWritingTo: url) {
            fh.seekToEndOfFile()
            if let d = msg.data(using: .utf8) { fh.write(d) }
            try? fh.close()
        } else {
            try? msg.write(to: url, atomically: true, encoding: .utf8)
        }
    }

    @objc func requestInputPermission() {
        _ = CGRequestListenEventAccess()
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent") { NSWorkspace.shared.open(url) }
    }
    @objc func selectBgMode(_ sender: NSMenuItem) {
        guard let mode = sender.representedObject as? String else { return }
        config["bgMode"] = mode; applyWindowConfig(); saveConfig(); broadcastConfig()
    }
    @objc func toggleSound() {
        config["sound"] = !((config["sound"] as? Bool) ?? true)
        syncMenuStates(); saveConfig(); broadcastConfig()
    }
    @objc func toggleDnd() {
        config["dndMode"] = !((config["dndMode"] as? Bool) ?? false)
        syncMenuStates(); saveConfig(); broadcastConfig()
    }
    @objc func startQuickFocus() {
        if petHidden { togglePet() }
        send(petWebView, ["type": "play-action", "action": "focus-25"])
    }
    @objc func toggleClickThrough() {
        config["clickThrough"] = !((config["clickThrough"] as? Bool) ?? false)
        applyWindowConfig(); saveConfig(); broadcastConfig()
    }
    @objc func togglePet() {
        if petHidden {
            petHidden = false; petWindow.orderFrontRegardless(); toggleMenuItem.title = "隐藏爪键猫"; startCursorTimer()
        } else {
            petHidden = true; petWindow.orderOut(nil); toggleMenuItem.title = "显示爪键猫"; cursorTimer?.invalidate(); cursorTimer = nil
        }
    }
    @objc func resetPetPosition() {
        let vf = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let origin = NSPoint(x: round(vf.maxX - petWindow.frame.width - 36), y: round(vf.minY + 36))
        petWindow.setFrameOrigin(origin)
        config["position"] = ["x": Double(origin.x), "y": Double(origin.y)]
        saveConfig()
        if petHidden { togglePet() }
    }
    @objc func ensurePetVisible() {
        guard let win = petWindow else { return }
        let frame = win.frame
        if let screen = NSScreen.screens.first(where: { $0.visibleFrame.intersects(frame) }) {
            let vf = screen.visibleFrame
            let cx = max(vf.minX - frame.width * 0.2, min(vf.maxX - frame.width * 0.85, frame.origin.x))
            let cy = max(vf.minY, min(vf.maxY - frame.height * 0.5, frame.origin.y))
            if abs(cx - frame.origin.x) > 1 || abs(cy - frame.origin.y) > 1 { win.setFrameOrigin(NSPoint(x: round(cx), y: round(cy))) }
        } else {
            resetPetPosition()
        }
    }
    @objc func relaunchApp() {
        saveConfigNow()
        let task = Process(); task.launchPath = "/usr/bin/open"; task.arguments = ["-n", Bundle.main.bundlePath, "--args", "--relaunch"]
        try? task.run(); NSApp.terminate(nil)
    }
    @objc func quitApp() { NSApp.terminate(nil) }

    func setupPetWindow() {
        let scale = max(0.4, min(2.0, CGFloat((config["scale"] as? Double) ?? 0.85)))
        let w = round(baseWidth * scale), h = round(baseHeight * scale)
        let vf = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        var origin = NSPoint(x: round(vf.maxX - w - 42), y: round(vf.minY + 42))
        if let pos = config["position"] as? [String: Double], let px = pos["x"], let py = pos["y"] {
            origin = NSPoint(x: px, y: py)
        }
        petWindow = FloatingPanel(contentRect: NSRect(origin: origin, size: NSSize(width: w, height: h)),
                                  styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        petWindow.isFloatingPanel = true
        petWindow.hidesOnDeactivate = false
        petWindow.isOpaque = false
        petWindow.backgroundColor = .clear
        petWindow.hasShadow = false

        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: bridgeScriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let mode = (config["bgMode"] as? String) ?? "transparent"
        let earlyCSS = "(function(){var s=document.createElement('style');s.id='__pawkey_bg_style';s.textContent='html.pk-bg-transparent,body.pk-bg-transparent{background:transparent!important;}html.pk-bg-greenscreen,body.pk-bg-greenscreen{background:#00ff00!important;}';(document.head||document.documentElement).appendChild(s);var m='\(mode)';if(m==='transparent')document.documentElement.classList.add('pk-bg-transparent');if(m==='greenscreen')document.documentElement.classList.add('pk-bg-greenscreen');document.addEventListener('DOMContentLoaded',function(){if(!document.body)return;if(m==='transparent')document.body.classList.add('pk-bg-transparent');if(m==='greenscreen')document.body.classList.add('pk-bg-greenscreen');});})();"
        ucc.addUserScript(WKUserScript(source: earlyCSS, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        ucc.add(self, name: "pawkey")

        let wk = WKWebViewConfiguration()
        wk.userContentController = ucc
        wk.mediaTypesRequiringUserActionForPlayback = []
        wk.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        petWebView = PetWebView(frame: NSRect(origin: .zero, size: NSSize(width: w, height: h)), configuration: wk)
        petWebView.autoresizingMask = [.width, .height]
        petWebView.setValue(false, forKey: "drawsBackground")
        if #available(macOS 12.0, *) { petWebView.underPageBackgroundColor = .clear }
        petWebView.wantsLayer = true
        petWebView.layer?.backgroundColor = NSColor.clear.cgColor
        petWebView.onScrollZoom = { [weak self] dy in self?.handleScrollZoom(dy) }

        petWindow.contentView = petWebView
        applyWindowConfig()
        ensurePetVisible()
        if let resURL = Bundle.main.resourceURL {
            let indexURL = resURL.appendingPathComponent("src/renderer/index.html").standardizedFileURL
            petWebView.loadFileURL(indexURL, allowingReadAccessTo: resURL.standardizedFileURL)
        }
        petWindow.orderFrontRegardless()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self = self, !self.petHidden else { return }
            self.petWindow.orderFrontRegardless()
        }
    }

    func updateMouseInteractivity() {
        let ct = (config["clickThrough"] as? Bool) ?? false
        let opt = NSEvent.modifierFlags.contains(.option)
        petWindow.ignoresMouseEvents = (ct && !opt) ? true : !webWantsInteractive
    }

    func applyWindowConfig() {
        petWindow.level = ((config["alwaysOnTop"] as? Bool) ?? true) ? .floating : .normal
        let hideFS = (config["hideInFullscreen"] as? Bool) ?? false
        petWindow.collectionBehavior = hideFS ? [.canJoinAllSpaces] : [.canJoinAllSpaces, .fullScreenAuxiliary]
        petWindow.alphaValue = max(0.2, min(1.0, CGFloat((config["opacity"] as? Double) ?? 1.0)))

        let mode = (config["bgMode"] as? String) ?? "transparent"
        petWindow.hasShadow = (mode == "card")
        petWebView?.layer?.cornerRadius = (mode == "card") ? 18 : 0
        petWebView?.layer?.masksToBounds = (mode == "card")
        petWebView?.evaluateJavaScript("window.__pawkeySetBgMode && window.__pawkeySetBgMode('\(mode)');", completionHandler: nil)
        petWindow.invalidateShadow()
        syncMenuStates()
        updateMouseInteractivity()

        let scale = max(0.4, min(2.0, CGFloat((config["scale"] as? Double) ?? 0.85)))
        let nw = round(baseWidth * scale), nh = round(baseHeight * scale)
        let f = petWindow.frame
        if abs(f.width - nw) > 1 || abs(f.height - nh) > 1 {
            petWindow.setFrame(NSRect(x: round(f.midX - nw / 2), y: round(f.midY - nh / 2), width: nw, height: nh), display: true)
        }
    }

    func handleScrollZoom(_ dy: CGFloat) {
        let cur = (config["scale"] as? Double) ?? 0.85
        let next = max(0.4, min(2.0, round((cur + (dy > 0 ? 0.05 : -0.05)) * 20) / 20))
        if abs(next - cur) > 0.001 {
            config["scale"] = next; applyWindowConfig(); saveConfig(); broadcastConfig()
        }
    }

    @objc func openSettings() {
        if let win = settingsWindow {
            win.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); broadcastStats(force: true); return
        }
        let vf = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let w: CGFloat = 556, h: CGFloat = min(720, max(540, vf.height - 44))
        let rect = NSRect(x: round(vf.midX - w / 2), y: round(vf.midY - h / 2), width: w, height: h)
        let win = FloatingPanel(contentRect: rect, styleMask: [.borderless], backing: .buffered, defer: false)
        win.hidesOnDeactivate = false; win.isOpaque = false; win.backgroundColor = .clear; win.hasShadow = true; win.level = .floating

        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: bridgeScriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        ucc.add(self, name: "pawkey")
        let wk = WKWebViewConfiguration(); wk.userContentController = ucc
        wk.mediaTypesRequiringUserActionForPlayback = []
        wk.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let wv = WKWebView(frame: NSRect(origin: .zero, size: rect.size), configuration: wk)
        wv.autoresizingMask = [.width, .height]
        wv.wantsLayer = true
        wv.layer?.cornerRadius = 16
        wv.layer?.masksToBounds = true
        wv.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
        if #available(macOS 12.0, *) { wv.underPageBackgroundColor = .windowBackgroundColor }
        win.contentView = wv
        if let resURL = Bundle.main.resourceURL {
            wv.loadFileURL(resURL.appendingPathComponent("src/renderer/settings.html").standardizedFileURL, allowingReadAccessTo: resURL.standardizedFileURL)
        }
        settingsWindow = win; settingsWebView = wv
        win.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }

    func closeSettings() {
        settingsWindow?.orderOut(nil); settingsWindow = nil; settingsWebView = nil
    }

    // MARK: - Global Keyboard & Mouse Monitors (4-layer truthful architecture)
    func setupInputMonitors() {
        let preflight = CGPreflightListenEventAccess()
        if !preflight { _ = CGRequestListenEventAccess() }
        tryStartGlobalInput(logStatus: true)
        updatePermissionMenuUI()
        permissionRetryTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            if !self.hasGlobalKeyboardHook { self.tryStartGlobalInput(logStatus: false); self.updatePermissionMenuUI() }
            else { self.permissionRetryTimer?.invalidate(); self.permissionRetryTimer = nil }
        }
        localKeyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) { [weak self] ev in
            if ev.type == .keyDown && ev.modifierFlags.contains(.command) && ev.charactersIgnoringModifiers?.lowercased() == "w" {
                if self?.settingsWindow?.isKeyWindow == true { self?.closeSettings(); return nil }
            }
            if self?.hasGlobalKeyboardHook == false {
                self?.handleNSEventKey(ev)
            }
            return ev
        }
    }

    func tryStartGlobalInput(logStatus: Bool = false) {
        let preflight = CGPreflightListenEventAccess()
        let axTrusted = AXIsProcessTrusted()
        let allowed = preflight || axTrusted

        // CRITICAL: On macOS, CGEvent.tapCreate(.listenOnly) can return non-nil even when
        // Input Monitoring & Accessibility are BOTH denied (silently dropping normal keys).
        // Never create or report an active global keyboard hook unless TCC actually grants access.
        if !allowed {
            if logStatus {
                logDiag("pid=\(ProcessInfo.processInfo.processIdentifier) preflight=\(preflight) ax=\(axTrusted) allowed=false hookOk=false")
            }
            return
        }

        // Channel 1 (Primary): Keyboard-only listenOnly CGEventTap
        if keyTap == nil {
            let mask: CGEventMask = (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue) | (1 << CGEventType.flagsChanged.rawValue)
            if let tap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly, eventsOfInterest: mask, callback: cgKeyCallback, userInfo: nil) {
                let src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
                CFRunLoopAddSource(CFRunLoopGetMain(), src, .commonModes)
                CGEvent.tapEnable(tap: tap, enable: true)
                keyTap = tap; keyTapSrc = src
                if let mgr = hidManager {
                    IOHIDManagerUnscheduleFromRunLoop(mgr, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)
                    IOHIDManagerClose(mgr, IOOptionBits(kIOHIDOptionsTypeNone))
                    hidManager = nil; hidActive = false
                }
                send(petWebView, ["type": "hook-status", "status": "ok"])
            }
        }

        // Channel 2 (Accessibility fallback): NSEvent global monitor
        if keyTap == nil && globalKeyMonitor == nil && axTrusted {
            globalKeyMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) { [weak self] ev in
                self?.handleNSEventKey(ev)
            }
            if globalKeyMonitor != nil {
                send(petWebView, ["type": "hook-status", "status": "ok"])
            }
        }

        // Channel 3 (Input Monitoring IOHIDManager fallback on .commonModes)
        var hidOpenRet: IOReturn = -1
        var hidDevCount = 0
        if keyTap == nil && globalKeyMonitor == nil && preflight && !hidActive {
            let mgr = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
            let matchers: [[String: Any]] = [
                [kIOHIDDeviceUsagePageKey as String: kHIDPage_GenericDesktop, kIOHIDDeviceUsageKey as String: kHIDUsage_GD_Keyboard],
                [kIOHIDDeviceUsagePageKey as String: kHIDPage_GenericDesktop, kIOHIDDeviceUsageKey as String: kHIDUsage_GD_Keypad]
            ]
            IOHIDManagerSetDeviceMatchingMultiple(mgr, matchers as CFArray)
            IOHIDManagerRegisterInputValueCallback(mgr, hidCallback, nil)
            IOHIDManagerScheduleWithRunLoop(mgr, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)
            hidOpenRet = IOHIDManagerOpen(mgr, IOOptionBits(kIOHIDOptionsTypeNone))
            if let devs = IOHIDManagerCopyDevices(mgr) as? Set<IOHIDDevice> { hidDevCount = devs.count }
            if hidOpenRet == kIOReturnSuccess && hidDevCount > 0 {
                hidManager = mgr; hidActive = true; hidVerifiedByEvent = true
                send(petWebView, ["type": "hook-status", "status": "ok"])
            } else {
                IOHIDManagerUnscheduleFromRunLoop(mgr, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)
                IOHIDManagerClose(mgr, IOOptionBits(kIOHIDOptionsTypeNone))
            }
        }

        // Separate optional Mouse-Click Tap (never blocks keyboard if unavailable)
        if mouseTap == nil {
            let mask: CGEventMask = (1 << CGEventType.leftMouseDown.rawValue) | (1 << CGEventType.leftMouseUp.rawValue) | (1 << CGEventType.rightMouseDown.rawValue) | (1 << CGEventType.rightMouseUp.rawValue)
            if let mtap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly, eventsOfInterest: mask, callback: cgMouseCallback, userInfo: nil) {
                let src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, mtap, 0)
                CFRunLoopAddSource(CFRunLoopGetMain(), src, .commonModes)
                CGEvent.tapEnable(tap: mtap, enable: true)
                mouseTap = mtap; mouseTapSrc = src
            }
        }

        if logStatus {
            logDiag("pid=\(ProcessInfo.processInfo.processIdentifier) preflight=\(preflight) ax=\(axTrusted) keyTap=\(keyTap != nil) globalMon=\(globalKeyMonitor != nil) hidActive=\(hidActive) hidRet=\(hidOpenRet) hidDevs=\(hidDevCount) mouseTap=\(mouseTap != nil) hookOk=\(hasGlobalKeyboardHook)")
        }
    }

    func recordKeyPress() {
        sessionKeyCount += 1
        let now = ProcessInfo.processInfo.systemUptime
        recentKeyTimes.append(now)
        recentKeyTimes.removeAll { now - $0 > 5.0 }
        broadcastStats(force: false)
    }

    func handleHIDKey(code: String, isDown: Bool) {
        if keyTap != nil || globalKeyMonitor != nil { return }
        if !hidVerifiedByEvent {
            hidVerifiedByEvent = true
            send(petWebView, ["type": "hook-status", "status": "ok"])
            updatePermissionMenuUI()
        }
        guard !petHidden else { return }
        if code == "AltLeft" || code == "AltRight" { updateMouseInteractivity() }
        if isDown { recordKeyPress() }
        send(petWebView, ["type": "key", "code": code, "down": isDown, "repeat": false])
    }

    func handleNSEventKey(_ event: NSEvent) {
        guard !petHidden, let code = domCode(for: event.keyCode) else { return }
        if event.type == .flagsChanged {
            let f = event.modifierFlags
            let down: Bool
            switch event.keyCode {
            case 56, 60: down = f.contains(.shift)
            case 59, 62: down = f.contains(.control)
            case 58, 61: down = f.contains(.option)
            case 55, 54: down = f.contains(.command)
            case 57: down = f.contains(.capsLock)
            default: down = false
            }
            if event.keyCode == 58 || event.keyCode == 61 { updateMouseInteractivity() }
            if down { recordKeyPress() }
            send(petWebView, ["type": "key", "code": code, "down": down, "repeat": false])
            return
        }
        let down = (event.type == .keyDown)
        if down && !event.isARepeat { recordKeyPress() }
        send(petWebView, ["type": "key", "code": code, "down": down, "repeat": event.isARepeat])
    }

    func handleCGKey(type: CGEventType, keyCode: UInt16, isRepeat: Bool, flags: CGEventFlags) {
        guard !petHidden, let code = domCode(for: keyCode) else { return }
        if type == .flagsChanged {
            let down: Bool
            switch keyCode {
            case 56, 60: down = flags.contains(.maskShift)
            case 59, 62: down = flags.contains(.maskControl)
            case 58, 61: down = flags.contains(.maskAlternate)
            case 55, 54: down = flags.contains(.maskCommand)
            case 57: down = flags.contains(.maskAlphaShift)
            default: down = false
            }
            if keyCode == 58 || keyCode == 61 { updateMouseInteractivity() }
            if down { recordKeyPress() }
            send(petWebView, ["type": "key", "code": code, "down": down, "repeat": false])
            return
        }
        let down = (type == .keyDown)
        if down && !isRepeat { recordKeyPress() }
        send(petWebView, ["type": "key", "code": code, "down": down, "repeat": isRepeat])
    }

    func handleMouseButton(button: Int, down: Bool) {
        guard !petHidden else { return }
        send(petWebView, ["type": "mouse-button", "button": button, "down": down])
    }

    func broadcastStats(force: Bool) {
        guard settingsWebView != nil else { return }
        let now = ProcessInfo.processInfo.systemUptime
        if !force && now - lastStatsBroadcast < 0.25 { return }
        lastStatsBroadcast = now
        recentKeyTimes.removeAll { now - $0 > 5.0 }
        let kpm = Int(round(Double(recentKeyTimes.count) * 12.0))
        send(settingsWebView, ["type": "stats", "keys": sessionKeyCount, "kpm": kpm, "hookOk": hasGlobalKeyboardHook])
    }

    // MARK: - Cursor Gaze & 60Hz Pet Dragging
    func startCursorTimer() {
        cursorTimer?.invalidate()
        guard !petHidden else { return }
        lastScreenMouse = NSEvent.mouseLocation
        let low = (config["lowPower"] as? Bool) ?? false
        cursorTimer = Timer.scheduledTimer(withTimeInterval: low ? (1.0 / 15.0) : (1.0 / 30.0), repeats: true) { [weak self] _ in self?.tickCursor() }
    }
    func startPetDrag() {
        isDraggingPet = true
        dragStartMouse = NSEvent.mouseLocation
        dragStartOrigin = petWindow.frame.origin
        dragTimer?.invalidate()
        dragTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in self?.tickPetDrag() }
    }
    func tickPetDrag() {
        guard isDraggingPet else { return }
        if (NSEvent.pressedMouseButtons & 1) == 0 { endPetDrag(); return }
        let m = NSEvent.mouseLocation
        let fw = petWindow.frame.width, fh = petWindow.frame.height
        var nx = round(dragStartOrigin.x + m.x - dragStartMouse.x)
        var ny = round(dragStartOrigin.y + m.y - dragStartMouse.y)
        // Smoothly clamp so at least 65% of the cat remains reachable and never lost under Menu Bar
        if let screen = NSScreen.screens.first(where: { $0.frame.contains(m) }) ?? NSScreen.main {
            let vf = screen.visibleFrame
            nx = max(vf.minX - fw * 0.25, min(vf.maxX - fw * 0.75, nx))
            ny = max(vf.minY - fh * 0.15, min(vf.maxY - fh * 0.65, ny))
        }
        petWindow.setFrameOrigin(NSPoint(x: nx, y: ny))
    }
    func endPetDrag() {
        guard isDraggingPet else { return }
        isDraggingPet = false; dragTimer?.invalidate(); dragTimer = nil
        let o = petWindow.frame.origin
        config["position"] = ["x": Double(o.x), "y": Double(o.y)]
        saveConfig()
        send(petWebView, ["type": "drag-end"])
    }
    func tickCursor() {
        guard !petHidden, !isDraggingPet else { return }
        updateMouseInteractivity()
        let m = NSEvent.mouseLocation
        let dx = m.x - lastScreenMouse.x, dy = lastScreenMouse.y - m.y
        let moved = abs(dx) > 0.5 || abs(dy) > 0.5
        lastScreenMouse = m
        let f = petWindow.frame, inside = f.contains(m)
        if moved {
            send(petWebView, ["type": "mouse", "dx": dx, "dy": dy])
            if !inside {
                send(petWebView, ["type": "gaze", "nx": max(-1.0, min(1.0, (m.x - f.midX) / 520.0)), "ny": max(-1.0, min(1.0, (f.midY - m.y) / 380.0))])
            }
        }
        if inside {
            let lx = m.x - f.minX, ly = f.height - (m.y - f.minY)
            if !wasInsidePet || abs(lx - lastLocalMouse.x) > 0.5 || abs(ly - lastLocalMouse.y) > 0.5 {
                wasInsidePet = true; lastLocalMouse = NSPoint(x: lx, y: ly)
                send(petWebView, ["type": "cursor", "x": lx, "y": ly, "inside": true])
            }
        } else if wasInsidePet {
            wasInsidePet = false; webWantsInteractive = false; lastLocalMouse = NSPoint(x: -9999, y: -9999)
            send(petWebView, ["type": "cursor", "inside": false]); updateMouseInteractivity()
        }
    }

    func send(_ wv: WKWebView?, _ payload: [String: Any]) {
        guard let wv = wv, let data = try? JSONSerialization.data(withJSONObject: payload), let s = String(data: data, encoding: .utf8) else { return }
        wv.evaluateJavaScript("window.__pawkeyReceive && window.__pawkeyReceive(\(s));", completionHandler: nil)
    }
    func broadcastConfig(replyTo: WKWebView? = nil, id: Any? = nil) {
        var msg: [String: Any] = ["type": "config", "config": config]
        if let id = id { msg["id"] = id }
        if let t = replyTo { send(t, msg) }
        if replyTo !== petWebView { send(petWebView, ["type": "config", "config": config]) }
        if let swv = settingsWebView, replyTo !== swv { send(swv, ["type": "config", "config": config]) }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        let sender = message.webView
        switch type {
        case "config:get": broadcastConfig(replyTo: sender, id: body["id"])
        case "config:set":
            if let patch = body["patch"] as? [String: Any] {
                for (k, v) in patch { config[k] = v }
                if let startup = patch["launchAtStartup"] as? Bool { syncLaunchAtStartup(startup) }
                if patch["lowPower"] != nil { startCursorTimer() }
                applyWindowConfig(); saveConfig()
            }
            broadcastConfig(replyTo: sender, id: body["id"])
        case "interactive":
            if let v = body["value"] as? Bool { webWantsInteractive = v; updateMouseInteractivity() }
        case "drag:start": startPetDrag()
        case "drag:end": endPetDrag()
        case "settings:open": openSettings()
        case "settings:close": closeSettings()
        case "settings:minimize": settingsWindow?.miniaturize(nil)
        case "window:drag": if let win = settingsWindow, let ev = NSApp.currentEvent { win.performDrag(with: ev) }
        case "pet:hide": if !petHidden { togglePet() }
        case "pet:reset-pos": resetPetPosition()
        case "pet:play": if let act = body["action"] as? String { send(petWebView, ["type": "play-action", "action": act]) }
        case "stats:get": broadcastStats(force: true)
        case "permission:request": requestInputPermission()
        case "app:relaunch": relaunchApp()
        case "app:quit": quitApp()
        case "ready":
            send(petWebView, ["type": "hook-status", "status": hasGlobalKeyboardHook ? "ok" : "failed"])
            applyWindowConfig(); broadcastConfig(); broadcastStats(force: true)
        default: break
        }
    }
}

let app = NSApplication.shared
let delegate = PawKeyAppDelegate()
sharedDelegate = delegate
app.delegate = delegate
app.run()
