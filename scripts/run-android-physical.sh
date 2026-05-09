#!/usr/bin/env bash
# Build and install the debug app on a physical USB device only (never an emulator).
set -euo pipefail
cd "$(dirname "$0")/.."
serial=$(adb devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator/ {print $1; exit}')
if [[ -z "${serial}" ]]; then
  echo "error: No physical USB device in adb." >&2
  echo "  • Plug in the phone, enable Developer options → USB debugging, authorize this PC." >&2
  echo "  • Run: adb devices — you should see a serial that is NOT emulator-*." >&2
  echo "  • Close the Android emulator if only the simulator appears." >&2
  exit 1
fi
echo "Installing on physical device only: ${serial}"
echo "(Close the Android emulator if you do not want updates there.)"
# Gradle installDebug otherwise pushes to every adb device; pin default adb target.
export ANDROID_SERIAL="${serial}"
# Use --deviceId: RN CLI's runOnSpecificDevice reads `deviceId`, not `device` (so --device is a no-op).
exec npx react-native run-android --no-packager --deviceId "${serial}"
