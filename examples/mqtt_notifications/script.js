"use strict";

print("Starting MQTT Notifications...");

// Read config
let config = sd_read_file("/webscreen.json");
let broker = "broker.hivemq.com";
let port = 1883;
let topic = "webscreen/notifications";
let clientId = "webscreen-" + numberToString(random(1000000000));
let username = "";
let password = "";
let mqttEnabled = true;

let read_mqtt_value = function(key, legacyKey) {
  let value = parse_json_value(config, legacyKey);
  if (value !== "") return value;
  if (typeof config === "string" && config !== "") {
    let settings = parse_json_value(config, "settings");
    if (settings !== "") {
      let mqttSettings = parse_json_value(settings, "mqtt");
      if (mqttSettings !== "") {
        value = parse_json_value(mqttSettings, key);
        if (value !== "") return value;
      }
    }
  }
  return "";
};

if (typeof config === "string" && config !== "") {
  let enabled = read_mqtt_value("enabled", "mqtt_enabled");
  if (enabled !== "") mqttEnabled = enabled === "true";
  let b = read_mqtt_value("broker", "mqtt_broker");
  let p = read_mqtt_value("port", "mqtt_port");
  let t = read_mqtt_value("topic", "mqtt_topic");
  let c = read_mqtt_value("client_id", "mqtt_client_id");
  if (b !== "") broker = str_substring(b, 0, 127);
  if (p !== "" && toNumber(p) >= 1 && toNumber(p) <= 65535) port = toNumber(p);
  if (t !== "") topic = str_substring(t, 0, 127);
  if (c !== "") clientId = str_substring(c, 0, 63);
  username = str_substring(read_mqtt_value("username", "mqtt_username"), 0, 63);
  password = str_substring(read_mqtt_value("password", "mqtt_password"), 0, 63);
}

print("Broker: " + broker + ":" + numberToString(port));
print("Topic: " + topic);

// State
let notifCount = 0;
let currentNotif = 0;
let mqttConnected = 0;

// Notification storage — 5 slots, individual variables (no string parsing needed)
let t0 = ""; let t1 = ""; let t2 = ""; let t3 = ""; let t4 = "";
let m0 = ""; let m1 = ""; let m2 = ""; let m3 = ""; let m4 = "";
let s0 = ""; let s1 = ""; let s2 = ""; let s3 = ""; let s4 = "";

// Allocate styles once; the firmware provides 32 slots.
let headerStyle = create_style();
style_set_text_font(headerStyle, 20);
style_set_text_color(headerStyle, 0xFFFFFF);

let statusStyle = create_style();
style_set_text_font(statusStyle, 14);
style_set_text_color(statusStyle, 0x888888);

let titleStyle = create_style();
style_set_text_font(titleStyle, 28);
style_set_text_color(titleStyle, 0xFFFFFF);
style_set_width(titleStyle, 466);
style_set_height(titleStyle, 34);

let msgStyle = create_style();
style_set_text_font(msgStyle, 20);
style_set_text_color(msgStyle, 0xAAAAAA);
style_set_width(msgStyle, 466);
style_set_height(msgStyle, 56);

let smallStyle = create_style();
style_set_text_font(smallStyle, 14);
style_set_text_color(smallStyle, 0x58A6FF);

// Card background
let cardBg = create_label(15, 50);
let cardStyle = create_style();
style_set_bg_color(cardStyle, 0x161B22);
style_set_bg_opa(cardStyle, 255);
style_set_width(cardStyle, 506);
style_set_height(cardStyle, 130);
style_set_radius(cardStyle, 12);
style_set_pad_all(cardStyle, 15);
obj_add_style(cardBg, cardStyle, 0);
label_set_text(cardBg, "");

// Labels
let headerLabel = create_label(20, 15);
obj_add_style(headerLabel, headerStyle, 0);
label_set_text(headerLabel, "MQTT Notifications");

let statusLabel = create_label(380, 17);
obj_add_style(statusLabel, statusStyle, 0);
label_set_text(statusLabel, "Connecting...");

let sourceLabel = create_label(30, 58);
obj_add_style(sourceLabel, smallStyle, 0);
label_set_text(sourceLabel, "");

let notifTitle = create_label(30, 80);
obj_add_style(notifTitle, titleStyle, 0);
label_set_text(notifTitle, "");

let notifMsg = create_label(30, 115);
obj_add_style(notifMsg, msgStyle, 0);
label_set_text(notifMsg, "Waiting for messages...");

let pageLabel = create_label(230, 195);
obj_add_style(pageLabel, statusStyle, 0);
label_set_text(pageLabel, "");

