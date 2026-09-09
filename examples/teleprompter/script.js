"use strict";
let speech = sd_read_file("/speech.txt");
if (typeof speech !== "string" || speech === "") {
  speech = "Welcome to WebScreen Teleprompter.\nCopy your speech to /speech.txt on the SD card.\nPress the hardware button to pause or resume.\nThe text loops after the last line.";
}
// Keep at most 32 KB in the Elk arena; LVGL receives only five short rows.
let truncated = str_length(speech) > 32768;
speech = str_substring(speech, 0, 32768);
let offset = 0;
let currentY = 35;
let paused = 0;
let previousMs = get_millis();
let remainderMs = 0;
let rowStyle = create_style();
style_set_text_font(rowStyle, 20);
style_set_text_color(rowStyle, 0xFFFFFF);
style_set_width(rowStyle, 496);
style_set_height(rowStyle, 26);
let r0 = create_label(20, 35);
let r1 = create_label(20, 70);
let r2 = create_label(20, 105);
let r3 = create_label(20, 140);
let r4 = create_label(20, 175);
obj_add_style(r0, rowStyle, 0);
obj_add_style(r1, rowStyle, 0);
obj_add_style(r2, rowStyle, 0);
obj_add_style(r3, rowStyle, 0);
obj_add_style(r4, rowStyle, 0);
// Header/footer are created last so scrolling rows pass underneath them.
let mask = draw_rect(0, 0, 536, 33, 0x000000);
let footerMask = draw_rect(0, 210, 536, 30, 0x000000);
let maskStyle = create_style();
style_set_border_width(maskStyle, 0);
style_set_radius(maskStyle, 0);
obj_add_style(mask, maskStyle, 0);
obj_add_style(footerMask, maskStyle, 0);
obj_clear_flag(mask, 16);
obj_clear_flag(footerMask, 16);
let title = create_label(20, 6);
label_set_text(title, "TELEPROMPTER - press to pause");
let footer = create_label(20, 215);
let next_line = function() {
  if (offset >= str_length(speech)) offset = 0;
  let text = str_substring(speech, offset, 34);
  let count = str_length(text);
  let newline = str_index_of(text, "\n");
  let advance = count;
  if (newline >= 0) {
    count = newline;
    advance = count + 1;
  } else if (offset + count < str_length(speech)) {
    for (let i = count - 1; i >= 15; i--) {
      if (str_substring(text, i, 1) === " ") {
        count = i;
        advance = i + 1;
        break;
      }
    }
  }
  offset = offset + advance;
  return str_substring(text, 0, count);
};
let text0 = next_line();
let text1 = next_line();
let text2 = next_line();
let text3 = next_line();
let text4 = next_line();
let render = function() {
  label_set_text(r0, text0);
  label_set_text(r1, text1);
  label_set_text(r2, text2);
  label_set_text(r3, text3);
  label_set_text(r4, text4);
  let status = paused ? "PAUSED" : "Scrolling /speech.txt";
  if (truncated) status = status + " (first 32 KB)";
  label_set_text(footer, status);
};
let scroll_tick = function() {
  let now = get_millis();
  let delta = now - previousMs;
  if (delta < 0) delta = delta + 4294967296;
  previousMs = now;
  if (paused) return 0;
  // A long system stall pauses scrolling instead of skipping unread speech.
  if (delta > 250) delta = 250;
  remainderMs = remainderMs + delta;
  let pixels = (remainderMs - remainderMs % 25) / 25;
  remainderMs = remainderMs % 25;
  currentY = currentY - pixels;
  if (currentY <= 0) {
    currentY = currentY + 35;
    text0 = text1;
    text1 = text2;
    text2 = text3;
    text3 = text4;
    text4 = next_line();
    render();
  }
  move_obj(r0, 20, currentY);
  move_obj(r1, 20, currentY + 35);
  move_obj(r2, 20, currentY + 70);
  move_obj(r3, 20, currentY + 105);
  move_obj(r4, 20, currentY + 140);
};
let pause_speech = function(event) {
  paused = 1 - paused;
  previousMs = get_millis();
  render();
};
render();
on_button("pause_speech");
create_timer("scroll_tick", 50);
