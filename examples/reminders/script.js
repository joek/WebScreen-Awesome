"use strict";

print("Starting Reminders...");

let rem1 = "09:00 Team standup";
let rem2 = "10:30 Review PRs";
let rem3 = "12:00 Lunch break";
let rem4 = "14:00 Client call";

let done1 = 0;
let done2 = 0;
let done3 = 0;
let done4 = 0;

let hour = 0;
let minute = 0;
let dayKey = "";

let titleStyle = create_style();
style_set_text_font(titleStyle, 20);
style_set_text_color(titleStyle, 0x16a34a);

let itemStyle = create_style();
style_set_text_font(itemStyle, 20);
style_set_text_color(itemStyle, 0x14532d);

let timeStyle = create_style();
style_set_text_font(timeStyle, 14);
style_set_text_color(timeStyle, 0x888888);

let title = create_label(30, 15);
obj_add_style(title, titleStyle, 0);
label_set_text(title, "REMINDERS");

let clock = create_label(430, 15);
obj_add_style(clock, timeStyle, 0);
label_set_text(clock, "--:--");

let line1 = create_label(30, 50);
obj_add_style(line1, itemStyle, 0);
label_set_text(line1, "[ ] " + rem1);

let line2 = create_label(30, 85);
obj_add_style(line2, itemStyle, 0);
label_set_text(line2, "[ ] " + rem2);

let line3 = create_label(30, 120);
obj_add_style(line3, itemStyle, 0);
label_set_text(line3, "[ ] " + rem3);

let line4 = create_label(30, 155);
obj_add_style(line4, itemStyle, 0);
label_set_text(line4, "[ ] " + rem4);

let status = create_label(30, 200);
obj_add_style(status, timeStyle, 0);
label_set_text(status, "4 pending");

let render_item = function(handle, text, done, due) {
  let prefix = "[ ] ";
  if (due) prefix = "[!] ";
  if (done) prefix = "[X] ";
  label_set_text(handle, prefix + text);
};
let update_tick = function() {
  if (!ntp_synced()) {
    label_set_text(clock, "--:--");
    label_set_text(status, "Waiting for NTP time");
    return 0;
  }
  let today = format_time("%Y-%m-%d");
  if (today !== dayKey) {
    dayKey = today;
    done1 = 0;
    done2 = 0;
    done3 = 0;
    done4 = 0;
  }
  hour = get_hours();
  minute = get_minutes();
  label_set_text(clock, pad_number(hour, 2) + ":" + pad_number(minute, 2));
  let t = hour * 100 + minute;
  render_item(line1, rem1, done1, t >= 900);
  render_item(line2, rem2, done2, t >= 1030);
  render_item(line3, rem3, done3, t >= 1200);
  render_item(line4, rem4, done4, t >= 1400);
  let pending = 4 - done1 - done2 - done3 - done4;
  label_set_text(status, numberToString(pending) + " pending - press to acknowledge due item");
};
let acknowledge = function(event) {
  if (!ntp_synced()) return 0;
  update_tick();
  let t = hour * 100 + minute;
  if (!done1 && t >= 900) done1 = 1;
  else if (!done2 && t >= 1030) done2 = 1;
  else if (!done3 && t >= 1200) done3 = 1;
  else if (!done4 && t >= 1400) done4 = 1;
  update_tick();
};
update_tick();
on_button("acknowledge");
create_timer("update_tick", 1000);
