"use strict";

print("Starting Notification Center...");

// Notification state
let notifCount = 0;
let currentNotif = 0;
let demoIndex = 0;

// Demo notifications
let demoTitles = "New Message,Calendar Reminder,Weather Alert,System Update,Email Received";
let demoMessages = "John: Hey are you free tonight?,Meeting in 30 minutes,Rain expected this afternoon,Firmware v2.1 available,3 new emails from work";
let demoSources = "Messages,Calendar,Weather,System,Email";
let demoColors = "0x00BFFF,0xFFAA00,0x00FF00,0xFF6600,0xFF4444";

// Get value from comma-separated string
let getItem = function(text, index) {
  let field = str_split(text, ",", index);
  if (typeof field !== "string") return "";
  return field;
};

// Create styles
let headerStyle = create_style();
style_set_text_font(headerStyle, 20);
style_set_text_color(headerStyle, 0xFFFFFF);
style_set_text_align(headerStyle, 1);

let countStyle = create_style();
style_set_text_font(countStyle, 14);
style_set_text_color(countStyle, 0x888888);
style_set_text_align(countStyle, 3);

let sourceStyle = create_style();
style_set_text_font(sourceStyle, 14);
style_set_text_color(sourceStyle, 0x00BFFF);
style_set_text_align(sourceStyle, 1);

let titleStyle = create_style();
style_set_text_font(titleStyle, 28);
style_set_text_color(titleStyle, 0xFFFFFF);
style_set_text_align(titleStyle, 1);

let messageStyle = create_style();
style_set_text_font(messageStyle, 20);
style_set_text_color(messageStyle, 0xAAAAAA);
style_set_text_align(messageStyle, 1);

let timeStyle = create_style();
style_set_text_font(timeStyle, 14);
style_set_text_color(timeStyle, 0x666666);
style_set_text_align(timeStyle, 1);

let emptyStyle = create_style();
style_set_text_font(emptyStyle, 28);
style_set_text_color(emptyStyle, 0x666666);
style_set_text_align(emptyStyle, 2);

let navStyle = create_style();
style_set_text_font(navStyle, 20);
style_set_text_color(navStyle, 0x888888);
style_set_text_align(navStyle, 2);

// Header bar
let headerLabel = create_label(20, 15);
obj_add_style(headerLabel, headerStyle, 0);
label_set_text(headerLabel, "Notifications - Demo");

let countLabel = create_label(450, 15);
obj_add_style(countLabel, countStyle, 0);
label_set_text(countLabel, "0 new");

// Notification card background
let cardBg = create_label(20, 50);
let cardStyle = create_style();
style_set_bg_color(cardStyle, 0x222233);
style_set_bg_opa(cardStyle, 255);
style_set_width(cardStyle, 496);
style_set_height(cardStyle, 130);
style_set_radius(cardStyle, 12);
obj_add_style(cardBg, cardStyle, 0);
label_set_text(cardBg, "");

// Notification indicator dot
let indicatorDot = create_label(35, 65);
let dotStyle = create_style();
style_set_bg_color(dotStyle, 0x00BFFF);
style_set_bg_opa(dotStyle, 255);
style_set_width(dotStyle, 12);
style_set_height(dotStyle, 12);
style_set_radius(dotStyle, 6);
obj_add_style(indicatorDot, dotStyle, 0);
label_set_text(indicatorDot, "");

// Source label
let sourceLabel = create_label(55, 62);
obj_add_style(sourceLabel, sourceStyle, 0);
label_set_text(sourceLabel, "");

// Title label
let notifTitleLabel = create_label(35, 85);
obj_add_style(notifTitleLabel, titleStyle, 0);
label_set_text(notifTitleLabel, "");

// Message label
style_set_width(messageStyle, 460);
style_set_height(messageStyle, 50);
let messageLabel = create_label(35, 115);
obj_add_style(messageLabel, messageStyle, 0);
label_set_text(messageLabel, "");

