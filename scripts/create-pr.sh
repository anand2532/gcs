#!/usr/bin/env bash
# Create or show the open PR for this feature branch using GitHub CLI.
# Auth (pick one):
#   • gh auth login
#   • export GH_TOKEN=...   (classic PAT, repo scope)
#   • Put GH_TOKEN=... in .env.pr.local at repo root (gitignored — copy from .env.pr.example)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/bin:${PATH}"

GH_BIN="$(command -v gh || true)"
if [[ -z "${GH_BIN}" || ! -x "${GH_BIN}" ]]; then
  echo "Installing GitHub CLI to ~/.local/bin ..."
  mkdir -p "${HOME}/.local/bin"
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/gh.tgz" "https://github.com/cli/cli/releases/download/v2.63.2/gh_2.63.2_linux_amd64.tar.gz"
  tar -xzf "${tmp}/gh.tgz" -C "${tmp}"
  mv "${tmp}/gh_2.63.2_linux_amd64/bin/gh" "${HOME}/.local/bin/gh"
  chmod +x "${HOME}/.local/bin/gh"
  rm -rf "${tmp}"
fi

# Optional: repo-local token file (never commit this file)
if [[ -f "${ROOT}/.env.pr.local" ]]; then
  set -a
  # shellcheck disable=1091
  source "${ROOT}/.env.pr.local"
  set +a
fi

BASE_BRANCH="${BASE_BRANCH:-main}"
HEAD_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
OWNER_REPO=""
if [[ "${REMOTE_URL}" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER_REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}"
fi

has_auth() {
  gh auth status >/dev/null 2>&1 || [[ -n "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]
}

if ! has_auth; then
  echo "GitHub authentication required to open a PR from the terminal."
  echo ""
  echo "  Option A — interactive:"
  echo "    export PATH=\"\${HOME}/.local/bin:\${PATH}\" && gh auth login"
  echo ""
  echo "  Option B — token (classic PAT, repo scope):"
  echo "    export GH_TOKEN=ghp_xxxxxxxx"
  echo "    # or create ${ROOT}/.env.pr.local containing: GH_TOKEN=ghp_..."
  echo ""
  echo "Then run: npm run pr:create"
  echo ""
  echo "Browser (sign in on GitHub):"
  echo "  https://github.com/${OWNER_REPO:-anand2532/gcs}/compare/${BASE_BRANCH}...${HEAD_BRANCH}?expand=1"
  exit 1
fi

EXISTING_URL="$(GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}" gh pr list --state open --head "${HEAD_BRANCH}" --json url --jq '.[0].url // empty' 2>/dev/null || true)"
if [[ -n "${EXISTING_URL}" ]]; then
  TITLE_EXIST="$(GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}" gh pr list --state open --head "${HEAD_BRANCH}" --json title --jq '.[0].title // empty' 2>/dev/null || true)"
  printf '%s\n%s\n' "${TITLE_EXIST}" "${EXISTING_URL}"
  exit 0
fi

TITLE="feat: MAVLink communication layer and Android USB dev workflow"
BODY='## Summary
- MAVLink stack (parse/encode, UDP/TCP/USB transports, fusion, mission/commands, reconnect, heartbeat; MQTT/BLE stubs).
- Map link profile toggle + persistence; Android MainActivity focus deferral; LogBox MapLibre noise.
- USB dev: `npm run device:prep`, `android:phone` uses `--deviceId`.
- Docs/tests: `doc/communication.md`, mavlink tests, jest mocks.

## Test plan
- [ ] `npm run validate`
'

GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}" gh pr create \
  --base "${BASE_BRANCH}" \
  --head "${HEAD_BRANCH}" \
  --title "${TITLE}" \
  --body "${BODY}"

GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}" gh pr view --json url,title --jq '"\(.title)\n\(.url)"'
