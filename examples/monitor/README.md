# System Monitor

Display Wi-Fi state, IP address, uptime, free internal heap, and JavaScript arena usage.

## Usage

Load the script; no configuration or network connection is required. Readings refresh once per second. Memory values come from firmware `mem_info()` rather than generated demo data.

## Behavior and Limits

Uptime is milliseconds since device boot converted to hours/minutes/seconds. The underlying 32-bit `get_millis()` wraps after about 49.7 days.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
