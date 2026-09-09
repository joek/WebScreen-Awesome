# Digital Clock

NTP clock in 12-hour format with seconds and AM/PM.

## Usage

Configure Wi-Fi and `system.timezone` in `/webscreen.json`. The screen appears immediately, shows a synchronization status, and begins displaying time once firmware NTP is ready.

## Behavior and Limits

No HTTP API or PEM certificate is needed. `script_test.js` is an optional connectivity/display diagnostic that also works offline.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
