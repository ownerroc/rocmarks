#!/usr/bin/env bash
# Chrome extension packaging (RocMarks)
# Usage: ./build-chrome.sh [output.zip]

set -euo pipefail

OUT="${1:-rocmarks-chrome.zip}"
# Normalize to an absolute path (relative to the invocation cwd)
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT";; esac
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "==> Packaging RocMarks (Chrome / Manifest V3)..."

# Stage extension sources (no dev/test artifacts)
cp manifest.json popup.html popup.js background.js browser-polyfill.js config.js styles.css "$STAGE"/
cp -r _locales icons "$STAGE"/

# Basic sanity checks
grep -q '"manifest_version": 3' "$STAGE/manifest.json" || { echo "ERROR: manifest.json is not Manifest V3"; exit 1; }
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
