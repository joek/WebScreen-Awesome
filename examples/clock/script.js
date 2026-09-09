"use strict";

print("Starting Digital Clock...");

let timeStyle = create_style();
style_set_text_font(timeStyle, 48);
style_set_text_color(timeStyle, 0xFFFFFF);
style_set_text_align(timeStyle, 2);

let smallStyle = create_style();
style_set_text_font(smallStyle, 28);
style_set_text_color(smallStyle, 0x00BFFF);
style_set_text_align(smallStyle, 2);

style_set_width(timeStyle, 500);
style_set_width(smallStyle, 500);
let timeLabel = create_label(18, 70);
obj_add_style(timeLabel, timeStyle, 0);

let ampmLabel = create_label(18, 140);
obj_add_style(ampmLabel, smallStyle, 0);

let padZero = function(n) {
  if (n < 10) return "0" + numberToString(n);
  return numberToString(n);
};

let update_clock = function() {
  let hour = get_hours();
  let minute = get_minutes();
  let seconds = get_seconds();

  if (!ntp_synced() || hour < 0) {
    label_set_text(timeLabel, "--:--:--");
    label_set_text(ampmLabel, wifi_status() ? "Syncing time..." : "Waiting for WiFi");
    return 0;
  }

  let h = hour;
  let ap = "AM";
  if (hour === 0) {
    h = 12;
  } else if (hour === 12) {
    ap = "PM";
  } else if (hour > 12) {
    h = hour - 12;
    ap = "PM";
  }

  label_set_text(timeLabel, padZero(h) + ":" + padZero(minute) + ":" + padZero(seconds));
  label_set_text(ampmLabel, ap);
};

update_clock();
print("Clock ready!");
create_timer("update_clock", 1000);