// Time label
let timeLabel = create_label(35, 160);
obj_add_style(timeLabel, timeStyle, 0);
label_set_text(timeLabel, "");

// Empty state label
let emptyLabel = create_label(130, 100);
obj_add_style(emptyLabel, emptyStyle, 0);
label_set_text(emptyLabel, "No notifications");

// Navigation indicators
let prevNav = create_label(200, 195);
obj_add_style(prevNav, navStyle, 0);
label_set_text(prevNav, "<");

let pageLabel = create_label(268, 195);
obj_add_style(pageLabel, navStyle, 0);
label_set_text(pageLabel, "");

let nextNav = create_label(336, 195);
obj_add_style(nextNav, navStyle, 0);
label_set_text(nextNav, ">");

// Fixed-property objects preserve commas and empty fields without CSV rebuilding.
let n0 = {title: "", message: "", source: "", at: 0};
let n1 = n0;
let n2 = n0;
let n3 = n0;
let n4 = n0;
let getNotification = function(index) {
  if (index === 0) return n0;
  if (index === 1) return n1;
  if (index === 2) return n2;
  if (index === 3) return n3;
  return n4;
};

// Update notification display
let updateDisplay = function() {
  if (notifCount === 0) {
    label_set_text(emptyLabel, "No notifications");
    label_set_text(sourceLabel, "");
    label_set_text(notifTitleLabel, "");
    label_set_text(messageLabel, "");
    label_set_text(timeLabel, "");
    label_set_text(pageLabel, "");
    label_set_text(countLabel, "0 new");
    return 0;
  }

  label_set_text(emptyLabel, "");

  let item = getNotification(currentNotif);
  let title = item.title;
  let message = item.message;
  let source = item.source;
  let elapsed = get_millis() - item.at;
  if (elapsed < 0) elapsed = elapsed + 4294967296;
  let time = format_number(elapsed / 1000, 0) + "s ago";

  label_set_text(sourceLabel, source);
  label_set_text(notifTitleLabel, title);
  label_set_text(messageLabel, message);
  label_set_text(timeLabel, time);

  let page = numberToString(currentNotif + 1) + " / " + numberToString(notifCount);
  label_set_text(pageLabel, page);
  label_set_text(countLabel, numberToString(notifCount) + " new");
};

// Add a new notification
let addNotification = function(title, message, source) {
  n4 = n3;
  n3 = n2;
  n2 = n1;
  n1 = n0;
  n0 = {title: title, message: message, source: source, at: get_millis()};
  notifCount++;
  if (notifCount > 5) notifCount = 5;
  currentNotif = 0;
  updateDisplay();
};

// Demo: Add notifications periodically
let demoTimer = 0;

let demo_update = function() {
  demoTimer++;

  // Add a demo notification every 8 seconds
  if (demoTimer >= 8) {
    demoTimer = 0;

    let title = getItem(demoTitles, demoIndex);
    let message = getItem(demoMessages, demoIndex);
    let source = getItem(demoSources, demoIndex);

    addNotification(title, message, source);

    demoIndex++;
    if (demoIndex > 4) demoIndex = 0;
  }

  // Update time display for aging notifications
  if (demoTimer === 4 && notifCount > 0) {
    updateDisplay();
  }
};

// Cycle through notifications
let cycleCounter = 0;

let cycle_notifs = function() {
  cycleCounter++;

  // Cycle to next notification every 5 seconds
  if (cycleCounter >= 5 && notifCount > 1) {
    cycleCounter = 0;
    currentNotif++;
    if (currentNotif >= notifCount) currentNotif = 0;
    updateDisplay();
  }
};

// Initialize display
updateDisplay();

// Start demo
create_timer("demo_update", 1000);
create_timer("cycle_notifs", 1000);

print("Notification Center ready!");

let next_notification = function(event) {
  if (notifCount === 0) return 0;
  currentNotif = (currentNotif + 1) % notifCount;
  updateDisplay();
};
on_button("next_notification");
