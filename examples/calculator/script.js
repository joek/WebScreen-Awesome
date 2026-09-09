"use strict";
let display = "0";
let operand1 = 0;
let operation = "";
let waitingForOperand = 1;
let demoMode = 1;
let demoStep = 0;
let currentCalc = 0;
let demoCalcs = "12+5,25x4,100-37,84/4,15+27,50x2,99-11,144/12";
let displayStyle = create_style();
style_set_text_font(displayStyle, 34);
style_set_text_color(displayStyle, 0xFFFFFF);
style_set_text_align(displayStyle, 3);
style_set_width(displayStyle, 210);
let smallStyle = create_style();
style_set_text_font(smallStyle, 14);
style_set_text_color(smallStyle, 0x58A6FF);
style_set_width(smallStyle, 210);
let buttonStyle = create_style();
style_set_text_font(buttonStyle, 20);
style_set_text_color(buttonStyle, 0xFFFFFF);
style_set_text_align(buttonStyle, 2);
style_set_bg_color(buttonStyle, 0x333344);
style_set_bg_opa(buttonStyle, 255);
style_set_radius(buttonStyle, 6);
style_set_width(buttonStyle, 60);
style_set_height(buttonStyle, 36);
let opStyle = create_style();
style_set_bg_color(opStyle, 0x0066AA);
let mainDisplay = create_label(15, 65);
obj_add_style(mainDisplay, displayStyle, 0);
let opDisplay = create_label(15, 40);
obj_add_style(opDisplay, smallStyle, 0);
let status = create_label(15, 130);
obj_add_style(status, smallStyle, 0);
label_set_text(status, 'Demo - press to pause\nSerial: key("7");');
let keys = "C,+/-,%,/,7,8,9,x,4,5,6,-,1,2,3,+,0,.,=,C";
for (let i = 0; i < 20; i++) {
  let row = (i - i % 4) / 4;
  let button = create_label(248 + (i % 4) * 68, 12 + row * 44);
  obj_add_style(button, buttonStyle, 0);
  if (i % 4 === 3) obj_add_style(button, opStyle, 0);
  label_set_text(button, str_split(keys, ",", i));
}
let render = function() {
  label_set_text(mainDisplay, display);
  let pending = "";
  if (operation !== "") pending = numberToString(operand1) + " " + operation;
  label_set_text(opDisplay, pending);
};
let clear = function() {
  display = "0";
  operand1 = 0;
  operation = "";
  waitingForOperand = 1;
};
let calculate = function(value) {
  let result = value;
  if (operation === "+") result = operand1 + value;
  if (operation === "-") result = operand1 - value;
  if (operation === "x") result = operand1 * value;
  if (operation === "/") {
    if (!value) {
      clear();
      display = "Error";
      return 0;
    }
    result = operand1 / value;
  }
  if (result > 999999999 || result < -999999999) {
    clear();
    display = "Overflow";
    return 0;
  }
  // Native fixed formatting avoids floating-point remainder rounding.
  display = numberToString(toNumber(format_number(result, 4)));
  operand1 = toNumber(display);
  operation = "";
  waitingForOperand = 1;
};
let input = function(value) {
  if (value === "C") {
    clear();
  } else if (value === "+/-") {
    display = numberToString(0 - toNumber(display));
  } else if (value === "%") {
    display = numberToString(toNumber(display) / 100);
  } else if (value === "=" || value === "+" || value === "-" || value === "x" || value === "/") {
    if (operation !== "" && !waitingForOperand) calculate(toNumber(display));
    if (display !== "Error" && display !== "Overflow" && value !== "=") {
      operand1 = toNumber(display);
      operation = value;
    }
    waitingForOperand = 1;
  } else if (value === ".") {
    if (waitingForOperand) display = "0";
    waitingForOperand = 0;
    if (str_index_of(display, ".") < 0) display = display + ".";
  } else if (str_length(value) === 1 && str_index_of("0123456789", value) >= 0) {
    if (waitingForOperand || display === "0") display = "";
    waitingForOperand = 0;
    if (str_length(display) < 9) display = display + value;
  }
  render();
};
// Call /eval key("7"); in the serial console. Screen keys are labels, not touch inputs.
let key = function(value) {
  demoMode = 0;
  label_set_text(status, 'Manual: /eval key("7");\nPress: resume demo');
  input(value);
};
let demo_tick = function() {
  if (!demoMode) return 0;
  let expression = str_split(demoCalcs, ",", currentCalc);
  if (demoStep === 0) clear();
  let length = str_length(expression);
  if (demoStep < length) input(str_substring(expression, demoStep, 1));
  if (demoStep === length) input("=");
  demoStep++;
  if (demoStep > length + 3) {
    demoStep = 0;
    currentCalc = (currentCalc + 1) % 8;
  }
};
let toggle_demo = function(event) {
  demoMode = 1 - demoMode;
  demoStep = 0;
  label_set_text(status, demoMode ? "Demo - press to pause" : "Paused - use /eval key()");
};
render();
on_button("toggle_demo");
create_timer("demo_tick", 1000);
