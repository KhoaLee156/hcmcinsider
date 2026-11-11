#!/usr/bin/env bash
# Builds the web version into <website>/qr/ (served at https://hcmcinsider.com/qr/).
# Run from anywhere:  qr-src/scripts/build-web.sh            (website = parent folder of qr-src)
#                 or:  scripts/build-web.sh /path/to/website
set -euo pipefail
APP="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$(cd "${1:-$APP/..}" && pwd)"
cd "$APP"
[ -d node_modules ] || npm install
rm -rf dist-web
EXPO_OFFLINE=1 CI=1 npx expo export --platform web --output-dir dist-web
MAIN=$(grep -o 'index-[0-9a-f]*\.js' dist-web/index.html | head -1)
OUT="$SITE/qr"
rm -rf "$OUT/js"
mkdir -p "$OUT/js"
for f in dist-web/_expo/static/js/web/*.js; do
  sed 's#/_expo/static/js/web/#/qr/js/#g' "$f" > "$OUT/js/$(basename "$f")"
done
sed "s#__BUNDLE__#$MAIN#" web/index.html > "$OUT/index.html"
cp web/manifest.webmanifest "$OUT/manifest.webmanifest"
rm -rf dist-web
echo "Built $OUT (main bundle $MAIN)"
