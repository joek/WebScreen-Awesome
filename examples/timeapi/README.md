# NTP Clock / Cat Clock

Display local firmware NTP time in 12-hour format. Despite the directory name, these scripts do not call an external time API.

## Usage

Configure Wi-Fi and `system.timezone`. `script.js` is the plain clock. To show the cat animation and date, install `script_with_gif.js` as your selected script and copy `cat.gif` to the SD root.

## Behavior and Limits

Both variants start immediately and recover when NTP synchronization becomes available. Existing PEM files are not required by either script.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
