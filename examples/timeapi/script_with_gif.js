"use strict";

print("Starting Clock with Cat...");

let months = "JanFebMarAprMayJunJulAugSepOctNovDec";

let dateStyle = create_style();
style_set_text_font(dateStyle, 34);
style_set_text_color(dateStyle, 0x72F749);
style_set_text_align(dateStyle, 2);

style_set_width(dateStyle, 326);
let dateLabel = create_label(205, 130);
obj_add_style(dateLabel, dateStyle, 0);

let timeStyle = create_style();
style_set_text_font(timeStyle, 34);
style_set_text_color(timeStyle, 0xFFFFFF);
style_set_text_align(timeStyle, 2);

style_set_width(timeStyle, 326);
let timeLabel = create_label(205, 65);
obj_add_style(timeLabel, timeStyle, 0);

show_gif_from_sd("/cat.gif", 0, 0);

let padZero = function(num) {
  if (num < 10) {
    return "0" + numberToString(num);
  }
  return numberToString(num);
};

let update_clock = function() {
  let hour = get_hours();
  let minute = get_minutes();
  let seconds = get_seconds();
  let year = get_year();
  let month = get_month();
  let day = get_day();

  if (!ntp_synced() || hour < 0) {
    label_set_text(timeLabel, "--:--:--");
    label_set_text(dateLabel, wifi_status() ? "Syncing time..." : "Waiting for WiFi");
    return 0;
  }

  let displayHour = hour;
  let ampm = "AM";

  if (hour === 0) {
    displayHour = 12;
  } else if (hour === 12) {
    ampm = "PM";
  } else if (hour > 12) {
    displayHour = hour - 12;
    ampm = "PM";
  }

  label_set_text(timeLabel, padZero(displayHour) + ":" + padZero(minute) + ":" + padZero(seconds) + " " + ampm);

  let monthName = str_substring(months, (month - 1) * 3, 3);
  label_set_text(dateLabel, monthName + " " + numberToString(day) + ", " + numberToString(year));
};

update_clock();

print("Clock with Cat ready!");
create_timer("update_clock", 1000);
