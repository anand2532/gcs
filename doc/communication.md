# Communication layer (MAVLink)

Production-oriented UAV link stack under `src/communication/`.

## Layout

- **MAVLink v2** — `communication/mavlink/` — CRC, framing, payload decode, outbound encode.
- **Telemetry fusion** — `communication/telemetry/` — MAVLink → `TelemetryFrame`, decimated publish.
- **Commands** — `communication/commands/` — `MavlinkCommandPipeline`, ACK correlation, retries.
- **Mission** — `communication/mission/` — `MissionTransferCoordinator` phase tracking.
- **Watchdog** — `communication/watchdog/` — FC heartbeat staleness (distinct from bus freshness watchdog).
- **Reconnect** — `communication/reconnect/` — backoff scheduler for UDP restart.
- **Transports** — `communication/transports/` — UDP (live), TCP client, USB stub, Bluetooth/MQTT stubs.

## Integration

- **Ingress**: `MavlinkTelemetrySource` binds UDP (default `14550`), parses streams, publishes `TelemetryFrame` on `telemetryBus` (same contract as simulation).
- **UI**: Map screen **SIM / UDP** toggle (`LinkProfileStore`) attaches simulation vs MAVLink source.
- **Telemetry Terminal**: `mavlinkTapBridge` feeds decoded packet summaries into the terminal ring buffer.
- **Commands**: `mavlinkTelemetrySource.commands` exposes `MavlinkCommandPipeline` once UDP peer exists (reply address inferred from last datagram).

## Transports

- **UDP** — implemented (`react-native-udp`).
- **TCP** — implemented (`react-native-tcp-socket`); use `TcpTransport` for companion TCP bridges.
- **USB serial** — stub; requires Android native USB-serial module and permissions.
- **Bluetooth** — stub; RFCOMM/BLE TBD.
- **MQTT** — stub; topic/schema TBD.

## Performance notes

- Parsing runs on the JS thread; ingress uses a **bounded** byte arena with drop counters.
- Telemetry is **decimated** before Zustand (`publishHz`, default 20 Hz).
- For sustained extreme MAVLink rates, consider moving CRC/framing to native code.

## Testing

- CRC/framing unit tests: `__tests__/mavlinkParse.test.ts`
- SITL: point ArduPilot UDP output at device IP, bind port `14550`, select **UDP**, tap **Listen**.
