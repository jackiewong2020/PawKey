#!/usr/bin/env bash
# Commercial macOS Release Packager: Developer ID Signing + Apple Notarization + Universal DMG
# Usage:
#   export PAWKEY_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
#   export PAWKEY_NOTARY_PROFILE="pawkey-notary"   # created via: xcrun notarytool store-credentials
#   bash scripts/package-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${PAWKEY_APP_DIR:-/Applications/PawKey.app}"
DIST="$ROOT/dist"
VERSION="1.0.0"
DMG_PATH="$DIST/PawKey-${VERSION}-Universal.dmg"

: "${PAWKEY_SIGN_IDENTITY:?Set PAWKEY_SIGN_IDENTITY to your Developer ID Application certificate}"
mkdir -p "$DIST"

bash "$ROOT/build.sh"

echo "==> Verifying Hardened Runtime signature..."
codesign --verify --deep --strict --verbose=2 "$APP_DIR"

echo "==> Creating Universal DMG installer..."
STAGE="$DIST/dmg-stage"
rm -rf "$STAGE" "$DMG_PATH"
mkdir -p "$STAGE"
ditto "$APP_DIR" "$STAGE/PawKey.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "PawKey ${VERSION}" -srcfolder "$STAGE" -ov -format UDZO "$DMG_PATH"
codesign --force --timestamp --sign "$PAWKEY_SIGN_IDENTITY" "$DMG_PATH"
rm -rf "$STAGE"

if [ -n "${PAWKEY_NOTARY_PROFILE:-}" ]; then
  echo "==> Submitting to Apple Notarization service..."
  xcrun notarytool submit "$DMG_PATH" --keychain-profile "$PAWKEY_NOTARY_PROFILE" --wait
  xcrun stapler staple "$DMG_PATH"
  spctl --assess --type open --context context:primary-signature --verbose "$DMG_PATH"
fi

echo "==> Commercial release ready: $DMG_PATH"
ls -lh "$DMG_PATH"
