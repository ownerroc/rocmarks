#!/usr/bin/env bash
# Firefox extension packaging (RocMarks, Manifest V2)
# Usage: ./build-firefox.sh [output.zip]

set -euo pipefail

OUT="${1:-rocmarks-firefox.zip}"
# Normalize to an absolute path (relative to the invocation cwd)
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT";; esac
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "==> Packaging RocMarks (Firefox / Manifest V2)..."

# Stage extension sources, substituting the Firefox manifest
cp popup.html popup.js background.js browser-polyfill.js config.js styles.css "$STAGE"/
cp -r _locales icons "$STAGE"/
cp manifest.firefox.json "$STAGE/manifest.json"

# Basic sanity checks
grep -q '"manifest_version": 2' "$STAGE/manifest.json" || { echo "ERROR: manifest.firefox.json is not Manifest V2"; exit 1; }
node --check "$STAGE/popup.js"
node --check "$STAGE/background.js"

rm -f "$OUT"
if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE" && zip -qr "$OUT" .)
else
  # Fallback for environments without zip (e.g. Termux)
  (cd "$STAGE" && OUT_ZIP="$OUT" python3 -c '
import os, zipfile
with zipfile.ZipFile(os.environ["OUT_ZIP"], "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk("."):
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p))
' )
fi
echo "==> OK: $OUT"
