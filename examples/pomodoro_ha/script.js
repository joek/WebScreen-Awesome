"use strict";

print("Starting Home Assistant Pomodoro...");

let config = sd_read_file("/webscreen.json");
let broker = "broker.hivemq.com";
let port = 1883;
let clientId = "webscreen-pomodoro-" + numberToString(random(1000000000));
let username = "";
let password = "";
let baseTopic = "webscreen/pomodoro";
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
  if (t !== "") baseTopic = str_substring(t, 0, 127);
  if (c !== "") clientId = str_substring(c, 0, 63);
  username = str_substring(read_mqtt_value("username", "mqtt_username"), 0, 63);
  password = str_substring(read_mqtt_value("password", "mqtt_password"), 0, 63);
}

show_gif_from_sd("/blink.gif", 173, 65);

let WORK_TIME = 25 * 60;
let sessionDurationSeconds = WORK_TIME;
let remainingMs = WORK_TIME * 1000;
let sessionCount = 0;
let running = 0;
let previousMs = get_millis();
let initialized = 0;
let mqttConnected = 0;
let retryMs = 15000;
let lastRetry = 0;

let timerStyle = create_style();
style_set_text_font(timerStyle, 48);
style_set_text_color(timerStyle, 0xFFFFFF);
style_set_text_align(timerStyle, 2);
style_set_width(timerStyle, 500);

let statusStyle = create_style();
style_set_text_font(statusStyle, 20);
style_set_text_color(statusStyle, 0x74d680);
style_set_text_align(statusStyle, 2);
style_set_width(statusStyle, 500);

let metaStyle = create_style();
style_set_text_font(metaStyle, 14);
style_set_text_color(metaStyle, 0xA0A0A0);
style_set_text_align(metaStyle, 2);
style_set_width(metaStyle, 500);

let timerLabel = create_label(18, 30);
obj_add_style(timerLabel, timerStyle, 0);
label_set_text(timerLabel, "25:00");

let statusLabel = create_label(18, 92);
obj_add_style(statusLabel, statusStyle, 0);
label_set_text(statusLabel, "Ready");

let metaLabel = create_label(18, 128);
obj_add_style(metaLabel, metaStyle, 0);
label_set_text(metaLabel, "Sessions: 0");

let set_timer_vis = function(visible) {
  if (visible) {
    move_obj(timerLabel, 18, 30);
    move_obj(statusLabel, 18, 92);
    move_obj(metaLabel, 18, 128);
    return 0;
  }
  move_obj(timerLabel, 2000, 2000);
  move_obj(statusLabel, 2000, 2000);
  move_obj(metaLabel, 2000, 2000);
  return 0;
};

let format_duration = function(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  let minutes = (totalSeconds - totalSeconds % 60) / 60;
  let seconds = totalSeconds % 60;
  return pad_number(minutes, 2) + ":" + pad_number(seconds, 2);
};

let update_timer_display = function() {
  let totalSeconds = (remainingMs + 999) / 1000;
  totalSeconds = totalSeconds - totalSeconds % 1;
  label_set_text(timerLabel, format_duration(totalSeconds));
  if (running) {
    label_set_text(statusLabel, "Focus session running");
  } else {
    label_set_text(statusLabel, "Ready");
  }
  label_set_text(metaLabel, "Sessions: " + numberToString(sessionCount));
};

let publish_state = function() {
  if (!mqttConnected) return 0;
  mqtt_publish(baseTopic + "/state", running ? "ON" : "OFF");
  mqtt_publish(baseTopic + "/sessions/state", numberToString(sessionCount));
  mqtt_publish(baseTopic + "/remaining/state", numberToString((remainingMs + 999) / 1000));
  mqtt_publish(baseTopic + "/end_time/state", numberToString(get_epoch() + ((remainingMs + 999) / 1000)));
  mqtt_publish(baseTopic + "/availability", "online");
  return 0;
};

