"use strict";

print("Starting Pomodoro...");

let WORK_TIME = 25 * 60;
let BREAK_TIME = 5 * 60;

let timeRemaining = WORK_TIME;
let isWork = 1;
let sessions = 0;

let bigStyle = create_style();
style_set_text_font(bigStyle, 48);
style_set_text_color(bigStyle, 0xFFFFFF);
style_set_text_align(bigStyle, 2);

let smallStyle = create_style();
style_set_text_font(smallStyle, 28);
style_set_text_color(smallStyle, 0xe94560);
style_set_text_align(smallStyle, 2);

style_set_width(bigStyle, 500);
style_set_width(smallStyle, 500);
let timerLabel = create_label(18, 75);
obj_add_style(timerLabel, bigStyle, 0);
label_set_text(timerLabel, "25:00");

let statusLabel = create_label(18, 145);
obj_add_style(statusLabel, smallStyle, 0);
label_set_text(statusLabel, "FOCUS");

let running = 1;
let previousMs = get_millis();
let phaseMs = WORK_TIME * 1000;
let render_timer = function() {
  timeRemaining = (phaseMs + 999) / 1000;
  timeRemaining = timeRemaining - timeRemaining % 1;
  let minutes = (timeRemaining - timeRemaining % 60) / 60;
  label_set_text(timerLabel, pad_number(minutes, 2) + ":" + pad_number(timeRemaining % 60, 2));
  let phase = isWork ? "FOCUS" : "BREAK";
  if (!running) phase = "PAUSED";
  label_set_text(statusLabel, phase + " | Sessions: " + numberToString(sessions));
};
let timer_tick = function() {
  let now = get_millis();
  let delta = now - previousMs;
  if (delta < 0) delta = delta + 4294967296;
  previousMs = now;
  if (!running) return 0;
  phaseMs = phaseMs - delta;
  // Skip complete cycles after a long stall without an unbounded catch-up loop.
  let cycleMs = (WORK_TIME + BREAK_TIME) * 1000;
  if (phaseMs <= -cycleMs) {
    let cycles = (0 - phaseMs) / cycleMs;
    cycles = cycles - cycles % 1;
    sessions = sessions + cycles;
    phaseMs = phaseMs + cycles * cycleMs;
  }
  for (let i = 0; i < 2 && phaseMs <= 0; i++) {
    if (isWork) {
      sessions++;
      isWork = 0;
      phaseMs = phaseMs + BREAK_TIME * 1000;
    } else {
      isWork = 1;
      phaseMs = phaseMs + WORK_TIME * 1000;
    }
  }
  render_timer();
};
let timer_button = function(event) {
  timer_tick();
  running = 1 - running;
  previousMs = get_millis();
  render_timer();
};
render_timer();
on_button("timer_button");
create_timer("timer_tick", 1000);
