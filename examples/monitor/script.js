"use strict";

print("Starting Monitor...");

let titleStyle = create_style();
style_set_text_font(titleStyle, 28);
style_set_text_color(titleStyle, 0xFFFFFF);
style_set_text_align(titleStyle, 2);

let labelStyle = create_style();
style_set_text_font(labelStyle, 20);
style_set_text_color(labelStyle, 0x00BFFF);

let valueStyle = create_style();
style_set_text_font(valueStyle, 20);
style_set_text_color(valueStyle, 0xFFFFFF);

let title = create_label(30, 15);
obj_add_style(title, titleStyle, 0);
label_set_text(title, "System Monitor");

let wifiLbl = create_label(30, 60);
obj_add_style(wifiLbl, labelStyle, 0);
label_set_text(wifiLbl, "WiFi:");

let wifiVal = create_label(120, 60);
obj_add_style(wifiVal, valueStyle, 0);

let ipLbl = create_label(30, 90);
obj_add_style(ipLbl, labelStyle, 0);
label_set_text(ipLbl, "IP:");

let ipVal = create_label(120, 90);
obj_add_style(ipVal, valueStyle, 0);

let uptimeLbl = create_label(30, 120);
obj_add_style(uptimeLbl, labelStyle, 0);
label_set_text(uptimeLbl, "Uptime:");

let uptimeVal = create_label(120, 120);
obj_add_style(uptimeVal, valueStyle, 0);

let uptime = 0;
let memoryVal = create_label(30, 160);
obj_add_style(memoryVal, valueStyle, 0);
let jsVal = create_label(30, 190);
obj_add_style(jsVal, valueStyle, 0);

let update_stats = function() {
  uptime = get_millis() / 1000;
  uptime = uptime - uptime % 1;
  let memory = mem_info();
  let heap = parse_json_value(memory, "heap_free");
  let used = parse_json_value(memory, "js_used");
  label_set_text(memoryVal, "Free heap: " + format_number(toNumber(heap) / 1024, 1) + " KB");
  label_set_text(jsVal, "JS used: " + format_number(toNumber(used) / 1024, 1) + " KB");

  if (wifi_status()) {
    label_set_text(wifiVal, "Connected");
    label_set_text(ipVal, wifi_get_ip());
  } else {
    label_set_text(wifiVal, "Disconnected");
    label_set_text(ipVal, "-");
  }

  let h = uptime / 3600;
  h = h - (h % 1);
  let m = (uptime - h * 3600) / 60;
  m = m - (m % 1);
  let s = uptime % 60;

  if (h > 0) {
    label_set_text(uptimeVal, numberToString(h) + "h " + numberToString(m) + "m");
  } else if (m > 0) {
    label_set_text(uptimeVal, numberToString(m) + "m " + numberToString(s) + "s");
  } else {
    label_set_text(uptimeVal, numberToString(s) + "s");
  }
};

update_stats();
print("Monitor ready!");
create_timer("update_stats", 1000);
