#!/usr/bin/env bash
# Publish the static 修仙观览 into the nginx root, then copy the OpenClaw
# entrypoints beside it. This does not install the Vite SPA from apps/web.
set -euo pipefail

WEB_ROOT="${1:-/var/www/immortalclaw}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUESTED="${2:-}"
AGENT_PUBLIC="${3:-$REPO_ROOT/apps/web/public}"

resolve_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    printf '%s\n' "$p"
    return
  fi
  if [[ -d "$p" ]]; then
    (cd "$p" && pwd)
    return
  fi
  if [[ -d "$REPO_ROOT/$p" ]]; then
    (cd "$REPO_ROOT/$p" && pwd)
    return
  fi
  printf '%s\n' "$REPO_ROOT/$p"
}

if [[ -n "$REQUESTED" ]]; then
  SPECTATOR="$(resolve_path "$REQUESTED")"
else
  SPECTATOR="$REPO_ROOT/apps/spectator"
fi

if [[ "$AGENT_PUBLIC" != /* ]]; then
  AGENT_PUBLIC="$(resolve_path "$AGENT_PUBLIC")"
fi

if [[ ! -f "$SPECTATOR/index.html" ]]; then
  echo "missing spectator index: $SPECTATOR/index.html" >&2
  echo "the homepage lives in apps/spectator. run: npm run build:spectator" >&2
  exit 1
fi

# The old upgrade command passed apps/web/dist. That shell would replace
# the live 观览 page, so stop here instead of copying it.
if grep -q 'id="root"' "$SPECTATOR/index.html"; then
  echo "refusing to publish a Vite SPA over the 修仙观览 homepage: $SPECTATOR" >&2
  echo "run: npm run build:spectator" >&2
  echo "then: sudo bash deploy/sync-web-root.sh $WEB_ROOT" >&2
  exit 1
fi

for meta in openclaw-skill-url openclaw-register-url openclaw-heartbeat-url; do
  if ! grep -q "$meta" "$SPECTATOR/index.html"; then
    echo "spectator index is missing $meta" >&2
    exit 1
  fi
done

for name in index.html styles.css app.js jiuzhou-ink-wash.png; do
  if [[ ! -f "$SPECTATOR/$name" ]]; then
    echo "missing spectator file: $SPECTATOR/$name" >&2
    exit 1
  fi
done

for doc in skill.md register.md heartbeat.md; do
  if [[ ! -f "$AGENT_PUBLIC/$doc" ]]; then
    echo "missing agent entrypoint: $AGENT_PUBLIC/$doc" >&2
    exit 1
  fi
done

if [[ ! -d "$AGENT_PUBLIC/agent-templates" ]]; then
  echo "missing agent-templates: $AGENT_PUBLIC/agent-templates" >&2
  exit 1
fi

mkdir -p "$WEB_ROOT" "$WEB_ROOT/agent-templates"
cp -a \
  "$SPECTATOR/index.html" \
  "$SPECTATOR/styles.css" \
  "$SPECTATOR/app.js" \
  "$SPECTATOR/jiuzhou-ink-wash.png" \
  "$WEB_ROOT"/
cp -a \
  "$AGENT_PUBLIC/skill.md" \
  "$AGENT_PUBLIC/register.md" \
  "$AGENT_PUBLIC/heartbeat.md" \
  "$WEB_ROOT"/
cp -a "$AGENT_PUBLIC/agent-templates"/. "$WEB_ROOT/agent-templates"/
rm -f \
  "$WEB_ROOT/agent-templates/dungeon-wake.html" \
  "$WEB_ROOT/agent-templates/progress-summary.html" \
  "$WEB_ROOT/agent-templates/gift-notice.html"

echo "published 修仙观览 to $WEB_ROOT"
echo "  spectator: $SPECTATOR"
echo "  agent docs: $AGENT_PUBLIC"
