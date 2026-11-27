#!/usr/bin/env bash
# macOS Release Packager: Universal DMG (Developer ID + Notarization or Open-Source Ad-Hoc)
# Usage:
#   # Optional Developer ID signing + notarization:
#   export PAWKEY_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
#   export PAWKEY_NOTARY_PROFILE="pawkey-notary"   # created via: xcrun notarytool store-credentials
#   bash scripts/package-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${PAWKEY_DIST_DIR:-$ROOT/dist}"
VERSION="${PAWKEY_VERSION:-1.1.0}"
DMG_PATH="$DIST/PawKey-${VERSION}-macOS-Universal.dmg"
STAGE_APP_ROOT="$DIST/.stage-app"
STAGE="$DIST/dmg-stage"

if [ -n "${PAWKEY_APP_DIR:-}" ]; then
  APP_DIR="$PAWKEY_APP_DIR"
  CLEANUP_STAGE_APP=0
else
  APP_DIR="$STAGE_APP_ROOT/PawKey.app"
  CLEANUP_STAGE_APP=1
fi
export PAWKEY_APP_DIR="$APP_DIR"
export PAWKEY_VERSION="$VERSION"

cleanup() {
  rm -rf "$STAGE"
  if [ "$CLEANUP_STAGE_APP" -eq 1 ]; then
    rm -rf "$STAGE_APP_ROOT"
  fi
}
trap cleanup EXIT

mkdir -p "$DIST"

bash "$ROOT/build.sh"

if [ -n "${PAWKEY_SIGN_IDENTITY:-}" ]; then
  echo "==> Verifying Hardened Runtime Developer ID signature..."
  codesign --verify --deep --strict --verbose=2 "$APP_DIR"
else
  echo "==> Verifying ad-hoc bundle signature (set PAWKEY_SIGN_IDENTITY for Developer ID signing)..."
  codesign --verify --deep --strict "$APP_DIR"
  if [ -n "${PAWKEY_NOTARY_PROFILE:-}" ]; then
    echo "Warning: PAWKEY_NOTARY_PROFILE ignored without PAWKEY_SIGN_IDENTITY." >&2
  fi
fi

echo "==> Creating Universal DMG installer..."
rm -rf "$STAGE" "$DMG_PATH"
mkdir -p "$STAGE"
ditto "$APP_DIR" "$STAGE/PawKey.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "PawKey ${VERSION}" -srcfolder "$STAGE" -ov -format UDZO "$DMG_PATH"

if [ -n "${PAWKEY_SIGN_IDENTITY:-}" ]; then
  codesign --force --timestamp --sign "$PAWKEY_SIGN_IDENTITY" "$DMG_PATH"
  if [ -n "${PAWKEY_NOTARY_PROFILE:-}" ]; then
    echo "==> Submitting to Apple Notarization service..."
    xcrun notarytool submit "$DMG_PATH" --keychain-profile "$PAWKEY_NOTARY_PROFILE" --wait
    xcrun stapler staple "$DMG_PATH"
    spctl --assess --type open --context context:primary-signature --verbose "$DMG_PATH"
  fi
else
  echo "==> Packaged open-source ad-hoc DMG (unsigned DMG container)."
fi

echo "==> Release ready: $DMG_PATH"
ls -lh "$DMG_PATH"
shasum -a 256 "$DMG_PATH"
