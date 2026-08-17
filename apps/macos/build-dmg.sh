#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MACOS_ROOT="$REPO_ROOT/apps/macos"
DIST_ROOT="${DIST_ROOT:-$REPO_ROOT/dist/macos}"
STAGE="$DIST_ROOT/.stage"
APP_NAME="Dockyard DSH"
APP="$DIST_ROOT/$APP_NAME.app"
DMG="$DIST_ROOT/Dockyard-DSH-macos-universal.dmg"
DSH_VERSION="${DSH_VERSION:-0.1.0-rc.6}"
PNPM_VERSION="${PNPM_VERSION:-10.12.4}"
NODE_VERSION="${NODE_VERSION:-22.19.0}"
read -r -a TARGET_ARCHES <<< "${TARGET_ARCHES:-arm64 x64}"
NPM_CACHE="${NPM_CONFIG_CACHE:-$DIST_ROOT/.npm-cache}"
NODE_FOR_BUILD="${NODE_FOR_BUILD:-$(command -v node)}"
CODESIGN_IDENTITY="${CODESIGN_IDENTITY:--}"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "the macOS app can only be built on macOS"
command -v swiftc >/dev/null || fail "swiftc is required"
command -v lipo >/dev/null || fail "lipo is required"
command -v hdiutil >/dev/null || fail "hdiutil is required"
command -v npm >/dev/null || fail "npm is required"
[[ -x "$NODE_FOR_BUILD" ]] || fail "build Node runtime not found: $NODE_FOR_BUILD"
[[ " ${TARGET_ARCHES[*]} " == *" arm64 "* && " ${TARGET_ARCHES[*]} " == *" x64 "* ]] || fail "universal builds require both arm64 and x64 Node runtimes"

mkdir -p "$DIST_ROOT" "$STAGE" "$NPM_CACHE"
rm -rf "$APP" "$STAGE" "$DIST_ROOT/dmg-root" "$DMG"
mkdir -p "$STAGE/runtime/dsh" "$STAGE/dsh-home" "$STAGE/tools"

log "build the Dockyard plugin bundle"
(
  cd "$REPO_ROOT"
  npm test
  npm run build
)

log "pack the Dockyard plugin"
PLUGIN_NAME="$({ cd "$REPO_ROOT" && npm_config_cache="$NPM_CACHE" npm pack --pack-destination "$STAGE" 2>"$STAGE/npm-pack.log"; } | tail -n 1)"
PLUGIN_TGZ="$STAGE/$PLUGIN_NAME"
[[ -f "$PLUGIN_TGZ" ]] || fail "npm pack did not produce a plugin tarball"

log "download the pinned Node runtimes"
rm -rf "$STAGE/node-unpacked"
mkdir -p "$STAGE/node-unpacked"
for node_arch in "${TARGET_ARCHES[@]}"; do
  case "$node_arch" in
    arm64|x64) ;;
    *) fail "unsupported target architecture: $node_arch (use arm64 and/or x64)" ;;
  esac
  node_tarball="node-v${NODE_VERSION}-darwin-${node_arch}.tar.gz"
  node_url="https://nodejs.org/dist/v${NODE_VERSION}/${node_tarball}"
  node_archive="$STAGE/$node_tarball"
  if [[ ! -f "$node_archive" ]]; then
    curl --fail --location --retry 3 --output "$node_archive" "$node_url"
  fi
  tar -xzf "$node_archive" -C "$STAGE/node-unpacked"
  node_root="$STAGE/node-unpacked/node-v${NODE_VERSION}-darwin-${node_arch}"
  [[ -x "$node_root/bin/node" ]] || fail "downloaded Node archive does not contain node ($node_arch)"
  cp "$node_root/bin/node" "$STAGE/runtime/node-$node_arch"
  chmod 755 "$STAGE/runtime/node-$node_arch"
  cp "$node_root/LICENSE" "$STAGE/runtime/node-$node_arch.LICENSE.txt"
done

log "install the pinned DSH CLI runtime"
npm_config_cache="$NPM_CACHE" npm install \
  --prefix "$STAGE/runtime/dsh" \
  --omit=dev \
  --ignore-scripts \
  "@deepseek-ai/dsh@$DSH_VERSION"

log "install pnpm for build-time profile assembly"
npm_config_cache="$NPM_CACHE" npm install \
  --prefix "$STAGE/tools" \
  --no-save \
  --ignore-scripts \
  "pnpm@$PNPM_VERSION"
PNPM="$STAGE/tools/node_modules/.bin/pnpm"
[[ -x "$PNPM" ]] || fail "pnpm was not installed"

log "assemble the self-contained DSH Web profile"
DSH_ENTRY="$STAGE/runtime/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js"
DSH_HOME="$STAGE/dsh-home" \
PATH="$STAGE/tools/node_modules/.bin:$PATH" \
  "$NODE_FOR_BUILD" "$DSH_ENTRY" plugin --profile web add "$PLUGIN_TGZ"