let topicLabel = create_label(20, 215);
obj_add_style(topicLabel, statusStyle, 0);
label_set_text(topicLabel, topic);

// Get title/message/source by index
let getTitle = function(i) {
  if (i === 0) return t0;
  if (i === 1) return t1;
  if (i === 2) return t2;
  if (i === 3) return t3;
  return t4;
};
let getMsg = function(i) {
  if (i === 0) return m0;
  if (i === 1) return m1;
  if (i === 2) return m2;
  if (i === 3) return m3;
  return m4;
};
let getSrc = function(i) {
  if (i === 0) return s0;
  if (i === 1) return s1;
  if (i === 2) return s2;
  if (i === 3) return s3;
  return s4;
};

// Update display
let updateDisplay = function() {
  if (notifCount === 0) {
    label_set_text(sourceLabel, "");
    label_set_text(notifTitle, "");
    label_set_text(notifMsg, "Waiting for messages...");
    label_set_text(pageLabel, "");
    return 0;
  }
  label_set_text(sourceLabel, getSrc(currentNotif));
  label_set_text(notifTitle, getTitle(currentNotif));
  label_set_text(notifMsg, getMsg(currentNotif));
  let pg = numberToString(currentNotif + 1) + " / " + numberToString(notifCount);
  label_set_text(pageLabel, pg);
};

// Add notification (newest first) — shift slots right, insert at 0
let addNotif = function(title, message, source) {
  title = str_substring(title, 0, 56);
  message = str_substring(message, 0, 180);
  source = str_substring(source, 0, 40);
  t4 = t3; t3 = t2; t2 = t1; t1 = t0; t0 = title;
  m4 = m3; m3 = m2; m2 = m1; m1 = m0; m0 = message;
  s4 = s3; s3 = s2; s2 = s1; s1 = s0; s0 = source;
  notifCount++;
  if (notifCount > 5) notifCount = 5;
  currentNotif = 0;
  updateDisplay();
  print("Notification: " + title + " - " + message);
};

// Firmware services MQTT between JS calls. Poll its queue; mqtt_on_message
// is a legacy API and does not dispatch JavaScript callbacks.
let initialized = 0;
let lastRetry = 0;
let retryMs = 0;
let cycleCount = 0;
let connectedOnce = 0;
let main_loop = function() {
  if (!mqttEnabled) {
    label_set_text(statusLabel, "MQTT disabled");
    mqttConnected = 0;
    retryMs = 0;
    return 0;
  }
  if (!wifi_status()) {
    label_set_text(statusLabel, "No WiFi");
    mqttConnected = 0;
    retryMs = 0;
    return 0;
  }
  let now = get_millis();
  let elapsed = now - lastRetry;
  if (elapsed < 0) elapsed = elapsed + 4294967296;
  if (!mqttConnected && elapsed >= retryMs) {
    // Set the deadline before the blocking native call, even if it times out.
    lastRetry = now;
    retryMs = 15000;
    if (!initialized) initialized = mqtt_init(broker, port);
    if (initialized) {
      let connected = connectedOnce;
      if (!connected) connected = mqtt_connect(clientId, username, password);
      if (connected) {
        connectedOnce = 1;
        mqttConnected = mqtt_subscribe(topic);
      }
    }
    label_set_text(statusLabel, mqttConnected ? "Subscribed" : "Retrying...");
  }
  // A periodic subscription probe also notices broker loss. The firmware
  // restores an established session; do not reset it with mqtt_init().
  if (mqttConnected && elapsed >= 15000) {
    lastRetry = now;
    mqttConnected = mqtt_subscribe(topic);
    label_set_text(statusLabel, mqttConnected ? "Subscribed" : "Reconnecting");
  }
  for (let i = 0; i < 4 && mqtt_has_message(); i++) {
    let payload = mqtt_get_payload();
    mqtt_msg_clear();
    let title = "";
    let message = "";
    let source = "";
    if (str_substring(payload, 0, 1) === "{") {
      title = parse_json_value(payload, "title");
      message = parse_json_value(payload, "message");
      source = parse_json_value(payload, "source");
    }
    if (title === "") title = "New Message";
    if (message === "") message = payload;
    if (source === "") source = "MQTT";
    addNotif(title, message, source);
    cycleCount = 0;
  }
  cycleCount++;
  if (cycleCount >= 6 && notifCount > 1) {
    cycleCount = 0;
    currentNotif = (currentNotif + 1) % notifCount;
    updateDisplay();
  }
};
let next_notification = function(event) {
  if (notifCount === 0) return 0;
  currentNotif = (currentNotif + 1) % notifCount;
  cycleCount = 0;
  updateDisplay();
};
on_button("next_notification");
create_timer("main_loop", 1000);
