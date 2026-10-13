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
- number: `webscreen_pomodoro_sessions`
- sensor: `webscreen_pomodoro_remaining`
- sensor: `webscreen_pomodoro_end_time`
- button: `webscreen_pomodoro_reset`

It also subscribes to:

- `webscreen/pomodoro/set`
- `webscreen/pomodoro/reset/set`

The default idle screen is the same Blink GIF as the Blink example. When the timer is running, an overlay shows the remaining time until the session ends. Once the countdown expires, the timer switches off and the default GIF screen is restored.