[[ -f "$STAGE/dsh-home/profiles/web/package.json" ]] || fail "DSH Web profile was not assembled"

# The dependency is already materialized in the profile. Replace the build-only
# absolute tarball reference so the copied profile does not retain a temp path.
PROFILE_MANIFEST="$STAGE/dsh-home/profiles/web/package.json"
PROFILE_MANIFEST="$PROFILE_MANIFEST" "$NODE_FOR_BUILD" <<'NODE'
const fs = require("node:fs");
const file = process.env.PROFILE_MANIFEST;
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
if (manifest.dependencies?.["@dockyard-dsh/plugin"]) {
  manifest.dependencies["@dockyard-dsh/plugin"] = "0.1.1";
}
fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

# WebKit reports a null relatedTarget when focus moves into this menu. The
# upstream component's blur handler then closes the menu before its click
# handler can select a model. The standalone shell already preserves focus on
# menu presses; remove that conflicting blur path from the pinned client bundle.
MODEL_SELECTION_CLIENT="$STAGE/dsh-home/profiles/web/node_modules/@deepseek-ai/dsh-client-ui-model-selection/lib/client.js"
MODEL_SELECTION_CLIENT="$MODEL_SELECTION_CLIENT" "$NODE_FOR_BUILD" <<'NODE'
const fs = require("node:fs");
const file = process.env.MODEL_SELECTION_CLIENT;
const source = fs.readFileSync(file, "utf8");
const oldText = "onKeyDown: onRootKeyDown,\n\t\t\t\tonBlur,\n\t\t\t\tchildren: [";
const newText = "onKeyDown: onRootKeyDown,\n\t\t\t\tchildren: [";
const occurrences = source.split(oldText).length - 1;
if (occurrences !== 1) throw new Error(`unexpected model-selection client layout (${occurrences} matches)`);
fs.writeFileSync(file, source.replace(oldText, newText));
NODE
rm -f "$STAGE/dsh-home/profiles/web/pnpm-lock.yaml"

log "copy the embedded runtime into the application bundle"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/runtime" "$APP/Contents/Resources"
cp "$MACOS_ROOT/DockyardDSH/Resources/Info.plist" "$APP/Contents/Info.plist"
cp "$MACOS_ROOT/assets/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
cp -R "$STAGE/runtime/dsh" "$APP/Contents/Resources/runtime/dsh"
for node_arch in "${TARGET_ARCHES[@]}"; do
  cp "$STAGE/runtime/node-$node_arch" "$APP/Contents/Resources/runtime/node-$node_arch"
  cp "$STAGE/runtime/node-$node_arch.LICENSE.txt" "$APP/Contents/Resources/runtime/node-$node_arch.LICENSE.txt"
  chmod 755 "$APP/Contents/Resources/runtime/node-$node_arch"
done
cp -R "$STAGE/dsh-home" "$APP/Contents/Resources/dsh-home"

log "compile universal native WebView launcher"
swiftc -O -target arm64-apple-macos13.0 \
  -framework Cocoa \
  -framework WebKit \
  "$MACOS_ROOT/DockyardDSH/Sources/main.swift" \
  -o "$STAGE/DockyardDSH-arm64"
swiftc -O -target x86_64-apple-macos13.0 \
  -framework Cocoa \
  -framework WebKit \
  "$MACOS_ROOT/DockyardDSH/Sources/main.swift" \
  -o "$STAGE/DockyardDSH-x64"
lipo -create \
  "$STAGE/DockyardDSH-arm64" \
  "$STAGE/DockyardDSH-x64" \
  -output "$APP/Contents/MacOS/$APP_NAME"
chmod 755 "$APP/Contents/MacOS/$APP_NAME"

log "sign the application bundle"
codesign --force --deep --sign "$CODESIGN_IDENTITY" "$APP"
codesign --verify --deep --strict "$APP"

log "create the DMG"
mkdir -p "$DIST_ROOT/dmg-root"
cp -R "$APP" "$DIST_ROOT/dmg-root/$APP_NAME.app"
ln -s /Applications "$DIST_ROOT/dmg-root/Applications"
hdiutil create \
  -fs HFS+ \
  -volname "$APP_NAME" \
  -srcfolder "$DIST_ROOT/dmg-root" \
  -noanyowners \
  -ov \
  -format UDZO \
  "$DMG" >/dev/null
if [[ "$CODESIGN_IDENTITY" != "-" ]]; then
  codesign --force --sign "$CODESIGN_IDENTITY" "$DMG"
fi

rm -rf "$DIST_ROOT/dmg-root" "$STAGE/node-unpacked" "$STAGE/tools" "$STAGE/npm-pack.log"
rm -f "$STAGE"/node-v*.tar.gz

printf '\nBuilt:\n  %s\n  %s\n' "$APP" "$DMG"
printf 'Size:\n  app: %s\n  dmg: %s\n' \
  "$(du -sh "$APP" | cut -f1)" \
  "$(du -sh "$DMG" | cut -f1)"
