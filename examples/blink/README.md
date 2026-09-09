# Blink

Display the included `blink.gif` from the SD card.

## Usage

Copy `script.js` and `blink.gif` to the card root, then load the script. No Wi-Fi is needed. If the animation does not appear, check the serial console for the filename and decoder error.

## Behavior and Limits

Keep the asset named `/blink.gif`. The firmware reports GIF decode/allocation failures in the serial console.

See [Elk app development](../../docs/ELK_APPS.md) for installation, API constraints, and tests.
