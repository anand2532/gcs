#!/usr/bin/env bash
# Physical USB device only + Metro on host port 8082 (use npm run start:8082).
set -euo pipefail
cd "$(dirname "$0")/.."
serial=$(adb devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator/ {print $1; exit}')
if [[ -z "${serial}" ]]; then
  echo "error: No physical USB device in adb." >&2
  exit 1
fi
export ANDROID_SERIAL="${serial}"
echo "USB ${serial}: Metro expected on this PC port 8082 (npm run start:8082)."
npm run device:prep:8082
exec npx react-native run-android --no-packager --port 8082
