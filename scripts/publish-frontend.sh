#!/usr/bin/env bash
set -euo pipefail

staging=${1:?Provide the uploaded frontend directory}
destination=${2:?Provide the served frontend directory}

test -s "$staging/index.html"
mkdir -p "$destination"
staging=$(cd "$staging" && pwd -P)
destination=$(cd "$destination" && pwd -P)
case "$destination/" in
  "$staging/"*) echo "The served directory must be outside staging" >&2; exit 1 ;;
esac
# Copy assets first and keep previous hashed assets for already-open pages.
shopt -s dotglob nullglob
for asset in "$staging"/*; do
  if [ "${asset##*/}" = index.html ]; then continue; fi
  cp -a -- "$asset" "$destination/"
done
cp "$staging/index.html" "$destination/.index.html.next"
mv -f "$destination/.index.html.next" "$destination/index.html"
rm -rf -- "$staging"
