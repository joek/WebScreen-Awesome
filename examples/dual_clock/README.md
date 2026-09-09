# Dual Clock

Show local firmware time and a second zone with a configurable relative offset.

## Usage

Configure `city1`, `city2`, and `offset_diff` in `/webscreen.json`. For example, `"city1":"Tokyo", "city2":"Buenos Aires", "offset_diff":-12`. Set the first zone with `system.timezone`.

## Behavior and Limits

Offsets from -24 to +24 hours are accepted, including fractional hours such as 5.5 or 5.75. Both clocks show placeholders until NTP synchronization. The offset is fixed; daylight-saving changes require configuration updates. No certificate or HTTP request is used.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
