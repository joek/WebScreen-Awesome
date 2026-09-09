"use strict";

print("Starting Dual Clock...");

let config = sd_read_file("/webscreen.json");
let city1 = "Local";
let city2 = "Second zone";
let offsetDiff = 0;

if (typeof config === "string" && config !== "") {
  let c1 = parse_json_value(config, "city1");
  let c2 = parse_json_value(config, "city2");
  let od = parse_json_value(config, "offset_diff");
  if (c1 !== "") city1 = str_substring(c1, 0, 48);
  if (c2 !== "") city2 = str_substring(c2, 0, 48);
  if (od !== "") offsetDiff = toNumber(od);
  if (offsetDiff < -24 || offsetDiff > 24) offsetDiff = 0;
}

let timeStyle = create_style();
style_set_text_font(timeStyle, 34);
style_set_text_color(timeStyle, 0xFFFFFF);
style_set_text_align(timeStyle, 2);

let cityStyle = create_style();
style_set_text_font(cityStyle, 20);
style_set_text_color(cityStyle, 0x00BFFF);
style_set_text_align(cityStyle, 2);

style_set_width(timeStyle, 240);
style_set_width(cityStyle, 240);
let lbl1 = create_label(14, 60);
obj_add_style(lbl1, cityStyle, 0);
label_set_text(lbl1, city1);

let time1 = create_label(14, 100);
obj_add_style(time1, timeStyle, 0);

let lbl2 = create_label(282, 60);
obj_add_style(lbl2, cityStyle, 0);
label_set_text(lbl2, city2);

let time2 = create_label(282, 100);
obj_add_style(time2, timeStyle, 0);

let padZero = function(n) {
  if (n < 10) return "0" + numberToString(n);
  return numberToString(n);
};

let update_clock = function() {
  let h1 = get_hours();
  let m1 = get_minutes();
  let s1 = get_seconds();

  if (!ntp_synced() || h1 < 0) {
    label_set_text(time1, "--:--:--");
    label_set_text(time2, "--:--:--");
    return 0;
  }

  // Calculate second timezone
  let total = (h1 * 60 + m1 + offsetDiff * 60 + 1440) % 1440;
  total = total - (total % 1);
  let h2 = (total - total % 60) / 60;
  let m2 = total % 60;

  label_set_text(time1, padZero(h1) + ":" + padZero(m1) + ":" + padZero(s1));
  label_set_text(time2, padZero(h2) + ":" + padZero(m2) + ":" + padZero(s1));
};

update_clock();
print("Dual Clock ready!");
create_timer("update_clock", 1000);
