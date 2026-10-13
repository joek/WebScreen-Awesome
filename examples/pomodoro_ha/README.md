# Pomodoro Home Assistant

This app keeps the default Blink animation visible while idle and exposes a Home Assistant MQTT Pomodoro controller when the timer is active.

## Setup

1. Copy the app folder to your WebScreen SD card.
2. Add the MQTT broker settings under `settings.mqtt` in `/webscreen.json`.
3. Set `settings.mqtt.enabled` to `true`.
4. Keep `blink.gif` in the same folder as the script.

Example `/webscreen.json` snippet:
```json
{
  "settings": {
    "wifi": { "ssid": "MyNetwork", "pass": "MyPassword" },
    "mqtt": {
      "enabled": true,
      "broker": "broker.hivemq.com",
      "port": 1883,
      "topic": "webscreen/pomodoro",
      "client_id": "webscreen-pomodoro",
      "username": "",
      "password": ""
    }
  },
  "script": "script.js"
}
```

The app publishes Home Assistant discovery payloads for:

- switch: `webscreen_pomodoro`
- sensor: `webscreen_pomodoro_sessions`
- sensor: `webscreen_pomodoro_remaining`
- sensor: `webscreen_pomodoro_end_time`
- button: `webscreen_pomodoro_reset`

All entities are grouped under one dedicated Home Assistant MQTT device named **WebScreen Pomodoro**.

It also subscribes to:

- `webscreen/pomodoro/set`
- `webscreen/pomodoro/reset/set` (legacy compatibility)

It publishes state to:

- `webscreen/pomodoro/state`
- `webscreen/pomodoro/sessions/state`
- `webscreen/pomodoro/remaining/state`
- `webscreen/pomodoro/end_time/state`
- `webscreen/pomodoro/availability`

Control payloads on `webscreen/pomodoro/set`:

- `ON` / `OFF` to start or stop
- `RESET` to reset the current session

MQTT retain behavior:

- Discovery payloads (`homeassistant/.../config`) should be retained by the broker if your firmware publish API supports retained publish for discovery topics.
- Command entities (switch/button) are configured with `retain: false` so Home Assistant does not retain control commands.
- Sensor entity configs do not include a `retain` option.

Note: the configured MQTT topic is treated as the base topic. Leading/trailing `/` are trimmed, so `webscreen/pomodoro`, `/webscreen/pomodoro`, and `webscreen/pomodoro/` all resolve to the same topics.

The default idle screen is the same Blink GIF as the Blink example. When the timer is running, an overlay shows the remaining time until the session ends. Once the countdown expires, the timer switches off and the default GIF screen is restored.
