#!/usr/bin/env bash
# Full local gate + optional USB install (matches what maintainers run before shipping RN/Android changes).
# Metro must already be listening on 8081 for the installed app to load JS (or run npm run start in another terminal).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

npm run validate:all

serial="$(adb devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator/ {print $1; exit}')"
if [[ -z "${serial}" ]]; then
  echo ""
  echo "android-devloop: no physical USB device — APK install skipped."
  echo "  Plug in the phone (USB debugging). To build only, you already ran validate:all."
  exit 0
fi

export ANDROID_SERIAL="${serial}"
echo ""
echo "android-devloop: USB device ${serial} — adb reverse + installDebug"
npm run device:prep
npm run android:phone
