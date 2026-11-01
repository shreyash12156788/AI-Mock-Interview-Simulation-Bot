#!/bin/sh
set -eu

: "${BACKEND_URL:?Set BACKEND_URL to the deployed C++ backend URL.}"
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *)
    printf '%s\n' "BACKEND_URL must use http:// or https://." >&2
    exit 1
    ;;
esac
if ! printf '%s' "$BACKEND_URL" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$'; then
  printf '%s\n' "BACKEND_URL must be an origin without a path." >&2
  exit 1
fi

backend_url=${BACKEND_URL%/}
rm -rf dist
mkdir -p dist/assets
cp index.html dist/index.html
cp app.js styles.css dist/assets/
printf '"use strict";\n\nwindow.ADAPTIVE_INTERVIEW_CONFIG = Object.freeze({\n  backendUrl: "%s"\n});\n' \
  "$backend_url" > dist/assets/config.js
