"use strict";
let location = "London";
let config = sd_read_file("/webscreen.json");
if (typeof config === "string") {
  let value = parse_json_value(config, "location");
  if (value !== "") location = str_substring(value, 0, 60);
}
// Encode spaces and accept a single ASCII city/airport name or coordinates.
let cityPath = "";
let validLocation = 1;
let allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,_";
for (let i = 0; i < str_length(location); i++) {
  let c = str_substring(location, i, 1);
  if (c === " ") cityPath = cityPath + "%20";
  else if (str_index_of(allowed, c) >= 0) cityPath = cityPath + c;
  else validLocation = 0;
}
let titleStyle = create_style();
style_set_text_font(titleStyle, 28);
style_set_text_color(titleStyle, 0xFFFFFF);
style_set_text_align(titleStyle, 2);
style_set_width(titleStyle, 500);
let tempStyle = create_style();
style_set_text_font(tempStyle, 48);
style_set_text_color(tempStyle, 0x00BFFF);
style_set_text_align(tempStyle, 2);
style_set_width(tempStyle, 500);
let descStyle = create_style();
style_set_text_font(descStyle, 20);
style_set_text_color(descStyle, 0xFFD700);
style_set_text_align(descStyle, 2);
style_set_width(descStyle, 500);
let locLabel = create_label(18, 15);
obj_add_style(locLabel, titleStyle, 0);
label_set_text(locLabel, location);
let tempLabel = create_label(18, 60);
obj_add_style(tempLabel, tempStyle, 0);
label_set_text(tempLabel, "-- C");
let descLabel = create_label(18, 115);
obj_add_style(descLabel, descStyle, 0);
label_set_text(descLabel, "Waiting for WiFi");
let detailsLabel = create_label(18, 150);
obj_add_style(detailsLabel, descStyle, 0);
label_set_text(detailsLabel, "");
let statusLabel = create_label(18, 200);
let lastAttempt = 0;
let retryMs = 0;
let fetch_weather = function() {
  if (!validLocation) {
    label_set_text(statusLabel, "Use an ASCII city name or airport code in location");
    return 0;
  }
  if (!wifi_status()) {
    label_set_text(statusLabel, "Offline - waiting for WiFi");
    retryMs = 0;
    return 0;
  }
  let now = get_millis();
  let elapsed = now - lastAttempt;
  if (elapsed < 0) elapsed = elapsed + 4294967296;
  if (elapsed < retryMs) return 0;
  lastAttempt = now;
  retryMs = 60000;
  label_set_text(statusLabel, "Updating weather...");
  // parse_json_value reads top-level keys only. Use wttr's small text format
  // instead of downloading and repeatedly parsing its large forecast JSON.
  let response = http_get("https://wttr.in/" + cityPath + "?m&format=%t%7C%C%7C%h%7C%w");
  if (typeof response !== "string" || str_split_count(response, "|") !== 4) {
    label_set_text(statusLabel, "Weather unavailable - retry in 60s");
    return 0;
  }
  let temperature = str_split(response, "|", 0);
  let condition = str_split(response, "|", 1);
  let humidity = str_split(response, "|", 2);
  let wind = str_split(response, "|", 3);
  if (temperature === "" || condition === "" || str_length(temperature) > 16) {
    label_set_text(statusLabel, "Invalid weather response - retry in 60s");
    return 0;
  }
  label_set_text(tempLabel, format_number(toNumber(temperature), 0) + " C");
  label_set_text(descLabel, str_substring(condition, 0, 48));
  let details = "Humidity " + str_substring(humidity, 0, 10);
  details = details + " | Wind " + str_substring(wind, 0, 20);
  label_set_text(detailsLabel, details);
  label_set_text(statusLabel, "Updated - refresh every 10 minutes");
  retryMs = 600000;
};
create_timer("fetch_weather", 1000);