let send_ha_discovery = function() {
  let switchConfig = "{\"name\":\"WebScreen Pomodoro\"," +
    "\"unique_id\":\"webscreen_pomodoro_switch\"," +
    "\"command_topic\":\"" + baseTopic + "/set\"," +
    "\"state_topic\":\"" + baseTopic + "/state\"," +
    "\"payload_on\":\"ON\",\"payload_off\":\"OFF\"," +
    "\"state_on\":\"ON\",\"state_off\":\"OFF\"," +
    "\"retain\":true}";

  let sessionsConfig = "{\"name\":\"WebScreen Pomodoro Sessions\"," +
    "\"unique_id\":\"webscreen_pomodoro_sessions\"," +
    "\"state_topic\":\"" + baseTopic + "/sessions/state\"," +
    "\"unit_of_measurement\":\"sessions\"," +
    "\"min\":0,\"max\":1000,\"step\":1,\"retain\":true}";

  let remainingConfig = "{\"name\":\"WebScreen Pomodoro Remaining\"," +
    "\"unique_id\":\"webscreen_pomodoro_remaining\"," +
    "\"state_topic\":\"" + baseTopic + "/remaining/state\"," +
    "\"unit_of_measurement\":\"s\",\"device_class\":\"duration\"," +
    "\"state_class\":\"measurement\",\"retain\":true}";

  let endConfig = "{\"name\":\"WebScreen Pomodoro End Time\"," +
    "\"unique_id\":\"webscreen_pomodoro_end_time\"," +
    "\"state_topic\":\"" + baseTopic + "/end_time/state\"," +
    "\"retain\":true}";

  let resetConfig = "{\"name\":\"WebScreen Pomodoro Reset\"," +
    "\"unique_id\":\"webscreen_pomodoro_reset\"," +
    "\"command_topic\":\"" + baseTopic + "/reset/set\"," +
    "\"payload_press\":\"reset\",\"retain\":true}";

  mqtt_publish("homeassistant/switch/webscreen_pomodoro/config", switchConfig);
  mqtt_publish("homeassistant/number/webscreen_pomodoro_sessions/config", sessionsConfig);
  mqtt_publish("homeassistant/sensor/webscreen_pomodoro_remaining/config", remainingConfig);
  mqtt_publish("homeassistant/sensor/webscreen_pomodoro_end_time/config", endConfig);
  mqtt_publish("homeassistant/button/webscreen_pomodoro_reset/config", resetConfig);
  return 0;
};

let start_session = function() {
  if (remainingMs <= 0) remainingMs = sessionDurationSeconds * 1000;
  running = 1;
  previousMs = get_millis();
  set_timer_vis(1);
  update_timer_display();
  publish_state();
  return 0;
};

let stop_session = function() {
  running = 0;
  previousMs = get_millis();
  set_timer_vis(0);
  update_timer_display();
  publish_state();
  return 0;
};

let reset_current_session = function() {
  if (running) {
    remainingMs = sessionDurationSeconds * 1000;
    running = 0;
    previousMs = get_millis();
    set_timer_vis(0);
    update_timer_display();
    publish_state();
    return 0;
  }
  start_session();
  return 0;
};

let handle_switch_command = function(payload) {
  let value = payload;
  if (value === "ON" || value === "on" || value === "1" || value === "true") {
    if (!running) start_session();
    return 0;
  }
  if (value === "OFF" || value === "off" || value === "0" || value === "false") {
    if (running) stop_session();
    return 0;
  }
  return 0;
};

let handle_control_message = function(topic, payload) {
  if (topic === baseTopic + "/set") {
    handle_switch_command(payload);
    return 0;
  }
  if (topic === baseTopic + "/reset/set") {
    reset_current_session();
    return 0;
  }
  return 0;
};

let timer_tick = function() {
  if (!running) return 0;
  let now = get_millis();
  let delta = now - previousMs;
  if (delta < 0) delta = delta + 4294967296;
  previousMs = now;
  remainingMs = remainingMs - delta;
  if (remainingMs <= 0) {
    remainingMs = 0;
    running = 0;
    sessionCount = sessionCount + 1;
    set_timer_vis(0);
    update_timer_display();
    publish_state();
    return 0;
  }
  update_timer_display();
  publish_state();
  return 0;
};

let main_loop = function() {
  if (!mqttEnabled) {
    mqttConnected = 0;
    return 0;
  }
  if (!wifi_status()) {
    mqttConnected = 0;
    return 0;
  }
  let now = get_millis();
  let elapsed = now - lastRetry;
  if (elapsed < 0) elapsed = elapsed + 4294967296;
  if (!mqttConnected && elapsed >= retryMs) {
    lastRetry = now;
    retryMs = 15000;
    if (!initialized) initialized = mqtt_init(broker, port);
    if (initialized) {
      let connected = mqtt_connect(clientId, username, password);
      if (connected) {
        mqttConnected = mqtt_subscribe(baseTopic + "/set");
        if (mqttConnected) {
          mqttConnected = mqtt_subscribe(baseTopic + "/reset/set");
        }
        if (mqttConnected) send_ha_discovery();
      }
    }
  }
  if (mqttConnected && elapsed >= 15000) {
    lastRetry = now;
    mqttConnected = mqtt_subscribe(baseTopic + "/set");
    if (mqttConnected) mqttConnected = mqtt_subscribe(baseTopic + "/reset/set");
    if (mqttConnected) send_ha_discovery();
  }
  for (let i = 0; i < 4 && mqtt_has_message(); i++) {
    let payload = mqtt_get_payload();
    let topic = mqtt_get_topic();
    mqtt_msg_clear();
    if (typeof topic === "string" && topic !== "") {
      handle_control_message(topic, payload);
    }
  }
  return 0;
};

let handle_button_press = function(event) {
  if (running) {
    stop_session();
    return 0;
  }
  start_session();
  return 0;
};

set_timer_vis(0);
update_timer_display();
create_timer("main_loop", 1000);
create_timer("timer_tick", 1000);
on_button("handle_button_press");
