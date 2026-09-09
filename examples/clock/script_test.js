"use strict";
// Offline-friendly display and connectivity check.
let style = create_style();
style_set_text_font(style, 28);
style_set_text_color(style, 0xFFFFFF);
style_set_width(style, 500);
style_set_text_align(style, 2);
let label = create_label(18, 90);
obj_add_style(label, style, 0);
let check_status = function() {
  label_set_text(label, wifi_status() ? "WiFi OK: " + wifi_get_ip() : "Display OK - waiting for WiFi");
};
check_status();
create_timer("check_status", 2000);
