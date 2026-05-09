#!/usr/bin/env bash
# Map phone localhost:8081 -> this machine's Metro (default port). Required for USB debugging.
set -euo pipefail
cd "$(dirname "$0")/.."
serial=$(adb devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator/ {print $1; exit}')
if [[ -z "${serial}" ]]; then
  echo "error: No physical USB device in adb." >&2
  exit 1
fi
export ANDROID_SERIAL="${serial}"
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
echo "USB ${serial}: localhost:8081 on device -> Metro on this PC (port 8081). Run: npm run start"
