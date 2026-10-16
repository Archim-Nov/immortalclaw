#!/usr/bin/env bash
# Copy a built web dist into the nginx root, then drop owner pages that
# presentation v2 withdrew. A leftover html file would still be served.
set -euo pipefail

WEB_ROOT="${1:-/var/www/immortalclaw}"
DIST="${2:-apps/web/dist}"

if [[ ! -d "$DIST" ]]; then
  echo "missing dist: $DIST" >&2
  exit 1
fi

mkdir -p "$WEB_ROOT"
cp -a "$DIST"/. "$WEB_ROOT"/
rm -f \
  "$WEB_ROOT/agent-templates/dungeon-wake.html" \
  "$WEB_ROOT/agent-templates/progress-summary.html" \
  "$WEB_ROOT/agent-templates/gift-notice.html"
