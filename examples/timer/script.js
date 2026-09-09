"use strict";

print("Starting Timer...");

let duration = 300;
let config = sd_read_file("/webscreen.json");
if (typeof config === "string") {
  let value = toNumber(parse_json_value(config, "duration_seconds"));
  if (value >= 1 && value <= 86400) duration = value - value % 1;
}
let remaining = duration;
let running = 1;

let bigStyle = create_style();
style_set_text_font(bigStyle, 48);
style_set_text_color(bigStyle, 0xFFFFFF);
style_set_text_align(bigStyle, 2);

let smallStyle = create_style();
style_set_text_font(smallStyle, 28);
style_set_text_color(smallStyle, 0x00FF00);
style_set_text_align(smallStyle, 2);

style_set_width(bigStyle, 500);
style_set_width(smallStyle, 500);
let timerLabel = create_label(18, 75);
obj_add_style(timerLabel, bigStyle, 0);

let statusLabel = create_label(18, 145);
obj_add_style(statusLabel, smallStyle, 0);
label_set_text(statusLabel, "Running");

let previousMs = get_millis();
let remainderMs = 0;
let render_timer = function() {
  let minutes = (remaining - remaining % 60) / 60;
  label_set_text(timerLabel, pad_number(minutes, 2) + ":" + pad_number(remaining % 60, 2));
  label_set_text(statusLabel, remaining === 0 ? "Done! Press to restart" : (running ? "Running - press to pause" : "Paused - press to resume"));
};
let timer_tick = function() {
  let now = get_millis();
  let delta = now - previousMs;
  if (delta < 0) delta = delta + 4294967296;
  previousMs = now;
  if (!running) return 0;
  remainderMs = remainderMs + delta;
  let seconds = (remainderMs - remainderMs % 1000) / 1000;
  if (seconds === 0) return 0;
  remainderMs = remainderMs % 1000;
  remaining = remaining - seconds;
  if (remaining <= 0) {
    remaining = 0;
    running = 0;
  }
  render_timer();
};
let timer_button = function(event) {
  timer_tick();
  if (remaining === 0) {
    remaining = duration;
    remainderMs = 0;
    running = 1;
  } else {
    running = 1 - running;
  }
  previousMs = get_millis();
  render_timer();
};
render_timer();
on_button("timer_button");
create_timer("timer_tick", 250);
