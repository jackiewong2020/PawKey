#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${PAWKEY_APP_DIR-/Applications/PawKey.app}"
VERSION="${PAWKEY_VERSION:-1.1.0}"
BUILD_NUM="${PAWKEY_BUILD:-110}"
BUILD_TMP="$ROOT/.build"

RAW_APP_DIR="$APP_DIR"
while [ "${APP_DIR%/}" != "$APP_DIR" ]; do
  APP_DIR="${APP_DIR%/}"
done
if [ -z "$APP_DIR" ] || [ "$APP_DIR" = "." ] || [ "$APP_DIR" = ".." ]; then
  echo "Error: invalid PAWKEY_APP_DIR ('$RAW_APP_DIR')." >&2
  exit 1
fi

for cmd in swiftc lipo codesign; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required tool '$cmd' not found in PATH." >&2
    exit 1
  fi
done

mkdir -p "$BUILD_TMP"

echo "==> [1/5] Generating 100% original PawKey icons (if needed)..."
if [ ! -f "$ROOT/assets/AppIcon.icns" ]; then
  python3 "$ROOT/scripts/generate_icons.py" --app-icon
fi

echo "==> [2/5] Building Universal Binary (arm64 + x86_64)..."
SWIFT_FLAGS="-O -framework Cocoa -framework WebKit -framework CoreGraphics -framework IOKit"
swiftc -target arm64-apple-macos13.0 $SWIFT_FLAGS "$ROOT/native/PawKeyApp.swift" -o "$BUILD_TMP/PawKey-arm64"
swiftc -target x86_64-apple-macos13.0 $SWIFT_FLAGS "$ROOT/native/PawKeyApp.swift" -o "$BUILD_TMP/PawKey-x86_64"
lipo -create -output "$BUILD_TMP/PawKey" "$BUILD_TMP/PawKey-arm64" "$BUILD_TMP/PawKey-x86_64"

echo "==> [3/5] Assembling clean $APP_DIR bundle..."
TARGET_BIN="$APP_DIR/Contents/MacOS/PawKey"
PIDS="$(ps -axo pid=,comm= | awk -v target="$TARGET_BIN" -v self="$$" '{ pid=$1; sub(/^[[:space:]]*[0-9]+[[:space:]]+/, ""); if ($0 == target && pid != self) print pid }' || true)"
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill 2>/dev/null || true
  sleep 0.4
fi
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources/assets"

cp "$BUILD_TMP/PawKey" "$APP_DIR/Contents/MacOS/PawKey"
chmod +x "$APP_DIR/Contents/MacOS/PawKey"
cp "$ROOT/assets/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
cp "$ROOT/assets/tray-icon.png" "$ROOT/assets/tray-icon@2x.png" "$APP_DIR/Contents/Resources/assets/"
cp "$ROOT/THIRD_PARTY_LICENSES.txt" "$APP_DIR/Contents/Resources/"
cp -R "$ROOT/src" "$APP_DIR/Contents/Resources/src"

cat > "$APP_DIR/Contents/Info.plist" <<PLIST
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
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${BUILD_NUM}</string>
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
if command -v node >/dev/null 2>&1; then
  for f in skins.js cat3d.js tail2d.js pawkey-audio.js pawkey-app.js pawkey-settings.js; do
    node --check "$APP_DIR/Contents/Resources/src/renderer/js/$f"
  done
else
  echo "==> [4/5] Warning: node not found in PATH, skipping JS syntax check."
fi

echo "==> [5/5] Signing bundle (Developer ID if configured, else local ad-hoc)..."
if [ -n "${PAWKEY_SIGN_IDENTITY:-}" ]; then
  codesign --force --deep --options runtime --timestamp --sign "$PAWKEY_SIGN_IDENTITY" "$APP_DIR"
else
  codesign --force --deep --sign - "$APP_DIR"
fi

echo "==> Build complete:"
file "$APP_DIR/Contents/MacOS/PawKey"
du -sh "$APP_DIR"
