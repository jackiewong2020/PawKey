#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${PAWKEY_APP_DIR:-/Applications/PawKey.app}"
BUILD_TMP="$ROOT/.build"
mkdir -p "$BUILD_TMP"

echo "==> [1/5] Generating 100% original PawKey icons (if needed)..."
if [ ! -f "$ROOT/assets/AppIcon.icns" ]; then
  python3 "$ROOT/scripts/generate_icons.py"
fi

echo "==> [2/5] Building Universal Binary (arm64 + x86_64)..."
SWIFT_FLAGS="-O -framework Cocoa -framework WebKit -framework CoreGraphics -framework IOKit"
swiftc -target arm64-apple-macos13.0 $SWIFT_FLAGS "$ROOT/native/PawKeyApp.swift" -o "$BUILD_TMP/PawKey-arm64"
swiftc -target x86_64-apple-macos13.0 $SWIFT_FLAGS "$ROOT/native/PawKeyApp.swift" -o "$BUILD_TMP/PawKey-x86_64"
lipo -create -output "$BUILD_TMP/PawKey" "$BUILD_TMP/PawKey-arm64" "$BUILD_TMP/PawKey-x86_64"

echo "==> [3/5] Assembling clean /Applications/PawKey.app bundle..."
pkill -f "PawKey.app/Contents/MacOS/PawKey" 2>/dev/null || true
sleep 0.4
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources/assets"

cp "$BUILD_TMP/PawKey" "$APP_DIR/Contents/MacOS/PawKey"
chmod +x "$APP_DIR/Contents/MacOS/PawKey"
cp "$ROOT/assets/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
cp "$ROOT/assets/tray-icon.png" "$ROOT/assets/tray-icon@2x.png" "$APP_DIR/Contents/Resources/assets/"
cp "$ROOT/THIRD_PARTY_LICENSES.txt" "$APP_DIR/Contents/Resources/"
cp -R "$ROOT/src" "$APP_DIR/Contents/Resources/src"

cat > "$APP_DIR/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundleDisplayName</key>
  <string>PawKey · 爪键猫</string>
  <key>CFBundleExecutable</key>
  <string>PawKey</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.pawkey.app</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>PawKey</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>100</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.productivity</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSHumanReadableCopyright</key>
  <string>Copyright © 2026 PawKey Authors. All rights reserved.</string>
</dict>
</plist>
PLIST

echo "==> [4/5] Validating JS syntax..."
for f in skins.js cat3d.js tail2d.js pawkey-audio.js pawkey-app.js pawkey-settings.js; do
  node --check "$APP_DIR/Contents/Resources/src/renderer/js/$f"
done

echo "==> [5/5] Signing bundle (Developer ID if configured, else local ad-hoc)..."
if [ -n "${PAWKEY_SIGN_IDENTITY:-}" ]; then
  codesign --force --deep --options runtime --timestamp --sign "$PAWKEY_SIGN_IDENTITY" "$APP_DIR"
else
  codesign --force --deep --sign - "$APP_DIR"
fi

echo "==> Build complete:"
file "$APP_DIR/Contents/MacOS/PawKey"
du -sh "$APP_DIR"
