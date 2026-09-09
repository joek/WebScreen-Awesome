# Weather

Display current temperature, conditions, humidity, and wind using wttr.in.

## Usage

Set top-level `location` in `/webscreen.json`, for example `"New York"`, `"Tokyo"`, or an airport code. ASCII names, spaces, hyphens, periods, underscores, and coordinates are supported. Configure Wi-Fi separately.

## Behavior and Limits

The app starts immediately, waits for Wi-Fi, and refreshes successful readings every ten minutes. Failed or malformed responses retry after one minute without replacing the last reading. It uses [wttr.in’s compact text format](https://github.com/chubin/wttr.in#one-line-output), avoiding unsupported nested JSON lookups. HTTP is synchronous; slow requests may temporarily delay the display.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
