# HTTP Connectivity

Measure a complete HTTP request to the Microsoft connectivity-test endpoint, including connection and response time. This is not ICMP ping.

## Usage

Requires Wi-Fi. A request runs about every five seconds. The screen shows the last four results, eight history bars, loss percentage, and minimum/average/maximum latency.

## Behavior and Limits

Only the expected `Microsoft Connect Test` body counts as success, so captive portals and firmware error strings are rejected. Wi-Fi reconnects automatically. Bars reuse existing styles, preventing exhaustion of the 32-style registry. The native HTTP call is synchronous and may delay the UI on a slow network.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
