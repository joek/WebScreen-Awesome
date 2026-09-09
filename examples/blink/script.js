"use strict";

// The GIF API returns null on success too; decoder errors go to the serial log.
print("Loading /blink.gif from SD...");
show_gif_from_sd("/blink.gif", 173, 65);
